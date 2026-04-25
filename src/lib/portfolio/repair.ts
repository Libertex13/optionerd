import type { OptionChain, OptionContract } from "@/types/market";
import type { PortfolioLeg, PortfolioPosition, PositionStockLeg } from "./types";
import { markPosition } from "./pricing";

export type RepairFamily = "roll-short" | "verticalize" | "harvest-reset";

export interface TickerCampaign {
  ticker: string;
  openPositions: PortfolioPosition[];
  closedPositions: PortfolioPosition[];
  realizedPnl: number;
  openPnl: number;
  netPnl: number;
  nextExpiryDte: number | null;
}

export interface RepairCandidate {
  id: string;
  ticker: string;
  positionId: string;
  family: RepairFamily;
  title: string;
  rationale: string;
  actions: string[];
  netDebitCredit: number;
  currentPnlDelta: number;
  stressLabel: string;
  stressPnlDelta: number;
  score: number;
  warnings: string[];
  draftLegs: PortfolioLeg[];
}

function fmtStrike(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function contractLabel(contract: OptionContract): string {
  return `${contract.expirationDate} ${fmtStrike(contract.strikePrice)} ${contract.optionType}`;
}

function findContract(
  chain: OptionChain,
  leg: PortfolioLeg,
): OptionContract | null {
  const expiry = chain.expirations.find((item) => item.expirationDate === leg.exp);
  if (!expiry) return null;
  const pool = leg.t === "call" ? expiry.calls : expiry.puts;
  return pool.find((contract) => Math.abs(contract.strikePrice - leg.k) < 0.001) ?? null;
}

function findVerticalShort(chain: OptionChain, leg: PortfolioLeg): OptionContract | null {
  const expiry = chain.expirations.find((item) => item.expirationDate === leg.exp);
  if (!expiry) return null;
  const pool = leg.t === "call" ? expiry.calls : expiry.puts;
  const candidates = pool
    .filter((contract) =>
      leg.t === "call"
        ? contract.strikePrice > leg.k
        : contract.strikePrice < leg.k,
    )
    .filter((contract) => contract.mid > 0)
    .sort((a, b) =>
      leg.t === "call"
        ? a.strikePrice - b.strikePrice
        : b.strikePrice - a.strikePrice,
    );
  return candidates[0] ?? null;
}

function findCheaperReplacement(
  chain: OptionChain,
  leg: PortfolioLeg,
  currentMark: number,
): OptionContract | null {
  const expiry = chain.expirations.find((item) => item.expirationDate === leg.exp);
  if (!expiry) return null;
  const pool = leg.t === "call" ? expiry.calls : expiry.puts;
  const candidates = pool
    .filter((contract) =>
      leg.t === "call"
        ? contract.strikePrice > leg.k
        : contract.strikePrice < leg.k,
    )
    .filter((contract) => contract.mid > 0 && contract.mid <= currentMark * 0.65)
    .sort((a, b) =>
      leg.t === "call"
        ? a.strikePrice - b.strikePrice
        : b.strikePrice - a.strikePrice,
    );
  return candidates[0] ?? null;
}

function findRollTarget(chain: OptionChain, leg: PortfolioLeg): OptionContract | null {
  const later = chain.expirations
    .filter((item) => item.expirationDate > leg.exp)
    .slice(0, 6);

  for (const expiry of later) {
    const pool = leg.t === "call" ? expiry.calls : expiry.puts;
    const directional = pool
      .filter((contract) =>
        leg.t === "call"
          ? contract.strikePrice >= leg.k
          : contract.strikePrice <= leg.k,
      )
      .filter((contract) => contract.mid > 0)
      .sort((a, b) => Math.abs(a.strikePrice - leg.k) - Math.abs(b.strikePrice - leg.k));
    if (directional[0]) return directional[0];
  }

  return null;
}

function replaceLeg(
  legs: PortfolioLeg[],
  index: number,
  replacement: PortfolioLeg,
): PortfolioLeg[] {
  return legs.map((leg, i) => (i === index ? replacement : leg));
}

function stressForPosition(pos: PortfolioPosition): { label: string; price: number } {
  const base = pos.px > 0 ? pos.px : 1;
  const pct = pos.greeks.delta >= 0 ? -0.05 : 0.05;
  return {
    label: `${pct > 0 ? "+" : ""}${(pct * 100).toFixed(0)}% stress`,
    price: base * (1 + pct),
  };
}

function buildCandidate(
  pos: PortfolioPosition,
  family: RepairFamily,
  title: string,
  rationale: string,
  actions: string[],
  nextLegs: PortfolioLeg[],
  netDebitCredit: number,
  stockLeg: PositionStockLeg | null,
  warnings: string[] = [],
): RepairCandidate {
  const px = pos.px > 0 ? pos.px : 1;
  const before = pos.pnl;
  const after = markPosition(nextLegs, px, stockLeg).pnl;
  const stress = stressForPosition(pos);
  const beforeStress = markPosition(pos.legs, stress.price, stockLeg).pnl;
  const afterStress = markPosition(nextLegs, stress.price, stockLeg).pnl;
  const stressPnlDelta = afterStress - beforeStress;
  const currentPnlDelta = after - before;
  const creditScore = Math.max(0, netDebitCredit) / 25;
  const stressScore = stressPnlDelta / 25;
  const costPenalty = Math.max(0, -netDebitCredit) / 50;

  return {
    id: `${family}:${pos.id}:${actions.join("|")}`,
    ticker: pos.ticker,
    positionId: pos.id,
    family,
    title,
    rationale,
    actions,
    netDebitCredit,
    currentPnlDelta,
    stressLabel: stress.label,
    stressPnlDelta,
    score: stressScore + creditScore - costPenalty,
    warnings,
    draftLegs: nextLegs,
  };
}

export function buildTickerCampaigns(positions: PortfolioPosition[]): TickerCampaign[] {
  const byTicker = new Map<string, PortfolioPosition[]>();
  for (const pos of positions) {
    const items = byTicker.get(pos.ticker) ?? [];
    items.push(pos);
    byTicker.set(pos.ticker, items);
  }

  return Array.from(byTicker.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ticker, items]) => {
      const closedPositions = items.filter((pos) => pos.state === "closed");
      const openPositions = items.filter((pos) => pos.state !== "closed" && pos.state !== "watching");
      const realizedPnl = closedPositions.reduce((sum, pos) => sum + pos.pnl, 0);
      const openPnl = openPositions.reduce((sum, pos) => sum + pos.pnl, 0);
      const nextDte = openPositions.length > 0
        ? Math.min(...openPositions.map((pos) => pos.dte).filter((dte) => dte >= 0))
        : null;

      return {
        ticker,
        openPositions,
        closedPositions,
        realizedPnl,
        openPnl,
        netPnl: realizedPnl + openPnl,
        nextExpiryDte: Number.isFinite(nextDte) ? nextDte : null,
      };
    });
}

