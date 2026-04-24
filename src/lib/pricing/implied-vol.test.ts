import { describe, expect, it } from "vitest";
import { blackScholesPrice } from "./black-scholes";
import { solveImpliedVolatility } from "./implied-vol";

describe("pricing/implied-vol", () => {
  it("recovers implied volatility for calls and puts", () => {
    const common = {
      spotPrice: 100,
      strikePrice: 105,
      timeToExpiry: 45 / 365,
      riskFreeRate: 0.03,
      volatility: 0.37,
    };

    const callPrice = blackScholesPrice({ ...common, optionType: "call" });
    const putPrice = blackScholesPrice({ ...common, optionType: "put" });

    expect(
      solveImpliedVolatility({
        marketPrice: callPrice,
        spotPrice: common.spotPrice,
        strikePrice: common.strikePrice,
        timeToExpiry: common.timeToExpiry,
        riskFreeRate: common.riskFreeRate,
        optionType: "call",
      }),
    ).toBeCloseTo(common.volatility, 3);

    expect(
      solveImpliedVolatility({
        marketPrice: putPrice,
        spotPrice: common.spotPrice,
        strikePrice: common.strikePrice,
        timeToExpiry: common.timeToExpiry,
        riskFreeRate: common.riskFreeRate,
        optionType: "put",
      }),
    ).toBeCloseTo(common.volatility, 3);
  });

  it("recovers high volatility for far OTM options", () => {
    const marketPrice = blackScholesPrice({
      spotPrice: 50,
      strikePrice: 70,
      timeToExpiry: 120 / 365,
      riskFreeRate: 0.02,
      volatility: 0.95,
      optionType: "call",
    });

    const iv = solveImpliedVolatility({
      marketPrice,
      spotPrice: 50,
      strikePrice: 70,
      timeToExpiry: 120 / 365,
      riskFreeRate: 0.02,
      optionType: "call",
    });

    expect(iv).not.toBeNull();
    expect(iv!).toBeCloseTo(0.95, 2);
  });

  it("rejects impossible and degenerate inputs", () => {
    expect(
      solveImpliedVolatility({
        marketPrice: 0,
        spotPrice: 100,
        strikePrice: 100,
        timeToExpiry: 0.25,
        riskFreeRate: 0.03,
        optionType: "call",
      }),
    ).toBeNull();

    expect(
      solveImpliedVolatility({
        marketPrice: 5,
        spotPrice: 100,
        strikePrice: 100,
        timeToExpiry: 0,
        riskFreeRate: 0.03,
        optionType: "call",
      }),
    ).toBeNull();
  });

  it("rejects prices below discounted intrinsic value", () => {
    expect(
      solveImpliedVolatility({
        marketPrice: 0.5,
        spotPrice: 120,
        strikePrice: 100,
        timeToExpiry: 0.5,
        riskFreeRate: 0.05,
        optionType: "call",
      }),
    ).toBeNull();
  });

  it("rejects prices outside the bisection bracket", () => {
    expect(
      solveImpliedVolatility({
        marketPrice: 500,
        spotPrice: 100,
        strikePrice: 100,
        timeToExpiry: 0.25,
        riskFreeRate: 0.03,
        optionType: "put",
      }),
    ).toBeNull();
  });
});
