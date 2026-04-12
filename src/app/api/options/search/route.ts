import { NextResponse } from "next/server";
import { searchTickers } from "@/lib/massive/client";
import type { TickerSearchResult } from "@/types/market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 1) {
    return NextResponse.json(
      { error: "Missing search query parameter 'q'" },
      { status: 400 }
    );
  }

  try {
    const data = await searchTickers(query);

    const results: TickerSearchResult[] = data.results.map((r) => ({
      ticker: r.ticker,
      name: r.name,
      market: r.market,
      type: r.type,
    }));

    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Ticker search error:", error);
    return NextResponse.json(
      { error: "Failed to search tickers" },
      { status: 500 }
    );
  }
}
