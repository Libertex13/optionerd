import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler.
 * Exchanges the auth code for a session, then redirects.
 * New users (first sign-in) go to /pricing, returning users go to `next` or /.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this is a brand new user (created in the last 30 seconds)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const createdAt = new Date(user.created_at).getTime();
        const isNewUser = Date.now() - createdAt < 30_000;

        if (isNewUser) {
          return NextResponse.redirect(`${origin}/pricing`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect home
  return NextResponse.redirect(`${origin}/?auth_error=true`);
}
