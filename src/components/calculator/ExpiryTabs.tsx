"use client";

import type { OptionChainExpiry } from "@/types/market";

interface ExpiryTabsProps {
  expirations: OptionChainExpiry[];
  selected: string;
  onSelect: (expiry: string) => void;
}

export function ExpiryTabs({ expirations, selected, onSelect }: ExpiryTabsProps) {
  const formatExpiry = (exp: OptionChainExpiry) => {
    const date = new Date(exp.expirationDate + "T00:00:00");
    const month = date.toLocaleString("en-US", { month: "short" });
    const day = date.getDate();
    const dte = exp.daysToExpiry;
    const isMonthly = date.getDay() === 5 && day >= 15 && day <= 21;
    return `${month} ${day} ${isMonthly ? "(M)" : ""} ${dte}d`;
  };

  return (
    <div className="flex gap-1 overflow-x-auto pb-0.5">
      {expirations.map((exp) => {
        const isSelected = exp.expirationDate === selected;
        return (
          <button
            key={exp.expirationDate}
            onClick={() => onSelect(exp.expirationDate)}
            className={`
              shrink-0 rounded-sm px-2 py-1 font-mono text-xs transition-colors
              ${isSelected
                ? "bg-foreground text-background font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }
            `}
          >
            {formatExpiry(exp)}
          </button>
        );
      })}
    </div>
  );
}
