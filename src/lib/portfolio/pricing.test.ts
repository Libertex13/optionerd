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
      markSource: "chain",
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
      markSource: "chain",
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

  it("uses a non-zero fallback baseline for scenarios when entry spot is missing", () => {
    const position: PortfolioPosition = {
      id: "pos-3",
      state: "open",
      name: "Call spread",
      strat: "call-spread",
      ticker: "AAPL",
      px: 0,
      pxLive: false,
      markSource: "entry",
      legs: [
        {
          s: "long",
          t: "call",
          k: 95,
          p: 6,
          q: 1,
          iv: 0.3,
          exp: "2026-06-19",
        },
        {
          s: "short",
          t: "call",
          k: 105,
          p: 2,
          q: 1,
          iv: 0.3,
          exp: "2026-06-19",
        },
      ],
      stockLeg: null,
      net: -400,
      dte: 49,
      dteMax: 49,
      cost: 400,
      pnl: 0,
      pnlPct: 0,
      entry: "2026-05-01",
      marks: [],
      greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
    };

    const result = applyScenario(position, {
      id: "shock-2",
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

  it("honors target_date and pin shocks in scenarios", () => {
    const position: PortfolioPosition = {
      id: "pos-4",
      state: "open",
      name: "Long call",
      strat: "long-call",
      ticker: "AAPL",
      px: 100,
      pxLive: true,
      markSource: "chain",
      legs: [
        {
          s: "long",
          t: "call",
          k: 100,
          p: 5,
          q: 1,
          iv: 0.25,
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
    const now = new Date("2026-05-01T00:00:00Z");

    const pinned = applyScenario(position, {
      id: "shock-3",
      user_id: null,
      name: "Pin 103",
      description: null,
      target_date: null,
      underlying_shocks: {},
      default_shock: { mode: "pin", val: 103 },
      iv_shock: null,
      advance_days: 0,
      interest_rate: 0.04,
      notes: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      is_preset: true,
    }, now);

    const atTargetDate = applyScenario(position, {
      id: "shock-4",
      user_id: null,
      name: "Ten days later",
      description: null,
      target_date: "2026-05-11",
      underlying_shocks: {},
      default_shock: { mode: "abs", val: 100 },
      iv_shock: null,
      advance_days: 0,
      interest_rate: 0.04,
      notes: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      is_preset: true,
    }, now);

    const samePriceToday = applyScenario(position, {
      id: "shock-5",
      user_id: null,
      name: "Today",
      description: null,
      target_date: null,
      underlying_shocks: {},
      default_shock: { mode: "abs", val: 100 },
      iv_shock: null,
      advance_days: 0,
      interest_rate: 0.04,
      notes: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      is_preset: true,
    }, now);

    expect(pinned.newPx).toBe(103);
    expect(atTargetDate.newValue).toBeLessThan(samePriceToday.newValue);
  });

  it("downgrades mixed-expiry portfolio labels to conditional text", () => {
    const position: PortfolioPosition = {
      id: "pos-10",
      state: "open",
      name: "Call calendar",
      strat: "call-calendar",
      ticker: "AAPL",
      px: 100,
      pxLive: true,
      markSource: "chain",
      legs: [
        {
          s: "short",
          t: "call",
          k: 100,
          p: 4,
          q: 1,
          iv: 0.22,
          exp: "2026-05-15",
        },
        {
          s: "long",
          t: "call",
          k: 100,
          p: 6,
          q: 1,
          iv: 0.24,
          exp: "2026-06-19",
        },
      ],
      stockLeg: null,
      net: -200,
      dte: 21,
      dteMax: 56,
      cost: 200,
      pnl: 0,
      pnlPct: 0,
      entry: "2026-04-24",
      marks: [],
      greeks: { delta: 0, gamma: 0, theta: 0, vega: 0 },
    };

    expect(maxProfitLabel(position)).toBe("Varies by date");
    expect(maxLossLabel(position)).toBe("Varies by date");
    expect(breakevenLabel(position)).toBe("Front expiry only");
    expect(popLabel(position)).toBe("Varies by path");
  });

  it("treats target_date on the current UTC day the same as zero days forward", () => {
    const position: PortfolioPosition = {
      id: "pos-5",
      state: "open",
      name: "Long call",
      strat: "long-call",
      ticker: "AAPL",
      px: 100,
      pxLive: true,
      markSource: "chain",
      legs: [
        {
          s: "long",
          t: "call",
          k: 100,
          p: 5,
          q: 1,
          iv: 0.25,
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
    const now = new Date("2026-05-01T15:30:00Z");

    const withTargetDate = applyScenario(position, {
      id: "shock-6",
      user_id: null,
      name: "Target today",
      description: null,
      target_date: "2026-05-01",
      underlying_shocks: {},
      default_shock: { mode: "abs", val: 100 },
      iv_shock: null,
      advance_days: 999,
      interest_rate: 0.04,
      notes: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      is_preset: true,
    }, now);

    const sameDay = applyScenario(position, {
      id: "shock-7",
      user_id: null,
      name: "Zero days",
      description: null,
      target_date: null,
      underlying_shocks: {},
      default_shock: { mode: "abs", val: 100 },
      iv_shock: null,
      advance_days: 0,
      interest_rate: 0.04,
      notes: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      is_preset: true,
    }, now);

    expect(withTargetDate.newValue).toBeCloseTo(sameDay.newValue, 10);
  });

  it("clamps scenario IV crushes to the configured floor", () => {
    const position: PortfolioPosition = {
      id: "pos-6",
      state: "open",
      name: "Long call",
      strat: "long-call",
      ticker: "AAPL",
      px: 100,
      pxLive: true,
      markSource: "chain",
      legs: [
        {
          s: "long",
          t: "call",
          k: 100,
          p: 5,
          q: 1,
          iv: 0.25,
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
    const now = new Date("2026-05-01T00:00:00Z");

    const zeroVol = applyScenario(position, {
      id: "shock-8",
      user_id: null,
      name: "Zero IV",
      description: null,
      target_date: null,
      underlying_shocks: {},
      default_shock: { mode: "abs", val: 100 },
      iv_shock: { mode: "abs", val: 0 },
      advance_days: 0,
      interest_rate: 0.04,
      notes: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      is_preset: true,
    }, now);

    const flooredVol = applyScenario(position, {
      id: "shock-9",
      user_id: null,
      name: "Floor IV",
      description: null,
      target_date: null,
      underlying_shocks: {},
      default_shock: { mode: "abs", val: 100 },
      iv_shock: { mode: "abs", val: 0.01 },
      advance_days: 0,
      interest_rate: 0.04,
      notes: null,
      created_at: "2026-05-01T00:00:00Z",
      updated_at: "2026-05-01T00:00:00Z",
      is_preset: true,
    }, now);

    expect(zeroVol.newValue).toBeCloseTo(flooredVol.newValue, 10);
  });
});
