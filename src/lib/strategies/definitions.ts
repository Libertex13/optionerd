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
      "You are bullish on the underlying stock",
      "You want leveraged upside exposure with limited downside",
      "You expect a significant move higher before expiration",
      "You want to define your maximum risk upfront",
    ],
    risks: [
      "Time decay (theta) works against you — the option loses value every day",
      "If the stock doesn't move above the break-even by expiration, you lose your entire premium",
      "High implied volatility means higher premiums, reducing your potential return",
    ],
    educationalContent: `
## How a Long Call Works

When you buy a call option, you're paying for the right — but not the obligation — to purchase 100 shares of stock at a specific price (the strike price) before a specific date (expiration).

### Example
Say AAPL is trading at $195 and you buy the $200 call expiring in 30 days for $4.63 per share ($463 total).

- **If AAPL is at $210 at expiration**: Your call is worth $10 (intrinsic value). Your profit is ($10 - $4.63) × 100 = **$537**.
- **If AAPL is at $200 at expiration**: Your call expires worthless. You lose the full **$463** premium.
- **If AAPL is at $250 at expiration**: Your call is worth $50. Your profit is ($50 - $4.63) × 100 = **$4,537**.

### Key Takeaway
Long calls provide leveraged bullish exposure. You can control 100 shares of stock for a fraction of the cost, but you must be right about both **direction** and **timing**.
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
      "You are bearish on the underlying stock",
      "You want to hedge an existing long stock position",
      "You expect a significant move lower before expiration",
      "You want defined risk compared to short selling",
    ],
    risks: [
      "Time decay (theta) works against you",
      "If the stock doesn't drop below break-even, you lose your premium",
      "Stocks tend to go up over time, making puts harder to profit from statistically",
    ],
    educationalContent: `
## How a Long Put Works

Buying a put option gives you the right to sell 100 shares at the strike price before expiration. It's the most straightforward way to bet on a stock declining, with risk limited to the premium you pay.

### Example
Say AAPL is trading at $195 and you buy the $190 put expiring in 30 days for $4.00 per share ($400 total).

- **If AAPL drops to $180 at expiration**: Your put is worth $10. Your profit is ($10 - $4.00) × 100 = **$600**.
- **If AAPL stays at $195**: Your put expires worthless. You lose the full **$400** premium.
- **If AAPL drops to $150**: Your put is worth $40. Your profit is ($40 - $4.00) × 100 = **$3,600**.

### Long Put vs. Short Selling
Unlike short selling, where losses are theoretically unlimited (the stock can rise forever), a long put caps your maximum loss at the premium paid. This makes puts an attractive alternative for bearish bets.
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
      "You already own shares and want to generate income",
      "You are neutral to slightly bullish on the stock",
      "You are willing to sell your shares at the strike price",
      "You want to reduce your cost basis on the stock",
    ],
    risks: [
      "If the stock rises sharply above the strike, you miss out on gains (opportunity cost)",
      "If the stock drops significantly, the premium only partially offsets losses",
      "You still bear the full downside risk of owning the stock",
    ],
    educationalContent: `
## How a Covered Call Works

A covered call is a two-part strategy: you own 100 shares of stock and simultaneously sell a call option against those shares. The call you sell obligates you to sell your shares at the strike price if the buyer exercises.

### Example
Say you own 100 shares of AAPL at $195 and you sell the $205 call for $3.00 per share ($300 total).

- **If AAPL is at $210 at expiration**: Your shares are called away at $205. Profit: ($205 - $195 + $3) × 100 = **$1,300**. You miss the extra $5 of upside.
- **If AAPL stays at $195**: The call expires worthless. You keep your shares and the $300 premium. **$300 profit**.
- **If AAPL drops to $185**: You lose $10/share on stock but keep the $3 premium. Net loss: ($185 - $195 + $3) × 100 = **-$700** (vs -$1,000 without the covered call).

### Why Traders Love Covered Calls
Covered calls are the gateway to options selling. They generate consistent income, reduce cost basis, and work well in flat-to-slightly-bullish markets. The tradeoff is capped upside.
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
      "You are moderately bullish — expecting a move up but not an explosion",
      "You want to reduce the cost of a long call by selling a higher-strike call",
      "Implied volatility is elevated, making naked long calls expensive",
      "You want defined risk on both sides",
    ],
    risks: [
      "Max profit is capped at the short strike — you miss out on large moves",
      "You still lose the full debit if the stock is below the long strike at expiry",
      "Time decay works against you (net debit position)",
    ],
    educationalContent: `
