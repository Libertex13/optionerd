import type { ScenarioConfig } from "./types";

export const shortStrangleScenarios: ScenarioConfig[] = [
  {
    id: "spy-yen-carry-unwind",
    strategySlug: "short-strangle",
    title: "Scenario - Short-vol survived the Aug 5 panic — barely",
    subtitle:
      "SPY · Jul–Aug 2024 · Sold the strangle in calm tape. Aug 5 yen carry unwind marked -9x the credit intraday. Held. Full profit by expiry.",
    ticker: "SPY",
    from: "2024-07-15",
    to: "2024-08-16",
    contextFrom: "2024-04-01",
    contextTo: "2024-10-31",
    legs: [
      { side: "short", type: "call", strike: 580, expiry: "2024-08-16", qty: 1 },
      { side: "short", type: "put", strike: 540, expiry: "2024-08-16", qty: 1 },
    ],
    decisions: [
      {
        date: "2024-07-15",
        kind: "entry",
        title: "Open the short strangle in calm tape",
        shortLabel: "Entry",
        summary:
          "Sold Aug 16 $580 call and $540 put for $3.38 combined credit — SPY at $561",
        pivotal: true,
        narrative:
          "SPY closes $561. VIX is sub-13. The market has grinded up for weeks; realized vol is running ~8%. Selling the $580C / $540P strangle — strikes roughly ±3.5% wide, 32 DTE — collects $3.38 per share. No defined-risk wings. Max profit is the full credit; max loss is in theory unlimited. The thesis is banal: nothing in the macro calendar should trigger more than a ±3% move, RV has been running well under IV, and 32 days of theta on both sides is a well-understood decay curve. It's also the most dangerous mental state in which to sell naked vol.",
        oneLine:
          "Selling vol in calm tape feels easy. That's when the tail risk is priced cheapest.",
      },
      {
        date: "2024-08-02",
        kind: "event",
        title: "Rate cut miss + soft payrolls — first crack",
        shortLabel: "Crack",
        summary: "SPY drops to $533 as recession fears bloom",
        pivotal: true,
        narrative:
          "Soft jobs report. Fed didn't cut at the July meeting. Carry-trade positioning in JPY starts to wobble. SPY drops 3% in two sessions to $533 — within spitting distance of the $540 short put. The trade is underwater for the first time. Experienced sellers would already be rolling the tested put down and/or closing. The untested call is free money by now; the put is the entire trade.",
        oneLine:
          "When one side is in play, the untested side is irrelevant. Focus.",
      },
      {
        date: "2024-08-05",
        kind: "event",
        title: "Carry unwind — VIX to 65, SPY to $510",
        shortLabel: "Panic",
        summary:
          "Japan rate hike triggers global carry unwind. Position marks −9x the credit intraday.",
        pivotal: true,
        narrative:
          "Monday Aug 5. Bank of Japan rate hike the prior Wednesday cascades into a wholesale unwind of the yen carry trade. Nikkei -12%, VIX spikes from 20 to 65, SPY opens gap-down at $511 and trades $510 intraday. The short $540 put is deep ITM, marking $30+ intraday on intrinsic + blown-out IV. Position mark-to-market: roughly -$28/share vs. $3.38 credit collected. On a $3.38 winner, that's a roughly 8–9x loss. Undefined-risk short vol at its most painful: a year of collected premium can be wiped in one session. The choice: close at -$2,800 per contract (locking in a career-scale loss), or hold because the position will survive IF nothing else breaks before expiry.",
        decision: {
          k: "The crucible",
          v: "Close and book an 8x loss on credit, or hold naked short vol through the worst gap since 2020. Only survivable if sized so the paper loss doesn't force your hand.",
        },
        oneLine:
          "Holding short vol through a tail event is only a choice if you sized small enough to still be in the trade.",
      },
      {
        date: "2024-08-09",
        kind: "decay",
        title: "Recovery — VIX collapses back to 20",
        shortLabel: "Recovery",
        summary: "SPY reclaims $535 as carry unwind stabilizes",
        pivotal: false,
        narrative:
          "By Friday of that week, the panic has passed. Dealers have rehedged, carry positions are flattened, and VIX has retraced to the low 20s. SPY climbs back above $530. The put mark collapses from ~$30 intraday peak to the mid-teens. The short call is untouchable. The worst is over and the position is back to a mild mark-to-market loss — recoverable on IV crush and time decay alone if SPY holds here.",
        oneLine:
          "The IV crush is as violent as the spike. Most of the damage reverses fast.",
      },
      {
        date: "2024-08-16",
        kind: "exit",
        title: "Expiry — full credit captured",
        shortLabel: "Expiry",
        summary:
          "SPY closes $554. Both legs settle at $0.01. Full $338 credit banked.",
        pivotal: true,
        narrative:
          "Expiry. SPY closes $554 — inside the short strikes, despite the week-ago chaos. Both options go out at a penny. Full $338 credit realized. The P/L line is 'won full max'. The truthful P/L line is 'nearly lost a decade of premium in one session, and the only thing that saved the trade was position size being small enough not to force a capitulation'. A trader sized the same position 4x larger and they would have closed at -$12,000 and never come back.",
        oneLine:
          "Full max realized. The trade that lived depended entirely on size, not skill.",
      },
    ],
    retrospective: {
      verdict: "Full credit · survived by refusing to close at −9x intraday",
      pctOfMax: 1.0,
      lessons: [
        "Undefined-risk short vol earns slowly and loses in single sessions. The distribution of outcomes is not normal — it's small wins, small wins, small wins, catastrophic loss.",
        "Selling in low-IV tape is selling cheap tails. The cheaper the tail, the less it pays to be wrong about it.",
        "Sizing is the only edge that survives a tail event. Any position sized such that a -8x mark-to-market forces capitulation was always a lost trade — you just didn't know until the event hit.",
        "An iron condor caps the tail at the width of the wings. For nearly all sellers nearly all the time, the defined-risk version is the structurally correct choice.",
      ],
    },
  },
];
