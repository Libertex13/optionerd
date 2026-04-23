import type { ScenarioConfig } from "./types";

export const coveredCallScenarios: ScenarioConfig[] = [
  {
    id: "tsla-called-away",
    strategySlug: "covered-call",
    title: "Scenario - Called away at $280, stock finished at $352",
    subtitle:
      "TSLA · Oct–Nov 2024 · Sold a covered call into the election. The premium looked great on the way in. Seventeen trading days later it cost $72 of upside.",
    ticker: "TSLA",
    from: "2024-10-28",
    to: "2024-11-22",
    contextFrom: "2024-07-01",
    contextTo: "2025-01-31",
    legs: [
      { side: "short", type: "call", strike: 280, expiry: "2024-11-22", qty: 1 },
    ],
    decisions: [
      {
        date: "2024-10-28",
        kind: "entry",
        title: "Sell the covered call",
        shortLabel: "Entry",
        summary:
          "Own 100 TSLA at $262 · sold the Nov 22 $280 call for $8.90",
        pivotal: true,
        narrative:
          "TSLA is flat-to-slightly-bullish into the election. Holding 100 shares at a ~$262 cost basis with no strong view on a +15% move in three weeks. The $280 call, 17 trading days to expiry, offers $8.90 — roughly 3.4% premium on the position for less than a month. Effective 'sell-at' price is $288.90 if called away, which still feels like a decent print given the entry. This is the textbook covered-call setup: neutral-to-mildly-bullish, willing to sell at the strike, collect theta in the meantime.",
        oneLine:
          "Strike you'd be happy to sell at · premium that's meaningful · expiry short enough to recycle.",
      },
      {
        date: "2024-11-06",
        kind: "event",
        title: "Election gap — ship of problems",
        shortLabel: "Gap",
        summary: "Stock gaps to ~$288 in a single session",
        pivotal: true,
        narrative:
          "Trump wins and TSLA gaps ~$35 overnight. The stock is now already at the short strike with 12 trading days left. The short call is pricing the move + remaining extrinsic. This is the moment covered-call writers face a specific choice: roll up and out (buy back the short, sell a higher strike further out, pay a debit), or accept that you've capped this position and hold to expiry. Rolling is expensive here because IV spiked with the move — you'd be buying back high and selling into elevated premium, but the debit is real.",
        decision: {
          k: "The fork",
          v: "Roll up and out to recapture upside (costly, guaranteed debit), or accept the cap and let the original trade play out.",
        },
        oneLine:
          "The strike is already in play. Every dollar higher now costs the position 1:1.",
      },
      {
        date: "2024-11-15",
        kind: "event",
        title: "Rally continues — $320 · the miss compounds",
        shortLabel: "Grind",
        summary: "Stock at ~$320, short $280 call deep ITM at ~$45",
        pivotal: false,
        narrative:
          "TSLA keeps going. By mid-November the stock is in the $320s. The short $280 call is ~$45 — every dollar higher in the stock is now a dollar of mark-to-market loss on the option side that the stock is no longer compensating for (above the strike, stock and short call move 1:1 against each other by design). The covered-call position is frozen at its cap: max P/L = $288.90 − $262 cost basis = $26.90 per share, or $2,690 per contract. Everything above $288.90 is foregone.",
        oneLine:
          "Above the strike, stock and short call cancel out. The trade is already at max profit.",
      },
      {
        date: "2024-11-22",
        kind: "exit",
        title: "Assigned — stock called away at $280",
        shortLabel: "Assignment",
        summary:
          "Stock closes $352. Shares called away at $280. Missed $72 of additional upside.",
        pivotal: true,
        narrative:
          "Expiry. TSLA closes $352. The $280 call settles at $72 intrinsic — shares are called away at $280. The combined covered-call position realized its designed max: $280 sell − $262 cost basis + $8.90 premium = $26.90 per share (~10.3% in 17 trading days, very respectable in isolation). But the underlying in the same window went from $262 to $352 — a +$90 per share move. The covered call forfeited $63 per share of that ($352 − $288.90) versus just holding the stock naked. That's the trade-off in black and white: a covered call is a yield-enhancement on a neutral view, not a way to capture a breakout. When the view turns bullish (or a binary catalyst is likely), covered calls cost you far more than the premium they pay.",
        oneLine:
          "Max profit realized, but naked stock would have made $90. The premium never pays for a breakout.",
      },
    ],
    retrospective: {
      verdict: "Capped win — forfeited $63/share of upside for $8.90 of premium",
      pctOfMax: 1.0,
      lessons: [
        "A covered call sells the right tail of the stock's distribution. Any time the stock closes above strike + premium, you underperform just owning the shares.",
        "Selling covered calls into a known binary catalyst (earnings, elections, FDA) is usually the worst spot — the catalyst is exactly what drives a breakout, and that's what the short call caps.",
        "If you must sell premium into a catalyst, go further OTM and shorter-dated. You collect less, but you cap less upside and are less likely to be tested.",
        "'Max profit' on a covered call is not a win when the stock would have made 4x that naked. The right benchmark is the stock-only return, not the strategy's internal max.",
      ],
    },
  },
];
