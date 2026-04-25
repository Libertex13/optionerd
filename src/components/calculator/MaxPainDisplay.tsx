"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateMaxPain } from "@/lib/pricing/max-pain";
import { formatCurrency, formatCompactCurrency, formatVolume } from "@/lib/utils/formatting";
import type { OptionChainExpiry } from "@/types/market";

interface MaxPainDisplayProps {
  expirations: OptionChainExpiry[];
  currentPrice: number;
  /** Pre-select this expiry (e.g. from the first leg). Falls back to nearest expiry. */
  defaultExpiry?: string;
}

/* ------------------------------------------------------------------ */
/*  Stat card helper                                                   */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  className?: string;
}) {
  return (
    <div className="bg-card px-3 py-2.5">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={`mt-0.5 font-mono text-lg font-bold ${className ?? ""}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom tooltips                                                    */
/* ------------------------------------------------------------------ */

function PainTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; name: string }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const putEntry = payload.find((p) => p.dataKey === "putPain");
  const callEntry = payload.find((p) => p.dataKey === "callPain");
  const putVal = putEntry?.value ?? 0;
  const callVal = callEntry?.value ?? 0;

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
      <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", marginBottom: 4 }}>
        Strike ${Number(label).toFixed(2)}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
        <div>
          <span style={{ color: "#ef4444", fontWeight: 600 }}>Put: </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {formatCompactCurrency(putVal)}
          </span>
        </div>
        <div>
          <span style={{ color: "#22c55e", fontWeight: 600 }}>Call: </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {formatCompactCurrency(callVal)}
          </span>
        </div>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--color-muted-foreground)",
          marginTop: 4,
          borderTop: "1px solid var(--color-border)",
          paddingTop: 4,
        }}
      >
        Total: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatCompactCurrency(putVal + callVal)}</span>
      </div>
    </div>
  );
}

function OITooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const putEntry = payload.find((p) => p.dataKey === "putOI");
  const callEntry = payload.find((p) => p.dataKey === "callOI");
  const putVal = putEntry?.value ?? 0;
  const callVal = callEntry?.value ?? 0;

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
      <div style={{ fontSize: 11, color: "var(--color-muted-foreground)", marginBottom: 4 }}>
        Strike ${Number(label).toFixed(2)}
      </div>
      <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
        <div>
          <span style={{ color: "#ef4444", fontWeight: 600 }}>Put OI: </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {formatVolume(putVal)}
          </span>
        </div>
        <div>
          <span style={{ color: "#22c55e", fontWeight: 600 }}>Call OI: </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {formatVolume(callVal)}
          </span>
        </div>
      </div>
      {callVal > 0 && (
        <div
          style={{
            fontSize: 11,
            color: "var(--color-muted-foreground)",
            marginTop: 4,
            borderTop: "1px solid var(--color-border)",
            paddingTop: 4,
          }}
        >
          P/C Ratio: <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{(putVal / callVal).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function MaxPainDisplay({
  expirations,
  currentPrice,
  defaultExpiry,
}: MaxPainDisplayProps) {
  // Expiry selector state — default to the leg's expiry or the first available
  const initialExpiry = defaultExpiry ?? expirations[0]?.expirationDate ?? "";
  const [selectedExpiry, setSelectedExpiry] = useState(initialExpiry);

  // If the default expiry changes (user selects a different leg expiry), follow it
  useEffect(() => {
    const id = setTimeout(() => {
      if (defaultExpiry && expirations.some((e) => e.expirationDate === defaultExpiry)) {
        setSelectedExpiry(defaultExpiry);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [defaultExpiry, expirations]);

  // Find the selected expiry data
  const activeExpiry = expirations.find((e) => e.expirationDate === selectedExpiry)
    ?? expirations[0];

  const result = useMemo(
    () => activeExpiry ? calculateMaxPain(activeExpiry.calls, activeExpiry.puts) : null,
    [activeExpiry],
  );

  if (!activeExpiry || !result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Max Pain</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Insufficient open interest data to calculate max pain.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    maxPainStrike,
    painByStrike,
    oiByStrike,
    totalCallOI,
    totalPutOI,
    putCallRatio,
    highestOIStrike,
    callPainAtMaxPain,
    putPainAtMaxPain,
  } = result;

  const distanceFromCurrent = ((maxPainStrike - currentPrice) / currentPrice) * 100;
  const direction = distanceFromCurrent > 0 ? "above" : distanceFromCurrent < 0 ? "below" : "at";

  // Direction signal: if max pain is below current price, market may pull down, etc.
  const directionSignal =
    Math.abs(distanceFromCurrent) < 1
      ? "near current price"
      : distanceFromCurrent > 0
        ? "price may gravitate up"
        : "price may gravitate down";

  // Pain dominance: which side contributes more pain at the max pain price
  const totalPainAtMP = callPainAtMaxPain + putPainAtMaxPain;
  const callPainPct = totalPainAtMP > 0 ? (callPainAtMaxPain / totalPainAtMP) * 100 : 50;
  const putPainPct = totalPainAtMP > 0 ? (putPainAtMaxPain / totalPainAtMP) * 100 : 50;

  // Subset strikes for chart display — show ~25 strikes centered on max pain
  const maxPainIndex = painByStrike.findIndex((s) => s.strike === maxPainStrike);
  const chartRadius = 12;
  const rangeStart = Math.max(0, maxPainIndex - chartRadius);
  const rangeEnd = Math.min(painByStrike.length, maxPainIndex + chartRadius + 1);
  const visiblePain = painByStrike.slice(rangeStart, rangeEnd);

  // Same window for OI chart
  const visibleOI = oiByStrike.filter((s) =>
    visiblePain.some((p) => p.strike === s.strike),
  );

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Max Pain Analysis</span>
            <span className="font-mono text-xl">
              {formatCurrency(maxPainStrike)}
            </span>
          </CardTitle>

          {/* Expiry selector */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Expiration:</span>
            <Select value={selectedExpiry} onValueChange={(v) => { if (v) setSelectedExpiry(v); }}>
              <SelectTrigger className="h-7 w-auto min-w-35 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expirations.map((exp) => (
                  <SelectItem
                    key={exp.expirationDate}
                    value={exp.expirationDate}
                    className="text-xs font-mono"
                  >
                    {exp.expirationDate} ({exp.daysToExpiry}d)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-md border border-border bg-border">
            <StatCard
              label="Current Price"
              value={formatCurrency(currentPrice)}
            />
            <StatCard
              label="Distance"
              value={`${Math.abs(distanceFromCurrent).toFixed(1)}% ${direction}`}
              sub={directionSignal}
              className={
                Math.abs(distanceFromCurrent) < 1
                  ? "text-foreground"
                  : distanceFromCurrent > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
              }
            />
            <StatCard
              label="Put/Call OI Ratio"
              value={putCallRatio.toFixed(2)}
              sub={
                putCallRatio > 1.2
                  ? "bearish bias"
                  : putCallRatio < 0.8
                    ? "bullish bias"
                    : "neutral"
              }
              className={
                putCallRatio > 1.2
                  ? "text-red-600 dark:text-red-400"
                  : putCallRatio < 0.8
                    ? "text-green-600 dark:text-green-400"
                    : "text-foreground"
              }
            />
            <StatCard
              label="Highest OI Strike"
              value={formatCurrency(highestOIStrike)}
              sub="most contracts outstanding"
            />
          </div>

          {/* OI breakdown + pain split */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-md border border-border bg-border">
            <StatCard
              label="Total Call OI"
              value={formatVolume(totalCallOI)}
              sub={`${((totalCallOI / (totalCallOI + totalPutOI)) * 100).toFixed(0)}% of total`}
            />
            <StatCard
              label="Total Put OI"
              value={formatVolume(totalPutOI)}
              sub={`${((totalPutOI / (totalCallOI + totalPutOI)) * 100).toFixed(0)}% of total`}
            />
            <StatCard
              label="Call Pain at Max"
              value={formatCompactCurrency(callPainAtMaxPain)}
              sub={`${callPainPct.toFixed(0)}% of total pain`}
              className="text-green-600 dark:text-green-400"
            />
            <StatCard
              label="Put Pain at Max"
              value={formatCompactCurrency(putPainAtMaxPain)}
              sub={`${putPainPct.toFixed(0)}% of total pain`}
              className="text-red-600 dark:text-red-400"
            />
          </div>

          {/* Pain dominance bar */}
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Pain Split at Max Pain
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
              <div
                className="bg-red-500/70 dark:bg-red-400/60 transition-all"
                style={{ width: `${putPainPct}%` }}
              />
              <div
                className="bg-green-500/70 dark:bg-green-400/60 transition-all"
                style={{ width: `${callPainPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>Put {putPainPct.toFixed(0)}%</span>
              <span>Call {callPainPct.toFixed(0)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pain by strike chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Dollar Pain by Strike</CardTitle>
          <p className="text-xs text-muted-foreground">
            Total option holder payout at each settlement price. Max pain is where this value is lowest.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visiblePain} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} vertical={false} />

                <XAxis
                  dataKey="strike"
                  tickFormatter={(v: number) => `$${v}`}
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tick={{ fill: "var(--color-muted-foreground)" }}
                  tickMargin={6}
                  interval="preserveStartEnd"
                  label={{
                    value: "Strike Price",
                    position: "insideBottom",
                    offset: -18,
                    fill: "var(--color-muted-foreground)",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  tickFormatter={(v: number) => {
                    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
                    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
                    return `$${v}`;
                  }}
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tick={{ fill: "var(--color-muted-foreground)" }}
                  width={55}
                />

                <Tooltip content={<PainTooltip />} />

                {/* Current price reference line */}
                <ReferenceLine
                  x={currentPrice}
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Current $${currentPrice.toFixed(0)}`,
                    position: "insideTopRight",
                    fill: "var(--color-foreground)",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                {/* Max pain reference line */}
                <ReferenceLine
                  x={maxPainStrike}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: `Max Pain $${maxPainStrike.toFixed(0)}`,
                    position: "insideTopLeft",
                    fill: "#f59e0b",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                <Bar dataKey="putPain" stackId="pain" name="Put Pain" radius={[0, 0, 0, 0]}>
                  {visiblePain.map((entry) => (
                    <Cell
                      key={entry.strike}
                      fill={entry.strike === maxPainStrike ? "#dc2626" : "rgba(239,68,68,0.5)"}
                    />
                  ))}
                </Bar>
                <Bar dataKey="callPain" stackId="pain" name="Call Pain" radius={[2, 2, 0, 0]}>
                  {visiblePain.map((entry) => (
                    <Cell
                      key={entry.strike}
                      fill={entry.strike === maxPainStrike ? "#16a34a" : "rgba(34,197,94,0.5)"}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/60" />
              Put Pain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500/60" />
              Call Pain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 bg-[#f59e0b]" style={{ borderTop: "2px dashed #f59e0b" }} />
              Max Pain
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3" style={{ borderTop: "2px dashed var(--color-muted-foreground)" }} />
              Current Price
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Open Interest by strike chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Open Interest by Strike</CardTitle>
          <p className="text-xs text-muted-foreground">
            Number of outstanding contracts at each strike. Heavy OI acts as a magnet for price.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visibleOI} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} vertical={false} />

                <XAxis
                  dataKey="strike"
                  tickFormatter={(v: number) => `$${v}`}
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tick={{ fill: "var(--color-muted-foreground)" }}
                  tickMargin={6}
                  interval="preserveStartEnd"
                  label={{
                    value: "Strike Price",
                    position: "insideBottom",
                    offset: -18,
                    fill: "var(--color-muted-foreground)",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  tickFormatter={(v: number) => {
                    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
                    return `${v}`;
                  }}
                  stroke="var(--color-muted-foreground)"
                  fontSize={11}
                  tick={{ fill: "var(--color-muted-foreground)" }}
                  width={45}
                />

                <Tooltip content={<OITooltip />} />

                {/* Max pain reference */}
                <ReferenceLine
                  x={maxPainStrike}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />

                {/* Current price */}
                <ReferenceLine
                  x={currentPrice}
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                />

                <Bar dataKey="putOI" stackId="oi" name="Put OI" fill="rgba(239,68,68,0.55)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="callOI" stackId="oi" name="Call OI" fill="rgba(34,197,94,0.55)" radius={[2, 2, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-2 flex justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500/55" />
              Put OI
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-500/55" />
              Call OI
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
