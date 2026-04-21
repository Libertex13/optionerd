-- Migration: portfolio tables (positions + scenarios)
-- Run in the Supabase SQL Editor.

-- ============================================================
-- Positions — tracked investment positions with state machine
-- ============================================================
create table public.positions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  state text not null default 'watching'
    check (state in ('structuring', 'watching', 'open', 'closed')),
  name text not null,
  ticker text not null,
  strategy text,                          -- 'iron-condor', 'long-call', etc (nullable, can be derived)
  entry_underlying_price numeric,         -- underlying price at entry
  entry_date timestamptz,                 -- null for structuring
  exit_date timestamptz,                  -- set on close
  realised_pnl numeric,                   -- set on close
  cost_basis numeric,                     -- user-specified capital committed; if null, derive from legs
  legs jsonb not null default '[]'::jsonb,
  stock_leg jsonb,
  notes text,
  tags text[] default '{}',
  position_order int,                     -- for drag-reorder
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_positions_user_id on public.positions(user_id);
create index idx_positions_state on public.positions(state);
create index idx_positions_ticker on public.positions(ticker);

alter table public.positions enable row level security;

create policy "Users can view own positions"
  on public.positions for select using (auth.uid() = user_id);
create policy "Users can insert own positions"
  on public.positions for insert with check (auth.uid() = user_id);
create policy "Users can update own positions"
  on public.positions for update using (auth.uid() = user_id);
create policy "Users can delete own positions"
  on public.positions for delete using (auth.uid() = user_id);

-- ============================================================
-- Scenarios — user-created stress test scenarios
-- ============================================================
create table public.scenarios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  target_date date,
  underlying_shocks jsonb default '{}'::jsonb,   -- { "TSLA": { mode: "pct", val: -15 }, "NVDA": { mode: "abs", val: 180 } }
  default_shock jsonb,                           -- applies to tickers not in underlying_shocks, e.g. { mode: "pct", val: -5 }
  iv_shock jsonb,                                -- { mode: "mult" | "add" | "abs", val: number }
  advance_days int default 0,                    -- days to advance time
  interest_rate numeric default 0.045,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_scenarios_user_id on public.scenarios(user_id);

alter table public.scenarios enable row level security;

create policy "Users can view own scenarios"
  on public.scenarios for select using (auth.uid() = user_id);
create policy "Users can insert own scenarios"
  on public.scenarios for insert with check (auth.uid() = user_id);
create policy "Users can update own scenarios"
  on public.scenarios for update using (auth.uid() = user_id);
create policy "Users can delete own scenarios"
  on public.scenarios for delete using (auth.uid() = user_id);

-- ============================================================
-- JSONB shapes (reference — not enforced by DB)
-- ============================================================
-- positions.legs:
-- [{ "side": "long" | "short",
--    "type": "call" | "put",
--    "strike": 150,
--    "entry_premium": 3.5,
--    "quantity": 1,
--    "expiration_date": "2026-05-15",
--    "implied_volatility": 0.28 }]
--
-- positions.stock_leg:
-- { "side": "long" | "short", "quantity": 100, "entry_price": 148.5 }
--
-- scenarios.underlying_shocks:
-- { "TSLA": { "mode": "pct", "val": -15 },
--   "NVDA": { "mode": "abs", "val": 180 } }
--
-- scenarios.iv_shock:
-- { "mode": "mult", "val": 1.5 }