## How a Bull Call Spread Works

Buy a call at strike A and sell a call at strike B (B > A), same expiration. The short call partially finances the long call, lowering your breakeven and cost.

### Example
AAPL at $195. Buy the $195 call for $5.80, sell the $205 call for $2.20. Net debit: $3.60 ($360).

- **AAPL at $210**: Both calls ITM. Profit = ($10 − $3.60) × 100 = **$640**.
- **AAPL at $198.60**: Break-even. The long call is worth $3.60, offsetting the debit.
- **AAPL at $190**: Both expire worthless. Loss = **$360** (the debit).

### Key Takeaway
Bull call spreads trade unlimited upside for a lower breakeven. They shine in moderately bullish scenarios where you expect the stock to reach but not blow past the short strike.
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
      "You are moderately bearish — expecting a decline but not a crash",
      "You want to reduce the cost of a long put",
      "Implied volatility is elevated, making naked long puts expensive",
      "You want defined risk and don't want to short sell stock",
    ],
    risks: [
      "Max profit is capped — you don't benefit from a crash below the short strike",
      "You lose the full debit if the stock stays above the long strike",
      "Time decay works against you",
    ],
    educationalContent: `
## How a Bear Put Spread Works

Buy a put at strike A and sell a put at strike B (B < A), same expiration. The short put partially offsets the cost of the long put.

### Example
AAPL at $195. Buy the $200 put for $6.00, sell the $190 put for $2.80. Net debit: $3.20 ($320).

- **AAPL at $185**: Both puts ITM. Profit = ($10 − $3.20) × 100 = **$680**.
- **AAPL at $196.80**: Break-even. The long put is worth $3.20.
- **AAPL at $205**: Both expire worthless. Loss = **$320**.

### Key Takeaway
Bear put spreads are the defined-risk way to bet bearish. You sacrifice unlimited downside profit for a much lower cost of entry.
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
      "You are neutral to mildly bullish — you don't expect the stock to fall much",
      "You want to sell premium and collect theta decay",
      "Implied volatility is elevated, making credits richer",
      "You want defined risk compared to a naked short put",
    ],
    risks: [
      "You lose if the stock drops below the short strike minus credit",
      "Max loss is larger than max profit (width − credit)",
      "Early assignment risk on the short put if it goes deep ITM",
    ],
    educationalContent: `
## How a Bull Put Spread Works

Sell a put at strike A and buy a put at strike B (B < A), same expiration. You collect a net credit. If the stock stays above strike A at expiry, both expire worthless and you keep the credit.

### Example
AAPL at $195. Sell the $195 put for $3.40, buy the $190 put for $2.00. Net credit: $1.40 ($140).

- **AAPL at $200**: Both expire worthless. You keep the **$140** credit.
- **AAPL at $193.60**: Break-even. Short put is worth $1.40, offsetting the credit.
- **AAPL at $185**: Max loss = ($5 − $1.40) × 100 = **$360**.

### Key Takeaway
Bull put spreads are the credit-spread version of a bullish bet. You profit from time decay and a stable or rising stock. The tradeoff: max loss exceeds max profit, but probability of profit is typically higher.
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
      "You are neutral to mildly bearish",
      "You want to sell premium and collect theta",
      "Implied volatility is elevated",
      "You want defined risk compared to a naked short call",
    ],
    risks: [
      "You lose if the stock rises above the short strike plus credit",
      "Max loss exceeds max profit",
      "Early assignment risk on the short call",
    ],
    educationalContent: `
## How a Bear Call Spread Works

Sell a call at strike A and buy a call at strike B (B > A), same expiration. You collect a net credit and want the stock to stay below strike A.

### Example
AAPL at $195. Sell the $195 call for $5.40, buy the $200 call for $3.00. Net credit: $2.40 ($240).

- **AAPL at $190**: Both expire worthless. Keep the **$240** credit.
- **AAPL at $197.40**: Break-even.
- **AAPL at $205**: Max loss = ($5 − $2.40) × 100 = **$260**.

### Key Takeaway
Bear call spreads are the bearish cousin of the bull put spread. Sell premium, collect theta, profit when the stock stays flat or drops.
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
      "You expect a big move but don't know the direction",
      "Before earnings, FDA decisions, or other binary events",
      "Implied volatility is low relative to expected actual move",
      "You want unlimited profit potential on both sides",
    ],
    risks: [
      "Expensive — you pay two premiums, so the stock must move significantly",
      "Time decay is brutal — two long options decaying simultaneously",
      "IV crush after the event can destroy value even if the stock moves",
    ],
    educationalContent: `
