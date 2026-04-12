import type { OptionPricingInput, PricingResult } from "@/types/options";
import { calculateGreeks } from "./greeks";

/**
 * Cumulative standard normal distribution using the rational approximation
 * from Abramowitz & Stegun (formula 26.2.17). Accuracy: |error| < 7.5e-8.
 */
export function cumulativeNormalDistribution(x: number): number {
  if (x < -10) return 0;
  if (x > 10) return 1;

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;

  const y =
    1.0 -
    (a1 * t + a2 * t2 + a3 * t3 + a4 * t4 + a5 * t5) *
      Math.exp(-0.5 * absX * absX);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Standard normal probability density function.
 */
export function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2.0 * Math.PI);
}

/**
 * Calculate d1 and d2 for Black-Scholes.
 */
export function calculateD1D2(
  spotPrice: number,
  strikePrice: number,
  timeToExpiry: number,
  riskFreeRate: number,
  volatility: number
): { d1: number; d2: number } {
  const sqrtT = Math.sqrt(timeToExpiry);
  const d1 =
    (Math.log(spotPrice / strikePrice) +
      (riskFreeRate + 0.5 * volatility * volatility) * timeToExpiry) /
    (volatility * sqrtT);
  const d2 = d1 - volatility * sqrtT;
  return { d1, d2 };
}

/**
 * Black-Scholes option pricing for European options.
 */
export function blackScholesPrice(input: OptionPricingInput): number {
  const { spotPrice, strikePrice, timeToExpiry, riskFreeRate, volatility, optionType } = input;

  if (timeToExpiry <= 0) {
    // At expiration — intrinsic value
    if (optionType === "call") {
      return Math.max(spotPrice - strikePrice, 0);
    }
    return Math.max(strikePrice - spotPrice, 0);
  }

  const { d1, d2 } = calculateD1D2(spotPrice, strikePrice, timeToExpiry, riskFreeRate, volatility);
  const discountFactor = Math.exp(-riskFreeRate * timeToExpiry);

  if (optionType === "call") {
    return (
      spotPrice * cumulativeNormalDistribution(d1) -
      strikePrice * discountFactor * cumulativeNormalDistribution(d2)
    );
  }

  // Put
  return (
    strikePrice * discountFactor * cumulativeNormalDistribution(-d2) -
    spotPrice * cumulativeNormalDistribution(-d1)
  );
}

/**
 * Full pricing result including price and all Greeks.
 */
export function priceOption(input: OptionPricingInput): PricingResult {
  const price = blackScholesPrice(input);
  const greeks = calculateGreeks(input);
  return { price, greeks };
}
