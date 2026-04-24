import { describe, expect, it } from "vitest";
import {
  calculateMaxProfitLoss,
  calculateRiskCapital,
  calculateStrategyProfitLossAtDate,
  calculateStrategyProfitLossAtExpiry,
  calculateTimeToExpiryYears,
  findBreakEvenPoints,
  generatePayoffAtDate,
  generatePayoffAtExpiry,
} from "./payoff";
import { blackScholesPrice } from "./black-scholes";
import type { StrategyLeg } from "@/types/options";

describe("pricing/payoff", () => {
  it("computes long call P&L at expiry", () => {
    const legs: StrategyLeg[] = [
      {
        optionType: "call",
        positionType: "long",
        strikePrice: 100,
        premium: 5,
        quantity: 1,
        expirationDate: "2026-06-19",
        impliedVolatility: 0.25,
      },
    ];

    expect(calculateStrategyProfitLossAtExpiry(legs, 90).profitLoss).toBe(-500);
    expect(calculateStrategyProfitLossAtExpiry(legs, 120).profitLoss).toBe(1500);
  });

  it("computes covered call payoff including the stock leg", () => {
    const legs: StrategyLeg[] = [
      {
        positionType: "long",
        quantity: 100,
        entryPrice: 100,
      },
      {
        optionType: "call",
        positionType: "short",
        strikePrice: 110,
        premium: 3,
        quantity: 1,
        expirationDate: "2026-06-19",
        impliedVolatility: 0.25,
      },
    ];

    expect(calculateStrategyProfitLossAtExpiry(legs, 90).profitLoss).toBe(-700);
    expect(calculateStrategyProfitLossAtExpiry(legs, 120).profitLoss).toBe(1300);
  });

  it("reprices legs with their own expirations before a future date", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    const legs: StrategyLeg[] = [
      {
        optionType: "call",
        positionType: "long",
        strikePrice: 100,
        premium: 6,
        quantity: 1,
        expirationDate: "2026-05-15",
        impliedVolatility: 0.2,
      },
      {
        optionType: "call",
        positionType: "short",
        strikePrice: 110,
        premium: 2,
        quantity: 1,
        expirationDate: "2026-06-19",
        impliedVolatility: 0.25,
      },
    ];

    const result = calculateStrategyProfitLossAtDate(legs, 115, {
      daysForward: 20,
      riskFreeRate: 0.04,
      now,
    });

    const longExpired = (15 - 6) * 100;
    const shortTime = calculateTimeToExpiryYears("2026-06-19", 20, now);
    const shortValue = blackScholesPrice({
      spotPrice: 115,
      strikePrice: 110,
      timeToExpiry: shortTime,
      riskFreeRate: 0.04,
      volatility: 0.25,
      optionType: "call",
    });
    const shortStillAlive = (shortValue - 2) * -100;

    expect(result.profitLoss).toBeCloseTo(longExpired + shortStillAlive, 2);
  });

  it("collapses to expiry payoff once all legs are expired", () => {
    const now = new Date("2026-05-01T00:00:00Z");
    const legs: StrategyLeg[] = [
      {
        optionType: "put",
        positionType: "long",
        strikePrice: 100,
        premium: 4,
        quantity: 1,
        expirationDate: "2026-05-15",
        impliedVolatility: 0.2,
      },
    ];

    const expiryCurve = generatePayoffAtExpiry(legs, 100);
    const postExpiryCurve = generatePayoffAtDate(legs, 100, 30, 0.04, now);

    expect(postExpiryCurve).toEqual(expiryCurve);
  });

  it("finds break-evens and bounded max loss correctly", () => {
    const legs: StrategyLeg[] = [
      {
        optionType: "call",
        positionType: "long",
        strikePrice: 100,
        premium: 5,
        quantity: 1,
        expirationDate: "2026-06-19",
        impliedVolatility: 0.2,
      },
    ];

    const payoff = generatePayoffAtExpiry(legs, 100);
    const breakEvens = findBreakEvenPoints(payoff);
    const limits = calculateMaxProfitLoss(payoff);

    expect(breakEvens).toHaveLength(1);
    expect(breakEvens[0]).toBeCloseTo(105, 1);
    expect(limits.maxLoss).toBe(-500);
    expect(limits.isUnlimitedProfit).toBe(true);
    expect(limits.isUnlimitedLoss).toBe(false);
  });

  it("computes risk capital from max loss for bounded strategies", () => {
    const spread: StrategyLeg[] = [
      {
        optionType: "call",
        positionType: "long",
        strikePrice: 100,
        premium: 7,
        quantity: 1,
        expirationDate: "2026-06-19",
        impliedVolatility: 0.2,
      },
      {
        optionType: "call",
        positionType: "short",
        strikePrice: 110,
        premium: 2,
        quantity: 1,
        expirationDate: "2026-06-19",
        impliedVolatility: 0.2,
      },
    ];

    expect(calculateRiskCapital(spread, 105)).toBe(500);
  });
});
