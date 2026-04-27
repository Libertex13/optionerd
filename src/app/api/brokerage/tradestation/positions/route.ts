import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNerdPlan } from "@/lib/billing/plan";
import { listAllPositions } from "@/lib/tradestation/api";
import { normalizeTradeStationPositions } from "@/lib/tradestation/positions";

/**
 * GET /api/brokerage/tradestation/positions
 * Fetches TradeStation holdings and returns normalized import-preview rows.
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

    const { accounts, positions } = await listAllPositions(user.id);
    const normalized = normalizeTradeStationPositions(positions);

    return NextResponse.json({
      accounts: accounts.map((account) => ({
        accountId: account.accountId,
        accountType: account.accountType,
        displayName: account.displayName,
      })),
      positions: normalized.rows,
      skipped: normalized.skipped,
      rawCount: positions.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch positions";
    const status = message.includes("has not connected") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
