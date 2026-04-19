/**
 * Map a leg set to a strategy template slug.
 *
 * Used when generating share URLs so saves land on the closest indexed
 * /calculator/[strategy] page. Returns null when no template matches —
 * callers should fall back to the home builder (/).
 *
 * Detection is structural, not strike-exact. Strike offsets in templates are
 * defaults for auto-population, not a fingerprint. We match on: leg count,
 * option type / side of each leg, relative strike ordering, and whether
 * strikes and expiries align across legs.
 */

import type { SavedTradeLeg, SavedStockLeg } from "@/lib/supabase/types";

type Side = "long" | "short";
type Type = "call" | "put";

interface NormalizedLeg {
  type: Type;
  side: Side;
  strike: number;
  quantity: number;
  expiry: string;
}

export function detectStrategySlug(
  legs: SavedTradeLeg[],
  stockLeg: SavedStockLeg | null,
): string | null {
  if (legs.length === 0) return null;

  const normalized: NormalizedLeg[] = legs.map((l) => ({
    type: l.option_type,
    side: l.position_type,
    strike: l.strike_price,
    quantity: l.quantity,
    expiry: l.expiration_date,
  }));

  const sameExpiry = normalized.every((l) => l.expiry === normalized[0].expiry);

  // Covered call: 1 short call + long stock
  if (
    normalized.length === 1 &&
    stockLeg &&
    stockLeg.position_type === "long" &&
    normalized[0].type === "call" &&
    normalized[0].side === "short"
  ) {
    return "covered-call";
  }

  if (stockLeg) return null;

  if (normalized.length === 1) {
    const [l] = normalized;
    if (l.type === "call" && l.side === "long") return "long-call";
    if (l.type === "put" && l.side === "long") return "long-put";
    return null;
  }

  if (!sameExpiry) return null;

  if (normalized.length === 2) {
    return detectTwoLeg(normalized);
  }

  if (normalized.length === 3) {
    return detectThreeLeg(normalized);
  }

  if (normalized.length === 4) {
    return detectFourLeg(normalized);
  }

  return null;
}

function detectTwoLeg(legs: NormalizedLeg[]): string | null {
  const calls = legs.filter((l) => l.type === "call");
  const puts = legs.filter((l) => l.type === "put");

  // Straddle / Strangle: 1 long call + 1 long put (same expiry)
  if (calls.length === 1 && puts.length === 1) {
    const c = calls[0];
    const p = puts[0];
    if (c.side === "long" && p.side === "long" && c.quantity === p.quantity) {
      return c.strike === p.strike ? "long-straddle" : "long-strangle";
    }
    if (c.side === "short" && p.side === "short" && c.quantity === p.quantity) {
      // Short strangle only (short straddle not in template set)
      return c.strike !== p.strike ? "short-strangle" : null;
    }
    return null;
  }

  // Vertical spreads: 2 same-type, opposite sides, same quantity
  if (calls.length === 2 || puts.length === 2) {
    const [a, b] = calls.length === 2 ? calls : puts;
    if (a.side === b.side) return null;
    if (a.quantity !== b.quantity) return null;

    const long = a.side === "long" ? a : b;
    const short = a.side === "short" ? a : b;

    if (calls.length === 2) {
      // Bull call: long lower strike, short higher strike
      if (long.strike < short.strike) return "bull-call-spread";
      // Bear call: short lower strike, long higher strike
      if (short.strike < long.strike) return "bear-call-spread";
    } else {
      // Bull put: short higher strike, long lower strike
      if (short.strike > long.strike) return "bull-put-spread";
      // Bear put: long higher strike, short lower strike
      if (long.strike > short.strike) return "bear-put-spread";
    }
  }

  return null;
}

function detectThreeLeg(legs: NormalizedLeg[]): string | null {
  // Call butterfly: long-short-short-long pattern collapsed into 3 strikes
  // = +1C @ low, -2C @ mid, +1C @ high (all calls, same expiry)
  const calls = legs.filter((l) => l.type === "call");
  if (calls.length !== 3) return null;

  const sorted = [...calls].sort((a, b) => a.strike - b.strike);
  const [low, mid, high] = sorted;

  const isButterfly =
    low.side === "long" &&
    mid.side === "short" &&
    high.side === "long" &&
    low.quantity === high.quantity &&
    mid.quantity === low.quantity * 2 &&
    high.strike - mid.strike === mid.strike - low.strike;

  return isButterfly ? "call-butterfly" : null;
}

function detectFourLeg(legs: NormalizedLeg[]): string | null {
  const calls = legs.filter((l) => l.type === "call");
  const puts = legs.filter((l) => l.type === "put");
  if (calls.length !== 2 || puts.length !== 2) return null;

  const sortedCalls = [...calls].sort((a, b) => a.strike - b.strike);
  const sortedPuts = [...puts].sort((a, b) => a.strike - b.strike);

  const [putLow, putHigh] = sortedPuts;
  const [callLow, callHigh] = sortedCalls;

  // Iron condor / butterfly structure: long-put-low, short-put-high, short-call-low, long-call-high
  const structural =
    putLow.side === "long" &&
    putHigh.side === "short" &&
    callLow.side === "short" &&
    callHigh.side === "long" &&
    legs.every((l) => l.quantity === legs[0].quantity);

  if (!structural) return null;

  // Iron butterfly: short put strike == short call strike (body is ATM)
  if (putHigh.strike === callLow.strike) return "iron-butterfly";

  // Iron condor: short put strike < short call strike (gap between the bodies)
  if (putHigh.strike < callLow.strike) return "iron-condor";

  return null;
}
