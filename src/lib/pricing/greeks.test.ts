import { describe, expect, it } from "vitest";
import { blackScholesPrice } from "./black-scholes";
import { calculateGreeks } from "./greeks";

describe("pricing/greeks", () => {
  const input = {
    spotPrice: 100,
    strikePrice: 100,
    timeToExpiry: 30 / 365,
    riskFreeRate: 0.045,
    volatility: 0.2,
  } as const;

  it("satisfies call/put greek parity relationships", () => {
    const call = calculateGreeks({ ...input, optionType: "call" });
    const put = calculateGreeks({ ...input, optionType: "put" });

    expect(call.delta - put.delta).toBeCloseTo(1, 8);
    expect(call.gamma).toBeCloseTo(put.gamma, 10);
    expect(call.vega).toBeCloseTo(put.vega, 10);
  });

  it("matches finite-difference delta and gamma", () => {
    const h = 0.01;
    const call = calculateGreeks({ ...input, optionType: "call" });
    const up = blackScholesPrice({ ...input, spotPrice: input.spotPrice + h, optionType: "call" });
    const mid = blackScholesPrice({ ...input, optionType: "call" });
    const down = blackScholesPrice({ ...input, spotPrice: input.spotPrice - h, optionType: "call" });

    const deltaFD = (up - down) / (2 * h);
    const gammaFD = (up - 2 * mid + down) / (h * h);

    expect(call.delta).toBeCloseTo(deltaFD, 4);
    expect(call.gamma).toBeCloseTo(gammaFD, 3);
  });

  it("returns sensible signs for long option theta and vega", () => {
    const call = calculateGreeks({ ...input, optionType: "call" });
    const put = calculateGreeks({ ...input, optionType: "put" });

    expect(call.theta).toBeLessThan(0);
    expect(put.theta).toBeLessThan(0);
    expect(call.vega).toBeGreaterThan(0);
    expect(put.vega).toBeGreaterThan(0);
  });

  it("returns expiry boundary greeks without NaNs", () => {
    const itmCall = calculateGreeks({
      ...input,
      spotPrice: 120,
      timeToExpiry: 0,
      optionType: "call",
    });
    const otmPut = calculateGreeks({
      ...input,
      spotPrice: 120,
      timeToExpiry: 0,
      optionType: "put",
    });

    expect(itmCall).toEqual({
      delta: 1,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    });
    expect(otmPut).toEqual({
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    });
  });

  it("handles zero-volatility inputs cleanly", () => {
    const greeks = calculateGreeks({
      ...input,
      volatility: 0,
      optionType: "call",
    });

    expect(greeks).toEqual({
      delta: 1,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
    });
  });
});
