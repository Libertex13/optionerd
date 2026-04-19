"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/supabase/types";

interface UsePlanReturn {
  plan: Plan;
  loading: boolean;
  isNerd: boolean;
  isCasual: boolean;
  refresh: () => void;
}

export function usePlan(): UsePlanReturn {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("casual");
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(() => {
    if (!user) {
      setPlan("casual");
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: { plan: string } | null }) => {
        setPlan((data?.plan as Plan) ?? "casual");
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Re-fetch when tab regains focus (e.g., returning from Stripe checkout)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && user) {
        fetchPlan();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchPlan, user]);

  return {
    plan,
    loading,
    isNerd: plan === "nerd",
    isCasual: plan === "casual",
    refresh: fetchPlan,
  };
}
