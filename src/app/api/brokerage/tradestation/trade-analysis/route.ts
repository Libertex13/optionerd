import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_TRADES = 1000;
const TRADE_ANALYSIS_ENABLED = process.env.NODE_ENV === "development";

export async function GET() {
  if (!TRADE_ANALYSIS_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: report, error: reportError } = await supabase
    .from("tradestation_trade_reports")
    .select(
      "id, source_filename, file_sha256, report_name, broker, account_names, first_trade_at, last_trade_at, counts, performance_summary, trade_analysis, periodical_returns, imported_at",
    )
    .eq("user_id", user.id)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 });
  }

  if (!report) {
    return NextResponse.json({ report: null, trades: [] });
  }

  const { data: trades, error: tradesError } = await supabase
    .from("tradestation_trades")
    .select(
      "id, trade_number, account, symbol, trade_type, opened_at, closed_at, entry_action, exit_action, entry_price, exit_price, quantity, net_profit, percent_profit, runup_or_drawdown, efficiency, total_efficiency, commission",
    )
    .eq("user_id", user.id)
    .eq("report_id", report.id)
    .order("closed_at", { ascending: false, nullsFirst: false })
    .limit(MAX_TRADES);

  if (tradesError) {
    return NextResponse.json({ error: tradesError.message }, { status: 500 });
  }

  return NextResponse.json({ report, trades: trades ?? [] });
}
