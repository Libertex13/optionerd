import { describe, expect, it } from "vitest";
import type { OptionChain } from "@/types/market";
import type { PortfolioPosition } from "./types";
import { buildTickerCampaigns, generateRepairCandidates } from "./repair";

function position(overrides: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    id: "pos-1",
    state: "open",
    name: "AAPL long call",
    strat: "long-call",
    ticker: "AAPL",
    px: 105,
    pxLive: true,
    markSource: "chain",
    legs: [
      {
        s: "long",
        t: "call",
        k: 100,
        p: 2,
        q: 1,
        iv: 0.3,
        exp: "2026-05-15",
      },
    ],
    stockLeg: null,
    net: -200,
    dte: 20,
    dteMax: 45,
    cost: 200,
    pnl: 350,
    pnlPct: 175,
    entry: "2026-04-01",
    marks: [
      {
        dte: 20,
        value: 5.5,
        pnl: 350,
        delta: 60,
        gamma: 2,
        theta: -4,
        vega: 8,
      },
    ],
    greeks: {
      delta: 60,
      gamma: 2,
      theta: -4,
      vega: 8,
    },
    ...overrides,
  };
}

const chain: OptionChain = {
  ticker: "AAPL",
  underlyingPrice: 105,
  quoteSource: "nasdaq",
  quoteDelayMinutes: 15,
  quoteFetchedAt: Date.now(),
  expirations: [
    {
      expirationDate: "2026-05-15",
      daysToExpiry: 20,
      calls: [
        {
          contractSymbol: "AAPL260515C00100000",
          ticker: "AAPL",
          expirationDate: "2026-05-15",
          strikePrice: 100,
          optionType: "call",
          bid: 5.4,
          ask: 5.6,
          last: 5.5,
          mid: 5.5,
          volume: 100,
          openInterest: 1000,
          impliedVolatility: 0.3,
          delta: 0.6,
          gamma: 0.02,
          theta: -0.04,
          vega: 0.08,
          rho: 0,
          inTheMoney: true,
        },
        {
          contractSymbol: "AAPL260515C00110000",
          ticker: "AAPL",
          expirationDate: "2026-05-15",
          strikePrice: 110,
          optionType: "call",
          bid: 1.9,
          ask: 2.1,
          last: 2,
          mid: 2,
          volume: 100,
          openInterest: 1000,
          impliedVolatility: 0.28,
          delta: 0.35,
          gamma: 0.02,
          theta: -0.03,
          vega: 0.07,
          rho: 0,
          inTheMoney: false,
        },
        {
          contractSymbol: "AAPL260515C00120000",
          ticker: "AAPL",
          expirationDate: "2026-05-15",
          strikePrice: 120,
          optionType: "call",
          bid: 0.8,
          ask: 1,
          last: 0.9,
          mid: 0.9,
          volume: 100,
          openInterest: 1000,
          impliedVolatility: 0.26,
          delta: 0.2,
          gamma: 0.01,
          theta: -0.02,
          vega: 0.04,
          rho: 0,
          inTheMoney: false,
        },
      ],
      puts: [],
    },
    {
      expirationDate: "2026-06-19",
      daysToExpiry: 55,
      calls: [
        {
          contractSymbol: "AAPL260619C00110000",
          ticker: "AAPL",
          expirationDate: "2026-06-19",
          strikePrice: 110,
          optionType: "call",
          bid: 3.9,
          ask: 4.1,
          last: 4,
          mid: 4,
          volume: 100,
          openInterest: 1000,
          impliedVolatility: 0.29,
          delta: 0.42,
          gamma: 0.02,
          theta: -0.03,
          vega: 0.09,
          rho: 0,
          inTheMoney: false,
        },
      ],
      puts: [],
    },
  ],
};

describe("portfolio/repair", () => {
  it("builds campaign context from realized and open P/L", () => {
    const campaigns = buildTickerCampaigns([
      position(),
      position({ id: "closed-1", state: "closed", pnl: 900 }),
    ]);

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].realizedPnl).toBe(900);
    expect(campaigns[0].openPnl).toBe(350);
    expect(campaigns[0].netPnl).toBe(1250);
  });

  it("generates premium recovery candidates for a winning long option", () => {
    const candidates = generateRepairCandidates([position()], { AAPL: chain });

    expect(candidates.some((candidate) => candidate.family === "verticalize")).toBe(true);
    expect(candidates.some((candidate) => candidate.family === "harvest-reset")).toBe(true);
    expect(candidates.every((candidate) => candidate.netDebitCredit > 0)).toBe(true);
  });
});
