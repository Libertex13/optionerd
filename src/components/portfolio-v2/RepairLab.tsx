"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import css from "./repairLab.module.css";
import type { OptionChain } from "@/types/market";
import type { PortfolioLeg, PortfolioPosition } from "@/lib/portfolio/types";
import { markPosition, payoffAtExpiry } from "@/lib/portfolio/pricing";
import {
  buildTickerCampaigns,
  generateRepairCandidates,
  type RepairCandidate,
  type RepairFamily,
  type TickerCampaign,
} from "@/lib/portfolio/repair";
import { buildPortfolioPositionUrl } from "@/lib/portfolio/share";
import {
  mockHeroNarration,
  mockNerdInsights,
  mockChangeFeed,
  mockWhyThisOne,
} from "./repairLabMocks";
import { useAiNarration } from "@/hooks/useAiNarration";

// Brand mark — kept inline so the speech-bubble layout stays self-contained.
const NERD_SVG_PATH =
  "M433.81,123.63c-4.08-16.5-19.32-54.85-73.94-65.42,0,0-92.27-87.21-223.65-48.14-78.83,23.44-102.44,11.82-108.72-1.22-1.41-2.93-5.8-2.19-6.44,1-4.49,22.34-4.16,58.62,37.58,76.67,0,0-99.1,65.69-39.64,173.85l7.83-14.76v.85h37.54c-.78,4.76-1.06,9.69-.78,14.72,1.91,34.34,30.26,62.26,64.63,63.66,31.18,1.28,57.92-18.73,66.99-46.65,1.98-6.1,7.47-10.37,13.88-10.37h1.89c6.23,0,11.57,4.16,13.47,10.1,8.72,27.21,34.19,46.98,64.26,46.98,38.52,0,69.61-32.4,67.45-71.38-.13-2.39-.42-4.74-.8-7.06h24c4.24,5.46,8.55,10.22,12.83,13.91,0,0,54.87-51.53,7.9-140.44l27.97,9.01c3.34,1.08,6.6-1.91,5.76-5.32ZM71.49,225.51h-33.67c12.59-19.87,55.49-74.23,145.19-68.2,0,0-42.83,45.3-41.13,45.3,0,0,.04,0,.05,0l-7.44,8.28v-20.92c-1.15-.06-2.29-.18-3.46-.18-25.74,0-48.14,14.48-59.54,35.7ZM131.04,303.95c-25.69,0-46.6-20.9-46.6-46.6s20.9-46.6,46.6-46.6,46.59,20.9,46.59,46.6-20.9,46.6-46.59,46.6ZM288.72,303.95c-25.69,0-46.59-20.9-46.59-46.6s20.9-46.6,46.59-46.6,46.6,20.9,46.6,46.6-20.9,46.6-46.6,46.6ZM348.13,225.51c-11.07-20.39-32.3-34.65-56.59-35.65-34.93-1.43-64.27,23.84-69.47,57.02h-24.31c-2.67-17.08-11.79-32.03-24.74-42.35,40.42.19,110.71-8.01,152.36-62.51,0,0,17.65,46.76,39.8,83.49h-17.04Z";

function NerdSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 433.95 324.91" fill="currentColor" aria-hidden="true">
      <path d={NERD_SVG_PATH} />
      <circle cx="131.03" cy="257.36" r="16.1" />
      <circle cx="288.72" cy="257.36" r="16.1" />
    </svg>
  );
}

function money(n: number, opts: { decimals?: number; signed?: boolean } = {}): string {
  const { decimals = 0, signed = true } = opts;
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (!signed) return `$${formatted}`;
  const sign = n >= 0 ? "+" : "−";
  return `${sign}$${formatted}`;
}

function formatStrike(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(2);
}

function familyLabel(family: RepairFamily): string {
  if (family === "roll-short") return "ROLL";
  if (family === "verticalize") return "VERTICAL";
  return "HARVEST";
}

function dteFromExpiry(expIso: string, now = Date.now()): number {
  const ts = new Date(`${expIso}T16:00:00Z`).getTime();
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, Math.round((ts - now) / 86_400_000));
}

interface ExpiryBucket {
  exp: string;
  dte: number;
  positions: PortfolioPosition[];
  ticker: string;
  stressDelta: number;
  baseStressPnl: number;
}

