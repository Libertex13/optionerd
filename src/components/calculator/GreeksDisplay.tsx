"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Greeks } from "@/types/options";
import { formatNumber, formatSignedNumber, formatCurrency } from "@/lib/utils/formatting";

interface GreeksDisplayProps {
  greeks: Greeks;
  contractPrice: number;
  breakEvenPoints: number[];
  maxProfit: number;
  maxLoss: number;
}

const greekDescriptions: Record<keyof Greeks, string> = {
  delta: "Price change per $1 move in underlying",
  gamma: "Rate of change of delta per $1 move",
  theta: "Daily time decay ($ per day)",
  vega: "Price change per 1% IV change",
  rho: "Price change per 1% rate change",
};

export function GreeksDisplay({
  greeks,
  contractPrice,
  breakEvenPoints,
  maxProfit,
  maxLoss,
}: GreeksDisplayProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
      {/* Contract price */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Contract Price
          </div>
          <div className="mt-1 font-mono text-2xl font-bold">
            {formatCurrency(contractPrice)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Per share (×100 per contract)
          </div>
        </CardContent>
      </Card>

      {/* Break-even */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Break Even
          </div>
          <div className="mt-1 font-mono text-2xl font-bold">
            {breakEvenPoints.length > 0
              ? breakEvenPoints.map((b) => formatCurrency(b)).join(", ")
              : "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            At expiration
          </div>
        </CardContent>
      </Card>

      {/* Max Profit */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Max Profit
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-green-500">
            {maxProfit > 100000 ? "Unlimited" : formatCurrency(maxProfit)}
          </div>
        </CardContent>
      </Card>

      {/* Max Loss */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Max Loss
          </div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-500">
            {formatCurrency(maxLoss)}
          </div>
        </CardContent>
      </Card>

      {/* Greeks */}
      {(Object.entries(greeks) as [keyof Greeks, number][]).map(([name, value]) => (
        <Card key={name} className="bg-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              {name}
            </div>
            <div className="mt-1 font-mono text-xl font-bold">
              {name === "theta"
                ? formatCurrency(value)
                : name === "vega" || name === "rho"
                  ? formatCurrency(value)
                  : formatSignedNumber(value, 4)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {greekDescriptions[name]}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