## How a Long Straddle Works

Buy a call and a put at the same strike price and expiration. Your payoff is V-shaped: you profit if the stock moves far enough in either direction.

### Example
AAPL at $195. Buy the $195 call for $3.80 and the $195 put for $3.40. Total cost: $7.20 ($720).

- **AAPL at $210**: Call worth $15, put worthless. Profit = ($15 − $7.20) × 100 = **$780**.
- **AAPL at $180**: Put worth $15, call worthless. Profit = ($15 − $7.20) × 100 = **$780**.
- **AAPL at $195**: Both expire ATM/worthless. Loss = **$720**.
- **Break-evens**: $187.80 and $202.20.

### Key Takeaway
Straddles are pure volatility bets. You're paying for gamma — the right to profit from a big move. The key risk is IV crush: if you buy before earnings and IV drops after, you can lose even if the stock moves.
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
      "You expect a big move but don't know the direction",
      "You want a cheaper alternative to a straddle",
      "Before a major catalyst where a large move is expected",
      "You're willing to accept wider breakevens for lower cost",
    ],
    risks: [
      "The stock must move more than a straddle to break even",
      "Both legs can expire worthless if the stock stays in the range",
      "Time decay and IV crush are significant risks",
    ],
    educationalContent: `
## How a Long Strangle Works

Buy an OTM call and an OTM put with the same expiration. Cheaper than a straddle, but breakevens are wider.

### Example
AAPL at $195. Buy the $200 call for $2.60 and the $190 put for $2.20. Total cost: $4.80 ($480).

- **AAPL at $215**: Call worth $15, put worthless. Profit = ($15 − $4.80) × 100 = **$1,020**.
- **AAPL at $180**: Put worth $10, call worthless. Profit = ($10 − $4.80) × 100 = **$520**.
- **AAPL at $195**: Both expire OTM. Loss = **$480**.
- **Break-evens**: $185.20 and $204.80.

### Key Takeaway
Strangles are cheaper straddles. The tradeoff: the stock needs to move further to profit. Best used when you're confident a big move is coming but unsure of direction.
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
      "You expect the stock to stay in a range through expiration",
      "Implied volatility is elevated and you want to sell premium",
      "You have sufficient margin and risk tolerance for undefined risk",
      "You want higher probability of profit vs. iron condor (no wings)",
    ],
    risks: [
      "Unlimited loss on both sides — a large move in either direction can be catastrophic",
      "Margin requirements are significant",
      "A gap move (earnings, news) can cause massive losses overnight",
    ],
    educationalContent: `
## How a Short Strangle Works

Sell an OTM call and an OTM put with the same expiration. You collect premium and want the stock to stay between your strikes.

### Example
AAPL at $195. Sell the $205 call for $2.20, sell the $185 put for $1.90. Total credit: $4.10 ($410).

- **AAPL at $195**: Both expire OTM. Keep the **$410** credit.
- **AAPL at $220**: Call is $15 ITM. Loss = ($15 − $4.10) × 100 = **$1,090**.
- **AAPL at $170**: Put is $15 ITM. Loss = ($15 − $4.10) × 100 = **$1,090**.

