"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

// Minimal shape for display. SnapTrade returns richer data.
interface BrokerAccount {
  id?: string;
  name?: string | null;
  number?: string | null;
  institution_name?: string | null;
  balance?: {
    total?: { amount?: number; currency?: string } | null;
  };
  meta?: Record<string, unknown>;
  sync_status?: {
    transactions?: {
      initial_sync_completed?: boolean;
      last_successful_sync?: string;
    };
    holdings?: {
      initial_sync_completed?: boolean;
      last_successful_sync?: string;
    };
  };
}

export function PortfolioContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "1";

  const [accounts, setAccounts] = useState<BrokerAccount[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/brokerage/accounts");
      const data = await res.json();
      if (res.ok) {
        setAccounts(data.accounts ?? []);
      } else {
        setError(data.error ?? "Failed to load accounts");
      }
    } catch {
      setError("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadAccounts();
  }, [user, authLoading]);

  const handleConnect = async (broker?: string) => {
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/brokerage/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broker ? { broker } : {}),
      });
      const data = await res.json();
      if (res.ok && data.redirectUri) {
        window.location.href = data.redirectUri;
      } else {
        setError(data.error ?? "Failed to start connection");
        setConnecting(false);
      }
    } catch {
      setError("Failed to start connection");
      setConnecting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-10">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-3 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please sign in to connect a brokerage.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Connect your brokerage to import positions and analyze them with
        optioNerd.
      </p>

      {justConnected && (
        <div className="mt-4 rounded-md border border-green-600/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
          ✓ Broker connection added. If you don&apos;t see accounts below yet,
          SnapTrade may still be syncing — refresh in a moment.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Connect button */}
      <section className="mt-6 rounded-md border border-border bg-card p-4">
        <h2 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Connect a broker
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Opens SnapTrade&apos;s secure connection portal to link your
          brokerage account. Supports 20+ brokers including Tradestation,
          Schwab, Fidelity, IBKR, and more.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleConnect("TRADESTATION")}
            disabled={connecting}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 h-9 text-sm font-medium hover:bg-primary/80 transition-all disabled:opacity-50"
          >
            {connecting ? "Opening..." : "Connect Tradestation"}
          </button>
          <button
            onClick={() => handleConnect("TRADESTATION-SIM")}
            disabled={connecting}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 h-9 text-sm font-medium hover:bg-muted transition-all disabled:opacity-50"
          >
            Connect Tradestation Sim
          </button>
          <button
            onClick={() => handleConnect()}
            disabled={connecting}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 h-9 text-sm font-medium hover:bg-muted transition-all disabled:opacity-50"
          >
            Connect other broker
          </button>
        </div>
      </section>

      {/* Accounts list */}
      <section className="mt-4 rounded-md border border-border bg-card p-4">
        <h2 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Connected accounts
        </h2>

        {loading ? (
          <div className="h-12 animate-pulse rounded bg-muted" />
        ) : !accounts || accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No connected accounts yet. Click &quot;Connect broker&quot; above to
            get started.
          </p>
        ) : (
          <div className="space-y-2">
            {accounts.map((acct, i) => (
              <div
                key={acct.id ?? i}
                className="rounded-md border border-border p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {acct.name ?? "Account"}
                      </span>
                      {acct.institution_name && (
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px]"
                        >
                          {acct.institution_name}
                        </Badge>
                      )}
                    </div>
                    {acct.number && (
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {acct.number}
                      </p>
                    )}
                  </div>
                  {acct.balance?.total?.amount != null && (
                    <div className="text-right">
                      <div className="font-mono text-sm font-medium">
                        ${acct.balance.total.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {acct.balance.total.currency ?? "USD"}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && accounts && accounts.length > 0 && (
          <button
            onClick={loadAccounts}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Refresh
          </button>
        )}
      </section>

      {/* Raw data debug (remove once positions work) */}
      {accounts && accounts.length > 0 && (
        <details className="mt-4 rounded-md border border-border bg-card p-4">
          <summary className="cursor-pointer font-mono text-xs text-muted-foreground">
            Raw SnapTrade response (debug)
          </summary>
          <pre className="mt-2 overflow-x-auto text-[10px] text-muted-foreground">
            {JSON.stringify(accounts, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
