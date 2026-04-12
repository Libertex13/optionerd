/** Default risk-free rate (~10Y Treasury yield as of 2024) */
export const DEFAULT_RISK_FREE_RATE = 0.045;

/** Trading days per year */
export const TRADING_DAYS_PER_YEAR = 252;

/** Calendar days per year */
export const CALENDAR_DAYS_PER_YEAR = 365;

/** Massive API cache TTL in seconds (5 minutes for delayed data) */
export const API_CACHE_TTL_SECONDS = 300;

/** Number of price points to generate for payoff diagrams */
export const PAYOFF_PRICE_POINTS = 200;

/** Payoff diagram range: percentage below current price */
export const PAYOFF_RANGE_LOW_PCT = 0.5;

/** Payoff diagram range: percentage above current price */
export const PAYOFF_RANGE_HIGH_PCT = 2.0;

/** IV solver convergence threshold */
export const IV_CONVERGENCE_THRESHOLD = 0.001;

/** IV solver maximum iterations */
export const IV_MAX_ITERATIONS = 100;

/** IV solver initial guess */
export const IV_INITIAL_GUESS = 0.3;
