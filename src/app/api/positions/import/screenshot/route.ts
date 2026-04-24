import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { visionToJson } from "@/lib/openrouter/vision";
import {
  isValidExtractedPosition,
  toParsedDraft,
  type ExtractionResult,
} from "@/lib/portfolio/extract";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = /^image\/(png|jpe?g|webp|gif)$/i;

const EXTRACTION_PROMPT = `You are reading a screenshot of a brokerage positions table.

Task: extract every OPTION position (calls and puts only — skip pure stock positions, skip totals rows).

Each position may have MULTIPLE LEGS. Look carefully for visual grouping cues that indicate multi-leg trades:
- A parent/summary row with an aggregated description like "Coreweave Inc [CRWV] May 2026 105.00" followed by indented child rows with individual legs. Use the parent description as the position name and treat each child row as one leg.
- Consecutive rows with the same ticker that share strategic features (same strike different expiries = calendar; same expiry different strikes = vertical spread; 4 legs with both calls and puts = iron condor / butterfly) AND appear visually grouped (shared background, indentation, or separator style).
- If a group of rows is clearly a single structured trade (e.g. the broker shows a net credit/debit aggregated at the group level), emit ONE position with multiple legs.

If rows look visually independent (clear row-per-row dividers, no aggregating parent), emit each as its own single-leg position.

Output strict JSON with this shape. No prose, no code fences.

{
  "positions": [
    {
      "ticker": "FORM",
      "description": "FORM May 15 125 Call",
      "cost_basis": 3050,
      "legs": [
        { "side": "long", "option_type": "call", "strike": 125, "quantity": 2, "entry_premium": 15.25, "expiration_date": "2026-05-15" }
      ]
    },
    {
      "ticker": "CRWV",
      "description": "CRWV Put Calendar 105 May/Jun",
      "cost_basis": 5510,
      "legs": [
        { "side": "short", "option_type": "put", "strike": 105, "quantity": 2, "entry_premium": 6.35, "expiration_date": "2026-05-15" },
        { "side": "long",  "option_type": "put", "strike": 105, "quantity": 4, "entry_premium": 10.60, "expiration_date": "2026-06-18" }
      ]
    }
  ],
  "notes": "optional"
}

Rules:
- entry_premium is always positive — the "side" field encodes long/short.
- cost_basis is the total capital committed for the whole POSITION (sum across legs if the broker shows a group total; otherwise set to null).
- quantity is always a positive integer.
- If the description shows only month/day (like "May 15"), infer expiration year forward from today — use the next occurrence.
- Skip rows where any required leg field is missing or unreadable.
- If the screenshot shows no option positions, return { "positions": [] }.
- Return ONLY the JSON object.`;

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
      .filter(isValidExtractedPosition)
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
