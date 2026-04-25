"use client";

import { useEffect, useMemo, useState } from "react";
import type { OptionLeg, StockLeg } from "@/types/options";
import { formatCurrency } from "@/lib/utils/formatting";
import {
  buildMixedExpiryScenarioSteps,
  defaultMixedExpiryTargets,
  type ExpiryInfo,
} from "@/lib/pricing/mixed-expiry";

interface MixedExpiryScenarioPanelProps {
  optionLegs: OptionLeg[];
  stockLeg: StockLeg | null;
  expiryInfo: ExpiryInfo[];
  currentPrice: number;
}

function pnlClass(value: number): string {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

export function MixedExpiryScenarioPanel({
  optionLegs,
  stockLeg,
  expiryInfo,
  currentPrice,
}: MixedExpiryScenarioPanelProps) {
  const [targets, setTargets] = useState<Record<string, string>>({});

  const defaultTargets = useMemo(
    () => defaultMixedExpiryTargets(optionLegs, expiryInfo, currentPrice),
    [currentPrice, expiryInfo, optionLegs],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setTargets((prev) => {
        const next: Record<string, string> = {};
        for (const step of expiryInfo) {
          next[step.expirationDate] = prev[step.expirationDate] ?? defaultTargets[step.expirationDate]?.toFixed(2) ?? "";
        }
        return next;
      });
    }, 0);
    return () => clearTimeout(id);
  }, [defaultTargets, expiryInfo]);

  const numericTargets = useMemo(
    () => Object.fromEntries(
      expiryInfo.map((step) => [
        step.expirationDate,
        Number.parseFloat(targets[step.expirationDate] ?? "") || defaultTargets[step.expirationDate] || currentPrice,
      ]),
    ),
    [currentPrice, defaultTargets, expiryInfo, targets],
  );

  const steps = useMemo(
    () => buildMixedExpiryScenarioSteps(optionLegs, stockLeg, expiryInfo, numericTargets),
    [expiryInfo, numericTargets, optionLegs, stockLeg],
  );

  return (
    <div className="rounded-md border border-border bg-card" data-testid="mixed-expiry-scenario-panel">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold">Scenario Path</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Set a target price at each expiry to see what expires, what remains, and what the whole structure is worth if you close there.
        </p>
      </div>
      <div className="space-y-3 p-4">
        {steps.map((step) => (
          <div
            key={step.expirationDate}
            className="rounded-md border border-border bg-muted/20 p-3"
            data-testid="mixed-expiry-step"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-sm font-semibold">{step.expirationDate}</div>
                <div className="text-xs text-muted-foreground">
                  {step.isFinal ? "Final expiry" : "Decision point"} · {step.daysToExpiry} DTE
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Target
                <span className="font-mono text-sm text-foreground">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targets[step.expirationDate] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setTargets((prev) => ({ ...prev, [step.expirationDate]: value }));
                    }
                  }}
                  className="h-8 w-24 rounded-sm border border-input bg-background px-2 font-mono text-sm text-right outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-sm border border-border bg-card">
                <div className="border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Legs Expiring Here
                </div>
                <div className="divide-y divide-border">
                  {step.expiringLegs.map((leg) => (
                    <div key={leg.label} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div>
                        <div className="font-mono font-semibold">{leg.label}</div>
                        <div className="text-xs text-muted-foreground">{leg.status}</div>
                      </div>
                      <div className={`font-mono font-semibold ${pnlClass(leg.realizedPnl)}`}>
                        {formatCurrency(leg.realizedPnl)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-sm border border-border bg-card">
                <div className="border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  After This Expiry
                </div>
                <div className="space-y-3 px-3 py-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Remaining position</div>
                    <div className="mt-1 font-mono text-xs">{step.remainingLabel}</div>
                  </div>
                  {!step.isFinal && (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">Remaining mark</span>
                        <span className="font-mono font-semibold">{formatCurrency(step.remainingMark)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">Remaining unrealized P/L</span>
                        <span className={`font-mono font-semibold ${pnlClass(step.remainingUnrealizedPnl)}`}>
                          {formatCurrency(step.remainingUnrealizedPnl)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {step.isFinal ? "Final P/L" : "Net if Closed Here"}
                    </span>
                    <span className={`font-mono text-base font-bold ${pnlClass(step.totalIfClosed)}`}>
                      {formatCurrency(step.totalIfClosed)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
