import { NextResponse } from "next/server";
import { getOptionsSnapshot, getStockSnapshot } from "@/lib/massive/client";
import type { OptionChain, OptionChainExpiry, OptionContract } from "@/types/market";
import type { MassiveOptionSnapshot } from "@/lib/massive/types";

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
    const [optionsData, stockData] = await Promise.all([
      getOptionsSnapshot(ticker),
      getStockSnapshot(ticker),
    ]);

    const underlyingPrice = stockData.ticker.lastTrade.p;

    // Group options by expiration date
    const expiryMap = new Map<string, { calls: OptionContract[]; puts: OptionContract[] }>();

    for (const snapshot of optionsData.results) {
      const expDate = snapshot.details.expiration_date;

      if (!expiryMap.has(expDate)) {
        expiryMap.set(expDate, { calls: [], puts: [] });
      }

      const contract = normalizeContract(snapshot, ticker);
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
        const daysToExpiry = Math.max(0, Math.ceil((expTime - now) / (1000 * 60 * 60 * 24)));

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
    console.error("Options chain error:", error);
    return NextResponse.json(
      { error: "Failed to fetch options chain" },
      { status: 500 }
    );
  }
}

function normalizeContract(
  snapshot: MassiveOptionSnapshot,
  ticker: string
): OptionContract {
  return {
    contractSymbol: snapshot.details.ticker,
    ticker,
    expirationDate: snapshot.details.expiration_date,
    strikePrice: snapshot.details.strike_price,
    optionType: snapshot.details.contract_type,
    bid: snapshot.last_quote.bid,
    ask: snapshot.last_quote.ask,
    last: snapshot.day.close,
    mid: snapshot.last_quote.midpoint,
    volume: snapshot.day.volume,
    openInterest: snapshot.open_interest,
    impliedVolatility: snapshot.implied_volatility ?? 0,
    delta: snapshot.greeks?.delta ?? 0,
    gamma: snapshot.greeks?.gamma ?? 0,
    theta: snapshot.greeks?.theta ?? 0,
    vega: snapshot.greeks?.vega ?? 0,
    rho: 0,
    inTheMoney:
      snapshot.details.contract_type === "call"
        ? snapshot.underlying_asset.price > snapshot.details.strike_price
        : snapshot.underlying_asset.price < snapshot.details.strike_price,
  };
}
