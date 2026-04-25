"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

const TINT_KEY = "optionerd-tint";

type Tint = "neutral" | "indigo" | "teal" | "violet";
type Mode = "light" | "dark";

interface ThemeOption {
  mode: Mode;
  tint: Tint;
  label: string;
  background: string;
  card: string;
  border: string;
  foreground: string;
}

const THEMES: ReadonlyArray<ThemeOption> = [
  {
    mode: "light", tint: "neutral", label: "Light",
    background: "oklch(0.985 0 0)", card: "oklch(1 0 0)",
    border: "oklch(0.90 0 0)", foreground: "oklch(0.12 0 0)",
  },
  {
    mode: "light", tint: "indigo", label: "Light Indigo",
    background: "oklch(0.985 0.008 265)", card: "oklch(1 0.006 265)",
    border: "oklch(0.90 0.018 265)", foreground: "oklch(0.12 0 0)",
  },
  {
    mode: "light", tint: "teal", label: "Light Teal",
    background: "oklch(0.985 0.008 200)", card: "oklch(1 0.006 200)",
    border: "oklch(0.90 0.018 200)", foreground: "oklch(0.12 0 0)",
  },
  {
    mode: "light", tint: "violet", label: "Light Violet",
    background: "oklch(0.985 0.008 300)", card: "oklch(1 0.006 300)",
    border: "oklch(0.90 0.018 300)", foreground: "oklch(0.12 0 0)",
  },
  {
    mode: "dark", tint: "neutral", label: "Dark",
    background: "oklch(0.11 0 0)", card: "oklch(0.14 0 0)",
    border: "oklch(0.22 0 0)", foreground: "oklch(0.93 0 0)",
  },
  {
    mode: "dark", tint: "indigo", label: "Dark Indigo",
    background: "oklch(0.11 0.022 265)", card: "oklch(0.14 0.022 265)",
    border: "oklch(0.22 0.020 265)", foreground: "oklch(0.93 0 0)",
  },
  {
    mode: "dark", tint: "teal", label: "Dark Teal",
    background: "oklch(0.11 0.022 200)", card: "oklch(0.14 0.022 200)",
    border: "oklch(0.22 0.020 200)", foreground: "oklch(0.93 0 0)",
  },
  {
    mode: "dark", tint: "violet", label: "Dark Violet",
    background: "oklch(0.11 0.022 300)", card: "oklch(0.14 0.022 300)",
    border: "oklch(0.22 0.020 300)", foreground: "oklch(0.93 0 0)",
  },
];

function readTint(): Tint {
  if (typeof document === "undefined") return "teal";
  const v = document.documentElement.dataset.tint as Tint | undefined;
  return v && ["neutral", "indigo", "teal", "violet"].includes(v) ? v : "teal";
}

export function ThemeSelector() {
  const { resolvedTheme, setTheme } = useTheme();
  const [tint, setTint] = useState<Tint>("teal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTint(readTint());
    setMounted(true);
  }, []);

  function pick(option: ThemeOption) {
    document.documentElement.dataset.tint = option.tint;
    try {
      localStorage.setItem(TINT_KEY, option.tint);
    } catch {}
    setTint(option.tint);
    setTheme(option.mode);
  }

  return (
    <section className="mt-4 rounded-md border border-border bg-card p-4">
      <h2 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
        Themes
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {THEMES.map((t) => {
          const active = mounted && resolvedTheme === t.mode && tint === t.tint;
          return (
            <button
              key={`${t.mode}-${t.tint}`}
              onClick={() => pick(t)}
              className={`group relative flex flex-col items-stretch gap-2 rounded-md border p-2 text-left transition-colors ${
                active
                  ? "border-foreground"
                  : "border-border hover:border-muted-foreground"
              }`}
              aria-pressed={active}
            >
              <div
                className="relative h-14 w-full overflow-hidden rounded-sm border"
                style={{ backgroundColor: t.background, borderColor: t.border }}
              >
                <div
                  className="absolute left-1.5 top-1.5 h-3 w-8 rounded-[2px]"
                  style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}
                />
                <div
                  className="absolute left-1.5 top-6 h-1.5 w-10 rounded-[1px] opacity-70"
                  style={{ backgroundColor: t.foreground }}
                />
                <div
                  className="absolute left-1.5 top-9 h-1 w-6 rounded-[1px] opacity-40"
                  style={{ backgroundColor: t.foreground }}
                />
                {active && (
                  <span className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-foreground">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
