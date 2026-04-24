import type { OptionLeg, PayoffPoint, StrategyLeg } from "@/types/options";
import { isOptionLeg } from "@/types/options";
import { blackScholesPrice } from "./black-scholes";
import {
  PAYOFF_PRICE_POINTS,
  PAYOFF_RANGE_LOW_PCT,
  PAYOFF_RANGE_HIGH_PCT,
  DEFAULT_RISK_FREE_RATE,
} from "@/lib/utils/constants";

export interface PayoffAtDateOptions {
  daysForward?: number;
  riskFreeRate?: number;
  now?: Date;
}

function expirationEndDate(expirationDate: string): Date {
  return new Date(`${expirationDate}T23:59:59.999Z`);
}

export function calculateTimeToExpiryYears(
  expirationDate: string,
  daysForward = 0,
  now: Date = new Date(),
): number {
  const expiryTime = expirationEndDate(expirationDate).getTime();
  if (!Number.isFinite(expiryTime)) {
    return 0;
  }

  const valuationTime = now.getTime() + daysForward * 86_400_000;
  return Math.max((expiryTime - valuationTime) / 86_400_000 / 365, 0);
}

/**
 * Calculate P&L for a single option leg at expiration.
 */
export function calculateOptionLegProfitLossAtExpiry(
  leg: OptionLeg,
  underlyingPrice: number,
): number {
  const multiplier = leg.positionType === "long" ? 1 : -1;
  const intrinsicValue =
    leg.optionType === "call"
      ? Math.max(underlyingPrice - leg.strikePrice, 0)
      : Math.max(leg.strikePrice - underlyingPrice, 0);

  return (intrinsicValue * multiplier - leg.premium * multiplier) * leg.quantity * 100;
}

/**
 * Calculate P&L for a single option leg at a future date (before expiry).
 */
export function calculateOptionLegProfitLossAtDate(
  leg: OptionLeg,
  underlyingPrice: number,
  {
    daysForward = 0,
    riskFreeRate = DEFAULT_RISK_FREE_RATE,
    now = new Date(),
  }: PayoffAtDateOptions = {},
): number {
  const multiplier = leg.positionType === "long" ? 1 : -1;
  const timeToExpiry = calculateTimeToExpiryYears(leg.expirationDate, daysForward, now);

  if (timeToExpiry <= 0) {
    return calculateOptionLegProfitLossAtExpiry(leg, underlyingPrice);
  }

  const theoreticalPrice = blackScholesPrice({
    spotPrice: underlyingPrice,
    strikePrice: leg.strikePrice,
    timeToExpiry,
    riskFreeRate,
    volatility: leg.impliedVolatility,
    optionType: leg.optionType,
  });

  return (theoreticalPrice - leg.premium) * multiplier * leg.quantity * 100;
}

/**
 * Calculate P&L for a stock leg.
 */
export function calculateStockLegProfitLoss(
  leg: { positionType: "long" | "short"; quantity: number; entryPrice: number },
  underlyingPrice: number,
): number {
  const multiplier = leg.positionType === "long" ? 1 : -1;
  return (underlyingPrice - leg.entryPrice) * multiplier * leg.quantity;
}

export function calculateStrategyProfitLossAtExpiry(
  legs: StrategyLeg[],
  underlyingPrice: number,
): { profitLoss: number; legProfitLoss: number[] } {
  const legProfitLoss = legs.map((leg) =>
    isOptionLeg(leg)
      ? calculateOptionLegProfitLossAtExpiry(leg, underlyingPrice)
      : calculateStockLegProfitLoss(leg, underlyingPrice),
  );

  return {
    profitLoss: Math.round(legProfitLoss.reduce((sum, legPL) => sum + legPL, 0) * 100) / 100,
    legProfitLoss,
  };
}

export function calculateStrategyProfitLossAtDate(
  legs: StrategyLeg[],
  underlyingPrice: number,
  options: PayoffAtDateOptions = {},
): { profitLoss: number; legProfitLoss: number[] } {
  const legProfitLoss = legs.map((leg) =>
    isOptionLeg(leg)
      ? calculateOptionLegProfitLossAtDate(leg, underlyingPrice, options)
      : calculateStockLegProfitLoss(leg, underlyingPrice),
  );

  return {
    profitLoss: Math.round(legProfitLoss.reduce((sum, legPL) => sum + legPL, 0) * 100) / 100,
    legProfitLoss,
  };
}

function netCashFlowAtEntry(legs: StrategyLeg[]): number {
  return legs.reduce((sum, leg) => {
    if (isOptionLeg(leg)) {
      const sign = leg.positionType === "long" ? -1 : 1;
      return sum + sign * leg.premium * leg.quantity * 100;
    }

    const sign = leg.positionType === "long" ? -1 : 1;
    return sum + sign * leg.entryPrice * leg.quantity;
  }, 0);
}

export function calculateUpperTailSlope(legs: StrategyLeg[]): number {
  return legs.reduce((sum, leg) => {
    if (isOptionLeg(leg)) {
      if (leg.optionType !== "call") {
        return sum;
      }

      return sum + (leg.positionType === "long" ? 1 : -1) * leg.quantity * 100;
    }

    return sum + (leg.positionType === "long" ? 1 : -1) * leg.quantity;
  }, 0);
}

export function classifyUpperTailRisk(legs: StrategyLeg[]): {
  isUnlimitedProfit: boolean;
  isUnlimitedLoss: boolean;
} {
  const slope = calculateUpperTailSlope(legs);
  return {
    isUnlimitedProfit: slope > 1e-6,
    isUnlimitedLoss: slope < -1e-6,
  };
}

