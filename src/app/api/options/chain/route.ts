import { NextResponse } from "next/server";
import { getOptionsSnapshot, getPrevDayClose } from "@/lib/massive/client";
import type {
  OptionChain,
  OptionChainExpiry,
  OptionContract,
} from "@/types/market";
import type { MassiveOptionSnapshot } from "@/lib/massive/types";

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
    const [optionsData, underlyingPrice] = await Promise.all([
      getOptionsSnapshot(ticker),
      getPrevDayClose(ticker),
    ]);

    if (!optionsData.results || optionsData.results.length === 0) {
      return NextResponse.json(
        { error: "No options data available for this ticker" },
        { status: 404 },
      );
    }

    // Group options by expiration date
    const expiryMap = new Map<
      string,
      { calls: OptionContract[]; puts: OptionContract[] }
    >();

    for (const snapshot of optionsData.results) {
      const expDate = snapshot.details.expiration_date;

      if (!expiryMap.has(expDate)) {
        expiryMap.set(expDate, { calls: [], puts: [] });
      }

      const contract = normalizeContract(snapshot, ticker, underlyingPrice);
      const expiry = expiryMap.get(expDate)!;

      if (snapshot.details.contract_type === "call") {
        expiry.calls.push(contract);
      } else {
        expiry.puts.push(contract);
      }
    }

    // Sort and build expirations array
    const expirations: OptionChainExpiry[] = Array.from(expiryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([expDate, contracts]) => {
        const expTime = new Date(expDate).getTime();
        const now = Date.now();
        const daysToExpiry = Math.max(
          0,
          Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)),
        );

        // Sort by strike price
        contracts.calls.sort((a, b) => a.strikePrice - b.strikePrice);
        contracts.puts.sort((a, b) => a.strikePrice - b.strikePrice);

        return {
          expirationDate: expDate,
          daysToExpiry,
          calls: contracts.calls,
          puts: contracts.puts,
        };
      });

    const chain: OptionChain = {
      ticker,
      underlyingPrice,
      expirations,
    };

    return NextResponse.json(chain, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
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

function normalizeContract(
  snapshot: MassiveOptionSnapshot,
  ticker: string,
  underlyingPrice: number,
): OptionContract {
  const day = snapshot.day ?? {};
  const lastQuote = snapshot.last_quote ?? {};

  const bid = lastQuote.bid ?? 0;
  const ask = lastQuote.ask ?? 0;
  const mid = lastQuote.midpoint ?? (bid + ask) / 2;
  const last = day.close ?? mid;

  return {
    contractSymbol: snapshot.details.ticker,
    ticker,
    expirationDate: snapshot.details.expiration_date,
    strikePrice: snapshot.details.strike_price,
    optionType: snapshot.details.contract_type,
    bid,
    ask,
    last,
    mid,
    volume: day.volume ?? 0,
    openInterest: snapshot.open_interest ?? 0,
    impliedVolatility: snapshot.implied_volatility ?? 0,
    delta: snapshot.greeks?.delta ?? 0,
    gamma: snapshot.greeks?.gamma ?? 0,
    theta: snapshot.greeks?.theta ?? 0,
    vega: snapshot.greeks?.vega ?? 0,
    rho: 0,
    inTheMoney:
      snapshot.details.contract_type === "call"
        ? underlyingPrice > snapshot.details.strike_price
        : underlyingPrice < snapshot.details.strike_price,
  };
}
