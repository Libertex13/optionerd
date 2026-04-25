"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSavedTrades } from "@/hooks/useSavedTrades";
import { AuthModal } from "@/components/auth/AuthModal";
import { Card, CardContent } from "@/components/ui/card";
import type { SavedTrade } from "@/lib/supabase/types";
import Link from "next/link";

function TradeCard({
  trade,
  onDelete,
}: {
  trade: SavedTrade;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const legSummary = trade.legs
    .map(
      (l) =>
        `${l.position_type === "long" ? "BUY" : "SELL"} ${l.quantity}x ${l.option_type.toUpperCase()} $${l.strike_price}`,
    )
    .join("  /  ");

  const totalDebit = trade.legs.reduce((sum, l) => {
    const mult = l.position_type === "long" ? 1 : -1;
    return sum + l.premium * mult * l.quantity * 100;
  }, 0);

  const date = new Date(trade.created_at);
  const dateStr = `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}/${date.getFullYear()}`;

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <Link href={`/trades/${trade.id}`} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">{trade.ticker}</span>
            <span className="text-xs text-muted-foreground">
              ${trade.underlying_price.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">{dateStr}</span>
          </div>
          <p className="mt-0.5 text-sm font-medium truncate">{trade.name}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground truncate">
            {legSummary}
          </p>
          {trade.stock_leg && (
            <p className="font-mono text-xs text-blue-600 dark:text-blue-400">
              + {trade.stock_leg.quantity} shares @ ${trade.stock_leg.entry_price.toFixed(2)}
            </p>
          )}
          <div className="mt-1.5 flex items-center gap-3">
            <span
              className={`font-mono text-xs font-semibold ${
                totalDebit > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
              }`}
            >
              {totalDebit > 0 ? "Debit" : "Credit"} ${Math.abs(totalDebit).toFixed(2)}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {trade.legs.length} leg{trade.legs.length !== 1 ? "s" : ""}
            </span>
            {trade.legs[0] && (
              <span className="font-mono text-xs text-muted-foreground">
                Exp {trade.legs[0].expiration_date}
              </span>
            )}
          </div>
          {trade.notes && (
            <p className="mt-1.5 text-xs text-muted-foreground italic truncate">
              {trade.notes}
            </p>
          )}
        </Link>
        <div className="flex items-center gap-2 shrink-0">
          {confirming ? (
            <>
              <button
                onClick={() => {
                  onDelete(trade.id);
                  setConfirming(false);
                }}
                className="rounded-sm bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TradesPage() {
  const { user, loading: authLoading } = useAuth();
  const { trades, loading: tradesLoading, fetchTrades, deleteTrade } = useSavedTrades();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTrades();
    }
  }, [user, fetchTrades]);

  // Loading state
  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-12 text-center">
        <h1 className="text-2xl font-bold">Saved Trades</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to save and manage your options strategies.
        </p>
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

  return (
    <div className="mx-auto max-w-3xl px-3 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Saved Trades</h1>
        <Link
          href="/"
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          New trade
        </Link>
      </div>

      {tradesLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No saved trades yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use the calculator to build a position, then click &quot;Save trade&quot; to save it here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Open calculator
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onDelete={deleteTrade}
            />
          ))}
        </div>
      )}
    </div>
  );
}
