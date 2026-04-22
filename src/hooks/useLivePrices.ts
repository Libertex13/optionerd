"use client";

import { useEffect, useMemo, useState } from "react";

interface LivePricesState {
  prices: Record<string, number>;
  loading: boolean;
  lastUpdated: number | null;
}

/**
 * Fetches current underlying prices for a set of tickers via /api/options/quote
 * and re-polls on an interval. The quote endpoint already caches server-side
 * for 60s, so a 30s client interval just keeps the UI warm without hammering.
 */
export function useLivePrices(
  tickers: string[],
  intervalMs = 30_000,
): LivePricesState {
  const unique = useMemo(
    () => Array.from(new Set(tickers.filter(Boolean))).sort(),
    [tickers],
  );
  const key = unique.join(",");

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (unique.length === 0) {
      setPrices({});
      setLastUpdated(null);
      return;
    }
    let cancelled = false;

    const fetchAll = async () => {
      setLoading(true);
      const entries = await Promise.all(
        unique.map(async (t) => {
          try {
            const r = await fetch(
              `/api/options/quote?ticker=${encodeURIComponent(t)}`,
            );
            if (!r.ok) return [t, null] as const;
            const q = (await r.json()) as { price?: number };
            return [t, typeof q.price === "number" ? q.price : null] as const;
          } catch {
            return [t, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setPrices((prev) => {
        const next = { ...prev };
        for (const [t, p] of entries) {
          if (p != null && p > 0) next[t] = p;
        }
        return next;
      });
      setLastUpdated(Date.now());
      setLoading(false);
    };

    fetchAll();
    const id = setInterval(fetchAll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [key, intervalMs, unique]);

  return { prices, loading, lastUpdated };
}
