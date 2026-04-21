import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface BulkBody {
  positions: Array<{
    state?: string;
    name: string;
    ticker: string;
    strategy?: string | null;
    entry_underlying_price?: number | null;
    entry_date?: string | null;
    cost_basis?: number | null;
    legs: unknown[];
    stock_leg?: unknown | null;
    notes?: string | null;
    tags?: string[];
  }>;
}

/**
 * POST /api/positions/bulk — create many positions at once.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as BulkBody;
  if (!Array.isArray(body.positions) || body.positions.length === 0) {
    return NextResponse.json({ error: "No positions provided" }, { status: 400 });
  }

  const rows = body.positions.map((p) => ({
    user_id: user.id,
    state: p.state ?? "open",
    name: p.name,
    ticker: p.ticker,
    strategy: p.strategy ?? null,
    entry_underlying_price: p.entry_underlying_price ?? null,
    entry_date: p.entry_date ?? null,
    cost_basis: p.cost_basis ?? null,
    legs: p.legs,
    stock_leg: p.stock_leg ?? null,
    notes: p.notes ?? null,
    tags: p.tags ?? [],
  }));

  const { data, error } = await supabase.from("positions").insert(rows).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
