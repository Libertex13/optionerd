import type { OptionType, PositionType } from "@/types/options";

export interface StrategyDefinition {
  slug: string;
  name: string;
  title: string;
  metaDescription: string;
  h1: string;
  description: string;
  sentiment: "bullish" | "bearish" | "neutral";
  defaultOptionType: OptionType;
  defaultPositionType: PositionType;
  includeStockLeg: boolean;
  maxProfit: string;
  maxLoss: string;
  breakEvenFormula: string;
  whenToUse: string[];
  risks: string[];
  educationalContent: string;
}

export const strategyDefinitions: Record<string, StrategyDefinition> = {
  "long-call": {
    slug: "long-call",
    name: "Long Call",
    title: "Long Call Option Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate the profit and loss of a long call option with our free calculator. Visualize payoff diagrams, Greeks, and break-even points for call options.",
    h1: "Long Call Option Calculator",
    description:
      "A long call gives you the right to buy 100 shares of the underlying stock at the strike price before expiration. You pay a premium upfront and profit when the stock rises above your break-even price.",
    sentiment: "bullish",
    defaultOptionType: "call",
    defaultPositionType: "long",
    includeStockLeg: false,
    maxProfit: "Unlimited — the stock can rise indefinitely",
    maxLoss: "Limited to the premium paid",
    breakEvenFormula: "Strike Price + Premium Paid",
    whenToUse: [
      "You are directionally bullish and want leverage with a hard-capped downside",
      "Implied volatility is low — you'd rather buy vol than sell it (long calls are net long vega)",
      "You expect the move to happen within your timeframe — you must be right on direction AND timing",
      "You're using it as a cheaper proxy for buying stock, or to free up capital while keeping upside",
    ],
    risks: [
      "Time decay (theta) accelerates as expiration nears — a stagnant stock bleeds value every day",
      "If the stock doesn't clear the break-even by expiration, you lose the entire premium",
      "IV crush after a catalyst (earnings, FDA, macro) can gut the position even if the stock moves your way",
      "You're paying for extrinsic value — buying ITM reduces theta but costs more; buying OTM is cheap but needs a bigger move",
    ],
    educationalContent: `
## How a Long Call Works

Buying a call is paying for the right — not the obligation — to purchase 100 shares at the strike price before expiration. The premium is the maximum you can lose. Your upside is uncapped, but the stock must move far enough and fast enough for the call to finish ITM by more than the premium paid.

### Example
AAPL at $195. Buy the $200 call (30 DTE) for $4.63 per share ($463 total).

- **AAPL at $210 at expiration**: Call is worth $10. Profit = ($10 − $4.63) × 100 = **$537**.
- **AAPL at $200 at expiration**: Call expires worthless. Loss = full **$463** premium.
- **AAPL at $250 at expiration**: Call is worth $50. Profit = ($50 − $4.63) × 100 = **$4,537**.

### Strike Selection
Strike choice completely changes the character of the trade:
- **ITM calls** (delta 0.60–0.80): behave like leveraged stock. Lower extrinsic value, less theta decay, higher cost.
- **ATM calls** (delta ~0.50): most gamma and theta exposure. The "purest" directional bet per dollar.
- **OTM calls** (delta 0.20–0.35): cheap lottery tickets. Need a big move or they go to zero. Highest R:R if right.

### The Volatility Trap
Long calls are net long vega. Buying calls when IV is elevated (e.g., before earnings) means you pay up for vol. After the event, IV usually collapses — even a decent stock move can produce a loss because the extrinsic value evaporates.

### Key Takeaway
Long calls are a leveraged, directional bet on price AND timing. You win when the stock moves enough before expiration to overcome the premium paid, ideally in a low-to-moderate IV environment that expands in your favor.
    `,
  },
  "long-put": {
    slug: "long-put",
    name: "Long Put",
    title: "Long Put Option Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate the profit and loss of a long put option with our free calculator. Visualize payoff diagrams, Greeks, and break-even points for put options.",
    h1: "Long Put Option Calculator",
    description:
      "A long put gives you the right to sell 100 shares of the underlying stock at the strike price before expiration. You pay a premium upfront and profit when the stock falls below your break-even price.",
    sentiment: "bearish",
    defaultOptionType: "put",
    defaultPositionType: "long",
    includeStockLeg: false,
    maxProfit: "Strike Price − Premium Paid (×100) — if stock goes to $0",
    maxLoss: "Limited to the premium paid",
    breakEvenFormula: "Strike Price − Premium Paid",
    whenToUse: [
      "You are directionally bearish and want leverage with risk hard-capped at the premium paid",
      "You're hedging a long stock or portfolio position — puts are portfolio insurance",
      "Implied volatility is low relative to your expected move (you'd rather buy vol than sell it)",
      "You don't want the unlimited risk, margin, and borrow costs of short selling",
    ],
    risks: [
      "Time decay works against you — a stagnant stock bleeds premium daily",
      "If the stock doesn't clear break-even to the downside, you lose the full premium",
      "Put skew makes OTM puts structurally expensive — you often pay a vol premium for downside protection",
      "IV crush after a feared event that didn't happen (macro de-risking, earnings) can destroy value even if the stock drifts lower",
    ],
    educationalContent: `
## How a Long Put Works

A long put is the right — not the obligation — to sell 100 shares at the strike price before expiration. It's the cleanest defined-risk way to express a bearish view, and the most common hedging instrument for long stock portfolios.

### Example
AAPL at $195. Buy the $190 put (30 DTE) for $4.00 per share ($400 total).

- **AAPL at $180 at expiration**: Put is worth $10. Profit = ($10 − $4.00) × 100 = **$600**.
- **AAPL at $195 at expiration**: Put expires worthless. Loss = **$400** premium.
- **AAPL at $150 at expiration**: Put is worth $40. Profit = ($40 − $4.00) × 100 = **$3,600**.

### Long Put vs. Short Selling
Short selling carries unlimited risk, requires a locate/borrow, and can be squeezed. A long put caps max loss at the premium, has no borrow cost, and exposure can be sized precisely by strike selection.

### Put Skew
Equity index and single-stock puts almost always carry higher implied volatility than equidistant calls — this is "put skew". It means you pay a structural vol premium for downside protection. Skew steepens in fear regimes (VIX spikes), which is also when hedges matter most.

### Key Takeaway
Long puts are a leveraged, defined-risk bearish bet — or a hedge. Best initiated when IV is subdued and skew isn't extreme; worst when IV is elevated from fear and a vol collapse is imminent.
    `,
  },
  "covered-call": {
    slug: "covered-call",
    name: "Covered Call",
    title: "Covered Call Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate covered call profit and loss with our free calculator. Visualize payoff diagrams, premium income, and break-even points for covered call strategies.",
    h1: "Covered Call Option Calculator",
    description:
      "A covered call involves owning 100 shares of stock and selling a call option against them. You collect premium income while capping your upside at the strike price. It's one of the most popular options strategies for generating income.",
    sentiment: "neutral",
    defaultOptionType: "call",
    defaultPositionType: "short",
    includeStockLeg: true,
    maxProfit: "(Strike Price − Stock Entry Price + Premium Received) × 100",
    maxLoss: "(Stock Entry Price − Premium Received) × 100 — if stock goes to $0",
    breakEvenFormula: "Stock Entry Price − Premium Received",
    whenToUse: [
      "You own 100+ shares and want to generate yield/income against the position",
      "You are neutral to mildly bullish — willing to cap upside in exchange for premium",
      "You're happy to sell your shares at the strike price (it becomes your exit plan)",
      "Implied volatility is elevated — you'd rather sell premium than buy it (covered calls are short vega, short gamma, positive theta)",
    ],
    risks: [
      "If the stock rips well above the strike, you forfeit the upside above strike + premium (opportunity cost, not a cash loss)",
      "If the stock drops hard, the premium only cushions a small portion of the stock loss — you still own the shares and bear the full downside",
      "Strike choice is a tradeoff: ATM calls collect the most premium but cap upside tightly; OTM calls keep room to run but collect less",
      "Exiting the covered call on a rally can cost more than the premium you collected if IV expanded",
    ],
    educationalContent: `
## How a Covered Call Works

Own 100 shares and simultaneously sell one call option against them. The short call obligates you to sell your shares at the strike if the buyer exercises. In exchange, you collect the call's premium upfront. This is also called a "buy-write" when initiated simultaneously.

### Example
You own 100 shares of AAPL at $195 and sell the $205 call for $3.00 per share ($300 total).

- **AAPL at $210 at expiration**: Shares called away at $205. P&L = ($205 − $195 + $3) × 100 = **$1,300**. You miss the $5 of upside above $205.
- **AAPL at $195 at expiration**: Call expires worthless. Keep the shares + **$300** premium.
- **AAPL at $185 at expiration**: Shares lose $10, offset partially by the $3 credit. Net = **−$700** (vs −$1,000 unhedged).

### Strike Selection
- **ATM calls**: richest premium, highest theta, tightest upside cap. Use when you're outright neutral.
- **OTM calls** (delta 0.20–0.30): common choice — enough premium to be meaningful, enough room for the stock to appreciate.
- **Deep OTM calls**: minimal premium. Mostly a tail cap; not really an income trade.

### Why Covered Calls Are Popular
They're the most accessible premium-selling strategy — defined-risk (bounded by the share position), no margin needed beyond the shares, and they systematically harvest theta in flat-to-mildly-bullish tape. The primary trap is rolling covered calls for credit on a rally and compounding losses as the stock runs away.

### Key Takeaway
Covered calls are a yield enhancement on existing stock, not a directional bet. Best in elevated-IV, range-bound tape. Choose strikes you'd genuinely be happy to sell at, and have a plan for managing if the stock trends hard.
    `,
  },
  "bull-call-spread": {
    slug: "bull-call-spread",
    name: "Bull Call Spread",
    title: "Bull Call Spread Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate bull call spread profit and loss. Visualize payoff diagrams, break-evens, and Greeks for vertical call debit spreads.",
    h1: "Bull Call Spread Calculator",
    description:
      "A bull call spread is a vertical debit spread: you buy a lower-strike call and sell a higher-strike call at the same expiration. It reduces cost vs. a naked long call while capping your upside at the short strike.",
    sentiment: "bullish",
    defaultOptionType: "call",
    defaultPositionType: "long",
    includeStockLeg: false,
    maxProfit: "(Width of strikes − Net debit) × 100",
    maxLoss: "Net debit paid × 100",
    breakEvenFormula: "Long strike + Net debit",
    whenToUse: [
      "You have a bullish directional view and want defined risk at a lower cost than a naked long call",
      "Strike selection is what defines the view, not the strategy itself: ATM/ITM spreads are conservative/high-probability; far-OTM spreads are aggressive, low-cost bets that need a large move for big R:R",
      "You're willing to cap upside at the short strike in exchange for a lower debit and a closer break-even",
      "You prefer a known, pre-defined maximum loss over open-ended premium exposure",
    ],
    risks: [
      "Max profit is capped at the short strike — if the stock rips, you don't participate beyond it",
      "You lose the full debit if the stock is at or below the long strike at expiration",
      "Theta is net negative (you paid a debit), but much smaller than a naked long call because the short leg partially offsets decay",
      "Vega exposure is small but net long — a big IV contraction can still hurt a wide spread",
    ],
    educationalContent: `
## How a Bull Call Spread Works

Buy a call at strike A and sell a call at strike B (B > A), same expiration. The short call partially finances the long call: you pay a lower debit, accept a lower break-even, and in exchange you cap your max profit at the width of the spread.

### Example
AAPL at $195. Buy the $195 call for $5.80, sell the $205 call for $2.20. Net debit: $3.60 ($360). Max profit = ($10 − $3.60) × 100 = $640.

- **AAPL at $210 at expiration**: Both calls ITM. Spread is worth full $10 width. Profit = ($10 − $3.60) × 100 = **$640**.
- **AAPL at $198.60 at expiration**: Break-even.
- **AAPL at $190 at expiration**: Both expire worthless. Loss = **$360** (the debit).

### Strike Selection Determines the View
This is the most important — and most commonly misunderstood — aspect of the spread. The strategy is always "bullish" but the *character* of the bet depends entirely on where you place the strikes relative to spot:

- **Deep ITM spread** (long strike well below spot, short strike near/just below spot): very high probability of full profit, minimal R:R. Essentially a yield trade on the stock not falling.
- **Near-ATM spread** (long ATM, short a bit OTM): moderate probability, balanced R:R. The "standard" bull call spread people describe as "moderately bullish".
- **Far-OTM spread** (both strikes above spot): low cost, low probability, huge R:R. This is an aggressive bullish bet that *wants* a big move — the opposite of "moderate". Max profit only if the stock blows past the short strike.

### Why Not a Naked Call?
Cost and risk definition. A naked long call is net long vega — it's an IV-sensitive directional bet. A bull call spread reduces that vega exposure (the short leg offsets), lowers theta bleed, and locks in a known max loss. The cost is the capped upside.

### IV Considerations
Bull call spreads are only modestly net long vega. Whether to open one in high- or low-IV environments depends more on your expected move and break-even than on the IV regime itself. Don't confuse this with a credit spread, where IV matters a lot.

### Key Takeaway
A bull call spread is a defined-risk, capped-upside way to express a directional bullish view. Strike selection dictates whether it's a conservative yield-like bet or a cheap aggressive play — the strategy name alone tells you almost nothing about the actual thesis.
    `,
  },
  "bear-put-spread": {
    slug: "bear-put-spread",
    name: "Bear Put Spread",
    title: "Bear Put Spread Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate bear put spread profit and loss. Visualize payoff diagrams, break-evens, and Greeks for vertical put debit spreads.",
    h1: "Bear Put Spread Calculator",
    description:
      "A bear put spread is a vertical debit spread: you buy a higher-strike put and sell a lower-strike put at the same expiration. It's a cost-efficient way to bet on a stock declining with defined risk.",
    sentiment: "bearish",
    defaultOptionType: "put",
    defaultPositionType: "long",
    includeStockLeg: false,
    maxProfit: "(Width of strikes − Net debit) × 100",
    maxLoss: "Net debit paid × 100",
    breakEvenFormula: "Long strike − Net debit",
    whenToUse: [
      "You have a bearish directional view and want defined risk at a lower cost than a naked long put",
      "Strike selection defines the view: ITM spreads are conservative/high-probability; far-OTM spreads are aggressive crash bets with asymmetric R:R",
      "You're willing to cap downside profit at the short strike in exchange for a lower debit",
      "You want to avoid short-sale mechanics (borrow, margin, unlimited risk)",
    ],
    risks: [
      "Max profit is capped — if the stock crashes well below the short strike, you don't participate below it",
      "You lose the full debit if the stock stays above the long strike at expiration",
      "Theta is net negative but smaller than a naked long put because the short leg offsets",
      "Vega exposure is small but net long — a big IV collapse after a feared event can hurt a wide spread",
      "Put skew means the long leg is structurally expensive; the short leg partially mitigates this",
    ],
    educationalContent: `
## How a Bear Put Spread Works

Buy a put at strike A and sell a put at strike B (B < A), same expiration. The short put partially finances the long put, lowering your debit and narrowing your profit band.

### Example
AAPL at $195. Buy the $200 put for $6.00, sell the $190 put for $2.80. Net debit: $3.20 ($320). Max profit = ($10 − $3.20) × 100 = $680.

- **AAPL at $185 at expiration**: Both puts ITM. Spread worth full $10 width. Profit = **$680**.
- **AAPL at $196.80 at expiration**: Break-even.
- **AAPL at $205 at expiration**: Both expire worthless. Loss = **$320**.

### Strike Selection Determines the View
Same principle as the bull call spread — the strategy is "bearish" but where you place the strikes changes everything:

- **Deep ITM spread** (long well above spot, short near spot): high-probability, low R:R. Yield on the stock not rallying.
- **Near-ATM spread**: balanced, moderate-bearish bet — the "textbook" bear put spread.
- **Far-OTM spread** (both strikes below spot): cheap crash-like bet. Low probability, very high R:R if the stock sells off hard.

### Why Not a Naked Put?
Same logic as bull call vs naked call. Naked puts are net long vega and IV-sensitive; bear put spreads reduce vega, reduce theta bleed, and cap max loss. You give up unlimited downside participation for a known cost and cleaner Greek profile.

### IV Considerations
Modestly net long vega. IV regime matters less than strike selection and your expected move. Don't confuse this with a bull put (credit) spread, where IV matters a lot.

### Key Takeaway
Bear put spreads are a defined-risk bearish position. Strike selection — not the strategy name — tells you whether you're expecting a mild drift lower or a waterfall decline.
    `,
  },
  "bull-put-spread": {
    slug: "bull-put-spread",
    name: "Bull Put Spread",
    title: "Bull Put Spread Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate bull put spread profit and loss. Visualize payoff diagrams, break-evens, and Greeks for vertical put credit spreads.",
    h1: "Bull Put Spread Calculator",
    description:
      "A bull put spread is a vertical credit spread: you sell a higher-strike put and buy a lower-strike put. You collect a net credit and profit if the stock stays above the short strike.",
    sentiment: "bullish",
    defaultOptionType: "put",
    defaultPositionType: "short",
    includeStockLeg: false,
    maxProfit: "Net credit received × 100",
    maxLoss: "(Width of strikes − Net credit) × 100",
    breakEvenFormula: "Short strike − Net credit",
    whenToUse: [
      "Your bet is 'the stock will NOT be below my short strike at expiration' — that's a weaker claim than 'the stock will go up'",
      "Implied volatility is elevated (high IV rank) — credit spreads are short vega and monetize IV contraction",
      "You want positive theta and a high probability of profit, accepting that max loss > max profit",
      "You want defined risk relative to a naked short put (the long wing caps catastrophic moves)",
    ],
    risks: [
      "Max loss (width − credit) is larger than max profit (credit) — one loser can erase several winners if not managed",
      "Drawdown shows up fast on a selloff: short puts gain vega and delta aggressively as the stock approaches the short strike",
      "Early assignment is possible if the short put goes deep ITM, especially just before a dividend",
      "IV expansion hurts the position before expiration even if the stock holds — you need either price to hold OR IV to contract",
    ],
    educationalContent: `
## How a Bull Put Spread Works

Sell a put at strike A and buy a put at strike B (B < A), same expiration. You receive a net credit. If the stock is above strike A at expiration, both puts expire worthless and you keep the credit. If price breaks below the short strike, losses accumulate until capped by the long put at strike B.

### Example
AAPL at $195. Sell the $195 put for $3.40, buy the $190 put for $2.00. Net credit: $1.40 ($140). Max loss = ($5 − $1.40) × 100 = $360.

- **AAPL at $200 at expiration**: Both expire worthless. Keep the **$140**.
- **AAPL at $193.60 at expiration**: Break-even.
- **AAPL at $185 at expiration**: Max loss = **$360**.

### The Real Bet
A bull put spread is not really a directional bullish trade — it's a probability trade that the underlying will stay above a specific level. It makes money in flat, mildly up, and even mildly down tape, as long as price stays above the short strike. The "bull" label refers to the payoff slope, not your required conviction.

### Greek Profile
- **Theta: positive** — time passing is your friend
- **Vega: negative** — you want IV to contract
- **Delta: positive** — you benefit from up moves
- **Gamma: negative** — risk accelerates if price approaches the short strike near expiration

### Management
Most systematic sellers target 30–45 DTE at entry and close at 50% of max profit rather than holding to expiration. Holding through expiration exposes you to max gamma in the final week for minimal remaining credit.

### Key Takeaway
Bull put spreads harvest theta and short-vega in elevated-IV, range-bound-to-rising tape. Max loss exceeds max profit; the edge has to come from high POP and disciplined management, not from winning every trade.
    `,
  },
  "bear-call-spread": {
    slug: "bear-call-spread",
    name: "Bear Call Spread",
    title: "Bear Call Spread Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate bear call spread profit and loss. Visualize payoff diagrams, break-evens, and Greeks for vertical call credit spreads.",
    h1: "Bear Call Spread Calculator",
    description:
      "A bear call spread is a vertical credit spread: you sell a lower-strike call and buy a higher-strike call. You collect a net credit and profit if the stock stays below the short strike.",
    sentiment: "bearish",
    defaultOptionType: "call",
    defaultPositionType: "short",
    includeStockLeg: false,
    maxProfit: "Net credit received × 100",
    maxLoss: "(Width of strikes − Net credit) × 100",
    breakEvenFormula: "Short strike + Net credit",
    whenToUse: [
      "Your bet is 'the stock will NOT be above my short strike at expiration' — weaker claim than 'the stock will fall'",
      "Implied volatility is elevated (high IV rank) — bear call spreads are short vega and monetize IV contraction",
      "You want positive theta and a high probability of profit, accepting that max loss > max profit",
      "You want defined risk compared to a naked short call (no unlimited upside exposure)",
      "Call skew is relatively flat/low (unlike puts) — the spread economics aren't dragged down by steep skew",
    ],
    risks: [
      "Max loss (width − credit) exceeds max profit (credit) — one uncontrolled loser can wipe out several winners",
      "Losses accelerate on a rally: short calls gain vega and delta quickly as spot approaches the short strike",
      "Early assignment possible if the short call goes ITM, especially around ex-dividend dates",
      "IV expansion after a bullish surprise can hurt even if price eventually retraces",
    ],
    educationalContent: `
## How a Bear Call Spread Works

Sell a call at strike A and buy a call at strike B (B > A), same expiration. You collect a net credit. If the stock is at or below strike A at expiration, both calls expire worthless and you keep the credit. Losses accumulate above the short strike, capped by the long wing at strike B.

### Example
AAPL at $195. Sell the $195 call for $5.40, buy the $200 call for $3.00. Net credit: $2.40 ($240). Max loss = ($5 − $2.40) × 100 = $260.

- **AAPL at $190 at expiration**: Both expire worthless. Keep the **$240**.
- **AAPL at $197.40 at expiration**: Break-even.
- **AAPL at $205 at expiration**: Max loss = **$260**.

### The Real Bet
A bear call spread is the mirror of a bull put spread. The claim is "price will stay below this level" — weaker than a directional bearish thesis. It profits in flat, mildly down, and even mildly up tape as long as price stays below the short strike.

### Greek Profile
- **Theta: positive**
- **Vega: negative**
- **Delta: negative**
- **Gamma: negative** (gets worse near the short strike as expiration approaches)

### Why It's Often Worse Than a Bull Put
Because of put skew, at equivalent deltas the *put side* usually offers better credit-to-risk than the call side. Pros often prefer to sell premium via bull puts or iron condors and use bear calls only when they have a specific bearish bias and elevated call IV to harvest.

### Key Takeaway
Bear call spreads harvest theta and short vega in elevated-IV, range-bound-to-falling tape. Structurally less attractive than bull puts due to skew, but useful when you want a defined-risk bearish expression.
    `,
  },
  "long-straddle": {
    slug: "long-straddle",
    name: "Long Straddle",
    title: "Long Straddle Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate long straddle profit and loss. Visualize the V-shaped payoff for this volatility strategy that profits from big moves in either direction.",
    h1: "Long Straddle Calculator",
    description:
      "A long straddle involves buying both a call and a put at the same strike and expiration. You profit from a big move in either direction — you just need the stock to move far enough to cover the cost of both premiums.",
    sentiment: "neutral",
    defaultOptionType: "call",
    defaultPositionType: "long",
    includeStockLeg: false,
    maxProfit: "Unlimited (upside) / Strike − Total premium (downside)",
    maxLoss: "Total premium paid (both legs) × 100",
    breakEvenFormula: "Strike ± Total premium",
    whenToUse: [
      "You think realized volatility will exceed implied volatility (RV > IV) — the market is underpricing the expected move",
      "You expect a large, possibly violent move but have no directional conviction",
      "You want long gamma and long vega exposure — profit from either a price move OR an IV expansion",
      "Ahead of a catalyst where the straddle's implied move seems too cheap relative to historical outcomes",
    ],
    risks: [
      "You pay two premiums — break-evens are wide, the stock must move more than the total debit by expiration",
      "Theta is heavily negative — two long options decay together, and decay accelerates near expiration",
      "IV crush is the primary killer, especially post-earnings: the move happens but vol collapses and the straddle loses money anyway",
      "Being right on 'there will be a big move' is not enough — the move must exceed the straddle's implied move",
    ],
    educationalContent: `
## How a Long Straddle Works

Buy a call and a put at the same strike and expiration. The payoff is V-shaped: max loss is at the strike (total debit), and profit grows linearly with distance from the strike in either direction. The position is delta-neutral at inception but becomes long-delta if the stock rallies and short-delta if it falls (positive gamma).

### Example
AAPL at $195. Buy the $195 call for $3.80 and the $195 put for $3.40. Total cost: $7.20 ($720).

- **AAPL at $210 at expiration**: Call worth $15, put worthless. Profit = ($15 − $7.20) × 100 = **$780**.
- **AAPL at $180 at expiration**: Put worth $15, call worthless. Profit = **$780**.
- **AAPL at $195 at expiration**: Both expire ATM/worthless. Loss = **$720**.
- **Break-evens**: $187.80 and $202.20.

### The Real Bet: RV > IV
The market already prices an expected move into the straddle's premium — this is (roughly) the "straddle-implied move". Buying a straddle is not a bet on "there will be a big move." It's a bet that the actual realized move will be larger than what's already priced in.

If the pre-earnings straddle is priced at $7.20 and the stock moves exactly $7, you lose money despite being directionally correct about a big move. The edge only exists when your expected realized move exceeds the implied move.

### IV Crush
Before a known event (earnings, FDA decision, macro print), IV inflates to price expected gap risk. After the event, IV collapses. If you bought the straddle expensive and the move is merely "normal", both IV contraction AND time decay work against you simultaneously — a painful combination.

### Greek Profile
- **Delta: ~0 at inception**, becomes directional as price moves
- **Gamma: highly positive** — you get paid for volatility
- **Theta: very negative** — both legs bleed
- **Vega: highly positive** — IV expansion is your friend, IV contraction kills you

### Key Takeaway
Straddles are pure vol bets. You win when realized exceeds implied AND the vol move happens before decay destroys extrinsic value. Best when IV is underpricing a specific catalyst; worst when buying into elevated IV ahead of an event where the move is already fully priced.
    `,
  },
  "long-strangle": {
    slug: "long-strangle",
    name: "Long Strangle",
    title: "Long Strangle Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate long strangle profit and loss. A cheaper alternative to straddles that profits from big moves in either direction.",
    h1: "Long Strangle Calculator",
    description:
      "A long strangle is like a straddle but with OTM strikes: buy an OTM call and an OTM put. It's cheaper than a straddle but requires a bigger move to profit.",
    sentiment: "neutral",
    defaultOptionType: "call",
    defaultPositionType: "long",
    includeStockLeg: false,
    maxProfit: "Unlimited (upside) / Put strike − Total premium (downside)",
    maxLoss: "Total premium paid (both legs) × 100",
    breakEvenFormula: "Call strike + Total premium / Put strike − Total premium",
    whenToUse: [
      "You think RV > IV and expect a violent, directionally-ambiguous move",
      "You want more gamma-per-dollar than a straddle — OTM legs have lower premium so R:R is sharper for a large move",
      "You're playing a binary catalyst where the expected move is larger than the straddle implies",
      "You're willing to accept wider break-evens and lower probability of profit in exchange for cheaper entry",
    ],
    risks: [
      "Break-evens are wider than a straddle — you need a bigger move to profit",
      "Higher probability of both legs expiring worthless (the stock stays between the strikes)",
      "Double theta burn and IV crush risk are the same as a straddle, just on a cheaper structure",
      "OTM options have less absolute vega/gamma than ATM — the move must be substantial to convert the position into meaningful profit",
    ],
    educationalContent: `
## How a Long Strangle Works

Buy an OTM call and an OTM put with the same expiration. Same V-shaped vol bet as a straddle, but using cheaper OTM strikes. Total premium is lower, but break-evens are wider — the stock must move past the respective strikes, plus the debit paid.

### Example
AAPL at $195. Buy the $200 call for $2.60 and the $190 put for $2.20. Total cost: $4.80 ($480).

- **AAPL at $215 at expiration**: Call worth $15, put worthless. Profit = ($15 − $4.80) × 100 = **$1,020**.
- **AAPL at $180 at expiration**: Put worth $10, call worthless. Profit = **$520**.
- **AAPL at $195 at expiration**: Both expire OTM. Loss = **$480** (full debit).
- **Break-evens**: $185.20 and $204.80.

### Strangle vs Straddle
A strangle sacrifices the ATM "guaranteed some intrinsic value" zone in exchange for a much lower debit. The tradeoffs:

- **Strangle wins if**: the move is *large*. Because you paid less, each dollar of movement past break-even is disproportionately more profit.
- **Straddle wins if**: the move is *moderate* (enough to beat the straddle break-even but not enough to beat the strangle's wider one).

Put differently: straddles favor frequent moderate winners; strangles are a bigger swing for a better R:R when you hit.

### Key Takeaway
Strangles are a cheaper vol bet for when you expect the move to be large. Choose strikes based on where the stock needs to go for the trade to make sense — typically the strikes of the implied move or just inside them. Same IV-crush and theta risks as a straddle apply.
    `,
  },
  "short-strangle": {
    slug: "short-strangle",
    name: "Short Strangle",
    title: "Short Strangle Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate short strangle profit and loss. A premium-selling strategy that profits from range-bound stocks with undefined risk.",
    h1: "Short Strangle Calculator",
    description:
      "A short strangle involves selling an OTM call and an OTM put. You collect premium and profit if the stock stays between your strikes. Warning: this strategy has unlimited risk on both sides.",
    sentiment: "neutral",
    defaultOptionType: "call",
    defaultPositionType: "short",
    includeStockLeg: false,
    maxProfit: "Total credit received × 100",
    maxLoss: "Unlimited (both directions)",
    breakEvenFormula: "Call strike + Total credit / Put strike − Total credit",
    whenToUse: [
      "You think RV < IV — the market is overpricing the expected move, typically when IV rank is elevated",
      "You expect range-bound price action with no catalyst likely to produce a large move",
      "You have the margin, capital, and risk tolerance to hold an undefined-risk short-vol position",
      "You accept more tail risk in exchange for a richer credit than an iron condor (no long wings paying premium out)",
    ],
    risks: [
      "Unlimited loss on both sides — a gap move in either direction can produce catastrophic losses overnight",
      "Short-vol positions earn slowly and lose fast: one bad event can erase months of premium collection",
      "Margin requirements are significant (portfolio margin helps; Reg T is punitive)",
      "Vega negative — a vol spike hurts even before price moves meaningfully",
      "Early assignment risk on either leg if it goes ITM, especially around ex-dividend or late-cycle",
    ],
    educationalContent: `
## How a Short Strangle Works

Sell an OTM call and an OTM put with the same expiration. You collect a net credit and want the stock to stay between the strikes. Max profit (the credit) is realized if both legs expire worthless. Losses are unlimited if the stock trends hard in either direction.

### Example
AAPL at $195. Sell the $205 call for $2.20, sell the $185 put for $1.90. Total credit: $4.10 ($410).

- **AAPL at $195 at expiration**: Both expire OTM. Keep the **$410**.
- **AAPL at $220 at expiration**: Call is $15 ITM. Loss = ($15 − $4.10) × 100 = **$1,090**.
- **AAPL at $170 at expiration**: Put is $15 ITM. Loss = **$1,090**. (And keep going — this is uncapped.)

### The Real Bet: RV < IV
A short strangle is the mirror of a long straddle. You're selling the market's implied move. You win when realized volatility turns out lower than what you were paid for. This is why IV rank matters: selling vol when vol is already cheap is bad risk-reward.

### Greek Profile
- **Theta: positive** — time passing is your biggest edge
- **Vega: highly negative** — any IV spike hurts even if price doesn't move
- **Gamma: highly negative** — a move against you accelerates losses quickly
- **Delta: ~0 at inception**, becomes directionally exposed as price drifts

### Why It Can Blow Up
The payoff is asymmetric and the distribution of outcomes isn't normal. Most of the time you collect; occasionally a tail event (gap earnings, surprise macro, M&A, pandemic open) produces a multi-month-of-premium loss in one session. This is why iron condors (defined-risk wings) are the much more common structure for retail.

### Management
Experienced premium sellers typically: manage at ~21 DTE, take profit at 25–50% of max credit, roll tested sides, and size aggressively smaller than their naive expected value would suggest.

### Key Takeaway
Short strangles earn steadily in normal tape and lose violently in tail events. Worthwhile only with genuine IV edge, real risk management, and portfolio-margin-style capital efficiency. Otherwise, use an iron condor.
    `,
  },
  "iron-condor": {
    slug: "iron-condor",
    name: "Iron Condor",
    title: "Iron Condor Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate iron condor profit and loss. Price a four-leg defined-risk strategy, see the payoff curve, and understand the Greeks tradeoff.",
    h1: "Iron Condor Calculator",
    description:
      "An iron condor is a four-leg, defined-risk, neutral strategy. Sell a put spread and a call spread simultaneously. You collect a net credit and profit if the stock stays inside the short strikes — harvesting time decay in range-bound underlyings.",
    sentiment: "neutral",
    defaultOptionType: "call",
    defaultPositionType: "short",
    includeStockLeg: false,
    maxProfit: "Net credit received × 100",
    maxLoss: "(Width of wider wing − Net credit) × 100",
    breakEvenFormula: "Short put − Net credit / Short call + Net credit",
    whenToUse: [
      "You think RV < IV and expect the underlying to stay inside a defined range",
      "Implied volatility is elevated (a common rule of thumb: IV rank above 30) — this is when premium selling pays",
      "You want the defined risk of wings over the uncapped tail risk of a naked short strangle",
      "Time horizon: 30–45 DTE at entry is the classic sweet spot — enough theta to harvest, not so close that gamma is extreme",
    ],
    risks: [
      "Max loss is significantly larger than max profit — disciplined sizing and management matter more than being right on any single trade",
      "A strong trend tests one wing; the short strike starts losing money quickly because it picks up delta and vega simultaneously",
      "Gamma risk accelerates as expiration approaches — the closer to expiry, the faster P&L whipsaws on small price changes",
      "IV expansion hurts the position mark-to-market even if price eventually holds",
    ],
    educationalContent: `
## How an Iron Condor Works

An iron condor is a four-leg, defined-risk, short-vol structure: a bull put spread below the stock + a bear call spread above the stock, same expiration. You collect a net credit. Max profit is the credit, realized if price stays between the short strikes. Max loss is capped by the long wings.

### Example
AAPL at $195. Sell the $190 put / buy the $185 put (bull put spread). Sell the $200 call / buy the $205 call (bear call spread). Net credit: $1.42 ($142). Max loss = ($5 − $1.42) × 100 = $358.

- **AAPL between $190–$200 at expiration**: All OTM. Keep the **$142**.
- **AAPL at $188.58 at expiration**: Lower break-even.
- **AAPL at $201.42 at expiration**: Upper break-even.
- **AAPL below $185 or above $205 at expiration**: Max loss = **$358**.

### The Real Bet: RV < IV, In a Range
An iron condor is the defined-risk version of a short strangle. Like the strangle, you're selling the market's implied move, betting realized volatility comes in lower than implied. Unlike the strangle, the long wings cap your catastrophic tail and let you size the position without worrying about overnight gap risk.

### Strike Selection
Common approaches:
- **Delta-based**: sell ~16-delta (roughly 1-standard-deviation) shorts for balanced POP vs credit
- **Technical-based**: place shorts outside recent support/resistance zones
- **Skew-aware**: because put skew is typically steeper than call skew, the put-spread side usually contributes more credit — some traders widen the put side asymmetrically

### Greek Profile
- **Theta: positive** (the whole point)
- **Vega: negative** — IV contraction is your friend
- **Delta: ~0 at inception**, picks up directional exposure as spot drifts
- **Gamma: negative and accelerating into expiration**

### Management
Typical playbook: enter 30–45 DTE, take profit at 25–50% of max credit, manage at 21 DTE (close or roll) regardless of P&L to avoid gamma risk in the last weeks. Rolling the tested side for a credit and keeping the untested side is a common adjustment; adding inversion (rolling strikes past each other) is an experienced-trader maneuver.

### Key Takeaway
Iron condors are the defined-risk workhorse of premium selling. Edge comes from selling overpriced IV, sizing such that max loss is survivable, and cycling trades with discipline rather than holding to expiration for the last nickel.
    `,
  },
  "iron-butterfly": {
    slug: "iron-butterfly",
    name: "Iron Butterfly",
    title: "Iron Butterfly Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate iron butterfly profit and loss. A four-leg neutral strategy with ATM short strikes that collects more credit than an iron condor.",
    h1: "Iron Butterfly Calculator",
    description:
      "An iron butterfly is like a narrow iron condor with the short strikes at the same price (ATM). It collects more credit but has a narrower profit zone. Best when you're very confident the stock won't move much.",
    sentiment: "neutral",
    defaultOptionType: "call",
    defaultPositionType: "short",
    includeStockLeg: false,
    maxProfit: "Net credit received × 100",
    maxLoss: "(Width of wing − Net credit) × 100",
    breakEvenFormula: "Short strike ± Net credit",
    whenToUse: [
      "You have a strong pin thesis — you expect the stock to close very near a specific level at expiration",
      "Classic setups: weekly options near major gamma walls, max-pain strikes at OpEx, strong technical pivots, known pinning behavior in mega-caps",
      "Implied volatility is elevated — the richer the ATM premium, the better this structure pays",
      "You accept a very narrow profit zone in exchange for a larger credit than an iron condor",
    ],
    risks: [
      "The profit zone is narrow and centered exactly at the short strikes — any meaningful move puts you in losses",
      "Max loss exceeds max profit — typical structures have tiny edge if managed poorly",
      "Gamma risk peaks exactly at the short strikes — the closer to expiration, the more explosive the P&L swings",
      "IV contraction helps, IV expansion hurts (same as iron condor but sharper because ATM vega is high)",
    ],
    educationalContent: `
## How an Iron Butterfly Works

A four-leg structure: sell an ATM call and ATM put (both at the same "body" strike), and buy protective OTM wings above and below. The short strikes being co-located at ATM is what distinguishes this from an iron condor.

### Example
AAPL at $195. Sell the $195 put for $3.40 and the $195 call for $3.60. Buy the $190 put for $0.80 and the $200 call for $1.80. Net credit: $4.40 ($440). Max loss = ($5 − $4.40) × 100 = $60.

- **AAPL at $195 at expiration**: Both shorts pin at strike. Max profit = **$440**.
- **AAPL at $190.60 or $199.40 at expiration**: Break-even points.
- **AAPL at or beyond $190 / $200 at expiration**: Max loss = **$60**.

### Iron Butterfly vs Iron Condor
- **Iron butterfly**: co-located short strikes at ATM. Larger credit, tiny profit zone, needs a pin.
- **Iron condor**: separated short strikes flanking ATM. Smaller credit, wider profit zone, needs range.

An iron butterfly is the credit-maximizing extreme of the condor family. Choose butterfly over condor only when you have a genuine reason to expect a pin at a specific level, not just a general "sideways" view.

### Where Pinning Actually Happens
Pinning is a real phenomenon at monthly/weekly expirations, particularly in heavily-optioned names. It tends to concentrate at strikes with high open interest near spot as dealers delta-hedge gamma. Max-pain analysis (see the Max Pain panel) estimates these strikes. The setup is strongest when:
- Expiration is near and the stock is already close to a key strike
- Open interest is concentrated at that strike
- No known catalyst (earnings, macro event) is likely to unpin it

### Key Takeaway
Iron butterflies are the biggest-credit defined-risk vol sale — but only pay off if the underlying pins at your short strike. Use sparingly, with a specific thesis (gamma wall, technical magnet, OpEx pinning), and always manage before expiration to avoid assignment on the ATM shorts.
    `,
  },
  "call-butterfly": {
    slug: "call-butterfly",
    name: "Long Call Butterfly",
    title: "Long Call Butterfly Calculator — Free Options Profit Calculator",
    metaDescription:
      "Calculate long call butterfly profit and loss. A three-leg defined-risk strategy with high reward potential near the center strike.",
    h1: "Long Call Butterfly Calculator",
    description:
      "A long call butterfly is a three-leg debit spread: buy one lower call, sell two middle calls, buy one higher call. Max profit occurs if the stock pins at the middle strike at expiration.",
    sentiment: "neutral",
    defaultOptionType: "call",
    defaultPositionType: "long",
    includeStockLeg: false,
    maxProfit: "(Width of wing − Net debit) × 100",
    maxLoss: "Net debit paid × 100",
    breakEvenFormula: "Lower strike + Net debit / Upper strike − Net debit",
    whenToUse: [
      "You have a specific price-level thesis and expect the stock to land near the body strike at expiration",
      "You want asymmetric reward-to-risk — often 3:1 or better — on a low-cost, defined-risk structure",
      "Typical setups: earnings pins at a key level, post-gap consolidation to test a level, OpEx pins at gamma walls, technical magnet strikes",
      "You prefer a debit structure with a tiny defined loss over the larger tail risk of an iron butterfly",
    ],
    risks: [
      "Probability of max profit is low — the stock must land very close to the body strike at expiration",
      "Until the final week, theta is mostly a drag; this trade pays off in the last few days if the thesis holds",
      "Outside the break-evens the full debit is lost — many traders never collect max profit even on directionally correct trades",
      "Liquidity matters: wide bid/ask on the components can eat into an already-small R:R edge",
    ],
    educationalContent: `
## How a Long Call Butterfly Works

Three strikes, four options: buy 1 call at strike A, sell 2 calls at strike B, buy 1 call at strike C (A < B < C, equal distance). Net debit. Tent-shaped payoff peaking at the body (strike B). Max profit at expiration if the stock lands exactly at B; loss limited to the debit if the stock finishes outside strikes A or C.

### Example
AAPL at $195. Buy the $190 call for $6.60, sell 2x $195 calls for $3.60 each, buy the $200 call for $1.80. Net debit: $1.20 ($120). Max profit = ($5 − $1.20) × 100 = $380 (≈3.2:1 R:R).

- **AAPL at $195 at expiration**: Max profit = **$380**.
- **AAPL at $191.20 or $198.80 at expiration**: Break-even.
- **AAPL at $190 or below, or $200 or above, at expiration**: Max loss = **$120**.

### The Pin Trade
A call butterfly is a bet on a specific landing zone, not on a direction. It's most useful when you have a reason to expect the stock to gravitate to and stay near a particular level — typically a heavily-optioned strike where dealer gamma hedging creates pinning pressure, or a strong technical magnet. Without that thesis, the probability of capturing even a fraction of max profit is low.

### Greek Profile
The Greeks change sign depending on where spot sits relative to the strikes:
- Below the long strike (A): mildly long delta, long gamma, negative theta
- Near the body (B): short gamma, positive theta (you benefit from time passing)
- Above the short wing (C): mildly short delta, long gamma again

This is why the trade works best entered well before expiration but really *pays* in the final few days, when gamma concentrates around the body strike.

### Butterfly Variants
- **Broken-wing butterfly**: unequal strike widths — can be structured for a net credit with directional skew
- **Put butterfly**: same P&L profile built from puts (pick based on liquidity/skew)
- **Iron butterfly**: put + call version using a credit structure (different tax/margin treatment)

### Key Takeaway
Long call butterflies are asymmetric defined-risk lottery tickets on a pin thesis. Best with a specific landing-zone hypothesis and 5–15 DTE, where the gamma concentration around the body rewards a correct thesis quickly. Without a real pin thesis, the low probability of max profit makes the economics thin.
    `,
  },
};

export function getStrategyBySlug(slug: string): StrategyDefinition | undefined {
  return strategyDefinitions[slug];
}

export function getAllStrategySlugs(): string[] {
  return Object.keys(strategyDefinitions);
}
