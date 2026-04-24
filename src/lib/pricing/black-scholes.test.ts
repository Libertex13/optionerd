import { describe, expect, it } from "vitest";
import {
  blackScholesPrice,
  calculateD1D2,
  cumulativeNormalDistribution,
  normalPDF,
} from "./black-scholes";

describe("pricing/black-scholes", () => {
  it("computes a correct standard normal CDF", () => {
    expect(cumulativeNormalDistribution(0)).toBeCloseTo(0.5, 8);
    expect(cumulativeNormalDistribution(1)).toBeCloseTo(0.8413447, 6);
    expect(cumulativeNormalDistribution(-1)).toBeCloseTo(0.1586553, 6);
    expect(cumulativeNormalDistribution(2)).toBeCloseTo(0.9772499, 6);
  });

  it("computes the standard normal PDF", () => {
    expect(normalPDF(0)).toBeCloseTo(0.39894228, 8);
    expect(normalPDF(1)).toBeCloseTo(0.24197072, 8);
  });

  it("computes d1 and d2 for valid inputs", () => {
    const { d1, d2 } = calculateD1D2(100, 100, 30 / 365, 0.045, 0.2);
    expect(d1).toBeCloseTo(0.09317, 4);
    expect(d2).toBeCloseTo(0.03583, 4);
  });

  it("returns stable zeros for invalid d1/d2 inputs", () => {
    expect(calculateD1D2(0, 100, 1, 0.04, 0.2)).toEqual({ d1: 0, d2: 0 });
    expect(calculateD1D2(100, 100, 1, 0.04, 0)).toEqual({ d1: 0, d2: 0 });
  });

  it("prices European options accurately for a known ATM case", () => {
    const call = blackScholesPrice({
      spotPrice: 100,
      strikePrice: 100,
      timeToExpiry: 30 / 365,
      riskFreeRate: 0.045,
      volatility: 0.2,
      optionType: "call",
    });
    const put = blackScholesPrice({
      spotPrice: 100,
      strikePrice: 100,
      timeToExpiry: 30 / 365,
      riskFreeRate: 0.045,
      volatility: 0.2,
      optionType: "put",
    });

    expect(call).toBeCloseTo(2.4723, 3);
    expect(put).toBeCloseTo(2.1031, 3);
  });

  it("satisfies put-call parity", () => {
    const input = {
      spotPrice: 250,
      strikePrice: 240,
      timeToExpiry: 90 / 365,
      riskFreeRate: 0.03,
      volatility: 0.32,
    };
    const call = blackScholesPrice({ ...input, optionType: "call" });
    const put = blackScholesPrice({ ...input, optionType: "put" });
    const parity = input.spotPrice - input.strikePrice * Math.exp(-input.riskFreeRate * input.timeToExpiry);

    expect(call - put).toBeCloseTo(parity, 8);
  });

  it("returns intrinsic value at expiry", () => {
    expect(
      blackScholesPrice({
        spotPrice: 120,
        strikePrice: 100,
        timeToExpiry: 0,
        riskFreeRate: 0.05,
        volatility: 0.2,
        optionType: "call",
      }),
    ).toBe(20);

    expect(
      blackScholesPrice({
        spotPrice: 120,
        strikePrice: 100,
        timeToExpiry: -0.25,
        riskFreeRate: 0.05,
        volatility: 0.2,
        optionType: "put",
      }),
    ).toBe(0);
  });

  it("handles zero-volatility pricing as discounted intrinsic value", () => {
    const price = blackScholesPrice({
      spotPrice: 120,
      strikePrice: 100,
      timeToExpiry: 0.5,
      riskFreeRate: 0.05,
      volatility: 0,
      optionType: "call",
    });

    expect(price).toBeCloseTo(120 - 100 * Math.exp(-0.05 * 0.5), 8);
  });

  it("returns zero for invalid spot or strike values", () => {
    expect(
      blackScholesPrice({
        spotPrice: 0,
        strikePrice: 100,
        timeToExpiry: 1,
        riskFreeRate: 0.05,
        volatility: 0.2,
        optionType: "call",
      }),
    ).toBe(0);

    expect(
      blackScholesPrice({
        spotPrice: 100,
        strikePrice: 0,
        timeToExpiry: 1,
        riskFreeRate: 0.05,
        volatility: 0.2,
        optionType: "put",
      }),
    ).toBe(0);
  });
});
