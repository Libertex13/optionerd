-- Migration: TradeStation TradeManager Analysis imports
-- Run in the Supabase SQL Editor before using the Trade Analysis report import.

create table public.tradestation_trade_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  source_filename text,
  file_sha256 text not null,
  report_name text default 'TradeManager Analysis' not null,
  broker text default 'tradestation' not null,
  account_names text[] default '{}'::text[] not null,
  first_trade_at timestamptz,
  last_trade_at timestamptz,
  counts jsonb default '{}'::jsonb not null,
  performance_summary jsonb default '[]'::jsonb not null,
  trade_analysis jsonb default '[]'::jsonb not null,
  periodical_returns jsonb default '{}'::jsonb not null,
  raw_report jsonb default '{}'::jsonb not null,
  imported_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, file_sha256)
);

create table public.tradestation_trades (
  id uuid default gen_random_uuid() primary key,
  report_id uuid references public.tradestation_trade_reports(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  trade_number integer,
  account text,
  symbol text not null,
  trade_type text,
  opened_at timestamptz,
  closed_at timestamptz,
  entry_action text,
  exit_action text,
  entry_price numeric,
  exit_price numeric,
  quantity numeric,
  net_profit numeric,
  percent_profit numeric,
  runup_or_drawdown numeric,
  efficiency numeric,
  total_efficiency numeric,
  commission numeric,
  raw jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null
);

create index idx_tradestation_trade_reports_user_imported
  on public.tradestation_trade_reports(user_id, imported_at desc);
create index idx_tradestation_trades_report
  on public.tradestation_trades(report_id, closed_at desc);
create index idx_tradestation_trades_user_closed
  on public.tradestation_trades(user_id, closed_at desc);
create index idx_tradestation_trades_symbol
  on public.tradestation_trades(user_id, symbol);

alter table public.tradestation_trade_reports enable row level security;
alter table public.tradestation_trades enable row level security;

create policy "Users can view own TradeStation reports"
  on public.tradestation_trade_reports for select using (auth.uid() = user_id);
create policy "Users can insert own TradeStation reports"
  on public.tradestation_trade_reports for insert with check (auth.uid() = user_id);
create policy "Users can update own TradeStation reports"
  on public.tradestation_trade_reports for update using (auth.uid() = user_id);
create policy "Users can delete own TradeStation reports"
  on public.tradestation_trade_reports for delete using (auth.uid() = user_id);

create policy "Users can view own TradeStation trades"
  on public.tradestation_trades for select using (auth.uid() = user_id);
create policy "Users can insert own TradeStation trades"
  on public.tradestation_trades for insert with check (auth.uid() = user_id);
create policy "Users can update own TradeStation trades"
  on public.tradestation_trades for update using (auth.uid() = user_id);
create policy "Users can delete own TradeStation trades"
  on public.tradestation_trades for delete using (auth.uid() = user_id);
