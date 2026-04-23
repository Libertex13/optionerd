import type { ScenarioConfig } from "./types";

export const ironCondorScenarios: ScenarioConfig[] = [
  {
    id: "spy-oct-nov-2025",
    strategySlug: "iron-condor",
    title: "Scenario - Tested the short call, survived the wings, held full credit",
    subtitle:
      "SPY · Oct 15–Nov 21, 2025 · The classic workhorse condor: short call tested on the close, boring expiry, full credit captured.",
    ticker: "SPY",
    from: "2025-10-15",
    to: "2025-11-21",
    contextFrom: "2025-08-01",
    contextTo: "2025-12-31",
    legs: [
      { side: "short", type: "call", strike: 690, expiry: "2025-11-21", qty: 1 },
      { side: "long", type: "call", strike: 700, expiry: "2025-11-21", qty: 1 },
      { side: "short", type: "put", strike: 640, expiry: "2025-11-21", qty: 1 },
      { side: "long", type: "put", strike: 630, expiry: "2025-11-21", qty: 1 },
    ],
    decisions: [
      {
        date: "2025-10-15",
        kind: "entry",
        title: "Open the 37-DTE iron condor",
        shortLabel: "Entry",
        summary:
          "Sold $690C/$640P · Bought $700C/$630P · $3.51 total credit on $10 wings",
        pivotal: true,
        narrative:
          "SPY closes $665 in a chop-above-trend market. Implied vols are elevated off post-Liberation-Day unease but realized vol has been running well below implied for weeks. Setting up a 37-DTE iron condor: short the $690 call / $640 put (~±3.7% OTM, roughly 16-delta shorts on each side), long the $700 call / $630 put as defined-risk wings. Net credit $3.51 on $10-wide wings. Max profit $351, max loss $649. Break-evens $636.49 and $693.51 — a ~9% wide profit zone at entry. The bet is simple: the market stays inside the wings, IV contracts, and theta collects steadily.",
        oneLine:
          "Boring trade: 16-delta shorts, $10 wings, 37 DTE, 35% return on risk if held to max.",
      },
      {
        date: "2025-10-29",
        kind: "event",
        title: "Short call tested — intraday print 689.70",
        shortLabel: "Tested",
        summary: "SPY prints $689.70 intraday. Short $690 call within a dime.",
        pivotal: true,
        narrative:
          "Mid-condor, SPY rallies to $689.70 intraday — a hair below the $690 short strike — before closing $687.39. Short strike essentially kissed but never breached on the close. The position marks at a small loss (~-$131) against entry credit. This is the exact moment short-strangle sellers panic — the strike is in play with three weeks to run, IV just spiked, and the short call is up ~3x from entry. For an iron condor, though, the $700 long wing caps the maximum additional damage. If SPY had kept running to $700+ into expiry, max loss would be $649 — a known, sized-for number, not a runaway.",
        decision: {
          k: "The wing value",
          v: "Short strangle here means facing unlimited upside risk. Condor caps it at $649 — knowable, survivable, sleep-at-night.",
        },
        oneLine:
          "Short strike tested. The wings made holding through it a policy, not a panic.",
      },
      {
        date: "2025-11-10",
        kind: "decay",
        title: "At 50% — the textbook close",
        shortLabel: "50%",
        summary:
          "SPY ~$677, condor marks ~$1.70 debit to close — ~50% of max profit",
        pivotal: true,
        narrative:
          "Mid-November. SPY has pulled back to $677 — inside both shorts. IV has contracted and theta has done work. The condor can be closed for roughly $1.70 debit, meaning ~$180 of the $351 credit is already banked (~51% of max). This is the textbook exit for systematic premium sellers: close at 50% of max, redeploy capital into the next 30–45 DTE cycle. The remaining $1.70 of extrinsic takes another 11 days to decay, during which gamma risk accelerates. Return on risk per day is worst in the final two weeks.",
        decision: {
          k: "Management",
          v: "Take 50% and rotate. Holding the last $171 to expiration exposes the position to full gamma through OpEx week for diminishing theta.",
        },
        oneLine:
          "Best risk-adjusted exit is 50% of max. Holding for 100% is available but not optimal.",
      },
      {
        date: "2025-11-21",
        kind: "exit",
        title: "Expiry — full credit, boring success",
        shortLabel: "Expiry",
        summary: "SPY closes $659. All four legs pin at $0.01. Full $351 captured.",
        pivotal: true,
        narrative:
          "Expiry. SPY settles at $659 — comfortably between the $640 put and the $690 call. Every leg pins at a penny. Full credit realized: $351 on $649 risk, 54% return on risk in 37 days. A nice win in absolute terms, but the lesson is about the trade PATH, not the final P/L: a short strangle with the same shorts would have marked worse on Oct 29, would have earned the same full credit at expiry, but would have forced a different psychological journey. The condor's wings aren't a tax on the trade — they're what makes the discipline of 'hold through the test' economically rational.",
        oneLine:
          "Full max captured. The wings didn't cost a point of credit — they bought the discipline.",
      },
    ],
    retrospective: {
      verdict: "Full credit · 54% on risk · survived one tested short on the close",
      pctOfMax: 1.0,
      lessons: [
        "Iron condors are defined-risk workhorses. The edge comes from repeated cycles of 30–45 DTE entries, 50% profit exits, and rotating capital — not from winning big on any one trade.",
        "The wings enable the discipline. A short strangle at the same strikes produces the same final P/L in the best case, but forces panic-closing under mark-to-market stress that a condor doesn't.",
        "Intraday touches of the short strike are survivable; closes matter more than intra-session ticks. Extrinsic protects you on tests, and the wings protect you if the test keeps running.",
        "Close at 50% of max. The last half of the credit requires as much gamma-week exposure as the first half, for diminishing theta. Poor risk-adjusted holding.",
      ],
    },
  },
];
