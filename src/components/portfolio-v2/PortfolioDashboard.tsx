"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./portfolio.module.css";
import { LivePositions } from "./LivePositions";
import { Scenarios } from "./Scenarios";
import { RepairLab } from "./RepairLab";
import { ImportDialog } from "./ImportDialog";
import { NewPositionDialog } from "./NewPositionDialog";
import { usePositions } from "@/hooks/usePositions";
import { useScenarios } from "@/hooks/useScenarios";
import { useAuth } from "@/hooks/useAuth";

type Tab = "live" | "repair" | "scenarios";

interface BrokerAccountSummary {
  institution_name?: string | null;
}

function PortfolioSkeleton({ message }: { message: string }) {
  return (
    <section className={styles.skeletonPanel} aria-busy="true">
      <div className={styles.skeletonHeader}>
        <div>
          <div className={styles.skeletonTitle}>{message}</div>
          <div className={styles.skeletonSub}>
            Loading positions and delayed marks.
          </div>
        </div>
        <div className={styles.skeletonPill} />
      </div>
      <div className={styles.skeletonSummary}>
        {[0, 1, 2, 3].map((item) => (
          <div className={styles.skeletonMetric} key={item}>
            <span />
            <strong />
            <em />
          </div>
        ))}
      </div>
      <div className={styles.skeletonTable}>
        {[0, 1, 2, 3, 4].map((item) => (
          <div className={styles.skeletonRow} key={item}>
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PortfolioDashboard() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "live";
    const stored = window.localStorage.getItem("pf-tab");
    return stored === "live" || stored === "repair" || stored === "scenarios"
      ? stored
      : "live";
  });
  const [now, setNow] = useState<number>(() => Date.now());
  const [importOpen, setImportOpen] = useState(false);
  const [newPositionOpen, setNewPositionOpen] = useState(false);
  const [connectingBroker, setConnectingBroker] = useState(false);
  const [disconnectingBroker, setDisconnectingBroker] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [brokerAccounts, setBrokerAccounts] = useState<BrokerAccountSummary[]>([]);
  const [brokerStatusLoading, setBrokerStatusLoading] = useState(false);
  const [postSyncSettling, setPostSyncSettling] = useState(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleDoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user, loading: authLoading } = useAuth();
  const {
    positions,
    loading: posLoading,
    error: posError,
    refresh,
    lastTick,
    liveCoverage,
    chains,
  } = usePositions();
  const { scenarios, loading: scnLoading, refresh: refreshScenarios } = useScenarios();

  useEffect(() => {
    localStorage.setItem("pf-tab", tab);
  }, [tab]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const refreshBrokerStatus = useCallback(async () => {
    if (!user) {
      setBrokerAccounts([]);
      setBrokerStatusLoading(false);
      return;
    }

    setBrokerStatusLoading(true);
    try {
      const res = await fetch("/api/brokerage/accounts");
      const body = await res.json().catch(() => ({}));
      setBrokerAccounts(res.ok && Array.isArray(body.accounts) ? body.accounts : []);
    } catch {
      setBrokerAccounts([]);
    } finally {
      setBrokerStatusLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void refreshBrokerStatus();
  }, [authLoading, refreshBrokerStatus]);

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      if (settleDoneRef.current) clearTimeout(settleDoneRef.current);
    };
  }, []);

  const loading = authLoading || posLoading || scnLoading || postSyncSettling;
  const tickAgoSec = lastTick ? Math.max(0, Math.round((now - lastTick) / 1000)) : null;
  const liveLabel =
    postSyncSettling
      ? "Delayed - settling marks..."
      : positions.length === 0
      ? "Delayed · no positions"
      : tickAgoSec == null
        ? "Delayed · connecting…"
        : `Delayed · ${liveCoverage.live}/${liveCoverage.total} · refreshed ${tickAgoSec}s ago`;

  const brokerConnected = brokerAccounts.length > 0;
  const brokerInstitutions = Array.from(
    new Set(
      brokerAccounts
        .map((account) => account.institution_name)
        .filter((name): name is string => typeof name === "string" && name.length > 0),
    ),
  );
  const brokerStatusLabel =
    brokerInstitutions.length > 0
      ? `${brokerInstitutions.join(", ")} connected`
      : `${brokerAccounts.length} broker account${brokerAccounts.length === 1 ? "" : "s"} connected`;

  useEffect(() => {
    if (!postSyncSettling || posLoading) return;
    if (positions.length === 0) {
      setPostSyncSettling(false);
      return;
    }
    if (liveCoverage.total > 0 && liveCoverage.live >= liveCoverage.total) {
      if (settleDoneRef.current) clearTimeout(settleDoneRef.current);
      settleDoneRef.current = setTimeout(() => {
        setPostSyncSettling(false);
        settleDoneRef.current = null;
      }, 700);
    }
  }, [
    liveCoverage.live,
    liveCoverage.total,
    positions.length,
    posLoading,
    postSyncSettling,
  ]);

  async function connectBroker(broker?: string) {
    if (!user || connectingBroker) return;
    setConnectingBroker(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/brokerage/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(broker ? { broker } : {}),
      });
      const body = await res.json();
      if (!res.ok || !body.redirectUri) {
        const allowed = Array.isArray(body.allowedBrokerages)
          ? ` Allowed now: ${body.allowedBrokerages.join(", ") || "none"}.`
          : "";
        setConnectError(
          `${body.error ?? "Failed to open broker connection"}${allowed}`,
        );
        setConnectingBroker(false);
        return;
      }
      window.location.href = body.redirectUri;
    } catch {
      setConnectError("Failed to open broker connection");
      setConnectingBroker(false);
    }
  }

  async function disconnectBroker() {
    if (!user || disconnectingBroker) return;
    const ok = window.confirm(
      "Disconnect your current SnapTrade broker connection? You can reconnect with different credentials afterward.",
    );
    if (!ok) return;

    setDisconnectingBroker(true);
    setConnectError(null);
    try {
      const res = await fetch("/api/brokerage/disconnect", {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConnectError(body.error ?? "Failed to disconnect brokerage");
        return;
      }
      await refreshBrokerStatus();
      await refresh();
    } catch {
      setConnectError("Failed to disconnect brokerage");
    } finally {
      setDisconnectingBroker(false);
    }
  }

  async function handleImported() {
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    if (settleDoneRef.current) clearTimeout(settleDoneRef.current);
    setPostSyncSettling(true);
    await refresh();
    await refreshBrokerStatus();
    settleTimeoutRef.current = setTimeout(() => {
      setPostSyncSettling(false);
      settleTimeoutRef.current = null;
    }, 15000);
  }

  return (
    <>
      {/* Tabs bar */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "live" ? styles.tabActive : ""}`}
          onClick={() => setTab("live")}
        >
          Live Positions{" "}
          <span className={styles.count}>{positions.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "scenarios" ? styles.tabActive : ""}`}
          onClick={() => setTab("scenarios")}
        >
          Scenarios <span className={styles.count}>{scenarios.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "repair" ? styles.tabActive : ""}`}
          onClick={() => setTab("repair")}
        >
          Repair Lab
        </button>
        <div className={styles.tabsRight}>
          <span className={styles.refresh}>
            <span className={styles.pulseDot} />
            {liveLabel}
          </span>
          {brokerConnected ? (
            <span className={styles.brokerStatus} title={brokerStatusLabel}>
              <span className={styles.brokerStatusDot} />
              {brokerStatusLabel}
            </span>
          ) : (
            <button
              className={`${styles.btn} ${styles.btnSm}`}
              onClick={() => connectBroker()}
              disabled={!user || connectingBroker || brokerStatusLoading}
              title={!user ? "Sign in to connect" : "Open the SnapTrade broker picker"}
            >
              {connectingBroker ? "Connecting..." : "Connect broker"}
            </button>
          )}
          {brokerConnected && (
            <button
              className={`${styles.btn} ${styles.btnSm}`}
              onClick={disconnectBroker}
              disabled={!user || disconnectingBroker}
              title={!user ? "Sign in to disconnect" : "Disconnect the current SnapTrade broker"}
            >
              {disconnectingBroker ? "Disconnecting..." : "Disconnect broker"}
            </button>
          )}
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            onClick={() => setImportOpen(true)}
            disabled={!user}
            title={!user ? "Sign in to import" : "Import or update positions"}
          >
            Import positions
          </button>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={() => setNewPositionOpen(true)}
            disabled={!user}
            title={!user ? "Sign in to add positions" : "Add a new position"}
          >
            + New position
          </button>
        </div>
      </div>

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      )}

      {newPositionOpen && (
        <NewPositionDialog
          onClose={() => setNewPositionOpen(false)}
          onCreated={async () => {
            await refresh();
          }}
        />
      )}

      <main className={styles.page}>
        {!user && !authLoading ? (
          <div className={styles.note}>
            <strong>Sign in to view your portfolio.</strong> Your saved positions and
            scenarios live with your account.
          </div>
        ) : posError ? (
          <div
            className={styles.note}
            style={{ borderLeftColor: "#ef4444", color: "#ef4444" }}
          >
            <strong>Error:</strong> {posError}. Make sure the{" "}
            <code>positions</code> and <code>scenarios</code> tables are migrated
            (see <code>supabase/add_portfolio_tables.sql</code>).
          </div>
        ) : null}

        {connectError && (
          <div
            className={styles.note}
            style={{ borderLeftColor: "#ef4444", color: "#ef4444" }}
          >
            <strong>Connection error:</strong> {connectError}
          </div>
        )}

        {loading ? (
          postSyncSettling ? (
            <PortfolioSkeleton message="Settling synced positions" />
          ) : (
          <div
            style={{
              padding: "80px 20px",
              textAlign: "center",
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 12,
            }}
          >
            Loading portfolio…
          </div>
          )
        ) : (
          <>
            {tab === "live" && (
              <LivePositions
                positions={positions}
                onRefresh={refresh}
                onOpenRepair={() => setTab("repair")}
              />
            )}
            {tab === "repair" && (
              <RepairLab positions={positions} chains={chains} />
            )}
            {tab === "scenarios" && (
              <Scenarios
                positions={positions}
                scenarios={scenarios}
                onRefresh={refreshScenarios}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}
