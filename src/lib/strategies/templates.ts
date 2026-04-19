import type { OptionType, PositionType } from "@/types/options";

/** A pre-configured leg for a strategy template */
export interface TemplateLeg {
  side: PositionType;
  type: OptionType;
  /** Strike offset from ATM in dollars (positive = OTM call / ITM put, negative = ITM call / OTM put) */
  strikeOffset: number;
  quantity: number;
}

export interface StrategyTemplate {
  slug: string;
  label: string;
  legs: TemplateLeg[];
  includeStock: boolean;
  sentiment: "bullish" | "bearish" | "neutral" | "volatile";
  complexity: number; // 1-4
  shape: string; // payoff shape id for mini-chart
  /** Short leg description for picker cards */
  legDescription: string;
}

export const strategyTemplates: Record<string, StrategyTemplate> = {
  "long-call": {
    slug: "long-call",
    label: "Long Call",
    legs: [{ side: "long", type: "call", strikeOffset: 5, quantity: 1 }],
    includeStock: false,
    sentiment: "bullish",
    complexity: 1,
    shape: "hockeyup",
    legDescription: "+1 C",
  },
  "long-put": {
    slug: "long-put",
    label: "Long Put",
    legs: [{ side: "long", type: "put", strikeOffset: -5, quantity: 1 }],
    includeStock: false,
    sentiment: "bearish",
    complexity: 1,
    shape: "hockeydown",
    legDescription: "+1 P",
  },
  "bull-call-spread": {
    slug: "bull-call-spread",
    label: "Bull Call Spread",
    legs: [
      { side: "long", type: "call", strikeOffset: 0, quantity: 1 },
      { side: "short", type: "call", strikeOffset: 10, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "bullish",
    complexity: 2,
    shape: "stepup",
    legDescription: "+1C / −1C",
  },
  "bull-put-spread": {
    slug: "bull-put-spread",
    label: "Bull Put Spread",
    legs: [
      { side: "short", type: "put", strikeOffset: 0, quantity: 1 },
      { side: "long", type: "put", strikeOffset: -5, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "bullish",
    complexity: 2,
    shape: "stepflat",
    legDescription: "−1P / +1P",
  },
  "bear-call-spread": {
    slug: "bear-call-spread",
    label: "Bear Call Spread",
    legs: [
      { side: "short", type: "call", strikeOffset: 0, quantity: 1 },
      { side: "long", type: "call", strikeOffset: 5, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "bearish",
    complexity: 2,
    shape: "stepflatd",
    legDescription: "−1C / +1C",
  },
  "bear-put-spread": {
    slug: "bear-put-spread",
    label: "Bear Put Spread",
    legs: [
      { side: "long", type: "put", strikeOffset: 5, quantity: 1 },
      { side: "short", type: "put", strikeOffset: -5, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "bearish",
    complexity: 2,
    shape: "stepdown",
    legDescription: "+1P / −1P",
  },
  "long-straddle": {
    slug: "long-straddle",
    label: "Long Straddle",
    legs: [
      { side: "long", type: "call", strikeOffset: 0, quantity: 1 },
      { side: "long", type: "put", strikeOffset: 0, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "volatile",
    complexity: 2,
    shape: "vee",
    legDescription: "+1P / +1C",
  },
  "long-strangle": {
    slug: "long-strangle",
    label: "Long Strangle",
    legs: [
      { side: "long", type: "call", strikeOffset: 5, quantity: 1 },
      { side: "long", type: "put", strikeOffset: -5, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "volatile",
    complexity: 2,
    shape: "vee",
    legDescription: "+1P / +1C (OTM)",
  },
  "short-strangle": {
    slug: "short-strangle",
    label: "Short Strangle",
    legs: [
      { side: "short", type: "call", strikeOffset: 10, quantity: 1 },
      { side: "short", type: "put", strikeOffset: -10, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "neutral",
    complexity: 2,
    shape: "wave",
    legDescription: "−1P / −1C",
  },
  "iron-condor": {
    slug: "iron-condor",
    label: "Iron Condor",
    legs: [
      { side: "long", type: "put", strikeOffset: -10, quantity: 1 },
      { side: "short", type: "put", strikeOffset: -5, quantity: 1 },
      { side: "short", type: "call", strikeOffset: 5, quantity: 1 },
      { side: "long", type: "call", strikeOffset: 10, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "neutral",
    complexity: 3,
    shape: "tent",
    legDescription: "+1P / −1P / −1C / +1C",
  },
  "iron-butterfly": {
    slug: "iron-butterfly",
    label: "Iron Butterfly",
    legs: [
      { side: "long", type: "put", strikeOffset: -5, quantity: 1 },
      { side: "short", type: "put", strikeOffset: 0, quantity: 1 },
      { side: "short", type: "call", strikeOffset: 0, quantity: 1 },
      { side: "long", type: "call", strikeOffset: 5, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "neutral",
    complexity: 3,
    shape: "pyramid",
    legDescription: "+1P / −1P / −1C / +1C",
  },
  "call-butterfly": {
    slug: "call-butterfly",
    label: "Long Call Butterfly",
    legs: [
      { side: "long", type: "call", strikeOffset: -5, quantity: 1 },
      { side: "short", type: "call", strikeOffset: 0, quantity: 2 },
      { side: "long", type: "call", strikeOffset: 5, quantity: 1 },
    ],
    includeStock: false,
    sentiment: "neutral",
    complexity: 3,
    shape: "spike",
    legDescription: "+1C / −2C / +1C",
  },
  "covered-call": {
    slug: "covered-call",
    label: "Covered Call",
    legs: [{ side: "short", type: "call", strikeOffset: 5, quantity: 1 }],
    includeStock: true,
    sentiment: "neutral",
    complexity: 1,
    shape: "slopecap",
    legDescription: "+100 shares / −1C",
  },
};

export const templateOrder = [
  "long-call",
  "long-put",
  "bull-call-spread",
  "bull-put-spread",
  "bear-call-spread",
  "bear-put-spread",
  "long-straddle",
  "long-strangle",
  "short-strangle",
  "iron-condor",
  "iron-butterfly",
  "call-butterfly",
  "covered-call",
];

/** Market view for the strategy picker */
export interface MarketView {
  id: "bullish" | "bearish" | "neutral" | "volatile";
  label: string;
  hint: string;
  tag: string;
  shape: string;
}

export const marketViews: MarketView[] = [
  { id: "bullish", label: "Bullish", hint: "Expecting the stock to rise", tag: "\u2197", shape: "up" },
  { id: "bearish", label: "Bearish", hint: "Expecting the stock to decline", tag: "\u2198", shape: "down" },
  { id: "neutral", label: "Range-bound", hint: "Sideways, stays in a channel", tag: "\u2192", shape: "flat" },
  { id: "volatile", label: "Big move, either way", hint: "Earnings, FDA, binary event", tag: "\u2195", shape: "vol" },
];

/** Strategies suggested for each market view, ordered by fit */
export interface PickerStrategy {
  templateSlug: string;
  match: "high" | "med" | "low";
  undefinedRisk?: boolean;
}

export const pickerStrategies: Record<string, PickerStrategy[]> = {
  bullish: [
    { templateSlug: "long-call", match: "high" },
    { templateSlug: "bull-call-spread", match: "high" },
    { templateSlug: "bull-put-spread", match: "high" },
    { templateSlug: "covered-call", match: "med" },
  ],
  bearish: [
    { templateSlug: "long-put", match: "high" },
    { templateSlug: "bear-put-spread", match: "high" },
    { templateSlug: "bear-call-spread", match: "high" },
  ],
  neutral: [
    { templateSlug: "iron-condor", match: "high" },
    { templateSlug: "iron-butterfly", match: "med" },
    { templateSlug: "short-strangle", match: "med", undefinedRisk: true },
    { templateSlug: "call-butterfly", match: "med" },
    { templateSlug: "covered-call", match: "med" },
  ],
  volatile: [
    { templateSlug: "long-straddle", match: "high" },
    { templateSlug: "long-strangle", match: "high" },
  ],
};
