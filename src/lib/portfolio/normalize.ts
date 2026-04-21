import type {
  Position,
  PortfolioPosition,
  PortfolioLeg,
  Scenario,
} from "./types";

/**
 * Map a DB position into the compact UI shape used by the dashboard.
 *
 * Current underlying price: falls back to entry_underlying_price until a live
 * feed is wired up. P/L stays at 0 for watching/structuring positions until
 * we have current mids to mark against entry premiums.
 */
export function normalizePosition(pos: Position): PortfolioPosition {
  const now = new Date();

  const legs: PortfolioLeg[] = pos.legs.map((l) => ({
    s: l.side,
    t: l.type,
    k: l.strike,
    p: l.entry_premium,
    q: l.quantity,
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

  // P/L: realised on closed positions; 0 otherwise until we have live marks
  const pnl = pos.state === "closed" ? pos.realised_pnl ?? 0 : 0;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

  // Strategy: stored value, else inferred label, else "custom"
  const strat = pos.strategy ?? inferStrategy(pos) ?? "custom";

  // Entry label (date only)
  const entry = pos.entry_date
    ? pos.entry_date.slice(0, 10)
    : null;

  // Current underlying price: fall back to entry price until live feed exists
  const px = pos.entry_underlying_price ?? 0;

  return {
    id: pos.id,
    state: pos.state,
    name: pos.name,
    strat,
    ticker: pos.ticker,
    px,
    legs,
    net,
    dte,
    dteMax,
    cost,
    pnl,
    pnlPct,
    entry,
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
