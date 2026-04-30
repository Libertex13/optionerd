"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

interface StatusResponse {
  connected: boolean;
  expiresAt?: string;
  scope?: string;
}

export function TradeStationConnection() {
  const search = useSearchParams();
  const flag = search.get("tradestation");
  const reason = search.get("reason");

  const [callbackStatus, setCallbackStatus] = useState<{
    flag: string;
    reason: string | null;
  } | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const res = await fetch("/api/brokerage/tradestation/status");
      if (res.ok) setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!flag) return;
    setCallbackStatus({ flag, reason });

    const url = new URL(window.location.href);
    url.searchParams.delete("tradestation");
    url.searchParams.delete("reason");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [flag, reason]);

  async function handleDisconnect() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/brokerage/tradestation/disconnect", {
        method: "DELETE",
      });
      if (res.ok) await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Brokerage
        </h2>
        {status?.connected ? (
          <Badge variant="default" className="font-mono text-[10px]">
            connected
          </Badge>
        ) : null}
      </div>

      {callbackStatus?.flag === "connected" && (
        <div className="mb-3 rounded-md border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
          TradeStation connected. Your positions can now be imported
          automatically.
        </div>
      )}
      {callbackStatus?.flag === "error" && (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          Connection failed{callbackStatus.reason ? `: ${callbackStatus.reason}` : ""}. Try again.
        </div>
      )}

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">TradeStation</span>
          <span className="font-medium">
            {loading ? "—" : status?.connected ? "Linked" : "Not connected"}
          </span>
        </div>
        {status?.connected && status.scope && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Scope</span>
            <span className="font-mono text-xs">{status.scope}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {status?.connected ? (
          <button
            onClick={handleDisconnect}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 h-8 text-sm font-medium hover:bg-muted transition-all disabled:opacity-50"
          >
            {busy ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <a
            href="/api/brokerage/tradestation/connect"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 h-8 text-sm font-medium hover:bg-primary/80 transition-all"
          >
            Connect TradeStation
          </a>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Read-only access. optioNerd never places trades on your behalf.
      </p>
    </section>
  );
}
