import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConnection } from "@/lib/tradestation/tokens";

/**
 * GET /api/brokerage/tradestation/status
 * Returns { connected: boolean, expiresAt?: string, scope?: string } for the
 * current user. Never returns access/refresh tokens.
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
    const conn = await getConnection(user.id);
    if (!conn) return NextResponse.json({ connected: false });
    return NextResponse.json({
      connected: true,
      expiresAt: conn.expires_at,
      scope: conn.scope,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
