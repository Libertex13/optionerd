import { describe, expect, it } from "vitest";
import type { Account, OptionsPosition, Position } from "snaptrade-typescript-sdk";
import { normalizeSnapTradePositions } from "./positions";

const account = {
  id: "acct-1",
  name: "TradeStation Individual",
  number: "masked",
  institution_name: "TradeStation",
  brokerage_authorization: "auth-1",
  created_date: "2026-04-30T00:00:00Z",
  sync_status: {},
  balance: {},
  is_paper: false,
} as Account;

describe("snaptrade/positions", () => {
  it("normalizes stock positions", () => {
    const stock = {
      units: 12,
      average_purchase_price: 101.25,
      symbol: {
        symbol: {
          id: "sym-aapl",
          symbol: "AAPL",
          raw_symbol: "AAPL",
          currency: {},
          type: {},
          currencies: [],
        },
      },
    } as Position;

    const result = normalizeSnapTradePositions([
      { account, positions: [stock], optionPositions: [] },
    ]);

    expect(result.skipped).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "AAPL shares",
      ticker: "AAPL",
      stock_leg: {
        side: "long",
        quantity: 12,
        entry_price: 101.25,
      },
      tags: ["broker:snaptrade", "brokerage:TradeStation"],
    });
  });

  it("normalizes option positions from per-contract SnapTrade prices", () => {
    const option = {
      units: -2,
      average_purchase_price: 315,
      symbol: {
        option_symbol: {
          id: "opt-msft",
          ticker: "MSFT260116P00300000",
          option_type: "PUT",
          strike_price: 300,
          expiration_date: "2026-01-16",
          is_mini_option: false,
          underlying_symbol: {
            symbol: "MSFT",
            raw_symbol: "MSFT",
          },
        },
      },
    } as OptionsPosition;

    const result = normalizeSnapTradePositions([
      { account, positions: [], optionPositions: [option] },
    ]);

    expect(result.skipped).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      name: "MSFT 2026-01-16 300 put",
      ticker: "MSFT",
      legs: [
        {
          side: "short",
          type: "put",
          strike: 300,
          entry_premium: 3.15,
          quantity: 2,
          expiration_date: "2026-01-16",
        },
      ],
      tags: ["broker:snaptrade", "brokerage:TradeStation"],
    });
  });
});
