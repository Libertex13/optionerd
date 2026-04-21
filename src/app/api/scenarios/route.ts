import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/scenarios — list the authenticated user's custom scenarios.
 * System presets are hardcoded in the client; this endpoint only returns user-created ones.
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
    .from("scenarios")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

/**
 * POST /api/scenarios — create a new user scenario.
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
    .from("scenarios")
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description ?? null,
      target_date: body.target_date ?? null,
      underlying_shocks: body.underlying_shocks ?? {},
      default_shock: body.default_shock ?? null,
      iv_shock: body.iv_shock ?? null,
      advance_days: body.advance_days ?? 0,
      interest_rate: body.interest_rate ?? 0.045,
      notes: body.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
