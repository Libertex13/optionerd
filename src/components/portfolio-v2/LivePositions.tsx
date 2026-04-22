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
  LegMark,
  PortfolioLeg,
  PortfolioPosition,
  PositionState,
} from "@/lib/portfolio/types";
import { MiniPayoff } from "./MiniPayoff";
import { Treemap } from "./Treemap";
import { ExpiryCalendar } from "./ExpiryCalendar";

const fmtDollars = (n: number) =>
  Math.round(Math.abs(n)).toLocaleString("en-US");

function fmtExpShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function signedDollar(n: number, digits = 0): string {
  return (
    (n >= 0 ? "+$" : "−$") +
    Math.abs(n).toLocaleString("en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    })
  );
}

type SortKey = "net" | "pnl" | "dte";
type SortDir = "asc" | "desc";
interface SortState {
  key: SortKey;
  dir: SortDir;
}

const sortValue = (p: PortfolioPosition, key: SortKey): number => {
  if (key === "net") return p.net;
  if (key === "pnl") return p.pnl;
  return p.dte;
};

function sortArrow(current: SortState, key: SortKey): string {
  if (current.key !== key) return "↕";
  return current.dir === "asc" ? "↑" : "↓";
}

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

interface TickerGroup {
  ticker: string;
  items: PortfolioPosition[];
  net: number;
  pnl: number;
  cost: number;
}

function buildTickerGroups(positions: PortfolioPosition[]): TickerGroup[] {
  const map = new Map<string, PortfolioPosition[]>();
  for (const p of positions) {
    const arr = map.get(p.ticker) ?? [];
    arr.push(p);
    map.set(p.ticker, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ticker, items]) => ({
      ticker,
      items,
      net: items.reduce((s, p) => s + p.net, 0),
      pnl: items.reduce((s, p) => s + p.pnl, 0),
      cost: items.reduce((s, p) => s + p.cost, 0),
    }));
}

