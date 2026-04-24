import { blackScholesPrice } from "@/lib/pricing/black-scholes";
import { calculateGreeks } from "@/lib/pricing/greeks";
import {
  calculateRiskCapital,
  calculateStrategyProfitLossAtDate,
  calculateStrategyProfitLossAtExpiry,
  calculateTimeToExpiryYears,
  calculateMaxProfitLoss,
  findBreakEvenPoints,
  generatePayoffAtExpiry,
} from "@/lib/pricing/payoff";
import { calculateChanceOfProfit } from "@/lib/pricing/probability";
import type { OptionLeg, StockLeg, StrategyLeg } from "@/types/options";
import type {
  LegMark,
  PortfolioLeg,
  PortfolioPosition,
  PositionStockLeg,
  Scenario,
} from "./types";

export type { LegMark };

function toOptionLeg(leg: PortfolioLeg): OptionLeg {
  return {
    optionType: leg.t,
    positionType: leg.s,
    strikePrice: leg.k,
    premium: leg.p,
    quantity: leg.q,
    expirationDate: leg.exp,
    impliedVolatility: leg.iv && leg.iv > 0 ? leg.iv : 0.28,
  };
}

function toStockLeg(stockLeg: PositionStockLeg): StockLeg {
  return {
    positionType: stockLeg.side,
    quantity: stockLeg.quantity,
    entryPrice: stockLeg.entry_price,
  };
}

export function toStrategyLegs(
  legs: PortfolioLeg[],
  stockLeg: PositionStockLeg | null = null,
): StrategyLeg[] {
  const strategyLegs: StrategyLeg[] = legs.map(toOptionLeg);
  if (stockLeg) {
    strategyLegs.push(toStockLeg(stockLeg));
  }
  return strategyLegs;
}

function pricingInputForLeg(
  leg: PortfolioLeg,
  S: number,
  now: Date,
  r: number,
) {
  return {
    spotPrice: S,
    strikePrice: leg.k,
    timeToExpiry: calculateTimeToExpiryYears(leg.exp, 0, now),
    riskFreeRate: r,
    volatility: leg.iv && leg.iv > 0 ? leg.iv : 0.28,
    optionType: leg.t,
  } as const;
}

function stockProfitLoss(
  stockLeg: PositionStockLeg,
  spotPrice: number,
): number {
  const sign = stockLeg.side === "long" ? 1 : -1;
  return (spotPrice - stockLeg.entry_price) * sign * stockLeg.quantity;
}

function referencePrice(position: PortfolioPosition): number {
  if (position.px > 0) return position.px;
  if (position.stockLeg?.entry_price) return position.stockLeg.entry_price;
  if (position.legs.length > 0) {
    return position.legs.reduce((sum, leg) => sum + leg.k, 0) / position.legs.length;
  }
  return 1;
}

function resolveScenarioDaysForward(
  scn: Scenario,
  now: Date,
): number {
  if (scn.target_date) {
    const nowDay = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const targetMs = new Date(`${scn.target_date}T00:00:00.000Z`).getTime();
    if (Number.isFinite(targetMs)) {
      return Math.max(0, (targetMs - nowDay) / 86_400_000);
    }
  }
  return Math.max(0, scn.advance_days ?? 0);
}

function shockVolatility(
  baseIv: number,
  shock: Scenario["iv_shock"],
): number {
  let legIv = baseIv > 0 ? baseIv : 0.28;
  if (!shock) return legIv;
  if (shock.mode === "mult") legIv *= shock.val;
  else if (shock.mode === "add") legIv += shock.val / 100;
  else if (shock.mode === "abs") legIv = shock.val;
  // Keep scenario repricing on the smooth BS surface even for "IV crush to 0".
  return Math.max(0.01, legIv);
}

function maxDaysToExpiry(position: PortfolioPosition, now: Date = new Date()): number {
  return position.legs.reduce((maxDte, leg) => {
    const dte = Math.ceil(calculateTimeToExpiryYears(leg.exp, 0, now) * 365);
    return Math.max(maxDte, dte);
  }, 0);
}

