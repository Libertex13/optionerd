import "server-only";
import type { OptionChain } from "@/types/market";
import { fetchOptionwatchChain } from "./optionwatch";
import { fetchNasdaqChain, fetchNasdaqSpot } from "./nasdaq";
import { cacheGet, cacheSet } from "./cache";

const FULL_CHAIN_TTL_SECONDS = 90;
const inflight = new Map<string, Promise<ChainResult>>();

/**
 * In-memory circuit breaker. Survives the lifetime of a single Vercel
 * function instance — that's enough to absorb a brief Optionwatch outage
 * without hammering them while we fall back to Nasdaq. Cold starts reset it.
 */
class Breaker {
  private failures = 0;
  private openedAt = 0;
  constructor(private threshold: number, private cooldownMs: number) {}
  isOpen() {
    if (this.openedAt === 0) return false;
    if (Date.now() - this.openedAt > this.cooldownMs) {
      this.failures = 0;
      this.openedAt = 0;
      return false;
    }
    return true;
  }
  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.threshold) this.openedAt = Date.now();
  }
  recordSuccess() {
    this.failures = 0;
    this.openedAt = 0;
  }
}

const owBreaker = new Breaker(3, 5 * 60_000);

export interface ChainResult {
  chain: OptionChain;
  source: "optionwatch" | "nasdaq";
}

/**
 * Get a full multi-expiry option chain for a ticker.
 * Tries Nasdaq first because one request returns the full delayed chain.
 * Optionwatch remains a bounded fallback. Whole-result is cached with a tight TTL
 * so repeat callers within ~90s share one upstream call.
 */
export async function getOptionChain(ticker: string): Promise<ChainResult> {
  const t = ticker.toUpperCase();
  const cacheKey = `chain:${t}`;
  const cached = await cacheGet<ChainResult>(cacheKey);
  if (cached) return cached;

  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const request = (async () => {
    try {
      const chain = await fetchNasdaqChain(t);
      if (chain.expirations.length === 0) throw new Error("nasdaq returned empty chain");
      const result: ChainResult = { chain, source: "nasdaq" };
      await cacheSet(cacheKey, result, FULL_CHAIN_TTL_SECONDS);
      return result;
    } catch (err) {
      console.warn(`[quotes] nasdaq failed for ${t}: ${(err as Error).message}`);
    }

    const underlyingPrice = await fetchNasdaqSpot(t).catch(() => 0);
    if (!owBreaker.isOpen()) {
      try {
        const chain = await fetchOptionwatchChain(t, underlyingPrice);
        if (chain.expirations.length === 0) {
          throw new Error("optionwatch returned empty chain");
        }
        owBreaker.recordSuccess();
        const result: ChainResult = { chain, source: "optionwatch" };
        await cacheSet(cacheKey, result, FULL_CHAIN_TTL_SECONDS);
        return result;
      } catch (err) {
        owBreaker.recordFailure();
        console.warn(`[quotes] optionwatch failed for ${t}: ${(err as Error).message}`);
      }
    }

    throw new Error(`No delayed options chain available for ${t}`);
  })().finally(() => inflight.delete(cacheKey));

  inflight.set(cacheKey, request);
  return request;
}
