import type { OptionLeg, PayoffPoint, StrategyLeg } from "@/types/options";
import { isOptionLeg } from "@/types/options";
import { blackScholesPrice } from "./black-scholes";
import {
  PAYOFF_PRICE_POINTS,
  PAYOFF_RANGE_LOW_PCT,
  PAYOFF_RANGE_HIGH_PCT,
  DEFAULT_RISK_FREE_RATE,
} from "@/lib/utils/constants";

/**
 * Calculate P&L for a single option leg at expiration.
 */
function optionLegPayoffAtExpiry(leg: OptionLeg, underlyingPrice: number): number {
  const multiplier = leg.positionType === "long" ? 1 : -1;
  let intrinsicValue: number;

  if (leg.optionType === "call") {
    intrinsicValue = Math.max(underlyingPrice - leg.strikePrice, 0);
  } else {
    intrinsicValue = Math.max(leg.strikePrice - underlyingPrice, 0);
  }

  // P&L = (intrinsic value - premium paid) * quantity * multiplier
  // For long: pay premium, receive intrinsic
  // For short: receive premium, pay intrinsic
  return (intrinsicValue * multiplier - leg.premium * multiplier) * leg.quantity * 100;
}

/**
 * Calculate P&L for a single option leg at a future date (before expiry) using Black-Scholes.
 */
function optionLegPayoffAtDate(
  leg: OptionLeg,
  underlyingPrice: number,
  timeToExpiry: number,
  riskFreeRate: number
): number {
  const multiplier = leg.positionType === "long" ? 1 : -1;

  const theoreticalPrice = blackScholesPrice({
    spotPrice: underlyingPrice,
    strikePrice: leg.strikePrice,
    timeToExpiry,
    riskFreeRate,
    volatility: leg.impliedVolatility,
    optionType: leg.optionType,
  });

  return (theoreticalPrice - leg.premium) * multiplier * leg.quantity * 100;
}

/**
 * Calculate P&L for a stock leg.
 */
function stockLegPayoff(
  leg: { positionType: "long" | "short"; quantity: number; entryPrice: number },
  underlyingPrice: number
): number {
  const multiplier = leg.positionType === "long" ? 1 : -1;
  return (underlyingPrice - leg.entryPrice) * multiplier * leg.quantity;
}

/**
 * Generate payoff diagram data for a strategy at expiration.
 */
export function generatePayoffAtExpiry(
  legs: StrategyLeg[],
  currentPrice: number
): PayoffPoint[] {
  const lowPrice = currentPrice * PAYOFF_RANGE_LOW_PCT;
  const highPrice = currentPrice * PAYOFF_RANGE_HIGH_PCT;
  const step = (highPrice - lowPrice) / PAYOFF_PRICE_POINTS;

  const points: PayoffPoint[] = [];

  for (let i = 0; i <= PAYOFF_PRICE_POINTS; i++) {
    const price = lowPrice + step * i;
    const legProfitLoss: number[] = [];
    let totalPL = 0;

    for (const leg of legs) {
      let legPL: number;
      if (isOptionLeg(leg)) {
        legPL = optionLegPayoffAtExpiry(leg, price);
      } else {
        legPL = stockLegPayoff(leg, price);
      }
      legProfitLoss.push(legPL);
      totalPL += legPL;
    }

    points.push({
      underlyingPrice: Math.round(price * 100) / 100,
      profitLoss: Math.round(totalPL * 100) / 100,
      legProfitLoss,
    });
  }

  return points;
}

/**
 * Generate payoff diagram data for a strategy at a specific future date.
 */
