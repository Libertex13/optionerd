/**
 * Supabase database types.
 *
 * These types correspond to the tables you create in Supabase.
 * Update this file after creating tables — you can auto-generate
 * with: npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts
 */

export interface SavedTrade {
  id: string;
  user_id: string;
  name: string;
  ticker: string;
  underlying_price: number;
  legs: SavedTradeLeg[];
  stock_leg: SavedStockLeg | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SavedTradeLeg {
  option_type: "call" | "put";
  position_type: "long" | "short";
  strike_price: number;
  premium: number;
  quantity: number;
  expiration_date: string;
  implied_volatility: number;
}

export interface SavedStockLeg {
  position_type: "long" | "short";
  quantity: number;
  entry_price: number;
}

export type Plan = "casual" | "nerd";
export type PlanPeriod = "monthly" | "yearly";

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  plan: Plan;
  stripe_customer_id: string | null;
  plan_period: PlanPeriod | null;
  plan_expires_at: string | null;
  created_at: string;
}

/**
 * Database schema type placeholder.
 *
 * After creating tables in Supabase, generate proper types with:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 *
 * Then update client.ts and server.ts to use the generated types.
 * For now we use a loose type so .from() calls compile without
 * knowing the exact PostgREST schema.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Database {}