function hasMixedExpiries(position: PortfolioPosition): boolean {
  return new Set(position.legs.map((leg) => leg.exp)).size > 1;
}

function analyzePositionStructure(position: PortfolioPosition) {
  const basePrice = referencePrice(position);
  const strategyLegs = toStrategyLegs(position.legs, position.stockLeg);
  const payoff = generatePayoffAtExpiry(strategyLegs, basePrice);
  const zeroBoundary = {
    underlyingPrice: 0,
    ...calculateStrategyProfitLossAtExpiry(strategyLegs, 0),
  };
  const payoffWithFloor = [...payoff, zeroBoundary].sort(
    (a, b) => a.underlyingPrice - b.underlyingPrice,
  );
  const breakEvens = findBreakEvenPoints(payoffWithFloor);
  const limits = calculateMaxProfitLoss(payoffWithFloor);

  return {
    basePrice,
    strategyLegs,
    payoff: payoffWithFloor,
    breakEvens,
    limits,
  };
}

export function payoffAtExpiry(
  legs: PortfolioLeg[],
  S: number,
  stockLeg: PositionStockLeg | null = null,
): number {
  return calculateStrategyProfitLossAtExpiry(toStrategyLegs(legs, stockLeg), S).profitLoss;
}

export function mtm(
  legs: PortfolioLeg[],
  S: number,
  stockLeg: PositionStockLeg | null = null,
  now: Date = new Date(),
  r = 0.045,
): number {
  return calculateStrategyProfitLossAtDate(toStrategyLegs(legs, stockLeg), S, {
    daysForward: 0,
    riskFreeRate: r,
    now,
  }).profitLoss;
}

export function markLeg(
  leg: PortfolioLeg,
  S: number,
  now: Date = new Date(),
  r = 0.045,
): LegMark {
  const input = pricingInputForLeg(leg, S, now, r);
  const dte = Math.max(0, Math.ceil(input.timeToExpiry * 365));
  const value = blackScholesPrice(input);
  const greeks = calculateGreeks(input);
  const mult = (leg.s === "long" ? 1 : -1) * leg.q * 100;

  return {
    dte,
    value,
    pnl: (value - leg.p) * mult,
    delta: greeks.delta * mult,
    gamma: greeks.gamma * mult,
    theta: greeks.theta * mult,
    vega: greeks.vega * mult,
  };
}

