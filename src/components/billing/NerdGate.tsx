"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "./UpgradePrompt";

interface NerdGateProps {
  children: ReactNode;
  /** Feature label shown on the lock badge */
  feature: string;
  /** Mock/placeholder content rendered blurred when gated. If omitted, a generic placeholder is shown. */
  preview?: ReactNode;
}

export function NerdGate({ children, feature, preview }: NerdGateProps) {
  const { isNerd, loading } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading || isNerd) return <>{children}</>;

  // Never render real children — show blurred mock preview instead
  return (
    <>
      <div
        onClick={() => setShowUpgrade(true)}
        className="relative cursor-pointer group"
      >
        <div className="pointer-events-none select-none blur-[3px] opacity-40" aria-hidden="true" data-nice-try="Nice try! Upgrade to Nerd for the real data.">
          {preview ?? <GatePlaceholder />}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-1.5 rounded-md bg-card/90 border border-border px-3 py-1.5 shadow-sm group-hover:bg-card transition-colors">
            <Lock className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-xs font-medium">
              {feature}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              — Nerd
            </span>
          </div>
        </div>
      </div>
      <UpgradePrompt
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={feature}
      />
    </>
  );
}

/** Generic placeholder bars — used when no custom preview is provided */
function GatePlaceholder() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="h-4 w-32 rounded bg-muted" />
      <div className="grid grid-cols-4 gap-2">
        <div className="h-14 rounded bg-muted" />
        <div className="h-14 rounded bg-muted" />
        <div className="h-14 rounded bg-muted" />
        <div className="h-14 rounded bg-muted" />
      </div>
      <div className="h-48 rounded bg-muted" />
    </div>
  );
}
