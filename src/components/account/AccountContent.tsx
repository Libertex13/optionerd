"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { getPortalLink } from "@/lib/stripe/config";
import { Badge } from "@/components/ui/badge";
import type { Plan, PlanPeriod } from "@/lib/supabase/types";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { TradeStationConnection } from "./TradeStationConnection";

interface ProfileData {
  plan: Plan;
  plan_period: PlanPeriod | null;
  plan_expires_at: string | null;
  stripe_customer_id: string | null;
  email: string;
  display_name: string | null;
  created_at: string;
}

export function AccountContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/");
      return;
    }

    const supabase = createClient();
    supabase
      .from("profiles")
      .select(
        "plan, plan_period, plan_expires_at, stripe_customer_id, email, display_name, created_at",
      )
      .eq("id", user.id)
      .single()
      .then(
        ({
          data,
        }: {
          data: ProfileData | null;
        }) => {
          if (data) setProfile(data);
          setLoading(false);
        },
      );
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl px-3 py-10">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!user || !profile) return null;

  const isNerd = profile.plan === "nerd";
  const memberSince = new Date(profile.created_at).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );

  return (
    <div className="mx-auto max-w-2xl px-3 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Account</h1>

      {/* Profile section */}
      <section className="mt-6 rounded-md border border-border bg-card p-4">
        <h2 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Profile
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">
              {profile.display_name ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{profile.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">{memberSince}</span>
          </div>
        </div>
      </section>

      {/* Subscription section */}
      <section className="mt-4 rounded-md border border-border bg-card p-4">
        <h2 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Subscription
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Plan</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">
                {isNerd ? "Nerd" : "Casual"}
              </span>
              <Badge variant={isNerd ? "default" : "secondary"} className="font-mono text-[10px]">
                {isNerd ? "active" : "free"}
              </Badge>
            </div>
          </div>
          {isNerd && profile.plan_period && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Billing</span>
              <span className="font-medium capitalize">
                {profile.plan_period}
              </span>
            </div>
          )}
          {isNerd && profile.plan_expires_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Next billing date</span>
              <span className="font-medium">
                {new Date(profile.plan_expires_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {!isNerd && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-medium">$0 forever</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex gap-2">
          {isNerd ? (
            <a
              href={getPortalLink(profile.email)}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 h-8 text-sm font-medium hover:bg-muted transition-all"
            >
              Manage subscription
            </a>
          ) : (
            <a
              href="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 h-8 text-sm font-medium hover:bg-primary/80 transition-all"
            >
              Upgrade to Nerd
            </a>
          )}
        </div>
      </section>

      <TradeStationConnection />

      {/* Billing history */}
      {isNerd && (
        <section className="mt-4 rounded-md border border-border bg-card p-4">
          <h2 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Billing
          </h2>
          <p className="text-sm text-muted-foreground">
            View invoices, update payment method, and download receipts in the
            Stripe Customer Portal.
          </p>
          <a
            href={getPortalLink(profile.email)}
            className="mt-3 inline-flex items-center justify-center rounded-md border border-border bg-background px-3 h-8 text-sm font-medium hover:bg-muted transition-all"
          >
            View billing history
          </a>
        </section>
      )}

      {/* Danger zone */}
      <section className="mt-8 rounded-md border border-destructive/30 bg-card p-4">
        <h2 className="font-mono text-sm font-bold text-destructive uppercase tracking-wider mb-2">
          Danger zone
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Permanently delete your account and all associated data. This action
          cannot be undone.
          {isNerd && " Your Nerd subscription will be cancelled immediately."}
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive px-3 h-8 text-sm font-medium hover:bg-destructive/20 transition-all"
        >
          Delete account
        </button>
      </section>

      <DeleteAccountModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
