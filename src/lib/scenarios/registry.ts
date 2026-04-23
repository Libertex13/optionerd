import type { ScenarioConfig } from "./types";
import { bullCallSpreadScenarios } from "./bull-call-spread";
import { bearPutSpreadScenarios } from "./bear-put-spread";
import { longCallScenarios } from "./long-call";
import { longPutScenarios } from "./long-put";
import { coveredCallScenarios } from "./covered-call";
import { bullPutSpreadScenarios } from "./bull-put-spread";
import { bearCallSpreadScenarios } from "./bear-call-spread";
import { longStraddleScenarios } from "./long-straddle";
import { longStrangleScenarios } from "./long-strangle";
import { shortStrangleScenarios } from "./short-strangle";
import { ironCondorScenarios } from "./iron-condor";
import { ironButterflyScenarios } from "./iron-butterfly";
import { callButterflyScenarios } from "./call-butterfly";

const registry: Record<string, ScenarioConfig[]> = {
  "long-call": longCallScenarios,
  "long-put": longPutScenarios,
  "covered-call": coveredCallScenarios,
  "bull-call-spread": bullCallSpreadScenarios,
  "bear-put-spread": bearPutSpreadScenarios,
  "bull-put-spread": bullPutSpreadScenarios,
  "bear-call-spread": bearCallSpreadScenarios,
  "long-straddle": longStraddleScenarios,
  "long-strangle": longStrangleScenarios,
  "short-strangle": shortStrangleScenarios,
  "iron-condor": ironCondorScenarios,
  "iron-butterfly": ironButterflyScenarios,
  "call-butterfly": callButterflyScenarios,
};

export function getScenariosForStrategy(slug: string): ScenarioConfig[] {
  return registry[slug] ?? [];
}
