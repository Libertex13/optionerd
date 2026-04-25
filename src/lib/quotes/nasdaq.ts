import "server-only";
import type { OptionChain, OptionChainExpiry, OptionContract } from "@/types/market";
import type { NasdaqChainResponse } from "./types";
import { cacheGet, cacheSet } from "./cache";
import { calculateGreeks } from "@/lib/pricing/greeks";
import { solveImpliedVolatility } from "@/lib/pricing/implied-vol";
import {
  CALENDAR_DAYS_PER_YEAR,
  DEFAULT_RISK_FREE_RATE,
  IV_INITIAL_GUESS,
} from "@/lib/utils/constants";

const BASE = "https://api.nasdaq.com";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "application/json,*/*;q=0.8",
};

const CHAIN_TTL_SECONDS = 90;
const REQUEST_TIMEOUT_MS = 8_000;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: HEADERS,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`nasdaq ${res.status}: ${url}`);
  return (await res.json()) as T;
}

function num(v: string | null | undefined): number {
  if (!v || v === "--" || v === "N/A") return 0;
  const n = Number(v.replace(/[$,%\s,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function mid(bid: number, ask: number, last: number): number {
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  if (last > 0) return last;
  return 0;
}

function parseUnderlyingFromLastTrade(s?: string): number {
  // "LAST TRADE: $271.06 (AS OF APR 24, 2026)"
  if (!s) return 0;
  const m = s.match(/\$([0-9]+(?:\.[0-9]+)?)/);
  return m ? Number(m[1]) : 0;
}

function buildOcc(ticker: string, expiry: string, type: "C" | "P", strike: number): string {
  const [y, m, d] = expiry.split("-");
  const yymmdd = y.slice(2) + m + d;
  const strike8 = String(Math.round(strike * 1000)).padStart(8, "0");
  return `${ticker}${yymmdd}${type}${strike8}`;
}

function parseExpiryGroup(label: string): string | null {
  // labels look like "April 24, 2026" or "May 1, 2026"
  const d = new Date(label + " 00:00:00 UTC");
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysUntil(dateIso: string): number {
  const ms = new Date(dateIso + "T16:00:00Z").getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function enrichContractGreeks(
  contract: Omit<OptionContract, "impliedVolatility" | "delta" | "gamma" | "theta" | "vega" | "rho">,
  underlyingPrice: number,
  dte: number,
): OptionContract {
  const timeToExpiry = Math.max(dte / CALENDAR_DAYS_PER_YEAR, 1 / CALENDAR_DAYS_PER_YEAR);
  const marketPrice = contract.mid > 0 ? contract.mid : contract.last;
  const impliedVolatility =
    underlyingPrice > 0 && marketPrice > 0
      ? solveImpliedVolatility({
          marketPrice,
          spotPrice: underlyingPrice,
          strikePrice: contract.strikePrice,
          timeToExpiry,
          riskFreeRate: DEFAULT_RISK_FREE_RATE,
          optionType: contract.optionType,
        }) ?? IV_INITIAL_GUESS
      : IV_INITIAL_GUESS;
  const greeks = calculateGreeks({
    spotPrice: underlyingPrice,
    strikePrice: contract.strikePrice,
    timeToExpiry,
    riskFreeRate: DEFAULT_RISK_FREE_RATE,
    volatility: impliedVolatility,
    optionType: contract.optionType,
  });

  return {
    ...contract,
    impliedVolatility,
    delta: greeks.delta,
    gamma: greeks.gamma,
    theta: greeks.theta,
    vega: greeks.vega,
    rho: greeks.rho,
  };
}

/**
 * Fetch chain from Nasdaq. Single call returns rows interleaved by expiry,
 * with group-header rows marking expiry transitions. We walk the rows and
 * bucket into expiries. Limit defaults to a generous value — Nasdaq's API
 * has a documented `limit` param but caps server-side.
 */
export async function fetchNasdaqChain(
  ticker: string,
  underlyingPriceHint?: number,
): Promise<OptionChain> {
  const t = ticker.toUpperCase();
  const cacheKey = `nasdaq:chain:${t}`;
  const cached = await cacheGet<OptionChain>(cacheKey);
  if (cached) return cached;

  // Nasdaq's default response only includes the next ~5 weekly expiries.
  // An explicit fromdate/todate widens it to the full LEAPS curve.
  const today = new Date().toISOString().slice(0, 10);
  const todate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 3).toISOString().slice(0, 10);
  const url = `${BASE}/api/quote/${t}/option-chain?assetclass=stocks&limit=10000&fromdate=${today}&todate=${todate}`;
  const body = await fetchJson<NasdaqChainResponse>(url);

  const rows = body.data?.table?.rows ?? [];
  const underlyingPrice =
    underlyingPriceHint ?? parseUnderlyingFromLastTrade(body.data?.lastTrade);

  // Walk rows: group-header rows have expirygroup set, subsequent rows have strike + bid/ask.
  const expiryMap = new Map<string, { calls: OptionContract[]; puts: OptionContract[] }>();
  let currentExpiry: string | null = null;

  for (const row of rows) {
    if (row.expirygroup && !row.strike) {
      currentExpiry = parseExpiryGroup(row.expirygroup);
      if (currentExpiry && !expiryMap.has(currentExpiry)) {
        expiryMap.set(currentExpiry, { calls: [], puts: [] });
      }
      continue;
    }
    if (!currentExpiry || !row.strike) continue;

    const strike = num(row.strike);
    if (strike <= 0) continue;

    const cBid = num(row.c_Bid);
    const cAsk = num(row.c_Ask);
    const cLast = num(row.c_Last);
    const pBid = num(row.p_Bid);
    const pAsk = num(row.p_Ask);
    const pLast = num(row.p_Last);

    const dte = daysUntil(currentExpiry);
    const call = enrichContractGreeks({
      contractSymbol: buildOcc(t, currentExpiry, "C", strike),
      ticker: t,
      expirationDate: currentExpiry,
      strikePrice: strike,
      optionType: "call",
      bid: cBid,
      ask: cAsk,
      last: cLast,
      mid: mid(cBid, cAsk, cLast),
      volume: num(row.c_Volume),
      openInterest: num(row.c_Openinterest),
      inTheMoney: underlyingPrice > strike,
    }, underlyingPrice, dte);
    const put = enrichContractGreeks({
      contractSymbol: buildOcc(t, currentExpiry, "P", strike),
      ticker: t,
      expirationDate: currentExpiry,
      strikePrice: strike,
      optionType: "put",
      bid: pBid,
      ask: pAsk,
      last: pLast,
      mid: mid(pBid, pAsk, pLast),
      volume: num(row.p_Volume),
      openInterest: num(row.p_Openinterest),
      inTheMoney: underlyingPrice < strike,
    }, underlyingPrice, dte);

    expiryMap.get(currentExpiry)!.calls.push(call);
    expiryMap.get(currentExpiry)!.puts.push(put);
  }

  const expirations: OptionChainExpiry[] = Array.from(expiryMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([exp, buckets]) => ({
      expirationDate: exp,
      daysToExpiry: daysUntil(exp),
      calls: buckets.calls.sort((a, b) => a.strikePrice - b.strikePrice),
      puts: buckets.puts.sort((a, b) => a.strikePrice - b.strikePrice),
    }));

  const chain: OptionChain = {
    ticker: t,
    underlyingPrice,
    expirations,
    quoteSource: "nasdaq",
    quoteDelayMinutes: 15,
    quoteFetchedAt: Date.now(),
  };
  await cacheSet(cacheKey, chain, CHAIN_TTL_SECONDS);
  return chain;
}

/** Fetch just the underlying spot price by parsing the chain endpoint's lastTrade string. */
export async function fetchNasdaqSpot(ticker: string): Promise<number> {
  const t = ticker.toUpperCase();
  const cacheKey = `nasdaq:spot:${t}`;
  const cached = await cacheGet<number>(cacheKey);
  if (cached !== null && cached > 0) return cached;

  const url = `${BASE}/api/quote/${t}/option-chain?assetclass=stocks&limit=1`;
  const body = await fetchJson<NasdaqChainResponse>(url);
  const px = parseUnderlyingFromLastTrade(body.data?.lastTrade);
  if (px > 0) await cacheSet(cacheKey, px, 60);
  return px;
}
