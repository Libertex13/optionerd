/**
 * URL-safe encoding of strategy state for shareable links.
 *
 * Format: base64url(JSON) of a compact shape with short keys.
 * Current schema version is 1 (`v` field). Bump when the shape changes
 * incompatibly so old links can be rejected cleanly.
 */

import type { SavedTradeLeg, SavedStockLeg } from "@/lib/supabase/types";

export interface SharedStrategy {
  ticker: string;
  underlyingPrice: number;
  legs: SavedTradeLeg[];
  stockLeg: SavedStockLeg | null;
}

interface EncodedPayload {
  v: 1;
  t: string;
  u: number;
  l: Array<{
    c: "c" | "p";
    s: "l" | "s";
    k: number;
    p: number;
    q: number;
    e: string;
    i: number;
  }>;
  sl: { s: "l" | "s"; q: number; e: number } | null;
}

function base64UrlEncode(input: string): string {
  const b64 =
    typeof btoa === "function"
      ? btoa(unescape(encodeURIComponent(input)))
      : Buffer.from(input, "utf-8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  if (typeof atob === "function") {
    return decodeURIComponent(escape(atob(b64)));
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}

export function encodeStrategy(state: SharedStrategy): string {
  const payload: EncodedPayload = {
    v: 1,
    t: state.ticker,
    u: round(state.underlyingPrice, 4),
    l: state.legs.map((l) => ({
      c: l.option_type === "call" ? "c" : "p",
      s: l.position_type === "long" ? "l" : "s",
      k: round(l.strike_price, 4),
      p: round(l.premium, 4),
      q: l.quantity,
      e: l.expiration_date,
      i: round(l.implied_volatility, 6),
    })),
    sl: state.stockLeg
      ? {
          s: state.stockLeg.position_type === "long" ? "l" : "s",
          q: state.stockLeg.quantity,
          e: round(state.stockLeg.entry_price, 4),
        }
      : null,
  };
  return base64UrlEncode(JSON.stringify(payload));
}

export function decodeStrategy(encoded: string): SharedStrategy | null {
  let raw: unknown;
  try {
    raw = JSON.parse(base64UrlDecode(encoded));
  } catch {
    return null;
  }

  if (!isEncodedPayload(raw)) return null;

  return {
    ticker: raw.t,
    underlyingPrice: raw.u,
    legs: raw.l.map((leg) => ({
      option_type: leg.c === "c" ? "call" : "put",
      position_type: leg.s === "l" ? "long" : "short",
      strike_price: leg.k,
      premium: leg.p,
      quantity: leg.q,
      expiration_date: leg.e,
      implied_volatility: leg.i,
    })),
    stockLeg: raw.sl
      ? {
          position_type: raw.sl.s === "l" ? "long" : "short",
          quantity: raw.sl.q,
          entry_price: raw.sl.e,
        }
      : null,
  };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isEncodedPayload(value: unknown): value is EncodedPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.v !== 1) return false;
  if (typeof v.t !== "string" || !v.t) return false;
  if (typeof v.u !== "number" || !isFinite(v.u)) return false;
  if (!Array.isArray(v.l)) return false;
  for (const leg of v.l) {
    if (!leg || typeof leg !== "object") return false;
    const l = leg as Record<string, unknown>;
    if (l.c !== "c" && l.c !== "p") return false;
    if (l.s !== "l" && l.s !== "s") return false;
    if (typeof l.k !== "number" || !isFinite(l.k)) return false;
    if (typeof l.p !== "number" || !isFinite(l.p)) return false;
    if (typeof l.q !== "number" || !Number.isInteger(l.q) || l.q < 1) return false;
    if (typeof l.e !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(l.e)) return false;
    if (typeof l.i !== "number" || !isFinite(l.i)) return false;
  }
  if (v.sl !== null) {
    if (!v.sl || typeof v.sl !== "object") return false;
    const s = v.sl as Record<string, unknown>;
    if (s.s !== "l" && s.s !== "s") return false;
    if (typeof s.q !== "number" || !Number.isInteger(s.q) || s.q < 1) return false;
    if (typeof s.e !== "number" || !isFinite(s.e)) return false;
  }
  return true;
}
