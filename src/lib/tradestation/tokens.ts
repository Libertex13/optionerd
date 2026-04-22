import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  TRADESTATION_AUTH_BASE,
  TRADESTATION_CLIENT_ID,
  TRADESTATION_CLIENT_SECRET,
  TRADESTATION_REDIRECT_URI,
  assertConfigured,
} from "./config";

export interface TradestationTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;   // seconds
  token_type: string;   // "Bearer"
  scope?: string;
  id_token?: string;
}

export interface StoredConnection {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
  account_ids: string[];
  scope: string | null;
}

/**
 * Exchange the one-time auth code for access + refresh tokens.
 */
export async function exchangeAuthCode(
  code: string,
): Promise<TradestationTokenResponse> {
  assertConfigured();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: TRADESTATION_CLIENT_ID,
    client_secret: TRADESTATION_CLIENT_SECRET,
    code,
    redirect_uri: TRADESTATION_REDIRECT_URI,
  });

  const res = await fetch(`${TRADESTATION_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `TradeStation token exchange failed (${res.status}): ${detail}`,
    );
  }

  return (await res.json()) as TradestationTokenResponse;
}

/**
 * Trade the stored refresh token for a fresh access token.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<TradestationTokenResponse> {
  assertConfigured();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: TRADESTATION_CLIENT_ID,
    client_secret: TRADESTATION_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const res = await fetch(`${TRADESTATION_AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `TradeStation token refresh failed (${res.status}): ${detail}`,
    );
  }

  return (await res.json()) as TradestationTokenResponse;
}

/**
 * Persist a fresh token response for the given user. Upsert keyed on user_id.
 * Some refresh responses omit refresh_token (non-rotating keys); preserve the
 * existing one in that case.
 */
export async function saveTokens(
  userId: string,
  tokens: TradestationTokenResponse,
  fallbackRefreshToken?: string,
): Promise<void> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const refreshToken = tokens.refresh_token || fallbackRefreshToken;
  if (!refreshToken) {
    throw new Error("No refresh_token in response and no fallback available");
  }

  const { error } = await supabase.from("tradestation_connections").upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(`Failed to save tokens: ${error.message}`);
}

/**
 * Fetch the stored connection for a user. Returns null if not connected.
 */
export async function getConnection(
  userId: string,
): Promise<StoredConnection | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tradestation_connections")
    .select("user_id, access_token, refresh_token, expires_at, account_ids, scope")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to read connection: ${error.message}`);
  return data as StoredConnection | null;
}

/**
 * Get a valid access token for the user, refreshing if within 60s of expiry.
 * Used by any server-side code that needs to call TradeStation on the user's
 * behalf (Phase 2: accounts, positions, etc.).
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const conn = await getConnection(userId);
  if (!conn) throw new Error("User has not connected TradeStation");

  const expiresAtMs = new Date(conn.expires_at).getTime();
  const shouldRefresh = Date.now() > expiresAtMs - 60_000;

  if (!shouldRefresh) return conn.access_token;

  const fresh = await refreshAccessToken(conn.refresh_token);
  await saveTokens(userId, fresh, conn.refresh_token);
  return fresh.access_token;
}

/**
 * Remove the stored connection for this user.
 */
export async function removeConnection(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tradestation_connections")
    .delete()
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to disconnect: ${error.message}`);
}
