"use client";

import { useEffect, useRef, useState } from "react";
import type { PortfolioPosition } from "@/lib/portfolio/types";

interface ExpiryCalendarProps {
  positions: PortfolioPosition[];
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

  const weeks = 9;
  const W = width;
  const H = 160;
  const cellSize = Math.min((W - 20) / weeks, 28);
  const days = ["M", "T", "W", "T", "F", "S", "S"];

  const dayLabels = [];
  for (let i = 0; i < 7; i++) {
    dayLabels.push(
      <text
        key={`dl${i}`}
        x={0}
        y={14 + i * cellSize}
        fontSize={9.5}
        fill="var(--muted-foreground)"
        fontFamily="var(--font-mono), monospace"
      >
        {days[i]}
      </text>,
    );
  }

  const cells = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const cx = 14 + w * cellSize;
      const cy = 4 + d * cellSize;
      cells.push(
        <rect
          key={`c${w}-${d}`}
          x={cx}
          y={cy}
          width={cellSize - 3}
          height={cellSize - 3}
          fill="color-mix(in oklch, var(--background) 40%, var(--card))"
          stroke="var(--border)"
          rx={1}
        />,
      );
    }
  }

  const exps = positions.map((p) => ({ p, day: p.dte }));
  const markers = exps
    .filter((e) => Math.floor(e.day / 7) < weeks)
    .map((e, i) => {
      const w = Math.floor(e.day / 7);
      const d = e.day % 7;
      const cx = 14 + w * cellSize;
      const cy = 4 + d * cellSize;
      const pl = e.p.pnl;
      const color =
        e.p.state === "watching"
          ? "var(--muted-foreground)"
          : pl > 0
            ? "#22c55e"
            : pl < 0
              ? "#ef4444"
              : "var(--foreground)";
      return (
        <g key={`m${i}`}>
          <rect
            x={cx}
            y={cy}
            width={cellSize - 3}
            height={cellSize - 3}
            fill={color}
            fillOpacity={0.85}
            rx={1}
          />
          <text
            x={cx + 2}
            y={cy + 11}
            fontSize={8}
            fontWeight={700}
            fill="white"
            fontFamily="var(--font-mono), monospace"
          >
            {e.p.ticker.slice(0, 3)}
          </text>
        </g>
      );
    });

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: `${H}px` }}>
        {dayLabels}
        {cells}
        {markers}
        <text
          x={14}
          y={H - 24}
          fontSize={10}
          fill="var(--muted-foreground)"
          fontFamily="var(--font-mono), monospace"
        >
          Apr
        </text>
        <text
          x={14 + 4 * cellSize}
          y={H - 24}
          fontSize={10}
          fill="var(--muted-foreground)"
          fontFamily="var(--font-mono), monospace"
        >
          May
        </text>
        <text
          x={14 + 8 * cellSize}
          y={H - 24}
          fontSize={10}
          fill="var(--muted-foreground)"
          fontFamily="var(--font-mono), monospace"
        >
          Jun
        </text>
        <g
          transform={`translate(14,${H - 10})`}
          fontSize={9.5}
          fontFamily="var(--font-mono), monospace"
          fill="var(--muted-foreground)"
        >
          <rect x={0} y={-8} width={8} height={8} fill="#22c55e" />
          <text x={12} y={-1}>
            Profit
          </text>
          <rect x={54} y={-8} width={8} height={8} fill="#ef4444" />
          <text x={66} y={-1}>
            Loss
          </text>
          <rect x={106} y={-8} width={8} height={8} fill="var(--muted-foreground)" />
          <text x={118} y={-1}>
            Watching
          </text>
        </g>
      </svg>
    </div>
  );
}
