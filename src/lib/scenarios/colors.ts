/**
 * Scenario accent color — single source of truth lives in
 * `globals.css` as `--scenario-accent` (different hue per theme).
 * Use these helpers when you need the raw color in canvas/SVG-land
 * (lightweight-charts, recharts) where Tailwind classes don't apply.
 *
 * For Tailwind, use `bg-scenario-accent` / `text-scenario-accent` /
 * `border-scenario-accent` (with `/85`, `/40` etc opacity modifiers).
 */

const SSR_FALLBACK = "#1d4ed8"; // blue-700, matches :root default

/** Reads the current value of `--scenario-accent` from the document root. */
export function readScenarioAccent(): string {
  if (typeof window === "undefined") return SSR_FALLBACK;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--scenario-accent")
    .trim();
  return v || SSR_FALLBACK;
}

/** Returns the accent in `rgba(r, g, b, alpha)` form. Accepts either hex or
 *  any color string parseable by the browser via a temporary element. */
export function readScenarioAccentRgba(alpha: number): string {
  const raw = readScenarioAccent();
  // Fast path for hex (#rrggbb)
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    const r = parseInt(raw.slice(1, 3), 16);
    const g = parseInt(raw.slice(3, 5), 16);
    const b = parseInt(raw.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  // Fallback: let the browser resolve via a temporary element
  if (typeof document === "undefined") return raw;
  const el = document.createElement("span");
  el.style.color = raw;
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color; // "rgb(r, g, b)" or "rgba(...)"
  el.remove();
  const m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return raw;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}
