import type {
  MassiveSnapshotResponse,
  MassiveStockSnapshotResponse,
  MassiveTickerSearchResponse,
} from "./types";

const BASE_URL = "https://api.polygon.io";

function getApiKey(): string {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) {
    throw new Error("MASSIVE_API_KEY environment variable is not set");
  }
  return key;
}

async function fetchMassive<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, BASE_URL);
  url.searchParams.set("apiKey", getApiKey());

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`Massive API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Search for tickers by name or symbol.
 */
export async function searchTickers(
  query: string,
  limit = 10
): Promise<MassiveTickerSearchResponse> {
  return fetchMassive<MassiveTickerSearchResponse>("/v3/reference/tickers", {
    search: query,
    active: "true",
    market: "stocks",
    limit: limit.toString(),
  });
}

/**
 * Get options chain snapshot for an underlying ticker.
 */
export async function getOptionsSnapshot(
  underlyingTicker: string
): Promise<MassiveSnapshotResponse> {
  return fetchMassive<MassiveSnapshotResponse>(
    `/v3/snapshot/options/${underlyingTicker}`
  );
}

/**
 * Get stock quote snapshot.
 */
export async function getStockSnapshot(
  ticker: string
): Promise<MassiveStockSnapshotResponse> {
  return fetchMassive<MassiveStockSnapshotResponse>(
    `/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`
  );
}
