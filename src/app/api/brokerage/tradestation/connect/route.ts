import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  canUseDirectTradeStation,
  directTradeStationUnavailableMessage,
} from "@/lib/tradestation/access";
import {
  TRADESTATION_AUDIENCE,
  TRADESTATION_AUTH_BASE,
  TRADESTATION_CLIENT_ID,
  TRADESTATION_REDIRECT_URI,
  TRADESTATION_SCOPES,
  assertConfigured,
} from "@/lib/tradestation/config";

/**
 * GET /api/brokerage/tradestation/connect
 * Kicks off the OAuth auth-code flow. Generates a CSRF state token, sets it
 * as an httpOnly cookie, and redirects the user to TradeStation's authorize
 * endpoint.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseDirectTradeStation(user)) {
    return NextResponse.json(
      { error: directTradeStationUnavailableMessage() },
      { status: 404 },
    );
  }

  try {
    assertConfigured();
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }

  const state = randomBytes(24).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: TRADESTATION_CLIENT_ID,
    redirect_uri: TRADESTATION_REDIRECT_URI,
    audience: TRADESTATION_AUDIENCE,
    scope: TRADESTATION_SCOPES.join(" "),
    state,
  });

  const authorizeUrl = `${TRADESTATION_AUTH_BASE}/authorize?${params}`;
  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set({
    name: "ts_oauth_state",
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
