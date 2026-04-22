/**
 * TradeStation environment + endpoint config.
 * Client secret must never leak to the browser — this module is server-only.
 */

export const TRADESTATION_CLIENT_ID = process.env.TRADESTATION_API_KEY ?? "";
export const TRADESTATION_CLIENT_SECRET = process.env.TRADESTATION_API_SECRET ?? "";

export const TRADESTATION_REDIRECT_URI =
  process.env.TRADESTATION_REDIRECT_URI ??
  "http://localhost:3000/api/brokerage/tradestation/callback";

export const TRADESTATION_AUTH_BASE =
  process.env.TRADESTATION_AUTH_BASE ?? "https://signin.tradestation.com";

export const TRADESTATION_API_BASE =
  process.env.TRADESTATION_API_BASE ?? "https://api.tradestation.com/v3";

export const TRADESTATION_AUDIENCE = "https://api.tradestation.com";

/**
 * Scopes requested for this app. Explicitly excluding `Trade` — we are
 * read-only. If trading features land later, add Trade here and expect users
 * to re-authorize.
 */
export const TRADESTATION_SCOPES = ["openid", "offline_access", "ReadAccount"];

export function assertConfigured(): void {
  if (!TRADESTATION_CLIENT_ID || !TRADESTATION_CLIENT_SECRET) {
    throw new Error(
      "TradeStation env vars missing: TRADESTATION_API_KEY and TRADESTATION_API_SECRET must be set",
    );
  }
}
