import type {
  LegMark,
  Position,
  PortfolioPosition,
  PortfolioLeg,
  Scenario,
} from "./types";
import { fallbackCostBasis, markPosition } from "./pricing";
import type { OptionChain, OptionContract } from "@/types/market";

/**
 * Map a DB position into the compact UI shape used by the dashboard.
 *
 * Initially marked against entry_underlying_price. Callers that have a live
 * quote should call applyLivePrice() to re-mark with the current underlying.
 */
export function normalizePosition(pos: Position): PortfolioPosition {
  const now = new Date();

  const legs: PortfolioLeg[] = pos.legs.map((leg) => ({
    s: leg.side,
    t: leg.type,
    k: leg.strike,
    p: leg.entry_premium,
    q: leg.quantity,
    iv: leg.implied_volatility,
    exp: leg.expiration_date,
  }));
  const stockLeg = pos.stock_leg;

  const optionNet = pos.legs.reduce(
    (sum, leg) =>
      sum + (leg.side === "short" ? 1 : -1) * leg.entry_premium * leg.quantity * 100,
    0,
  );
  const stockNet = stockLeg
    ? (stockLeg.side === "short" ? 1 : -1) * stockLeg.entry_price * stockLeg.quantity
    : 0;
  const net = optionNet + stockNet;

  const expiryDates = pos.legs
    .map((leg) => new Date(leg.expiration_date).getTime())
    .filter((time) => !Number.isNaN(time));
  const minExpiry = expiryDates.length > 0 ? Math.min(...expiryDates) : now.getTime();
  const maxExpiry = expiryDates.length > 0 ? Math.max(...expiryDates) : now.getTime();
  const dte = Math.max(0, Math.round((minExpiry - now.getTime()) / 86_400_000));

  const start = pos.entry_date ?? pos.created_at;
  const startTime = start ? new Date(start).getTime() : now.getTime();
  const dteMax = Math.max(1, Math.round((maxExpiry - startTime) / 86_400_000));

  const referencePrice =
    pos.entry_underlying_price ??
    stockLeg?.entry_price ??
    (legs.length > 0 ? legs.reduce((sum, leg) => sum + leg.k, 0) / legs.length : 1);
  const cost = pos.cost_basis ?? fallbackCostBasis(legs, stockLeg, referencePrice);

  const strat = pos.strategy ?? inferStrategy(pos) ?? "custom";
  const entry = pos.entry_date ? pos.entry_date.slice(0, 10) : null;

  const px = pos.entry_underlying_price ?? 0;
  const mark = markPosition(legs, px > 0 ? px : referencePrice, stockLeg, now);

  const pnl = pos.state === "closed" ? pos.realised_pnl ?? 0 : mark.pnl;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

  return {
    id: pos.id,
    state: pos.state,
    name: pos.name,
    strat,
    ticker: pos.ticker,
    px,
    pxLive: false,
    legs,
    stockLeg,
    net,
    dte,
    dteMax,
    cost,
    pnl,
    pnlPct,
    entry,
    marks: mark.marks,
    greeks: {
      delta: mark.delta,
      gamma: mark.gamma,
      theta: mark.theta,
      vega: mark.vega,
    },
  };
}

/**
 * Re-mark a normalized position against a live underlying price using
 * Black-Scholes at the leg's entry IV. Used only as a fallback when chain
 * data isn't available.
 */
export function applyLivePrice(
  pos: PortfolioPosition,
  livePx: number,
): PortfolioPosition {
  if (!(livePx > 0)) return pos;
  const mark = markPosition(pos.legs, livePx, pos.stockLeg);
  const isClosed = pos.state === "closed";
  const pnl = isClosed ? pos.pnl : mark.pnl;
  const pnlPct = pos.cost > 0 ? (pnl / pos.cost) * 100 : 0;
  return {
    ...pos,
    px: livePx,
    pxLive: true,
    pnl,
    pnlPct,
    marks: mark.marks,
    greeks: {
      delta: mark.delta,
      gamma: mark.gamma,
      theta: mark.theta,
      vega: mark.vega,
    },
  };
}

function findContract(
  chain: OptionChain,
  leg: PortfolioLeg,
): OptionContract | null {
  const expiry = chain.expirations.find((item) => item.expirationDate === leg.exp);
  if (!expiry) return null;
  const pool = leg.t === "call" ? expiry.calls : expiry.puts;
  return pool.find((contract) => Math.abs(contract.strikePrice - leg.k) < 0.001) ?? null;
}

/**
 * Mark a position against a live options chain. Uses the current market
 * mid for each leg's value and the chain's own Greeks.
 */
