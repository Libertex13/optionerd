"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Position, PortfolioPosition } from "@/lib/portfolio/types";
import { normalizePosition } from "@/lib/portfolio/normalize";

interface UsePositionsReturn {
  positions: PortfolioPosition[];
  raw: Position[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
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

  return {
    positions: raw.map(normalizePosition),
    raw,
    loading,
    error,
    refresh,
  };
}
