import { describe, expect, it } from "vitest";
import {
  applyScenario,
  breakevenLabel,
  markPosition,
  maxLossLabel,
  maxProfitLabel,
  mtm,
  payoffAtExpiry,
  popLabel,
} from "./pricing";
import type { PortfolioPosition } from "./types";

describe("portfolio/pricing", () => {
  it("includes stock legs in mark-to-market P&L and delta", () => {
    const mark = markPosition(
      [
        {
          s: "short",
          t: "call",
          k: 110,
          p: 3,
          q: 1,
          iv: 0.25,
          exp: "2026-06-19",
        },
      ],
      105,
      { side: "long", quantity: 100, entry_price: 100 },
      new Date("2026-05-01T00:00:00Z"),
      0.04,
    );

    expect(mark.pnl).toBeGreaterThan(0);
    expect(mark.delta).toBeGreaterThan(0);
    expect(mark.delta).toBeLessThan(100);
  });

  it("reuses the shared payoff engine for covered calls", () => {
    const optionLegs = [
      {
        s: "short" as const,
        t: "call" as const,
        k: 110,
        p: 3,
        q: 1,
        iv: 0.25,
        exp: "2026-06-19",
      },
    ];
    const stockLeg = { side: "long" as const, quantity: 100, entry_price: 100 };

    expect(payoffAtExpiry(optionLegs, 90, stockLeg)).toBe(-700);
    expect(payoffAtExpiry(optionLegs, 120, stockLeg)).toBe(1300);
    expect(mtm(optionLegs, 105, stockLeg, new Date("2026-05-01T00:00:00Z"), 0.04)).toBeTypeOf("number");
  });

  it("applies scenarios to both option and stock legs", () => {
    const position: PortfolioPosition = {
      id: "pos-1",
      state: "open",
      name: "Covered call",
      strat: "covered-call",
      ticker: "AAPL",
      px: 100,
      pxLive: true,
      legs: [
        {
          s: "short",
          t: "call",
          k: 110,
          p: 3,
          q: 1,
          iv: 0.25,
          exp: "2026-06-19",
        },
      ],
      stockLeg: { side: "long", quantity: 100, entry_price: 100 },
      net: -9700,
      dte: 49,
      dteMax: 49,
      cost: 9700,
      pnl: 0,
      pnlPct: 0,
      entry: "2026-05-01",
      marks: [],
      greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
    };

    const result = applyScenario(position, {
      id: "shock-1",
      user_id: null,
      name: "Up 10%",
      description: null,
      target_date: null,
      underlying_shocks: {},
      default_shock: { mode: "pct", val: 10 },
      iv_shock: null,
      advance_days: 0,
      interest_rate: 0.04,
      notes: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      is_preset: true,
    });

    expect(result.newPx).toBeCloseTo(110, 10);
    expect(result.newValue).toBeGreaterThan(0);
  });

  it("uses actual structure math for labels instead of canned templates", () => {
    const position: PortfolioPosition = {
      id: "pos-2",
      state: "open",
      name: "Long call",
      strat: "long-call",
      ticker: "AAPL",
      px: 100,
      pxLive: true,
      legs: [
        {
          s: "long",
          t: "call",
          k: 100,
          p: 5,
          q: 1,
          iv: 0.2,
          exp: "2026-06-19",
        },
      ],
      stockLeg: null,
      net: -500,
      dte: 49,
      dteMax: 49,
      cost: 500,
      pnl: 0,
      pnlPct: 0,
      entry: "2026-05-01",
      marks: [],
      greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
    };

    expect(maxProfitLabel(position)).toBe("Unlimited");
    expect(maxLossLabel(position)).toBe("-$500");
    expect(breakevenLabel(position)).toContain("$105.00");
    expect(popLabel(position)).toMatch(/^\d+%$/);
  });
});
