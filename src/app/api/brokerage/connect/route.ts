import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSnapTrade } from "@/lib/snaptrade/client";

function brokerLabel(broker: string): string {
  return broker
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * POST /api/brokerage/connect
 *
 * 1. Ensures the user is registered with SnapTrade (creates if missing)
 * 2. Generates a connection portal URL
 * 3. Returns { redirectUri } for the client to navigate to
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TEMPORARY: skip plan gating for the connection-flow test.
  // Will re-enable once we verify the flow works end to end.

  const admin = createAdminClient();
  const snaptrade = getSnapTrade();

  // Check if this user already has a SnapTrade identity
  const { data: existing } = await admin
    .from("snaptrade_users")
    .select("snaptrade_user_id, user_secret")
    .eq("user_id", user.id)
    .single();

  let snaptradeUserId: string;
  let userSecret: string;

  if (existing) {
    snaptradeUserId = existing.snaptrade_user_id;
    userSecret = existing.user_secret;
  } else {
    // Register a new SnapTrade user
    snaptradeUserId = `u_${user.id}`;
    try {
      const reg = await snaptrade.authentication.registerSnapTradeUser({
        userId: snaptradeUserId,
      });
      if (!reg.data.userSecret) {
        throw new Error("Registration returned no userSecret");
      }
      userSecret = reg.data.userSecret;
    } catch (err) {
      console.error("SnapTrade registration failed:", err);
      return NextResponse.json(
        { error: "Failed to register with SnapTrade" },
        { status: 500 },
      );
    }

    const { error: insertError } = await admin
      .from("snaptrade_users")
      .insert({
        user_id: user.id,
        snaptrade_user_id: snaptradeUserId,
        user_secret: userSecret,
      });

    if (insertError) {
      console.error("Failed to persist snaptrade_users:", insertError);
      return NextResponse.json(
        { error: "Failed to link SnapTrade user" },
        { status: 500 },
      );
    }
  }

  // Build a connection portal URL
  try {
    const origin = new URL(request.url).origin;
    const body = await request.json().catch(() => ({}));
    const broker: string | undefined = body.broker;

    if (broker) {
      const partnerInfo = await snaptrade.referenceData.getPartnerInfo();
      const allowed = partnerInfo.data.allowed_brokerages ?? [];
      const allowedSlugs = allowed
        .map((item) => item.slug)
        .filter((slug): slug is string => typeof slug === "string");
      const matched = allowed.find((item) => item.slug === broker);

      if (!matched || matched.enabled === false) {
        return NextResponse.json(
          {
            error: `${brokerLabel(broker)} is not enabled for this SnapTrade client yet.`,
            broker,
            allowedBrokerages: allowedSlugs,
          },
          { status: 409 },
        );
      }
    }

    const loginRes = await snaptrade.authentication.loginSnapTradeUser({
      userId: snaptradeUserId,
      userSecret,
      customRedirect: `${origin}/account/portfolio?connected=1`,
      ...(broker ? { broker } : {}),
    });

    const redirectUri = "redirectURI" in loginRes.data
      ? loginRes.data.redirectURI
      : null;

    if (!redirectUri) {
      return NextResponse.json(
        { error: "No redirect URI returned" },
        { status: 500 },
      );
    }

    return NextResponse.json({ redirectUri });
  } catch (err) {
    console.error("SnapTrade login URL generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate connection URL" },
      { status: 500 },
    );
  }
}
