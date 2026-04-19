"use client";

import { Fragment, useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  STRIPE_NERD_MONTHLY_LINK,
  STRIPE_NERD_YEARLY_LINK,
  getPortalLink,
} from "@/lib/stripe/config";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/supabase/types";
import Link from "next/link";

const MONTHLY = 29;
const ANNUAL = 290;
const ANNUAL_MONTHLY = ANNUAL / 12;
const SAVE_PCT = Math.round((1 - ANNUAL_MONTHLY / MONTHLY) * 100);

type Feature = {
  name: string;
  casual: boolean | string;
  nerd: boolean | string;
};

const features: { category: string; items: Feature[] }[] = [
  {
    category: "Calculator & Analysis",
    items: [
      { name: "All strategy calculators", casual: true, nerd: true },
      { name: "Payoff diagrams", casual: true, nerd: true },
      { name: "Greeks (Delta, Gamma, Theta, Vega, Rho)", casual: true, nerd: true },
      { name: "Break-even & P/L analysis", casual: true, nerd: true },
      { name: "Multi-leg strategies", casual: true, nerd: true },
      { name: "Future scenario analysis", casual: true, nerd: true },
      { name: "Max pain", casual: false, nerd: true },
      { name: "Best structure suggestions", casual: false, nerd: true },
    ],
  },
  {
    category: "Portfolio",
    items: [
      { name: "Watchlists", casual: true, nerd: true },
      { name: "Saved trades", casual: "5", nerd: "Unlimited" },
      { name: "Brokerage connection", casual: false, nerd: true },
      { name: "AI portfolio analysis", casual: false, nerd: true },
      { name: "Position repair suggestions", casual: false, nerd: true },
    ],
  },
  {
    category: "Market Data",
    items: [
      { name: "Options chain data", casual: true, nerd: true },
      { name: "15-min delayed quotes", casual: true, nerd: true },
    ],
  },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="size-4 text-foreground" />;
  }
  if (value === false) {
    return <X className="size-4 text-muted-foreground/40" />;
  }
  return <span className="font-mono text-xs">{value}</span>;
}

function getCheckoutUrl(
  period: "monthly" | "yearly",
  userId: string,
  email?: string,
): string {
  const base =
    period === "monthly"
      ? STRIPE_NERD_MONTHLY_LINK
      : STRIPE_NERD_YEARLY_LINK;

  if (!base) return "#";

  const params = new URLSearchParams({ client_reference_id: userId });
  if (email) params.set("prefilled_email", email);

  return `${base}?${params.toString()}`;
}

export function PricingContent() {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [plan, setPlan] = useState<Plan>("casual");

  useEffect(() => {
    if (!user) {
      setPlan("casual");
      return;
    }
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: { plan: string } | null }) => {
        if (data?.plan) setPlan(data.plan as Plan);
      });
  }, [user]);

  const isNerd = plan === "nerd";

  const handleUpgrade = () => {
    if (isNerd) {
      window.location.href = getPortalLink(user?.email);
      return;
    }
    if (!user) {
      setShowAuth(true);
      return;
    }
    window.location.href = getCheckoutUrl(
      billingPeriod,
      user.id,
      user.email ?? undefined,
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-3 py-10">
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Pricing
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The best free options calculator on the internet.
          <br />
          Upgrade when you&apos;re ready to get serious.
        </p>
      </div>

      {/* Tier cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Casual */}
        <div className="flex flex-col rounded-md border border-border bg-card p-5">
          {/* Row 1: Name + description */}
          <h2 className="font-mono text-lg font-bold">Casual</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Everything you need to analyze options trades. No account
            required.
          </p>

          {/* Row 2: Billing toggle (empty spacer to match Nerd) */}
          <div className="mt-4 h-7" />

          {/* Row 3: Price */}
          <div className="mb-4">
            <span className="font-mono text-3xl font-bold">$0</span>
            <span className="ml-1 text-sm text-muted-foreground">
              forever
            </span>
          </div>

          {/* Row 4: CTA */}
          <Link
            href="/calculator/long-call"
            className="inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-2.5 h-8 text-sm font-medium hover:bg-muted hover:text-foreground transition-all"
          >
            Start calculating
          </Link>

          {/* Row 5: Features */}
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              All 13+ strategy calculators
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              Full payoff diagrams &amp; Greeks
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              Multi-leg strategies
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              Watchlists
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              5 saved trades
            </li>
          </ul>
        </div>

        {/* Nerd */}
        <div className="flex flex-col rounded-md border-2 border-foreground bg-card p-5">
          {/* Row 1: Name + description */}
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-lg font-bold">Nerd</h2>
            <Badge variant="secondary" className="font-mono text-[10px]">
              recommended
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your brokerage, get AI analysis, and never hit a limit.
          </p>

          {/* Row 2: Billing toggle */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`rounded-sm px-2 py-1 font-mono text-xs transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`rounded-sm px-2 py-1 font-mono text-xs transition-colors ${
                billingPeriod === "yearly"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <Badge
                variant="outline"
                className="ml-1.5 font-mono text-[10px]"
              >
                save {SAVE_PCT}%
              </Badge>
            </button>
          </div>

          {/* Row 3: Price */}
          <div className="mb-4">
            {billingPeriod === "monthly" ? (
              <>
                <span className="font-mono text-3xl font-bold">
                  ${MONTHLY}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  /month
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-3xl font-bold">
                  ${ANNUAL}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  /year
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  (${ANNUAL_MONTHLY.toFixed(2)}/mo)
                </span>
              </>
            )}
          </div>

          {/* Row 4: CTA */}
          <button
            onClick={handleUpgrade}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary text-primary-foreground px-2.5 h-8 text-sm font-medium hover:bg-primary/80 transition-all"
          >
            {isNerd ? "Manage subscription" : "Upgrade to Nerd"}
          </button>

          {/* Row 5: Features */}
          <ul className="mt-5 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              Everything in Casual
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              Unlimited saved trades
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              Brokerage portfolio import
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              AI portfolio analysis
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              Position repair suggestions
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-foreground shrink-0" />
              Max pain &amp; best structure suggestions
            </li>
          </ul>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="mt-12">
        <h2 className="mb-4 text-center font-mono text-base font-bold">
          Feature comparison
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left font-mono text-xs font-medium text-muted-foreground">
                  Feature
                </th>
                <th className="w-24 py-2 text-center font-mono text-xs font-medium text-muted-foreground">
                  Casual
                </th>
                <th className="w-24 py-2 text-center font-mono text-xs font-medium text-muted-foreground">
                  Nerd
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((group) => (
                <Fragment key={group.category}>
                  <tr>
                    <td
                      colSpan={3}
                      className="pt-4 pb-1 font-mono text-xs font-bold text-muted-foreground uppercase tracking-wider"
                    >
                      {group.category}
                    </td>
                  </tr>
                  {group.items.map((feature) => (
                    <tr
                      key={feature.name}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 pr-4">{feature.name}</td>
                      <td className="py-2 text-center">
                        <div className="flex justify-center">
                          <FeatureValue value={feature.casual} />
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        <div className="flex justify-center">
                          <FeatureValue value={feature.nerd} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          Not sure yet? The Casual plan is free forever — no credit card, no
          trial, no limits on the calculator.
        </p>
      </div>
    </div>
  );
}
