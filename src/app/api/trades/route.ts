import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/trades — list saved trades for the authenticated user
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("saved_trades")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

const CASUAL_SAVE_LIMIT = 5;

/**
 * POST /api/trades — save a new trade
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check plan and enforce save limit for Casual users
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const plan = profile?.plan ?? "casual";

  if (plan === "casual") {
    const { count } = await supabase
      .from("saved_trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count !== null && count >= CASUAL_SAVE_LIMIT) {
      return NextResponse.json(
        {
          error: "Save limit reached",
          message: `Casual plan allows up to ${CASUAL_SAVE_LIMIT} saved trades. Upgrade to Nerd for unlimited saves.`,
          upgrade: true,
        },
        { status: 403 },
      );
    }
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("saved_trades")
    .insert({
      user_id: user.id,
      name: body.name,
      ticker: body.ticker,
      underlying_price: body.underlying_price,
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
