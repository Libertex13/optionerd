"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";

type Tint = "neutral" | "indigo" | "teal" | "violet";
type Mode = "light" | "dark";

interface TintSwatch {
  id: Tint;
  label: string;
  background: string;
  card: string;
  border: string;
  foreground: string;
}

const LIGHT_TINTS: ReadonlyArray<TintSwatch> = [
  { id: "neutral", label: "Neutral", background: "oklch(0.985 0 0)", card: "oklch(1 0 0)", border: "oklch(0.90 0 0)", foreground: "oklch(0.12 0 0)" },
  { id: "indigo",  label: "Indigo",  background: "oklch(0.985 0.008 265)", card: "oklch(1 0.006 265)", border: "oklch(0.90 0.018 265)", foreground: "oklch(0.12 0 0)" },
  { id: "teal",    label: "Teal",    background: "oklch(0.985 0.008 200)", card: "oklch(1 0.006 200)", border: "oklch(0.90 0.018 200)", foreground: "oklch(0.12 0 0)" },
  { id: "violet",  label: "Violet",  background: "oklch(0.985 0.008 300)", card: "oklch(1 0.006 300)", border: "oklch(0.90 0.018 300)", foreground: "oklch(0.12 0 0)" },
];

const DARK_TINTS: ReadonlyArray<TintSwatch> = [
  { id: "neutral", label: "Neutral", background: "oklch(0.11 0 0)", card: "oklch(0.14 0 0)", border: "oklch(0.22 0 0)", foreground: "oklch(0.93 0 0)" },
  { id: "indigo",  label: "Indigo",  background: "oklch(0.11 0.022 265)", card: "oklch(0.14 0.022 265)", border: "oklch(0.22 0.020 265)", foreground: "oklch(0.93 0 0)" },
  { id: "teal",    label: "Teal",    background: "oklch(0.11 0.022 200)", card: "oklch(0.14 0.022 200)", border: "oklch(0.22 0.020 200)", foreground: "oklch(0.93 0 0)" },
  { id: "violet",  label: "Violet",  background: "oklch(0.11 0.022 300)", card: "oklch(0.14 0.022 300)", border: "oklch(0.22 0.020 300)", foreground: "oklch(0.93 0 0)" },
];

const VALID: Tint[] = ["neutral", "indigo", "teal", "violet"];

function readTint(mode: Mode): Tint {
  if (typeof window === "undefined") return mode === "dark" ? "teal" : "neutral";
  try {
    const v = localStorage.getItem(`optionerd-tint-${mode}`);
    if (v && VALID.includes(v as Tint)) return v as Tint;
  } catch {}
  return mode === "dark" ? "teal" : "neutral";
}

function TintGrid({
  mode,
  swatches,
  selected,
  onPick,
}: {
  mode: Mode;
  swatches: ReadonlyArray<TintSwatch>;
  selected: Tint;
  onPick: (tint: Tint) => void;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {mode === "light" ? "Light mode" : "Dark mode"}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {swatches.map((t) => {
          const active = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className={`relative flex flex-col items-stretch gap-2 rounded-md border p-2 text-left transition-colors ${
                active ? "border-foreground" : "border-border hover:border-muted-foreground"
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
              <span className="font-mono text-[11px] text-foreground">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemeSelector() {
  const { resolvedTheme } = useTheme();
  const [lightTint, setLightTint] = useState<Tint>("neutral");
  const [darkTint, setDarkTint] = useState<Tint>("teal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLightTint(readTint("light"));
    setDarkTint(readTint("dark"));
    setMounted(true);
  }, []);

  function pick(mode: Mode, tint: Tint) {
    try {
      localStorage.setItem(`optionerd-tint-${mode}`, tint);
    } catch {}
    if (mode === "light") setLightTint(tint);
    else setDarkTint(tint);
    if (resolvedTheme === mode) {
      document.documentElement.dataset.tint = tint;
    }
  }

  return (
    <section className="mt-4 rounded-md border border-border bg-card p-4">
      <h2 className="font-mono text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">
        Themes
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        Pick a tint for each mode. The header toggle switches between them.
      </p>
      <div className="space-y-5">
        <TintGrid
          mode="light"
          swatches={LIGHT_TINTS}
          selected={mounted ? lightTint : "neutral"}
          onPick={(t) => pick("light", t)}
        />
        <TintGrid
          mode="dark"
          swatches={DARK_TINTS}
          selected={mounted ? darkTint : "teal"}
          onPick={(t) => pick("dark", t)}
        />
      </div>
    </section>
  );
}
