import type { ScenarioConfig } from "./types";

export const bearCallSpreadScenarios: ScenarioConfig[] = [
  {
    id: "tsla-parabolic-top",
    strategySlug: "bear-call-spread",
    title: "Scenario - Fading the parabola — tested max loss on day two",
    subtitle:
      "TSLA · Dec 2024–Jan 2025 · Sold a call spread into the euphoria top. The next day the spread marked at max loss intraday before collapsing.",
    ticker: "TSLA",
    from: "2024-12-17",
    to: "2025-01-17",
    contextFrom: "2024-10-01",
    contextTo: "2025-03-01",
    legs: [
      { side: "short", type: "call", strike: 480, expiry: "2025-01-17", qty: 1 },
      { side: "long", type: "call", strike: 500, expiry: "2025-01-17", qty: 1 },
    ],
    decisions: [
      {
        date: "2024-12-17",
        kind: "entry",
        title: "Sell the call spread into the parabola",
        shortLabel: "Entry",
        summary:
          "Sold Jan 17 $480C / bought $500C · $8.20 credit on a $20-wide spread",
        pivotal: true,
        narrative:
          "TSLA is at $480 after a near-vertical two-month rally from $240. The move is entirely narrative-driven post-election; fundamentals haven't changed. IV is elevated both from the move and from year-end risk-on. The $480 short call collects $41.45; buying the $500 against it costs $33.25. Net credit $8.20 on a $20-wide spread — $820 max profit, $1,180 max loss. 41% of max width captured in credit, unusually rich because IV is screaming. The bet: parabolic moves mean-revert and the short strike is 'high enough' for most reasonable retraces.",
        oneLine:
          "Sell into euphoria IV, cap max loss with the long wing, let mean-reversion work.",
      },
      {
        date: "2024-12-18",
        kind: "event",
        title: "Stock prints $488 intraday — max loss tested",
        shortLabel: "Stress",
        summary: "Intraday high $488, short strike breached by $8",
        pivotal: true,
        narrative:
          "Day two. TSLA opens up and rips intraday to $488 — through the short strike. The spread marks at roughly max loss during the print. This is the test: the whole trade either dies here or is justified by what happens next. Two things matter. First, the mark is temporary — at $488 the spread is ~$8 ITM with 30 days to expire, meaning intrinsic is $8 but extrinsic is still significant on both legs (each carries vega). Second, no one ever pays max loss intraday unless they panic-close. The stock closes the session at $440, back below the short strike, and the spread marks at ~$5 debit — already in profit. The stress was real but so was the defined risk: the long wing kept max loss bounded to an amount that was survivable.",
        decision: {
          k: "The test",
          v: "Intraday breach of the short strike is gut-wrenching but not structurally damaging — extrinsic still protects you, and the wing caps it. Close only if the thesis broke.",
        },
        oneLine:
          "Max-loss intraday. Then the stock rolled over by close. The wing is what let this moment be survivable.",
      },
      {
        date: "2025-01-02",
        kind: "event",
        title: "Parabola breaks — stock rolls to $379",
        shortLabel: "Break",
        summary: "TSLA carves through $400 support, spread deeply OTM",
        pivotal: false,
        narrative:
          "Into the new year, the parabola cracks. TSLA opens 2025 at $390 and rolls down to the $370s within days. Delivery data starts to print soft, and the narrative tailwind exhausts. The $480 short strike is now $100 away with two weeks to expiry — probability of finishing ITM approaches zero. The spread can be closed for essentially nothing (~$0.10), locking in ~$810 of the $820 max profit. A pro would close here and redeploy rather than hold the last $10 for two more weeks.",
        oneLine:
          "The thesis played out. Close the spread now, redeploy the capital.",
      },
      {
        date: "2025-01-17",
        kind: "exit",
        title: "Expiry — full credit captured",
        shortLabel: "Expiry",
        summary: "TSLA closes $426, both calls pin at $0.01",
        pivotal: true,
        narrative:
          "At expiry, TSLA closes $426 — well below the short strike. Both calls go out at a penny. Full $820 credit captured, ~70% return on risk in 31 days. The post-mortem that matters is Dec 18: the short strike was breached intraday and the mark was sitting at max loss. The decision to hold was only defensible because (a) the wing existed and capped the catastrophe, (b) the position was sized so max loss was survivable, and (c) nothing in the thesis had changed — the parabola was still a parabola, just one day older. Take away any one of those three and closing at the test would have been right.",
        oneLine:
          "Full credit captured. The win was bought on Dec 18 by not panic-closing the tested leg.",
      },
    ],
    retrospective: {
      verdict: "Full credit · 70% on risk · survived Day 2 at max loss intraday",
      pctOfMax: 1.0,
      lessons: [
        "Selling credit spreads into parabolic moves pays extremely rich credits because IV is elevated — but day-two gap risk is just as elevated. Size small enough to survive the test.",
        "A defined-risk spread's long wing is only valuable if it stops you from panic-closing at max loss. Without the discipline, the wing is just a cost center.",
        "Intraday breaches of the short strike are nearly always worse than the damage implies — extrinsic value still cushions both legs, and close-on-close is what matters for assignment.",
        "Close credit spreads at 80–90% of max profit when the trade fully works. Holding the last 10% for two more weeks is a terrible risk-adjusted play.",
      ],
    },
  },
];
