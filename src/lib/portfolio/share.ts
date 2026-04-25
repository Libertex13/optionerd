import type { SavedStockLeg, SavedTradeLeg } from "@/lib/supabase/types";
import type { PortfolioLeg, PortfolioPosition, PositionStockLeg } from "./types";
import { buildShareUrl } from "@/lib/share/url";

export function portfolioLegToSaved(leg: PortfolioLeg): SavedTradeLeg {
  return {
    option_type: leg.t,
    position_type: leg.s,
    strike_price: leg.k,
    premium: leg.p,
    quantity: leg.q,
    expiration_date: leg.exp,
    implied_volatility: leg.iv || 0.3,
  };
}

export function portfolioStockToSaved(stockLeg: PositionStockLeg | null): SavedStockLeg | null {
  return stockLeg
    ? {
        position_type: stockLeg.side,
        quantity: stockLeg.quantity,
        entry_price: stockLeg.entry_price,
      }
    : null;
}

export function buildPortfolioPositionUrl(
  position: PortfolioPosition,
  legs: PortfolioLeg[] = position.legs,
): string {
  return buildShareUrl({
    ticker: position.ticker,
    underlyingPrice: position.px,
    legs: legs.map(portfolioLegToSaved),
    stockLeg: portfolioStockToSaved(position.stockLeg),
  });
}
