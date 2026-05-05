"use client";

import { useEffect } from "react";

/**
 * Supabase password recovery emails return the user to the Site URL with a
 * URL fragment like `#access_token=...&type=recovery`. The home page can't
 * handle that flow, so this component forwards the user to /auth/reset-password
 * preserving the hash. The Supabase browser client on that page will pick up
 * the hash, hydrate the session, and emit a PASSWORD_RECOVERY event.
 */
export function RecoveryHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.includes("type=recovery")) {
      window.location.replace(`/auth/reset-password${hash}`);
    }
  }, []);
  return null;
}
