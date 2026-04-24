import { describe, expect, it } from "vitest";
import { calculateChanceOfProfit } from "./probability";
import { generatePayoffAtExpiry, findBreakEvenPoints } from "./payoff";
import type { StrategyLeg } from "@/types/options";

describe("pricing/probability", () => {
  it("matches the risk-neutral probability above break-even for a long call", () => {
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

    const probability = calculateChanceOfProfit(
      payoff,
      breakEvens,
      100,
      0.2,
      30 / 365,
      0.04,
    );

    expect(probability).toBeCloseTo(0.2055, 3);
  });

  it("sums both tails for a long strangle", () => {
    const legs: StrategyLeg[] = [
      {
        optionType: "call",
        positionType: "long",
        strikePrice: 110,
        premium: 2,
        quantity: 1,
        expirationDate: "2026-06-19",
        impliedVolatility: 0.25,
      },
      {
        optionType: "put",
        positionType: "long",
        strikePrice: 90,
        premium: 2,
        quantity: 1,
        expirationDate: "2026-06-19",
        impliedVolatility: 0.25,
      },
    ];
    const payoff = generatePayoffAtExpiry(legs, 100);
    const breakEvens = findBreakEvenPoints(payoff);
    const probability = calculateChanceOfProfit(
      payoff,
      breakEvens,
      100,
      0.25,
      45 / 365,
      0.03,
    );

    expect(probability).toBeGreaterThan(0);
    expect(probability).toBeLessThan(1);
  });

  it("handles no-break-even positions", () => {
    expect(
      calculateChanceOfProfit(
        [{ underlyingPrice: 100, profitLoss: 10, legProfitLoss: [10] }],
        [],
        100,
        0.2,
        0.25,
        0.03,
      ),
    ).toBe(1);

    expect(
      calculateChanceOfProfit(
        [{ underlyingPrice: 100, profitLoss: -10, legProfitLoss: [-10] }],
        [],
        100,
        0.2,
        0.25,
        0.03,
      ),
    ).toBe(0);
  });

  it("returns realized profitability once time has expired", () => {
    const profitable = [{ underlyingPrice: 100, profitLoss: 10, legProfitLoss: [10] }];
    const losing = [{ underlyingPrice: 100, profitLoss: -10, legProfitLoss: [-10] }];

    expect(calculateChanceOfProfit(profitable, [100], 100, 0.2, 0, 0.03)).toBe(1);
    expect(calculateChanceOfProfit(losing, [100], 100, 0.2, 0, 0.03)).toBe(0);
  });

  it("handles zero volatility as a deterministic forward path", () => {
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

    expect(calculateChanceOfProfit(payoff, breakEvens, 100, 0, 1, 0.1)).toBe(1);
    expect(calculateChanceOfProfit(payoff, breakEvens, 100, 0, 1, 0)).toBe(0);
  });
});
