import type { PositionLeg } from "./types";

export interface ParsedPositionDraft {
  name: string;
  ticker: string;
  strategy: string;
  cost_basis: number;
  legs: PositionLeg[];
}

export interface ParseResult {
  rows: ParsedPositionDraft[];
  skipped: { line: string; reason: string }[];
}

const MONTH_ABBREV = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function parseDescription(raw: string): {
  ticker: string;
  expiration: string;
  strike: number;
  type: "call" | "put";
} | null {
  // e.g. "FORM May 15 125 Call" or "SMCI Sep 18 5 Put"
  const m = raw
    .trim()
    .match(/^([A-Z][A-Z0-9.]{0,5})\s+([A-Za-z]+)\s+(\d{1,2})\s+(\d+(?:\.\d+)?)\s+(Call|Put)\s*$/i);
  if (!m) return null;
  const [, ticker, monthName, dayStr, strikeStr, typeStr] = m;
  const monthIdx = MONTH_ABBREV.findIndex((mn) =>
    monthName.toLowerCase().startsWith(mn),
  );
  if (monthIdx < 0) return null;

  const day = parseInt(dayStr, 10);
  const strike = parseFloat(strikeStr);
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, monthIdx, day);
  if (candidate.getTime() < now.getTime() - 86_400_000) year += 1;

  const expiration = `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    ticker: ticker.toUpperCase(),
    expiration,
    strike,
    type: typeStr.toLowerCase() as "call" | "put",
  };
}

function parsePosition(
  raw: string,
): { quantity: number; side: "long" | "short" } | null {
  const m = raw.trim().match(/^(-?\d+)\s+(Long|Short)\s*$/i);
  if (!m) return null;
  return {
    quantity: Math.abs(parseInt(m[1], 10)),
    side: m[2].toLowerCase() as "long" | "short",
  };
}

function parseNumber(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim();
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }
  // handle unicode minus / hyphen
  if (/^[-−–]/.test(s)) {
    negative = true;
    s = s.slice(1);
  }
  s = s.replace(/[$,\s%]/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((s) => s.trim());
  // fallback: collapse 2+ spaces into separator
  return line.split(/ {2,}/).map((s) => s.trim());
}

/**
 * Parse pasted broker rows into position drafts.
 *
 * Expected column order (after any leading SYMBOL cell):
 *   DESCRIPTION | POSITION | OPEN_P/L | AVG_PRICE | LAST | TODAYS_OPEN_P/L |
 *   OPEN_P/L_QTY | OPEN_P/L_% | TOTAL_COST | MARKET_VALUE | ...
 *
 * The parser finds the description cell by pattern, then walks forward:
 *   +1 POSITION, +3 AVG_PRICE, +8 TOTAL_COST.
 */
export function parseBrokerPaste(text: string): ParseResult {
  const result: ParseResult = { rows: [], skipped: [] };
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const cells = splitRow(line);
    if (cells.length < 3) {
      result.skipped.push({ line, reason: "too few columns" });
      continue;
    }

    let descIdx = -1;
    let desc: ReturnType<typeof parseDescription> = null;
    for (let i = 0; i < cells.length; i++) {
      const d = parseDescription(cells[i]);
      if (d) {
        descIdx = i;
        desc = d;
        break;
      }
    }
    if (!desc || descIdx < 0) {
      result.skipped.push({ line, reason: "no description match" });
      continue;
    }

    const pos = parsePosition(cells[descIdx + 1] ?? "");
    if (!pos) {
      result.skipped.push({ line, reason: "no quantity/side after description" });
      continue;
    }

    const avgPrice = parseNumber(cells[descIdx + 3] ?? "");
    if (avgPrice == null || avgPrice <= 0) {
      result.skipped.push({ line, reason: "missing avg price" });
      continue;
    }

    const totalCostRaw = parseNumber(cells[descIdx + 8] ?? "");
    const totalCost =
      totalCostRaw != null
        ? Math.abs(totalCostRaw)
        : avgPrice * pos.quantity * 100;

    const leg: PositionLeg = {
      side: pos.side,
      type: desc.type,
      strike: desc.strike,
      entry_premium: avgPrice,
      quantity: pos.quantity,
      expiration_date: desc.expiration,
      implied_volatility: 0,
    };

    const expLabel = new Date(desc.expiration + "T00:00:00").toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    );
    const name = `${desc.ticker} ${expLabel} ${desc.strike} ${desc.type === "call" ? "Call" : "Put"}`;

    result.rows.push({
      name,
      ticker: desc.ticker,
      strategy: `${pos.side}-${desc.type}`,
      cost_basis: totalCost,
      legs: [leg],
    });
  }

  return result;
}
