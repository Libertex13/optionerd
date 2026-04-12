import { NextResponse } from "next/server";
import { getPrevDayClose } from "@/lib/massive/client";
import type { StockQuote } from "@/types/market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) {
    return NextResponse.json(
      { error: "Invalid or missing ticker parameter" },
      { status: 400 },
    );
  }

  try {
    const price = await getPrevDayClose(ticker);

    const quote: StockQuote = {
      ticker,
      name: "",
      price,
      change: 0,
      changePercent: 0,
      volume: 0,
      previousClose: price,
      timestamp: Date.now(),
    };

    return NextResponse.json(quote, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
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
