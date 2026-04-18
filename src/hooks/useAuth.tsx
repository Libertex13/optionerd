"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContext {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then((result: { data: { session: Session | null } }) => {
      setSession(result.data.session);
      setUser(result.data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (authEvent: string, newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // Create Stripe customer when user is authenticated (idempotent — skips if exists)
        if (
          (authEvent === "SIGNED_IN" || authEvent === "INITIAL_SESSION") &&
          newSession?.user
        ) {
          fetch("/api/stripe/customer", { method: "POST" }).catch(() => {
            // Non-critical — customer will be created on next sign-in
          });
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message ?? null };
    },
    [supabase.auth],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return { error: error?.message ?? null };
    },
    [supabase.auth],
  );

  const signInWithGoogle = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (result.error) {
        console.error("Google sign-in error:", result.error.message);
        return { error: result.error.message };
      }
      if (result.data?.url) {
        window.location.href = result.data.url;
      }
      return { error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("Google sign-in exception:", msg);
      return { error: msg };
    }
  }, [supabase.auth]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase.auth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
