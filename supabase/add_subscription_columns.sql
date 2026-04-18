-- Migration: add subscription columns to profiles
-- Run this in the Supabase SQL Editor on your existing database.

alter table public.profiles
  add column if not exists plan text not null default 'casual',
  add column if not exists stripe_customer_id text unique,
  add column if not exists plan_period text,
  add column if not exists plan_expires_at timestamptz;
