"use client";

import { useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { UpgradePrompt } from "./UpgradePrompt";

interface NerdGateProps {
  children: ReactNode;
  feature: string;
}

export function NerdGate({ children, feature }: NerdGateProps) {
  const { isNerd, loading } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (loading || isNerd) return <>{children}</>;

  return (
    <>
      <div
        onClick={() => setShowUpgrade(true)}
        className="relative cursor-pointer group"
      >
        <div className="pointer-events-none select-none opacity-40 blur-[2px]">
          {children}
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
