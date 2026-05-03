"use client";

import { PayoffShape } from "./PayoffShape";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const activeTpl = activeTemplate ? strategyTemplates[activeTemplate] : null;
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

      {/* Mobile — dropdown */}
      <div className="px-3 py-2.5 md:hidden">
        <Select
          value={activeTemplate ?? ""}
          onValueChange={(v) => onSelectTemplate(v ?? "")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a strategy…">
              {activeTpl ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block h-3.5 w-5 shrink-0">
                    <PayoffShape
                      shape={activeTpl.shape}
                      width={24}
                      height={14}
                      strokeWidth={1.4}
                    />
                  </span>
                  {activeTpl.label}
                </span>
              ) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {templateOrder.map((slug) => {
              const tpl = strategyTemplates[slug];
              if (!tpl) return null;
              return (
                <SelectItem key={slug} value={slug}>
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-5 shrink-0">
                      <PayoffShape
                        shape={tpl.shape}
                        width={24}
                        height={14}
                        strokeWidth={1.4}
                      />
                    </span>
                    {tpl.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop — chip strip */}
      <div className="relative hidden px-3 py-2.5 md:block">
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
