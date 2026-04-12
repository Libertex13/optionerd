"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { PayoffPoint } from "@/types/options";
import { formatCurrency } from "@/lib/utils/formatting";

interface PayoffDiagramProps {
  data: PayoffPoint[];
  breakEvenPoints: number[];
  currentPrice: number;
}

// Custom tooltip with green/red P&L coloring
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: number }) {
  if (!active || !payload) return null;
  const pnlEntry = payload.find((p) => p.dataKey === "pnl");
  if (!pnlEntry) return null;

  const pnl = pnlEntry.value;
  const color = pnl >= 0 ? "#16a34a" : "#dc2626";

  return (
    <div
      style={{
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", marginBottom: 2 }}>
        ${Number(label).toFixed(2)}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color }}>
        {formatCurrency(pnl)}
      </div>
    </div>
  );
}

export function PayoffDiagram({
  data,
  breakEvenPoints,
  currentPrice,
}: PayoffDiagramProps) {
  const chartData = data.map((point) => ({
    price: point.underlyingPrice,
    pnl: point.profitLoss,
    profitLine: point.profitLoss >= 0 ? point.profitLoss : null,
    lossLine: point.profitLoss < 0 ? point.profitLoss : null,
    profitFill: point.profitLoss > 0 ? point.profitLoss : 0,
    lossFill: point.profitLoss < 0 ? point.profitLoss : 0,
  }));

  // Add zero-crossing points for smooth color transitions
  const enhanced: typeof chartData = [];
  for (let i = 0; i < chartData.length; i++) {
    const curr = chartData[i];
    if (i > 0) {
      const prev = chartData[i - 1];
      if ((prev.pnl < 0 && curr.pnl >= 0) || (prev.pnl >= 0 && curr.pnl < 0)) {
        // Interpolate zero crossing
        const ratio = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl));
        const zeroPrice = prev.price + ratio * (curr.price - prev.price);
        enhanced.push({
          price: zeroPrice,
          pnl: 0,
          profitLine: 0,
          lossLine: 0,
          profitFill: 0,
          lossFill: 0,
        });
      }
    }
    enhanced.push(curr);
  }

  return (
    <div className="h-[400px] w-full md:h-[440px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={enhanced} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
          <defs>
            <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="lossFill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />

          <XAxis
            dataKey="price"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            stroke="var(--color-muted-foreground)"
            fontSize={13}
            tick={{ fill: "var(--color-muted-foreground)" }}
            tickMargin={8}
            label={{
              value: "Underlying Price at Expiration",
              position: "insideBottom",
              offset: -18,
              fill: "var(--color-muted-foreground)",
              fontSize: 12,
            }}
          />

          <YAxis
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
              return `$${v.toFixed(0)}`;
            }}
            stroke="var(--color-muted-foreground)"
            fontSize={13}
            tick={{ fill: "var(--color-muted-foreground)" }}
            width={65}
            tickMargin={6}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeWidth={1} strokeOpacity={0.5} />

          {/* Current price */}
          <ReferenceLine
            x={currentPrice}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: `Current $${currentPrice.toFixed(2)}`,
              position: "insideTopRight",
              fill: "var(--color-foreground)",
              fontSize: 13,
              fontWeight: 600,
              offset: 10,
            }}
          />

          {/* Break-even */}
          {breakEvenPoints.map((be, i) => (
            <ReferenceLine
              key={be}
              x={be}
              stroke="#a3a3a3"
              strokeDasharray="4 4"
              label={{
                value: `BE $${be.toFixed(2)}`,
                position: i % 2 === 0 ? "insideTopLeft" : "insideTopRight",
                fill: "#737373",
                fontSize: 13,
                fontWeight: 500,
                offset: 10,
              }}
            />
          ))}

          {/* Profit shading */}
          <Area type="monotone" dataKey="profitFill" stroke="none" fill="url(#profitFill)" dot={false} activeDot={false} tooltipType="none" />

          {/* Loss shading */}
          <Area type="monotone" dataKey="lossFill" stroke="none" fill="url(#lossFill)" dot={false} activeDot={false} tooltipType="none" />

          {/* Green profit line */}
          <Line
            type="monotone"
            dataKey="profitLine"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#16a34a", strokeWidth: 0 }}
            connectNulls={false}
            tooltipType="none"
          />

          {/* Red loss line */}
          <Line
            type="monotone"
            dataKey="lossLine"
            stroke="#dc2626"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: "#dc2626", strokeWidth: 0 }}
            connectNulls={false}
            tooltipType="none"
          />

          {/* Invisible full line for tooltip hover */}
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="transparent"
            strokeWidth={12}
            dot={false}
            activeDot={{ r: 6, fill: "var(--color-foreground)", strokeWidth: 2, stroke: "var(--color-card)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
