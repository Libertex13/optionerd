-- Seed positions from brokerage snapshot (April 2026)
-- Run in the Supabase SQL Editor.
--
-- Safe to re-run: RLS + policies are idempotent, the INSERT is append-only.

-- ------------------------------------------------------------
-- Ensure RLS + policies exist before seeding rows.
-- ------------------------------------------------------------
alter table public.positions enable row level security;

drop policy if exists "Users can view own positions"   on public.positions;
drop policy if exists "Users can insert own positions" on public.positions;
drop policy if exists "Users can update own positions" on public.positions;
drop policy if exists "Users can delete own positions" on public.positions;

create policy "Users can view own positions"
  on public.positions for select using (auth.uid() = user_id);
create policy "Users can insert own positions"
  on public.positions for insert with check (auth.uid() = user_id);
create policy "Users can update own positions"
  on public.positions for update using (auth.uid() = user_id);
create policy "Users can delete own positions"
  on public.positions for delete using (auth.uid() = user_id);

-- Do the same for scenarios while we're here (same warning is coming for it).
alter table public.scenarios enable row level security;

drop policy if exists "Users can view own scenarios"   on public.scenarios;
drop policy if exists "Users can insert own scenarios" on public.scenarios;
drop policy if exists "Users can update own scenarios" on public.scenarios;
drop policy if exists "Users can delete own scenarios" on public.scenarios;

create policy "Users can view own scenarios"
  on public.scenarios for select using (auth.uid() = user_id);
create policy "Users can insert own scenarios"
  on public.scenarios for insert with check (auth.uid() = user_id);
create policy "Users can update own scenarios"
  on public.scenarios for update using (auth.uid() = user_id);
create policy "Users can delete own scenarios"
  on public.scenarios for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Seed rows
-- ------------------------------------------------------------
with me as (
  select id as user_id
  from auth.users
  where email = 'nachoplanas.np@gmail.com'
  limit 1
)
insert into public.positions
  (user_id, state, name, ticker, strategy, cost_basis, legs)
select me.user_id, v.state, v.name, v.ticker, v.strategy, v.cost_basis, v.legs::jsonb
from me,
(values
  ('open', 'FORM May 15 125 Call',      'FORM', 'long-call',
    3050.00,
    '[{"side":"long","type":"call","strike":125,"entry_premium":15.25,"quantity":2,"expiration_date":"2026-05-15","implied_volatility":0}]'),

  ('open', 'KEYS Jun 18 350 Call',      'KEYS', 'long-call',
    3720.00,
    '[{"side":"long","type":"call","strike":350,"entry_premium":18.60,"quantity":2,"expiration_date":"2026-06-18","implied_volatility":0}]'),

  ('open', 'TER May 15 420 Call',       'TER',  'long-call',
    1800.00,
    '[{"side":"long","type":"call","strike":420,"entry_premium":18.00,"quantity":1,"expiration_date":"2026-05-15","implied_volatility":0}]'),

  ('open', 'GOOG Jun 18 340 Call',      'GOOG', 'long-call',
    3610.00,
    '[{"side":"long","type":"call","strike":340,"entry_premium":18.05,"quantity":2,"expiration_date":"2026-06-18","implied_volatility":0}]'),

  ('open', 'ADBE Jun 18 230 Put',       'ADBE', 'long-put',
    2600.00,
    '[{"side":"long","type":"put","strike":230,"entry_premium":13.00,"quantity":2,"expiration_date":"2026-06-18","implied_volatility":0}]'),

  ('open', 'CMG May 15 30 Put',         'CMG',  'long-put',
    1560.60,
    '[{"side":"long","type":"put","strike":30,"entry_premium":1.73,"quantity":9,"expiration_date":"2026-05-15","implied_volatility":0}]'),

  ('open', 'SMCI Jun 18 27 Put',        'SMCI', 'long-put',
    586.00,
    '[{"side":"long","type":"put","strike":27,"entry_premium":2.93,"quantity":2,"expiration_date":"2026-06-18","implied_volatility":0}]'),

  ('open', 'SMCI Sep 18 5 Put',         'SMCI', 'long-put',
    600.00,
    '[{"side":"long","type":"put","strike":5,"entry_premium":0.20,"quantity":30,"expiration_date":"2026-09-18","implied_volatility":0}]'),

  ('open', 'SMCI Jun 18 17 Put',        'SMCI', 'long-put',
    836.00,
    '[{"side":"long","type":"put","strike":17,"entry_premium":1.67,"quantity":5,"expiration_date":"2026-06-18","implied_volatility":0}]'),

  ('open', 'SMCI Sep 18 10 Put',        'SMCI', 'long-put',
    1440.00,
    '[{"side":"long","type":"put","strike":10,"entry_premium":0.80,"quantity":18,"expiration_date":"2026-09-18","implied_volatility":0}]'),

  ('open', 'SMCI Jun 18 15 Put',        'SMCI', 'long-put',
    1495.00,
    '[{"side":"long","type":"put","strike":15,"entry_premium":1.00,"quantity":15,"expiration_date":"2026-06-18","implied_volatility":0}]'),

  ('open', 'SMCI May 15 20 Put',        'SMCI', 'long-put',
    1330.00,
    '[{"side":"long","type":"put","strike":20,"entry_premium":1.90,"quantity":7,"expiration_date":"2026-05-15","implied_volatility":0}]'),

  -- CRWV ratio put calendar: short 2× May15 105P, long 4× Jun18 105P
  ('open', 'CRWV Put Calendar (105, May/Jun)', 'CRWV', 'put-calendar',
    2970.00,
    '[
      {"side":"short","type":"put","strike":105,"entry_premium":6.35,"quantity":2,"expiration_date":"2026-05-15","implied_volatility":0},
      {"side":"long","type":"put","strike":105,"entry_premium":10.60,"quantity":4,"expiration_date":"2026-06-18","implied_volatility":0}
    ]')
) as v(state, name, ticker, strategy, cost_basis, legs);
