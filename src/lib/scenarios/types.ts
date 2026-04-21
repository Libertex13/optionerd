export type MomentKind = "entry" | "adjust" | "exit" | "event" | "decay";

export type ScenarioLeg = {
  side: "long" | "short";
  type: "call" | "put";
  strike: number;
  expiry: string;
  qty: number;
};

export type DecisionPoint = {
  date: string;
  kind: MomentKind;
  title: string;
  /** Short label shown next to the numbered pill on the overview chart. */
  shortLabel?: string;
  summary: string;
  narrative: string;
  pivotal: boolean;
  decision?: { k: string; v: string };
  oneLine?: string;
};

export type ScenarioRetrospective = {
  verdict: string;
  realizedPL?: number;
  pctOfMax?: number;
  holdDays?: number;
  lessons: string[];
};

export type ScenarioConfig = {
  id: string;
  strategySlug: string;
  title: string;
  subtitle: string;
  ticker: string;
  from: string;
  to: string;
  /** Underlying chart window. Defaults to [from, to] if omitted. */
  contextFrom?: string;
  contextTo?: string;
  legs: ScenarioLeg[];
  decisions: DecisionPoint[];
  retrospective: ScenarioRetrospective;
};

export type ScenarioCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ScenarioLegPrice = {
  date: string;
  close: number;
  volume: number;
};

export type ScenarioData = {
  config: ScenarioConfig;
  underlying: ScenarioCandle[];
  legPrices: ScenarioLegPrice[][];
  source: "massive-historical";
};
