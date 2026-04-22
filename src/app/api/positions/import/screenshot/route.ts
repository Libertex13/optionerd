import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { visionToJson } from "@/lib/openrouter/vision";
import type { ParsedPositionDraft } from "@/lib/portfolio/importParser";
import type { PositionLeg } from "@/lib/portfolio/types";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif)$/i;

interface ExtractedPosition {
  ticker: string;
  description: string;
  side: "long" | "short";
  option_type: "call" | "put";
  strike: number;
  quantity: number;
  entry_premium: number;
  expiration_date: string; // YYYY-MM-DD
  cost_basis: number | null;
}
interface ExtractionResult {
  positions: ExtractedPosition[];
  notes?: string;
}

const EXTRACTION_PROMPT = `You are reading a screenshot of a brokerage positions table.

Task: extract every OPTION position (calls and puts only — skip pure stock positions, skip group/parent header rows that aggregate multiple legs, skip totals rows).

For each option row, return a JSON object with these fields:
  - ticker: the underlying stock symbol (e.g. "FORM", "SMCI")
  - description: the full position description as shown (e.g. "FORM May 15 125 Call")
  - side: "long" if the row says Long / Buy / Bot, "short" if Short / Sell / Sld
  - option_type: "call" or "put"
  - strike: the strike price as a number (e.g. 125, 27.5)
  - quantity: the number of contracts, always positive integer
  - entry_premium: the average entry price per contract (NOT total cost). Look for AVG PRICE, AVG, or PRICE columns. Positive number.
  - expiration_date: the option expiration date in YYYY-MM-DD format. Infer year from the description (e.g. "May 15" with no year — use the nearest future year).
  - cost_basis: the total capital committed (TOTAL COST or COST BASIS column) as a positive number. Set to null if not visible.

Output strict JSON in this shape (no prose, no code fences, no explanation):
{
  "positions": [
    { "ticker": "...", "description": "...", "side": "...", "option_type": "...", "strike": 0, "quantity": 0, "entry_premium": 0, "expiration_date": "YYYY-MM-DD", "cost_basis": 0 }
  ],
  "notes": "optional: anything skipped or uncertain"
}

Rules:
- entry_premium and cost_basis are always positive. Sign/side is encoded in "side".
- If the description shows only month/day (like "May 15"), infer expiration year forward from today — use the next occurrence.
- Skip rows where any required field is missing or unreadable.
- If the screenshot shows no option positions, return { "positions": [] }.
- Return ONLY the JSON object. Do not wrap in markdown.`;

function toParsedDraft(p: ExtractedPosition): ParsedPositionDraft {
  const leg: PositionLeg = {
    side: p.side,
    type: p.option_type,
    strike: p.strike,
    entry_premium: p.entry_premium,
    quantity: p.quantity,
    expiration_date: p.expiration_date,
    implied_volatility: 0,
  };
  const cost = p.cost_basis ?? p.entry_premium * p.quantity * 100;
  return {
    name: p.description,
    ticker: p.ticker.toUpperCase(),
    strategy: `${p.side}-${p.option_type}`,
    cost_basis: Math.abs(cost),
    legs: [leg],
  };
}

/**
 * POST /api/positions/import/screenshot
 * Accepts multipart/form-data with a single "file" field. Returns
 * { positions: ParsedPositionDraft[], model, usage }.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_BYTES / 1024 / 1024}MB limit` },
      { status: 413 },
    );
  }
  const mimeType = file.type || "image/png";
  if (!ALLOWED_MIME.test(mimeType)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mimeType}` },
      { status: 415 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const imageBase64 = buf.toString("base64");

  try {
    const result = await visionToJson<ExtractionResult>({
      imageBase64,
      mimeType,
      prompt: EXTRACTION_PROMPT,
    });

    const extracted = Array.isArray(result.data?.positions)
      ? result.data.positions
      : [];
    const rows = extracted
      .filter(
        (p) =>
          p &&
          typeof p.ticker === "string" &&
          typeof p.strike === "number" &&
          typeof p.quantity === "number" &&
          typeof p.entry_premium === "number" &&
          (p.side === "long" || p.side === "short") &&
          (p.option_type === "call" || p.option_type === "put") &&
          /^\d{4}-\d{2}-\d{2}$/.test(p.expiration_date),
      )
      .map(toParsedDraft);

    return NextResponse.json({
      positions: rows,
      skipped: extracted.length - rows.length,
      notes: result.data?.notes ?? null,
      model: result.model,
      usage: result.usage,
    });
  } catch (err) {
    console.error("[screenshot import]", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
