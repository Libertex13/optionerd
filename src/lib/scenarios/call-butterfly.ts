import type { ScenarioConfig } from "./types";

export const callButterflyScenarios: ScenarioConfig[] = [
  {
    id: "nvda-earnings-landing",
    strategySlug: "call-butterfly",
    title: "Scenario - Directional pin trade on earnings — +275% at body, +391% at close",
    subtitle:
      "NVDA · May 27–Jun 6, 2025 · Bought a $135/$140/$145 butterfly pre-earnings for $0.68 debit. Stock landed on the body, then drifted past — still paid big.",
    ticker: "NVDA",
    from: "2025-05-27",
    to: "2025-06-06",
    contextFrom: "2025-03-01",
    contextTo: "2025-07-31",
    legs: [
      { side: "long", type: "call", strike: 135, expiry: "2025-06-06", qty: 1 },
      { side: "short", type: "call", strike: 140, expiry: "2025-06-06", qty: 1 },
      { side: "short", type: "call", strike: 140, expiry: "2025-06-06", qty: 1 },
      { side: "long", type: "call", strike: 145, expiry: "2025-06-06", qty: 1 },
    ],
    decisions: [
      {
        date: "2025-05-27",
        kind: "entry",
        title: "Open the directional call butterfly pre-earnings",
        shortLabel: "Entry",
        summary:
          "Bought $135 call, sold 2x $140 calls, bought $145 call · $0.68 debit",
        pivotal: true,
        narrative:
          "NVDA closes $135.50 the day before earnings. Implied move is ~6–7%; market is pricing a ±$9 post-print reaction. The thesis here isn't 'will NVDA beat' — it's 'where will NVDA LAND'. A directional call butterfly with the body at $140 expresses a specific hypothesis: post-earnings the stock settles 4–5% higher, around the $140 strike. Wings at $135 and $145 cap both sides. Net debit $0.68 per share ($68). Max profit $432 if NVDA closes exactly at $140 at expiry — a 6.4:1 structural R:R for a specific landing zone. Pay $68 to bet on a zone, cap loss at $68 if wrong.",
        oneLine:
          "Bet on a landing zone, not a direction. 6.4:1 R:R for hitting $140 at expiry.",
      },
      {
        date: "2025-05-28",
        kind: "event",
        title: "Earnings print — muted post-print reaction",
        shortLabel: "Print",
        summary:
          "Results in-line with guidance. Stock gaps modestly, implied crush lands.",
        pivotal: true,
        narrative:
          "NVDA reports. Numbers meet elevated expectations — data center revenue strong, margin guidance healthy — but nothing that forces a breakout gap. The stock opens modestly higher and finds a range. The IV crush on the $135 long call is offset by the crush on the short $140 calls (twice over), and the $145 long is a near-zero after the print. Net: the butterfly marks up because the directional bet is starting to work. The muted earnings reaction is exactly what the structure wanted.",
        oneLine:
          "No blowout either way. The butterfly's landing zone thesis starts to pay.",
      },
      {
        date: "2025-06-03",
        kind: "decay",
        title: "Stock above the body — the decision",
        shortLabel: "Decision",
        summary:
          "NVDA closes $141.22 — just above body. Butterfly marks $1.70 (+150% on debit).",
        pivotal: true,
        narrative:
          "NVDA closes $141.22 — one dollar above the body strike. With three days to expiry, the butterfly has a fat mark at ~$1.70 per share, or +150% on the $0.68 debit. This is one of the genuinely subtle decisions in options: butterflies gain value rapidly in the final days when the stock is near the body, but they lose value just as rapidly if the stock drifts past either wing. The trader's choice: bank +150% now, or hold for the potential to hit max (+535%) if the stock pins at $140 exactly into Friday? A large position takes the +150%; a small position can let the tail run.",
        decision: {
          k: "The asymmetry revealed",
          v: "+150% in hand vs. potential +535% at body pin. Size governs which is right: if losing 150% of already-realized profit for a shot at max would hurt, take it off.",
        },
        oneLine:
          "Butterflies pay best in the final 48 hours. Sizing decides whether to book the win early or ride the pin.",
      },
      {
        date: "2025-06-05",
        kind: "event",
        title: "Perfect close at body — $139.99",
        shortLabel: "Body",
        summary: "Stock closes 1 cent below body. Butterfly +275% on debit.",
        pivotal: true,
        narrative:
          "NVDA closes $139.99 on Thursday — basically exactly on the $140 body strike. The butterfly marks $2.55 per share, +275% on the $0.68 debit, or 43% of structural max. One more day to expiry. If NVDA closes near $140 tomorrow, max profit; if it drifts, the mark moves linearly toward a wing. The path-dependence is now acute: the butterfly is at its most gamma-positive right here, because any move away from $140 starts reducing value.",
        oneLine:
          "Body reached. +275% in hand, +535% at stake on one more session.",
      },
      {
        date: "2025-06-06",
        kind: "exit",
        title: "Expiry — +391% on debit, drifted toward upper wing",
        shortLabel: "Expiry",
        summary: "Stock closes $141.72. Butterfly settles $3.34. 62% of max.",
        pivotal: true,
        narrative:
          "Expiry. NVDA closes $141.72 — slightly above the body, but well within the wings. The butterfly goes out at $3.34 per share (intrinsic: $6.72 long + (−$1.72)×2 short + 0 long = $3.28, tiny residual). Realized P/L: +$266 on the $68 debit, or +391%. 62% of the structural max. Reflecting on the path: the absolute peak would have been an exact pin at $140 on Friday — 535% on the debit. That didn't happen, and the stock drift in the final hour cost ~130% of potential return. Still a 3.9x win on the capital at risk, and the structural asymmetry is what made this trade possible: max loss was always $68, no matter how wrong the directional bet turned out to be.",
        oneLine:
          "3.9x on the debit, 62% of max. The asymmetry is what made the whole trade economically possible.",
      },
    ],
    retrospective: {
      verdict: "+391% on debit · 62% of max · landing zone thesis worked",
      pctOfMax: 0.62,
      lessons: [
        "Call butterflies are directional pin trades. The body strike defines your hypothesis about where the stock ends up — NOT just 'it won't move much'.",
        "R:R is the structural feature that makes the strategy interesting. A 6:1+ payoff for hitting a zone allows you to be wrong the majority of the time and still grind edge.",
        "The butterfly's value changes fastest in the final two trading days. A trade entered 10 DTE often marks poorly for a week, then pays in the final 48 hours if the thesis is right.",
        "Close early at big multiples when position size makes +200% materially matter. Hold for the full pin only when the dollars at stake are small enough to let ride.",
      ],
    },
  },
];
