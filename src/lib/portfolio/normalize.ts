import type {
  LegMark,
  Position,
  PortfolioPosition,
  PortfolioLeg,
  Scenario,
} from "./types";
import { markPosition } from "./pricing";
import type { OptionChain, OptionContract } from "@/types/market";

/**
 * Map a DB position into the compact UI shape used by the dashboard.
 *
 * Initially marked against entry_underlying_price. Callers that have a live
 * quote should call applyLivePrice() to re-mark with the current underlying.
 */
export function normalizePosition(pos: Position): PortfolioPosition {
  const now = new Date();

  const legs: PortfolioLeg[] = pos.legs.map((l) => ({
    s: l.side,
    t: l.type,
    k: l.strike,
    p: l.entry_premium,
    q: l.quantity,
    iv: l.implied_volatility,
    exp: l.expiration_date,
  }));

  // Net: short premiums bring credit (+), long premiums cost debit (−), in dollars
  const net = pos.legs.reduce(
    (sum, l) =>
      sum + (l.side === "short" ? 1 : -1) * l.entry_premium * l.quantity * 100,
    0,
  );

  // DTE: min expiration among legs
  const expiryDates = pos.legs
    .map((l) => new Date(l.expiration_date).getTime())
    .filter((t) => !Number.isNaN(t));
  const minExpiry = expiryDates.length > 0 ? Math.min(...expiryDates) : now.getTime();
  const maxExpiry = expiryDates.length > 0 ? Math.max(...expiryDates) : now.getTime();
  const dte = Math.max(0, Math.round((minExpiry - now.getTime()) / 86_400_000));

  // dteMax: span from entry (or created_at) to the latest expiration — used to size the progress bar
  const start = pos.entry_date ?? pos.created_at;
  const startTime = start ? new Date(start).getTime() : now.getTime();
  const dteMax = Math.max(
    1,
    Math.round((maxExpiry - startTime) / 86_400_000),
  );

  // Cost: user-specified cost_basis or |net| as fallback
  const cost = pos.cost_basis ?? Math.abs(net);

  // Strategy: stored value, else inferred label, else "custom"
  const strat = pos.strategy ?? inferStrategy(pos) ?? "custom";

  // Entry label (date only)
  const entry = pos.entry_date
    ? pos.entry_date.slice(0, 10)
    : null;

  // Initial px from entry (no live feed yet)
  const px = pos.entry_underlying_price ?? 0;
  const mark = markPosition(legs, px > 0 ? px : 1, now);

  // P/L: realised for closed positions; initial mark is 0 (S = entry), live
  // feed will re-mark via applyLivePrice().
  const pnl =
    pos.state === "closed" ? pos.realised_pnl ?? 0 : mark.pnl;
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
 * data isn't available — BS with a stale IV can diverge materially from
 * the actual market mid.
 */
export function applyLivePrice(
  pos: PortfolioPosition,
  livePx: number,
): PortfolioPosition {
  if (!(livePx > 0)) return pos;
  const mark = markPosition(pos.legs, livePx);
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

/** Look up a leg's contract inside a chain by expiration + type + strike. */
function findContract(
  chain: OptionChain,
  leg: PortfolioLeg,
): OptionContract | null {
  const expiry = chain.expirations.find(
    (e) => e.expirationDate === leg.exp,
  );
  if (!expiry) return null;
  const pool = leg.t === "call" ? expiry.calls : expiry.puts;
  return (
    pool.find((c) => Math.abs(c.strikePrice - leg.k) < 0.001) ?? null
  );
}

/**
 * Mark a position against a live options chain. Uses the current market
 * mid for each leg's value and the chain's own Greeks — this is the
 * correct way to mark-to-market, matching what TradeStation / OPC show.
 *
 * If any leg can't be matched in the chain (unusual strike, delisted,
 * partial fetch), falls back to BS-on-underlying via applyLivePrice so
 * something sensible still renders.
 */
export function applyLiveMarks(
  pos: PortfolioPosition,
  chain: OptionChain | undefined,
): PortfolioPosition {
  if (!chain) return pos;
  const livePx = chain.underlyingPrice;
  if (pos.legs.length === 0) {
    return livePx > 0
      ? { ...pos, px: livePx, pxLive: true }
      : pos;
  }

  const contracts = pos.legs.map((l) => findContract(chain, l));
  // Treat a contract with no usable price (mid === 0) as unresolved — otherwise
  // we'd mark the leg as worthless and show a bogus −100% P/L. Polygon returns
  // mid=0 for untraded strikes and for delayed-feed snapshots without a quote.
  // In that case show "awaiting feed" (pxLive=false) rather than falling back
  // to BS with entry IV, which drifts materially from market.
  const unresolved = contracts.some(
    (c) => !c || !(c.mid > 0) || !Number.isFinite(c.mid),
  );
  if (unresolved) {
    return livePx > 0 ? { ...pos, px: livePx } : pos;
  }

  const now = Date.now();
  const marks: LegMark[] = pos.legs.map((l, i) => {
    const c = contracts[i]!;
    const sign = l.s === "long" ? 1 : -1;
    const mult = sign * l.q * 100;
    const dte = Math.max(
      0,
      Math.round((new Date(l.exp).getTime() - now) / 86_400_000),
    );
    return {
      dte,
      value: c.mid,
      pnl: (c.mid - l.p) * mult,
      delta: c.delta * mult,
      gamma: c.gamma * mult,
      // Polygon returns theta already in $/day (per share).
      theta: c.theta * mult,
      // Polygon's vega is per 1.00 of IV (100%), so per 1% = /100.
      vega: (c.vega / 100) * mult,
    };
  });

  const isClosed = pos.state === "closed";
  const pnl = isClosed ? pos.pnl : marks.reduce((s, m) => s + m.pnl, 0);
  const pnlPct = pos.cost > 0 ? (pnl / pos.cost) * 100 : 0;
  const greeks = marks.reduce(
    (a, m) => ({
      delta: a.delta + m.delta,
      gamma: a.gamma + m.gamma,
      theta: a.theta + m.theta,
      vega: a.vega + m.vega,
    }),
    { delta: 0, gamma: 0, theta: 0, vega: 0 },
  );

  return {
    ...pos,
    px: livePx > 0 ? livePx : pos.px,
    pxLive: livePx > 0,
    pnl,
    pnlPct,
    marks,
    greeks,
  };
}

/** Rough strategy detection from leg composition — best-effort label. */
function inferStrategy(pos: Position): string | null {
  const n = pos.legs.length;
  if (n === 0) return null;

  const calls = pos.legs.filter((l) => l.type === "call");
  const puts = pos.legs.filter((l) => l.type === "put");
  const longs = pos.legs.filter((l) => l.side === "long");
  const shorts = pos.legs.filter((l) => l.side === "short");

  if (n === 1) {
    const l = pos.legs[0];
    return `${l.side}-${l.type}`;
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

/** Sort scenarios: system presets first, then user scenarios by created_at desc. */
export function sortScenarios(scns: Scenario[]): Scenario[] {
  return [...scns].sort((a, b) => {
    if (a.is_preset && !b.is_preset) return -1;
    if (!a.is_preset && b.is_preset) return 1;
    return b.created_at.localeCompare(a.created_at);
  });
}
