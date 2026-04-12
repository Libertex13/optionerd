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

    const upperQuery = query.toUpperCase();

    const results: TickerSearchResult[] = data.results
      .map((r) => ({
        ticker: r.ticker,
        name: r.name,
        market: r.market,
        type: r.type,
      }))
      .sort((a, b) => {
        // Exact match first
        if (a.ticker === upperQuery && b.ticker !== upperQuery) return -1;
        if (b.ticker === upperQuery && a.ticker !== upperQuery) return 1;
        // Then prefix matches
        const aPrefix = a.ticker.startsWith(upperQuery);
        const bPrefix = b.ticker.startsWith(upperQuery);
        if (aPrefix && !bPrefix) return -1;
        if (bPrefix && !aPrefix) return 1;
        // Then alphabetical
        return a.ticker.localeCompare(b.ticker);
      });

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
