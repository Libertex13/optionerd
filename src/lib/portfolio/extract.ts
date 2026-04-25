import type { PositionLeg, PositionStockLeg } from "./types";
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
  stock_leg?: {
    side: "long" | "short";
    quantity: number;
    entry_price: number;
  } | null;
  cost_basis: number | null;
}

export interface ExtractionResult {
  positions: ExtractedPosition[];
  notes?: string;
}

export function inferStrategy(
  legs: PositionLeg[],
  stockLeg: PositionStockLeg | null = null,
): string {
  if (legs.length === 0 && stockLeg) return "stock";
  if (legs.length === 1) {
    const l = legs[0];
    if (stockLeg?.side === "long" && l.side === "short" && l.type === "call") {
      return "covered-call";
    }
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
  const stockLeg = p.stock_leg
    ? {
        side: p.stock_leg.side,
        quantity: p.stock_leg.quantity,
        entry_price: p.stock_leg.entry_price,
      }
    : null;
  return {
    name: p.description,
    ticker: p.ticker.toUpperCase(),
    strategy: inferStrategy(legs, stockLeg),
    cost_basis: null,
    legs,
    stock_leg: stockLeg,
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

export function isValidStockLeg(l: unknown): l is NonNullable<ExtractedPosition["stock_leg"]> {
  if (!l || typeof l !== "object") return false;
  const x = l as Record<string, unknown>;
  return (
    (x.side === "long" || x.side === "short") &&
    typeof x.quantity === "number" &&
    x.quantity > 0 &&
    typeof x.entry_price === "number" &&
    x.entry_price > 0
  );
}

export function isValidExtractedPosition(
  p: unknown,
): p is ExtractedPosition {
  if (!p || typeof p !== "object") return false;
  const x = p as Record<string, unknown>;
  if (!Array.isArray(x.legs)) return false;
  const legs = x.legs;
  const stockLeg = x.stock_leg ?? null;
  return (
    typeof x.ticker === "string" &&
    typeof x.description === "string" &&
    legs.every(isValidLeg) &&
    (legs.length > 0 || isValidStockLeg(stockLeg)) &&
    (stockLeg == null || isValidStockLeg(stockLeg))
  );
}
