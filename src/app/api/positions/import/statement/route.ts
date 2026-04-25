import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { textToJson } from "@/lib/openrouter/vision";
import {
  isValidExtractedPosition,
  toParsedDraft,
  type ExtractionResult,
} from "@/lib/portfolio/extract";

const MAX_CHARS = 200_000;

const EXTRACTION_PROMPT = `You are parsing text pasted from a brokerage positions table or statement (TradeStation, IBKR, Schwab, Fidelity, tastytrade, etc.). The input may be tab-separated rows, CSV, a copy-paste from a web UI, or free-form statement text.

Task: extract every open position: options, pure stock/share positions, and stock paired with options (for example covered calls). Skip totals/summary rows and cash balances.

## Critical: identify columns before parsing

Broker tables contain MANY dollar-valued columns that look similar. You MUST pick the right one for entry_premium:

- entry_premium = ENTRY price per share. Column names: "Avg Price", "Avg Cost", "Cost Basis per Contract", "Open Price", "Price Paid". This is set at trade entry and does NOT change with the market.
- NEVER use "Last", "Mark", "Mid", "Bid", "Ask", "Current", "Market Price" — those are today's quote, not the entry.
- NEVER use "Market Value", "P/L", or "Open P/L" columns for cost_basis or entry_premium.

TradeStation typical column order after the symbol: POSITION, QTY, AVG PRICE, LAST, BID, ASK, OPEN P/L, OPEN P/L/QTY, OPEN P/L %, TOTAL COST, MARKET VALUE, ..., EXPIRY. The 4th-ish dollar column is AVG PRICE — take that one. The 5th (LAST) is today's quote — ignore for entry.

## Multi-leg grouping

Each position may have MULTIPLE LEGS. Look for these grouping cues:
- A parent/summary row (often aggregated totals with no per-leg detail) followed by indented child rows — emit ONE position with all the child legs.
- Consecutive rows with the same ticker that form a recognizable structure: same strike + different expiries = calendar; same expiry + different strikes = vertical spread; 4 legs with both calls and puts = iron condor / butterfly.
- If the broker explicitly labels a group as a single spread, calendar, condor, etc., trust that grouping.

If rows look independent (no shared parent, no matching structure), emit each as its own single-leg position.

Critical: keep each leg's side + expiration + strike paired CORRECTLY. If the broker shows "Short -2 May 15 105P" and "Long 4 Jun 18 105P", do NOT swap the sides/expiries. Preserve the source row mapping.

## Symbol + description parsing

OCC-style symbols look like "KEYS 260618C00350000" where 260618 is YYMMDD expiration (expire 2026-06-18), C/P is type, 00350000 is strike × 1000 (so $350). Parse these into structured fields.

Descriptions like "FORM May 15 125 Call", "SMCI Sep 18 5 Put", or "CMG 30 Put May 15" follow the same pattern (ticker + month + day + strike + call/put, in any order).

Dates with 2-digit year suffixes ("15-May-26", "06/18/26") are YYYY form with 20YY — "26" means 2026, not 1926.

## Output

Output strict JSON with this shape. No prose, no code fences.

{
  "positions": [
    {
      "ticker": "FORM",
      "description": "FORM May 15 125 Call",
      "stock_leg": null,
      "legs": [
        { "side": "long", "option_type": "call", "strike": 125, "quantity": 2, "entry_premium": 15.25, "expiration_date": "2026-05-15" }
      ]
    },
    {
      "ticker": "CRWV",
      "description": "CRWV Put Calendar 105 May/Jun",
      "stock_leg": null,
      "legs": [
        { "side": "short", "option_type": "put", "strike": 105, "quantity": 2, "entry_premium": 6.35, "expiration_date": "2026-05-15" },
        { "side": "long",  "option_type": "put", "strike": 105, "quantity": 4, "entry_premium": 10.60, "expiration_date": "2026-06-18" }
      ]
    },
    {
      "ticker": "AAPL",
      "description": "AAPL 100 shares",
      "stock_leg": { "side": "long", "quantity": 100, "entry_price": 178.25 },
      "legs": []
    }
  ],
  "notes": "optional free-text note if something was ambiguous"
}

Rules:
- entry_premium is always a positive number — the "side" field encodes long/short.
- stock_leg.entry_price is the stock/share entry price per share. Use Avg Price / Avg Cost / Open Price, not Last / Mark / Bid / Ask.
- quantity is a positive integer. "Long 2" → quantity 2, side "long". "Short 5" / "-5" → quantity 5, side "short".
- Omit cost_basis entirely (or set it to null). The caller recomputes it from legs.
- If the input shows only month/day (like "May 15"), infer the expiration year forward from today — use the next occurrence. Assume the current year is 2026 or later unless the paste clearly shows otherwise.
- expiration_date must be YYYY-MM-DD with a 4-digit year.
- Pure stock positions must use "legs": [] and a non-null stock_leg.
- Skip any row where any required option leg or stock leg field is missing or ambiguous — it's fine to drop rows.
- If the input is empty or contains no positions, return { "positions": [] }.
- Return ONLY the JSON object.`;

/**
 * POST /api/positions/import/statement
 * Accepts JSON body { text: string }. Returns { positions: ParsedPositionDraft[], model, usage }.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Missing 'text' field" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Input exceeds ${MAX_CHARS.toLocaleString()} character limit` },
      { status: 413 },
    );
  }

  try {
    const result = await textToJson<ExtractionResult>({
      input: text,
      prompt: EXTRACTION_PROMPT,
    });

    const extracted = Array.isArray(result.data?.positions)
      ? result.data.positions
      : [];
    const rows = extracted.filter(isValidExtractedPosition).map(toParsedDraft);

    return NextResponse.json({
      positions: rows,
      skipped: extracted.length - rows.length,
      notes: result.data?.notes ?? null,
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    console.error("[statement import]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