export interface PositionMark {
  marks: LegMark[];
  pnl: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export function markPosition(
  legs: PortfolioLeg[],
  S: number,
  stockLeg: PositionStockLeg | null = null,
  now: Date = new Date(),
  r = 0.045,
): PositionMark {
  const marks = legs.map((leg) => markLeg(leg, S, now, r));
  const acc = marks.reduce(
    (sum, mark) => ({
      pnl: sum.pnl + mark.pnl,
      delta: sum.delta + mark.delta,
      gamma: sum.gamma + mark.gamma,
      theta: sum.theta + mark.theta,
      vega: sum.vega + mark.vega,
    }),
    { pnl: 0, delta: 0, gamma: 0, theta: 0, vega: 0 },
  );

  if (stockLeg) {
    const stockDelta = (stockLeg.side === "long" ? 1 : -1) * stockLeg.quantity;
    acc.pnl += stockProfitLoss(stockLeg, S);
    acc.delta += stockDelta;
  }

  return { marks, ...acc };
}

export interface ScenarioResult {
  newPx: number;
  newValue: number;
  delta: number;
}

/**
 * Apply a scenario to a position, returning the expected value and delta from
 * the position's current P/L.
 */
export function applyScenario(
  pos: PortfolioPosition,
  scn: Scenario,
  now: Date = new Date(),
): ScenarioResult {
  const rule = scn.underlying_shocks?.[pos.ticker] ?? scn.default_shock ?? null;
  const basePx = referencePrice(pos);

  let newPx = basePx;
  if (rule && rule.mode === "pct") newPx = basePx * (1 + rule.val / 100);
  // "pin" is currently a UX alias for an absolute settlement target.
  else if (rule && (rule.mode === "abs" || rule.mode === "pin")) newPx = rule.val;

  const daysForward = resolveScenarioDaysForward(scn, now);
  const r = scn.interest_rate ?? 0.045;
  const shockedLegs = toStrategyLegs(
    pos.legs.map((leg) => ({
      ...leg,
      iv: shockVolatility(leg.iv, scn.iv_shock),
    })),
    pos.stockLeg,
  );
  const newValue = calculateStrategyProfitLossAtDate(shockedLegs, newPx, {
    daysForward,
    riskFreeRate: r,
    now,
  }).profitLoss;

  return { newPx, newValue, delta: newValue - pos.pnl };
}

export function fmtDollar(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return sign + "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

export function heatColor(value: number, maxAbs: number): string {
  if (maxAbs === 0 || value === 0) return "var(--muted)";
  const t = Math.min(Math.abs(value) / maxAbs, 1);
  if (value > 0) {
    const s = 45 + t * 25;
    const l = 82 - t * 47;
    return `hsl(142, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
  }
  const s = 45 + t * 27;
  const l = 85 - t * 47;
  return `hsl(0, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
}

export function heatTextColor(value: number, maxAbs: number): string {
  if (maxAbs === 0 || value === 0) return "var(--foreground)";
  const t = Math.min(Math.abs(value) / maxAbs, 1);
  return t > 0.25 ? "white" : "#1f2937";
}

export function maxProfitLabel(position: PortfolioPosition): string {
  if (hasMixedExpiries(position)) return "Varies by date";
  const { limits } = analyzePositionStructure(position);
  if (limits.isUnlimitedProfit) return "Unlimited";
  return "+$" + Math.abs(Math.round(limits.maxProfit)).toLocaleString("en-US");
}

export function maxLossLabel(position: PortfolioPosition): string {
  if (hasMixedExpiries(position)) return "Varies by date";
  const { limits } = analyzePositionStructure(position);
  if (limits.isUnlimitedLoss) return "Unlimited";
  return "-$" + Math.abs(Math.round(limits.maxLoss)).toLocaleString("en-US");
}

export function breakevenLabel(position: PortfolioPosition): string {
  if (hasMixedExpiries(position)) return "Front expiry only";
  const { breakEvens } = analyzePositionStructure(position);
  if (breakEvens.length === 0) return "—";
  return breakEvens.map((value) => `$${value.toFixed(2)}`).join(" · ");
}

export function popLabel(position: PortfolioPosition): string {
  if (position.legs.length === 0) return "—";
  if (hasMixedExpiries(position)) return "Varies by path";

  const { basePrice, payoff, breakEvens } = analyzePositionStructure(position);
  const weighted = position.legs.reduce(
    (sum, leg) => {
      const iv = leg.iv && leg.iv > 0 ? leg.iv : 0.28;
      return {
        iv: sum.iv + iv * leg.q,
        qty: sum.qty + leg.q,
      };
    },
    { iv: 0, qty: 0 },
  );
  const avgIv = weighted.qty > 0 ? weighted.iv / weighted.qty : 0.28;
  const dte = maxDaysToExpiry(position);
  if (dte <= 0) return "—";

  const probability = calculateChanceOfProfit(
    payoff,
    breakEvens,
    basePrice,
    avgIv,
    dte / 365,
    0.045,
  );

  return `${(probability * 100).toFixed(0)}%`;
}

export function fallbackCostBasis(
  legs: PortfolioLeg[],
  stockLeg: PositionStockLeg | null,
  currentPrice: number,
): number {
  return calculateRiskCapital(toStrategyLegs(legs, stockLeg), currentPrice);
}
