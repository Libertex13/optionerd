import { blackScholesPrice } from "./black-scholes";
import {
  DEFAULT_RISK_FREE_RATE,
} from "@/lib/utils/constants";
import type { OptionLeg, StockLeg } from "@/types/options";
import {
  calculateOptionLegProfitLossAtDate,
  calculateOptionLegProfitLossAtExpiry,
  calculateTimeToExpiryYears,
  calculateStockLegProfitLoss,
} from "./payoff";

export interface ExpiryInfo {
  expirationDate: string;
  daysToExpiry: number;
}

export interface MixedExpiryLegOutcome {
  label: string;
  status: string;
  realizedPnl: number;
}

export interface MixedExpiryStep {
  expirationDate: string;
  daysToExpiry: number;
  targetPrice: number;
  expiringLegs: MixedExpiryLegOutcome[];
  expiringPnl: number;
  remainingLabel: string;
  remainingMark: number;
  remainingUnrealizedPnl: number;
  totalIfClosed: number;
  isFinal: boolean;
}

function legLabel(leg: OptionLeg): string {
  return `${leg.positionType === "long" ? "BUY" : "SELL"} ${leg.quantity}x ${leg.optionType.toUpperCase()} ${leg.strikePrice.toFixed(0)}`;
}

function remainingLabel(
  optionLegs: OptionLeg[],
  stockLeg: StockLeg | null,
): string {
  const labels = optionLegs.map((leg) => legLabel(leg));
  if (stockLeg) {
    labels.push(`${stockLeg.positionType === "long" ? "LONG" : "SHORT"} ${stockLeg.quantity} SH`);
  }
  return labels.length > 0 ? labels.join(" · ") : "No remaining legs";
}

function remainingMarkAtDate(
  optionLegs: OptionLeg[],
  stockLeg: StockLeg | null,
  targetPrice: number,
  daysForward: number,
  now: Date,
  riskFreeRate: number,
): { mark: number; pnl: number } {
  const optionValues = optionLegs.reduce((sum, leg) => {
    const sign = leg.positionType === "long" ? 1 : -1;
    const timeToExpiry = calculateTimeToExpiryYears(leg.expirationDate, daysForward, now);
    if (timeToExpiry <= 0) return sum;
    const value = blackScholesPrice({
      spotPrice: targetPrice,
      strikePrice: leg.strikePrice,
      timeToExpiry,
      riskFreeRate,
      volatility: leg.impliedVolatility,
      optionType: leg.optionType,
    });
    return {
      mark: sum.mark + value * sign * leg.quantity * 100,
      pnl: sum.pnl + calculateOptionLegProfitLossAtDate(leg, targetPrice, {
        daysForward,
        riskFreeRate,
        now,
      }),
    };
  }, { mark: 0, pnl: 0 });

  if (!stockLeg) return optionValues;

  const sign = stockLeg.positionType === "long" ? 1 : -1;
  return {
    mark: optionValues.mark + targetPrice * sign * stockLeg.quantity,
    pnl: optionValues.pnl + calculateStockLegProfitLoss(stockLeg, targetPrice),
  };
}

function realizedStatus(leg: OptionLeg, targetPrice: number): string {
  const intrinsic = leg.optionType === "call"
    ? Math.max(targetPrice - leg.strikePrice, 0)
    : Math.max(leg.strikePrice - targetPrice, 0);
  if (intrinsic === 0) {
    return leg.positionType === "short"
      ? "Expired worthless, kept premium"
      : "Expired worthless";
  }
  return leg.positionType === "short" ? "ITM at expiry" : "Intrinsic realized";
}

export function defaultMixedExpiryTargets(
  optionLegs: OptionLeg[],
  expiryInfo: ExpiryInfo[],
  currentPrice: number,
): Record<string, number> {
  const targets: Record<string, number> = {};
  const sorted = [...expiryInfo].sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  sorted.forEach((step, index) => {
    if (index > 0) {
      targets[step.expirationDate] = targets[sorted[index - 1].expirationDate] ?? currentPrice;
      return;
    }

    const sameExpiry = optionLegs.filter((leg) => leg.expirationDate === step.expirationDate);
    const shortLeg = sameExpiry.find((leg) => leg.positionType === "short");
    if (shortLeg) {
      targets[step.expirationDate] = shortLeg.strikePrice;
      return;
    }
    if (sameExpiry.length > 0) {
      targets[step.expirationDate] =
        sameExpiry.reduce((sum, leg) => sum + leg.strikePrice, 0) / sameExpiry.length;
      return;
    }
    targets[step.expirationDate] = currentPrice;
  });

  return targets;
}

export function buildMixedExpiryScenarioSteps(
  optionLegs: OptionLeg[],
  stockLeg: StockLeg | null,
  expiryInfo: ExpiryInfo[],
  targets: Record<string, number>,
  now: Date = new Date(),
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE,
): MixedExpiryStep[] {
  const sorted = [...expiryInfo].sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  let realizedPnl = 0;

  return sorted.map((step, index) => {
    const targetPrice = targets[step.expirationDate];
    const expiring = optionLegs.filter((leg) => leg.expirationDate === step.expirationDate);
    const future = optionLegs.filter((leg) => leg.expirationDate > step.expirationDate);
    const expiringLegs = expiring.map((leg) => ({
      label: legLabel(leg),
      status: realizedStatus(leg, targetPrice),
      realizedPnl: calculateOptionLegProfitLossAtExpiry(leg, targetPrice),
    }));
    const expiringPnl = expiringLegs.reduce((sum, leg) => sum + leg.realizedPnl, 0);
    realizedPnl += expiringPnl;

    const remaining = remainingMarkAtDate(
      future,
      stockLeg,
      targetPrice,
      step.daysToExpiry,
      now,
      riskFreeRate,
    );

    return {
      expirationDate: step.expirationDate,
      daysToExpiry: step.daysToExpiry,
      targetPrice,
      expiringLegs,
      expiringPnl,
      remainingLabel: remainingLabel(future, stockLeg),
      remainingMark: remaining.mark,
      remainingUnrealizedPnl: remaining.pnl,
      totalIfClosed: realizedPnl + remaining.pnl,
      isFinal: index === sorted.length - 1,
    };
  });
}
