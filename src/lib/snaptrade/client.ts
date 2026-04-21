import { Snaptrade } from "snaptrade-typescript-sdk";

let cached: Snaptrade | null = null;

/**
 * Returns a memoized SnapTrade SDK client.
 * Server-side only — never import from "use client" files.
 */
export function getSnapTrade(): Snaptrade {
  if (cached) return cached;

  const clientId = process.env.SNAPTRADE_CLIENT_ID;
  const consumerKey = process.env.SNAPTRADE_CONSUMER_KEY;

  if (!clientId || !consumerKey) {
    throw new Error(
      "SnapTrade env vars missing: SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY required",
    );
  }

  cached = new Snaptrade({
    clientId,
    consumerKey,
  });

  return cached;
}
