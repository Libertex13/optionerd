-- Migration: add snaptrade_users table
-- Run in the Supabase SQL Editor.
--
-- Stores the SnapTrade identity (user_id + user_secret) for each app user.
-- user_secret is sensitive — no RLS select policies, service role only.

create table public.snaptrade_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  snaptrade_user_id text not null unique,
  user_secret text not null,
  registered_at timestamptz default now() not null
);

alter table public.snaptrade_users enable row level security;
-- No policies — only service role can read/write.
