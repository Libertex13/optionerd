import type { ScenarioConfig } from "./types";

export const longStrangleScenarios: ScenarioConfig[] = [
  {
    id: "spy-liberation-day",
    strategySlug: "long-strangle",
    title: "Scenario - Tail hedge before the tariff panic — peaked at +411%",
    subtitle:
      "SPY · Apr 1–17, 2025 · OTM strangle paid 5x into the Liberation Day crash. Held to expiry recaptured less than a quarter of peak.",
    ticker: "SPY",
    from: "2025-04-01",
    to: "2025-04-17",
    contextFrom: "2025-01-02",
    contextTo: "2025-06-01",
    legs: [
      { side: "long", type: "call", strike: 575, expiry: "2025-04-17", qty: 1 },
      { side: "long", type: "put", strike: 540, expiry: "2025-04-17", qty: 1 },
    ],
    decisions: [
      {
        date: "2025-04-01",
        kind: "entry",
        title: "Buy the OTM strangle as tariff-event hedge",
        shortLabel: "Entry",
        summary:
          "Bought Apr 17 $575 call + $540 put · $6.83 total debit on SPY at $561",
        pivotal: true,
        narrative:
          "SPY closes April at $561 heading into the April 2 'Liberation Day' tariff announcement. VIX sits around 22 — neither calm nor panicking. The position: buy a wide OTM strangle ($575C + $540P) with 16 DTE for a total $6.83 debit. Strikes are chosen ~2.5% above and below spot — both OTM, both cheap (~$3.50 each). The bet isn't directional; it's that the announcement triggers a move larger than the implied move, in either direction. Strangle vs. straddle: the ATM straddle would cost ~$12 and require a smaller move to break even, but the strangle's sharper R:R pays off disproportionately on a true tail event.",
        oneLine:
          "Cheap tail hedge on a known catalyst, both sides OTM, leverage if it moves big.",
      },
      {
        date: "2025-04-03",
        kind: "event",
        title: "Tariffs announced — market breaks",
        shortLabel: "Catalyst",
        summary: "Reciprocal tariffs wider than expected, SPY gaps lower",
        pivotal: true,
        narrative:
          "After the April 2 close, the tariff regime is announced — harsher and broader than consensus had priced. SPY gaps down sharply on April 3 open. The $540 put, which was 3.7% OTM at entry, is now ITM with a falling stock and rising vega. Call side is deader than dead. The market is in full risk-off. Critical realization for anyone in a strangle here: the put is now doing the work of BOTH legs — the OTM call is economically a sunk cost you already paid for.",
        oneLine:
          "The catalyst fired. One leg is carrying the trade; the other is done.",
      },
      {
        date: "2025-04-07",
        kind: "event",
        title: "Panic low — peak P/L at $28+ per share",
        shortLabel: "Peak",
        summary: "SPY prints $481 intraday. Strangle marks $35 vs $6.83 entry.",
        pivotal: true,
        narrative:
          "April 7 is the climax. SPY trades down to $481 intraday — a ~14% drawdown from the April 2 high — before closing $504. VIX ~60. The $540 put is intrinsically worth $36, with elevated vega and IV adding extrinsic on top. Closing the position here means accepting ~$35 per share: roughly +$28/share gain on a $6.83 debit, or +411% in four sessions. This is the decision point every strangle faces after a catalyst works: is the realized move bigger than anything this strangle was designed for, and is closing now more edge than holding for more? The answer for a 16 DTE strangle after a -14% move is: yes, close.",
        decision: {
          k: "The peak",
          v: "When a strangle's winning leg is deep ITM and vol has blown out, extrinsic is inflated on both realized move AND peak IV. That never gets better. Close.",
        },
        oneLine:
          "Strangles peak where IV AND the winning leg peak simultaneously. That was Apr 7.",
      },
      {
        date: "2025-04-09",
        kind: "event",
        title: "Tariff pause — the rug pull on the short-vol survivor",
        shortLabel: "Pause",
        summary: "90-day pause announced, SPY rallies hard, IV collapses",
        pivotal: true,
        narrative:
          "April 9 midday, a 90-day pause is announced. SPY rips. The $540 put goes from $35+ at Apr 7 close to roughly $16 by Apr 9 close on both price action AND IV crush. This is the mirror image of the straddle lesson: the maximum payoff is the combined peak of realized move + implied move, and both of those unwind rapidly once the catalyst resolves. Every day after Apr 7 was erosion — and the strangle holder who was still present didn't just give back the gain, they did so while paying theta on the structurally dead call leg.",
        oneLine:
          "Vol crash + price reversal = double hit. The peak was the exit.",
      },
      {
        date: "2025-04-17",
        kind: "exit",
        title: "Expiry — 92% on the debit, gave back most of the peak",
        shortLabel: "Expiry",
        summary: "SPY closes $526, strangle settles at $13.13",
        pivotal: true,
        narrative:
          "Expiry. SPY closes $526. The $540 put is worth $14 intrinsic, the $575 call is a penny. Total $13.13 vs $6.83 debit — a +92% return on the original risk. A win in absolute terms, but the peak was +411%. Holding 10 extra days after the peak cost roughly $22 of realized P/L per share — more than 3x the original debit — in exchange for the optionality of further downside that never came. The lesson sits exactly in this gap: strangles exist to capture the tail; when the tail arrives, you take it.",
        oneLine:
          "+92% held to expiry, but the tail paid +411% four days earlier.",
      },
    ],
    retrospective: {
      verdict: "Win — +92% on the debit; peak was +411% mid-panic",
      pctOfMax: 0.22,
      lessons: [
        "Strangles are tail hedges. The payoff function is peaked: realized move × peak IV × remaining time. All three compress rapidly once the catalyst resolves.",
        "On a winning strangle, the 'other side' (OTM call or OTM put that's going the wrong way) is a sunk cost — don't count on it to recover.",
        "When VIX doubles and your winning leg is deep ITM, you have the exit the product was designed to generate. Take it.",
        "Strangle vs. straddle: a strangle rewards outsized moves disproportionately. If the market just moves 'a lot but not crazy,' the ATM straddle would have paid more.",
      ],
    },
  },
];
