/** Massive API response types (Polygon.io compatible) */

export interface MassiveTickerSearchResponse {
  results: MassiveTickerResult[];
  status: string;
  request_id: string;
  count: number;
}

export interface MassiveTickerResult {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
}

export interface MassiveSnapshotResponse {
  status: string;
  request_id: string;
  results: MassiveOptionSnapshot[];
}

export interface MassiveOptionSnapshot {
  break_even_price: number;
  day: {
    change: number;
    change_percent: number;
    close: number;
    high: number;
    last_updated: number;
    low: number;
    open: number;
    previous_close: number;
    volume: number;
    vwap: number;
  };
  details: {
    contract_type: "call" | "put";
    exercise_style: string;
    expiration_date: string;
    shares_per_contract: number;
    strike_price: number;
    ticker: string;
  };
  greeks?: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
  implied_volatility?: number;
  last_quote: {
    ask: number;
    ask_size: number;
    bid: number;
    bid_size: number;
    last_updated: number;
    midpoint: number;
    timeframe: string;
  };
  open_interest: number;
  underlying_asset: {
    change_to_break_even: number;
    last_updated: number;
    price: number;
    ticker: string;
    timeframe: string;
  };
}

export interface MassiveStockSnapshotResponse {
  status: string;
  request_id: string;
  ticker: {
    ticker: string;
    name: string;
    todaysChange: number;
    todaysChangePerc: number;
    updated: number;
    day: {
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
      vw: number;
    };
    lastTrade: {
      p: number;
      s: number;
      t: number;
    };
    prevDay: {
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
      vw: number;
    };
  };
}
