"use client";

import { useMemo } from "react";
import type { PortfolioPosition } from "@/lib/portfolio/types";

interface ExpiryTimelineProps {
  positions: PortfolioPosition[];
  horizonDays?: number;
}

const DEFAULT_HORIZON = 60;
const MAX_VISIBLE_PER_BUCKET = 3;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function chipColor(p: PortfolioPosition) {
  if (p.state === "watching") return "var(--muted-foreground)";
  if (p.pnl > 0) return "#22c55e";
  if (p.pnl < 0) return "#ef4444";
  return "var(--foreground)";
}

function chipTransform(pct: number) {
  if (pct < 4) return "translateX(0)";
  if (pct > 96) return "translateX(-100%)";
  return "translateX(-50%)";
}

export function ExpiryTimeline({
  positions,
  horizonDays = DEFAULT_HORIZON,
}: ExpiryTimelineProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const visible = useMemo(
    () => positions.filter((p) => p.dte >= 0 && p.dte <= horizonDays),
    [positions, horizonDays],
  );

  const buckets = useMemo(() => {
    const m = new Map<number, PortfolioPosition[]>();
    for (const p of visible) {
      const arr = m.get(p.dte) ?? [];
      arr.push(p);
      m.set(p.dte, arr);
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
  }, [visible]);

  const maxStack = Math.max(1, ...buckets.map(([, g]) => Math.min(g.length, MAX_VISIBLE_PER_BUCKET + 1)));
  const chipsHeight = maxStack * 22 + 4;

  const ticks = useMemo(() => {
    const t: { pct: number; label: string; isToday: boolean }[] = [];
    const step = horizonDays >= 30 ? 7 : 3;
    for (let d = 0; d <= horizonDays; d += step) {
      const date = new Date(today);
      date.setDate(today.getDate() + d);
      t.push({
        pct: (d / horizonDays) * 100,
        label:
          d === 0
            ? "Today"
            : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isToday: d === 0,
      });
    }
    return t;
  }, [today, horizonDays]);

  if (visible.length === 0) {
    return (
      <div
        style={{
          padding: "20px 14px",
          color: "var(--muted-foreground)",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 11,
          textAlign: "center",
        }}
      >
        No positions expiring in the next {horizonDays} days
      </div>
    );
  }

  return (
    <div style={{ padding: "14px 18px 8px" }}>
      <div
        style={{
          position: "relative",
          height: chipsHeight,
        }}
      >
        {buckets.map(([dte, group]) => {
          const visibleGroup = group.slice(0, MAX_VISIBLE_PER_BUCKET);
          const overflow = group.length - visibleGroup.length;
          const pct = (dte / horizonDays) * 100;
          return (
            <div
              key={dte}
              style={{
                position: "absolute",
                left: `${pct}%`,
                bottom: 0,
                transform: chipTransform(pct),
                display: "flex",
                flexDirection: "column",
                gap: 2,
                alignItems: "stretch",
              }}
            >
              {visibleGroup.map((p) => (
                <span
                  key={p.id}
                  title={`${p.name} · ${p.dte}d · ${p.pnl >= 0 ? "+" : "-"}$${Math.abs(Math.round(p.pnl)).toLocaleString("en-US")}`}
                  style={{
                    background: chipColor(p),
                    color: "white",
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 2,
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {p.ticker}
                </span>
              ))}
              {overflow > 0 && (
                <span
                  style={{
                    fontFamily: "var(--font-mono), monospace",
                    fontSize: 9.5,
                    color: "var(--muted-foreground)",
                    textAlign: "center",
                    lineHeight: "16px",
                  }}
                >
                  +{overflow}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "relative",
          height: 1,
          background: "var(--border)",
          marginTop: 6,
        }}
      />
      <div
        style={{
          position: "relative",
          height: 28,
        }}
      >
        {ticks.map((t, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${t.pct}%`,
              transform: chipTransform(t.pct),
              top: 0,
              fontFamily: "var(--font-mono), monospace",
              fontSize: 10,
              color: t.isToday ? "var(--foreground)" : "var(--muted-foreground)",
              fontWeight: t.isToday ? 700 : 400,
              textAlign: t.pct < 4 ? "left" : t.pct > 96 ? "right" : "center",
              minWidth: 40,
            }}
          >
            <div
              style={{
                width: 1,
                height: 4,
                background: t.isToday ? "var(--foreground)" : "var(--border)",
                margin:
                  t.pct < 4
                    ? "0 0 0 0"
                    : t.pct > 96
                      ? "0 0 0 auto"
                      : "0 auto",
              }}
            />
            <div style={{ marginTop: 4 }}>{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
