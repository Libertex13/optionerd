"use client";

import { useEffect, useRef, useState } from "react";
import { mtm, payoffAtExpiry } from "@/lib/portfolio/pricing";
import type { PortfolioPosition } from "@/lib/portfolio/types";

interface MiniPayoffProps {
  position: PortfolioPosition;
}

export function MiniPayoff({ position: p }: MiniPayoffProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(420);

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
  const pad = { l: 44, r: 12, t: 12, b: 22 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  // Center the price window on current price, or fall back to avg strike
  // when we have no underlying price (e.g. seeded positions with no feed).
  const avgStrike =
    p.legs.length > 0
      ? p.legs.reduce((s, l) => s + l.k, 0) / p.legs.length
      : 0;
  const centerPrice = p.px > 0 ? p.px : avgStrike > 0 ? avgStrike : 1;
  const minP = centerPrice * 0.7;
  const maxP = centerPrice * 1.3;
  const steps = 120;

  const expiry: [number, number][] = [];
  const current: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = minP + ((maxP - minP) * i) / steps;
    expiry.push([x, payoffAtExpiry(p.legs, x, p.stockLeg)]);
    current.push([x, mtm(p.legs, x, p.stockLeg)]);
  }

  let yMin = Infinity;
  let yMax = -Infinity;
  [...expiry, ...current].forEach(([, y]) => {
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  });
  const pd = Math.max(Math.abs(yMin), Math.abs(yMax)) * 0.12;
  yMin -= pd;
  yMax += pd;
  if (yMin > 0) yMin = -pd * 2;
  if (yMax < 0) yMax = pd * 2;

  const xs = (x: number) => pad.l + ((x - minP) / (maxP - minP)) * iw;
  const ys = (y: number) => pad.t + (1 - (y - yMin) / (yMax - yMin)) * ih;
  const zy = ys(0);

  const pathOf = (pts: [number, number][]) =>
    pts.map((q, i) => (i ? "L" : "M") + xs(q[0]).toFixed(1) + " " + ys(q[1]).toFixed(1)).join(" ");

  const splitBy = (pts: [number, number][], positive: boolean) => {
    let d = "";
    let on = false;
    for (const [x, y] of pts) {
      const match = positive ? y >= 0 : y <= 0;
      if (match) {
        d += (on ? "L" : "M") + xs(x).toFixed(1) + " " + ys(y).toFixed(1) + " ";
        on = true;
      } else {
        on = false;
      }
    }
    return d;
  };

  const fill = (pts: [number, number][], sign: number) => {
    let path = "";
    let inR = false;
    for (const [x, y] of pts) {
      const match = sign > 0 ? y >= 0 : y <= 0;
      if (match && !inR) {
        path += `M${xs(x).toFixed(1)} ${zy.toFixed(1)} L${xs(x).toFixed(1)} ${ys(y).toFixed(1)} `;
        inR = true;
      } else if (match && inR) {
        path += `L${xs(x).toFixed(1)} ${ys(y).toFixed(1)} `;
      } else if (!match && inR) {
        path += `L${xs(x).toFixed(1)} ${zy.toFixed(1)} Z `;
        inR = false;
      }
    }
    if (inR) {
      const last = pts[pts.length - 1];
      path += `L${xs(last[0]).toFixed(1)} ${zy.toFixed(1)} Z`;
    }
    return path;
  };

  const xTicks = [];
  for (let i = 0; i <= 4; i++) {
    const x = minP + ((maxP - minP) * i) / 4;
    xTicks.push(
      <text
        key={`x${i}`}
        x={xs(x)}
        y={H - 6}
        textAnchor="middle"
        fontSize={9.5}
        fontFamily="var(--font-mono), monospace"
        fill="var(--muted-foreground)"
      >
        ${x.toFixed(0)}
      </text>,
    );
  }
  const yTicks = [];
  for (let i = 0; i <= 3; i++) {
    const y = yMin + ((yMax - yMin) * i) / 3;
    const py = ys(y);
    yTicks.push(
      <g key={`y${i}`}>
        <line
          x1={pad.l}
          y1={py}
          x2={pad.l + iw}
          y2={py}
          stroke="var(--border)"
          strokeOpacity={0.4}
          strokeDasharray="2 3"
        />
        <text
          x={pad.l - 5}
          y={py + 3}
          textAnchor="end"
          fontSize={9.5}
          fontFamily="var(--font-mono), monospace"
          fill="var(--muted-foreground)"
        >
          {y >= 0 ? "+" : "−"}${Math.abs(y).toFixed(0)}
        </text>
      </g>,
    );
  }

  const markerPrice = p.px > 0 ? p.px : centerPrice;
  const curPL = mtm(p.legs, markerPrice, p.stockLeg);

  return (
    <div ref={ref} style={{ width: "100%" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: `${H}px`, display: "block" }}
      >
        <defs>
          <linearGradient id={`gp-${p.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`gl-${p.id}`} x1="0" x2="0" y1="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        {xTicks}
        {yTicks}
        <path d={fill(expiry, 1)} fill={`url(#gp-${p.id})`} />
        <path d={fill(expiry, -1)} fill={`url(#gl-${p.id})`} />
        <line
          x1={pad.l}
          y1={zy}
          x2={pad.l + iw}
          y2={zy}
          stroke="var(--muted-foreground)"
          strokeOpacity={0.5}
        />
        <path
          d={pathOf(current)}
          stroke="#60a5fa"
          strokeWidth={1.4}
          strokeDasharray="3 3"
          fill="none"
          opacity={0.85}
        />
        <path d={splitBy(expiry, true)} stroke="#16a34a" strokeWidth={2} fill="none" />
        <path d={splitBy(expiry, false)} stroke="#dc2626" strokeWidth={2} fill="none" />
        <line
          x1={xs(markerPrice)}
          y1={pad.t}
          x2={xs(markerPrice)}
          y2={pad.t + ih}
          stroke="var(--foreground)"
          strokeOpacity={0.5}
          strokeDasharray="5 4"
        />
        <circle
          cx={xs(markerPrice)}
          cy={ys(curPL)}
          r={4.5}
          fill={curPL >= 0 ? "#16a34a" : "#dc2626"}
          stroke="var(--card)"
          strokeWidth={2}
        />
        <text
          x={xs(markerPrice) + 5}
          y={pad.t + 12}
          fontSize={10}
          fontFamily="var(--font-mono), monospace"
          fill="var(--foreground)"
        >
          {p.px > 0 ? `Now $${p.px.toFixed(2)}` : `≈ $${markerPrice.toFixed(2)}`}
        </text>
      </svg>
    </div>
  );
}
