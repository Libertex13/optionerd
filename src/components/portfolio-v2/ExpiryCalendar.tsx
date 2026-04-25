"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PortfolioPosition } from "@/lib/portfolio/types";

interface ExpiryCalendarProps {
  positions: PortfolioPosition[];
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_MS = 86_400_000;

// Mon=0, Sun=6
function dowMon(d: Date) {
  return (d.getDay() + 6) % 7;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function ExpiryCalendar({ positions }: ExpiryCalendarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(w);
      }
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const today = useMemo(() => startOfDay(new Date()), []);
  const weeks = 9;
  const calendarStart = useMemo(() => {
    const start = new Date(today);
    start.setDate(today.getDate() - dowMon(today));
    return start;
  }, [today]);

  const padLeft = 16;
  const padRight = 8;
  const padTop = 8;
  const monthRowH = 14;
  const legendRowH = 18;

  const cellSize = Math.max(
    16,
    Math.min(28, (width - padLeft - padRight) / weeks),
  );
  const gridH = cellSize * 7;
  const H = padTop + gridH + monthRowH + legendRowH + 4;
  const W = width;

  const dayLabels = DAY_LABELS.map((label, i) => (
    <text
      key={`dl${i}`}
      x={0}
      y={padTop + i * cellSize + cellSize / 2 + 3}
      fontSize={9.5}
      fill="var(--muted-foreground)"
      fontFamily="var(--font-mono), monospace"
    >
      {label}
    </text>
  ));

  const cells: React.ReactElement[] = [];
  const monthMarks: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(calendarStart);
      cellDate.setDate(calendarStart.getDate() + w * 7 + d);
      const isPast = cellDate.getTime() < today.getTime();
      const isToday = cellDate.getTime() === today.getTime();
      cells.push(
        <rect
          key={`c${w}-${d}`}
          x={padLeft + w * cellSize}
          y={padTop + d * cellSize}
          width={cellSize - 2}
          height={cellSize - 2}
          fill={
            isToday
              ? "var(--accent)"
              : isPast
                ? "var(--background)"
                : "var(--muted)"
          }
          stroke="var(--border)"
          rx={1.5}
        />,
      );
    }
    const colDate = new Date(calendarStart);
    colDate.setDate(calendarStart.getDate() + w * 7);
    if (colDate.getMonth() !== lastMonth) {
      monthMarks.push({
        col: w,
        label: colDate.toLocaleString("en-US", { month: "short" }),
      });
      lastMonth = colDate.getMonth();
    }
  }

  const monthLabels = monthMarks.map((m, i) => (
    <text
      key={`mo${i}`}
      x={padLeft + m.col * cellSize}
      y={padTop + gridH + monthRowH - 4}
      fontSize={10}
      fill="var(--muted-foreground)"
      fontFamily="var(--font-mono), monospace"
    >
      {m.label}
    </text>
  ));

  const markers = positions
    .map((p) => {
      const target = new Date(today);
      target.setDate(today.getDate() + p.dte);
      const offset = Math.floor(
        (target.getTime() - calendarStart.getTime()) / DAY_MS,
      );
      const w = Math.floor(offset / 7);
      const d = offset % 7;
      return { p, w, d };
    })
    .filter((e) => e.w >= 0 && e.w < weeks && e.d >= 0 && e.d < 7)
    .map((e, i) => {
      const cx = padLeft + e.w * cellSize;
      const cy = padTop + e.d * cellSize;
      const pl = e.p.pnl;
      const color =
        e.p.state === "watching"
          ? "var(--muted-foreground)"
          : pl > 0
            ? "#22c55e"
            : pl < 0
              ? "#ef4444"
              : "var(--foreground)";
      const tickerLabel = e.p.ticker.slice(0, cellSize >= 24 ? 4 : 3);
      return (
        <g key={`m${i}`}>
          <rect
            x={cx}
            y={cy}
            width={cellSize - 2}
            height={cellSize - 2}
            fill={color}
            fillOpacity={0.9}
            rx={1.5}
          />
          <text
            x={cx + 2}
            y={cy + cellSize / 2 + 3}
            fontSize={8}
            fontWeight={700}
            fill="white"
            fontFamily="var(--font-mono), monospace"
          >
            {tickerLabel}
          </text>
        </g>
      );
    });

  const legendY = padTop + gridH + monthRowH + legendRowH - 6;
  const legendItems: { color: string; label: string }[] = [
    { color: "#22c55e", label: "Profit" },
    { color: "#ef4444", label: "Loss" },
    { color: "var(--muted-foreground)", label: "Watching" },
  ];

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: `${H}px` }}
      >
        {dayLabels}
        {cells}
        {markers}
        {monthLabels}
        <g
          transform={`translate(${padLeft},${legendY})`}
          fontSize={9.5}
          fontFamily="var(--font-mono), monospace"
          fill="var(--muted-foreground)"
        >
          {legendItems.map((item, i) => {
            const x = i * 70;
            return (
              <g key={`lg${i}`} transform={`translate(${x},0)`}>
                <rect x={0} y={-8} width={8} height={8} fill={item.color} rx={1} />
                <text x={12} y={-1}>{item.label}</text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
