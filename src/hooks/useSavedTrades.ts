"use client";

import { useState, useCallback } from "react";
import type { SavedTrade, SavedTradeLeg, SavedStockLeg } from "@/lib/supabase/types";

interface SaveTradeInput {
  name: string;
  ticker: string;
  underlying_price: number;
  legs: SavedTradeLeg[];
  stock_leg: SavedStockLeg | null;
  notes?: string;
  tags?: string[];
}

export function useSavedTrades() {
  const [trades, setTrades] = useState<SavedTrade[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trades");
      if (res.ok) {
        const data = await res.json();
        setTrades(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const saveTrade = useCallback(async (input: SaveTradeInput): Promise<SavedTrade | null> => {
    const res = await fetch("/api/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      const trade = await res.json();
      setTrades((prev) => [trade, ...prev]);
      return trade;
    }
    return null;
  }, []);

  const updateTrade = useCallback(async (id: string, input: Partial<SaveTradeInput>): Promise<SavedTrade | null> => {
    const res = await fetch(`/api/trades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (res.ok) {
      const updated = await res.json();
      setTrades((prev) => prev.map((t) => (t.id === id ? updated : t)));
      return updated;
    }
    return null;
  }, []);

  const deleteTrade = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTrades((prev) => prev.filter((t) => t.id !== id));
      return true;
    }
    return false;
  }, []);

  return {
    trades,
    loading,
    fetchTrades,
    saveTrade,
    updateTrade,
    deleteTrade,
  };
}
