import { cumulativeNormalDistribution } from "./black-scholes";
import type { PayoffPoint } from "@/types/options";

/**
 * Calculate the probability that the stock price ends above a given level
 * at expiration, assuming a log-normal distribution.
 *
 * P(S_T > target) = N(d2)
 * where d2 = (ln(S/target) + (r - σ²/2) * T) / (σ * √T)
 */
function probabilityAbove(
  spotPrice: number,
  targetPrice: number,
  volatility: number,
  timeToExpiry: number,
  riskFreeRate: number,
): number {
  if (timeToExpiry <= 0) return spotPrice > targetPrice ? 1 : 0;
  if (targetPrice <= 0) return 1;
  if (volatility <= 0) {
    const forwardPrice = spotPrice * Math.exp(riskFreeRate * timeToExpiry);
    return forwardPrice > targetPrice ? 1 : 0;
  }

  const sqrtT = Math.sqrt(timeToExpiry);
  const d2 =
    (Math.log(spotPrice / targetPrice) +
      (riskFreeRate - 0.5 * volatility * volatility) * timeToExpiry) /
    (volatility * sqrtT);

  return cumulativeNormalDistribution(d2);
}

function profitAtSpot(
  payoffPoints: PayoffPoint[],
  spotPrice: number,
): number {
  return payoffPoints.reduce((best, point) =>
    Math.abs(point.underlyingPrice - spotPrice) < Math.abs(best.underlyingPrice - spotPrice)
      ? point
      : best
  ).profitLoss;
}

/**
 * Calculate the chance of profit for a strategy given its payoff curve
 * and break-even points.
 *
 * Strategy: scan the payoff curve to determine which regions are profitable,
 * then sum the probability of landing in each profitable zone.
 *
 * This handles arbitrary multi-leg strategies:
 * - Single break-even, profit above (e.g., long call)
 * - Single break-even, profit below (e.g., long put)
 * - Two break-evens, profit between (e.g., short straddle)
 * - Two break-evens, profit outside (e.g., long straddle)
 * - More complex shapes (butterflies, etc.)
 */
export function calculateChanceOfProfit(
  payoffPoints: PayoffPoint[],
  breakEvenPoints: number[],
  spotPrice: number,
  volatility: number,
  timeToExpiry: number,
  riskFreeRate: number,
): number {
  if (payoffPoints.length === 0) return 0;
  if (timeToExpiry <= 0) return profitAtSpot(payoffPoints, spotPrice) > 0 ? 1 : 0;

  // No break-even points: either always profitable or always losing
  if (breakEvenPoints.length === 0) {
    return payoffPoints[0].profitLoss > 0 ? 1 : 0;
  }

  const sortedBE = [...breakEvenPoints].sort((a, b) => a - b);

  // Build zones: regions between break-evens (and extending to 0 / infinity)
  // Check if each zone is profitable by sampling the midpoint of the payoff curve
  const boundaries = [0, ...sortedBE, Infinity];
  let totalProbability = 0;

  for (let i = 0; i < boundaries.length - 1; i++) {
    const low = boundaries[i];
    const high = boundaries[i + 1];

    // Sample the midpoint to determine if this zone is profitable
    const samplePrice = high === Infinity
      ? sortedBE[sortedBE.length - 1] * 1.1 // Above highest break-even
      : low === 0
        ? sortedBE[0] * 0.9 // Below lowest break-even
        : (low + high) / 2; // Between two break-evens

    // Find the closest payoff point to our sample price
    const closestPoint = payoffPoints.reduce((best, p) =>
      Math.abs(p.underlyingPrice - samplePrice) < Math.abs(best.underlyingPrice - samplePrice) ? p : best
    );

    if (closestPoint.profitLoss > 0) {
      // This zone is profitable — calculate probability of landing here
      const pAbove = high === Infinity
        ? probabilityAbove(spotPrice, low, volatility, timeToExpiry, riskFreeRate)
        : probabilityAbove(spotPrice, low, volatility, timeToExpiry, riskFreeRate) -
          probabilityAbove(spotPrice, high, volatility, timeToExpiry, riskFreeRate);

      totalProbability += Math.max(0, pAbove);
    }
  }

  return Math.min(1, Math.max(0, totalProbability));
}
