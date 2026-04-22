import type {
  LegMark,
  PortfolioLeg,
  PortfolioPosition,
  Scenario,
} from "./types";

export type { LegMark };

export function cumulativeNormal(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const xAbs = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + p * xAbs);
  const y =
    1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-xAbs * xAbs);
  return 0.5 * (1 + sign * y);
}

export function normalPdf(x: number): number {
  return Math.exp(-(x * x) / 2) / Math.sqrt(2 * Math.PI);
}

export function blackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  iv: number,
  type: "call" | "put",
): number {
  if (T <= 0) {
    return type === "call" ? Math.max(S - K, 0) : Math.max(K - S, 0);
  }
  const d1 = (Math.log(S / K) + (r + (iv * iv) / 2) * T) / (iv * Math.sqrt(T));
  const d2 = d1 - iv * Math.sqrt(T);
  if (type === "call") {
    return S * cumulativeNormal(d1) - K * Math.exp(-r * T) * cumulativeNormal(d2);
  }
  return K * Math.exp(-r * T) * cumulativeNormal(-d2) - S * cumulativeNormal(-d1);
}

export function payoffAtExpiry(legs: PortfolioLeg[], S: number): number {
  return legs.reduce((acc, l) => {
    const intr = l.t === "call" ? Math.max(S - l.k, 0) : Math.max(l.k - S, 0);
    const mult = (l.s === "long" ? 1 : -1) * (l.q || 1);
    return acc + (intr - l.p) * mult * 100;
  }, 0);
}

export function mtm(legs: PortfolioLeg[], S: number, T: number, iv = 0.28): number {
  return legs.reduce((acc, l) => {
    const v = blackScholes(S, l.k, T, 0.045, iv, l.t);
    const mult = (l.s === "long" ? 1 : -1) * (l.q || 1);
    return acc + (v - l.p) * mult * 100;
  }, 0);
}

export function markLeg(
  l: PortfolioLeg,
  S: number,
  now: Date = new Date(),
  r = 0.045,
): LegMark {
  const expMs = new Date(l.exp).getTime();
  const dte = Math.max(
    0,
    Math.round((expMs - now.getTime()) / 86_400_000),
  );
  const T = Math.max(dte / 365, 1 / 365);
  const iv = l.iv && l.iv > 0 ? l.iv : 0.28;
  const value = blackScholes(S, l.k, T, r, iv, l.t);
  const sign = l.s === "long" ? 1 : -1;
  const mult = sign * l.q * 100;

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / l.k) + (r + (iv * iv) / 2) * T) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;
  const pdf = normalPdf(d1);
  const deltaShare =
    l.t === "call" ? cumulativeNormal(d1) : cumulativeNormal(d1) - 1;
  const gammaShare = pdf / (S * iv * sqrtT);
  const thetaYear =
    l.t === "call"
      ? -(S * pdf * iv) / (2 * sqrtT) -
        r * l.k * Math.exp(-r * T) * cumulativeNormal(d2)
      : -(S * pdf * iv) / (2 * sqrtT) +
        r * l.k * Math.exp(-r * T) * cumulativeNormal(-d2);
  const vegaShare = S * pdf * sqrtT;

  return {
    dte,
    value,
    pnl: (value - l.p) * mult,
    delta: deltaShare * mult,
    gamma: gammaShare * mult,
    theta: (thetaYear / 365) * mult,
    vega: (vegaShare / 100) * mult,
  };
}

export interface PositionMark {
  marks: LegMark[];
  pnl: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export function markPosition(
  legs: PortfolioLeg[],
  S: number,
  now: Date = new Date(),
  r = 0.045,
): PositionMark {
  const marks = legs.map((l) => markLeg(l, S, now, r));
  const acc = marks.reduce(
    (a, m) => ({
      pnl: a.pnl + m.pnl,
      delta: a.delta + m.delta,
      gamma: a.gamma + m.gamma,
      theta: a.theta + m.theta,
      vega: a.vega + m.vega,
    }),
    { pnl: 0, delta: 0, gamma: 0, theta: 0, vega: 0 },
  );
  return { marks, ...acc };
}

export interface ScenarioResult {
  newPx: number;
  newValue: number;
  delta: number;
}

/**
 * Apply a scenario to a position, returning the expected value and delta from
 * the position's current P/L.
 */
export function applyScenario(
  pos: PortfolioPosition,
  scn: Scenario,
): ScenarioResult {
  const rule = scn.underlying_shocks?.[pos.ticker] ?? scn.default_shock ?? null;

  let newPx = pos.px;
  if (rule && rule.mode === "pct") newPx = pos.px * (1 + rule.val / 100);
  else if (rule && rule.mode === "abs") newPx = rule.val;

  const ivMult = scn.iv_shock?.mode === "mult" ? scn.iv_shock.val : 1;
  const iv = 0.28 * ivMult;

  const daysLeft = Math.max(0, pos.dte - (scn.advance_days ?? 0));
  const T = Math.max(daysLeft / 365, 1 / 365);
  const newValue = mtm(pos.legs, newPx, T, iv);
  return { newPx, newValue, delta: newValue - pos.pnl };
}

export function fmtDollar(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return sign + "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtPct(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1) + "%";
}

export function heatColor(value: number, maxAbs: number): string {
  if (maxAbs === 0 || value === 0) return "var(--muted)";
  const t = Math.min(Math.abs(value) / maxAbs, 1);
  if (value > 0) {
    const s = 45 + t * 25;
    const l = 82 - t * 47;
    return `hsl(142, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
  }
  const s = 45 + t * 27;
  const l = 85 - t * 47;
  return `hsl(0, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
}

export function heatTextColor(value: number, maxAbs: number): string {
  if (maxAbs === 0 || value === 0) return "var(--foreground)";
  const t = Math.min(Math.abs(value) / maxAbs, 1);
  return t > 0.25 ? "white" : "#1f2937";
}

export function maxProfitLabel(p: PortfolioPosition): string {
  const net = p.net;
  if (p.strat === "iron-condor" || p.strat === "bull-put" || p.strat === "bear-call") {
    return "+$" + Math.abs(net);
  }
  if (
    p.strat === "long-call" ||
    p.strat === "long-straddle" ||
    p.strat === "short-call" ||
    p.strat === "short-put"
  ) {
    return "Unlimited";
  }
  return "+$" + Math.abs(p.cost);
}

export function maxLossLabel(p: PortfolioPosition): string {
  if (p.strat === "iron-condor") return "−$" + p.cost;
  if (p.strat === "strangle" || p.strat === "short-straddle") return "Unlimited";
  return "−$" + p.cost;
}

export function breakevenLabel(p: PortfolioPosition): string {
  if (!p.px || p.legs.length === 0) return "—";
  if (p.strat === "iron-condor")
    return "$" + (p.px - 6).toFixed(2) + " · $" + (p.px + 6).toFixed(2);
  if (p.strat === "long-call")
    return "$" + (p.legs[0].k + p.legs[0].p).toFixed(2);
  if (p.strat === "long-straddle")
    return "$" + (p.px - 20).toFixed(2) + " · $" + (p.px + 20).toFixed(2);
  return "$" + p.px.toFixed(2);
}

export function popLabel(p: PortfolioPosition): string {
  const pops = [64, 38, 72, 54, 71, 73, 42, 60];
  const seed = p.id.length > 1 ? p.id.charCodeAt(1) : 0;
  return pops[Math.abs(seed) % 8] + "%";
}
