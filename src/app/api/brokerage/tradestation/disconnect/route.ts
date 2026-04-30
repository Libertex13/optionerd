import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeConnection } from "@/lib/tradestation/tokens";
import {
  canUseDirectTradeStation,
  directTradeStationUnavailableMessage,
} from "@/lib/tradestation/access";

/**
 * DELETE /api/brokerage/tradestation/disconnect
 * Removes the stored TradeStation connection for the current user.
 * Does not call TradeStation to revoke — users can revoke from their TS
 * account settings if they want to fully invalidate the refresh token.
 */
export async function DELETE() {
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
    await removeConnection(user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
