"use client";

import { useMemo, useState } from "react";
import styles from "./portfolio.module.css";
import type { OptionChain } from "@/types/market";
import type { PortfolioPosition } from "@/lib/portfolio/types";
import {
  buildTickerCampaigns,
  generateRepairCandidates,
  type RepairCandidate,
  type TickerCampaign,
} from "@/lib/portfolio/repair";
import { buildPortfolioPositionUrl } from "@/lib/portfolio/share";

function money(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
}

function familyLabel(family: RepairCandidate["family"]): string {
  if (family === "roll-short") return "Roll";
  if (family === "verticalize") return "Vertical";
  return "Harvest";
}

function CampaignCard({ campaign }: { campaign: TickerCampaign }) {
  const tone =
    campaign.netPnl > 0 ? styles.pnlPos : campaign.netPnl < 0 ? styles.pnlNeg : "";
  return (
    <div className={styles.card}>
      <div className={styles.cardHdr}>
        <div>
          <div className={styles.cardTitle}>{campaign.ticker} campaign</div>
          <div className={styles.cardSub}>
            {campaign.openPositions.length} open · {campaign.closedPositions.length} closed
          </div>
        </div>
        <div className={`${styles.monoNum} ${tone}`} style={{ textAlign: "right" }}>
          {money(campaign.netPnl)}
          <span className={styles.monoNumSub}>net campaign</span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.statRow}>
          <div>
            <div className={styles.statRowK}>Realized</div>
            <div className={styles.statRowV}>{money(campaign.realizedPnl)}</div>
          </div>
          <div>
            <div className={styles.statRowK}>Open P/L</div>
            <div className={styles.statRowV}>{money(campaign.openPnl)}</div>
          </div>
          <div>
            <div className={styles.statRowK}>Next expiry</div>
            <div className={styles.statRowV}>
              {campaign.nextExpiryDte == null ? "—" : `${campaign.nextExpiryDte}d`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  position,
}: {
  candidate: RepairCandidate;
  position: PortfolioPosition;
}) {
  const creditTone =
    candidate.netDebitCredit >= 0 ? styles.pnlPos : styles.pnlNeg;
  const stressTone =
    candidate.stressPnlDelta >= 0 ? styles.pnlPos : styles.pnlNeg;

  return (
    <div className={styles.card}>
      <div className={styles.cardHdr}>
        <div>
          <div className={styles.cardTitle}>
            {candidate.title}
            <span className={styles.stateBadge} style={{ marginLeft: 8 }}>
              {familyLabel(candidate.family)}
            </span>
          </div>
          <div className={styles.cardSub}>{candidate.ticker}</div>
        </div>
        <div className={`${styles.monoNum} ${creditTone}`} style={{ textAlign: "right" }}>
          {money(candidate.netDebitCredit)}
          <span className={styles.monoNumSub}>
            {candidate.netDebitCredit >= 0 ? "net credit" : "net debit"}
          </span>
        </div>
      </div>
      <div className={styles.cardBody}>
        <p style={{ margin: "0 0 12px", color: "var(--muted-foreground)", fontSize: 13 }}>
          {candidate.rationale}
        </p>
        <div className={styles.statRow} style={{ marginBottom: 12 }}>
          <div>
            <div className={styles.statRowK}>Current P/L</div>
            <div className={styles.statRowV}>{money(candidate.currentPnlDelta)}</div>
          </div>
          <div>
            <div className={styles.statRowK}>{candidate.stressLabel}</div>
            <div className={`${styles.statRowV} ${stressTone}`}>
              {money(candidate.stressPnlDelta)}
            </div>
          </div>
          <div>
            <div className={styles.statRowK}>Score</div>
            <div className={styles.statRowV}>{candidate.score.toFixed(1)}</div>
          </div>
        </div>
        <div className={styles.legTable}>
          {candidate.actions.map((action, index) => (
            <div className={styles.legTableRow} key={index}>
              <div style={{ gridColumn: "1 / -1", fontFamily: "var(--font-mono), monospace" }}>
                {action}
              </div>
            </div>
          ))}
        </div>
        {candidate.warnings.length > 0 && (
          <div className={styles.cardSub} style={{ marginTop: 10 }}>
            {candidate.warnings.join(" ")}
          </div>
        )}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            className={`${styles.btn} ${styles.btnSm} ${styles.btnPrimary}`}
            onClick={() => {
              window.location.href = buildPortfolioPositionUrl(position, candidate.draftLegs);
            }}
          >
            Apply to calculator
          </button>
          <button
            className={`${styles.btn} ${styles.btnSm} ${styles.btnGhost}`}
            onClick={() => {
              void navigator.clipboard.writeText(
                buildPortfolioPositionUrl(position, candidate.draftLegs),
              );
            }}
          >
            Copy draft link
          </button>
        </div>
      </div>
    </div>
  );
}

export function RepairLab({
  positions,
  chains,
}: {
  positions: PortfolioPosition[];
  chains: Record<string, OptionChain>;
}) {
  const [budgetMode, setBudgetMode] = useState<"all" | "credit">("all");
  const campaigns = useMemo(() => buildTickerCampaigns(positions), [positions]);
  const candidates = useMemo(() => {
    const all = generateRepairCandidates(positions, chains);
    return budgetMode === "credit"
      ? all.filter((candidate) => candidate.netDebitCredit >= 0)
      : all;
  }, [budgetMode, chains, positions]);
  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.openPositions.length > 0 || campaign.closedPositions.length > 0,
  );

  return (
    <section>
      <div className={styles.note}>
        <strong>Repair Lab.</strong> This is a deterministic adjustment scanner:
        it uses delayed option marks to find rolls, premium recovery, and winner
        reset candidates. It does not estimate broker margin yet.
      </div>

      <div className={styles.controlsRow}>
        <div className={styles.controlsLeft}>
          <span className={styles.microLabel}>Repair budget</span>
          <div className={styles.seg}>
            <button
              className={budgetMode === "all" ? styles.segActive : ""}
              onClick={() => setBudgetMode("all")}
            >
              Any
            </button>
            <button
              className={budgetMode === "credit" ? styles.segActive : ""}
              onClick={() => setBudgetMode("credit")}
            >
              Credit only
            </button>
          </div>
        </div>
      </div>

      {activeCampaigns.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
            marginBottom: 14,
          }}
        >
          {activeCampaigns.map((campaign) => (
            <CampaignCard key={campaign.ticker} campaign={campaign} />
          ))}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 12,
        }}
      >
        {candidates.length > 0 ? (
          candidates.map((candidate) => {
            const position = positions.find((item) => item.id === candidate.positionId);
            return position ? (
              <CandidateCard key={candidate.id} candidate={candidate} position={position} />
            ) : null;
          })
        ) : (
          <div className={styles.card}>
            <div className={styles.cardBody} style={{ color: "var(--muted-foreground)" }}>
              No repair candidates found yet. Open positions need delayed chain
              data and enough option liquidity for the scanner to build an
              adjustment.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
