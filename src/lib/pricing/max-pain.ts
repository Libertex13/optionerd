import type { OptionContract } from "@/types/market";

export interface MaxPainStrike {
  strike: number;
  callPain: number;
  putPain: number;
  totalPain: number;
}

export interface MaxPainResult {
  maxPainStrike: number;
  totalPainAtMaxPain: number;
  painByStrike: MaxPainStrike[];
}

/**
 * Calculate the max pain strike price for a given expiration.
 *
 * Max pain is the strike where the total dollar value of all expiring
 * options causes the greatest loss to option holders (and least payout
 * by option writers). It's the price at which the most options expire
 * worthless.
 *
 * For each candidate strike S:
 *   - Each call with strike K and OI: if S > K → holders profit (S-K)*OI*100
 *   - Each put with strike K and OI: if S < K → holders profit (K-S)*OI*100
 *   - Total pain at S = sum of all option holder payouts
 * Max pain = strike with the MINIMUM total payout to holders.
 */
export function calculateMaxPain(
  calls: OptionContract[],
  puts: OptionContract[],
): MaxPainResult | null {
  // Collect all unique strikes
  const strikeSet = new Set<number>();
  for (const c of calls) {
    if (c.openInterest > 0) strikeSet.add(c.strikePrice);
  }
  for (const p of puts) {
    if (p.openInterest > 0) strikeSet.add(p.strikePrice);
  }

  if (strikeSet.size === 0) return null;

  const strikes = Array.from(strikeSet).sort((a, b) => a - b);

  const painByStrike: MaxPainStrike[] = strikes.map((candidatePrice) => {
    let callPain = 0;
    let putPain = 0;

    // For each call: if candidatePrice > strike, call holders profit
    for (const call of calls) {
      if (call.openInterest > 0 && candidatePrice > call.strikePrice) {
        callPain += (candidatePrice - call.strikePrice) * call.openInterest * 100;
      }
    }

    // For each put: if candidatePrice < strike, put holders profit
    for (const put of puts) {
      if (put.openInterest > 0 && candidatePrice < put.strikePrice) {
        putPain += (put.strikePrice - candidatePrice) * put.openInterest * 100;
      }
    }

    return {
      strike: candidatePrice,
      callPain,
      putPain,
      totalPain: callPain + putPain,
    };
  });

  // Find the strike with minimum total pain (maximum pain for holders)
  let minPain = Infinity;
  let maxPainStrike = strikes[0];

  for (const entry of painByStrike) {
    if (entry.totalPain < minPain) {
      minPain = entry.totalPain;
      maxPainStrike = entry.strike;
    }
  }

  return {
    maxPainStrike,
    totalPainAtMaxPain: minPain,
    painByStrike,
  };
}
