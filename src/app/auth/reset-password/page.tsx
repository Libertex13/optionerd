"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "no-session" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function consumeQueryToken(): Promise<boolean> {
      if (typeof window === "undefined") return false;
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      if (!tokenHash || type !== "recovery") return false;
      const auth = supabase.auth as unknown as {
        verifyOtp?: (args: {
          token_hash: string;
          type: "recovery";
        }) => Promise<{ error: { message: string } | null }>;
      };
      if (!auth.verifyOtp) return false;
      const { error } = await auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (cancelled) return true;
      if (error) {
        setStatus({ kind: "no-session" });
        return true;
      }
      history.replaceState(null, "", window.location.pathname);
      setStatus({ kind: "ready" });
      return true;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
          setStatus({ kind: "ready" });
        }
      },
    );

    consumeQueryToken().then((handled) => {
      if (handled || cancelled) return;
      supabase.auth
        .getSession()
        .then(({ data }: { data: { session: Session | null } }) => {
          if (cancelled) return;
          if (data.session) {
            setStatus((prev) =>
              prev.kind === "loading" ? { kind: "ready" } : prev,
            );
          } else {
            setTimeout(() => {
              if (cancelled) return;
              setStatus((prev) =>
                prev.kind === "loading" ? { kind: "no-session" } : prev,
              );
            }, 1500);
          }
        });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus({ kind: "error", message: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setStatus({ kind: "error", message: "Passwords do not match." });
      return;
    }
    setStatus({ kind: "saving" });
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    // Clear the recovery hash so a refresh doesn't re-trigger the flow
    if (typeof window !== "undefined" && window.location.hash) {
      history.replaceState(null, "", window.location.pathname);
    }
    setStatus({ kind: "saved" });
  }

  return (
    <div className="mx-auto max-w-md px-3 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose a new password for your optionerd account.
      </p>

      <div className="mt-6">
        {status.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Verifying recovery link…</p>
        )}

        {status.kind === "no-session" && (
          <div className="rounded-md border border-border bg-card p-5 text-sm">
            <p className="font-medium">This recovery link is invalid or expired.</p>
            <p className="mt-2 text-muted-foreground">
              Request a new password reset email from the sign-in page, then click
              the most recent link.
            </p>
            <Link
              href="/"
              className="mt-3 inline-block text-foreground underline underline-offset-2 hover:no-underline"
            >
              Back to home
            </Link>
          </div>
        )}

        {status.kind === "saved" && (
          <div className="rounded-md border border-border bg-card p-5 text-sm">
            <p className="font-medium">Password updated.</p>
            <p className="mt-2 text-muted-foreground">
              You&apos;re signed in. You can now use email + password to sign in
              alongside any existing OAuth providers.
            </p>
            <Link
              href="/portfolio"
              className="mt-3 inline-block text-foreground underline underline-offset-2 hover:no-underline"
            >
              Go to portfolio →
            </Link>
          </div>
        )}

        {(status.kind === "ready" ||
          status.kind === "saving" ||
          status.kind === "error") && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="rp-password"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                New password
              </label>
              <input
                id="rp-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status.kind === "saving"}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="rp-confirm"
                className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                Confirm password
              </label>
              <input
                id="rp-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={status.kind === "saving"}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {status.kind === "error" && (
              <p className="text-sm text-destructive">{status.message}</p>
            )}
            <button
              type="submit"
              disabled={status.kind === "saving"}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              {status.kind === "saving" ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
