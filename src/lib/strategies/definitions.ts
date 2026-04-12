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
};

export function getStrategyBySlug(slug: string): StrategyDefinition | undefined {
  return strategyDefinitions[slug];
}

export function getAllStrategySlugs(): string[] {
  return Object.keys(strategyDefinitions);
}
