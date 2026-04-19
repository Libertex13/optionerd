"use client";

import { useState } from "react";
import type { SavedTradeLeg, SavedStockLeg } from "@/lib/supabase/types";
import { buildShareUrl } from "@/lib/share/url";

interface ShareTradeButtonProps {
  ticker: string;
  underlyingPrice: number;
  legs: SavedTradeLeg[];
  stockLeg: SavedStockLeg | null;
}

export function ShareTradeButton({
  ticker,
  underlyingPrice,
  legs,
  stockLeg,
}: ShareTradeButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleShare = async () => {
    const url = buildShareUrl({ ticker, underlyingPrice, legs, stockLeg });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`text-xs transition-colors ${
        copied
          ? "text-green-600 dark:text-green-400 font-semibold"
          : error
            ? "text-destructive"
            : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {copied ? "Link copied!" : error ? "Copy failed" : "Share link"}
    </button>
  );
}
