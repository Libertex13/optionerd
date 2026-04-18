"use client";

import { useRouter } from "next/navigation";
import { StrategyPicker } from "@/components/calculator/StrategyPicker";
import { strategyTemplates } from "@/lib/strategies/templates";
import Link from "next/link";
import { getAllStrategySlugs, getStrategyBySlug } from "@/lib/strategies/definitions";

export function StrategiesClient() {
  const router = useRouter();

  return (
    <div className="space-y-10">
      {/* Strategy Picker */}
      <StrategyPicker
        onSelectTemplate={(slug) => {
          const tpl = strategyTemplates[slug];
          if (tpl) {
            router.push(`/calculator/${slug}`);
          }
        }}
      />

      {/* All strategies list */}
      <section>
        <h2 className="text-lg font-bold mb-3">All strategies</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {getAllStrategySlugs().map((slug) => {
            const def = getStrategyBySlug(slug);
            if (!def) return null;
            const sentimentColors: Record<string, string> = {
              bullish: "text-green-500",
              bearish: "text-red-500",
              neutral: "text-yellow-500",
            };
            return (
              <Link
                key={slug}
                href={`/calculator/${slug}`}
                className="flex items-center justify-between rounded-[3px] border border-border px-3 py-2.5 font-mono text-[12.5px] hover:bg-card-foreground/5 dark:hover:bg-card-foreground/5 transition-colors"
              >
                <span>{def.name}</span>
                <span
                  className={`text-[10px] uppercase tracking-wider ${sentimentColors[def.sentiment] ?? "text-muted-foreground"}`}
                >
                  {def.sentiment}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