export function applyLiveMarks(
  pos: PortfolioPosition,
  chain: OptionChain | undefined,
): PortfolioPosition {
  if (!chain) return pos;
  const livePx = chain.underlyingPrice;

  if (pos.legs.length === 0) {
    if (!(livePx > 0)) return pos;
    const stockPnl = pos.stockLeg
      ? (livePx - pos.stockLeg.entry_price) *
        (pos.stockLeg.side === "long" ? 1 : -1) *
        pos.stockLeg.quantity
      : pos.pnl;
    return {
      ...pos,
      px: livePx,
      pxLive: true,
      pnl: pos.state === "closed" ? pos.pnl : stockPnl,
      pnlPct:
        pos.cost > 0
          ? ((pos.state === "closed" ? pos.pnl : stockPnl) / pos.cost) * 100
          : 0,
      greeks: pos.stockLeg
        ? {
            delta: (pos.stockLeg.side === "long" ? 1 : -1) * pos.stockLeg.quantity,
            gamma: 0,
            theta: 0,
            vega: 0,
          }
        : pos.greeks,
    };
  }

  const contracts = pos.legs.map((leg) => findContract(chain, leg));
  const unresolved = contracts.some(
    (contract) => !contract || !(contract.mid > 0) || !Number.isFinite(contract.mid),
  );
  if (unresolved) {
    return livePx > 0 ? { ...pos, px: livePx } : pos;
  }

  const legs: PortfolioLeg[] = pos.legs.map((leg, index) => {
    const contract = contracts[index]!;
    return contract.impliedVolatility > 0 && contract.impliedVolatility !== leg.iv
      ? { ...leg, iv: contract.impliedVolatility }
      : leg;
  });

  const now = Date.now();
  const marks: LegMark[] = legs.map((leg, index) => {
    const contract = contracts[index]!;
    const sign = leg.s === "long" ? 1 : -1;
    const mult = sign * leg.q * 100;
    const dte = Math.max(
      0,
      Math.round((new Date(leg.exp).getTime() - now) / 86_400_000),
    );
    return {
      dte,
      value: contract.mid,
      pnl: (contract.mid - leg.p) * mult,
      delta: contract.delta * mult,
      gamma: contract.gamma * mult,
      theta: contract.theta * mult,
      vega: (contract.vega / 100) * mult,
    };
  });

  const stockPnl = pos.stockLeg
    ? (livePx - pos.stockLeg.entry_price) *
      (pos.stockLeg.side === "long" ? 1 : -1) *
      pos.stockLeg.quantity
    : 0;

  const isClosed = pos.state === "closed";
  const pnl = isClosed ? pos.pnl : marks.reduce((sum, mark) => sum + mark.pnl, 0) + stockPnl;
  const pnlPct = pos.cost > 0 ? (pnl / pos.cost) * 100 : 0;
  const greeks = marks.reduce(
    (sum, mark) => ({
      delta: sum.delta + mark.delta,
      gamma: sum.gamma + mark.gamma,
      theta: sum.theta + mark.theta,
      vega: sum.vega + mark.vega,
    }),
    { delta: 0, gamma: 0, theta: 0, vega: 0 },
  );
  if (pos.stockLeg) {
    greeks.delta += (pos.stockLeg.side === "long" ? 1 : -1) * pos.stockLeg.quantity;
  }

  return {
    ...pos,
    px: livePx > 0 ? livePx : pos.px,
    pxLive: livePx > 0,
    legs,
    pnl,
    pnlPct,
    marks,
    greeks,
  };
}

function inferStrategy(pos: Position): string | null {
  const n = pos.legs.length;
  if (n === 0) return pos.stock_leg ? "stock" : null;

  const calls = pos.legs.filter((leg) => leg.type === "call");
  const puts = pos.legs.filter((leg) => leg.type === "put");
  const longs = pos.legs.filter((leg) => leg.side === "long");
  const shorts = pos.legs.filter((leg) => leg.side === "short");

  if (n === 1) {
    const leg = pos.legs[0];
    return pos.stock_leg && leg.type === "call" && leg.side === "short"
      ? "covered-call"
      : `${leg.side}-${leg.type}`;
  }
  if (n === 2) {
    if (calls.length === 2 && longs.length === 1) return "call-spread";
    if (puts.length === 2 && longs.length === 1) return "put-spread";
    if (calls.length === 1 && puts.length === 1 && longs.length === 2) return "long-straddle";
    if (calls.length === 1 && puts.length === 1 && shorts.length === 2) return "short-straddle";
  }
  if (n === 4 && calls.length === 2 && puts.length === 2) return "iron-condor";
  return null;
}

export function sortScenarios(scns: Scenario[]): Scenario[] {
  return [...scns].sort((a, b) => {
    if (a.is_preset && !b.is_preset) return -1;
    if (!a.is_preset && b.is_preset) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}
