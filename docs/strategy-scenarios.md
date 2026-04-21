# Strategy Scenario Library

Source material for the interactive scenario walkthroughs that go on each strategy page.
Each entry captures Nacho's scenario as he described it — the dilemma, the trader's thought process, the lesson. Keep these in Nacho's framing; polish happens when they're built into pages.

Each scenario renders as an interactive piece on the strategy page: historical underlying chart, timeline scrubber, decision points annotated on the chart, live-updating P/L + Greeks + option prices in a side panel, narrative text per decision point. Option prices come from the Massive Options Starter historical data (2 years available) — real fills, not reconstructed BS.

For each strategy, mark one scenario as **canonical** (the one the strategy page leads with) and the rest as secondary (additional scenarios shown further down or on a "more scenarios" view).

---

## Bull Call Spread

### Canonical scenario: "too fast in your favor"

You put the spread on and the underlying rips in your direction almost immediately. Counterintuitively, this is a problem. The short leg, which still has meaningful time value, has gained a lot of value — so despite the position being profitable overall, you're staring at a big unrealized loss on the short leg.

Now you're stuck waiting for time decay to eat the short leg's extrinsic value so you can realize the profit. But every day you wait, you also risk the stock falling back down and giving the gains back.

**What the user learns:** max profit isn't realized until near expiration. A fast favorable move is actually the *worst* P/L trajectory short-term — the long leg caps at spread width while the short leg bleeds. The real decision is: close early at a fraction of max profit with reduced risk, or hold through time decay and accept re-tracement risk.

### Secondary scenario: legging into the spread

Instead of putting the full spread on day 1, leg in dynamically.

1. Buy a half-size position of the OTM long leg to start.
2. When the underlying rallies to the long strike, add the remaining size ATM to complete the long leg.
3. If the rally continues further, sell the short leg against it to convert the position into a spread.

Done well, you end up with a spread at much better net pricing than putting it on day 1, because you sold the short leg after volatility + price had lifted it.

**What the user learns:** defined-risk structures can be built incrementally rather than assembled at t=0. This is a real trader technique and almost nothing online teaches it.

---

## (Template for future strategies)

### Canonical scenario: "[one-line title]"

[The setup — what trade, what market condition]

[The trajectory — what happens to price, what happens to the position, what the trader is feeling/seeing at each turn]

[The dilemma — what decision the trader faces and why it's not obvious]

**What the user learns:** [the lesson this scenario is designed to teach]

### Secondary scenario: "[one-line title]"

...

---

## Scenarios still to be written

- Bull call spread: a third scenario for when the trade goes wrong (stock drops, how to cut vs repair)
- Covered call, iron condor, cash-secured put, long call, long put, vertical spreads (put credit / call credit / put debit), calendar, diagonal, straddle, strangle, butterfly, ratio spreads, PMCC

(Nacho adds scenarios here as he describes them; I translate them into this format.)

---

## Voice and framing notes

- Write from the perspective of a real trader managing a real position, not a textbook.
- Be honest about R/R tradeoffs — if closing early leaves money on the table but reduces risk, say so.
- Dynamic management (scaling in, scaling out, rolling, converting, cutting) is the differentiator — most existing educational content stops at "here's the payoff at expiration." These scenarios are what fills that gap.
- Real historical option prices are available via Massive Starter (2 years back). Label data source on the rendered component so users know it's real, not theoretical.
