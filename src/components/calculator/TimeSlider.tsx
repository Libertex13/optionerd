"use client";

import { useState, useMemo } from "react";
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
import type { StrategyLeg } from "@/types/options";
import {
  generatePayoffAtExpiry,
  generatePayoffAtDate,
  findBreakEvenPoints,
} from "@/lib/pricing/payoff";
import {
  DEFAULT_RISK_FREE_RATE,
} from "@/lib/utils/constants";
import { formatCurrency } from "@/lib/utils/formatting";
import { useIsMobile } from "@/hooks/useIsMobile";

interface TimeSliderProps {
  legs: StrategyLeg[];
  currentPrice: number;
  daysToExpiry: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: number;
}) {
  if (!active || !payload) return null;
  const dated = payload.find((p) => p.dataKey === "datedPnl");
  if (!dated) return null;

  const pnl = dated.value;
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
      <div
        style={{
          fontSize: 11,
          color: "var(--color-muted-foreground)",
          marginBottom: 2,
        }}
      >
        ${Number(label).toFixed(2)}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color,
        }}
      >
        {formatCurrency(pnl)}
      </div>
    </div>
  );
}

export function TimeSlider({
  legs,
  currentPrice,
  daysToExpiry,
}: TimeSliderProps) {
  const isMobile = useIsMobile();
  const [dayElapsed, setDayElapsed] = useState(0);
  const referenceCurveLabel = "At expiry";
  // For short DTE, allow fractional steps so the slider feels smooth instead
  // of snapping in 1-day jumps over a 2-3 day range.
  const sliderStep = daysToExpiry < 30 ? 0.1 : 1;
  const elapsedDisplay =
    daysToExpiry < 10 ? dayElapsed.toFixed(1) : Math.round(dayElapsed).toString();

  const { expiryData, datedData, todayData, breakEvens, stats } =
    useMemo(() => {
      const expiryPoints = generatePayoffAtExpiry(legs, currentPrice);
      const datedPoints = dayElapsed >= daysToExpiry
        ? expiryPoints
        : generatePayoffAtDate(legs, currentPrice, dayElapsed, DEFAULT_RISK_FREE_RATE);
      const todayPoints = generatePayoffAtDate(
        legs,
        currentPrice,
        0,
        DEFAULT_RISK_FREE_RATE,
      );

      const bes = findBreakEvenPoints(datedPoints);

      // Stats from dated curve
      let plAtCurrent = 0;
      let maxProfitNow = -Infinity;
      let maxLossNow = Infinity;

      for (const pt of datedPoints) {
        if (
          Math.abs(pt.underlyingPrice - currentPrice) <
          currentPrice * 0.005
        ) {
          plAtCurrent = pt.profitLoss;
        }
        if (pt.profitLoss > maxProfitNow) maxProfitNow = pt.profitLoss;
        if (pt.profitLoss < maxLossNow) maxLossNow = pt.profitLoss;
      }

      return {
        expiryData: expiryPoints,
        datedData: datedPoints,
        todayData: todayPoints,
        breakEvens: bes,
        stats: {
          plAtCurrent: Math.round(plAtCurrent),
          maxProfit: Math.round(maxProfitNow),
          maxLoss: Math.round(maxLossNow),
          breakEven: bes.length > 0 ? bes[0] : null,
        },
      };
    }, [legs, currentPrice, daysToExpiry, dayElapsed]);

  // Merge into chart data
  const chartData = expiryData.map((pt, i) => ({
    price: pt.underlyingPrice,
    expiryPnl: pt.profitLoss,
    datedPnl: datedData[i]?.profitLoss ?? 0,
    todayPnl: todayData[i]?.profitLoss ?? 0,
    profitFill: (datedData[i]?.profitLoss ?? 0) > 0 ? datedData[i].profitLoss : 0,
    lossFill: (datedData[i]?.profitLoss ?? 0) < 0 ? datedData[i].profitLoss : 0,
  }));

  // Add zero-crossing points for smooth fills
  const enhanced: typeof chartData = [];
  for (let i = 0; i < chartData.length; i++) {
    const curr = chartData[i];
    if (i > 0) {
      const prev = chartData[i - 1];
      if (
        (prev.datedPnl < 0 && curr.datedPnl >= 0) ||
        (prev.datedPnl >= 0 && curr.datedPnl < 0)
      ) {
        const ratio =
          Math.abs(prev.datedPnl) /
          (Math.abs(prev.datedPnl) + Math.abs(curr.datedPnl));
        const zeroPrice = prev.price + ratio * (curr.price - prev.price);
        enhanced.push({
          price: zeroPrice,
          expiryPnl:
            prev.expiryPnl + ratio * (curr.expiryPnl - prev.expiryPnl),
          datedPnl: 0,
          todayPnl:
            prev.todayPnl + ratio * (curr.todayPnl - prev.todayPnl),
          profitFill: 0,
          lossFill: 0,
        });
      }
    }
    enhanced.push(curr);
  }

  const dateLabel = (() => {
    if (dayElapsed === 0) return "Today";
    if (dayElapsed >= daysToExpiry) return "Expiry";
    return `+${dayElapsed}d`;
  })();

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="border border-border rounded-md overflow-hidden bg-card">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
          <div className="flex gap-4 font-mono text-[11.5px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
              P/L at date
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-neutral-500" />
              {referenceCurveLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
              Today (T+0)
            </span>
          </div>
          <span className="font-mono text-[11.5px] text-muted-foreground">
            {dateLabel}
          </span>
        </div>

        <div className="h-95 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={enhanced}
              margin={{
                top: 20,
                right: isMobile ? 8 : 30,
                left: isMobile ? 0 : 10,
                bottom: 50,
              }}
            >
              <defs>
                <linearGradient id="tsProfitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="tsLossFill" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                opacity={0.4}
              />

              <XAxis
                dataKey="price"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tick={{ fill: "var(--color-muted-foreground)" }}
                tickMargin={8}
              />

              <YAxis
                tickFormatter={(v: number) => {
                  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
                  return `$${v.toFixed(0)}`;
                }}
                stroke="var(--color-muted-foreground)"
                fontSize={11}
                tick={{ fill: "var(--color-muted-foreground)" }}
                width={isMobile ? 40 : 55}
                tickMargin={isMobile ? 3 : 6}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Zero line */}
              <ReferenceLine
                y={0}
                stroke="var(--color-muted-foreground)"
                strokeWidth={1}
                strokeOpacity={0.5}
              />

              {/* Current price */}
              <ReferenceLine
                x={currentPrice}
                stroke="var(--color-foreground)"
                strokeDasharray="6 4"
                strokeWidth={1.2}
                strokeOpacity={0.5}
                label={{
                  value: `Current $${currentPrice.toFixed(2)}`,
                  position: "insideTopRight",
                  fill: "var(--color-foreground)",
                  fontSize: 11,
                  fontWeight: 600,
                  offset: 10,
                }}
              />

              {/* Break-evens — labels rendered below x-axis to avoid overlap */}
              {breakEvens.map((be, i) => {
                const tooClose = breakEvens.some(
                  (other, j) => j !== i && Math.abs(other - be) / currentPrice < 0.08,
                );
                const labelOffset = tooClose && i % 2 === 1 ? 32 : 18;
                return (
                  <ReferenceLine
                    key={be}
                    x={be}
                    stroke="#a3a3a3"
                    strokeDasharray="4 4"
                    label={{
                      value: `BE $${be.toFixed(2)}`,
                      position: "bottom",
                      fill: "#737373",
                      fontSize: 11,
                      fontWeight: 500,
                      offset: labelOffset,
                    }}
                  />
                );
              })}

              {/* Fills based on dated curve */}
              <Area
                type="monotone"
                dataKey="profitFill"
                stroke="none"
                fill="url(#tsProfitFill)"
                dot={false}
                activeDot={false}
                tooltipType="none"
              />
              <Area
                type="monotone"
                dataKey="lossFill"
                stroke="none"
                fill="url(#tsLossFill)"
                dot={false}
                activeDot={false}
                tooltipType="none"
              />

              {/* At-expiry ghost */}
              <Line
                type="monotone"
                dataKey="expiryPnl"
                stroke="#a3a3a3"
                strokeWidth={1.4}
                strokeDasharray="5 4"
                dot={false}
                activeDot={false}
                tooltipType="none"
                opacity={0.8}
              />

              {/* Today T+0 */}
              <Line
                type="monotone"
                dataKey="todayPnl"
                stroke="#60a5fa"
                strokeWidth={1.4}
                strokeDasharray="3 3"
                dot={false}
                activeDot={false}
                tooltipType="none"
                opacity={0.85}
              />

              {/* Dated curve — the primary line */}
              <Line
                type="monotone"
                dataKey="datedPnl"
                stroke={
                  stats.plAtCurrent >= 0 ? "#16a34a" : "#dc2626"
                }
                strokeWidth={2.4}
                dot={false}
                activeDot={{
                  r: 5,
                  fill:
                    stats.plAtCurrent >= 0 ? "#16a34a" : "#dc2626",
                  strokeWidth: 0,
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Slider */}
      <div className="border border-border rounded-md p-3 bg-card">
        <div className="flex justify-between items-center mb-2 font-mono text-[11.5px]">
          <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
            Date scrub
          </span>
          <span className="font-semibold">
            {elapsedDisplay} / {daysToExpiry} days elapsed
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={daysToExpiry}
          value={dayElapsed}
          step={sliderStep}
          onChange={(e) => setDayElapsed(parseFloat(e.target.value))}
          className="w-full h-0.75 bg-border rounded-sm appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_var(--color-background)]
            [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5
            [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0"
        />
        <div className="flex justify-between font-mono text-[10px] text-muted-foreground mt-1">
          <span>Today</span>
          {daysToExpiry >= 14 && <span>+{Math.round(daysToExpiry * 0.25)}d</span>}
          {daysToExpiry >= 28 && <span>+{Math.round(daysToExpiry * 0.5)}d</span>}
          {daysToExpiry >= 42 && <span>+{Math.round(daysToExpiry * 0.75)}d</span>}
          <span>Expiry</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 border border-border rounded-md overflow-hidden">
        <div className="p-2.5 border-r border-border bg-card">
          <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
            P/L at current
          </div>
          <div
            className={`font-mono text-[15px] font-bold mt-0.5 ${stats.plAtCurrent >= 0 ? "text-green-500" : "text-red-500"}`}
          >
            {stats.plAtCurrent >= 0 ? "+" : ""}${Math.abs(stats.plAtCurrent)}
          </div>
        </div>
        <div className="p-2.5 border-r border-border bg-card">
          <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
            Max profit now
          </div>
          <div className="font-mono text-[15px] font-bold mt-0.5 text-green-500">
            +${stats.maxProfit}
          </div>
        </div>
        <div className="p-2.5 border-r border-border bg-card">
          <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
            Max loss now
          </div>
          <div className="font-mono text-[15px] font-bold mt-0.5 text-red-500">
            -${Math.abs(stats.maxLoss)}
          </div>
        </div>
        <div className="p-2.5 bg-card">
          <div className="text-[9.5px] text-muted-foreground uppercase tracking-wider">
            Breakeven now
          </div>
          <div className="font-mono text-[15px] font-bold mt-0.5">
            {stats.breakEven ? `$${stats.breakEven.toFixed(2)}` : "\u2014"}
          </div>
        </div>
      </div>
    </div>
  );
}