export function generateRepairCandidates(
  positions: PortfolioPosition[],
  chains: Record<string, OptionChain>,
): RepairCandidate[] {
  const candidates: RepairCandidate[] = [];

  for (const pos of positions) {
    if (pos.state === "closed" || pos.state === "watching") continue;
    const chain = chains[pos.ticker];
    if (!chain || pos.legs.length === 0) continue;

    pos.legs.forEach((leg, index) => {
      const current = findContract(chain, leg);
      const currentMark = current?.mid && current.mid > 0
        ? current.mid
        : pos.marks[index]?.value ?? 0;

      if (leg.s === "short" && currentMark > 0) {
        const roll = findRollTarget(chain, leg);
        if (roll && roll.mid > 0) {
          const nextLeg: PortfolioLeg = {
            ...leg,
            k: roll.strikePrice,
            p: roll.mid,
            exp: roll.expirationDate,
            iv: roll.impliedVolatility || leg.iv,
          };
          const credit = (roll.mid - currentMark) * leg.q * 100;
          candidates.push(buildCandidate(
            pos,
            "roll-short",
            `Roll short ${leg.t} to ${fmtStrike(roll.strikePrice)}`,
            "Buys back the near-dated short option and sells later premium to give the trade more time.",
            [
              `Buy to close ${leg.q} ${leg.exp} ${fmtStrike(leg.k)} ${leg.t} @ ${currentMark.toFixed(2)}`,
              `Sell to open ${leg.q} ${contractLabel(roll)} @ ${roll.mid.toFixed(2)}`,
            ],
            replaceLeg(pos.legs, index, nextLeg),
            credit,
            pos.stockLeg,
            credit < 0 ? ["Roll is a debit; check repair budget before using."] : [],
          ));
        }
      }

      if (leg.s === "long" && currentMark > 0) {
        const short = findVerticalShort(chain, leg);
        if (short && short.mid > 0) {
          const shortLeg: PortfolioLeg = {
            s: "short",
            t: leg.t,
            k: short.strikePrice,
            p: short.mid,
            q: leg.q,
            iv: short.impliedVolatility || leg.iv,
            exp: short.expirationDate,
          };
          const credit = short.mid * leg.q * 100;
          candidates.push(buildCandidate(
            pos,
            "verticalize",
            `Convert long ${leg.t} into a vertical`,
            "Sells an out-of-the-money option against the long leg to recover premium and reduce decay.",
            [`Sell to open ${leg.q} ${contractLabel(short)} @ ${short.mid.toFixed(2)}`],
            [...pos.legs, shortLeg],
            credit,
            pos.stockLeg,
            ["Caps some upside beyond the short strike."],
          ));
        }

        const replacement = findCheaperReplacement(chain, leg, currentMark);
        const markPnl = pos.marks[index]?.pnl ?? 0;
        if (replacement && markPnl > Math.max(100, Math.abs(leg.p * leg.q * 100) * 0.25)) {
          const nextLeg: PortfolioLeg = {
            ...leg,
            k: replacement.strikePrice,
            p: replacement.mid,
            exp: replacement.expirationDate,
            iv: replacement.impliedVolatility || leg.iv,
          };
          const credit = (currentMark - replacement.mid) * leg.q * 100;
          candidates.push(buildCandidate(
            pos,
            "harvest-reset",
            `Harvest winner and reset ${leg.t}`,
            "Closes a profitable long option and reopens cheaper exposure, banking part of the gain.",
            [
              `Sell to close ${leg.q} ${leg.exp} ${fmtStrike(leg.k)} ${leg.t} @ ${currentMark.toFixed(2)}`,
              `Buy to open ${leg.q} ${contractLabel(replacement)} @ ${replacement.mid.toFixed(2)}`,
            ],
            replaceLeg(pos.legs, index, nextLeg),
            credit,
            pos.stockLeg,
            ["Resets exposure farther from the money; confirm the original thesis still holds."],
          ));
        }
      }
    });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}
