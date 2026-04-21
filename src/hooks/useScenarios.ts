"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { Scenario } from "@/lib/portfolio/types";
import { SYSTEM_SCENARIOS } from "@/lib/portfolio/system-scenarios";

interface UseScenariosReturn {
  scenarios: Scenario[];      // system presets + user scenarios merged
  userScenarios: Scenario[];  // user-created only
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useScenarios(): UseScenariosReturn {
  const { user, loading: authLoading } = useAuth();
  const [userScenarios, setUserScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setUserScenarios([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scenarios");
      if (res.ok) {
        const data: Scenario[] = await res.json();
        setUserScenarios(data.map((s) => ({ ...s, is_preset: false })));
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to load scenarios");
      }
    } catch {
      setError("Failed to load scenarios");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh();
  }, [authLoading, refresh]);

  return {
    scenarios: [...SYSTEM_SCENARIOS, ...userScenarios],
    userScenarios,
    loading,
    error,
    refresh,
  };
}
