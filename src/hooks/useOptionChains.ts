"use client";

import { useEffect, useMemo, useState } from "react";
import type { OptionChain } from "@/types/market";

interface State {
  chains: Record<string, OptionChain>;
  loading: boolean;
  lastUpdated: number | null;
}

/**
 * Fetches full option chains for a set of tickers and re-polls on an interval.
 * The /api/options/chain endpoint caches server-side for 60s, so a 60s client
 * interval keeps Greeks + mids warm without hammering Polygon.
 *
 * Returns only chains for the *currently requested* tickers, so removed
 * positions don't carry stale chain data.
 */
export function useOptionChains(
  tickers: string[],
  intervalMs = 60_000,
): State {
  const unique = useMemo(
    () => Array.from(new Set(tickers.filter(Boolean))).sort(),
    [tickers],
  );
  const key = unique.join(",");

  const [chains, setChains] = useState<Record<string, OptionChain>>({});
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (unique.length === 0) return;
    let cancelled = false;

    const fetchTargets = () => {
      void Promise.all(
        unique.map(async (t) => {
          try {
            const r = await fetch(
              `/api/options/chain?ticker=${encodeURIComponent(t)}`,
            );
            if (!r.ok) return [t, null] as const;
            const chain = (await r.json()) as OptionChain;
            return [t, chain] as const;
          } catch {
            return [t, null] as const;
          }
        }),
      ).then((entries) => {
        if (cancelled) return;
        setChains((prev) => {
          const next = { ...prev };
          for (const [t, c] of entries) if (c) next[t] = c;
          return next;
        });
        setLastUpdated(Date.now());
      });
    };

    fetchTargets();
    const id = setInterval(fetchTargets, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [key, intervalMs, unique]);

  // Only expose chains for currently-requested tickers so the consumer
  // doesn't see stale entries for tickers that have been removed.
  const activeChains = useMemo(() => {
    const out: Record<string, OptionChain> = {};
    for (const t of unique) if (chains[t]) out[t] = chains[t];
    return out;
  }, [chains, unique]);

  return { chains: activeChains, loading: false, lastUpdated };
}
