"use client";

import { useMemo } from "react";
import type { StrategyLeg } from "@/types/options";
import { isOptionLeg } from "@/types/options";
import { blackScholesPrice } from "@/lib/pricing/black-scholes";
import { DEFAULT_RISK_FREE_RATE, CALENDAR_DAYS_PER_YEAR } from "@/lib/utils/constants";

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
 * Returns array of { label, dte } where dte = days to expiry at that column.
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
 * Calculate total P&L for a set of legs at a given underlying price and DTE.
 */
function calculatePnL(legs: StrategyLeg[], underlyingPrice: number, dte: number): number {
  let totalPnl = 0;

  for (const leg of legs) {
    if (isOptionLeg(leg)) {
      const multiplier = leg.positionType === "long" ? 1 : -1;

      if (dte <= 0) {
        // At expiration — intrinsic value
        const intrinsic = leg.optionType === "call"
          ? Math.max(underlyingPrice - leg.strikePrice, 0)
          : Math.max(leg.strikePrice - underlyingPrice, 0);
        totalPnl += (intrinsic * multiplier - leg.premium * multiplier) * leg.quantity * 100;
      } else {
        // Before expiration — Black-Scholes theoretical value
        const timeToExpiry = dte / CALENDAR_DAYS_PER_YEAR;
        const theoreticalPrice = blackScholesPrice({
          spotPrice: underlyingPrice,
          strikePrice: leg.strikePrice,
          timeToExpiry,
          riskFreeRate: DEFAULT_RISK_FREE_RATE,
          volatility: leg.impliedVolatility,
          optionType: leg.optionType,
        });
        totalPnl += (theoreticalPrice - leg.premium) * multiplier * leg.quantity * 100;
      }
    } else {
      // Stock leg
      const multiplier = leg.positionType === "long" ? 1 : -1;
      totalPnl += (underlyingPrice - leg.entryPrice) * multiplier * leg.quantity;
    }
  }

  return Math.round(totalPnl * 100) / 100;
}

/**
 * Map a P&L value to a background color.
 * Green for profit, red for loss, with intensity based on magnitude.
 */
function pnlColor(pnl: number, maxAbsPnl: number): string {
  if (maxAbsPnl === 0) return "transparent";
  const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);

  if (pnl > 0) {
    const alpha = 0.08 + intensity * 0.72;
    return `rgba(34, 197, 94, ${alpha.toFixed(3)})`;
  } else if (pnl < 0) {
    const alpha = 0.08 + intensity * 0.72;
    return `rgba(239, 68, 68, ${alpha.toFixed(3)})`;
  }
  return "transparent";
}

/** Pick text color for readability on the colored background */
function textColor(pnl: number, maxAbsPnl: number): string {
  if (maxAbsPnl === 0) return "var(--color-foreground)";
  const intensity = Math.min(Math.abs(pnl) / maxAbsPnl, 1);
  return intensity > 0.5 ? "white" : "var(--color-foreground)";
}

/** Format P&L for cell display — compact for small cells */
function formatPnl(pnl: number): string {
  const abs = Math.abs(pnl);
  const sign = pnl >= 0 ? "" : "-";
  if (abs >= 10000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  if (abs >= 100) return `${sign}$${Math.round(abs)}`;
  if (abs >= 1) return `${sign}$${abs.toFixed(0)}`;
  return "$0";
}

export function PnLHeatmap({ legs, currentPrice, daysToExpiry }: PnLHeatmapProps) {
  const { dateColumns, priceRows, grid, maxAbsPnl } = useMemo(() => {
    const dateCols = generateDateColumns(daysToExpiry);
    const prices = generatePriceRows(currentPrice);

    let maxAbs = 0;
    const gridData: number[][] = [];

    for (const price of prices) {
      const row: number[] = [];
      for (const col of dateCols) {
        const pnl = calculatePnL(legs, price, col.dte);
        row.push(pnl);
        if (Math.abs(pnl) > maxAbs) maxAbs = Math.abs(pnl);
      }
      gridData.push(row);
    }

    return {
      dateColumns: dateCols,
      priceRows: prices,
      grid: gridData,
      maxAbsPnl: maxAbs,
    };
  }, [legs, currentPrice, daysToExpiry]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card px-2 py-1.5 text-right text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              Price
            </th>
            {dateColumns.map((col, i) => (
              <th
                key={i}
                className="px-1.5 py-1.5 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-widest whitespace-nowrap"
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
                  className={`sticky left-0 z-10 bg-card px-2 py-1 text-right font-medium whitespace-nowrap border-r border-border ${
                    isNearCurrent
                      ? "text-foreground font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  ${price.toFixed(2)}
                  {isNearCurrent && (
                    <span className="ml-1 text-[9px] text-primary font-semibold">&#9664;</span>
                  )}
                </td>
                {grid[rowIdx].map((pnl, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-1 py-1 text-center font-medium tabular-nums"
                    style={{
                      backgroundColor: pnlColor(pnl, maxAbsPnl),
                      color: textColor(pnl, maxAbsPnl),
                    }}
                  >
                    {formatPnl(pnl)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
