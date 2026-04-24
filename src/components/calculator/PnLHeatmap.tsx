"use client";

import { useState, useMemo } from "react";
import type { StrategyLeg } from "@/types/options";
import {
  calculateRiskCapital,
  calculateStrategyProfitLossAtDate,
} from "@/lib/pricing/payoff";
import { DEFAULT_RISK_FREE_RATE } from "@/lib/utils/constants";

type DisplayMode = "$" | "%";

interface PnLHeatmapProps {
  legs: StrategyLeg[];
  currentPrice: number;
  daysToExpiry: number;
}

/** Number of date columns in the heatmap */
const DATE_COLUMNS = 11;

/** Number of price rows in the heatmap */
const PRICE_ROWS = 21;

/** Price range: how far above/below current price (as fraction) */
const PRICE_RANGE_PCT = 0.20;

/**
 * Generate evenly-spaced dates from today through expiration.
 */
function generateDateColumns(totalDte: number): { label: string; dte: number }[] {
  const cols: { label: string; dte: number }[] = [];
  const steps = DATE_COLUMNS - 1;

  for (let i = 0; i <= steps; i++) {
    const dte = Math.round(totalDte * (1 - i / steps));
    const date = new Date();
    date.setDate(date.getDate() + (totalDte - dte));

    const label = i === steps
      ? "Exp"
      : `${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;

    cols.push({ label, dte });
  }

  return cols;
}

/**
 * Generate price rows centered around the current price.
 * Rows go from high to low (top of table = highest price).
 */
function generatePriceRows(currentPrice: number): number[] {
  const high = currentPrice * (1 + PRICE_RANGE_PCT);
  const low = currentPrice * (1 - PRICE_RANGE_PCT);
  const step = (high - low) / (PRICE_ROWS - 1);
  const prices: number[] = [];

  for (let i = 0; i < PRICE_ROWS; i++) {
    prices.push(Math.round((high - step * i) * 100) / 100);
  }

  return prices;
}

/**
 * Calculate the total cost basis (max risk / capital deployed) for the position.
 * For debit positions: net premium paid.
 * For credit positions: margin requirement approximation (we use the net credit as the basis).
 * For stock legs: shares * entry price.
 */
function calculateCostBasis(legs: StrategyLeg[], currentPrice: number): number {
  return calculateRiskCapital(legs, currentPrice);
}

/**
 * Calculate total P&L for a set of legs at a given underlying price and DTE.
 */
function calculatePnL(
  legs: StrategyLeg[],
  underlyingPrice: number,
  dte: number,
  maxDte: number,
): number {
  return calculateStrategyProfitLossAtDate(legs, underlyingPrice, {
    daysForward: Math.max(maxDte - dte, 0),
    riskFreeRate: DEFAULT_RISK_FREE_RATE,
  }).profitLoss;
}

/**
 * Map a value to an opaque background color.
 * Uses solid colors that go from muted to saturated for readability.
 * Green for profit, red for loss — always white text.
 */
function cellColor(value: number, maxAbsValue: number): string {
  if (maxAbsValue === 0 || value === 0) return "var(--color-muted)";
  const t = Math.min(Math.abs(value) / maxAbsValue, 1);

  if (value > 0) {
    // Interpolate from muted green to rich green
    // hsl(142, 45%, 82%) → hsl(142, 70%, 35%)
    const s = 45 + t * 25;
    const l = 82 - t * 47;
    return `hsl(142, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
  } else {
    // Interpolate from muted red to rich red
    // hsl(0, 45%, 85%) → hsl(0, 72%, 38%)
    const s = 45 + t * 27;
    const l = 85 - t * 47;
    return `hsl(0, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
  }
}

function textColor(value: number, maxAbsValue: number): string {
  if (maxAbsValue === 0 || value === 0) return "var(--color-foreground)";
  const t = Math.min(Math.abs(value) / maxAbsValue, 1);
  // White text once the background is dark enough (~40% threshold)
  return t > 0.25 ? "white" : "#1f2937";
}

function formatDollar(pnl: number): string {
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? "" : "-";
  if (abs >= 10000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  if (abs >= 100) return `${sign}$${Math.round(abs)}`;
  if (abs >= 1) return `${sign}$${abs.toFixed(0)}`;
  return "$0";
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  if (Math.abs(pct) >= 1000) return `${sign}${Math.round(pct)}%`;
  if (Math.abs(pct) >= 100) return `${sign}${Math.round(pct)}%`;
  if (Math.abs(pct) >= 10) return `${sign}${pct.toFixed(0)}%`;
  return `${sign}${pct.toFixed(1)}%`;
}

export function PnLHeatmap({ legs, currentPrice, daysToExpiry }: PnLHeatmapProps) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("$");

  const { dateColumns, priceRows, grid, costBasis, maxAbsDollar, maxAbsPct } = useMemo(() => {
    const dateCols = generateDateColumns(daysToExpiry);
    const prices = generatePriceRows(currentPrice);
    const basis = calculateCostBasis(legs, currentPrice);

    let maxDollar = 0;
    let maxPct = 0;
    const gridData: { pnl: number; pct: number }[][] = [];

    for (const price of prices) {
      const row: { pnl: number; pct: number }[] = [];
      for (const col of dateCols) {
        const pnl = calculatePnL(legs, price, col.dte, daysToExpiry);
        const pct = basis > 0 ? (pnl / basis) * 100 : 0;
        row.push({ pnl, pct });
        if (Math.abs(pnl) > maxDollar) maxDollar = Math.abs(pnl);
        if (Math.abs(pct) > maxPct) maxPct = Math.abs(pct);
      }
      gridData.push(row);
    }

    return {
      dateColumns: dateCols,
      priceRows: prices,
      grid: gridData,
      costBasis: basis,
      maxAbsDollar: maxDollar,
      maxAbsPct: maxPct,
    };
  }, [legs, currentPrice, daysToExpiry]);

  const maxAbs = displayMode === "$" ? maxAbsDollar : maxAbsPct;

  return (
    <div className="space-y-2">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          {displayMode === "%" && costBasis > 0
            ? `Return on $${costBasis.toLocaleString("en-US", { maximumFractionDigits: 0 })} risk`
            : "\u00A0"}
        </span>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          {(["$", "%"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`px-3.5 py-1.5 font-mono text-sm font-semibold transition-colors ${
                displayMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-card px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Price
              </th>
              {dateColumns.map((col, i) => (
                <th
                  key={i}
                  className="px-2 py-2 text-center text-xs font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {priceRows.map((price, rowIdx) => {
              const isNearCurrent = Math.abs(price - currentPrice) / currentPrice < 0.012;
              return (
                <tr key={rowIdx}>
                  <td
                    className={`sticky left-0 z-10 bg-card px-3 py-1.5 text-right font-medium whitespace-nowrap border-r border-border ${
                      isNearCurrent
                        ? "text-foreground font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    ${price.toFixed(2)}
                    {isNearCurrent && (
                      <span className="ml-1 text-xs text-primary font-semibold">&#9664;</span>
                    )}
                  </td>
                  {grid[rowIdx].map((cell, colIdx) => {
                    const value = displayMode === "$" ? cell.pnl : cell.pct;
                    return (
                      <td
                        key={colIdx}
                        className="px-1.5 py-1.5 text-center font-semibold tabular-nums"
                        style={{
                          backgroundColor: cellColor(value, maxAbs),
                          color: textColor(value, maxAbs),
                        }}
                      >
                        {displayMode === "$" ? formatDollar(cell.pnl) : formatPercent(cell.pct)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
