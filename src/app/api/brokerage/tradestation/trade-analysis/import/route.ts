import { createHash, randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNerdPlan } from "@/lib/billing/plan";
import {
  parseTradeManagerReport,
  type ParsedTradeManagerReport,
  type TradeManagerPairedTrade,
} from "@/lib/tradestation/tradeManagerReport";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const INSERT_CHUNK_SIZE = 500;
const TRADE_ANALYSIS_ENABLED = process.env.NODE_ENV === "development";

function tradeTimeRange(report: ParsedTradeManagerReport) {
  const times = report.pairedTrades
    .flatMap((trade) => [trade.openedAt, trade.closedAt])
    .filter((time): time is string => typeof time === "string" && time.length > 0)
    .sort();

  return {
    firstTradeAt: times[0] ?? null,
    lastTradeAt: times[times.length - 1] ?? null,
  };
}

function accountNames(report: ParsedTradeManagerReport): string[] {
  return Array.from(
    new Set(
      report.pairedTrades
        .map((trade) => trade.account)
        .filter((account) => account.length > 0),
    ),
  ).sort();
}

function tradeRow(userId: string, reportId: string, trade: TradeManagerPairedTrade) {
  return {
    report_id: reportId,
    user_id: userId,
    trade_number: trade.tradeNumber,
    account: trade.account || null,
    symbol: trade.symbol,
    trade_type: trade.type,
    opened_at: trade.openedAt,
    closed_at: trade.closedAt,
    entry_action: trade.entryAction,
    exit_action: trade.exitAction,
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    quantity: trade.quantity,
    net_profit: trade.netProfit,
    percent_profit: trade.percentProfit,
    runup_or_drawdown: trade.runupOrDrawdown,
    efficiency: trade.efficiency,
    total_efficiency: trade.totalEfficiency,
    commission: trade.commission,
    raw: trade,
  };
}

export async function POST(request: Request) {
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

  try {
    if (!(await isNerdPlan(user.id))) {
      return NextResponse.json(
        { error: "Trade analysis import requires the Nerd plan", upgrade: true },
        { status: 403 },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a TradeStation .xlsx file" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "TradeStation export must be an .xlsx file" }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File must be between 1 byte and 20MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileSha256 = createHash("sha256").update(buffer).digest("hex");
    const tempDir = join(tmpdir(), `optionerd-ts-${randomUUID()}`);
    await mkdir(tempDir, { recursive: true });
    const tempPath = join(tempDir, file.name.replace(/[^\w.-]/g, "_"));

    try {
      await writeFile(tempPath, buffer);
      const report = parseTradeManagerReport(tempPath);
      const { firstTradeAt, lastTradeAt } = tradeTimeRange(report);

      if (report.pairedTrades.length === 0) {
        return NextResponse.json(
          { error: "No paired trades found. Export the generated TradeManager Analysis report, not an orders blotter." },
          { status: 400 },
        );
      }

      const { error: deleteExistingError } = await supabase
        .from("tradestation_trade_reports")
        .delete()
        .eq("user_id", user.id)
        .eq("file_sha256", fileSha256);

      if (deleteExistingError) {
        throw new Error(deleteExistingError.message);
      }

      const { data: insertedReport, error: reportError } = await supabase
        .from("tradestation_trade_reports")
        .insert({
          user_id: user.id,
          source_filename: file.name,
          file_sha256: fileSha256,
          account_names: accountNames(report),
          first_trade_at: firstTradeAt,
          last_trade_at: lastTradeAt,
          counts: report.counts,
          performance_summary: report.performanceSummary,
          trade_analysis: report.tradeAnalysis,
          periodical_returns: report.periodicalReturns,
          raw_report: {
            source: { ...report.source, workbookPath: file.name },
            counts: report.counts,
          },
        })
        .select("id")
        .single();

      if (reportError || !insertedReport) {
        throw new Error(reportError?.message ?? "Failed to save TradeStation report");
      }

      const rows = report.pairedTrades.map((trade) =>
        tradeRow(user.id, insertedReport.id, trade),
      );
      for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
        const { error: tradesError } = await supabase
          .from("tradestation_trades")
          .insert(rows.slice(index, index + INSERT_CHUNK_SIZE));

        if (tradesError) {
          throw new Error(tradesError.message);
        }
      }

      return NextResponse.json(
        {
          reportId: insertedReport.id,
          trades: rows.length,
          actionRows: report.counts.tradeActionRows,
          firstTradeAt,
          lastTradeAt,
        },
        { status: 201 },
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "TradeStation report import failed" },
      { status: 500 },
    );
  }
}
