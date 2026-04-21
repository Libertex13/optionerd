"use client";

import { useMemo, useState } from "react";
import styles from "./portfolio.module.css";
import {
  applyScenario,
  fmtDollar,
  fmtPct,
  heatColor,
  heatTextColor,
} from "@/lib/portfolio/pricing";
import type {
  PortfolioPosition,
  Scenario,
  ShockRule,
} from "@/lib/portfolio/types";

interface ScenariosProps {
  positions: PortfolioPosition[];
  scenarios: Scenario[];
}

export function Scenarios({ positions, scenarios }: ScenariosProps) {
  const [mode, setMode] = useState<"grid" | "single" | "compare" | "stress">("grid");
  const [library, setLibrary] = useState<"all" | "system" | "personal">("all");
  const [gridMode, setGridMode] = useState<"pnl" | "pct" | "delta">("pnl");
  // Default: activate all system presets
  const systemIds = scenarios.filter((s) => s.is_preset).map((s) => s.id);
  const [activeIds, setActiveIds] = useState<string[]>(systemIds.slice(0, 5));
  const [focusedId, setFocusedId] = useState<string>(systemIds[0] ?? "");

  const filteredPresets = scenarios.filter((s) => {
    if (library === "all") return true;
    if (library === "system") return s.is_preset;
    return !s.is_preset;
  });

  const activeScns = useMemo(
    () => scenarios.filter((s) => activeIds.includes(s.id)),
    [activeIds, scenarios],
  );

  const grid = useMemo(
    () =>
      positions.map((p) => ({
        p,
        scns: activeScns.map((s) => applyScenario(p, s)),
      })),
    [positions, activeScns],
  );

  const maxAbs = useMemo(() => {
    const all = grid.flatMap((g) => g.scns.map((r) => r.delta));
    return Math.max(...all.map(Math.abs), 1);
  }, [grid]);

  const togglePreset = (id: string) => {
    setActiveIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (next.length === 0 && systemIds.length > 0) return [systemIds[0]];
      return next;
    });
    setFocusedId(id);
  };

  const focusedScenario =
    scenarios.find((s) => s.id === focusedId) ?? scenarios[0];

  const attribution = useMemo(() => {
    if (!focusedScenario) return { entries: [] as [string, number][], max: 1 };
    const byTicker: Record<string, number> = {};
    positions.forEach((p) => {
      const r = applyScenario(p, focusedScenario);
      byTicker[p.ticker] = (byTicker[p.ticker] ?? 0) + r.delta;
    });
    const entries = Object.entries(byTicker).sort((a, b) => a[1] - b[1]);
    const attMax = Math.max(...entries.map((e) => Math.abs(e[1])), 1);
    return { entries, max: attMax };
  }, [positions, focusedScenario]);

  const portfolioImpact = useMemo(() => {
    if (!focusedScenario) return 0;
    return positions.reduce(
      (sum, p) => sum + applyScenario(p, focusedScenario).delta,
      0,
    );
  }, [positions, focusedScenario]);

  const shockEntries = focusedScenario
    ? (Object.entries(focusedScenario.underlying_shocks) as [string, ShockRule][])
    : [];

  const scenarioCountPresets = scenarios.filter((s) => s.is_preset).length;
  const scenarioCountUser = scenarios.filter((s) => !s.is_preset).length;

  return (
    <section>
      {/* Lab header */}
      <div className={styles.labHeader}>
        <div>
          <h1>Scenarios</h1>
          <p>
            Stress-test your live portfolio against pre-built or custom scenarios. Each
            scenario transforms price, IV, and time — then revalues every position.
          </p>
        </div>
        <div className={styles.labModes}>
          <span className={styles.microLabel}>Mode</span>
          <div className={styles.seg}>
            {[
              { v: "grid", l: "Grid" },
              { v: "single", l: "Single" },
              { v: "compare", l: "Compare" },
              { v: "stress", l: "Stress all" },
            ].map((o) => (
              <button
                key={o.v}
                className={mode === o.v ? styles.segActive : ""}
                onClick={() => setMode(o.v as typeof mode)}
              >
                {o.l}
              </button>
            ))}
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>+ New scenario</button>
        </div>
      </div>

      {/* Library */}
      <div className={styles.card}>
        <div className={styles.cardHdr}>
          <div>
            <div className={styles.cardTitle}>Scenario library</div>
            <div className={styles.cardSub}>
              {scenarioCountPresets} presets · {scenarioCountUser} personal · click to
              apply to grid
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className={styles.seg}>
              {[
                { v: "all", l: "All" },
                { v: "system", l: "System" },
                { v: "personal", l: "Mine" },
              ].map((o) => (
                <button
                  key={o.v}
                  className={library === o.v ? styles.segActive : ""}
                  onClick={() => setLibrary(o.v as typeof library)}
                >
                  {o.l}
                </button>
              ))}
            </div>
            <button className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}>
              Share scenario →
            </button>
          </div>
        </div>
        <div className={styles.cardBody} style={{ padding: 12 }}>
          <div className={styles.presetStrip}>
            {filteredPresets.map((s) => (
              <button
                key={s.id}
                className={`${styles.presetChip} ${activeIds.includes(s.id) ? styles.presetChipActive : ""}`}
                onClick={() => togglePreset(s.id)}
              >
                <div className={styles.pcTop}>
                  <span className={styles.pcName}>{s.name}</span>
                  <span
                    className={`${styles.pcTag} ${s.is_preset ? styles.pcTagSys : ""}`}
                  >
                    {s.is_preset ? "SYSTEM" : "MINE"}
                  </span>
                </div>
                <span className={styles.pcDesc}>{s.description ?? ""}</span>
              </button>
            ))}
            {filteredPresets.length === 0 && (
              <div
                style={{
                  padding: "20px 14px",
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                No scenarios yet. Click &quot;+ New scenario&quot; to create one.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.card} style={{ marginTop: 14 }}>
        <div className={styles.cardHdr}>
          <div>
            <div className={styles.cardTitle}>Portfolio impact · grid</div>
            <div className={styles.cardSub}>
              {positions.length} positions × {activeScns.length} scenarios · P/L Δ from
              current mark
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className={styles.seg}>
              {[
                { v: "pnl", l: "$ P/L" },
                { v: "pct", l: "% of risk" },
                { v: "delta", l: "Δ vs now" },
              ].map((o) => (
                <button
                  key={o.v}
                  className={gridMode === o.v ? styles.segActive : ""}
                  onClick={() => setGridMode(o.v as typeof gridMode)}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.cardBody} style={{ padding: 0 }}>
          {positions.length === 0 ? (
            <div
              style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-mono), monospace",
                fontSize: 12,
              }}
            >
              No positions to stress-test. Add positions to your portfolio to see them
              here.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className={styles.sgTable}>
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Position</th>
                    {activeScns.map((s) => (
                      <th key={s.id} className="scn">
                        <span className={styles.scnName}>{s.name}</span>
                        <span className={styles.scnSub}>{s.description ?? ""}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((g) => (
                    <tr key={g.p.id}>
                      <td className={`${styles.posCell} posCell`}>
                        <div className={styles.posCellName}>{g.p.name}</div>
                        <div className={styles.posCellSub}>
                          {g.p.ticker} @ ${g.p.px.toFixed(2)} · {g.p.strat}
                        </div>
                      </td>
                      {g.scns.map((r, i) => {
                        const bg = heatColor(r.delta, maxAbs);
                        const tx = heatTextColor(r.delta, maxAbs);
                        const pct = g.p.cost > 0 ? (r.delta / g.p.cost) * 100 : 0;
                        return (
                          <td key={i}>
                            <span
                              className={styles.heatCell}
                              style={{ background: bg, color: tx }}
                              title={fmtDollar(r.delta)}
                            >
                              {fmtDollar(r.delta)}
                              <span className={styles.heatPct}>{fmtPct(pct)}</span>
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className={`${styles.posCell} posCell`}>Portfolio total</td>
                    {activeScns.map((s, i) => {
                      const tot = grid.reduce((sum, g) => sum + g.scns[i].delta, 0);
                      const totMaxAbs = Math.max(maxAbs * positions.length * 0.4, 1);
                      const bg = heatColor(tot, totMaxAbs);
                      const tx = heatTextColor(tot, totMaxAbs);
                      return (
                        <td key={s.id}>
                          <span
                            className={styles.heatCell}
                            style={{
                              background: bg,
                              color: tx,
                              fontSize: 14,
                              padding: "14px 10px",
                            }}
                          >
                            {fmtDollar(tot)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Builder + impact summary */}
      {focusedScenario && (
        <div className={styles.builderRow}>
          <div className={styles.card}>
            <div className={styles.cardHdr}>
              <div>
                <div className={styles.cardTitle}>{focusedScenario.name}</div>
                <div className={styles.cardSub}>
                  {focusedScenario.is_preset ? "system preset" : "personal"} ·{" "}
                  {positions.length} positions affected
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className={`${styles.btn} ${styles.btnSm}`}>Duplicate</button>
                <button className={`${styles.btn} ${styles.btnSm}`}>Share URL</button>
                <button className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}>
                  Save changes
                </button>
              </div>
            </div>
            <div className={styles.cardBody}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div className={styles.microLabel} style={{ marginBottom: 5 }}>
                    Target date
                  </div>
                  <input
                    className={styles.valInput}
                    style={{
                      width: "100%",
                      height: 30,
                      padding: "0 10px",
                      fontSize: 12,
                      textAlign: "left",
                    }}
                    defaultValue={focusedScenario.target_date ?? ""}
                  />
                </div>
                <div>
                  <div className={styles.microLabel} style={{ marginBottom: 5 }}>
                    IV shock (global)
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <select
                      className={styles.modeSel}
                      style={{ height: 30, flex: "0 0 88px", fontSize: 12 }}
                      defaultValue={focusedScenario.iv_shock?.mode ?? "mult"}
                    >
                      <option value="mult">×</option>
                      <option value="add">+%</option>
                      <option value="abs">abs</option>
                    </select>
                    <input
                      className={styles.valInput}
                      style={{ height: 30, flex: 1, fontSize: 12 }}
                      defaultValue={focusedScenario.iv_shock?.val.toFixed(2) ?? "1.00"}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.microLabel} style={{ marginBottom: 6 }}>
                Per-ticker shocks
              </div>
              <div className={styles.shockList}>
                {shockEntries.length === 0 ? (
                  <div className={styles.shockRow}>
                    <span
                      style={{
                        gridColumn: "1 / -1",
                        color: "var(--muted-foreground)",
                        fontSize: 11,
                      }}
                    >
                      No per-ticker shocks. Default shock (below) applies to all.
                    </span>
                  </div>
                ) : (
                  shockEntries.map(([tk, sh]) => {
                    const pos = positions.find((p) => p.ticker === tk);
                    const curPx = pos ? pos.px : 0;
                    let newPx = curPx;
                    if (sh.mode === "pct") newPx = curPx * (1 + sh.val / 100);
                    else if (sh.mode === "abs") newPx = sh.val;
                    const deltaPct = curPx > 0 ? ((newPx - curPx) / curPx) * 100 : 0;
                    return (
                      <div key={tk} className={styles.shockRow}>
                        <span className={styles.shockTk}>{tk}</span>
                        <select
                          className={styles.modeSel}
                          defaultValue={sh.mode === "pct" ? "percent" : "absolute"}
                        >
                          <option>percent</option>
                          <option>absolute</option>
                          <option>pin strike</option>
                        </select>
                        <input
                          className={styles.valInput}
                          defaultValue={`${sh.val}${sh.mode === "pct" ? "%" : ""}`}
                        />
                        <span
                          className={`${styles.shockPreview} ${deltaPct > 0 ? styles.shockPreviewPos : styles.shockPreviewNeg}`}
                        >
                          {pos ? `$${curPx.toFixed(2)} → $${newPx.toFixed(2)}` : "—"}
                        </span>
                        <button className={styles.rmBtn}>×</button>
                      </div>
                    );
                  })
                )}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <button className={`${styles.btn} ${styles.btnSm}`}>+ Add ticker shock</button>
                <div
                  style={{
                    marginLeft: "auto",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 11.5,
                    color: "var(--muted-foreground)",
                  }}
                >
                  Default for others:
                  <select
                    className={styles.modeSel}
                    style={{ height: 26, fontSize: 11 }}
                    defaultValue={focusedScenario.default_shock?.mode ?? "pct"}
                  >
                    <option value="pct">percent</option>
                    <option value="abs">absolute</option>
                    <option value="none">none</option>
                  </select>
                  <input
                    className={styles.valInput}
                    style={{ height: 26, width: 60, fontSize: 11 }}
                    defaultValue={focusedScenario.default_shock?.val.toString() ?? "0"}
                  />
                </div>
              </div>

              {focusedScenario.notes && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 12px",
                    background:
                      "color-mix(in oklch, var(--background) 40%, var(--card))",
                    border: "1px dashed var(--border)",
                    borderRadius: 4,
                  }}
                >
                  <div className={styles.microLabel} style={{ marginBottom: 4 }}>
                    Notes
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      fontFamily: "var(--font-mono), monospace",
                    }}
                  >
                    {focusedScenario.notes}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHdr}>
              <div className={styles.cardTitle}>Impact summary</div>
              <div className={styles.cardSub}>aggregate portfolio result</div>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statRow}>
                <div>
                  <div className={styles.statRowK}>P/L at scenario</div>
                  <div
                    className={styles.statRowV}
                    style={{ color: portfolioImpact >= 0 ? "#22c55e" : "#ef4444" }}
                  >
                    {positions.length === 0 ? "—" : fmtDollar(portfolioImpact)}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>Δ from current</div>
                  <div
                    className={styles.statRowV}
                    style={{ color: portfolioImpact >= 0 ? "#22c55e" : "#ef4444" }}
                  >
                    {positions.length === 0 ? "—" : fmtDollar(portfolioImpact)}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>Worst position</div>
                  <div className={styles.statRowV} style={{ fontSize: 12 }}>
                    {positions.length === 0
                      ? "—"
                      : ([...positions]
                          .map((p) => ({
                            p,
                            d: applyScenario(p, focusedScenario).delta,
                          }))
                          .sort((a, b) => a.d - b.d)[0]?.p.name ?? "—")}
                  </div>
                </div>
                <div>
                  <div className={styles.statRowK}>Best position</div>
                  <div className={styles.statRowV} style={{ fontSize: 12 }}>
                    {positions.length === 0
                      ? "—"
                      : ([...positions]
                          .map((p) => ({
                            p,
                            d: applyScenario(p, focusedScenario).delta,
                          }))
                          .sort((a, b) => b.d - a.d)[0]?.p.name ?? "—")}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div className={styles.microLabel} style={{ marginBottom: 6 }}>
                  Attribution by ticker
                </div>
                <div>
                  {attribution.entries.length === 0 ? (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        fontFamily: "var(--font-mono), monospace",
                      }}
                    >
                      No positions to attribute.
                    </div>
                  ) : (
                    attribution.entries.map(([tk, val]) => {
                      const w = (Math.abs(val) / attribution.max) * 100;
                      const isPositive = val >= 0;
                      return (
                        <div
                          key={tk}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "44px 1fr 88px",
                            gap: 9,
                            alignItems: "center",
                            fontFamily: "var(--font-mono), monospace",
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>{tk}</span>
                          <div
                            style={{
                              position: "relative",
                              height: 14,
                              background: "var(--muted)",
                              borderRadius: 2,
                              overflow: "hidden",
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                left: "50%",
                                top: 0,
                                bottom: 0,
                                width: 1,
                                background: "var(--muted-foreground)",
                                opacity: 0.5,
                              }}
                            />
                            <span
                              style={{
                                position: "absolute",
                                top: 0,
                                bottom: 0,
                                [isPositive ? "left" : "right"]: "50%",
                                width: `${w / 2}%`,
                                background: isPositive ? "#22c55e" : "#ef4444",
                                opacity: 0.75,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              textAlign: "right",
                              fontWeight: 600,
                              color: isPositive ? "#22c55e" : "#ef4444",
                            }}
                          >
                            {fmtDollar(val)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
