import type {
  Account,
  OptionsPosition,
  Position,
} from "snaptrade-typescript-sdk";
import type { ParsedPositionDraft } from "@/lib/portfolio/importParser";
import type { PositionLeg, PositionStockLeg } from "@/lib/portfolio/types";
import { inferStrategy } from "@/lib/portfolio/extract";

interface SnapTradeAccountPositions {
  account: Account;
  positions: Position[];
  optionPositions: OptionsPosition[];
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayStrike(strike: number): string {
  return Number.isInteger(strike)
    ? String(strike)
    : String(strike).replace(/0+$/, "").replace(/\.$/, "");
}

function accountLabel(account: Account): string {
  return account.name || account.number || account.institution_name || account.id;
}

function optionName(leg: PositionLeg, ticker: string): string {
  return `${ticker} ${leg.expiration_date} ${displayStrike(leg.strike)} ${leg.type}`;
}

function normalizeDate(value: string): string {
  return value.slice(0, 10);
}

function stockDraft(
  position: Position,
  account: Account,
): ParsedPositionDraft | null {
  const symbol = position.symbol?.symbol;
  const ticker = symbol?.raw_symbol || symbol?.symbol;
  const units = position.units;

  if (!ticker || typeof units !== "number" || units === 0) return null;

  const stockLeg: PositionStockLeg = {
    side: units > 0 ? "long" : "short",
    quantity: Math.abs(units),
    entry_price: position.average_purchase_price ?? position.price ?? 0,
  };

  return {
    name: `${ticker.toUpperCase()} shares`,
    ticker: ticker.toUpperCase(),
    strategy: inferStrategy([], stockLeg),
    cost_basis: null,
    entry_date: todayIso(),
    legs: [],
    stock_leg: stockLeg,
    notes: `Imported from SnapTrade account ${accountLabel(account)}.`,
    tags: ["broker:snaptrade", `brokerage:${account.institution_name}`],
  };
}

function optionDraft(
  position: OptionsPosition,
  account: Account,
): ParsedPositionDraft | null {
  const option = position.symbol?.option_symbol;
  const underlying = option?.underlying_symbol;
  const ticker = underlying?.raw_symbol || underlying?.symbol;
  const units = position.units;

  if (!option || !ticker || typeof units !== "number" || units === 0) {
    return null;
  }

  const multiplier = option.is_mini_option ? 10 : 100;
  const averagePrice =
    position.average_purchase_price == null
      ? position.price ?? 0
      : position.average_purchase_price / multiplier;

  const leg: PositionLeg = {
    side: units > 0 ? "long" : "short",
    type: option.option_type === "CALL" ? "call" : "put",
    strike: option.strike_price,
    entry_premium: averagePrice,
    quantity: Math.abs(units),
    expiration_date: normalizeDate(option.expiration_date),
    implied_volatility: 0,
  };

  return {
    name: optionName(leg, ticker.toUpperCase()),
    ticker: ticker.toUpperCase(),
    strategy: inferStrategy([leg], null),
    cost_basis: null,
    entry_date: todayIso(),
    legs: [leg],
    stock_leg: null,
    notes: `Imported from SnapTrade account ${accountLabel(account)}.`,
    tags: ["broker:snaptrade", `brokerage:${account.institution_name}`],
  };
}

export function normalizeSnapTradePositions(
  accounts: SnapTradeAccountPositions[],
): {
  rows: ParsedPositionDraft[];
  skipped: Array<{ symbol: string; reason: string }>;
} {
  const rows: ParsedPositionDraft[] = [];
  const skipped: Array<{ symbol: string; reason: string }> = [];

  for (const account of accounts) {
    for (const position of account.positions) {
      const draft = stockDraft(position, account.account);
      if (draft) {
        rows.push(draft);
      } else {
        skipped.push({
          symbol:
            position.symbol?.symbol?.raw_symbol ??
            position.symbol?.symbol?.symbol ??
            "Unknown stock position",
          reason: "Missing ticker or quantity",
        });
      }
    }

    for (const position of account.optionPositions) {
      const draft = optionDraft(position, account.account);
      if (draft) {
        rows.push(draft);
      } else {
        skipped.push({
          symbol:
            position.symbol?.option_symbol?.ticker ??
            "Unknown option position",
          reason: "Missing option contract, underlying, or quantity",
        });
      }
    }
  }

  return { rows, skipped };
}
