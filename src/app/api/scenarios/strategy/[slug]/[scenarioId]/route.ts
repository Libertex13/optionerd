import { NextResponse } from "next/server";
import { getScenariosForStrategy } from "@/lib/scenarios/registry";
import {
  getHistoricalOption,
  getHistoricalUnderlying,
} from "@/lib/massive/historical";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; scenarioId: string }> },
) {
  const { slug, scenarioId } = await ctx.params;
  const list = getScenariosForStrategy(slug);
  const cfg = list.find((s) => s.id === scenarioId);

  if (!cfg) {
    return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  try {
    const [underlying, ...legPrices] = await Promise.all([
      getHistoricalUnderlying(
        cfg.ticker,
        cfg.contextFrom ?? cfg.from,
        cfg.contextTo ?? cfg.to,
      ),
      ...cfg.legs.map((leg) =>
        getHistoricalOption(
          cfg.ticker,
          leg.expiry,
          leg.type,
          leg.strike,
          cfg.from,
          cfg.to,
        ),
      ),
    ]);

    return NextResponse.json(
      {
        config: cfg,
        underlying,
        legPrices,
        source: "massive-historical",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Scenario data error:", detail);
    return NextResponse.json(
      { error: "Failed to fetch scenario data", detail },
      { status: 500 },
    );
  }
}
