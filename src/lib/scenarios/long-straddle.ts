import type { ScenarioConfig } from "./types";

export const longStraddleScenarios: ScenarioConfig[] = [
  {
    id: "tsla-q3-earnings-pop",
    strategySlug: "long-straddle",
    title: "Scenario - Bought the earnings straddle, held past the IV crush",
    subtitle:
      "TSLA · Oct 22–Nov 1, 2024 · Post-earnings pop blew past the implied move. Peak P/L was Day 2. Holding a week cost half of it.",
    ticker: "TSLA",
    from: "2024-10-22",
    to: "2024-11-01",
    contextFrom: "2024-08-01",
    contextTo: "2024-11-30",
    legs: [
      { side: "long", type: "call", strike: 215, expiry: "2024-11-01", qty: 1 },
      { side: "long", type: "put", strike: 215, expiry: "2024-11-01", qty: 1 },
    ],
    decisions: [
      {
        date: "2024-10-22",
        kind: "entry",
        title: "Buy the ATM straddle going into earnings",
        shortLabel: "Entry",
        summary: "Bought Nov 1 $215 call + $215 put · $19.00 total debit",
        pivotal: true,
        narrative:
          "TSLA trades $218 the day before earnings. The Nov 1 $215 straddle — ATM and 10 DTE — is priced at $19 total ($11.20 call + $7.80 put). That's the market's implied 1-standard-deviation move: roughly ±$19 or about 8.7%. The thesis: TSLA routinely posts earnings gaps that outstrip the straddle's implied move — especially when results diverge meaningfully from consensus in either direction. Breakevens at $196 and $234. No directional view; pure long-gamma, long-vega bet that realized move > implied move.",
        oneLine:
          "Pay the implied move. Win if the realized move exceeds it. Lose if the stock pins.",
      },
      {
        date: "2024-10-23",
        kind: "event",
        title: "Earnings after close — results vs consensus",
        shortLabel: "Print",
        summary: "Q3 beat on margins + FCF. Stock gaps in after-hours.",
        pivotal: true,
        narrative:
          "TSLA reports after the bell. Margins and free cash flow surprise meaningfully to the upside, and guidance nudges the FSD/robotaxi narrative forward. The after-hours print is immediate: stock gaps from $213.65 close to the $240s on the open the next day. In the straddle: the call is about to become deeply ITM, the put is about to become close to worthless. IV collapses everywhere — but the winner leg's delta is now ~1, so the gamma that matters has already paid out in a single session.",
        oneLine:
          "Gap up. The call became leveraged stock overnight. The put crushed.",
      },
      {
        date: "2024-10-24",
        kind: "decay",
        title: "Peak — the next morning is the exit",
        shortLabel: "Peak",
        summary:
          "Stock $260, straddle marks $46.50 — +145% on the debit in two days",
        pivotal: true,
        narrative:
          "By the close of Oct 24, TSLA is at $260. The $215 call is worth $46.20. The $215 put — the side that was supposed to be the hedge — is worth $0.30, down from $7.80. Total straddle mark: $46.50, up from $19 paid. That's +$2,750 per contract in two sessions. Critically, this is the maximum value the trade will reach: the IV crush on the call has already happened (extrinsic is ~nothing with delta 1), and every dollar higher in the stock is now +$1 to the call, 1:1. But every dollar LOWER in the stock is also -$1 now — the straddle is no longer long gamma in any meaningful way. The correct exit is right here.",
        decision: {
          k: "The exit moment",
          v: "Once the winning leg is deep ITM, a straddle is just long stock plus a worthless option. The asymmetric payoff is over — close and redeploy.",
        },
        oneLine:
          "Straddles peak in the 24h post-event. After that, you're just holding leveraged stock.",
      },
      {
        date: "2024-11-01",
        kind: "exit",
        title: "Expiry — the week of mean reversion cost half the peak",
        shortLabel: "Expiry",
        summary:
          "Stock closes $249, straddle worth $34.15 — gave back $12.35/share",
        pivotal: true,
        narrative:
          "Held to expiry instead of closing on Oct 24. Over the subsequent week, TSLA drifted back from the $270 post-election-eve high into the $250s. The put is worthless either way, but the call moved 1:1 against the stock in that retrace — from $46 down to $34. Still a +$15.15/share win on the original $19 debit (~80% return in 10 days), but the peak was +$27.50/share. Holding from Day 2 to Day 10 forfeited 45% of the already-realized maximum for the cost of carrying delta-1 exposure at elevated IV. The winning straddle isn't the one you hold to expiry — it's the one you recognize has already won.",
        oneLine:
          "+80% held to expiry, but +145% was already on the table on Day 2.",
      },
    ],
    retrospective: {
      verdict: "Win — +80% on the debit; peak was +145% a week earlier",
      pctOfMax: 0.55,
      lessons: [
        "A straddle's max expected value lives in the first 24 hours after the catalyst. IV crushes, delta on the winning leg pins at 1, and the trade stops being about volatility.",
        "Realized > implied is the whole game. A 10% earnings move beats a $19 straddle on a $220 stock; a 5% move doesn't, even though it looks violent.",
        "Exit the straddle on the post-event move, not at expiry. Holding after the winner goes deep ITM converts a gamma trade into a stock trade with decay risk.",
        "If the stock pins at the strike post-event — as happens on 'buy the rumor, sell the news' catalysts — the straddle goes to zero minus whatever tiny extrinsic remains. Size accordingly.",
      ],
    },
  },
];
