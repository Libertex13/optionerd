export interface StockQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  timestamp: number;
}

export interface OptionContract {
  contractSymbol: string;
  ticker: string;
  expirationDate: string;
  strikePrice: number;
  optionType: "call" | "put";
  bid: number;
  ask: number;
  last: number;
  mid: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
  inTheMoney: boolean;
}

export interface OptionChainExpiry {
  expirationDate: string;
  daysToExpiry: number;
  calls: OptionContract[];
  puts: OptionContract[];
}

export interface OptionChain {
  ticker: string;
  underlyingPrice: number;
  expirations: OptionChainExpiry[];
  quoteSource?: "nasdaq" | "optionwatch";
  quoteDelayMinutes?: number;
  quoteFetchedAt?: number;
}

export interface TickerSearchResult {
  ticker: string;
  name: string;
  market: string;
  type: string;
}
