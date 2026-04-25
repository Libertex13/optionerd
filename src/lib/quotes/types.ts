/**
 * Internal raw response shapes for the free-tier option-data providers.
 * Each adapter normalizes its raw response to the shared OptionChain type
 * exported from @/types/market — these helper types only describe the
 * upstream payloads we parse.
 */

/** Optionwatch listing endpoint: /api/contracts/{ticker} */
export interface OwListingExpiry {
  calls?: OwListingContract[];
  puts?: OwListingContract[];
}

export interface OwListingContract {
  ticker: string; // OCC symbol, e.g. SMCI260501C00022500
  contract_type: "call" | "put";
  expiration_date: string; // YYYY-MM-DD
  strike_price: number;
  underlying_ticker: string;
  shares_per_contract: number;
}

/** Optionwatch snapshot endpoint: /api/contracts/snapshot/{ticker}/{expiry} */
export type OwSnapshot = Record<string, OwSnapshotContract>;

export interface OwSnapshotContract {
  ticker: string;
  bidPrice?: number;
  bidSize?: number;
  bidTime?: number;
  askPrice?: number;
  askSize?: number;
  lastTradePrice?: number;
  lastTradeSize?: number;
  lastTradeDate?: number | null;
  greeks?: { delta?: number; gamma?: number; theta?: number; vega?: number };
}

/** Nasdaq option-chain endpoint */
export interface NasdaqChainResponse {
  data?: {
    lastTrade?: string;
    table?: { rows?: NasdaqRow[] };
  };
}

export interface NasdaqRow {
  expirygroup?: string;
  expiryDate?: string | null;
  strike?: string | null;
  c_Last?: string | null;
  c_Bid?: string | null;
  c_Ask?: string | null;
  c_Volume?: string | null;
  c_Openinterest?: string | null;
  p_Last?: string | null;
  p_Bid?: string | null;
  p_Ask?: string | null;
  p_Volume?: string | null;
  p_Openinterest?: string | null;
}
