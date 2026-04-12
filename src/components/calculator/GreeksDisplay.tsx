"use client";

import type { Greeks } from "@/types/options";
import { formatSignedNumber, formatCurrency } from "@/lib/utils/formatting";

interface GreeksDisplayProps {
  greeks: Greeks;
  contractPrice: number;
  breakEvenPoints: number[];
  maxProfit: number;
  maxLoss: number;
}

export function GreeksDisplay({
  greeks,
  contractPrice,
  breakEvenPoints,
  maxProfit,
  maxLoss,
}: GreeksDisplayProps) {
  return (
    <div className="space-y-3">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-4">
        <MetricCell
          label="Contract Price"
          value={formatCurrency(contractPrice)}
          sub="per share (x100)"
        />
        <MetricCell
          label="Break Even"
          value={breakEvenPoints.length > 0 ? breakEvenPoints.map((b) => formatCurrency(b)).join(", ") : "\u2014"}
          sub="at expiration"
        />
        <MetricCell
          label="Max Profit"
          value={maxProfit > 100000 ? "Unlimited" : formatCurrency(maxProfit)}
          className="text-green-600 dark:text-green-400"
        />
        <MetricCell
          label="Max Loss"
          value={formatCurrency(maxLoss)}
          className="text-red-600 dark:text-red-400"
        />
      </div>

      {/* Greeks — compact horizontal strip */}
      <div className="grid grid-cols-5 gap-px overflow-hidden rounded-md border border-border bg-border">
        {(Object.entries(greeks) as [keyof Greeks, number][]).map(([name, value]) => (
          <div key={name} className="bg-card px-3 py-2">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              {name}
            </div>
            <div className="mt-0.5 font-mono text-sm font-bold">
              {name === "theta" || name === "vega" || name === "rho"
                ? formatCurrency(value)
                : formatSignedNumber(value, 4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCell({
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
