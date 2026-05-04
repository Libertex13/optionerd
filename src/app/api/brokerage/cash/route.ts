import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/brokerage/cash
 * Returns the latest synced broker cash balances for the current user.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("brokerage_cash_balances")
    .select(
      "id, broker, broker_account_id, account_name, institution_name, currency_code, cash, buying_power, synced_at",
    )
    .eq("user_id", user.id)
    .order("institution_name", { ascending: true })
    .order("account_name", { ascending: true })
    .order("currency_code", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load cash balances" },
      { status: 500 },
    );
  }

  return NextResponse.json({ balances: data ?? [] });
}