function buildExpiryBuckets(positions: PortfolioPosition[]): ExpiryBucket[] {
  const buckets = new Map<string, ExpiryBucket>();
  for (const pos of positions) {
    if (pos.state === "closed" || pos.state === "watching") continue;
    const dirSign = pos.greeks.delta >= 0 ? -1 : 1;
    const stressPx = pos.px * (1 + dirSign * 0.05);
    const baseStressPnl = markPosition(pos.legs, stressPx, pos.stockLeg).pnl;
    for (const leg of pos.legs) {
      const dte = dteFromExpiry(leg.exp);
      const key = `${pos.ticker}:${leg.exp}`;
      const existing = buckets.get(key);
      if (existing) {
        if (!existing.positions.includes(pos)) {
          existing.positions.push(pos);
          existing.stressDelta += baseStressPnl - pos.pnl;
          existing.baseStressPnl += baseStressPnl;
        }
      } else {
        buckets.set(key, {
          exp: leg.exp,
          dte,
          positions: [pos],
          ticker: pos.ticker,
          stressDelta: baseStressPnl - pos.pnl,
          baseStressPnl,
        });
      }
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.dte - b.dte);
}

interface CampaignRowData {
  campaign: TickerCampaign;
  stressPnl: number;
  bestFixCredit: number;
  candidateCount: number;
}

function buildCampaignRows(
  campaigns: TickerCampaign[],
  candidates: RepairCandidate[],
): CampaignRowData[] {
  const byTicker = new Map<string, RepairCandidate[]>();
  for (const c of candidates) {
    const list = byTicker.get(c.ticker) ?? [];
    list.push(c);
    byTicker.set(c.ticker, list);
  }
  return campaigns
    .filter((c) => c.openPositions.length > 0)
    .map((campaign) => {
      const stressPnl = campaign.openPositions.reduce((sum, pos) => {
        const dirSign = pos.greeks.delta >= 0 ? -1 : 1;
        return sum + markPosition(pos.legs, pos.px * (1 + dirSign * 0.05), pos.stockLeg).pnl;
      }, 0);
      const cands = byTicker.get(campaign.ticker) ?? [];
      const bestFix = cands.reduce(
        (best, c) => (c.netDebitCredit > best ? c.netDebitCredit : best),
        0,
      );
      return {
        campaign,
        stressPnl,
        bestFixCredit: bestFix,
        candidateCount: cands.length,
      };
    })
    .sort((a, b) => a.campaign.openPnl - b.campaign.openPnl);
}

interface PriceTargetRow {
  S: number;
  movePct: number;
  before: number;
  after: number;
  delta: number;
  isNow: boolean;
  label?: string;
}

function buildPriceTargetTable(
  position: PortfolioPosition,
  candidate: RepairCandidate,
  expiry: string,
): PriceTargetRow[] {
  const spot = position.px;
  if (spot <= 0) return [];
  const targets: number[] = [
    spot * 0.92,
    spot * 0.97,
    spot,
    spot * 1.03,
    spot * 1.08,
    spot * 1.15,
  ];
  // Add candidate strikes if present
  for (const leg of candidate.draftLegs) {
    if (leg.exp === expiry) targets.push(leg.k);
  }
  for (const leg of position.legs) {
    if (leg.exp === expiry) targets.push(leg.k);
  }
  const unique = Array.from(new Set(targets.map((t) => Math.round(t * 100) / 100)))
    .sort((a, b) => a - b);

  return unique.map((S) => {
    const before = payoffAtExpiry(position.legs, S, position.stockLeg);
    const after = payoffAtExpiry(candidate.draftLegs, S, position.stockLeg);
    return {
      S,
      movePct: ((S - spot) / spot) * 100,
      before,
      after,
      delta: after - before,
      isNow: Math.abs(S - spot) < 0.01,
      label: Math.abs(S - spot) < 0.01 ? "spot · now" : undefined,
    };
  });
}

function pickPayoffExpiry(position: PortfolioPosition, candidate: RepairCandidate): string {
  const all = [...position.legs, ...candidate.draftLegs];
  return all
    .map((l) => l.exp)
    .sort()
    .reverse()[0] ?? new Date().toISOString().slice(0, 10);
}

interface Tone {
  green: boolean;
  red: boolean;
}
function tone(n: number): Tone {
  return { green: n > 0, red: n < 0 };
}

// =========================================================================
// HERO BAND
// =========================================================================
function HeroBand({
  campaigns,
  candidates,
  refreshedSecondsAgo,
  totalLive,
  totalPositions,
}: {
  campaigns: TickerCampaign[];
  candidates: RepairCandidate[];
  refreshedSecondsAgo: number | null;
  totalLive: number;
  totalPositions: number;
}) {
  const narration = useMemo(
    () => mockHeroNarration(campaigns, candidates),
    [campaigns, candidates],
  );

  const heroFacts = useMemo(
    () => ({
      worstTicker: narration.worst?.ticker ?? null,
      worstOpenPnl: narration.worst?.openPnl ?? null,
      worstNextExpiryDte: narration.worst?.nextExpiryDte ?? null,
      worstOpenLegCount: narration.worst?.openPositions.length ?? 0,
      candidateCount: candidates.length,
      topPickTicker: narration.topPick?.ticker ?? null,
      topPickTitle: narration.topPick?.title ?? null,
      topPickFamily: narration.topPick?.family ?? null,
      topPickNetCredit: narration.topPick?.netDebitCredit ?? null,
      topPickScore: narration.topPick?.score ?? null,
    }),
    [narration, candidates],
  );

  const heroSignature = JSON.stringify(heroFacts);
  const heroAi = useAiNarration({
    kind: "hero",
    signature: heroSignature,
    facts: heroFacts,
    fallback: narration.text,
  });

  return (
    <div className={css.hero}>
      <div className={css.heroStage}>
        <NerdSvg />
      </div>
      <div className={css.heroTalk}>
        <div className={css.heroBubble}>
          <span style={{ display: "block" }}>{heroAi.text}</span>
          <div className={css.heroSig}>
            <span className={css.heroSigPulse} />
            updated from delayed marks ·
            {refreshedSecondsAgo != null ? ` ${refreshedSecondsAgo}s ago ·` : ""}
            {` ${totalLive}/${totalPositions} positions priced`}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// KPI STRIP
// =========================================================================
function KpiStrip({
  positions,
  candidates,
}: {
  positions: PortfolioPosition[];
  candidates: RepairCandidate[];
}) {
  const open = positions.filter((p) => p.state !== "closed" && p.state !== "watching");
  const openPnl = open.reduce((sum, p) => sum + p.pnl, 0);
  const tickerCount = new Set(open.map((p) => p.ticker)).size;
  const closed = positions.filter((p) => p.state === "closed");
  const realised = closed.reduce((sum, p) => sum + p.pnl, 0);
  const realisedWinners = closed.filter((p) => p.pnl > 0).length;
  const credit = candidates.filter((c) => c.netDebitCredit >= 0).length;
  const debit = candidates.length - credit;
  const topFour = candidates.slice(0, 4);
  const recovery = topFour.reduce((sum, c) => sum + Math.max(0, c.stressPnlDelta), 0);

  return (
    <div className={css.kpis}>
      <div className={css.kpi}>
        <div className={css.kpiK}>Net open P/L</div>
        <div className={`${css.kpiV} ${openPnl >= 0 ? css.green : css.red}`.trim()}>
          {money(openPnl)}
        </div>
        <div className={css.kpiSub}>across {open.length} open · {tickerCount} ticker{tickerCount === 1 ? "" : "s"}</div>
      </div>
      <div className={css.kpi}>
        <div className={css.kpiK}>Realized closed</div>
        <div className={`${css.kpiV} ${realised >= 0 ? css.green : css.red}`.trim()}>
          {money(realised)}
        </div>
        <div className={css.kpiSub}>{realisedWinners} closed winner{realisedWinners === 1 ? "" : "s"}</div>
      </div>
      <div className={css.kpi}>
        <div className={css.kpiK}>Repairs available</div>
        <div className={css.kpiV}>{candidates.length}</div>
        <div className={css.kpiSub}>{credit} credit · {debit} debit</div>
      </div>
      <div className={css.kpi}>
        <div className={css.kpiK}>Best-case stress lift</div>
        <div className={`${css.kpiV} ${recovery >= 0 ? css.green : ""}`.trim()}>
          {money(recovery)}
        </div>
        <div className={css.kpiSub}>top {topFour.length} applied · ±5% stress</div>
      </div>
    </div>
  );
}

// =========================================================================
// RISK TIMELINE
// =========================================================================
function RiskTimeline({ buckets }: { buckets: ExpiryBucket[] }) {
  const horizonDays = 90;
  const visible = buckets.filter((b) => b.dte <= horizonDays);
  const inside14 = visible.filter((b) => b.dte <= 14).length;
  const critical = visible.filter((b) => b.stressDelta < -1500).length;
  const maxLoss = Math.min(0, ...visible.map((b) => b.stressDelta));
  const maxBarHeight = 76;

  const barHeight = (delta: number) => {
    if (maxLoss === 0) return 6;
    const ratio = delta / maxLoss; // 0..1 for losses
    return Math.max(6, Math.min(maxBarHeight, Math.abs(ratio) * maxBarHeight));
  };

  return (
    <>
      <div className={css.sitHd}>
        <h3>Risk timeline · next 90 days</h3>
        <div className={css.sitBadges}>
          {inside14 > 0 && (
            <span className={`${css.pill} ${css.pillAmber}`}>
              {inside14} expir{inside14 === 1 ? "y" : "ies"} inside 14d
            </span>
          )}
          {critical > 0 && (
            <span className={`${css.pill} ${css.pillRed}`}>
              {critical} critical
            </span>
          )}
          {visible.length === 0 && (
            <span className={css.pill}>no open expiries</span>
          )}
        </div>
      </div>
      <div className={css.timelineWrap}>
        <div className={css.tlHead}>
          <span>Stress P/L exposure if underlying moves ±5% by each expiry</span>
          <span>now · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
        <div className={css.tl}>
          <div className={css.tlAxis} />
          {visible.map((bucket) => {
            const leftPct = (bucket.dte / horizonDays) * 100;
            const h = barHeight(bucket.stressDelta);
            const isRed = bucket.stressDelta < -1500;
            const isOk = bucket.stressDelta >= 0;
            const flagClass = isRed
              ? css.flagRed
              : isOk
              ? css.flagGreen
              : "";
            const barClass = isRed
              ? ""
              : isOk
              ? css.barGood
              : css.barOk;
            const pnlSuffix = bucket.stressDelta < 0
              ? ` · ${money(bucket.stressDelta)}`
              : "";
            return (
              <div key={`${bucket.ticker}-${bucket.exp}`}>
                <div
                  className={`${css.tlBar} ${barClass}`.trim()}
                  style={{ left: `${leftPct}%`, height: `${h}px` }}
                />
                <div
                  className={`${css.tlFlag} ${flagClass}`.trim()}
                  style={{ left: `${leftPct}%`, bottom: `${h + 2}px` }}
                  title={`${bucket.ticker} ${bucket.exp}`}
                >
                  {bucket.ticker} · {bucket.dte}d{pnlSuffix}
                </div>
              </div>
            );
          })}
          {[0, 14, 30, 45, 60, 75, 90].map((d) => (
            <div key={d} className={css.tlTick} style={{ left: `${(d / horizonDays) * 100}%` }}>
              {d === 0 ? "today" : `+${d}d`}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// =========================================================================
// CAMPAIGN ROWS
// =========================================================================
function CampaignTable({
  rows,
  activeTicker,
  onSelect,
}: {
  rows: CampaignRowData[];
  activeTicker: string | null;
  onSelect: (ticker: string) => void;
}) {
  return (
    <>
      <div className={css.campHead}>
        <div>Campaign</div>
        <div>Net P/L</div>
        <div>Stress ±5%</div>
        <div>Time pressure</div>
        <div style={{ textAlign: "right" }}>Repairs</div>
        <div style={{ textAlign: "right" }}>Best fix</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 22, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>
          No active campaigns to repair.
        </div>
      ) : (
        rows.map(({ campaign, stressPnl, bestFixCredit, candidateCount }) => {
          const dte = campaign.nextExpiryDte;
          const pressurePct = dte == null ? 0 : Math.max(8, Math.min(100, ((90 - Math.min(dte, 90)) / 90) * 100));
          const pressureClass =
            dte != null && dte <= 14
              ? css.crit
              : dte != null && dte <= 30
              ? ""
              : css.ok;
          const isCrit = campaign.openPnl < -2000 && dte != null && dte <= 14;
          const isWarn = !isCrit && (campaign.openPnl < 0 || (dte != null && dte <= 14));
          const stressTone = stressPnl - campaign.openPnl;
          return (
            <button
              key={campaign.ticker}
              type="button"
              className={`${css.campRow} ${isCrit ? css.crit : isWarn ? css.warn : ""} ${activeTicker === campaign.ticker ? css.activeRow : ""}`.trim()}
              onClick={() => onSelect(campaign.ticker)}
            >
              <div>
                <div className={css.campTk}>{campaign.ticker} campaign</div>
                <div className={css.campSub}>
                  {campaign.openPositions.length} open · {campaign.closedPositions.length} closed
                  {dte != null ? ` · next ${dte}d` : ""}
                </div>
              </div>
              <div className={`${css.campPnl} ${campaign.openPnl >= 0 ? css.green : css.red}`.trim()}>
                {money(campaign.openPnl)}
                <span className="delta">open · realized {money(campaign.realizedPnl)}</span>
              </div>
              <div className={`${css.campPnl} ${stressPnl >= 0 ? css.green : css.red}`.trim()}>
                {money(stressPnl)}
                <span className="delta">{money(stressTone)} vs spot</span>
              </div>
              <div>
                <div className={css.gauge}>
                  <div
                    className={`${css.gaugeFill} ${pressureClass}`.trim()}
                    style={{ width: `${pressurePct}%` }}
                  />
                </div>
                <div className={css.campSub} style={{ marginTop: 4 }}>
                  {dte != null ? `${dte}d to nearest exp` : "no open exp"}
                </div>
              </div>
              <div className={css.repairsCount}>
                <strong>{candidateCount}</strong>
                {candidateCount === 1 ? "option" : "options"}
              </div>
              <div className={`${css.bestFix} ${candidateCount === 0 ? css.muted : ""}`.trim()}>
                {candidateCount > 0 ? `${money(bestFixCredit)} →` : "—"}
              </div>
            </button>
          );
        })
      )}
    </>
  );
}

// =========================================================================
// RIGHT RAIL
// =========================================================================
function NerdInsightsRail({
  candidates,
  campaigns,
}: {
  candidates: RepairCandidate[];
  campaigns: TickerCampaign[];
}) {
  const insights = useMemo(
    () => mockNerdInsights(candidates, campaigns),
    [candidates, campaigns],
  );
  const changes = useMemo(() => mockChangeFeed(), []);

  return (
    <div>
      <div className={css.railCard}>
        <div className={css.railHd}>
          <NerdSvg />
          <h4>Nerd insights</h4>
          <span className="sub" style={{ marginLeft: "auto", fontFamily: "var(--font-mono), monospace", fontSize: 10.5, color: "var(--muted-foreground)" }}>
            deterministic · explained
          </span>
        </div>
        <div className={css.railBody}>
          {insights.length === 0 && (
            <div style={{ color: "var(--muted-foreground)", fontSize: 12.5 }}>
              No insights yet.
            </div>
          )}
          {insights.map((insight, i) => (
            <div key={i} className={`${css.insight} ${css[insight.tone]}`.trim()}>
              <div className={css.insightIco}>
                {insight.tone === "crit" ? "!" : insight.tone === "good" ? "★" : insight.tone === "warn" ? "↻" : "i"}
              </div>
              <div className={css.insightBody}>
                <div className={css.insightTitle}>{insight.title}</div>
                <div className={css.insightDesc}>{insight.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {changes.length > 0 && (
        <div className={css.railCard}>
          <div className={css.railHd}>
            <h4>What changed</h4>
            <span className="sub" style={{ marginLeft: "auto", fontFamily: "var(--font-mono), monospace", fontSize: 10.5, color: "var(--muted-foreground)" }}>
              last 24h
            </span>
          </div>
          <div className={css.railBody}>
            {changes.map((c, i) => (
              <div key={i} className={css.changeRow}>
                <span>{c.label}</span>
                <span style={{ color: c.tone === "pos" ? "var(--rl-green, #22c55e)" : c.tone === "neg" ? "var(--rl-red, #ef4444)" : "var(--muted-foreground)" }}>
                  {c.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// CANDIDATE CARDS
// =========================================================================
function CandidateCard({
  candidate,
  position,
  isFeatured,
  isSelected,
  onSelect,
}: {
  candidate: RepairCandidate;
  position: PortfolioPosition;
  isFeatured: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const dte = position.legs[0] ? dteFromExpiry(position.legs[0].exp) : 0;
  const sourceLeg = position.legs[0];
  const sourceLabel = sourceLeg
    ? `${candidate.ticker} · ${sourceLeg.s === "long" ? "long" : "short"} ${formatStrike(sourceLeg.k)}${sourceLeg.t === "call" ? "C" : "P"} · ${dte} DTE`
    : candidate.ticker;

  // Score pips (5 max, fill based on score relative to 250)
  const filled = Math.max(1, Math.min(5, Math.round(candidate.score / 50)));
  const stressIsPos = candidate.stressPnlDelta >= 0;
  const stressLabel = candidate.stressLabel.toLowerCase().includes("+")
    ? "Now → +5% stress"
    : "Now → −5% stress";

  // Weight the "now" pane vs "stress" pane proportional to magnitudes
  const nowMag = Math.abs(candidate.currentPnlDelta);
  const stressMag = Math.abs(candidate.stressPnlDelta);
  const total = nowMag + stressMag || 1;
  const nowFlex = Math.max(0.18, Math.min(0.6, nowMag / total));

  return (
    <button
      type="button"
      className={`${css.opp} ${isFeatured ? css.featured : ""} ${isSelected ? css.selected : ""}`.trim()}
      onClick={onSelect}
    >
      <div className={css.oppHd}>
        <div className={css.oppTk}>{sourceLabel}</div>
        <div className={css.oppTitle}>{candidate.title}</div>
        <span className={css.oppFam}>{familyLabel(candidate.family)}</span>
      </div>
      <div className={css.oppCredit}>
        <span className="k">{candidate.netDebitCredit >= 0 ? "net credit" : "net debit"}</span>
        <span className={`v ${candidate.netDebitCredit >= 0 ? "green" : "red"}`}>
          {money(candidate.netDebitCredit)}
        </span>
      </div>
      <div className={css.oppStress}>
        <div className={css.microLabel}>{stressLabel}</div>
        <div className={css.stressBar}>
          <div className={css.now} style={{ flex: `0 0 ${(nowFlex * 100).toFixed(0)}%` }}>
            {money(candidate.currentPnlDelta)}
          </div>
          <div className={stressIsPos ? css.pos : css.neg} style={{ flex: 1 }}>
            {money(candidate.stressPnlDelta)}
          </div>
        </div>
      </div>
      <div className={css.oppFoot}>
        <span className={css.score}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={`${css.scorePip} ${i < filled ? "on" : ""}`} style={i < filled ? { background: "var(--rl-amber, #f59e0b)" } : undefined} />
          ))}
          {" "}score {candidate.score.toFixed(1)}
        </span>
        <span className={css.openDetail}>view detail →</span>
      </div>
    </button>
  );
}

// =========================================================================
// PAYOFF CHART (SVG)
// =========================================================================
function PayoffChart({
  position,
  candidate,
}: {
  position: PortfolioPosition;
  candidate: RepairCandidate;
}) {
  const W = 800;
  const H = 280;
  const P = { l: 56, r: 22, t: 18, b: 38 };
  const iw = W - P.l - P.r;
  const ih = H - P.t - P.b;

  const spot = position.px;
  const minX = spot * 0.85;
  const maxX = spot * 1.20;

  const pts = useMemo(() => {
    const arr: { x: number; before: number; after: number }[] = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const x = minX + ((maxX - minX) * i) / steps;
      const before = payoffAtExpiry(position.legs, x, position.stockLeg);
      const after = payoffAtExpiry(candidate.draftLegs, x, position.stockLeg);
      arr.push({ x, before, after });
    }
    return arr;
  }, [candidate, position, minX, maxX]);

  const allYs = pts.flatMap((p) => [p.before, p.after]);
  const yPad = (Math.max(...allYs) - Math.min(...allYs)) * 0.08 || 100;
  const yMin = Math.min(...allYs) - yPad;
  const yMax = Math.max(...allYs) + yPad;

  const xs = (x: number) => P.l + ((x - minX) / (maxX - minX)) * iw;
  const ys = (y: number) => P.t + (1 - (y - yMin) / (yMax - yMin)) * ih;

  const beforePath = pts.map((p, i) => `${i ? "L" : "M"}${xs(p.x).toFixed(1)} ${ys(p.before).toFixed(1)}`).join(" ");
  const afterPath = pts.map((p, i) => `${i ? "L" : "M"}${xs(p.x).toFixed(1)} ${ys(p.after).toFixed(1)}`).join(" ");
  const diffFill =
    pts.map((p, i) => `${i ? "L" : "M"}${xs(p.x).toFixed(1)} ${ys(p.after).toFixed(1)}`).join(" ") +
    " " +
    [...pts].reverse().map((p) => `L${xs(p.x).toFixed(1)} ${ys(p.before).toFixed(1)}`).join(" ") +
    " Z";

  const strikes = Array.from(
    new Set([
      ...position.legs.map((l) => l.k),
      ...candidate.draftLegs.map((l) => l.k),
    ]),
  ).sort((a, b) => a - b);

  return (
    <svg className={css.chartSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="rl-gainFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity=".22" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity=".04" />
        </linearGradient>
      </defs>
      <line x1={P.l} y1={ys(0)} x2={P.l + iw} y2={ys(0)} stroke="var(--muted-foreground)" strokeOpacity=".4" />
      {strikes
        .filter((k) => k >= minX && k <= maxX)
        .map((k) => (
          <line
            key={k}
            x1={xs(k)}
            y1={P.t}
            x2={xs(k)}
            y2={P.t + ih}
            stroke="var(--border)"
            strokeDasharray="2 3"
          />
        ))}
      <line
        x1={xs(spot)}
        y1={P.t}
        x2={xs(spot)}
        y2={P.t + ih}
        stroke="var(--rl-blue, #60a5fa)"
        strokeDasharray="3 4"
        strokeOpacity=".7"
      />
      <path d={diffFill} fill="url(#rl-gainFill)" />
      <path d={beforePath} stroke="var(--muted-foreground)" strokeWidth="1.6" strokeDasharray="4 4" fill="none" />
      <path d={afterPath} stroke="var(--rl-blue, #60a5fa)" strokeWidth="2.2" fill="none" />
      <text
        x={xs(spot)}
        y={P.t + 12}
        textAnchor="middle"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fill="var(--rl-blue, #60a5fa)"
      >
        spot ${spot.toFixed(2)}
      </text>
      {strikes
        .filter((k) => k >= minX && k <= maxX)
        .map((k) => (
          <text
            key={`lbl-${k}`}
            x={xs(k)}
            y={H - 12}
            textAnchor="middle"
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fill="var(--muted-foreground)"
          >
            ${formatStrike(k)}
          </text>
        ))}
    </svg>
  );
}

// =========================================================================
// DETAIL VIEW
// =========================================================================
function DetailView({
  candidate,
  position,
  alternates,
  onSelectAlternate,
  detailRef,
}: {
  candidate: RepairCandidate;
  position: PortfolioPosition;
  alternates: RepairCandidate[];
  onSelectAlternate: (c: RepairCandidate) => void;
  detailRef: React.RefObject<HTMLDivElement | null>;
}) {
  const expiry = pickPayoffExpiry(position, candidate);
  const ptRows = useMemo(
    () => buildPriceTargetTable(position, candidate, expiry),
    [candidate, position, expiry],
  );
  const beforeMark = useMemo(
    () => markPosition(position.legs, position.px, position.stockLeg),
    [position],
  );
  const afterMark = useMemo(
    () => markPosition(candidate.draftLegs, position.px, position.stockLeg),
    [candidate, position],
  );
  const stressRows = useMemo(() => {
    const pcts = [-10, -5, 0, 5, 10];
    return pcts.map((pct) => {
      const px = position.px * (1 + pct / 100);
      const before = markPosition(position.legs, px, position.stockLeg).pnl;
      const after = markPosition(candidate.draftLegs, px, position.stockLeg).pnl;
      return { pct, before, after };
    });
  }, [candidate, position]);

  const expDate = new Date(`${expiry}T16:00:00Z`);
  const expDte = dteFromExpiry(expiry);

  // Build leg rows from the diff
  const beforeKey = (l: PortfolioLeg) => `${l.s}|${l.t}|${l.k}|${l.exp}`;
  const beforeKeys = new Set(position.legs.map(beforeKey));
  const afterKeys = new Set(candidate.draftLegs.map(beforeKey));

  const draftUrl = buildPortfolioPositionUrl(position, candidate.draftLegs);

  const whyFacts = useMemo(
    () => ({
      ticker: candidate.ticker,
      family: candidate.family,
      title: candidate.title,
      netDebitCredit: candidate.netDebitCredit,
      stressLabel: candidate.stressLabel,
      stressPnlDelta: candidate.stressPnlDelta,
      currentPnlDelta: candidate.currentPnlDelta,
      score: candidate.score,
      warnings: candidate.warnings,
    }),
    [candidate],
  );
  const whyFallback = useMemo(() => mockWhyThisOne(candidate), [candidate]);
  const whyAi = useAiNarration({
    kind: "why-this-one",
    signature: candidate.id,
    facts: whyFacts,
    fallback: whyFallback,
  });

  return (
    <div className={css.detail} ref={detailRef}>
      <div className={css.detailHd}>
        <div>
          <div className={css.breadcrumb}>
            Repair Lab / Candidate /{" "}
            <strong style={{ color: "var(--foreground)" }}>
              {candidate.family}:{candidate.ticker}
            </strong>
          </div>
          <h2>{candidate.title}</h2>
          <div className={css.detailBadges}>
            <span className={css.pill}>{familyLabel(candidate.family)}</span>
            <span className={`${css.pill} ${candidate.netDebitCredit >= 0 ? css.pillGreen : css.pillRed}`.trim()}>
              {candidate.netDebitCredit >= 0 ? "CREDIT" : "DEBIT"}
            </span>
            <span className={`${css.pill} ${css.pillAmber}`}>
              SCORE {candidate.score.toFixed(1)}
            </span>
            <span className={`${css.pill} ${css.pillBlue}`}>
              expiry {expiry} · {expDte} DTE
            </span>
          </div>
        </div>
        <div className={css.creditBlock}>
          <div className={`v ${candidate.netDebitCredit >= 0 ? "" : "red"}`.trim()} style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            color: candidate.netDebitCredit >= 0 ? "var(--rl-green, #22c55e)" : "var(--rl-red, #ef4444)",
          }}>
            {money(candidate.netDebitCredit)}
          </div>
          <div className="k" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--muted-foreground)" }}>
            net {candidate.netDebitCredit >= 0 ? "credit" : "debit"} on entry
          </div>
        </div>
      </div>

      <div className={css.detailBody}>
        <div className={css.detailMain}>
          {/* Legs comparison */}
          <div className={css.legsCmp}>
            <div className={css.legsCol}>
              <div className={css.legsColHd}>
                <span>Current position</span>
                <span>{money(position.pnl)} open</span>
              </div>
              {position.legs.map((leg, i) => {
                const removed = !afterKeys.has(beforeKey(leg));
                return (
                  <div key={i} className={`${css.legRow} ${removed ? css.removed : ""}`.trim()}>
                    <span className={`side ${leg.s}`}>{leg.s.toUpperCase()}</span>
                    <span>{leg.q}× {position.ticker} {formatStrike(leg.k)}{leg.t === "call" ? "C" : "P"} · {leg.exp}</span>
                    <span className="mark">@ {leg.p.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <div className={css.legsArrow}>→</div>
            <div className={css.legsCol}>
              <div className={`${css.legsColHd} ${css.future}`}>
                <span>After repair</span>
                <span>{money(candidate.netDebitCredit)} {candidate.netDebitCredit >= 0 ? "credit" : "debit"}</span>
              </div>
              {candidate.draftLegs.map((leg, i) => {
                const isNew = !beforeKeys.has(beforeKey(leg));
                return (
                  <div key={i} className={`${css.legRow} ${isNew ? css.new : ""}`.trim()}>
                    <span className={`side ${leg.s}`}>{leg.s.toUpperCase()}</span>
                    <span>
                      {leg.q}× {position.ticker} {formatStrike(leg.k)}{leg.t === "call" ? "C" : "P"} · {leg.exp}
                      {isNew ? " ← new" : ""}
                    </span>
                    <span className="mark">@ {leg.p.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payoff chart */}
          <div className={css.chartCard}>
            <div className={css.chartHd}>
              <span className={css.lbl}>Payoff at {expiry} expiry</span>
              <div className={css.chartLegend}>
                <span className="lg">
                  <span className={`${css.sw} before`} /> before · current legs
                </span>
                <span className="lg">
                  <span className={css.sw} /> after · {familyLabel(candidate.family).toLowerCase()}
                </span>
              </div>
            </div>
            <PayoffChart position={position} candidate={candidate} />
          </div>

          {/* P/L by price target */}
          <h3 style={{ fontSize: 14, margin: "20px 0 10px", fontWeight: 700 }}>
            P/L by price target at expiry
          </h3>
          <table className={css.ptTable}>
            <thead>
              <tr>
                <th>{position.ticker} price</th>
                <th>Move</th>
                <th>Before</th>
                <th>After</th>
                <th>Δ improvement</th>
              </tr>
            </thead>
            <tbody>
              {ptRows.map((row) => (
                <tr key={row.S} className={row.isNow ? css.now : ""}>
                  <td>${formatStrike(row.S)}</td>
                  <td>{row.label ?? `${row.movePct >= 0 ? "+" : ""}${row.movePct.toFixed(1)}%`}</td>
                  <td className={tone(row.before).green ? css.green : tone(row.before).red ? css.red : ""}>
                    {money(row.before)}
                  </td>
                  <td className={tone(row.after).green ? css.green : tone(row.after).red ? css.red : ""}>
                    {money(row.after)}
                  </td>
                  <td className={tone(row.delta).green ? css.green : tone(row.delta).red ? css.red : ""}>
                    {money(row.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Steps */}
          <h3 style={{ fontSize: 14, margin: "24px 0 8px", fontWeight: 700 }}>Steps to apply</h3>
          <ol className={css.stepList}>
            {candidate.actions.map((action, i) => (
              <li key={i}>
                <span className={css.stepNum}>{i + 1}</span>
                <div className={css.stepBody}>{action}</div>
              </li>
            ))}
          </ol>

          {candidate.warnings.length > 0 && (
            <div className={css.warnBlock}>
              <strong>One trade-off</strong>
              {candidate.warnings.join(" ")}
            </div>
          )}

          <div className={css.actionsRow}>
            <button
              className={`${css.btn} ${css.btnPrimary}`}
              onClick={() => {
                window.location.href = draftUrl;
              }}
            >
              Apply to calculator →
            </button>
            <button
              className={css.btn}
              onClick={() => {
                void navigator.clipboard.writeText(window.location.origin + draftUrl);
              }}
            >
              Copy draft link
            </button>
            <span className={css.spacer} />
          </div>
        </div>

        {/* RAIL */}
        <div className={css.detailRail}>
          <div className={css.miniBubble}>
            <div className="lbl" style={{ display: "flex", gap: 7, alignItems: "center" }}>
              <NerdSvg />
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: ".14em", color: "var(--muted-foreground)" }}>
                The Nerd · why this one
              </span>
            </div>
            <div style={{ marginTop: 6 }}>{whyAi.text}</div>
          </div>

          <h4 className={css.railH4}>Greeks · before → after</h4>
          <div className={css.greeksCmp}>
            {(["delta", "gamma", "theta", "vega"] as const).map((k) => {
              const before = beforeMark[k];
              const after = afterMark[k];
              const v1Class = k === "theta"
                ? after >= 0 ? "green" : "red"
                : "";
              return (
                <div key={k} className={css.gItem}>
                  <div className={css.gItemK}>{k}</div>
                  <div className={css.gItemRow}>
                    <span className="v0">{before.toFixed(k === "gamma" ? 4 : 2)}</span>
                    <span className="arr">→</span>
                    <span className={`v1 ${v1Class}`}>{after.toFixed(k === "gamma" ? 4 : 2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <h4 className={css.railH4}>Stress matrix</h4>
          <table className={css.ptTable}>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Before</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {stressRows.map((row) => (
                <tr key={row.pct} className={row.pct === 0 ? css.now : ""}>
                  <td>{row.pct === 0 ? "spot" : `${row.pct > 0 ? "+" : ""}${row.pct}%`}</td>
                  <td className={tone(row.before).green ? css.green : tone(row.before).red ? css.red : ""}>
                    {money(row.before)}
                  </td>
                  <td className={tone(row.after).green ? css.green : tone(row.after).red ? css.red : ""}>
                    {money(row.after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {alternates.length > 0 && (
            <>
              <h4 className={css.railH4}>Other repairs on {candidate.ticker}</h4>
              <div className={css.otherList}>
                {alternates.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    className={css.otherItem}
                    onClick={() => onSelectAlternate(alt)}
                  >
                    <div>
                      <div className={css.otherItemTitle}>{alt.title}</div>
                      <div className={css.otherItemSub}>
                        {familyLabel(alt.family).toLowerCase()} · score {alt.score.toFixed(1)}
                      </div>
                    </div>
                    <div className={`${css.otherItemValue} ${alt.netDebitCredit < 0 ? "red" : ""}`.trim()}>
                      {money(alt.netDebitCredit)}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className={css.detailFoot}>
            marks: delayed 15m · {position.markSource} source<br />
            expiry resolves to {expDate.toUTCString().slice(0, 16)}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// MAIN
// =========================================================================
export function RepairLab({
  positions,
  chains,
}: {
  positions: PortfolioPosition[];
  chains: Record<string, OptionChain>;
}) {
  const [tickerFilter, setTickerFilter] = useState<string>("all");
  const [familyFilter, setFamilyFilter] = useState<"all" | RepairFamily>("all");
  const [budgetFilter, setBudgetFilter] = useState<"all" | "credit">("all");
  const [sortMode, setSortMode] = useState<"score" | "credit" | "stress">("score");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const campaigns = useMemo(() => buildTickerCampaigns(positions), [positions]);
  const allCandidates = useMemo(
    () => generateRepairCandidates(positions, chains),
    [positions, chains],
  );

  const visibleCandidates = useMemo(() => {
    let list = allCandidates.slice();
    if (tickerFilter !== "all") list = list.filter((c) => c.ticker === tickerFilter);
    if (familyFilter !== "all") list = list.filter((c) => c.family === familyFilter);
    if (budgetFilter === "credit") list = list.filter((c) => c.netDebitCredit >= 0);
    if (sortMode === "credit") list.sort((a, b) => b.netDebitCredit - a.netDebitCredit);
    else if (sortMode === "stress") list.sort((a, b) => b.stressPnlDelta - a.stressPnlDelta);
    else list.sort((a, b) => b.score - a.score);
    return list;
  }, [allCandidates, tickerFilter, familyFilter, budgetFilter, sortMode]);

  const campaignRows = useMemo(
    () => buildCampaignRows(campaigns, allCandidates),
    [campaigns, allCandidates],
  );
  const expiryBuckets = useMemo(() => buildExpiryBuckets(positions), [positions]);
  const tickerOptions = useMemo(
    () => Array.from(new Set(allCandidates.map((c) => c.ticker))).sort(),
    [allCandidates],
  );

  const selected = useMemo(
    () =>
      visibleCandidates.find((c) => c.id === selectedId) ??
      allCandidates.find((c) => c.id === selectedId) ??
      visibleCandidates[0] ??
      null,
    [allCandidates, visibleCandidates, selectedId],
  );
  const selectedPosition = selected
    ? positions.find((p) => p.id === selected.positionId) ?? null
    : null;
  const alternates = selected
    ? allCandidates.filter((c) => c.ticker === selected.ticker && c.id !== selected.id)
    : [];

  // Refresh-age tick
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const lastFetch = positions
    .map((p) => p.quoteFetchedAt ?? 0)
    .filter((t) => t > 0)
    .reduce((max, t) => Math.max(max, t), 0);
  const refreshedAgo = lastFetch > 0 ? Math.max(0, Math.round((now - lastFetch) / 1000)) : null;
  const liveCount = positions.filter((p) => p.pxLive).length;

  const handleSelectCandidate = (id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const handleSelectTicker = (ticker: string) => {
    setTickerFilter((prev) => (prev === ticker ? "all" : ticker));
  };

  if (positions.length === 0) {
    return (
      <div className={css.root}>
        <div className={css.empty}>
          No open positions yet. Import positions from the toolbar above to see
          repair candidates and the risk timeline.
        </div>
      </div>
    );
  }

  return (
    <div className={css.root}>
      <HeroBand
        campaigns={campaigns}
        candidates={allCandidates}
        refreshedSecondsAgo={refreshedAgo}
        totalLive={liveCount}
        totalPositions={positions.length}
      />

      <KpiStrip positions={positions} candidates={allCandidates} />

      <div className={css.dashGrid}>
        <div className={css.sitCard}>
          <RiskTimeline buckets={expiryBuckets} />
          <CampaignTable
            rows={campaignRows}
            activeTicker={tickerFilter === "all" ? null : tickerFilter}
            onSelect={handleSelectTicker}
          />
        </div>

        <NerdInsightsRail candidates={allCandidates} campaigns={campaigns} />
      </div>

      {/* Repair candidates */}
      <div className={css.sectionHead}>
        <span className={css.num}>02</span>
        <h2>Repair candidates</h2>
        <span className={css.sub}>
          {allCandidates.length} deterministic · sorted by {sortMode}
        </span>
        <span className={css.right}>
          <div className={css.seg}>
            <button
              className={budgetFilter === "all" ? css.segActive : ""}
              onClick={() => setBudgetFilter("all")}
            >
              All
            </button>
            <button
              className={budgetFilter === "credit" ? css.segActive : ""}
              onClick={() => setBudgetFilter("credit")}
            >
              Credit only
            </button>
          </div>
          <div className={css.seg}>
            <button
              className={sortMode === "score" ? css.segActive : ""}
              onClick={() => setSortMode("score")}
            >
              Score
            </button>
            <button
              className={sortMode === "credit" ? css.segActive : ""}
              onClick={() => setSortMode("credit")}
            >
              $ recovery
            </button>
            <button
              className={sortMode === "stress" ? css.segActive : ""}
              onClick={() => setSortMode("stress")}
            >
              Stress
            </button>
          </div>
        </span>
      </div>

      <div className={css.oppControls}>
        <span className={css.microLabel}>Filter:</span>
        <div className={css.seg}>
          <button
            className={tickerFilter === "all" ? css.segActive : ""}
            onClick={() => setTickerFilter("all")}
          >
            Any ticker
          </button>
          {tickerOptions.map((t) => (
            <button
              key={t}
              className={tickerFilter === t ? css.segActive : ""}
              onClick={() => setTickerFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <span className={css.microLabel} style={{ marginLeft: "auto" }}>
          Family:
        </span>
        <div className={css.seg}>
          <button
            className={familyFilter === "all" ? css.segActive : ""}
            onClick={() => setFamilyFilter("all")}
          >
            All
          </button>
          <button
            className={familyFilter === "roll-short" ? css.segActive : ""}
            onClick={() => setFamilyFilter("roll-short")}
          >
            Roll
          </button>
          <button
            className={familyFilter === "verticalize" ? css.segActive : ""}
            onClick={() => setFamilyFilter("verticalize")}
          >
            Vertical
          </button>
          <button
            className={familyFilter === "harvest-reset" ? css.segActive : ""}
            onClick={() => setFamilyFilter("harvest-reset")}
          >
            Harvest
          </button>
        </div>
      </div>

      {visibleCandidates.length === 0 ? (
        <div className={css.empty}>
          No repair candidates match the current filters. Try widening the
          ticker, family, or budget filter.
        </div>
      ) : (
        <div className={css.oppGrid}>
          {visibleCandidates.map((candidate, idx) => {
            const position = positions.find((p) => p.id === candidate.positionId);
            if (!position) return null;
            return (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                position={position}
                isFeatured={idx === 0 && sortMode === "score"}
                isSelected={selected?.id === candidate.id}
                onSelect={() => handleSelectCandidate(candidate.id)}
              />
            );
          })}
        </div>
      )}

      {selected && selectedPosition && (
        <DetailView
          candidate={selected}
          position={selectedPosition}
          alternates={alternates}
          onSelectAlternate={(c) => handleSelectCandidate(c.id)}
          detailRef={detailRef}
        />
      )}
    </div>
  );
}
