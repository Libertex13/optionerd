import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/positions — list the authenticated user's positions.
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
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .order("position_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * DELETE /api/positions — delete every position for the authenticated user.
 * Used by the "Clear all" action in the portfolio dashboard.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error, count } = await supabase
    .from("positions")
    .delete({ count: "exact" })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: count ?? 0 });
}

/**
 * POST /api/positions — create a new position.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("positions")
    .insert({
      user_id: user.id,
      state: body.state ?? "watching",
      name: body.name,
      ticker: body.ticker,
      strategy: body.strategy ?? null,
      entry_underlying_price: body.entry_underlying_price ?? null,
      entry_date: body.entry_date ?? null,
      cost_basis: body.cost_basis ?? null,
      legs: body.legs,
      stock_leg: body.stock_leg ?? null,
      notes: body.notes ?? null,
      tags: body.tags ?? [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
