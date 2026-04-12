export type OptionType = "call" | "put";

export type PositionType = "long" | "short";

export interface OptionLeg {
  optionType: OptionType;
  positionType: PositionType;
  strikePrice: number;
  premium: number;
  quantity: number;
  expirationDate: string; // ISO date string
  impliedVolatility: number; // decimal, e.g. 0.25 for 25%
}

export interface StockLeg {
  positionType: PositionType;
  quantity: number;
  entryPrice: number;
}

export type StrategyLeg = OptionLeg | StockLeg;

export function isOptionLeg(leg: StrategyLeg): leg is OptionLeg {
  return "optionType" in leg;
}

export interface Strategy {
  name: string;
  slug: string;
  legs: StrategyLeg[];
  underlyingPrice: number;
  description: string;
}

export interface PayoffPoint {
  underlyingPrice: number;
  profitLoss: number;
  /** Per-leg P&L breakdown */
  legProfitLoss: number[];
}

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number; // daily decay (negative for long options)
  vega: number; // per 1% IV change
  rho: number;
}

export interface OptionPricingInput {
  spotPrice: number;
  strikePrice: number;
  timeToExpiry: number; // in years
  riskFreeRate: number; // decimal
  volatility: number; // decimal
  optionType: OptionType;
}

export interface PricingResult {
  price: number;
  greeks: Greeks;
}
