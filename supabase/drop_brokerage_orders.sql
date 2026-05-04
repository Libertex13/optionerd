-- Cleanup: remove deprecated SnapTrade order-history fallback table.
-- Run this if you previously applied supabase/add_brokerage_orders.sql.

drop table if exists public.brokerage_orders;
