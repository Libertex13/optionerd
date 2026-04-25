import { NextResponse } from "next/server";
import { getOptionChain } from "@/lib/quotes";

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
    const { chain, source } = await getOptionChain(ticker);

    if (chain.expirations.length === 0) {
      return NextResponse.json(
        { error: "No options data available for this ticker" },
        { status: 404 },
      );
    }

    return NextResponse.json(chain, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Quote-Source": source,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Options chain error:", message);
    return NextResponse.json(
      { error: "Failed to fetch options chain", detail: message },
      { status: 500 },
    );
  }
}
