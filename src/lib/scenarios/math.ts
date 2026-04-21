import type {
  ScenarioCandle,
  ScenarioConfig,
  ScenarioLeg,
  ScenarioLegPrice,
} from "./types";

export function sideSign(side: "long" | "short"): 1 | -1 {
  return side === "long" ? 1 : -1;
}

export function priceAtOrBefore(
  prices: ScenarioLegPrice[],
  date: string,
): number | null {
  let last: number | null = null;
  for (const p of prices) {
    if (p.date <= date) last = p.close;
    else break;
  }
  return last;
}

export function candleAtOrBefore(
  candles: ScenarioCandle[],
  date: string,
): ScenarioCandle | null {
  let last: ScenarioCandle | null = null;
  for (const c of candles) {
    if (c.date <= date) last = c;
    else break;
  }
  return last;
}

/** Position value = Σ sign·qty·close·100. Positive for a long debit position. */
export function positionValueAt(
  legs: ScenarioLeg[],
  legPrices: ScenarioLegPrice[][],
  date: string,
): number | null {
  let total = 0;
  for (let i = 0; i < legs.length; i++) {
    const px = priceAtOrBefore(legPrices[i]!, date);
    if (px == null) return null;
    total += sideSign(legs[i]!.side) * (legs[i]!.qty ?? 1) * px * 100;
  }
  return total;
}

export function legEntryPrices(
  legs: ScenarioLeg[],
  legPrices: ScenarioLegPrice[][],
): (number | null)[] {
  const all = new Set<string>();
  for (const arr of legPrices) for (const p of arr) all.add(p.date);
  const dates = Array.from(all).sort();
  for (const d of dates) {
    const prices = legs.map((_, i) => priceAtOrBefore(legPrices[i]!, d));
    if (prices.every((p): p is number => p != null)) return prices;
  }
  return legs.map(() => null);
}

export function entryValue(
  legs: ScenarioLeg[],
  legPrices: ScenarioLegPrice[][],
): number | null {
  const entries = legEntryPrices(legs, legPrices);
  if (entries.some((p) => p == null)) return null;
  let v = 0;
  for (let i = 0; i < legs.length; i++) {
    v +=
      sideSign(legs[i]!.side) *
      (legs[i]!.qty ?? 1) *
      (entries[i] as number) *
      100;
  }
  return v;
}

export function intrinsicValue(leg: ScenarioLeg, spot: number): number {
  return leg.type === "call"
    ? Math.max(0, spot - leg.strike)
    : Math.max(0, leg.strike - spot);
}

/**
 * Vertical debit spread break-even.
 *   Long call at K:  BE = K + debit_per_share   (bull call spread)
 *   Long put  at K:  BE = K − debit_per_share   (bear put spread)
 */
export function verticalDebitBreakEven(
  config: ScenarioConfig,
  legPrices: ScenarioLegPrice[][],
): number | null {
  const longLeg = config.legs.find((l) => l.side === "long");
  if (!longLeg) return null;
  const entries = legEntryPrices(config.legs, legPrices);
  let debitPerShare = 0;
  for (let i = 0; i < config.legs.length; i++) {
    const px = entries[i];
    if (px == null) return null;
    debitPerShare +=
      sideSign(config.legs[i]!.side) * (config.legs[i]!.qty ?? 1) * px;
  }
  const debit = debitPerShare / (longLeg.qty ?? 1);
  return longLeg.type === "call"
    ? longLeg.strike + debit
    : longLeg.strike - debit;
}

export type LegSnapshot = {
  leg: ScenarioLeg;
  label: string;
  entry: number;
  mark: number;
  intrinsic: number;
  extrinsic: number;
  pl: number;
};

export type MomentSnapshot = {
  date: string;
  underlying: ScenarioCandle | null;
  legs: LegSnapshot[];
  positionValue: number | null;
  entryValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
  dte: number;
  daysFromEntry: number;
  distToBE: number | null;
  costBasis: number | null;
};

export function computeSnapshot(
  config: ScenarioConfig,
  underlying: ScenarioCandle[],
  legPrices: ScenarioLegPrice[][],
  date: string,
  breakEven: number | null,
): MomentSnapshot {
  const candle = candleAtOrBefore(underlying, date);
  const entries = legEntryPrices(config.legs, legPrices);
  const entryV = entryValue(config.legs, legPrices);

  const legs: LegSnapshot[] = config.legs.map((leg, i) => {
    const entry = entries[i] ?? 0;
    const mark = priceAtOrBefore(legPrices[i]!, date) ?? entry;
    const intr = candle ? intrinsicValue(leg, candle.close) : 0;
    const ext = Math.max(0, mark - intr);
    const pl =
      sideSign(leg.side) * (leg.qty ?? 1) * (mark - entry) * 100;
    const label = `${leg.strike}${leg.type === "call" ? "C" : "P"}`;
    return { leg, label, entry, mark, intrinsic: intr, extrinsic: ext, pl };
  });

  const posVal = positionValueAt(config.legs, legPrices, date);
  const pnl = posVal != null && entryV != null ? posVal - entryV : null;
  const pnlPct =
    pnl != null && entryV != null && entryV !== 0
      ? (pnl / Math.abs(entryV)) * 100
      : null;

  const entryDate = config.decisions[0]?.date ?? config.from;
  const msDay = 86400000;
  const dte = Math.max(
    0,
    Math.round(
      (new Date(config.legs[0]!.expiry + "T00:00:00Z").getTime() -
        new Date(date + "T00:00:00Z").getTime()) /
        msDay,
    ),
  );
  const daysFromEntry = Math.max(
    0,
    Math.round(
      (new Date(date + "T00:00:00Z").getTime() -
        new Date(entryDate + "T00:00:00Z").getTime()) /
        msDay,
    ),
  );
  const distToBE =
    candle && breakEven != null ? candle.close - breakEven : null;

  return {
    date,
    underlying: candle,
    legs,
    positionValue: posVal,
    entryValue: entryV,
    pnl,
    pnlPct,
    dte,
    daysFromEntry,
    distToBE,
    costBasis: entryV,
  };
}

export function fmtMoney(n: number, decimals = 0): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const formatted = decimals === 0
    ? Math.round(abs).toLocaleString("en-US")
    : abs.toFixed(decimals);
  return `${sign}$${formatted}`;
}

export function fmtPL(n: number, decimals = 0): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const formatted = decimals === 0
    ? Math.round(abs).toLocaleString("en-US")
    : abs.toFixed(decimals);
  return `${sign}$${formatted}`;
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
