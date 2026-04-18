"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { OptionsCalculator } from "@/components/calculator/OptionsCalculator";
import { AuthModal } from "@/components/auth/AuthModal";
import type { SavedTrade } from "@/lib/supabase/types";
import Link from "next/link";

export default function TradeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [trade, setTrade] = useState<SavedTrade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/trades/${id}`);
        if (!res.ok) throw new Error("Trade not found");
        const data = await res.json();
        setTrade(data);
      } catch {
        setError("Could not load trade.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, id]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-6xl px-3 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">Sign in to view your saved trades.</p>
        <button
          onClick={() => setShowAuth(true)}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sign in
        </button>
        <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-12 text-center">
        <p className="text-sm text-red-500">{error || "Trade not found."}</p>
        <Link
          href="/trades"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to saved trades
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/trades"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Saved trades
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="text-lg font-bold truncate">{trade.name}</h1>
      </div>

      <OptionsCalculator
        savedTrade={{
          ticker: trade.ticker,
          underlyingPrice: trade.underlying_price,
          legs: trade.legs,
          stock_leg: trade.stock_leg,
        }}
      />
    </div>
  );
}