export function generatePayoffAtDate(
  legs: StrategyLeg[],
  currentPrice: number,
  timeToExpiry: number,
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): PayoffPoint[] {
  const lowPrice = currentPrice * PAYOFF_RANGE_LOW_PCT;
  const highPrice = currentPrice * PAYOFF_RANGE_HIGH_PCT;
  const step = (highPrice - lowPrice) / PAYOFF_PRICE_POINTS;

  const points: PayoffPoint[] = [];

  for (let i = 0; i <= PAYOFF_PRICE_POINTS; i++) {
    const price = lowPrice + step * i;
    const legProfitLoss: number[] = [];
    let totalPL = 0;

    for (const leg of legs) {
      let legPL: number;
      if (isOptionLeg(leg)) {
        legPL = optionLegPayoffAtDate(leg, price, timeToExpiry, riskFreeRate);
      } else {
        legPL = stockLegPayoff(leg, price);
      }
      legProfitLoss.push(legPL);
      totalPL += legPL;
    }

    points.push({
      underlyingPrice: Math.round(price * 100) / 100,
      profitLoss: Math.round(totalPL * 100) / 100,
      legProfitLoss,
    });
  }

  return points;
}

/**
 * Find break-even points from payoff data.
 */
export function findBreakEvenPoints(payoffPoints: PayoffPoint[]): number[] {
  const breakEvens: number[] = [];

  for (let i = 1; i < payoffPoints.length; i++) {
    const prev = payoffPoints[i - 1];
    const curr = payoffPoints[i];

    if (
      (prev.profitLoss <= 0 && curr.profitLoss > 0) ||
      (prev.profitLoss >= 0 && curr.profitLoss < 0)
    ) {
      // Linear interpolation
      const ratio = Math.abs(prev.profitLoss) / (Math.abs(prev.profitLoss) + Math.abs(curr.profitLoss));
      const breakEvenPrice = prev.underlyingPrice + ratio * (curr.underlyingPrice - prev.underlyingPrice);
      breakEvens.push(Math.round(breakEvenPrice * 100) / 100);
    }
  }

  return breakEvens;
}

/**
 * Calculate max profit and max loss from payoff data.
 */
export function calculateMaxProfitLoss(payoffPoints: PayoffPoint[]): {
  maxProfit: number;
  maxLoss: number;
  maxProfitPrice: number;
  maxLossPrice: number;
  isUnlimitedProfit: boolean;
  isUnlimitedLoss: boolean;
} {
  let maxProfit = -Infinity;
  let maxLoss = Infinity;
  let maxProfitPrice = 0;
  let maxLossPrice = 0;

  for (const point of payoffPoints) {
    if (point.profitLoss > maxProfit) {
      maxProfit = point.profitLoss;
      maxProfitPrice = point.underlyingPrice;
    }
    if (point.profitLoss < maxLoss) {
      maxLoss = point.profitLoss;
      maxLossPrice = point.underlyingPrice;
    }
  }

  // Detect unbounded profit/loss: if P&L is still increasing (or decreasing)
  // at the edges of the simulated range, the position is theoretically unlimited.
  const n = payoffPoints.length;
  const isUnlimitedProfit =
    n >= 3 &&
    (
      // Profit still increasing at upper end (e.g., long call, short put)
      (payoffPoints[n - 1].profitLoss > payoffPoints[n - 2].profitLoss &&
       payoffPoints[n - 2].profitLoss > payoffPoints[n - 3].profitLoss &&
       payoffPoints[n - 1].profitLoss > 0) ||
      // Profit still increasing at lower end (e.g., long put with no floor in sim)
      (payoffPoints[0].profitLoss > payoffPoints[1].profitLoss &&
       payoffPoints[1].profitLoss > payoffPoints[2].profitLoss &&
       payoffPoints[0].profitLoss > 0)
    );

  const isUnlimitedLoss =
    n >= 3 &&
    (
      // Loss still deepening at upper end (e.g., naked short call)
      (payoffPoints[n - 1].profitLoss < payoffPoints[n - 2].profitLoss &&
       payoffPoints[n - 2].profitLoss < payoffPoints[n - 3].profitLoss &&
       payoffPoints[n - 1].profitLoss < 0) ||
      // Loss still deepening at lower end (e.g., naked short put)
      (payoffPoints[0].profitLoss < payoffPoints[1].profitLoss &&
       payoffPoints[1].profitLoss < payoffPoints[2].profitLoss &&
       payoffPoints[0].profitLoss < 0)
    );

  return { maxProfit, maxLoss, maxProfitPrice, maxLossPrice, isUnlimitedProfit, isUnlimitedLoss };
}
