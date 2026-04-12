import type { OptionType } from "@/types/options";
import { blackScholesPrice } from "./black-scholes";
import { calculateGreeks } from "./greeks";
import {
  IV_CONVERGENCE_THRESHOLD,
  IV_INITIAL_GUESS,
  IV_MAX_ITERATIONS,
} from "@/lib/utils/constants";

interface ImpliedVolInput {
  marketPrice: number;
  spotPrice: number;
  strikePrice: number;
  timeToExpiry: number;
  riskFreeRate: number;
  optionType: OptionType;
}

/**
 * Solve for implied volatility using Newton-Raphson with bisection fallback.
 * Returns the IV as a decimal (e.g., 0.25 for 25%).
 * Returns null if no solution is found.
 */
export function solveImpliedVolatility(input: ImpliedVolInput): number | null {
  const { marketPrice, spotPrice, strikePrice, timeToExpiry, riskFreeRate, optionType } = input;

  // Sanity checks
  if (marketPrice <= 0 || timeToExpiry <= 0) return null;

  // Check intrinsic value bounds
  const intrinsic =
    optionType === "call"
      ? Math.max(spotPrice - strikePrice * Math.exp(-riskFreeRate * timeToExpiry), 0)
      : Math.max(strikePrice * Math.exp(-riskFreeRate * timeToExpiry) - spotPrice, 0);

  if (marketPrice < intrinsic - 0.01) return null;

  // Try Newton-Raphson first
  const newtonResult = newtonRaphson(input);
  if (newtonResult !== null) return newtonResult;

  // Fallback to bisection
  return bisection(input);
}

function newtonRaphson(input: ImpliedVolInput): number | null {
  const { marketPrice, spotPrice, strikePrice, timeToExpiry, riskFreeRate, optionType } = input;

  let sigma = IV_INITIAL_GUESS;

  for (let i = 0; i < IV_MAX_ITERATIONS; i++) {
    const pricingInput = {
      spotPrice,
      strikePrice,
      timeToExpiry,
      riskFreeRate,
      volatility: sigma,
      optionType,
    };

    const theoreticalPrice = blackScholesPrice(pricingInput);
    const diff = theoreticalPrice - marketPrice;

    if (Math.abs(diff) < IV_CONVERGENCE_THRESHOLD) {
      return sigma;
    }

    // Vega for Newton-Raphson (raw vega, not per-1%)
    const greeks = calculateGreeks(pricingInput);
    const vegaRaw = greeks.vega * 100; // convert back to raw

    if (Math.abs(vegaRaw) < 1e-10) {
      // Vega too small — Newton-Raphson won't converge
      return null;
    }

    sigma = sigma - diff / vegaRaw;

    // Keep sigma in reasonable bounds
    if (sigma <= 0.001) sigma = 0.001;
    if (sigma > 10) sigma = 10;
  }

  return null;
}

function bisection(input: ImpliedVolInput): number | null {
  const { marketPrice, spotPrice, strikePrice, timeToExpiry, riskFreeRate, optionType } = input;

  let low = 0.001;
  let high = 5.0;

  const priceAt = (sigma: number) =>
    blackScholesPrice({
      spotPrice,
      strikePrice,
      timeToExpiry,
      riskFreeRate,
      volatility: sigma,
      optionType,
    });

  // Verify the solution is bracketed
  const priceLow = priceAt(low);
  const priceHigh = priceAt(high);

  if (marketPrice < priceLow || marketPrice > priceHigh) {
    return null;
  }

  for (let i = 0; i < IV_MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const priceMid = priceAt(mid);
    const diff = priceMid - marketPrice;

    if (Math.abs(diff) < IV_CONVERGENCE_THRESHOLD) {
      return mid;
    }

    if (diff > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  // Return best guess
  return (low + high) / 2;
}
