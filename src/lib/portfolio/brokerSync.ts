import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedPositionDraft } from "@/lib/portfolio/importParser";

export interface BrokerSyncRow {
  user_id: string;
  state: "open";
  name: string;
  ticker: string;
  strategy: string | null;
  entry_underlying_price: number | null;
  entry_date: string | null;
  cost_basis: number | null;
  legs: ParsedPositionDraft["legs"];
  stock_leg: ParsedPositionDraft["stock_leg"];
  notes: string | null;
  tags: string[];
}

export interface BrokerSyncResult {
  synced: number;
  replaced: number;
  positions: unknown[];
}

/**
 * Replace the authenticated user's portfolio with rows from a connected broker.
 *
 * Broker imports are treated as syncs, not additive imports. Insert first so a
 * failed broker payload does not wipe the existing portfolio before new rows
 * are saved.
 */
export async function syncBrokerPositions(
  supabase: SupabaseClient,
  rows: BrokerSyncRow[],
): Promise<BrokerSyncResult> {
  if (rows.length === 0) {
    return { synced: 0, replaced: 0, positions: [] };
  }

  const userId = rows[0].user_id;
  const { data, error } = await supabase.from("positions").insert(rows).select();

  if (error) {
    throw new Error(error.message);
  }

  const insertedIds = (data ?? [])
    .map((position) => position.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (insertedIds.length === 0) {
    throw new Error("Broker sync did not create any positions");
  }

  const { error: deleteError, count: replaced } = await supabase
    .from("positions")
    .delete({ count: "exact" })
    .eq("user_id", userId)
    .not("id", "in", `(${insertedIds.join(",")})`);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return {
    synced: data?.length ?? rows.length,
    replaced: replaced ?? 0,
    positions: data ?? [],
  };
}
