import type {
  MassiveSnapshotResponse,
  MassiveTickerSearchResponse,
  MassivePrevDayResponse,
} from "./types";

const BASE_URL = "https://api.polygon.io";

function getApiKey(): string {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) {
    throw new Error("MASSIVE_API_KEY environment variable is not set");
  }
  return key;
}

async function fetchMassive<T>(path: string, params?: Record<string, string>, revalidate = 60): Promise<T> {
  const url = new URL(path, BASE_URL);
  url.searchParams.set("apiKey", getApiKey());

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    next: { revalidate },
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
    type: "CS",
    limit: limit.toString(),
  });
}

/**
 * Get options chain snapshot for an underlying ticker.
 * Fetches all pages to get the complete chain.
 */
export async function getOptionsSnapshot(
  underlyingTicker: string
): Promise<MassiveSnapshotResponse> {
  const firstPage = await fetchMassive<MassiveSnapshotResponse>(
    `/v3/snapshot/options/${underlyingTicker}`,
    { limit: "250" }
  );

  const allResults = [...(firstPage.results ?? [])];

  // Follow pagination
  let nextUrl = firstPage.next_url;
  while (nextUrl) {
    const separator = nextUrl.includes("?") ? "&" : "?";
    const pageUrl = `${nextUrl}${separator}apiKey=${getApiKey()}`;
    const response = await fetch(pageUrl, { next: { revalidate: 60 } });
    if (!response.ok) break;
    const page = (await response.json()) as MassiveSnapshotResponse;
    allResults.push(...(page.results ?? []));
    nextUrl = page.next_url;
  }

  return { ...firstPage, results: allResults };
}

/**
 * Get current stock price via previous day aggregates.
 */
export async function getStockPrice(ticker: string): Promise<number> {
  const data = await fetchMassive<MassivePrevDayResponse>(
    `/v2/aggs/ticker/${ticker}/prev`
  );
  const result = data.results?.[0];
  return result?.c ?? result?.vw ?? 0;
}

/**
 * Extract underlying price from option snapshot results.
 * Falls back to 0 if not available.
 */
export function extractUnderlyingPrice(snapshot: MassiveSnapshotResponse): number {
  // The underlying_asset.price field on option snapshots is the most current
  for (const result of snapshot.results ?? []) {
    if (result.underlying_asset?.price && result.underlying_asset.price > 0) {
      return result.underlying_asset.price;
    }
  }
  return 0;
}