export function calculateRiskCapital(
  legs: StrategyLeg[],
  currentPrice: number,
): number {
  if (legs.length === 0) {
    return 0;
  }

  const payoff = generatePayoffAtExpiry(legs, currentPrice);
  const zeroBoundary = {
    underlyingPrice: 0,
    ...calculateStrategyProfitLossAtExpiry(legs, 0),
  };
  const { maxLoss, isUnlimitedLoss } = calculateMaxProfitLoss(payoff);
  const floorAdjustedLoss = Math.min(
    maxLoss,
    zeroBoundary.profitLoss,
  );
  if (!isUnlimitedLoss && Number.isFinite(maxLoss)) {
    return Math.abs(floorAdjustedLoss);
  }

  return Math.abs(netCashFlowAtEntry(legs));
}

/**
 * Generate payoff diagram data for a strategy at expiration.
 */
export function generatePayoffAtExpiry(
  legs: StrategyLeg[],
  currentPrice: number,
): PayoffPoint[] {
  const lowPrice = currentPrice * PAYOFF_RANGE_LOW_PCT;
  const highPrice = currentPrice * PAYOFF_RANGE_HIGH_PCT;
  const step = (highPrice - lowPrice) / PAYOFF_PRICE_POINTS;

  const points: PayoffPoint[] = [];

  for (let i = 0; i <= PAYOFF_PRICE_POINTS; i++) {
    const price = lowPrice + step * i;
    const result = calculateStrategyProfitLossAtExpiry(legs, price);

    points.push({
      underlyingPrice: Math.round(price * 100) / 100,
      profitLoss: result.profitLoss,
      legProfitLoss: result.legProfitLoss,
    });
  }

  return points;
}

/**
 * Generate payoff diagram data for a strategy at a specific future date.
 */
export function generatePayoffAtDate(
  legs: StrategyLeg[],
  currentPrice: number,
  daysForward: number,
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE,
  now: Date = new Date(),
): PayoffPoint[] {
  const lowPrice = currentPrice * PAYOFF_RANGE_LOW_PCT;
  const highPrice = currentPrice * PAYOFF_RANGE_HIGH_PCT;
  const step = (highPrice - lowPrice) / PAYOFF_PRICE_POINTS;

  const points: PayoffPoint[] = [];

  for (let i = 0; i <= PAYOFF_PRICE_POINTS; i++) {
    const price = lowPrice + step * i;
    const result = calculateStrategyProfitLossAtDate(legs, price, {
      daysForward,
      riskFreeRate,
      now,
    });

    points.push({
      underlyingPrice: Math.round(price * 100) / 100,
      profitLoss: result.profitLoss,
      legProfitLoss: result.legProfitLoss,
    });
  }

  return points;
}

/**
 * Find break-even points from payoff data.
 */
export function findBreakEvenPoints(payoffPoints: PayoffPoint[]): number[] {
  const breakEvens: number[] = [];

  for (let i = 1; i < payoffPoints.length; i++) {
    const prev = payoffPoints[i - 1];
    const curr = payoffPoints[i];

    if (
      (prev.profitLoss <= 0 && curr.profitLoss > 0) ||
      (prev.profitLoss >= 0 && curr.profitLoss < 0)
    ) {
      const ratio =
        Math.abs(prev.profitLoss) / (Math.abs(prev.profitLoss) + Math.abs(curr.profitLoss));
      const breakEvenPrice =
        prev.underlyingPrice + ratio * (curr.underlyingPrice - prev.underlyingPrice);
      breakEvens.push(Math.round(breakEvenPrice * 100) / 100);
    }
  }

  return breakEvens;
}

/**
 * Calculate max profit and max loss from payoff data.
 */
export function calculateMaxProfitLoss(payoffPoints: PayoffPoint[]): {
  maxProfit: number;
  maxLoss: number;
  maxProfitPrice: number;
  maxLossPrice: number;
  isUnlimitedProfit: boolean;
  isUnlimitedLoss: boolean;
} {
  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  let maxProfitPrice = 0;
  let maxLossPrice = 0;

  for (const point of payoffPoints) {
    if (point.profitLoss > maxProfit) {
      maxProfit = point.profitLoss;
      maxProfitPrice = point.underlyingPrice;
    }
    if (point.profitLoss < maxLoss) {
      maxLoss = point.profitLoss;
      maxLossPrice = point.underlyingPrice;
    }
  }

  const n = payoffPoints.length;
  const tailSlopeThreshold = 5;
  let isUnlimitedProfit = false;
  let isUnlimitedLoss = false;

  if (n >= 3) {
    const last = payoffPoints[n - 1];
    const prev = payoffPoints[n - 2];
    const prevPrev = payoffPoints[n - 3];
    const dx1 = last.underlyingPrice - prev.underlyingPrice;
    const dx2 = prev.underlyingPrice - prevPrev.underlyingPrice;
    const slope1 = dx1 !== 0 ? (last.profitLoss - prev.profitLoss) / dx1 : 0;
    const slope2 = dx2 !== 0 ? (prev.profitLoss - prevPrev.profitLoss) / dx2 : 0;
    const minSlope = Math.min(slope1, slope2);
    const maxSlope = Math.max(slope1, slope2);

    isUnlimitedProfit =
      minSlope > tailSlopeThreshold &&
      last.profitLoss > prev.profitLoss &&
      prev.profitLoss > prevPrev.profitLoss;

    isUnlimitedLoss =
      maxSlope < -tailSlopeThreshold &&
      last.profitLoss < prev.profitLoss &&
      prev.profitLoss < prevPrev.profitLoss;
  }

  return {
    maxProfit,
    maxLoss,
    maxProfitPrice,
    maxLossPrice,
    isUnlimitedProfit,
    isUnlimitedLoss,
  };
}
