"use client";

import { PayoffShape } from "./PayoffShape";
import {
  strategyTemplates,
  templateOrder,
} from "@/lib/strategies/templates";

interface TemplateStripProps {
  activeTemplate: string | null;
  onSelectTemplate: (slug: string) => void;
}

export function TemplateStrip({
  activeTemplate,
  onSelectTemplate,
}: TemplateStripProps) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div>
          <div className="text-sm font-bold">Strategy template</div>
          <div className="font-mono text-[11.5px] text-muted-foreground">
            Pre-fills 2-4 legs. Everything is still editable.
          </div>
        </div>
        {activeTemplate && (
          <button
            onClick={() => onSelectTemplate("")}
            className="text-[11.5px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="px-3 py-2.5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {templateOrder.map((slug) => {
            const tpl = strategyTemplates[slug];
            if (!tpl) return null;
            const isActive = slug === activeTemplate;

            return (
              <button
                key={slug}
                onClick={() => onSelectTemplate(slug)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-[3px] text-[12px] whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? "border-foreground text-foreground bg-card-foreground/5 dark:bg-card-foreground/10"
                    : "border-border text-muted-foreground hover:text-foreground hover:bg-card-foreground/5 dark:hover:bg-card-foreground/5"
                }`}
              >
                <span className="w-5 h-3.5 inline-block">
                  <PayoffShape
                    shape={tpl.shape}
                    width={24}
                    height={14}
                    strokeWidth={1.4}
                  />
                </span>
                {tpl.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
