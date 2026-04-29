"use client";

import { useState } from "react";
import { Check, Share2, X as XIcon } from "lucide-react";
import type { SavedTradeLeg, SavedStockLeg } from "@/lib/supabase/types";
import { buildShareUrl } from "@/lib/share/url";

interface ShareTradeButtonProps {
  ticker: string;
  underlyingPrice: number;
  legs: SavedTradeLeg[];
  stockLeg: SavedStockLeg | null;
  className?: string;
}

export function ShareTradeButton({
  ticker,
  underlyingPrice,
  legs,
  stockLeg,
  className,
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

  const Icon = copied ? Check : error ? XIcon : Share2;
  const label = copied ? "Copied" : error ? "Failed" : "Share";
  const stateClass = copied
    ? "text-green-600 dark:text-green-400"
    : error
      ? "text-destructive"
      : "text-muted-foreground hover:text-foreground";

  return (
    <button
      onClick={handleShare}
      className={`flex flex-col items-center justify-center gap-1 rounded-md px-1 py-2 transition-colors hover:bg-muted ${stateClass} ${className ?? ""}`}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
