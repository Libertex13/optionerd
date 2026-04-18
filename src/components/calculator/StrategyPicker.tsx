"use client";

import { useState } from "react";
import { PayoffShape } from "./PayoffShape";
import {
  marketViews,
  pickerStrategies,
  strategyTemplates,
  type MarketView,
} from "@/lib/strategies/templates";

interface StrategyPickerProps {
  ticker?: string;
  price?: number;
  onSelectTemplate: (templateSlug: string) => void;
}

function ComplexityBars({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-2.5 w-1 rounded-[1px] ${
            i < level ? "bg-muted-foreground" : "bg-border"
          }`}
        />
      ))}
    </span>
  );
}

function MatchBadge({ match }: { match: "high" | "med" | "low" }) {
  const styles = {
    high: "bg-green-500/15 text-green-400",
    med: "bg-yellow-500/15 text-yellow-400",
    low: "bg-muted text-muted-foreground",
  };
  const labels = { high: "BEST FIT", med: "GOOD", low: "CONSIDER" };

  return (
    <span
      className={`font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] tracking-wider ${styles[match]}`}
    >
      {labels[match]}
    </span>
  );
}

export function StrategyPicker({
  ticker,
  price,
  onSelectTemplate,
}: StrategyPickerProps) {
  const [selectedView, setSelectedView] = useState<MarketView["id"]>("neutral");

  const suggestions = pickerStrategies[selectedView] || [];

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          What&apos;s your view
          {ticker && price ? (
            <>
              {" "}
              on{" "}
              <span className="font-mono bg-card-foreground/5 dark:bg-card-foreground/10 px-2 py-0.5 border border-border rounded-[3px]">
                {ticker} ${price.toFixed(2)}
              </span>
            </>
          ) : null}
          ?
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
          Pick a market view and we&apos;ll suggest strategies. Every suggestion
          drops you into the builder with legs pre-filled and editable.
        </p>
      </div>

      {/* View cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {marketViews.map((view) => (
          <button
            key={view.id}
            onClick={() => setSelectedView(view.id)}
            className={`flex flex-col gap-2 p-3.5 rounded-[5px] border text-left transition-colors cursor-pointer ${
              selectedView === view.id
                ? "border-foreground bg-card-foreground/5 dark:bg-card-foreground/10"
                : "border-border bg-card hover:border-muted-foreground/40 hover:bg-card-foreground/5 dark:hover:bg-card-foreground/5"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[13.5px] font-semibold">{view.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                {view.tag}
              </span>
            </div>
            <div className="h-[54px]">
              <PayoffShape shape={view.shape} />
            </div>
            <span className="text-[11.5px] text-muted-foreground">
              {view.hint}
            </span>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-bold">Suggested strategies</h3>
          <p className="font-mono text-[11.5px] text-muted-foreground">
            {selectedView} view &middot; ranked by fit
          </p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {suggestions.length} matches
        </span>
      </div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {suggestions.map(({ templateSlug, match, undefinedRisk }) => {
          const tpl = strategyTemplates[templateSlug];
          if (!tpl) return null;

          return (
            <div
              key={templateSlug}
              className="border border-border rounded-[5px] p-3.5 bg-card flex flex-col gap-2.5 hover:border-muted-foreground/40 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-[14px] font-bold flex items-center gap-1.5">
                    {tpl.label}
                    {undefinedRisk && (
                      <span className="font-mono text-[10px] text-amber-500 ml-1">
                        ! undefined
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[10.5px] text-muted-foreground mt-0.5">
                    {tpl.legDescription}
                  </div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <MatchBadge match={match} />
                  <ComplexityBars level={tpl.complexity} />
                </div>
              </div>

              <div className="h-[78px]">
                <PayoffShape
                  shape={tpl.shape}
                  width={300}
                  height={78}
                  strokeWidth={2}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2.5">
                <div className="flex gap-3.5 font-mono text-[11px]">
                  <div>
                    <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider block mb-0.5">
                      Legs
                    </span>
                    <span className="text-[12px] font-semibold">
                      {tpl.legs.reduce((s, l) => s + l.quantity, 0)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-muted-foreground uppercase tracking-wider block mb-0.5">
                      Complexity
                    </span>
                    <ComplexityBars level={tpl.complexity} />
                  </div>
                </div>
                <button
                  onClick={() => onSelectTemplate(templateSlug)}
                  className="h-[26px] px-2.5 text-[11.5px] font-medium border border-border rounded-[3px] bg-card-foreground/5 dark:bg-card-foreground/10 hover:bg-accent transition-colors"
                >
                  Build &rarr;
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
