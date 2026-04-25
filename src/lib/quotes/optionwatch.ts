import "server-only";
import type { OptionChain, OptionChainExpiry, OptionContract } from "@/types/market";
import type { OwListingExpiry, OwSnapshot, OwSnapshotContract } from "./types";
import { cacheGet, cacheSet } from "./cache";

const BASE = "https://api.optionwatch.io";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Origin: "https://optionwatch.io",
  Referer: "https://optionwatch.io/",
  Accept: "application/json,*/*;q=0.8",
};

const LISTING_TTL_SECONDS = 30 * 60;
const SNAPSHOT_TTL_SECONDS = 90;
const REQUEST_TIMEOUT_MS = 8_000;

// Optionwatch fallback requires one snapshot request per expiry. Keep the
// fallback bounded so a Nasdaq outage does not fan out into dozens of upstream
// calls per ticker. Deep LEAPS beyond this cap may fall back to BS marks.
const MAX_FALLBACK_EXPIRIES = 16;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`optionwatch ${res.status}: ${url}`);
  }
  // Optionwatch returns HTML error pages with status 200 for unknown tickers
  // (e.g. CoreWeave isn't in their universe → "Invalid stock symbol" HTML).
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    throw new Error(`optionwatch non-JSON response (${ct || "no content-type"}): ${url}`);
  }
  return (await res.json()) as T;
}

async function getListing(ticker: string): Promise<OwListingExpiry[]> {
  const key = `ow:listing:${ticker}`;
  const cached = await cacheGet<OwListingExpiry[]>(key);
  if (cached) return cached;

  const data = await fetchJson<OwListingExpiry[]>(`${BASE}/api/contracts/${ticker}`);
  if (!Array.isArray(data)) throw new Error("optionwatch listing: not an array");
  await cacheSet(key, data, LISTING_TTL_SECONDS);
  return data;
}

async function getSnapshot(ticker: string, expiry: string): Promise<OwSnapshot> {
  const key = `ow:snap:${ticker}:${expiry}`;
  const cached = await cacheGet<OwSnapshot>(key);
  if (cached) return cached;

  const data = await fetchJson<OwSnapshot>(
    `${BASE}/api/contracts/snapshot/${ticker}/${expiry}`,
  );
  if (!data || typeof data !== "object") {
    throw new Error("optionwatch snapshot: invalid payload");
  }
  await cacheSet(key, data, SNAPSHOT_TTL_SECONDS);
  return data;
}

function mid(bid: number, ask: number, last: number): number {
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  if (last > 0) return last;
  return 0;
}

function buildContract(
  occ: string,
  meta: { strike: number; type: "call" | "put"; expiration: string },
  ticker: string,
  underlyingPrice: number,
  q: OwSnapshotContract | undefined,
): OptionContract {
  const bid = q?.bidPrice ?? 0;
  const ask = q?.askPrice ?? 0;
  const last = q?.lastTradePrice ?? 0;
  const greeks = q?.greeks ?? {};

  return {
    contractSymbol: occ,
    ticker,
    expirationDate: meta.expiration,
    strikePrice: meta.strike,
    optionType: meta.type,
    bid,
    ask,
    last,
    mid: mid(bid, ask, last),
    volume: 0, // optionwatch snapshot doesn't carry volume
    openInterest: 0, // not in snapshot
    impliedVolatility: 0, // not surfaced; client-derive if needed
    delta: greeks.delta ?? 0,
    gamma: greeks.gamma ?? 0,
    theta: greeks.theta ?? 0,
    vega: greeks.vega ?? 0,
    rho: 0,
    inTheMoney:
      meta.type === "call"
        ? underlyingPrice > meta.strike
        : underlyingPrice < meta.strike,
  };
}

function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso + "T16:00:00Z").getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Fetch a full multi-expiry option chain from Optionwatch.
 * Issues 1 listing call + N parallel snapshot calls (one per expiry).
 * Underlying price must be supplied separately — Optionwatch's stock-price
 * endpoint returns encrypted data we don't decode.
 */
export async function fetchOptionwatchChain(
  ticker: string,
  underlyingPrice: number,
): Promise<OptionChain> {
  const t = ticker.toUpperCase();
  const listing = await getListing(t);

  // Index listing entries by expiration — each item already groups calls/puts.
  const expiryMap = new Map<
    string,
    { calls: { strike: number; occ: string }[]; puts: { strike: number; occ: string }[] }
  >();

  for (const group of listing) {
    for (const c of group.calls ?? []) {
      const exp = c.expiration_date;
      if (!expiryMap.has(exp)) expiryMap.set(exp, { calls: [], puts: [] });
      expiryMap.get(exp)!.calls.push({ strike: c.strike_price, occ: c.ticker });
    }
    for (const p of group.puts ?? []) {
      const exp = p.expiration_date;
      if (!expiryMap.has(exp)) expiryMap.set(exp, { calls: [], puts: [] });
      expiryMap.get(exp)!.puts.push({ strike: p.strike_price, occ: p.ticker });
    }
  }

  const expiries = Array.from(expiryMap.keys()).sort().slice(0, MAX_FALLBACK_EXPIRIES);
  if (expiries.length === 0) {
    return { ticker: t, underlyingPrice, expirations: [] };
  }

  // Fan out: one snapshot call per expiry, in parallel.
  const snapshots = await Promise.all(
    expiries.map((exp) => getSnapshot(t, exp).catch(() => null)),
  );

  const expirations: OptionChainExpiry[] = expiries.map((exp, i) => {
    const snap = snapshots[i] ?? {};
    const buckets = expiryMap.get(exp)!;
    const calls = buckets.calls
      .map((c) =>
        buildContract(c.occ, { strike: c.strike, type: "call", expiration: exp }, t, underlyingPrice, snap[c.occ]),
      )
      .sort((a, b) => a.strikePrice - b.strikePrice);
    const puts = buckets.puts
      .map((p) =>
        buildContract(p.occ, { strike: p.strike, type: "put", expiration: exp }, t, underlyingPrice, snap[p.occ]),
      )
      .sort((a, b) => a.strikePrice - b.strikePrice);
    return {
      expirationDate: exp,
      daysToExpiry: daysUntil(exp),
      calls,
      puts,
    };
  });

  return {
    ticker: t,
    underlyingPrice,
    expirations,
    quoteSource: "optionwatch",
    quoteDelayMinutes: 15,
    quoteFetchedAt: Date.now(),
  };
}
