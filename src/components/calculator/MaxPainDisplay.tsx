"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateMaxPain } from "@/lib/pricing/max-pain";
import { formatCurrency } from "@/lib/utils/formatting";
import type { OptionContract } from "@/types/market";

interface MaxPainDisplayProps {
  calls: OptionContract[];
  puts: OptionContract[];
  currentPrice: number;
}

export function MaxPainDisplay({
  calls,
  puts,
  currentPrice,
}: MaxPainDisplayProps) {
  const result = useMemo(
    () => calculateMaxPain(calls, puts),
    [calls, puts],
  );

  if (!result) {
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

  const { maxPainStrike, painByStrike } = result;
  const distanceFromCurrent = ((maxPainStrike - currentPrice) / currentPrice) * 100;
  const direction = distanceFromCurrent > 0 ? "above" : distanceFromCurrent < 0 ? "below" : "at";

  // Find max total pain for bar scaling
  const maxTotalPain = Math.max(...painByStrike.map((s) => s.totalPain));

  // Show a subset of strikes around the max pain for a clean display
  const maxPainIndex = painByStrike.findIndex(
    (s) => s.strike === maxPainStrike,
  );
  const rangeStart = Math.max(0, maxPainIndex - 8);
  const rangeEnd = Math.min(painByStrike.length, maxPainIndex + 9);
  const visibleStrikes = painByStrike.slice(rangeStart, rangeEnd);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Max Pain</span>
          <span className="font-mono text-base">
            {formatCurrency(maxPainStrike)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="mb-4 flex gap-4 text-xs text-muted-foreground">
          <span>
            Current: <span className="font-mono font-medium text-foreground">{formatCurrency(currentPrice)}</span>
          </span>
          <span>
            Distance:{" "}
            <span
              className={`font-mono font-medium ${
                Math.abs(distanceFromCurrent) < 1
                  ? "text-foreground"
                  : distanceFromCurrent > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
              }`}
            >
              {Math.abs(distanceFromCurrent).toFixed(1)}% {direction}
            </span>
          </span>
        </div>

        {/* Pain by strike chart */}
        <div className="space-y-1">
          {visibleStrikes.map((entry) => {
            const isMaxPain = entry.strike === maxPainStrike;
            const callWidth =
              maxTotalPain > 0 ? (entry.callPain / maxTotalPain) * 100 : 0;
            const putWidth =
              maxTotalPain > 0 ? (entry.putPain / maxTotalPain) * 100 : 0;

            return (
              <div
                key={entry.strike}
                className={`flex items-center gap-2 text-xs ${
                  isMaxPain ? "font-bold" : ""
                }`}
              >
                <span
                  className={`w-14 text-right font-mono ${
                    isMaxPain
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {entry.strike}
                </span>
                <div className="flex-1 flex h-3.5 rounded-sm overflow-hidden bg-muted/30">
                  <div
                    className="bg-red-500/60 dark:bg-red-400/50 h-full"
                    style={{ width: `${putWidth}%` }}
                  />
                  <div
                    className="bg-green-500/60 dark:bg-green-400/50 h-full"
                    style={{ width: `${callWidth}%` }}
                  />
                </div>
                {isMaxPain && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    MAX
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-red-500/60 dark:bg-red-400/50" />
            Put pain
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-green-500/60 dark:bg-green-400/50" />
            Call pain
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
