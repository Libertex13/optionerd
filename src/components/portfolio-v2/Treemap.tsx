"use client";

import { useEffect, useRef, useState } from "react";
import { fmtDollar } from "@/lib/portfolio/pricing";
import type { PortfolioPosition } from "@/lib/portfolio/types";

interface TreemapProps {
  positions: PortfolioPosition[];
}

interface Cell {
  p: PortfolioPosition;
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(
  items: PortfolioPosition[],
  x: number,
  y: number,
  w: number,
  h: number,
  cells: Cell[],
): void {
  if (items.length === 0) return;
  const total = items.reduce((s, it) => s + it.cost, 0);
  if (items.length === 1) {
    cells.push({ p: items[0], x, y, w, h });
    return;
  }
  const row: PortfolioPosition[] = [];
  const rest = [...items];
  while (rest.length && row.concat(rest[0]).length <= Math.max(2, Math.ceil(items.length / 2))) {
    row.push(rest.shift()!);
  }
  const rowTotal = row.reduce((s, it) => s + it.cost, 0);
  const ratio = rowTotal / total;
  if (w >= h) {
    const rw = w * ratio;
    let ry = y;
    row.forEach((it) => {
      const rh = h * (it.cost / rowTotal);
      cells.push({ p: it, x, y: ry, w: rw, h: rh });
      ry += rh;
    });
    squarify(rest, x + rw, y, w - rw, h, cells);
  } else {
    const rh = h * ratio;
    let rx = x;
    row.forEach((it) => {
      const rcw = w * (it.cost / rowTotal);
      cells.push({ p: it, x: rx, y, w: rcw, h: rh });
      rx += rcw;
    });
    squarify(rest, x, y + rh, w, h - rh, cells);
  }
}

export function Treemap({ positions }: TreemapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(620);

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

  const W = width;
  const H = 220;
  const sorted = [...positions].sort((a, b) => b.cost - a.cost);
  const cells: Cell[] = [];
  squarify(sorted, 0, 0, W, H, cells);

  const maxPl = Math.max(...positions.map((x) => Math.abs(x.pnl) || 1));

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: `${H}px`, display: "block" }}
      >
        {cells.map((c, i) => {
          const pl = c.p.pnl;
          const t = Math.min(Math.abs(pl) / maxPl, 1);
          let bg: string;
          if (c.p.state === "watching") bg = "oklch(0.20 0 0)";
          else if (pl > 0) bg = `oklch(${0.3 + t * 0.2} 0.15 150)`;
          else if (pl < 0) bg = `oklch(${0.3 + t * 0.2} 0.20 25)`;
          else bg = "oklch(0.22 0 0)";
          return (
            <g key={i}>
              <rect
                x={c.x}
                y={c.y}
                width={c.w}
                height={c.h}
                fill={bg}
                stroke="var(--background)"
                strokeWidth={2}
              />
              {c.w > 60 && c.h > 40 && (
                <>
                  <text
                    x={c.x + 8}
                    y={c.y + 16}
                    fontSize={11}
                    fontWeight={700}
                    fill="white"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {c.p.ticker}
                  </text>
                  <text
                    x={c.x + 8}
                    y={c.y + 30}
                    fontSize={10.5}
                    fill="rgba(255,255,255,0.75)"
                    fontFamily="var(--font-mono), monospace"
                  >
                    {c.p.state === "watching" ? "—" : fmtDollar(c.p.pnl)}
                  </text>
                  {c.h > 60 && (
                    <text
                      x={c.x + 8}
                      y={c.y + 44}
                      fontSize={9.5}
                      fill="rgba(255,255,255,0.55)"
                      fontFamily="var(--font-mono), monospace"
                    >
                      ${c.p.cost}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
