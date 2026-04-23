import type { ScenarioConfig } from "./types";

export const longPutScenarios: ScenarioConfig[] = [
  {
    id: "tsla-q1-breakdown",
    strategySlug: "long-put",
    title: "Scenario - Right thesis, wrong timing — survived the drawdown",
    subtitle:
      "TSLA · Jan–Mar 2025 · The put dropped 48% before the thesis played out. Most traders cut here. Holding tripled the position.",
    ticker: "TSLA",
    from: "2025-01-02",
    to: "2025-03-21",
    contextFrom: "2024-10-01",
    contextTo: "2025-05-01",
    legs: [
      { side: "long", type: "put", strike: 380, expiry: "2025-03-21", qty: 1 },
    ],
    decisions: [
      {
        date: "2025-01-02",
        kind: "entry",
        title: "Open the long put",
        shortLabel: "Entry",
        summary: "Bought the Mar 21 $380 put after the post-election parabola",
        pivotal: true,
        narrative:
          "TSLA closed 2024 just under $380 after ripping from $240 in two months on election euphoria. The move looked parabolic and disconnected — P/E north of 100, deliveries growth decelerating, valuation entirely narrative-driven. The trade was to fade the euphoria with 80 days of time. Bought the $380 put at ~$41 per share, risking the premium as the defined max loss. No short-sale borrow cost, no margin call risk on an upside squeeze. Clean defined-risk bearish expression.",
        oneLine:
          "Parabolic move + weakening fundamentals + long expiry = the classic long-put setup.",
      },
      {
        date: "2025-01-17",
        kind: "event",
        title: "The stock rips AGAINST the thesis — drawdown to -48%",
        shortLabel: "Test",
        summary: "TSLA pushes to $426, put mark drops from $41 to ~$21",
        pivotal: true,
        narrative:
          "Two weeks in, TSLA has ignored every bear and pushed to a new closing high at $426. The $380 put is down from $41 to $21 — a ~48% mark-to-market drawdown. This is the hardest moment of any long-put trade: the thesis is fundamental and slow-moving, but the mark is real-time and screaming that you're wrong. Most traders capitulate here. The question is whether anything in the *thesis* has changed, or whether only the *price* has. It hasn't — fundamentals are the same or worse. Hold.",
        decision: {
          k: "The capitulation trap",
          v: "A 48% drawdown on a defined-risk put is only painful if it forces you out. Size so the drawdown is psychologically survivable, then check thesis not price.",
        },
        oneLine:
          "The drawdown tests conviction, not the thesis. Nothing changed — hold.",
      },
      {
        date: "2025-02-25",
        kind: "event",
        title: "Thesis starts working — stock breaks $300",
        shortLabel: "Break",
        summary: "TSLA below $300, put back above entry",
        pivotal: false,
        narrative:
          "The momentum reverses in late January as delivery data disappoints and the narrative cracks. By late February the stock has carved through $350, $320, and now $300. The put is ITM and back through the entry price. From here the math starts to favor the position: every dollar lower adds ~$1 to the put, and time decay has been compressed into the long tail where it doesn't hurt much yet.",
        oneLine:
          "Thesis finally working. The drawdown phase bought us time to be right.",
      },
      {
        date: "2025-03-21",
        kind: "exit",
        title: "Expiry — deep ITM, 3.2x on the debit",
        shortLabel: "Expiry",
        summary: "TSLA closes $249, put worth $131",
        pivotal: true,
        narrative:
          "TSLA settled at $249 at expiry. The $380 put is worth $131 — 3.2x the $41 debit. The stock had touched $217 intraday earlier in the month; the put had marked as high as $150 then. Holding to expiry versus closing at the low cost a few percentage points, not the trade. The real P/L swing wasn't entry vs. exit — it was the discipline to hold through the -48% drawdown in January when nothing in the thesis had changed.",
        oneLine:
          "3.2x realized. The actual alpha was refusing to cut at -48% in January.",
      },
    ],
    retrospective: {
      verdict: "Win — 3.2x on the debit; real edge was surviving the drawdown",
      pctOfMax: 0.82,
      lessons: [
        "Long puts are the cleanest way to short a parabolic move — defined risk, no borrow, no margin call, survives a squeeze.",
        "A long-dated put will mark down sharply if the stock continues higher before the thesis plays out. Size so a 40–60% paper drawdown is survivable.",
        "Check the thesis, not the mark. If fundamentals are unchanged and price has just gotten more extreme, conviction should increase, not decrease.",
        "Give the thesis time. Buying 60–90 DTE puts for a macro/fundamental thesis gives room for timing to be wrong without theta burning you out.",
      ],
    },
  },
];
