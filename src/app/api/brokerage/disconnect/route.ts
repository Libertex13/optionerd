import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSnapTrade } from "@/lib/snaptrade/client";

/**
 * DELETE /api/brokerage/disconnect
 * Deletes all SnapTrade brokerage connections for the current app user while
 * keeping the SnapTrade user identity so they can reconnect immediately.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: snaptradeUser, error } = await admin
    .from("snaptrade_users")
    .select("snaptrade_user_id, user_secret")
    .eq("user_id", user.id)
    .single();

  if (error || !snaptradeUser) {
    return NextResponse.json({ deleted: 0 });
  }

  try {
    const snaptrade = getSnapTrade();
    const connections =
      await snaptrade.connections.listBrokerageAuthorizations({
        userId: snaptradeUser.snaptrade_user_id,
        userSecret: snaptradeUser.user_secret,
      });

    const connectionIds = connections.data
      .map((connection) => connection.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    await Promise.all(
      connectionIds.map((authorizationId) =>
        snaptrade.connections.removeBrokerageAuthorization({
          authorizationId,
          userId: snaptradeUser.snaptrade_user_id,
          userSecret: snaptradeUser.user_secret,
        }),
      ),
    );

    return NextResponse.json({ deleted: connectionIds.length });
  } catch (err) {
    console.error("SnapTrade disconnect failed:", err);
    return NextResponse.json(
      { error: "Failed to disconnect brokerage" },
      { status: 500 },
    );
  }
}
