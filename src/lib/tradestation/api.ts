import "server-only";
import { TRADESTATION_API_BASE, assertConfigured } from "./config";
import { getValidAccessToken } from "./tokens";

export interface TradeStationAccount {
  accountId: string;
  accountType: string | null;
  displayName: string;
  raw: Record<string, unknown>;
}

export interface TradeStationPosition {
  accountId: string;
  symbol: string;
  assetType: string;
  quantity: number;
  side: "long" | "short";
  averagePrice: number;
  raw: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value.replace(/[$,%\s,]/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function pickSide(obj: Record<string, unknown>, quantity: number): "long" | "short" {
  for (const key of ["LongShort", "longShort", "Side", "side", "PositionType"]) {
    const value = obj[key];
    if (typeof value !== "string") continue;
    const normalized = value.trim().toLowerCase();
    if (normalized.includes("short") || normalized === "sell") return "short";
    if (normalized.includes("long") || normalized === "buy") return "long";
  }

  return quantity < 0 ? "short" : "long";
}

function arrayFromPayload(payload: unknown, preferredKey: string): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.map(asRecord);

  const obj = asRecord(payload);
  const preferred = obj[preferredKey];
  if (Array.isArray(preferred)) return preferred.map(asRecord);

  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) return value.map(asRecord);
  }
  return [];
}

async function tradeStationGet<T>(
  userId: string,
  path: string,
): Promise<T> {
  assertConfigured();
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${TRADESTATION_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TradeStation API failed (${res.status}): ${detail}`);
  }

  return await res.json() as T;
}

export async function listAccounts(userId: string): Promise<TradeStationAccount[]> {
  const payload = await tradeStationGet<unknown>(userId, "/brokerage/accounts");
  return arrayFromPayload(payload, "Accounts")
    .map((raw) => {
      const accountId = pickString(raw, ["AccountID", "AccountId", "accountId", "AccountNumber"]);
      if (!accountId) return null;
      const accountType = pickString(raw, ["AccountType", "Type", "accountType"]);
      return {
        accountId,
        accountType,
        displayName: accountType ? `${accountType} ${accountId}` : accountId,
        raw,
      } satisfies TradeStationAccount;
    })
    .filter((account): account is TradeStationAccount => account != null);
}

export async function listAccountPositions(
  userId: string,
  accountId: string,
): Promise<TradeStationPosition[]> {
  const payload = await tradeStationGet<unknown>(
    userId,
    `/brokerage/accounts/${encodeURIComponent(accountId)}/positions`,
  );

  return arrayFromPayload(payload, "Positions")
    .map((raw) => {
      const symbol = pickString(raw, ["Symbol", "symbol"]);
      const assetType = pickString(raw, ["AssetType", "assetType", "Type", "SecurityType"]);
      const quantity = pickNumber(raw, ["Quantity", "quantity", "LongShortQuantity"]);
      const averagePrice = pickNumber(raw, ["AveragePrice", "averagePrice", "AvgPrice", "CostBasisPrice"]);

      if (!symbol || !assetType || quantity == null || quantity === 0 || averagePrice == null) {
        return null;
      }

      return {
        accountId: pickString(raw, ["AccountID", "AccountId", "accountId"]) ?? accountId,
        symbol,
        assetType,
        quantity,
        side: pickSide(raw, quantity),
        averagePrice: Math.abs(averagePrice),
        raw,
      } satisfies TradeStationPosition;
    })
    .filter((position): position is TradeStationPosition => position != null);
}

export async function listAllPositions(userId: string): Promise<{
  accounts: TradeStationAccount[];
  positions: TradeStationPosition[];
}> {
  const accounts = await listAccounts(userId);
  const batches = await Promise.all(
    accounts.map((account) => listAccountPositions(userId, account.accountId)),
  );

  return {
    accounts,
    positions: batches.flat(),
  };
}
