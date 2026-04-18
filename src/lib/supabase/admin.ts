import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service role key.
 * Bypasses RLS — use only in server-side code (webhooks, cron jobs).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
