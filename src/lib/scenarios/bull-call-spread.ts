import type { ScenarioConfig } from "./types";

export const bullCallSpreadScenarios: ScenarioConfig[] = [
  {
    id: "nvda-too-fast",
    strategySlug: "bull-call-spread",
    title: "Scenario - Too fast in your favor",
    subtitle:
      "NVDA · May–Sept 2025 · The trade was right on day one. Theta still had to finish the job.",
    ticker: "NVDA",
    from: "2025-05-15",
    to: "2025-09-19",
    contextFrom: "2025-02-03",
    contextTo: "2025-10-17",
    legs: [
      { side: "long", type: "call", strike: 150, expiry: "2025-09-19", qty: 1 },
      {
        side: "short",
        type: "call",
        strike: 180,
        expiry: "2025-09-19",
        qty: 1,
      },
    ],
    decisions: [
      {
        date: "2025-05-15",
        kind: "entry",
        title: "Open the spread",
        shortLabel: "Entry",
        summary: "Bought the Sept 150/180 spread",
        pivotal: true,
        narrative:
          "NVDA around $115 coming out of a rough spring. I like the setup for a summer run. I buy the Sept 19 $150 call and sell the $180 against it. Net debit works out to roughly $3 per share — max profit is the $30 width minus what I paid, call it $27.",
        oneLine:
          "Open debit small, max wide. The thesis is simple: a summer rally that clears $180 by expiry.",
      },
      {
        date: "2025-07-18",
        kind: "event",
        title: "Rally — but the spread isn't paying what it should ...",
        shortLabel: "PT",
        summary: "NVDA near $165, short leg loaded with time value",
        pivotal: true,
        narrative:
          "NVDA has run from $115 to about $165. Long $150 call is deep ITM. But the short $180 still has two months left and it's carrying real extrinsic value — every dollar the stock moves lifts both legs, so the net payoff barely budges. Stock has moved $50 since entry; my mark is nowhere near max. Nothing is wrong. The trade just needs time.",
        decision: {
          k: "The trap",
          v: "Stock ripped $50 in my favor, yet my P/L barely moved. Why? The short leg is short extrinsic I can't capture yet.",
        },
        oneLine:
          "The mark lags the stock — that's normal for a spread. The trade is working; theta just hasn't finished yet.",
      },
      {
        date: "2025-08-22",
        kind: "decay",
        title: "The dilemma — wait or lock in?",
        shortLabel: "Decision",
        summary: "Above the short strike with a month of theta left to harvest",
        pivotal: true,
        narrative:
          "A month to expiry. NVDA in the low $180s. Both legs are ITM — structurally I'm at max. But the short $180 still holds a few bucks of extrinsic that only unwinds as theta burns out. If NVDA rolls back through $180 before Sept 19, I give that right back. This is the real question on every debit spread that works too fast: close now at 85% of max and take the risk off, or hold another month to collect the last strip of time value?",
        decision: {
          k: "Decision",
          v: "Hold through expiry. Size the position small enough that the drawdown risk is bearable; otherwise take 85% and book it.",
        },
        oneLine:
          "The last 15% of max profit costs you a month of gamma risk. Always an honest tradeoff.",
      },
      {
        date: "2025-09-19",
        kind: "exit",
        title: "Expiry",
        shortLabel: "Expiry",
        summary: "Full max profit realized",
        pivotal: true,
        narrative:
          "NVDA settled above $180. Both legs cash out at intrinsic, the spread pays the full $30 width, net P/L on the $3 debit is the maximum. Same dollars as closing mid-August — but with a month of held drawdown risk I didn't have to carry. The lesson was never about the exit. It was about understanding why the mark lagged the stock the whole time.",
        oneLine:
          "Max profit realized. Same dollars as closing early, at the cost of a month of held risk.",
      },
    ],
    retrospective: {
      verdict: "Win — full width collected after a month of patience",
      pctOfMax: 1.0,
      lessons: [
        "A fast favorable move punches you through the short strike early, but max profit only lands once the short leg's extrinsic fully decays.",
        "The long leg maxes its payoff the instant it's deep ITM; the short leg's time value is what gates your P/L.",
        "Close early at 75–85% of max if the remaining theta isn't worth the gamma and reversal risk you'd carry to collect it.",
        "The mistake is expecting P/L to move like the stock. It doesn't — it moves like the spread's total extrinsic.",
      ],
    },
  },
];
