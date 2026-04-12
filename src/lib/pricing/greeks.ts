import type { Greeks, OptionPricingInput } from "@/types/options";
import {
  calculateD1D2,
  cumulativeNormalDistribution,
  normalPDF,
} from "./black-scholes";
import { CALENDAR_DAYS_PER_YEAR } from "@/lib/utils/constants";

/**
 * Calculate all five Greeks for an option.
 * - theta: expressed as daily decay (per calendar day)
 * - vega: expressed per 1% IV change (i.e., per 0.01 absolute change)
 */
export function calculateGreeks(input: OptionPricingInput): Greeks {
  const { spotPrice, strikePrice, timeToExpiry, riskFreeRate, volatility, optionType } = input;

  if (timeToExpiry <= 0) {
    // At expiration, Greeks are essentially zero (or undefined)
    const intrinsicCall = spotPrice > strikePrice;
    const intrinsicPut = spotPrice < strikePrice;
    return {
      delta: optionType === "call" ? (intrinsicCall ? 1 : 0) : (intrinsicPut ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    };
  }

  const { d1, d2 } = calculateD1D2(spotPrice, strikePrice, timeToExpiry, riskFreeRate, volatility);
  const sqrtT = Math.sqrt(timeToExpiry);
  const discountFactor = Math.exp(-riskFreeRate * timeToExpiry);
  const nd1PDF = normalPDF(d1);

  // Gamma is the same for calls and puts
  const gamma = nd1PDF / (spotPrice * volatility * sqrtT);

  // Vega is the same for calls and puts (per 1% change = divide by 100)
  const vegaRaw = spotPrice * nd1PDF * sqrtT;
  const vega = vegaRaw / 100;

  if (optionType === "call") {
    const delta = cumulativeNormalDistribution(d1);

    // Theta: annualized, then convert to daily
    const thetaAnnual =
      -(spotPrice * nd1PDF * volatility) / (2 * sqrtT) -
      riskFreeRate * strikePrice * discountFactor * cumulativeNormalDistribution(d2);
    const theta = thetaAnnual / CALENDAR_DAYS_PER_YEAR;

    const rho =
      (strikePrice * timeToExpiry * discountFactor * cumulativeNormalDistribution(d2)) / 100;

    return { delta, gamma, theta, vega, rho };
  }

  // Put
  const delta = cumulativeNormalDistribution(d1) - 1;

  const thetaAnnual =
    -(spotPrice * nd1PDF * volatility) / (2 * sqrtT) +
    riskFreeRate * strikePrice * discountFactor * cumulativeNormalDistribution(-d2);
  const theta = thetaAnnual / CALENDAR_DAYS_PER_YEAR;

  const rho =
    -(strikePrice * timeToExpiry * discountFactor * cumulativeNormalDistribution(-d2)) / 100;

  return { delta, gamma, theta, vega, rho };
}
