import "server-only";
import type { User } from "@supabase/supabase-js";

function allowedDirectTesterEmails(): string[] {
  return (process.env.TRADESTATION_DIRECT_TESTER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function canUseDirectTradeStation(user: User | null): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const email = user?.email?.toLowerCase();
  return !!email && allowedDirectTesterEmails().includes(email);
}

export function directTradeStationUnavailableMessage(): string {
  return "Direct TradeStation is only available to allowlisted testers in development.";
}
