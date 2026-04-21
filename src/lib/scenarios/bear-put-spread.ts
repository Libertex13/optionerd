import type { ScenarioConfig } from "./types";

export const bearPutSpreadScenarios: ScenarioConfig[] = [
  {
    id: "duol-bear-break",
    strategySlug: "bear-put-spread",
    title: "Scenario - AI thesis, earnings broke it down",
    subtitle:
      "DUOL · Oct–Nov 2025 · Bet on LLMs eating language learning. Earnings was the catalyst. Closed early at deep ITM.",
    ticker: "DUOL",
    from: "2025-10-17",
    to: "2025-11-14",
    contextFrom: "2025-04-01",
    contextTo: "2026-02-28",
    legs: [
      { side: "long", type: "put", strike: 250, expiry: "2025-11-21", qty: 1 },
      { side: "short", type: "put", strike: 200, expiry: "2025-11-21", qty: 1 },
    ],
    decisions: [
      {
        date: "2025-10-17",
        kind: "entry",
        title: "Open the put spread",
        shortLabel: "Entry",
        summary: "Bought the Nov 21 250/200 put spread",
        pivotal: true,
        narrative:
          "Duolingo is the cleanest AI-disruption short in consumer software. Language learning is arguably the product category most directly commoditized by foundation models — ChatGPT, Gemini, Claude all do conversational tutoring, translation, grammar drills for free. Meanwhile DUOL is priced for continued subscriber and engagement growth that I think is already rolling over. Catalyst: the next earnings print, where I expect guidance or engagement metrics to wobble. I buy the Nov 21 $250 put and sell the $200 against it — small debit, $50 width, lines up with the earnings window.",
        oneLine:
          "AI thesis: LLMs directly disrupt language learning. Earnings is the catalyst.",
      },
      {
        date: "2025-11-05",
        kind: "event",
        title: "Earnings — the thesis confirms",
        shortLabel: "Earnings",
        summary: "Soft forward commentary on engagement and AI pressure",
        pivotal: true,
        narrative:
          "Earnings hit and the market didn't like it. The headline numbers were okay, but forward commentary flagged exactly what the bear case was about — free AI-powered alternatives pressuring engagement and pricing on the paid tier. Stock gapped down and kept bleeding through the session. Long $250 put is now deep in the money; the short $200 is no longer a safe distance away.",
        decision: {
          k: "Catalyst delivered",
          v: "The thesis got its confirmation. No adjustment — let the stock keep running.",
        },
        oneLine: "Earnings did what the thesis needed. Let it play.",
      },
      {
        date: "2025-11-14",
        kind: "exit",
        title: "Deep ITM — close it",
        shortLabel: "Close",
        summary: "Both legs deep below their strikes, extrinsic evens out, near max",
        pivotal: true,
        narrative:
          "DUOL has kept sliding post-earnings, now trading well below the short strike. Both legs deep in the money. Here's the reasoning, step by step. The spread's max payoff is the $50 width minus the debit I paid — call that the max. Right now the mark is already sitting at roughly 95% of that max, because both legs are deep ITM and their remaining time values are both small and roughly offset — the extrinsic I'm short on the $200 put is nearly the same size as the extrinsic I'm long on the $250 put, so they cancel. Holding the last five trading days to expiry captures only the remaining ~5% as those last bits of extrinsic unwind — a small marginal gain on an already-realized win. And in exchange for that 5%, I'd carry a week of DUOL-can-reverse risk with capital and margin locked up. The math doesn't favor it. Close now, book the win, redeploy.",
        decision: {
          k: "The math",
          v: "Already ~95% of max. Holding to expiry adds maybe 5%. Not worth a week of capital lockup and reversal risk.",
        },
        oneLine:
          "95% of max already realized. The last 5% isn't worth a week of tail risk.",
      },
    ],
    retrospective: {
      verdict: "Win — AI thesis, earnings catalyst, closed early at deep ITM",
      pctOfMax: 0.95,
      lessons: [
        "When both legs go deep in the money, their remaining time values are small and roughly offset — the spread marks at close to its full width immediately, no theta-wait required.",
        "Closing early at deep ITM and holding to expiry pay near-identical dollars. The early exit frees capital and removes tail risk for almost no opportunity cost.",
        "Earnings is one of the cleanest catalysts for a directional options trade — known date, implied move priced in, binary resolution of the thesis.",
      ],
    },
  },
];
