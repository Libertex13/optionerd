import type { ParsedPositionDraft } from "@/lib/portfolio/importParser";
import type { PositionLeg, PositionStockLeg } from "@/lib/portfolio/types";
import { inferStrategy } from "@/lib/portfolio/extract";
import type { TradeStationPosition } from "./api";

interface ParsedOccOption {
  ticker: string;
  expiration_date: string;
  type: "call" | "put";
  strike: number;
}

const OPTION_TYPES = new Set(["STOCKOPTION", "INDEXOPTION", "OPTION"]);
const STOCK_TYPES = new Set(["STOCK", "EQUITY", "ETF"]);

function formatDate(yymmdd: string): string {
  const yy = Number(yymmdd.slice(0, 2));
  const year = yy >= 70 ? 1900 + yy : 2000 + yy;
  return `${year}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
}

function normalizeAssetType(assetType: string): string {
  return assetType.toUpperCase().replace(/[^A-Z]/g, "");
}

export function parseOccOptionSymbol(symbol: string): ParsedOccOption | null {
  const trimmed = symbol.trim();
  const compact = trimmed.replace(/\s+/g, "");

  const occ = compact.match(/^([A-Z0-9.]{1,6})(\d{6})([CP])(\d{8})$/i);
  if (occ) {
    const [, root, yymmdd, cp, strikeRaw] = occ;
    const strike = Number(strikeRaw) / 1000;
    if (!Number.isFinite(strike) || strike <= 0) return null;

    return {
      ticker: root.toUpperCase(),
      expiration_date: formatDate(yymmdd),
      type: cp.toUpperCase() === "C" ? "call" : "put",
      strike,
    };
  }

  const compactDecimal = compact.match(/^([A-Z0-9.]{1,6})(\d{6})([CP])(\d+(?:\.\d+)?)$/i);
  if (compactDecimal) {
    const [, root, yymmdd, cp, strikeRaw] = compactDecimal;
    const strike = Number(strikeRaw);
    if (!Number.isFinite(strike) || strike <= 0) return null;

    return {
      ticker: root.toUpperCase(),
      expiration_date: formatDate(yymmdd),
      type: cp.toUpperCase() === "C" ? "call" : "put",
      strike,
    };
  }

  const spaced = trimmed.match(
    /^([A-Z0-9.]{1,6})\s+(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d+(?:\.\d+)?)\s+([CP]|Call|Put)$/i,
  );
  if (!spaced) return null;

  const [, root, mmRaw, ddRaw, yearRaw, strikeRaw, cpRaw] = spaced;
  const year = yearRaw.length === 2 ? 2000 + Number(yearRaw) : Number(yearRaw);
  const month = String(Number(mmRaw)).padStart(2, "0");
  const day = String(Number(ddRaw)).padStart(2, "0");
  const strike = Number(strikeRaw);
  if (!Number.isFinite(strike) || strike <= 0) return null;

  return {
    ticker: root.toUpperCase(),
    expiration_date: `${year}-${month}-${day}`,
    type: cpRaw.toUpperCase().startsWith("C") ? "call" : "put",
    strike,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayStrike(strike: number): string {
  return Number.isInteger(strike) ? String(strike) : String(strike).replace(/0+$/, "").replace(/\.$/, "");
}

function optionName(leg: PositionLeg, ticker: string): string {
  return `${ticker} ${leg.expiration_date} ${displayStrike(leg.strike)} ${leg.type}`;
}

function stockDraft(position: TradeStationPosition): ParsedPositionDraft | null {
  const assetType = normalizeAssetType(position.assetType);
  if (!STOCK_TYPES.has(assetType)) return null;

  const qty = Math.abs(position.quantity);
  const stockLeg: PositionStockLeg = {
    side: position.side,
    quantity: qty,
    entry_price: position.averagePrice,
  };

  return {
    name: `${position.symbol.toUpperCase()} shares`,
    ticker: position.symbol.toUpperCase(),
    strategy: inferStrategy([], stockLeg),
    cost_basis: null,
    entry_date: todayIso(),
    legs: [],
    stock_leg: stockLeg,
    notes: `Imported from TradeStation account ${position.accountId}.`,
    tags: ["broker:tradestation"],
  };
}

function optionDraft(position: TradeStationPosition): ParsedPositionDraft | null {
  const parsed = parseOccOptionSymbol(position.symbol);
  if (!parsed) return null;

  const assetType = normalizeAssetType(position.assetType);
  if (assetType && !OPTION_TYPES.has(assetType) && !assetType.includes("OPTION")) return null;

  const leg: PositionLeg = {
    side: position.side,
    type: parsed.type,
    strike: parsed.strike,
    entry_premium: position.averagePrice,
    quantity: Math.abs(position.quantity),
    expiration_date: parsed.expiration_date,
    implied_volatility: 0,
  };

  return {
    name: optionName(leg, parsed.ticker),
    ticker: parsed.ticker,
    strategy: inferStrategy([leg], null),
    cost_basis: null,
    entry_date: todayIso(),
    legs: [leg],
    stock_leg: null,
    notes: `Imported from TradeStation account ${position.accountId}.`,
    tags: ["broker:tradestation"],
  };
}

export function normalizeTradeStationPositions(positions: TradeStationPosition[]): {
  rows: ParsedPositionDraft[];
  skipped: Array<{ symbol: string; reason: string }>;
} {
  const rows: ParsedPositionDraft[] = [];
  const skipped: Array<{ symbol: string; reason: string }> = [];

  for (const position of positions) {
    const stock = stockDraft(position);
    if (stock) {
      rows.push(stock);
      continue;
    }

    const option = optionDraft(position);
    if (option) {
      rows.push(option);
      continue;
    }

    skipped.push({
      symbol: position.symbol,
      reason: `Unsupported or unparsable ${position.assetType}`,
    });
  }

  return { rows, skipped };
}
