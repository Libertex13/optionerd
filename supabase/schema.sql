-- optionerd database schema
-- Run this in the Supabase SQL Editor to create the tables.

-- ============================================================
-- Profiles (auto-created on signup via trigger)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  plan text not null default 'casual',
  stripe_customer_id text unique,
  plan_period text,
  plan_expires_at timestamptz,
  created_at timestamptz default now() not null
);

-- RLS: users can only read/update their own profile
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Saved Trades
-- ============================================================
create table public.saved_trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  ticker text not null,
  underlying_price numeric not null,
  legs jsonb not null default '[]'::jsonb,
  stock_leg jsonb,
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Index for fast user queries
create index idx_saved_trades_user_id on public.saved_trades(user_id);
create index idx_saved_trades_ticker on public.saved_trades(ticker);

-- RLS: users can only CRUD their own trades
alter table public.saved_trades enable row level security;

create policy "Users can view own trades"
  on public.saved_trades for select
  using (auth.uid() = user_id);

create policy "Users can insert own trades"
  on public.saved_trades for insert
  with check (auth.uid() = user_id);

create policy "Users can update own trades"
  on public.saved_trades for update
  using (auth.uid() = user_id);

create policy "Users can delete own trades"
  on public.saved_trades for delete
  using (auth.uid() = user_id);

-- ============================================================
-- legs JSONB structure (for reference, not enforced by DB):
--
-- [
--   {
--     "option_type": "call" | "put",
--     "position_type": "long" | "short",
--     "strike_price": 150.00,
--     "premium": 3.50,
--     "quantity": 1,
--     "expiration_date": "2025-06-20",
--     "implied_volatility": 0.32
--   }
-- ]
--
-- stock_leg JSONB structure:
-- {
--   "position_type": "long" | "short",
--   "quantity": 100,
--   "entry_price": 148.50
-- }
-- ============================================================