interface LivePositionsProps {
  positions: PortfolioPosition[];
  onRefresh: () => Promise<void> | void;
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

function LegDetailTable({
  legs,
  marks,
  live,
}: {
  legs: PortfolioLeg[];
  marks: LegMark[];
  live: boolean;
}) {
  return (
    <div className={styles.legTable}>
      <div className={styles.legTableHead}>
        <div>Leg</div>
        <div>Expiry</div>
        <div className={styles.legTableNum}>Entry</div>
        <div className={styles.legTableNum}>Mark</div>
        <div className={styles.legTableNum}>P/L</div>
      </div>
      {legs.map((l, i) => {
        const m = marks[i];
        const hasMark = live && m !== undefined;
        const dte = m?.dte;
        const pnlCls = !hasMark
          ? ""
          : m.pnl > 0
            ? styles.pnlPos
            : m.pnl < 0
              ? styles.pnlNeg
              : "";
        return (
          <div key={i} className={styles.legTableRow}>
            <div className={styles.legTableLeg}>
              <span
                className={`${styles.legChipS} ${
                  l.s === "long" ? styles.legChipSLong : styles.legChipSShort
                }`}
              >
                {l.s === "long" ? "B" : "S"}
              </span>
              <span>
                {l.q} {l.t[0].toUpperCase()} {l.k}
              </span>
            </div>
            <div className={styles.legTableExp}>
              {fmtExpShort(l.exp)}
              {dte !== undefined && (
                <span className={styles.legTableDte}>{dte}d</span>
              )}
            </div>
            <div className={styles.legTableNum}>${l.p.toFixed(2)}</div>
            <div className={styles.legTableNum}>
              {hasMark ? `$${m.value.toFixed(2)}` : "—"}
            </div>
            <div className={`${styles.legTableNum} ${pnlCls}`}>
              {hasMark ? signedDollar(m.pnl, 0) : "—"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PositionRow({
  position,
  expanded,
  onToggle,
  onDelete,
  tickerHighlight,
  onMouseEnter,
  onMouseLeave,
}: {
  position: PortfolioPosition;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  tickerHighlight: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const p = position;
  const netPrefix = p.net >= 0 ? "+" : "−";
  const canShowLivePnl = p.pxLive && p.state !== "watching";
  const displayPnl = p.state === "closed" ? p.pnl : canShowLivePnl ? p.pnl : 0;
  const pnlCls =
    canShowLivePnl || p.state === "closed"
      ? displayPnl > 0
        ? styles.pnlPos
        : displayPnl < 0
          ? styles.pnlNeg
          : ""
      : "";
  const pnlDisplay =
    p.state === "watching"
      ? "—"
      : p.state === "closed" || canShowLivePnl
        ? signedDollar(displayPnl, 0)
        : "…";
  const pnlSub =
    p.state === "watching"
      ? ""
      : p.state === "closed" || canShowLivePnl
        ? fmtPct(p.pnlPct)
        : "awaiting feed";
  const greeks = p.greeks;
  const thetaCls =
    p.pxLive && greeks.theta > 0
      ? styles.pnlPos
      : p.pxLive && greeks.theta < 0
        ? styles.pnlNeg
        : "";
  const vegaCls =
    p.pxLive && greeks.vega > 0
      ? styles.pnlPos
      : p.pxLive && greeks.vega < 0
        ? styles.pnlNeg
        : "";

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
          <span className={styles.tkPx}>
            {p.px > 0 ? `$${p.px.toFixed(2)}` : "—"}
            {p.pxLive && <span className={styles.liveDot} aria-label="live" />}
          </span>
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
          {pnlDisplay}
          <span className={styles.monoNumSub}>{pnlSub}</span>
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
                <button
                  className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div>
              <div className={styles.microLabel} style={{ marginBottom: 6 }}>
                Legs {p.pxLive ? "· marked to live" : "· awaiting live feed"}
              </div>
              <LegDetailTable legs={p.legs} marks={p.marks} live={p.pxLive} />
              <div className={styles.microLabel} style={{ margin: "14px 0 5px" }}>
                Greeks {p.pxLive ? "" : "· awaiting feed"}
              </div>
              <div className={styles.statRow}>
                <div>
                  <div className={styles.statRowK}>Δ ($/$)</div>
                  <div className={styles.statRowV}>
                    {p.pxLive ? signedDollar(greeks.delta, 1) : "—"}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>Γ</div>
                  <div className={styles.statRowV}>
                    {p.pxLive ? greeks.gamma.toFixed(3) : "—"}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>Θ ($/day)</div>
                  <div className={`${styles.statRowV} ${thetaCls}`}>
                    {p.pxLive ? signedDollar(greeks.theta, 1) : "—"}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>ν ($/1%)</div>
                  <div className={`${styles.statRowV} ${vegaCls}`}>
                    {p.pxLive ? signedDollar(greeks.vega, 1) : "—"}
                  </div>
                </div>
              </div>
              <div className={styles.microLabel} style={{ margin: "14px 0 5px" }}>
                Structure
              </div>
              <div className={styles.statRow}>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LivePositions({ positions, onRefresh }: LivePositionsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightTicker, setHighlightTicker] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "pnl", dir: "desc" });
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [collapsedTickers, setCollapsedTickers] = useState<Set<string>>(
    new Set(),
  );

  function toggleCollapse(ticker: string) {
    setCollapsedTickers((s) => {
      const next = new Set(s);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }
  const treemapRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  function toggleSort(key: SortKey) {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" },
    );
  }

  async function deletePosition(id: string) {
    if (pendingDeleteId) return;
    setPendingDeleteId(id);
    try {
      const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
      if (res.ok) await onRefresh();
    } finally {
      setPendingDeleteId(null);
    }
  }

  async function clearAll() {
    if (clearingAll || positions.length === 0) return;
    const confirmed = window.confirm(
      `Delete all ${positions.length} position${positions.length === 1 ? "" : "s"}? This cannot be undone.`,
    );
    if (!confirmed) return;
    setClearingAll(true);
    try {
      const res = await fetch("/api/positions", { method: "DELETE" });
      if (res.ok) await onRefresh();
    } finally {
      setClearingAll(false);
    }
  }

  function confirmAndDelete(id: string, name: string) {
    const confirmed = window.confirm(`Delete "${name}"? This cannot be undone.`);
    if (confirmed) void deletePosition(id);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = positions.filter((p) => {
      if (stateFilter !== "all" && p.state !== stateFilter) return false;
      if (q) {
        const hay = `${p.ticker} ${p.name} ${p.strat}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const mult = sort.dir === "asc" ? 1 : -1;
    return [...matched].sort(
      (a, b) => (sortValue(a, sort.key) - sortValue(b, sort.key)) * mult,
    );
  }, [positions, stateFilter, search, sort]);

  const groups = useMemo(() => buildTickerGroups(filtered), [filtered]);

  // Aggregate stats — only count positions that are actually carrying P/L
  // (open + closed realised). Watching positions contribute 0.
  const marked = useMemo(
    () => positions.filter((p) => p.state !== "watching"),
    [positions],
  );
  const livePositions = useMemo(
    () => positions.filter((p) => p.pxLive && p.state !== "closed"),
    [positions],
  );
  const openPnl = marked.reduce((s, p) => s + p.pnl, 0);
  const deployed = marked.reduce((s, p) => s + p.cost, 0);
  const openPnlPct = deployed > 0 ? (openPnl / deployed) * 100 : 0;
  const openCount = positions.filter((p) => p.state === "open").length;
  const watchingCount = positions.filter((p) => p.state === "watching").length;

  // Aggregate Greeks across live, non-closed positions. These are dollar
  // Greeks summed across the book.
  const agg = useMemo(
    () =>
      livePositions.reduce(
        (a, p) => ({
          delta: a.delta + p.greeks.delta,
          gamma: a.gamma + p.greeks.gamma,
          theta: a.theta + p.greeks.theta,
          vega: a.vega + p.greeks.vega,
        }),
        { delta: 0, gamma: 0, theta: 0, vega: 0 },
      ),
    [livePositions],
  );
  const hasLive = livePositions.length > 0;

  // Next expiry: smallest dte among positions
  const sortedByDte = [...positions].filter((p) => p.dte >= 0).sort((a, b) => a.dte - b.dte);
  const nextExpiryPos = sortedByDte[0];
  const nextExpiryLabel = nextExpiryPos ? `${nextExpiryPos.dte}d` : "—";
  const nextExpirySub = nextExpiryPos
    ? `${nextExpiryPos.ticker} · ${nextExpiryPos.strat}`
    : "no positions";

  const pnlColorCls =
    openPnl > 0 ? styles.pnlPos : openPnl < 0 ? styles.pnlNeg : "";

  const liveCount = positions.filter((p) => p.pxLive).length;
  const pnlSubtitle =
    positions.length === 0
      ? "no positions yet"
      : `on $${deployed.toLocaleString("en-US", { maximumFractionDigits: 0 })} deployed · ${(openPnlPct >= 0 ? "+" : "") + openPnlPct.toFixed(2)}%`;

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
                : signedDollar(openPnl, 0)}
            </div>
            <div className={styles.sumDelta}>{pnlSubtitle}</div>
          </div>
          <div>
            <div className={styles.sumK}>Θ Today</div>
            <div
              className={`${styles.sumV} ${hasLive && agg.theta > 0 ? styles.pnlPos : hasLive && agg.theta < 0 ? styles.pnlNeg : ""}`}
            >
              {hasLive ? signedDollar(agg.theta, 0) : "—"}
            </div>
            <div className={styles.sumDelta}>
              {hasLive ? "per calendar day" : "awaiting live feed"}
            </div>
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

        {/* Greeks bar — aggregated dollar Greeks across live, non-closed positions */}
        <div className={styles.greeksBar}>
          <div className={styles.greeksHdr}>
            <span className={styles.microLabel}>Net exposure</span>
            <span className={styles.cardSub}>
              {positions.length === 0
                ? "—"
                : hasLive
                  ? `${livePositions.length}/${positions.length} live`
                  : liveCount === 0
                    ? "awaiting live feed"
                    : "no open positions"}
            </span>
          </div>
          <div className={styles.gkRow}>
            {(
              [
                { label: "Δ ($/$)", val: agg.delta, digits: 1 },
                { label: "Γ", val: agg.gamma, digits: 3 },
                { label: "Θ ($/day)", val: agg.theta, digits: 1 },
                { label: "ν ($/1%)", val: agg.vega, digits: 1 },
              ] as const
            ).map((g) => {
              const maxAbs = Math.max(
                1,
                Math.abs(agg.delta),
                Math.abs(agg.gamma) * 200,
                Math.abs(agg.theta),
                Math.abs(agg.vega),
              );
              // Scale bar width by category magnitude, capped at 50%
              const ratio = hasLive
                ? Math.min(0.5, Math.abs(g.val) / maxAbs / 2)
                : 0;
              const positive = g.val >= 0;
              return (
                <div key={g.label} className={styles.gkItem}>
                  <span className={styles.gkK}>{g.label}</span>
                  <div className={styles.gkTrack}>
                    <span className={styles.gkCenter} />
                    {hasLive && (
                      <span
                        className={`${styles.gkFill} ${positive ? styles.gkFillPos : styles.gkFillNeg}`}
                        style={{ width: `${ratio * 100}%` }}
                      />
                    )}
                  </div>
                  <span
                    className={`${styles.gkV} ${hasLive && g.val > 0 ? styles.pnlPos : hasLive && g.val < 0 ? styles.pnlNeg : ""}`}
                  >
                    {hasLive
                      ? g.label.startsWith("Γ")
                        ? g.val.toFixed(g.digits)
                        : signedDollar(g.val, g.digits)
                      : "—"}
                  </span>
                </div>
              );
            })}
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
          <button
            className={`${styles.btn} ${styles.btnSm} ${styles.btnDanger}`}
            onClick={clearAll}
            disabled={positions.length === 0 || clearingAll}
          >
            {clearingAll ? "Clearing…" : "Clear all"}
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
          <div
            className={`${styles.r} ${styles.sortable} ${sort.key === "net" ? styles.sortActive : ""}`}
            onClick={() => toggleSort("net")}
          >
            Net cost <span className={styles.sortArrow}>{sortArrow(sort, "net")}</span>
          </div>
          <div
            className={`${styles.r} ${styles.sortable} ${sort.key === "pnl" ? styles.sortActive : ""}`}
            onClick={() => toggleSort("pnl")}
          >
            Current P/L <span className={styles.sortArrow}>{sortArrow(sort, "pnl")}</span>
          </div>
          <div
            className={`${styles.r} ${styles.sortable} ${sort.key === "dte" ? styles.sortActive : ""}`}
            onClick={() => toggleSort("dte")}
          >
            DTE <span className={styles.sortArrow}>{sortArrow(sort, "dte")}</span>
          </div>
          <div className={styles.r}>State</div>
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
            groups.map((g) => {
              const hasHeader = g.items.length >= 2;
              const collapsed = hasHeader && collapsedTickers.has(g.ticker);
              const pnlCls =
                g.pnl > 0 ? styles.pnlPos : g.pnl < 0 ? styles.pnlNeg : "";
              return (
                <div key={g.ticker}>
                  {hasHeader && (
                    <div
                      className={`${styles.tickerGroupHeader} ${collapsed ? styles.tickerGroupHeaderCollapsed : ""}`}
                      onClick={() => toggleCollapse(g.ticker)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={!collapsed}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleCollapse(g.ticker);
                        }
                      }}
                    >
                      <div
                        className={`${styles.tickerGroupChevron} ${collapsed ? "" : styles.tickerGroupChevronOpen}`}
                        aria-hidden="true"
                      >
                        ▶
                      </div>
                      <div className={styles.tickerGroupName}>
                        {g.ticker}
                        <span className={styles.tickerGroupSub}>
                          {g.items.length} positions
                        </span>
                      </div>
                      <div />
                      <div />
                      <div className={styles.monoNum}>
                        {g.net >= 0 ? "+" : "−"}${fmtDollars(g.net)}
                        <span className={styles.monoNumSub}>
                          {g.net >= 0 ? "credit" : "debit"}
                        </span>
                      </div>
                      <div className={`${styles.monoNum} ${pnlCls}`}>
                        {signedDollar(g.pnl, 0)}
                        <span className={styles.monoNumSub}>
                          on ${fmtDollars(g.cost)}
                        </span>
                      </div>
                      <div />
                      <div />
                      <div />
                    </div>
                  )}
                  {!collapsed &&
                    g.items.map((p) => (
                      <PositionRow
                        key={p.id}
                        position={p}
                        expanded={expandedId === p.id}
                        onToggle={() =>
                          setExpandedId(expandedId === p.id ? null : p.id)
                        }
                        onDelete={() => confirmAndDelete(p.id, p.name)}
                        tickerHighlight={
                          highlightTicker === p.ticker && expandedId !== p.id
                        }
                        onMouseEnter={() => setHighlightTicker(p.ticker)}
                        onMouseLeave={() => setHighlightTicker(null)}
                      />
                    ))}
                </div>
              );
            })
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
