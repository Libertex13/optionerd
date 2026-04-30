import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeAuthCode, saveTokens } from "@/lib/tradestation/tokens";
import { canUseDirectTradeStation } from "@/lib/tradestation/access";

/**
 * GET /api/brokerage/tradestation/callback
 * Receives the redirect from TradeStation's authorize page. Validates state,
 * exchanges the auth code for tokens, persists them, and redirects back to
 * /account with a status flag in the URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const baseRedirect = new URL("/account", url);

  if (oauthError) {
    baseRedirect.searchParams.set("tradestation", "error");
    baseRedirect.searchParams.set(
      "reason",
      url.searchParams.get("error_description") ?? oauthError,
    );
    return NextResponse.redirect(baseRedirect);
  }

  if (!code || !state) {
    baseRedirect.searchParams.set("tradestation", "error");
    baseRedirect.searchParams.set("reason", "missing_code_or_state");
    return NextResponse.redirect(baseRedirect);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    baseRedirect.searchParams.set("tradestation", "error");
    baseRedirect.searchParams.set("reason", "not_signed_in");
    return NextResponse.redirect(baseRedirect);
  }

  if (!canUseDirectTradeStation(user)) {
    baseRedirect.searchParams.set("tradestation", "error");
    baseRedirect.searchParams.set("reason", "direct_tradestation_disabled");
    return NextResponse.redirect(baseRedirect);
  }

  const cookieState = request.headers
    .get("cookie")
    ?.split("; ")
    .find((c) => c.startsWith("ts_oauth_state="))
    ?.split("=")[1];

  if (!cookieState || cookieState !== state) {
    baseRedirect.searchParams.set("tradestation", "error");
    baseRedirect.searchParams.set("reason", "state_mismatch");
    return NextResponse.redirect(baseRedirect);
  }

  try {
    const tokens = await exchangeAuthCode(code);
    await saveTokens(user.id, tokens);
    baseRedirect.searchParams.set("tradestation", "connected");
  } catch (err) {
    baseRedirect.searchParams.set("tradestation", "error");
    baseRedirect.searchParams.set("reason", "token_exchange_failed");
    console.error("[tradestation/callback]", err);
  }

  const res = NextResponse.redirect(baseRedirect);
  // Clear the state cookie — it's single-use.
  res.cookies.set({
    name: "ts_oauth_state",
    value: "",
    maxAge: 0,
    path: "/",
  });
  return res;
}
