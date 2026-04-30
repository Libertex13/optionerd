import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isNerdPlan } from "@/lib/billing/plan";
import { getSnapTrade } from "@/lib/snaptrade/client";
import { normalizeSnapTradePositions } from "@/lib/snaptrade/positions";

/**
 * GET /api/brokerage/positions
 * Fetches connected SnapTrade holdings and returns normalized import-preview rows.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await isNerdPlan(user.id))) {
      return NextResponse.json(
        { error: "Brokerage import requires the Nerd plan", upgrade: true },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data: snaptradeUser } = await admin
      .from("snaptrade_users")
      .select("snaptrade_user_id, user_secret")
      .eq("user_id", user.id)
      .single();

    if (!snaptradeUser) {
      return NextResponse.json(
        { error: "No SnapTrade broker connection found" },
        { status: 409 },
      );
    }

    const snaptrade = getSnapTrade();
    const accountsRes = await snaptrade.accountInformation.listUserAccounts({
      userId: snaptradeUser.snaptrade_user_id,
      userSecret: snaptradeUser.user_secret,
    });
    const accounts = accountsRes.data ?? [];

    const holdings = await Promise.all(
      accounts.map(async (account) => {
        const res = await snaptrade.accountInformation.getUserHoldings({
          accountId: account.id,
          userId: snaptradeUser.snaptrade_user_id,
          userSecret: snaptradeUser.user_secret,
        });

        return {
          account,
          positions: res.data.positions ?? [],
          optionPositions: res.data.option_positions ?? [],
        };
      }),
    );

    const normalized = normalizeSnapTradePositions(holdings);
    const rawCount = holdings.reduce(
      (sum, account) =>
        sum + account.positions.length + account.optionPositions.length,
      0,
    );

    return NextResponse.json({
      accounts: accounts.map((account) => ({
        accountId: account.id,
        accountType: account.raw_type ?? null,
        displayName: account.name ?? account.number,
        institutionName: account.institution_name,
      })),
      positions: normalized.rows,
      skipped: normalized.skipped,
      rawCount,
    });
  } catch (err) {
    console.error("SnapTrade positions failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch positions" },
      { status: 500 },
    );
  }
}

