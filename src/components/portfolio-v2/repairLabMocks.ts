/**
 * MOCK AI-GENERATED COPY FOR THE REPAIR LAB
 *
 * Everything in this file is placeholder text that will eventually be produced
 * by the LLM narrator (see NerdNarrator). It is collected here so it is easy
 * to delete in one shot once the narrator is wired up. Each export is
 * documented with what real data should drive the eventual generation.
 *
 * IMPORTANT: nothing in this file should be displayed without the
 * `MOCK` flag in the UI badge ('mock · explained later').
 */

import type { RepairCandidate, TickerCampaign } from "@/lib/portfolio/repair";

export interface NerdInsight {
  tone: "crit" | "warn" | "good" | "info";
  title: string;
  body: string;
}

export interface ChangeItem {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "muted";
}

/**
 * Hero narration that sits in the big speech bubble at the top.
 * Real generation: takes the campaign list + candidate list and produces a
 * 2-3 sentence summary highlighting the worst position and the best repair.
 */
export function mockHeroNarration(
  campaigns: TickerCampaign[],
  candidates: RepairCandidate[],
): { worst: TickerCampaign | null; topPick: RepairCandidate | null; text: string } {
  const worst = [...campaigns]
    .filter((c) => c.openPositions.length > 0)
    .sort((a, b) => a.openPnl - b.openPnl)[0] ?? null;
  const topPick = candidates[0] ?? null;

  if (!worst || !topPick) {
    return {
      worst,
      topPick,
      text:
        "Your book is quiet. No deterministic adjustments scored above the threshold today — check back after the next chain refresh.",
    };
  }

  const verbiage =
    `Your worst-positioned campaign is ${worst.ticker} at ${formatMoney(worst.openPnl)} ` +
    `with ${worst.nextExpiryDte ?? "—"} days to its nearest expiry. ` +
    `I found ${candidates.length} deterministic adjustment${candidates.length === 1 ? "" : "s"} — ` +
    `the strongest one (${topPick.ticker} ${topPick.title.toLowerCase()}) banks ` +
    `${formatMoney(topPick.netDebitCredit)} net credit. Lead with that one.`;

  return { worst, topPick, text: verbiage };
}

/**
 * 3–4 short bullet-style insights for the right rail.
 * Real generation: scan candidate scores + Greeks + DTE buckets and surface the
 * most actionable observations.
 */
export function mockNerdInsights(
  candidates: RepairCandidate[],
  campaigns: TickerCampaign[],
): NerdInsight[] {
  const items: NerdInsight[] = [];
  const worst = [...campaigns].sort((a, b) => a.openPnl - b.openPnl)[0];
  const top = candidates[0];
  const harvest = candidates.find((c) => c.family === "harvest-reset");

  if (worst && worst.openPnl < 0 && worst.nextExpiryDte != null && worst.nextExpiryDte <= 14) {
    items.push({
      tone: "crit",
      title: `${worst.ticker} expiry pressure is climbing.`,
      body: `${worst.openPositions.length} open leg${worst.openPositions.length === 1 ? "" : "s"} ` +
        `${worst.nextExpiryDte}d from expiry at ${formatMoney(worst.openPnl)} open. ` +
        `Roll candidates score highest right now — defer the dated exposure first.`,
    });
  }

  if (top) {
    items.push({
      tone: "good",
      title: `${top.ticker} ${top.title.toLowerCase()} tops the score.`,
      body: `${formatMoney(top.netDebitCredit)} net credit · score ${top.score.toFixed(1)}. ` +
        `Caps remaining theta drag and improves the stress floor.`,
    });
  }

  if (harvest && harvest !== top) {
    items.push({
      tone: "warn",
      title: `${harvest.ticker} long has a cheaper replacement.`,
      body: `Harvest-reset banks ${formatMoney(harvest.netDebitCredit)} while keeping the directional bias.`,
    });
  }

  items.push({
    tone: "info",
    title: "No earnings inside the danger window.",
    body:
      "None of the next-14d expiries overlap a known earnings event for these tickers. " +
      "Repairs are not exposed to event vol.",
  });

  return items;
}

/**
 * "What changed in the last 24h" feed.
 * Real generation: diff today's snapshot vs yesterday's persisted snapshot.
 */
export function mockChangeFeed(): ChangeItem[] {
  // Real diff (today vs yesterday snapshot) not connected yet — return empty
  // so the rail card hides instead of showing placeholder text.
  return [];
}

/**
 * Per-candidate "why this one" copy that lives in the detail rail.
 * Real generation: highlights the score's biggest driver and the trade-off.
 */
export function mockWhyThisOne(candidate: RepairCandidate): string {
  const credit = candidate.netDebitCredit;
  const stress = candidate.stressPnlDelta;
  const sign = (n: number) => (n >= 0 ? "lifts" : "drops");
  const tradeoff = candidate.warnings[0] ?? "Caps a portion of the upside in exchange for the credit.";

  if (credit > 0 && stress > 0) {
    return (
      `This trade banks ${formatMoney(credit)} right now and your ${candidate.stressLabel.toLowerCase()} ` +
      `floor ${sign(stress)} by ${formatMoney(Math.abs(stress))}. ${tradeoff}`
    );
  }
  if (credit > 0) {
    return (
      `Banks ${formatMoney(credit)} of premium today. Stress P/L ${sign(stress)} by ` +
      `${formatMoney(Math.abs(stress))}. ${tradeoff}`
    );
  }
  return (
    `Costs ${formatMoney(Math.abs(credit))} of debit but improves the stress profile by ` +
    `${formatMoney(Math.abs(stress))}. ${tradeoff}`
  );
}

function formatMoney(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
}
