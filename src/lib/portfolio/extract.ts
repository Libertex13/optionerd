import type { PositionLeg } from "./types";
import type { ParsedPositionDraft } from "./importParser";

export interface ExtractedLeg {
  side: "long" | "short";
  option_type: "call" | "put";
  strike: number;
  quantity: number;
  entry_premium: number;
  expiration_date: string; // YYYY-MM-DD
}

export interface ExtractedPosition {
  ticker: string;
  description: string;
  legs: ExtractedLeg[];
  cost_basis: number | null;
}

export interface ExtractionResult {
  positions: ExtractedPosition[];
  notes?: string;
}

export function inferStrategy(legs: PositionLeg[]): string {
  if (legs.length === 1) {
    const l = legs[0];
    return `${l.side}-${l.type}`;
  }
  const calls = legs.filter((l) => l.type === "call");
  const puts = legs.filter((l) => l.type === "put");
  const longs = legs.filter((l) => l.side === "long");
  const shorts = legs.filter((l) => l.side === "short");
  const expirations = new Set(legs.map((l) => l.expiration_date));
  const strikes = new Set(legs.map((l) => l.strike));

  if (legs.length === 2) {
    if (
      strikes.size === 1 &&
      expirations.size === 2 &&
      (calls.length === 2 || puts.length === 2) &&
      longs.length === 1 &&
      shorts.length === 1
    ) {
      return puts.length === 2 ? "put-calendar" : "call-calendar";
    }
    if (
      expirations.size === 1 &&
      (calls.length === 2 || puts.length === 2) &&
      longs.length === 1 &&
      shorts.length === 1
    ) {
      return puts.length === 2 ? "put-spread" : "call-spread";
    }
    if (calls.length === 1 && puts.length === 1) {
      if (longs.length === 2) return "long-straddle";
      if (shorts.length === 2) return "short-straddle";
    }
  }
  if (legs.length === 4 && calls.length === 2 && puts.length === 2) {
    return "iron-condor";
  }
  return "custom";
}

export function toParsedDraft(p: ExtractedPosition): ParsedPositionDraft {
  const legs: PositionLeg[] = p.legs.map((l) => ({
    side: l.side,
    type: l.option_type,
    strike: l.strike,
    entry_premium: l.entry_premium,
    quantity: l.quantity,
    expiration_date: l.expiration_date,
    implied_volatility: 0,
  }));
  // Always compute cost from legs — the AI sometimes grabs "Market Value"
  // instead of "Total Cost" when they sit in adjacent columns, which then
  // feeds bad denominators into % P/L and scenario math.
  const cost = legs.reduce(
    (s, l) => s + l.entry_premium * l.quantity * 100,
    0,
  );
  return {
    name: p.description,
    ticker: p.ticker.toUpperCase(),
    strategy: inferStrategy(legs),
    cost_basis: cost,
    legs,
  };
}

export function isValidLeg(l: unknown): l is ExtractedLeg {
  if (!l || typeof l !== "object") return false;
  const x = l as Record<string, unknown>;
  return (
    (x.side === "long" || x.side === "short") &&
    (x.option_type === "call" || x.option_type === "put") &&
    typeof x.strike === "number" &&
    typeof x.quantity === "number" &&
    typeof x.entry_premium === "number" &&
    typeof x.expiration_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.expiration_date)
  );
}

export function isValidExtractedPosition(
  p: unknown,
): p is ExtractedPosition {
  if (!p || typeof p !== "object") return false;
  const x = p as Record<string, unknown>;
  return (
    typeof x.ticker === "string" &&
    typeof x.description === "string" &&
    Array.isArray(x.legs) &&
    x.legs.length > 0 &&
    x.legs.every(isValidLeg)
  );
}
