-- Migration: brokerage activity and cash balance sync tables
-- Run in the Supabase SQL Editor before using /api/brokerage/sync.

-- ============================================================
-- Brokerage Activities — historical transactions from brokers
-- ============================================================
create table public.brokerage_activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  broker text not null,
  broker_account_id text not null,
  account_name text,
  institution_name text,
  activity_key text not null,
  snaptrade_activity_id text,
  external_reference_id text,
  type text,
  option_type text,
  symbol text,
  option_symbol text,
  description text,
  trade_date timestamptz,
  settlement_date timestamptz,
  amount numeric,
  units numeric,
  price numeric,
  fee numeric,
  currency_code text,
  raw jsonb not null,
  synced_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, broker, broker_account_id, activity_key)
);

create index idx_brokerage_activities_user_id
  on public.brokerage_activities(user_id);
create index idx_brokerage_activities_account
  on public.brokerage_activities(user_id, broker, broker_account_id);
create index idx_brokerage_activities_trade_date
  on public.brokerage_activities(trade_date desc);
create index idx_brokerage_activities_type
  on public.brokerage_activities(type);

alter table public.brokerage_activities enable row level security;

create policy "Users can view own brokerage activities"
  on public.brokerage_activities for select using (auth.uid() = user_id);
create policy "Users can insert own brokerage activities"
  on public.brokerage_activities for insert with check (auth.uid() = user_id);
create policy "Users can update own brokerage activities"
  on public.brokerage_activities for update using (auth.uid() = user_id);
create policy "Users can delete own brokerage activities"
  on public.brokerage_activities for delete using (auth.uid() = user_id);

-- ============================================================
-- Brokerage Cash Balances — latest cash and buying power
-- ============================================================
create table public.brokerage_cash_balances (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  broker text not null,
  broker_account_id text not null,
  account_name text,
  institution_name text,
  currency_code text not null,
  cash numeric,
  buying_power numeric,
  raw jsonb not null,
  synced_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, broker, broker_account_id, currency_code)
);

create index idx_brokerage_cash_balances_user_id
  on public.brokerage_cash_balances(user_id);
create index idx_brokerage_cash_balances_account
  on public.brokerage_cash_balances(user_id, broker, broker_account_id);

alter table public.brokerage_cash_balances enable row level security;

create policy "Users can view own brokerage cash balances"
  on public.brokerage_cash_balances for select using (auth.uid() = user_id);
create policy "Users can insert own brokerage cash balances"
  on public.brokerage_cash_balances for insert with check (auth.uid() = user_id);
create policy "Users can update own brokerage cash balances"
  on public.brokerage_cash_balances for update using (auth.uid() = user_id);
create policy "Users can delete own brokerage cash balances"
  on public.brokerage_cash_balances for delete using (auth.uid() = user_id);
