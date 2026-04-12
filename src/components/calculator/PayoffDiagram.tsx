"use client";

import {
  ResponsiveContainer,
  LineChart,
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

export function PayoffDiagram({
  data,
  breakEvenPoints,
  currentPrice,
}: PayoffDiagramProps) {
  // Split data into positive and negative segments for coloring
  const chartData = data.map((point) => ({
    price: point.underlyingPrice,
    pnl: point.profitLoss,
    profit: point.profitLoss >= 0 ? point.profitLoss : null,
    loss: point.profitLoss < 0 ? point.profitLoss : null,
  }));

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="price"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{
              value: "Underlying Price at Expiration",
              position: "insideBottom",
              offset: -10,
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
            }}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v)}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            label={{
              value: "Profit / Loss",
              angle: -90,
              position: "insideLeft",
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "13px",
            }}
            labelFormatter={(v) => `Price: $${Number(v).toFixed(2)}`}
            formatter={(value) => [formatCurrency(Number(value)), "P&L"]}
          />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />

          {/* Current price line */}
          <ReferenceLine
            x={currentPrice}
            stroke="hsl(var(--primary))"
            strokeDasharray="5 5"
            label={{
              value: `Current: $${currentPrice.toFixed(2)}`,
              position: "top",
              fill: "hsl(var(--primary))",
              fontSize: 11,
            }}
          />

          {/* Break-even lines */}
          {breakEvenPoints.map((be) => (
            <ReferenceLine
              key={be}
              x={be}
              stroke="oklch(0.7 0.15 60)"
              strokeDasharray="4 4"
              label={{
                value: `BE: $${be.toFixed(2)}`,
                position: "top",
                fill: "oklch(0.7 0.15 60)",
                fontSize: 11,
              }}
            />
          ))}

          {/* Main P&L line */}
          <Line
            type="monotone"
            dataKey="pnl"
            stroke="oklch(0.7 0.2 150)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
