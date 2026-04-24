import { describe, expect, it } from "vitest";
import { applyLiveMarks, applyLivePrice, normalizePosition } from "./normalize";
import type { OptionChain } from "@/types/market";
import type { Position } from "./types";

describe("portfolio/normalize", () => {
  const basePosition: Position = {
    id: "pos-1",
    user_id: "user-1",
    state: "open",
    name: "Covered call",
    ticker: "AAPL",
    strategy: null,
    entry_underlying_price: 100,
    entry_date: "2026-05-01",
    exit_date: null,
    realised_pnl: null,
    cost_basis: null,
    legs: [
      {
        side: "short",
        type: "call",
        strike: 110,
        entry_premium: 3,
        quantity: 1,
        expiration_date: "2026-06-19",
        implied_volatility: 0.25,
      },
    ],
    stock_leg: {
      side: "long",
      quantity: 100,
      entry_price: 100,
    },
    notes: null,
    tags: [],
    position_order: null,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  };

  it("normalizes stock legs and computes realistic fallback cost", () => {
    const normalized = normalizePosition(basePosition);

    expect(normalized.stockLeg).toEqual(basePosition.stock_leg);
    expect(normalized.cost).toBe(9700);
    expect(normalized.net).toBe(-9700);
  });

  it("applies live price fallback to option and stock components", () => {
    const normalized = normalizePosition(basePosition);
    const live = applyLivePrice(normalized, 108);

    expect(live.px).toBe(108);
    expect(live.pxLive).toBe(true);
    expect(live.pnl).toBeGreaterThan(0);
    expect(live.greeks.delta).toBeGreaterThan(0);
  });

  it("marks against a live chain and includes stock P&L/delta", () => {
    const normalized = normalizePosition(basePosition);
    const chain: OptionChain = {
      ticker: "AAPL",
      underlyingPrice: 108,
      expirations: [
        {
          expirationDate: "2026-06-19",
          daysToExpiry: 49,
          calls: [
            {
              contractSymbol: "AAPL260619C00110000",
              ticker: "AAPL",
              expirationDate: "2026-06-19",
              strikePrice: 110,
              optionType: "call",
              bid: 2,
              ask: 2.4,
              last: 2.2,
              mid: 2.2,
              volume: 100,
              openInterest: 1000,
              impliedVolatility: 0.24,
              delta: 0.42,
              gamma: 0.03,
              theta: -0.05,
              vega: 0.12,
              rho: 0,
              inTheMoney: false,
            },
          ],
          puts: [],
        },
      ],
    };

    const live = applyLiveMarks(normalized, chain);

    expect(live.pxLive).toBe(true);
    expect(live.px).toBe(108);
    expect(live.pnl).toBeCloseTo(880, 6);
    expect(live.greeks.delta).toBeCloseTo(58, 6);
  });

  it("supports stock-only positions", () => {
    const stockOnly = normalizePosition({
      ...basePosition,
      id: "pos-2",
      name: "Stock only",
      legs: [],
      stock_leg: {
        side: "long",
        quantity: 50,
        entry_price: 200,
      },
      entry_underlying_price: 200,
    });

    const live = applyLiveMarks(stockOnly, {
      ticker: "AAPL",
      underlyingPrice: 210,
      expirations: [],
    });

    expect(live.pnl).toBe(500);
    expect(live.greeks.delta).toBe(50);
    expect(live.pxLive).toBe(true);
  });
});
