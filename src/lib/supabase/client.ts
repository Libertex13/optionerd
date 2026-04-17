import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a stub during build/SSG when env vars aren't available.
    // Auth features will be inert until Supabase is configured.
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
        signUp: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
        signInWithOAuth: () => Promise.resolve({ error: { message: "Supabase not configured" } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      from: () => ({ select: () => ({ eq: () => ({ order: () => ({ data: null, error: null }) }) }) }),
    } as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(url, key);
}
