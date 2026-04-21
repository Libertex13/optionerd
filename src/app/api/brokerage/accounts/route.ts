import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSnapTrade } from "@/lib/snaptrade/client";

/**
 * GET /api/brokerage/accounts
 *
 * Returns the list of connected brokerage accounts for the current user.
 * Returns empty array if user has no SnapTrade identity yet (never connected).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: snaptradeUser } = await admin
    .from("snaptrade_users")
    .select("snaptrade_user_id, user_secret")
    .eq("user_id", user.id)
    .single();

  if (!snaptradeUser) {
    return NextResponse.json({ accounts: [] });
  }

  try {
    const snaptrade = getSnapTrade();
    const res = await snaptrade.accountInformation.listUserAccounts({
      userId: snaptradeUser.snaptrade_user_id,
      userSecret: snaptradeUser.user_secret,
    });

    return NextResponse.json({ accounts: res.data });
  } catch (err) {
    console.error("SnapTrade listUserAccounts failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 },
    );
  }
}
