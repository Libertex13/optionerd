import { NextResponse } from "next/server";
import { getStockSnapshot } from "@/lib/massive/client";
import type { StockQuote } from "@/types/market";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();

  if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) {
    return NextResponse.json(
      { error: "Invalid or missing ticker parameter" },
      { status: 400 }
    );
  }

  try {
    const data = await getStockSnapshot(ticker);
    const { ticker: t } = data;

    const quote: StockQuote = {
      ticker: t.ticker,
      name: t.name,
      price: t.lastTrade.p,
      change: t.todaysChange,
      changePercent: t.todaysChangePerc,
      volume: t.day.v,
      previousClose: t.prevDay.c,
      timestamp: t.updated,
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
      { status: 500 }
    );
  }
}
