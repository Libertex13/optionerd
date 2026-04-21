const BASE_URL = "https://api.polygon.io";

function getApiKey(): string {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY environment variable is not set");
  return key;
}

type PolygonAgg = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

type PolygonAggsResponse = {
  ticker: string;
  status: string;
  results?: PolygonAgg[];
  resultsCount?: number;
};

async function fetchAggs(
  ticker: string,
  from: string,
  to: string,
  revalidate = 3600,
): Promise<PolygonAgg[]> {
  const path = `/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}`;
  const url = new URL(path, BASE_URL);
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "5000");
  url.searchParams.set("apiKey", getApiKey());
  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) {
    throw new Error(
      `Polygon aggs fetch failed for ${ticker}: ${res.status} ${res.statusText}`,
    );
  }
  const data = (await res.json()) as PolygonAggsResponse;
  return data.results ?? [];
}

export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export async function getHistoricalUnderlying(
  ticker: string,
  from: string,
  to: string,
) {
  const aggs = await fetchAggs(ticker, from, to);
  return aggs.map((a) => ({
    date: toIsoDate(a.t),
    open: a.o,
    high: a.h,
    low: a.l,
    close: a.c,
    volume: a.v,
  }));
}

export function buildOccOptionTicker(
  underlying: string,
  expiry: string,
  type: "call" | "put",
  strike: number,
): string {
  const [y, m, d] = expiry.split("-");
  if (!y || !m || !d) throw new Error(`Bad expiry format: ${expiry}`);
  const yymmdd = y.slice(2) + m + d;
  const cp = type === "call" ? "C" : "P";
  const strikeInt = Math.round(strike * 1000)
    .toString()
    .padStart(8, "0");
  return `O:${underlying}${yymmdd}${cp}${strikeInt}`;
}

export async function getHistoricalOption(
  underlying: string,
  expiry: string,
  type: "call" | "put",
  strike: number,
  from: string,
  to: string,
) {
  const occ = buildOccOptionTicker(underlying, expiry, type, strike);
  const aggs = await fetchAggs(occ, from, to);
  return aggs.map((a) => ({
    date: toIsoDate(a.t),
    close: a.c,
    volume: a.v,
  }));
}
