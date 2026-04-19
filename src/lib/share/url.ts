import { encodeStrategy, type SharedStrategy } from "./encode";
import { detectStrategySlug } from "@/lib/strategies/detect";

/**
 * Build a shareable URL for a strategy. Routes to the detected
 * /calculator/[strategy] page when possible (for SEO/traffic to
 * indexed pages) and falls back to the home builder otherwise.
 */
export function buildShareUrl(
  state: SharedStrategy,
  origin?: string,
): string {
  const slug = detectStrategySlug(state.legs, state.stockLeg);
  const path = slug ? `/calculator/${slug}` : "/";
  const encoded = encodeStrategy(state);
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${path}?s=${encoded}`;
}
