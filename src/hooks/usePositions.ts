"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Position, PortfolioPosition } from "@/lib/portfolio/types";
import { applyLiveMarks, normalizePosition } from "@/lib/portfolio/normalize";
import { useOptionChains } from "@/hooks/useOptionChains";
import type { OptionChain } from "@/types/market";

interface UsePositionsReturn {
  positions: PortfolioPosition[];
  raw: Position[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastTick: number | null;
  liveCoverage: { live: number; total: number };
  chains: Record<string, OptionChain>;
}

export function usePositions(): UsePositionsReturn {
  const { user, loading: authLoading } = useAuth();
  const [raw, setRaw] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setRaw([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/positions");
      if (res.ok) {
        const data: Position[] = await res.json();
        setRaw(data);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to load positions");
      }
    } catch {
      setError("Failed to load positions");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  const normalized = useMemo(() => raw.map(normalizePosition), [raw]);

  const tickers = useMemo(
    () => normalized.map((p) => p.ticker),
    [normalized],
  );
  const { chains, lastUpdated } = useOptionChains(tickers);

  const positions = useMemo(
    () => normalized.map((p) => applyLiveMarks(p, chains[p.ticker])),
    [normalized, chains],
  );

  const liveCoverage = useMemo(() => {
    const total = positions.length;
    const live = positions.filter((p) => p.pxLive).length;
    return { live, total };
  }, [positions]);

  return {
    positions,
    raw,
    loading,
    error,
    refresh,
    lastTick: lastUpdated,
    liveCoverage,
    chains,
  };
}
