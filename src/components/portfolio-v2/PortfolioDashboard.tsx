"use client";

import { useEffect, useState } from "react";
import styles from "./portfolio.module.css";
import { LivePositions } from "./LivePositions";
import { Scenarios } from "./Scenarios";
import { ImportDialog } from "./ImportDialog";
import { usePositions } from "@/hooks/usePositions";
import { useScenarios } from "@/hooks/useScenarios";
import { useAuth } from "@/hooks/useAuth";

type Tab = "live" | "scenarios";

export function PortfolioDashboard() {
  const [tab, setTab] = useState<Tab>("live");
  const [now, setNow] = useState<number>(() => Date.now());
  const [importOpen, setImportOpen] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const {
    positions,
    loading: posLoading,
    error: posError,
    refresh,
    lastTick,
    liveCoverage,
  } = usePositions();
  const { scenarios, loading: scnLoading } = useScenarios();

  useEffect(() => {
    const id = setTimeout(() => {
      const stored = localStorage.getItem("pf-tab");
      if (stored === "live" || stored === "scenarios") setTab(stored);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    localStorage.setItem("pf-tab", tab);
  }, [tab]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loading = authLoading || posLoading || scnLoading;
  const tickAgoSec = lastTick ? Math.max(0, Math.round((now - lastTick) / 1000)) : null;
  const liveLabel =
    positions.length === 0
      ? "Delayed · no positions"
      : tickAgoSec == null
        ? "Delayed · connecting…"
        : `Delayed · ${liveCoverage.live}/${liveCoverage.total} · refreshed ${tickAgoSec}s ago`;

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
        <div className={styles.tabsRight}>
          <span className={styles.refresh}>
            <span className={styles.pulseDot} />
            {liveLabel}
          </span>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={() => setImportOpen(true)}
            disabled={!user}
            title={!user ? "Sign in to import" : "Import from broker paste"}
          >
            Import
          </button>
          <button className={`${styles.btn} ${styles.btnSm}`}>+ New position</button>
        </div>
      </div>

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImported={() => refresh()}
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
        ) : (
          <div className={styles.note}>
            <strong>Dashboard.</strong> Live Positions tracks open P/L, Greeks,
            expiries. Scenarios stress-test your book against presets or custom
            scenarios. Current marks use delayed market data until brokerage integration is connected.
          </div>
        )}

        {loading ? (
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
        ) : (
          <>
            {tab === "live" && (
              <LivePositions positions={positions} onRefresh={refresh} />
            )}
            {tab === "scenarios" && (
              <Scenarios positions={positions} scenarios={scenarios} />
            )}
          </>
        )}
      </main>
    </>
  );
}
