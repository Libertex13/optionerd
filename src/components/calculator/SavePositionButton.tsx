"use client";

import { useState } from "react";
import { Briefcase, Check } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import type { SavedStockLeg, SavedTradeLeg } from "@/lib/supabase/types";

interface SavePositionButtonProps {
  ticker: string;
  underlyingPrice: number;
  legs: SavedTradeLeg[];
  stockLeg: SavedStockLeg | null;
  className?: string;
}

function defaultPositionName(
  ticker: string,
  legs: SavedTradeLeg[],
  stockLeg: SavedStockLeg | null,
) {
  const parts = legs.map(
    (leg) =>
      `${leg.position_type === "long" ? "B" : "S"} ${leg.option_type[0].toUpperCase()}${leg.strike_price}`,
  );

  if (stockLeg) {
    parts.unshift(
      `${stockLeg.position_type === "long" ? "Long" : "Short"} ${stockLeg.quantity} shares`,
    );
  }

  return `${ticker} ${parts.join(" / ")}`.trim();
}

function inferStrategy(legs: SavedTradeLeg[], stockLeg: SavedStockLeg | null) {
  if (legs.length === 0 && stockLeg) return "stock";
  if (
    stockLeg?.position_type === "long" &&
    legs.length === 1 &&
    legs[0].option_type === "call" &&
    legs[0].position_type === "short"
  ) {
    return "covered_call";
  }
  return null;
}

export function SavePositionButton({
  ticker,
  underlyingPrice,
  legs,
  stockLeg,
  className,
}: SavePositionButtonProps) {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setName(defaultPositionName(ticker, legs, stockLeg));
    setShowNameInput(true);
    setError("");
  };

  const handleSave = async () => {
    if (!name.trim() || (!stockLeg && legs.length === 0)) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: "open",
          name: name.trim(),
          ticker,
          strategy: inferStrategy(legs, stockLeg),
          entry_underlying_price: underlyingPrice,
          entry_date: new Date().toISOString(),
          legs: legs.map((leg) => ({
            side: leg.position_type,
            type: leg.option_type,
            strike: leg.strike_price,
            entry_premium: leg.premium,
            quantity: leg.quantity,
            expiration_date: leg.expiration_date,
            implied_volatility: leg.implied_volatility,
          })),
          stock_leg: stockLeg
            ? {
                side: stockLeg.position_type,
                quantity: stockLeg.quantity,
                entry_price: stockLeg.entry_price,
              }
            : null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to add position");
      }

      setSaved(true);
      setShowNameInput(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add position");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showNameInput ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
              }}
              placeholder="Position name"
              autoFocus
              className="h-7 w-44 rounded-sm border border-input bg-transparent px-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
            />
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-sm bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "..." : "Add"}
            </button>
            <button
              onClick={() => setShowNameInput(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          {error && <span className="text-[10px] text-destructive">{error}</span>}
        </div>
      ) : (
        <button
          onClick={handleClick}
          className={`flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2 transition-colors hover:bg-muted ${
            saved
              ? "text-green-600 dark:text-green-400"
              : "text-muted-foreground hover:text-foreground"
          } ${className ?? ""}`}
        >
          {saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Briefcase className="h-4 w-4" />
          )}
          <span className="text-[10px] font-medium">
            {saved ? "Added" : user ? "Portfolio" : "Sign in"}
          </span>
        </button>
      )}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
