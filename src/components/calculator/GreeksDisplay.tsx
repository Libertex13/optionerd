"use client";

import type { Greeks } from "@/types/options";
import { formatSignedNumber, formatCurrency } from "@/lib/utils/formatting";

interface LegSummary {
  label: string;
  maxProfit: number;
  maxLoss: number;
  plAtTarget: number | null;
}

interface GreeksDisplayProps {
  greeks: Greeks;
  contractPrice: number;
  breakEvenPoints: number[];
  underlyingPrice: number;
  maxProfit: number | null;
  maxLoss: number | null;
  profitAtTarget: number | null;
  priceTarget: number | null;
  legSummaries: LegSummary[];
  chanceOfProfit: number | null;
  isUnlimitedProfit: boolean;
  isUnlimitedLoss: boolean;
  mixedExpiry?: boolean;
  summaryDateLabel?: string | null;
  summaryApproximate?: boolean;
}

function rrPct(profit: number, loss: number): string {
  if (loss === 0) return "\u2014";
  const pct = (profit / Math.abs(loss)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
}

function rrColor(profit: number, loss: number): string {
  if (loss === 0) return "";
  const ratio = Math.abs(profit / loss);
  if (ratio >= 2) return "text-green-600 dark:text-green-400";
  if (ratio >= 1) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function plColor(value: number): string {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

export function GreeksDisplay({
  greeks,
  contractPrice,
  breakEvenPoints,
  underlyingPrice,
  maxProfit,
  maxLoss,
  profitAtTarget,
  priceTarget,
  legSummaries,
  chanceOfProfit,
  isUnlimitedProfit,
  isUnlimitedLoss,
  mixedExpiry = false,
  summaryDateLabel = null,
  summaryApproximate = false,
}: GreeksDisplayProps) {
  const absMaxLoss = maxLoss !== null ? Math.abs(maxLoss) : null;
  const hasTarget = profitAtTarget !== null && priceTarget !== null && priceTarget > 0;
  const showLegs = !mixedExpiry && legSummaries.length > 1;

  const breakEvenSubs = breakEvenPoints.map((be) => {
    const pct = ((be - underlyingPrice) / underlyingPrice) * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}% from spot`;
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
        <MetricCell
          label="Contract Price"
          value={formatCurrency(contractPrice)}
          sub="per share (x100)"
        />
        <MetricCell
          label="Break Even"
          value={breakEvenPoints.length > 0 ? breakEvenPoints.map((b) => formatCurrency(b)).join(", ") : "\u2014"}
          sub={
            mixedExpiry
              ? (summaryDateLabel ? `at ${summaryDateLabel}${summaryApproximate ? " · conditional" : ""}` : "at selected expiry")
              : (breakEvenSubs.length > 0 ? breakEvenSubs.join(", ") : "at expiration")
          }
        />
        <MetricCell
          label="Chance of Profit"
          value={chanceOfProfit !== null ? `${(chanceOfProfit * 100).toFixed(1)}%` : "\u2014"}
          sub={
            mixedExpiry
              ? (summaryDateLabel ? `by ${summaryDateLabel}${summaryApproximate ? " · conditional" : ""}` : "by selected expiry")
              : "at expiration"
          }
          className={
            chanceOfProfit !== null
              ? chanceOfProfit >= 0.5
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
              : ""
          }
        />
      </div>

      {mixedExpiry && (
        <div className="rounded-md border border-amber-300/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {summaryApproximate
            ? `Mixed expiries detected. ${summaryDateLabel ?? "This later expiry"} is shown as a conditional view, assuming the selected price applies at that date.`
            : `Mixed expiries detected. ${summaryDateLabel ?? "This front expiry"} is an exact front-expiry view; use the Scenario Path below to inspect later conditional outcomes.`}
        </div>
      )}

      {!mixedExpiry && (
        <div className={`grid gap-px overflow-hidden rounded-md border border-border bg-border ${hasTarget ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
          <MetricCell
            label="Max Profit"
            value={isUnlimitedProfit ? "Unlimited" : formatCurrency(maxProfit ?? 0)}
            className="text-green-600 dark:text-green-400"
          />
          <MetricCell
            label="Max Loss"
            value={isUnlimitedLoss ? "Unlimited" : formatCurrency(maxLoss ?? 0)}
            className="text-red-600 dark:text-red-400"
          />
          <MetricCell
            label="R/R"
            value={isUnlimitedProfit ? "Unlimited" : (absMaxLoss && absMaxLoss > 0 && maxProfit !== null ? rrPct(maxProfit, absMaxLoss) : "\u2014")}
            className={
              isUnlimitedProfit
                ? "text-green-600 dark:text-green-400"
                : (absMaxLoss && absMaxLoss > 0 && maxProfit !== null ? rrColor(maxProfit, absMaxLoss) : "")
            }
          />
          {!hasTarget && (
            <MetricCell
              label="Max Risk"
              value={formatCurrency(absMaxLoss ?? 0)}
              sub="total position"
            />
          )}
        </div>
      )}

      {hasTarget && (
        <div className={`grid gap-px overflow-hidden rounded-md border border-border bg-border ${mixedExpiry ? "grid-cols-1" : "grid-cols-3"}`}>
          <MetricCell
            label={`Profit at $${priceTarget.toFixed(0)}`}
            value={formatCurrency(profitAtTarget)}
            className={plColor(profitAtTarget)}
            sub={mixedExpiry && summaryDateLabel ? `at ${summaryDateLabel}` : undefined}
          />
          {!mixedExpiry && (
            <MetricCell
              label="Max Risk"
              value={formatCurrency(absMaxLoss ?? 0)}
              sub="total position"
            />
          )}
          {!mixedExpiry && (
            <MetricCell
              label="R/R at Target"
              value={absMaxLoss && absMaxLoss > 0 ? rrPct(profitAtTarget, absMaxLoss) : "\u2014"}
              className={absMaxLoss && absMaxLoss > 0 ? rrColor(profitAtTarget, absMaxLoss) : ""}
            />
          )}
        </div>
      )}

      {showLegs && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-3 py-1.5 font-medium">Leg</th>
                <th className="text-right px-3 py-1.5 font-medium">Max Profit</th>
                <th className="text-right px-3 py-1.5 font-medium">Max Loss</th>
                {hasTarget && (
                  <th className="text-right px-3 py-1.5 font-medium">P&L at ${priceTarget.toFixed(0)}</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {legSummaries.map((leg, i) => {
                const legUnlimited = leg.maxProfit > 100000;
                return (
                  <tr key={i} className="bg-card">
                    <td className="px-3 py-1.5 font-semibold">{leg.label}</td>
                    <td className={`text-right px-3 py-1.5 ${plColor(leg.maxProfit)}`}>
                      {legUnlimited ? "Unlimited" : formatCurrency(leg.maxProfit)}
                    </td>
                    <td className={`text-right px-3 py-1.5 ${plColor(leg.maxLoss)}`}>
                      {formatCurrency(leg.maxLoss)}
                    </td>
                    {hasTarget && (
                      <td className={`text-right px-3 py-1.5 ${leg.plAtTarget !== null ? plColor(leg.plAtTarget) : ""}`}>
                        {leg.plAtTarget !== null ? formatCurrency(leg.plAtTarget) : "\u2014"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