### Key Takeaway
Short strangles are high-probability, high-risk. You collect premium and profit ~71% of the time, but a tail event can wipe out months of gains. Many traders prefer the iron condor (wings added) for defined risk.
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
      "You expect the underlying to stay inside a range through expiration",
      "Implied volatility is elevated — you want to sell premium, not buy it",
      "You want defined risk on both wings (unlike a naked strangle)",
      "Time horizon: 14–45 DTE is the sweet spot",
    ],
    risks: [
      "Max loss is significantly larger than max profit",
      "If the stock trends strongly in one direction, one wing gets tested",
      "Gamma risk increases as expiration approaches",
      "IV expansion can temporarily hurt the position",
    ],
    educationalContent: `
## How an Iron Condor Works

An iron condor combines a bull put spread (below the stock) and a bear call spread (above the stock). You sell two OTM verticals and collect a net credit.

### Example
AAPL at $195. Sell a bull put spread ($185/$190) and a bear call spread ($200/$205). Net credit: $1.42 ($142).

- **AAPL between $190–$200**: All options expire OTM. Keep the **$142** credit.
- **AAPL at $188.58**: Lower break-even.
- **AAPL at $201.42**: Upper break-even.
- **AAPL below $185 or above $205**: Max loss = ($5 − $1.42) × 100 = **$358**.

### Iron Condor vs. Short Strangle
An iron condor is a defined-risk version of a short strangle. The long wings cap your loss but reduce the credit collected. For most traders, this tradeoff is worth it.

### Key Takeaway
Iron condors are the workhorse of premium-selling. Aim for IV rank above 30, 14–45 DTE, and take profits at 50% of max profit.
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
      "You expect the stock to pin near the current price",
      "You want a bigger credit than an iron condor",
      "Implied volatility is elevated",
      "You accept narrower breakevens for more premium",
    ],
    risks: [
      "Very narrow profit zone — even a moderate move can cause losses",
      "Max loss is larger than max profit",
      "Gamma risk is highest right at the short strikes",
    ],
    educationalContent: `
## How an Iron Butterfly Works

Sell both an ATM call and an ATM put, then buy protective wings (OTM call and OTM put). The short strikes are at the same price.

### Example
AAPL at $195. Sell the $195 put for $3.40 and the $195 call for $3.60. Buy the $190 put for $0.80 and the $200 call for $1.80. Net credit: $4.40 ($440).

- **AAPL at $195**: Both shorts expire ATM. Keep the **$440** credit.
- **AAPL at $190.60 or $199.40**: Break-even points.
- **AAPL below $190 or above $200**: Max loss = ($5 − $4.40) × 100 = **$60**.

### Key Takeaway
Iron butterflies collect the most credit of any defined-risk neutral strategy. The tradeoff is a very narrow profit zone. Best for pinning scenarios (e.g., OpEx near a strong support/resistance level).
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
      "You expect the stock to pin near a specific price at expiration",
      "You want very high reward-to-risk (often 3:1 or better)",
      "You have a strong directional thesis about where the stock will land",
      "Low-cost way to bet on a pin",
    ],
    risks: [
      "Very narrow max-profit zone — pinning is unlikely",
      "Time decay hurts until the final days before expiration",
      "The stock must stay very close to the center strike to profit significantly",
    ],
    educationalContent: `
## How a Long Call Butterfly Works

Buy 1 call at strike A, sell 2 calls at strike B, buy 1 call at strike C (A < B < C, equal width). The result is a tent-shaped payoff with max profit at the center strike.

### Example
AAPL at $195. Buy the $190 call for $6.60, sell 2x $195 calls for $3.60 each, buy the $200 call for $1.80. Net debit: $1.20 ($120).

- **AAPL at $195**: Max profit = ($5 − $1.20) × 100 = **$380**.
- **AAPL at $191.20 or $198.80**: Break-even points.
- **AAPL below $190 or above $200**: Max loss = **$120** (the debit).

### Key Takeaway
Butterflies are high-reward, low-cost lottery tickets. The R/R is excellent but the probability of max profit is low. Best used when you have a strong pin thesis.
    `,
  },
};

export function getStrategyBySlug(slug: string): StrategyDefinition | undefined {
  return strategyDefinitions[slug];
}

export function getAllStrategySlugs(): string[] {
  return Object.keys(strategyDefinitions);
}
