"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSavedTrades } from "@/hooks/useSavedTrades";
import { AuthModal } from "@/components/auth/AuthModal";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import type { SavedTradeLeg, SavedStockLeg } from "@/lib/supabase/types";
import { buildShareUrl } from "@/lib/share/url";

interface SaveTradeButtonProps {
  ticker: string;
  underlyingPrice: number;
  legs: SavedTradeLeg[];
  stockLeg: SavedStockLeg | null;
}

export function SaveTradeButton({
  ticker,
  underlyingPrice,
  legs,
  stockLeg,
}: SaveTradeButtonProps) {
  const { user } = useAuth();
  const { saveTrade } = useSavedTrades();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    // Default name from the position
    const legDesc = legs.map(
      (l) => `${l.position_type === "long" ? "B" : "S"} ${l.option_type[0].toUpperCase()}${l.strike_price}`,
    ).join(" / ");
    setName(`${ticker} ${legDesc}`);
    setShowNameInput(true);
    setError("");
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");

    const result = await saveTrade({
      name: name.trim(),
      ticker,
      underlying_price: underlyingPrice,
      legs,
      stock_leg: stockLeg,
    });

    setSaving(false);

    if (result.success) {
      setSaved(true);
      setShowNameInput(false);
      setShareUrl(buildShareUrl({ ticker, underlyingPrice, legs, stockLeg }));
      setTimeout(() => setSaved(false), 2000);
    } else if (result.upgrade) {
      setShowNameInput(false);
      setShowUpgrade(true);
    } else {
      setError(result.message);
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
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="Trade name"
              autoFocus
              className="h-7 w-40 rounded-sm border border-input bg-transparent px-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/30"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-sm bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "..." : "Save"}
            </button>
            <button
              onClick={() => setShowNameInput(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          {error && (
            <span className="text-[10px] text-destructive">{error}</span>
          )}
        </div>
      ) : shareUrl ? (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-green-600 dark:text-green-400">
            Saved!
          </span>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              } catch {
                /* no-op */
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {linkCopied ? "Copied!" : "Copy share link"}
          </button>
          <button
            onClick={() => {
              setShareUrl(null);
              setLinkCopied(false);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            x
          </button>
        </div>
      ) : (
        <button
          onClick={handleClick}
          className={`text-xs transition-colors ${
            saved
              ? "text-green-600 dark:text-green-400 font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {saved ? "Saved!" : user ? "Save trade" : "Sign in to save"}
        </button>
      )}
      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="Unlimited saved trades"
      />
    </>
  );
}
