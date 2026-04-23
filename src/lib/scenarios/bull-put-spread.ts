import type { ScenarioConfig } from "./types";

export const bullPutSpreadScenarios: ScenarioConfig[] = [
  {
    id: "nvda-deepseek-iv-crush",
    strategySlug: "bull-put-spread",
    title: "Scenario - Selling into panic — IV spike + price recovery",
    subtitle:
      "NVDA · Jan–Feb 2025 · The DeepSeek panic ripped NVDA -17% in a day and inflated put IV. Selling the spread into that fear paid full credit.",
    ticker: "NVDA",
    from: "2025-01-27",
    to: "2025-02-21",
    contextFrom: "2024-10-01",
    contextTo: "2025-04-01",
    legs: [
      { side: "short", type: "put", strike: 115, expiry: "2025-02-21", qty: 1 },
      { side: "long", type: "put", strike: 105, expiry: "2025-02-21", qty: 1 },
    ],
    decisions: [
      {
        date: "2025-01-27",
        kind: "entry",
        title: "Open the credit spread into the panic",
        shortLabel: "Entry",
        summary:
          "Sold Feb 21 $115 put / bought $105 put · $3.14 credit on a $10-wide spread",
        pivotal: true,
        narrative:
          "DeepSeek. NVDA is down -17% in a single session on a paper arguing Chinese training costs can undercut the western AI capex narrative. The stock closes $118, having traded as low as $116 intraday. Put IV is parabolic — the $115 put with 25 DTE is trading $5.95. The bet: the panic is overdone, dealers have monetized retail fear, and any stabilization collapses put skew. Sell the $115 put and buy the $105 put for protection. Net credit $3.14. Max loss $6.86 on a $10-wide spread. This is the classic 'sell IV when fear peaks' setup.",
        oneLine:
          "Enter at max fear, collect inflated premium, let IV crush + time do the work.",
      },
      {
        date: "2025-02-03",
        kind: "event",
        title: "The retest — stock touches $113 intraday",
        shortLabel: "Retest",
        summary: "NVDA prints $113 low, sits ~$2 below the short strike",
        pivotal: true,
        narrative:
          "A week in, the market retests the lows. NVDA trades down to $113 intraday — below the short strike — before closing $116.66. Gamma risk on a short put spread peaks right here: every dollar lower the stock goes, the short leg picks up delta and vega aggressively, and the mark bleeds much faster than the linear P/L would suggest. This is where undercapitalized or overextended sellers cut losses. But IV has already come in meaningfully from Jan 27, and the spread is still carrying enough credit to make the hold worthwhile. The question becomes whether the close is above the short — it is ($116.66), by a dollar.",
        decision: {
          k: "The pressure point",
          v: "Tested intraday but held on the close. Short put spreads with an intact thesis survive this moment; most blow up here from panic-closing.",
        },
        oneLine:
          "Tested but held. The mark marked bad; the thesis held intact.",
      },
      {
        date: "2025-02-13",
        kind: "decay",
        title: "50% of max — take profit or hold?",
        shortLabel: "50%",
        summary:
          "NVDA back to $135, spread marks at ~$1.50. Half the credit is captured.",
        pivotal: true,
        narrative:
          "NVDA has recovered to the $135 area. The spread, which was worth $3.14 in credit at entry, now marks at roughly $1.50 to close — meaning 50%+ of max profit is already in hand. This is the classic management decision on a credit spread: close at 50% and recycle the capital into the next trade, or hold to expiration and try to collect the last $1.50? Pros generally take the 50%. The remaining credit earns you gamma risk for diminishing reward — if NVDA rolls over again in the last 8 DTE, that $1.50 can flip to a -$5 loss surprisingly fast.",
        decision: {
          k: "The 50% rule",
          v: "Taking 50% early and recycling capital is where most credit-spread alpha comes from over many trades. Sitting for the last dollar is statistically bad.",
        },
        oneLine:
          "Taking 50% and recycling beats holding for 100% on a risk-adjusted basis.",
      },
      {
        date: "2025-02-21",
        kind: "exit",
        title: "Expiry — both puts worthless, full credit captured",
        shortLabel: "Expiry",
        summary: "NVDA closes $134, both puts pin at $0.01",
        pivotal: true,
        narrative:
          "Expiry. NVDA closes $134, both legs settle at a penny. Full $314 credit captured on $686 of max risk — a 45.8% return on risk in 25 days. But 'holding to max' isn't the real lesson here. The real lesson is the decision on Feb 3 during the retest: most traders panic-close spreads when the short strike gets touched intraday, even when the thesis is intact and IV has already come in. The dollars earned by this trade came from fighting the instinct to close for a small loss when the stock was still above the short strike on the close.",
        oneLine:
          "Full max. The money was made on Feb 3 by not panicking, not by holding the last week.",
      },
    ],
    retrospective: {
      verdict: "Full credit · 45.8% on risk · IV crush + stabilization did the work",
      pctOfMax: 1.0,
      lessons: [
        "The best time to sell put credit spreads is usually the day or two after a panic — IV is peak, but stabilization is statistically more likely than continuation.",
        "An intraday touch of the short strike is not a signal to close. The close above (or not) is what matters for both mark-to-market and assignment risk.",
        "Take profit at 50% on credit spreads. The last half of the credit requires as much gamma risk as the first half — but with diminishing reward.",
        "Max loss > max profit means one ungated loser kills several winners. Sizing and mechanical exit rules matter more than being right on any individual trade.",
      ],
    },
  },
];
