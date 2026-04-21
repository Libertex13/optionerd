import type { ScenarioConfig } from "./types";
import { bullCallSpreadScenarios } from "./bull-call-spread";
import { bearPutSpreadScenarios } from "./bear-put-spread";

const registry: Record<string, ScenarioConfig[]> = {
  "bull-call-spread": bullCallSpreadScenarios,
  "bear-put-spread": bearPutSpreadScenarios,
};

export function getScenariosForStrategy(slug: string): ScenarioConfig[] {
  return registry[slug] ?? [];
}
