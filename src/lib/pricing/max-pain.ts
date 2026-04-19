import type { OptionContract } from "@/types/market";

export interface MaxPainStrike {
  strike: number;
  callPain: number;
  putPain: number;
  totalPain: number;
}

export interface OIByStrike {
  strike: number;
  callOI: number;
  putOI: number;
  totalOI: number;
  /** Put/Call OI ratio at this strike */
  pcRatio: number;
}

export interface MaxPainResult {
  maxPainStrike: number;
  totalPainAtMaxPain: number;
  painByStrike: MaxPainStrike[];
  /** Open interest breakdown by strike */
  oiByStrike: OIByStrike[];
  /** Total call open interest across all strikes */
  totalCallOI: number;
  /** Total put open interest across all strikes */
  totalPutOI: number;
  /** Overall put/call OI ratio */
  putCallRatio: number;
  /** Strike with the highest total open interest */
  highestOIStrike: number;
  /** Total call pain across all strikes at max pain price */
  callPainAtMaxPain: number;
  /** Total put pain across all strikes at max pain price */
  putPainAtMaxPain: number;
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

  // Build OI breakdown by strike
  const callOIMap = new Map<number, number>();
  const putOIMap = new Map<number, number>();
  let totalCallOI = 0;
  let totalPutOI = 0;

  for (const c of calls) {
    if (c.openInterest > 0) {
      callOIMap.set(c.strikePrice, (callOIMap.get(c.strikePrice) ?? 0) + c.openInterest);
      totalCallOI += c.openInterest;
    }
  }
  for (const p of puts) {
    if (p.openInterest > 0) {
      putOIMap.set(p.strikePrice, (putOIMap.get(p.strikePrice) ?? 0) + p.openInterest);
      totalPutOI += p.openInterest;
    }
  }

  const oiByStrike: OIByStrike[] = strikes.map((strike) => {
    const callOI = callOIMap.get(strike) ?? 0;
    const putOI = putOIMap.get(strike) ?? 0;
    return {
      strike,
      callOI,
      putOI,
      totalOI: callOI + putOI,
      pcRatio: callOI > 0 ? putOI / callOI : putOI > 0 ? Infinity : 0,
    };
  });

  // Find highest OI strike
  let highestOIStrike = strikes[0];
  let highestOI = 0;
  for (const entry of oiByStrike) {
    if (entry.totalOI > highestOI) {
      highestOI = entry.totalOI;
      highestOIStrike = entry.strike;
    }
  }

  // Calculate pain at each candidate price
  const painByStrike: MaxPainStrike[] = strikes.map((candidatePrice) => {
    let callPain = 0;
    let putPain = 0;

    for (const call of calls) {
      if (call.openInterest > 0 && candidatePrice > call.strikePrice) {
        callPain += (candidatePrice - call.strikePrice) * call.openInterest * 100;
      }
    }

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

  // Get call/put pain breakdown at the max pain price
  const maxPainEntry = painByStrike.find((e) => e.strike === maxPainStrike);

  return {
    maxPainStrike,
    totalPainAtMaxPain: minPain,
    painByStrike,
    oiByStrike,
    totalCallOI,
    totalPutOI,
    putCallRatio: totalCallOI > 0 ? totalPutOI / totalCallOI : 0,
    highestOIStrike,
    callPainAtMaxPain: maxPainEntry?.callPain ?? 0,
    putPainAtMaxPain: maxPainEntry?.putPain ?? 0,
  };
}
