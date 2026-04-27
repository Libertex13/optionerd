import { describe, expect, it } from "vitest";
import { normalizeTradeStationPositions, parseOccOptionSymbol } from "./positions";
import type { TradeStationPosition } from "./api";

describe("tradestation/positions", () => {
  it("parses compact OCC option symbols", () => {
    expect(parseOccOptionSymbol("AAPL241220C00150000")).toEqual({
      ticker: "AAPL",
      expiration_date: "2024-12-20",
      type: "call",
      strike: 150,
    });
  });

  it("parses space-padded OCC option symbols", () => {
    expect(parseOccOptionSymbol("SPY   260116P00600000")).toEqual({
      ticker: "SPY",
      expiration_date: "2026-01-16",
      type: "put",
      strike: 600,
    });
  });

  it("parses compact decimal-strike option symbols", () => {
    expect(parseOccOptionSymbol("TSLA260116C450.5")).toEqual({
      ticker: "TSLA",
      expiration_date: "2026-01-16",
      type: "call",
      strike: 450.5,
    });
  });

  it("parses spaced display option symbols", () => {
    expect(parseOccOptionSymbol("NVDA 1/16/2026 150 Put")).toEqual({
      ticker: "NVDA",
      expiration_date: "2026-01-16",
      type: "put",
      strike: 150,
    });
  });

  it("normalizes stock and option positions into import drafts", () => {
    const positions: TradeStationPosition[] = [
      {
        accountId: "ABC123",
        symbol: "MSFT",
        assetType: "STOCK",
        quantity: 25,
        side: "long",
        averagePrice: 410.12,
        raw: {},
      },
      {
        accountId: "ABC123",
        symbol: "AAPL  260116C00200000",
        assetType: "Stock Option",
        quantity: 2,
        side: "short",
        averagePrice: 4.55,
        raw: {},
      },
    ];

    const result = normalizeTradeStationPositions(positions);

    expect(result.skipped).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      ticker: "MSFT",
      strategy: "stock",
      stock_leg: { side: "long", quantity: 25, entry_price: 410.12 },
      legs: [],
    });
    expect(result.rows[1]).toMatchObject({
      ticker: "AAPL",
      strategy: "short-call",
      legs: [
        {
          side: "short",
          type: "call",
          strike: 200,
          quantity: 2,
          entry_premium: 4.55,
          expiration_date: "2026-01-16",
        },
      ],
    });
  });
});
