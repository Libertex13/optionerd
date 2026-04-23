import type { ScenarioConfig } from "./types";

export const longCallScenarios: ScenarioConfig[] = [
  {
    id: "tsla-election-run",
    strategySlug: "long-call",
    title: "Scenario - Cheap call, election catalyst, giving back $60 of peak",
    subtitle:
      "TSLA · Nov–Dec 2024 · Bought OTM calls into the election. The thesis hit — the real lesson was about when to take it off.",
    ticker: "TSLA",
    from: "2024-11-04",
    to: "2024-12-20",
    contextFrom: "2024-07-01",
    contextTo: "2025-01-31",
    legs: [
      { side: "long", type: "call", strike: 260, expiry: "2024-12-20", qty: 1 },
    ],
    decisions: [
      {
        date: "2024-11-04",
        kind: "entry",
        title: "Open the long call",
        shortLabel: "Entry",
        summary: "Bought the Dec 20 $260 call ahead of the election",
        pivotal: true,
        narrative:
          "TSLA is around $242 on election eve. The bet is simple: if Trump wins, Tesla gets a policy-narrative tailwind and the stock re-rates. The $260 call expiring Dec 20 is ~$12. That's the entire risk — if the election goes the other way, or the reaction fades, the position goes to zero. If it works, the leverage is enormous because the call is starting OTM with a big implied move already in it.",
        oneLine:
          "Buy an OTM call, risk the premium, leverage a binary catalyst.",
      },
      {
        date: "2024-11-06",
        kind: "event",
        title: "Election gap — thesis confirmed on day one",
        shortLabel: "Catalyst",
        summary: "Stock gaps to the high $280s, call goes from OTM to deep ITM",
        pivotal: true,
        narrative:
          "Trump wins. TSLA gaps from $250 to ~$288 in a single session. The $260 call is now ITM with a month to run. The mark roughly triples on the open. This is the 'what do I do now' moment that defines every long-call trade. The catalyst has fired, but there's still a month of theta left and more potential upside as the policy narrative plays out. Take the easy 3x, or let it run?",
        decision: {
          k: "The choice",
          v: "Sell for a quick 3x, or hold for a potential 10x if momentum persists. Sizing matters — if this is a small slice of the book, let it run.",
        },
        oneLine:
          "The catalyst hit on day one. Now it's a sizing question, not a directional one.",
      },
      {
        date: "2024-12-18",
        kind: "event",
        title: "Parabolic top — the best exit you never took",
        shortLabel: "Peak",
        summary: "Stock prints $488 intraday; call worth ~$228",
        pivotal: true,
        narrative:
          "TSLA has gone parabolic. Intraday print $488, close $440. The $260 call is worth ~$180–$228 depending on when you look. From a $12 entry, that's 15–19x. Everything the thesis hoped for and more. The honest tell: the move has been vertical for two weeks, IV is elevated, and the call is now pure intrinsic — all the convexity is gone. Delta is pinned at 1, which means from here the call moves dollar-for-dollar with the stock both ways. There is no more asymmetric payoff.",
        decision: {
          k: "The trap",
          v: "Deep ITM calls lose their edge. You're now just holding leveraged stock with two days of gamma risk. The right exit is here — take the 15–19x.",
        },
        oneLine:
          "Once delta hits 1, a long call is just stock with expiry risk. The asymmetry is gone.",
      },
      {
        date: "2024-12-20",
        kind: "exit",
        title: "Expiry — gave back $60 of peak",
        shortLabel: "Expiry",
        summary: "Stock closes $421, call worth $161",
        pivotal: true,
        narrative:
          "Two sessions after the peak, TSLA has already pulled back $67. Expiry closes the book at $421 spot, $161 per contract — still a 13.6x return on the $12 debit, an excellent outcome in absolute terms. But the peak was $228. The trade gave back $67 per contract — more than 5x the original risk — in 48 hours because the call was held past its asymmetric phase. The win is still huge. The lesson is that a long call stops being a long call the moment delta pins at 1. After that, you're in a stock trade you didn't plan for.",
        oneLine:
          "13.6x realized, but $67 of give-back in the last two days. The win masked a real mistake.",
      },
    ],
    retrospective: {
      verdict: "Win — 13.6x on the debit, but peak was 19x two days earlier",
      pctOfMax: 0.72,
      lessons: [
        "Long calls pay their asymmetric premium early. Once the call is deep ITM and delta ≈ 1, the convexity is gone and you're holding leveraged stock with a decay clock.",
        "The right exit on a long call that works is usually *before* expiration, not at it — especially after a parabolic move where the next move statistically mean-reverts.",
        "Binary catalysts (elections, earnings, FDA) are the cleanest setups for OTM long calls — known date, defined risk, and IV crush can be survived if your strike goes deep ITM fast.",
        "Sizing determines whether you hold or trim. A 1% position that 15x'd can be let run; a 10% position should be trimmed at every multiple to manage correlation to one catalyst.",
      ],
    },
  },
];
