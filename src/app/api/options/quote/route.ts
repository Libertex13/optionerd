import { NextResponse } from "next/server";
import { fetchNasdaqSpot } from "@/lib/quotes/nasdaq";
import type { StockQuote } from "@/types/market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker || !/^[A-Z]{1,6}$/.test(ticker)) {
    return NextResponse.json(
      { error: "Invalid or missing ticker parameter" },
      { status: 400 },
    );
  }

  try {
    const price = await fetchNasdaqSpot(ticker);
    if (!(price > 0)) throw new Error(`No delayed stock quote available for ${ticker}`);

    const quote: StockQuote = {
      ticker,
      name: "",
      price,
      change: 0,
      changePercent: 0,
      volume: 0,
      previousClose: 0,
      timestamp: Date.now(),
    };

    return NextResponse.json(quote, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Stock quote error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock quote" },
      { status: 500 },
    );
  }
}
