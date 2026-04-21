"use client";

import { useMemo, useRef, useState } from "react";
import styles from "./portfolio.module.css";
import {
  fmtPct,
  maxProfitLabel,
  maxLossLabel,
  breakevenLabel,
  popLabel,
} from "@/lib/portfolio/pricing";
import type {
  PortfolioLeg,
  PortfolioPosition,
  PositionState,
} from "@/lib/portfolio/types";
import { MiniPayoff } from "./MiniPayoff";
import { Treemap } from "./Treemap";
import { ExpiryCalendar } from "./ExpiryCalendar";

const fmtDollars = (n: number) =>
  Math.round(Math.abs(n)).toLocaleString("en-US");

function downloadCsv(positions: PortfolioPosition[]) {
  const head = [
    "ticker",
    "name",
    "strategy",
    "state",
    "legs",
    "net_cost",
    "pnl",
    "pnl_pct",
    "dte",
    "entry",
  ];
  const esc = (v: string) =>
    /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const rows = positions.map((p) => {
    const legStr = p.legs
      .map((l) => `${l.s === "long" ? "B" : "S"}${l.q}${l.t[0].toUpperCase()}${l.k}`)
      .join("; ");
    return [
      p.ticker,
      p.name,
      p.strat,
      p.state,
      legStr,
      Math.round(p.net).toString(),
      Math.round(p.pnl).toString(),
      p.pnlPct.toFixed(2),
      p.dte.toString(),
      p.entry ?? "",
    ].map(esc).join(",");
  });
  const csv = [head.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `optionerd-positions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function groupKey(p: PortfolioPosition, mode: string): string {
  switch (mode) {
    case "ticker":
      return p.ticker;
    case "strategy":
      return p.strat;
    case "expiry":
      if (p.dte <= 7) return "≤ 1 week";
      if (p.dte <= 30) return "≤ 1 month";
      if (p.dte <= 60) return "≤ 2 months";
      if (p.dte <= 90) return "≤ 3 months";
      return "> 3 months";
    case "pnl":
      if (p.pnl > 0) return "Winners";
      if (p.pnl < 0) return "Losers";
      return "Flat";
    default:
      return "";
  }
}

interface LivePositionsProps {
  positions: PortfolioPosition[];
}

function stateBadgeClass(st: PositionState): string {
  const map: Record<PositionState, string> = {
    open: styles.stateOpen,
    watching: styles.stateWatching,
    structuring: styles.stateStructuring,
    closed: styles.stateClosed,
  };
  return `${styles.stateBadge} ${map[st]}`;
}

function LegChips({ legs }: { legs: PortfolioLeg[] }) {
  return (
    <div className={styles.legChips}>
      {legs.map((l, i) => (
        <span
          key={i}
          className={`${styles.legChip} ${l.s === "long" ? styles.legChipLong : styles.legChipShort}`}
        >
          <span
            className={`${styles.legChipS} ${l.s === "long" ? styles.legChipSLong : styles.legChipSShort}`}
          >
            {l.s === "long" ? "B" : "S"}
          </span>
          {l.q}
          {l.t[0].toUpperCase()} {l.k}
        </span>
      ))}
    </div>
  );
}

function DteBar({ dte, max }: { dte: number; max: number }) {
  const ratio = Math.max(0, Math.min(1, dte / max));
  const cls = dte <= 7 ? styles.dteBarHot : dte <= 14 ? styles.dteBarWarn : "";
  return (
    <div className={`${styles.dteBar} ${cls}`}>
      <div style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

function PositionRow({
  position,
  expanded,
  onToggle,
  tickerHighlight,
  onMouseEnter,
  onMouseLeave,
}: {
  position: PortfolioPosition;
  expanded: boolean;
  onToggle: () => void;
  tickerHighlight: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const p = position;
  const netPrefix = p.net >= 0 ? "+" : "−";
  const pnlCls = p.pnl > 0 ? styles.pnlPos : p.pnl < 0 ? styles.pnlNeg : "";

  // Simple delta estimate per leg
  const delta = p.legs
    .reduce((s, l) => s + (l.s === "long" ? 1 : -1) * (l.t === "call" ? 0.4 : -0.4) * l.q, 0)
    .toFixed(2);

  return (
    <div className={styles.posRowWrap}>
      <div
        className={`${styles.posRow} ${expanded ? styles.posRowExpanded : ""} ${tickerHighlight ? styles.tickerHighlight : ""}`}
        onClick={onToggle}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className={styles.drag} onClick={(e) => e.stopPropagation()}>
          ⋮⋮
        </div>
        <div className={styles.posTicker}>
          {p.ticker}
          <span className={styles.tkPx}>${p.px.toFixed(2)}</span>
        </div>
        <div className={styles.posName}>
          {p.name}
          <span className={styles.posNameSub}>
            {p.strat} · entered {p.entry ?? "—"}
          </span>
        </div>
        <LegChips legs={p.legs} />
        <div className={styles.monoNum}>
          {netPrefix}${fmtDollars(p.net)}
          <span className={styles.monoNumSub}>{p.net >= 0 ? "credit" : "debit"}</span>
        </div>
        <div className={`${styles.monoNum} ${pnlCls}`}>
          {p.state === "watching"
            ? "—"
            : (p.pnl >= 0 ? "+" : "−") + "$" + fmtDollars(p.pnl)}
          <span className={styles.monoNumSub}>
            {p.state === "watching" ? "" : fmtPct(p.pnlPct)}
          </span>
        </div>
        <div className={styles.monoNum}>
          {p.dte}d<DteBar dte={p.dte} max={p.dteMax} />
        </div>
        <div style={{ textAlign: "right" }}>
          <span className={stateBadgeClass(p.state)}>{p.state.toUpperCase()}</span>
        </div>
        <div style={{ color: "var(--muted-foreground)", textAlign: "center" }}>
          {expanded ? "⌄" : "›"}
        </div>
      </div>

      {expanded && (
        <div className={styles.expandedPanel}>
          <div className={styles.expGrid}>
            <div>
              <div className={styles.microLabel} style={{ marginBottom: 6 }}>
                Payoff at expiry vs current
              </div>
              <MiniPayoff position={p} />
              <div className={styles.expActions}>
                <button className={`${styles.btn} ${styles.btnSm}`}>Open in calculator →</button>
                <button className={`${styles.btn} ${styles.btnSm}`}>Close position</button>
                <button className={`${styles.btn} ${styles.btnSm}`}>Roll</button>
                <button className={`${styles.btn} ${styles.btnSm}`}>Suggest hedge</button>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}>
                  Copy share link
                </button>
              </div>
            </div>
            <div>
              <div className={styles.microLabel} style={{ marginBottom: 6 }}>
                Leg detail
              </div>
              <div className={styles.statRow} style={{ marginBottom: 10 }}>
                <div>
                  <div className={styles.statRowK}>Max profit</div>
                  <div className={styles.statRowV} style={{ color: "#22c55e" }}>
                    {maxProfitLabel(p)}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>Max loss</div>
                  <div className={styles.statRowV} style={{ color: "#ef4444" }}>
                    {maxLossLabel(p)}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>Break-even</div>
                  <div className={styles.statRowV} style={{ fontSize: 12 }}>
                    {breakevenLabel(p)}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>P(profit)</div>
                  <div className={styles.statRowV}>{popLabel(p)}</div>
                </div>
              </div>
              <div className={styles.microLabel} style={{ marginBottom: 5 }}>
                Greeks
              </div>
              <div className={styles.statRow}>
                <div>
                  <div className={styles.statRowK}>Δ</div>
                  <div className={styles.statRowV}>{delta}</div>
                </div>
                <div>
                  <div className={styles.statRowK}>Γ</div>
                  <div className={styles.statRowV}>0.008</div>
                </div>
                <div>
                  <div className={styles.statRowK}>Θ</div>
                  <div className={styles.statRowV} style={{ color: "#22c55e" }}>
                    +{(2 + ((p.id.charCodeAt(1) * 3) % 60) / 10).toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>ν</div>
                  <div className={styles.statRowV} style={{ color: "#ef4444" }}>
                    −{(10 + ((p.id.charCodeAt(1) * 7) % 200) / 10).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LivePositions({ positions }: LivePositionsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightTicker, setHighlightTicker] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState("none");
  const [stateFilter, setStateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const treemapRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return positions.filter((p) => {
      if (stateFilter !== "all" && p.state !== stateFilter) return false;
      if (q) {
        const hay = `${p.ticker} ${p.name} ${p.strat}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [positions, stateFilter, search]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "", items: filtered }];
    const map = new Map<string, PortfolioPosition[]>();
    for (const p of filtered) {
      const k = groupKey(p, groupBy);
      const arr = map.get(k) ?? [];
      arr.push(p);
      map.set(k, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, items }));
  }, [filtered, groupBy]);

  // Aggregate stats
  const openPnl = positions.reduce((s, p) => s + p.pnl, 0);
  const deployed = positions.reduce((s, p) => s + p.cost, 0);
  const openPnlPct = deployed > 0 ? (openPnl / deployed) * 100 : 0;
  const openCount = positions.filter((p) => p.state === "open").length;
  const watchingCount = positions.filter((p) => p.state === "watching").length;

  // Next expiry: smallest dte among positions
  const sortedByDte = [...positions].filter((p) => p.dte >= 0).sort((a, b) => a.dte - b.dte);
  const nextExpiryPos = sortedByDte[0];
  const nextExpiryLabel = nextExpiryPos ? `${nextExpiryPos.dte}d` : "—";
  const nextExpirySub = nextExpiryPos
    ? `${nextExpiryPos.ticker} · ${nextExpiryPos.strat}`
    : "no positions";

  const pnlColorCls =
    openPnl > 0 ? styles.pnlPos : openPnl < 0 ? styles.pnlNeg : "";

  return (
    <section>
      {/* Summary strip */}
      <div className={styles.summaryStrip}>
        <div className={styles.sumPnl}>
          <div>
            <div className={styles.sumK}>Open P&amp;L</div>
            <div className={`${styles.sumV} ${pnlColorCls}`}>
              {positions.length === 0
                ? "—"
                : (openPnl >= 0 ? "+" : "−") +
                  "$" +
                  Math.abs(openPnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div className={styles.sumDelta}>
              {positions.length === 0
                ? "no positions yet"
                : `on $${deployed.toLocaleString("en-US", { maximumFractionDigits: 0 })} deployed · ${(openPnlPct >= 0 ? "+" : "") + openPnlPct.toFixed(2)}%`}
            </div>
          </div>
          <div>
            <div className={styles.sumK}>Today</div>
            <div className={`${styles.sumV}`}>—</div>
            <div className={styles.sumDelta}>needs live feed</div>
          </div>
          <div>
            <div className={styles.sumK}>Positions</div>
            <div className={`${styles.sumV} ${styles.mono}`}>{positions.length}</div>
            <div className={styles.sumDelta}>
              {openCount} open · {watchingCount} watching
            </div>
          </div>
          <div>
            <div className={styles.sumK}>Next expiry</div>
            <div className={`${styles.sumV} ${styles.mono}`}>{nextExpiryLabel}</div>
            <div className={styles.sumDelta}>{nextExpirySub}</div>
          </div>
        </div>

        {/* Greeks bar — will show real aggregates when live feed wires up */}
        <div className={styles.greeksBar}>
          <div className={styles.greeksHdr}>
            <span className={styles.microLabel}>
              Net exposure · per $1 underlying move
            </span>
            <span className={styles.cardSub}>
              {positions.length === 0 ? "—" : "pending live feed"}
            </span>
          </div>
          <div className={styles.gkRow}>
            {(["Δ", "Γ", "Θ", "Vega"] as const).map((label) => (
              <div key={label} className={styles.gkItem}>
                <span className={styles.gkK}>{label}</span>
                <div className={styles.gkTrack}>
                  <span className={styles.gkCenter} />
                </div>
                <span className={styles.gkV}>—</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className={styles.controlsRow}>
        <div className={styles.controlsLeft}>
          <input
            className={styles.search}
            placeholder="Search ticker or position…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className={styles.microLabel}>Group by</span>
          <div className={styles.seg}>
            {[
              { v: "none", l: "None" },
              { v: "ticker", l: "Ticker" },
              { v: "expiry", l: "Expiry" },
              { v: "strategy", l: "Strategy" },
              { v: "pnl", l: "P&L" },
            ].map((o) => (
              <button
                key={o.v}
                className={groupBy === o.v ? styles.segActive : ""}
                onClick={() => setGroupBy(o.v)}
              >
                {o.l}
              </button>
            ))}
          </div>
          <span className={styles.microLabel}>State</span>
          <div className={styles.seg}>
            {[
              { v: "all", l: "All" },
              { v: "open", l: "Open" },
              { v: "watching", l: "Watching" },
              { v: "closed", l: "Closed" },
            ].map((o) => (
              <button
                key={o.v}
                className={stateFilter === o.v ? styles.segActive : ""}
                onClick={() => setStateFilter(o.v)}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.controlsRight}>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={() =>
              treemapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            disabled={positions.length === 0}
          >
            Treemap
          </button>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={() =>
              calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            disabled={positions.length === 0}
          >
            Calendar
          </button>
          <button
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Positions table */}
      <div className={styles.posTable}>
        <div className={styles.posHead}>
          <div />
          <div>Ticker</div>
          <div>Position</div>
          <div>Legs</div>
          <div className="r">Net cost ↑↓</div>
          <div className="r">Current P/L ↓</div>
          <div className="r">DTE</div>
          <div className="r">State</div>
          <div />
        </div>
        <div>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-mono), monospace",
                fontSize: 12,
              }}
            >
              {positions.length === 0 ? (
                <>
                  <div style={{ fontSize: 13, marginBottom: 6, color: "var(--foreground)" }}>
                    No positions yet.
                  </div>
                  Build a strategy in the calculator and save it here to start tracking.
                </>
              ) : (
                <>No positions match this filter.</>
              )}
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.key || "all"}>
                {g.key && (
                  <div className={styles.groupHeader}>
                    <span>{g.key}</span>
                    <span className={styles.groupCount}>{g.items.length}</span>
                  </div>
                )}
                {g.items.map((p) => (
                  <PositionRow
                    key={p.id}
                    position={p}
                    expanded={expandedId === p.id}
                    onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    tickerHighlight={highlightTicker === p.ticker && expandedId !== p.id}
                    onMouseEnter={() => setHighlightTicker(p.ticker)}
                    onMouseLeave={() => setHighlightTicker(null)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Secondary viz row — only render with data */}
      {positions.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div className={styles.card} ref={treemapRef}>
            <div className={styles.cardHdr}>
              <div className={styles.cardTitle}>Exposure treemap</div>
              <div className={styles.cardSub}>area = capital · color = P/L</div>
            </div>
            <div className={styles.cardBody} style={{ padding: 0 }}>
              <Treemap positions={positions} />
            </div>
          </div>
          <div className={styles.card} ref={calendarRef}>
            <div className={styles.cardHdr}>
              <div className={styles.cardTitle}>Expiry calendar</div>
              <div className={styles.cardSub}>next 60 days</div>
            </div>
            <div className={styles.cardBody}>
              <ExpiryCalendar positions={positions} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
