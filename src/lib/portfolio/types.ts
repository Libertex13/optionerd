// ============================================================
// DB types (match the Supabase positions + scenarios tables)
// ============================================================

export type PositionState = "structuring" | "watching" | "open" | "closed";

export interface PositionLeg {
  side: "long" | "short";
  type: "call" | "put";
  strike: number;
  entry_premium: number;
  quantity: number;
  expiration_date: string;
  implied_volatility: number;
}

export interface PositionStockLeg {
  side: "long" | "short";
  quantity: number;
  entry_price: number;
}

/** DB row shape from public.positions */
export interface Position {
  id: string;
  user_id: string;
  state: PositionState;
  name: string;
  ticker: string;
  strategy: string | null;
  entry_underlying_price: number | null;
  entry_date: string | null;
  exit_date: string | null;
  realised_pnl: number | null;
  cost_basis: number | null;
  legs: PositionLeg[];
  stock_leg: PositionStockLeg | null;
  notes: string | null;
  tags: string[];
  position_order: number | null;
  created_at: string;
  updated_at: string;
}

export interface ShockRule {
  mode: "pct" | "abs" | "pin";
  val: number;
}

export interface IvShock {
  mode: "mult" | "add" | "abs";
  val: number;
}

/** DB row shape from public.scenarios */
export interface Scenario {
  id: string;
  user_id: string | null;  // null for system presets
  name: string;
  description: string | null;
  target_date: string | null;
  underlying_shocks: Record<string, ShockRule>;
  default_shock: ShockRule | null;
  iv_shock: IvShock | null;
  advance_days: number;
  interest_rate: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_preset?: boolean;   // client-side flag: true for system presets
}

// ============================================================
// UI types (compact shapes used by the dashboard components)
// ============================================================

export type LegSide = "long" | "short";
export type LegType = "call" | "put";

export interface PortfolioLeg {
  s: LegSide;
  t: LegType;
  k: number;            // strike
  p: number;            // entry premium
  q: number;            // contracts
  iv: number;           // entry implied vol (annualized, decimal)
  exp: string;          // expiration ISO date (YYYY-MM-DD)
}

export interface PortfolioGreeks {
  delta: number;        // $ per $1 underlying move
  gamma: number;        // $ change in delta per $1
  theta: number;        // $ / calendar day
  vega: number;         // $ per 1% IV change
}

/** Per-leg mark output from markLeg(). Kept here to avoid cyclic imports. */
export interface LegMark {
  dte: number;
  value: number;     // BS mid value per share
  pnl: number;       // $ P/L for this leg (marked-to-market)
  delta: number;     // $ per $1 underlying move
  gamma: number;     // $ change in delta per $1
  theta: number;     // $ / calendar day
  vega: number;      // $ per 1% IV change
}

export interface PortfolioPosition {
  id: string;
  state: PositionState;
  name: string;
  strat: string;
  ticker: string;
  px: number;           // current underlying (live if feed available, else entry)
  pxLive: boolean;      // true when px comes from a live quote
  legs: PortfolioLeg[];
  stockLeg: PositionStockLeg | null;
  net: number;          // credit (+) / debit (−) in dollars
  dte: number;          // days to nearest expiry
  dteMax: number;       // span from entry to latest expiry (for progress bar)
  cost: number;         // capital at risk in dollars
  pnl: number;          // realised (closed) or marked-to-market (open/watching)
  pnlPct: number;       // % of cost
  entry: string | null; // date label
  marks: LegMark[];     // per-leg marks, one entry per leg
  greeks: PortfolioGreeks;
}
