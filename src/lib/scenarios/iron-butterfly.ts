import type { ScenarioConfig } from "./types";

export const ironButterflyScenarios: ScenarioConfig[] = [
  {
    id: "aapl-opex-pin",
    strategySlug: "iron-butterfly",
    title: "Scenario - Textbook OpEx pin — 5:1 R:R, tested the wing, closed exactly at body",
    subtitle:
      "AAPL · Nov 1–15, 2024 · Big-cap pin into OpEx. Tested $230 wing on Thursday. Pinned $225.00 on Friday. 96% of max.",
    ticker: "AAPL",
    from: "2024-11-01",
    to: "2024-11-15",
    contextFrom: "2024-08-01",
    contextTo: "2024-12-15",
    legs: [
      { side: "short", type: "call", strike: 225, expiry: "2024-11-15", qty: 1 },
      { side: "short", type: "put", strike: 225, expiry: "2024-11-15", qty: 1 },
      { side: "long", type: "call", strike: 230, expiry: "2024-11-15", qty: 1 },
      { side: "long", type: "put", strike: 220, expiry: "2024-11-15", qty: 1 },
    ],
    decisions: [
      {
        date: "2024-11-01",
        kind: "entry",
        title: "Open the iron butterfly into monthly OpEx",
        shortLabel: "Entry",
        summary:
          "Sold the $225 body, bought $220P/$230C wings · $4.18 credit on $5-wide wings",
        pivotal: true,
        narrative:
          "AAPL closes $222.91. Monthly OpEx is two weeks out. Gamma and open interest are heavily concentrated at the $225 strike — it's the obvious pin candidate. The setup: sell the $225 call and $225 put (body), buy the $230 call and $220 put as wings. Net credit $4.18 on a $5-wide structure. Max profit = $418 if AAPL finishes exactly at $225. Max loss = ($5 − $4.18) × 100 = $82. That's a >5:1 R:R — the structural hallmark of a good iron butterfly, only available when the body collects a large fraction of the wing width.",
        oneLine:
          "Credit > 80% of wing width. The trade is a lottery ticket on a pin with ~5:1 payoff.",
      },
      {
        date: "2024-11-14",
        kind: "event",
        title: "Thursday test — stock prints $228.87",
        shortLabel: "Test",
        summary: "AAPL runs above the $225 short strike; upper wing in play",
        pivotal: true,
        narrative:
          "Day before expiry. AAPL rallies intraday to $228.87 — through the short call, close to the $230 long wing. Short-dated gamma is extreme here. The position marks at roughly +$90 on $418 max (~22% of max). Nothing structurally wrong: the long call wing caps damage above $230, and any close between the wings still leaves the trade profitable. But a parabolic close above $230 would convert this from a $418 winner into a $82 loser in a single session. The decision: close the trade at modest profit (~20% of max) and take risk off into the final day? Or hold the pin thesis one more session?",
        decision: {
          k: "The crunch",
          v: "A positive pin thesis either pays on Friday or doesn't. Closing at 20% of max surrenders the trade's entire structural edge; it turns a 5:1 lottery ticket into a 1:4 winner.",
        },
        oneLine:
          "Iron butterfly pays on the final session or not at all. Close at 20% only if the pin thesis is broken.",
      },
      {
        date: "2024-11-15",
        kind: "exit",
        title: "Expiry — pinned at $225.00 exactly",
        shortLabel: "Pin",
        summary: "AAPL closes $225.00 on the dot. 96% of max profit.",
        pivotal: true,
        narrative:
          "OpEx Friday. AAPL closes $225.00 — to the penny. The $225 call settles at $0.08, the $225 put at $0.10 (small residual bid/ask). Wings expire worthless. Net position value: -$16 vs $418 credit received = +$402 realized, or 96% of the structural max. This is what the iron butterfly is designed for: concentrated gamma + dealer hedging create strong pinning pressure at high-open-interest strikes, and the butterfly captures nearly all of the available premium when it lands. On the probability side, this outcome is uncommon — most iron butterflies finish somewhere on the tent's slope, not at the peak. When the pin thesis aligns, though, the payoff is the asymmetry the strategy exists to capture.",
        oneLine:
          "Exactly pinned. 96% of max. The whole trade paid on the last session.",
      },
    ],
    retrospective: {
      verdict: "96% of max · pin thesis aligned · Thursday test reversed into Friday pin",
      pctOfMax: 0.96,
      lessons: [
        "Iron butterflies are pin trades. They pay their full structural edge only when the stock lands very close to the body strike — a specific, often low-probability thesis.",
        "The math works because of the R:R. A $4+ credit on a $5 wing means you risk ~$80 to make ~$420 — you can be wrong 3 out of 4 times and still grind edge over many trades.",
        "The correct entry is where open interest is concentrated and dealer gamma is pinning — real pinning is a dealer-hedging phenomenon, not a chart observation.",
        "Closing at 20% of max on the final day defeats the structural edge. Either your pin thesis is intact (hold) or it's broken (close), but 'take a small win' surrenders the expectation.",
      ],
    },
  },
];
