import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNerdPlan } from "@/lib/billing/plan";
import type { ParsedPositionDraft } from "@/lib/portfolio/importParser";
import { syncBrokerPositions, type BrokerSyncRow } from "@/lib/portfolio/brokerSync";

interface ImportBody {
  positions: ParsedPositionDraft[];
}

function isValidDraft(position: ParsedPositionDraft): boolean {
  return (
    typeof position.name === "string" &&
    position.name.trim().length > 0 &&
    typeof position.ticker === "string" &&
    position.ticker.trim().length > 0 &&
    Array.isArray(position.legs) &&
    (position.legs.length > 0 || position.stock_leg != null)
  );
}

/**
 * POST /api/brokerage/import
 * Syncs reviewed SnapTrade preview rows into the user's portfolio.
 */
export async function POST(request: Request) {
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
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read plan" },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => null)) as ImportBody | null;
  const positions = Array.isArray(body?.positions) ? body.positions : [];
  const valid = positions.filter(isValidDraft);

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid positions provided" }, { status: 400 });
  }

  const rows: BrokerSyncRow[] = valid.map((position) => ({
    user_id: user.id,
    state: "open",
    name: position.name,
    ticker: position.ticker.toUpperCase(),
    strategy: position.strategy ?? null,
    entry_underlying_price: position.entry_underlying_price ?? null,
    entry_date: position.entry_date ?? null,
    cost_basis: position.cost_basis ?? null,
    legs: position.legs,
    stock_leg: position.stock_leg ?? null,
    notes: position.notes ?? null,
    tags: position.tags ?? ["broker:snaptrade"],
  }));

  try {
    const result = await syncBrokerPositions(supabase, rows);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Brokerage sync failed" },
      { status: 500 },
    );
  }
}
