-- Migration: tradestation_connections
-- Stores OAuth tokens for users who have connected their TradeStation account.
-- One row per user (user_id PK) — reconnecting upserts.
-- Run in the Supabase SQL Editor.

create table if not exists public.tradestation_connections (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token  text not null,
  refresh_token text not null,
  expires_at    timestamptz not null,
  account_ids   text[] default '{}',
  scope         text,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

alter table public.tradestation_connections enable row level security;

drop policy if exists "Users can view own ts connection"   on public.tradestation_connections;
drop policy if exists "Users can insert own ts connection" on public.tradestation_connections;
drop policy if exists "Users can update own ts connection" on public.tradestation_connections;
drop policy if exists "Users can delete own ts connection" on public.tradestation_connections;

create policy "Users can view own ts connection"
  on public.tradestation_connections for select using (auth.uid() = user_id);
create policy "Users can insert own ts connection"
  on public.tradestation_connections for insert with check (auth.uid() = user_id);
create policy "Users can update own ts connection"
  on public.tradestation_connections for update using (auth.uid() = user_id);
create policy "Users can delete own ts connection"
  on public.tradestation_connections for delete using (auth.uid() = user_id);
