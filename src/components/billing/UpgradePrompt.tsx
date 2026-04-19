"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { AuthModal } from "@/components/auth/AuthModal";
import {
  STRIPE_NERD_MONTHLY_LINK,
  STRIPE_NERD_YEARLY_LINK,
} from "@/lib/stripe/config";

const MONTHLY = 29;
const ANNUAL = 290;
const ANNUAL_MONTHLY = ANNUAL / 12;
const SAVE_PCT = Math.round((1 - ANNUAL_MONTHLY / MONTHLY) * 100);

const NERD_FEATURES = [
  "Unlimited saved trades",
  "Max pain analysis",
  "Brokerage portfolio import",
  "AI portfolio analysis",
  "Position repair suggestions",
  "Best structure suggestions",
];

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

export function UpgradePrompt({ open, onClose, feature }: UpgradePromptProps) {
  const { user } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  if (!open) return null;

  const handleUpgrade = () => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    const base =
      period === "monthly"
        ? STRIPE_NERD_MONTHLY_LINK
        : STRIPE_NERD_YEARLY_LINK;

    if (!base) return;

    const params = new URLSearchParams({ client_reference_id: user.id });
    if (user.email) params.set("prefilled_email", user.email);

    window.location.href = `${base}?${params.toString()}`;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-sm rounded-md border border-border bg-card p-5 shadow-lg mx-3">
          <h2 className="font-mono text-lg font-bold">Upgrade to Nerd</h2>
          {feature && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{feature}</span>{" "}
              is a Nerd feature.
            </p>
          )}

          <ul className="mt-4 space-y-1.5 text-sm">
            {NERD_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-3.5 text-foreground shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {/* Billing toggle */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setPeriod("monthly")}
              className={`rounded-sm px-2 py-1 font-mono text-xs transition-colors ${
                period === "monthly"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ${MONTHLY}/mo
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`rounded-sm px-2 py-1 font-mono text-xs transition-colors ${
                period === "yearly"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ${ANNUAL}/yr
              <Badge
                variant="outline"
                className="ml-1.5 font-mono text-[10px]"
              >
                save {SAVE_PCT}%
              </Badge>
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleUpgrade}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-2.5 h-8 text-sm font-medium hover:bg-primary/80 transition-all"
            >
              Upgrade
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-3 h-8 text-sm font-medium hover:bg-muted transition-all"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
