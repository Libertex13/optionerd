"use client";

import type {
  DecisionPoint,
  ScenarioCandle,
  ScenarioConfig,
  ScenarioLegPrice,
  MomentKind,
} from "@/lib/scenarios/types";
import { fmtDateShort, fmtPL, type MomentSnapshot } from "@/lib/scenarios/math";
import { MomentCandleChart, MomentPnLChart } from "./MiniCharts";
import { NerdSays } from "./NerdNarrator";
import { cn } from "@/lib/utils";

type PnLPoint = { date: string; pnl: number };

type MomentCardProps = {
  config: ScenarioConfig;
  moment: DecisionPoint;
  index: number;
  snapshot: MomentSnapshot;
  /** Full-context underlying OHLC — chart shows the wider time horizon. */
  underlying: ScenarioCandle[];
  /** Underlying close on the first decision date (entry), for "Δ from entry". */
  entryClose: number | null;
  pnlSeries: PnLPoint[];
};

const kindLabel: Record<MomentKind, string> = {
  entry: "ENTRY",
  adjust: "ADJUSTMENT",
  exit: "EXIT",
  event: "EVENT",
  decay: "DECAY · HOLD",
};

export function MomentCard({
  config,
  moment,
  index,
  snapshot,
  underlying,
  entryClose,
  pnlSeries,
}: MomentCardProps) {
  const { legs, underlying: momentCandle, pnl, pnlPct, dte, daysFromEntry, distToBE, costBasis } =
    snapshot;

  const numToneClass =
    moment.kind === "adjust"
      ? "bg-scenario-accent text-white"
      : moment.kind === "exit"
        ? "bg-card border-2 border-foreground text-foreground"
        : moment.kind === "event"
          ? "bg-red-500 text-white"
          : "bg-foreground text-background";

  const priceFromEntry =
    momentCandle && entryClose != null ? momentCandle.close - entryClose : null;
  const priceFromEntryPct =
    priceFromEntry != null && entryClose != null && entryClose !== 0
      ? (priceFromEntry / entryClose) * 100
      : null;

  const plTone =
    pnl == null ? undefined : pnl > 0 ? "pos" : pnl < 0 ? "neg" : undefined;

  return (
    <div
      data-moment-index={index}
      id={`moment-${index}`}
      className="grid grid-cols-1 md:grid-cols-[1fr_340px] border-b border-border last:border-b-0 scroll-mt-24"
    >
      <div className="p-5 md:p-6 md:border-r border-border">
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono font-bold text-sm",
              numToneClass,
            )}
          >
            {index + 1}
          </div>
          <div className="flex-1">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground flex flex-wrap items-baseline gap-2.5 mb-0.5">
              <span>{kindLabel[moment.kind]}</span>
              <span className="text-foreground font-semibold">
                Day {daysFromEntry} · {fmtDateShort(moment.date)}
              </span>
              <span>{dte} DTE</span>
            </div>
            <h4 className="text-lg md:text-xl font-bold tracking-tight leading-tight">
              {moment.title}
            </h4>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card-hi/40 overflow-hidden mb-4">
          <MomentCandleChart
            ticker={config.ticker}
            candles={underlying}
            markerDate={moment.date}
            strikes={[
              config.legs[0]!.strike,
              config.legs[1]?.strike ?? config.legs[0]!.strike,
            ]}
          />
          <MomentPnLChart series={pnlSeries} markerDate={moment.date} />
        </div>

        <NerdSays>
          <div className="text-sm leading-relaxed text-foreground/95">
            <p>{moment.narrative}</p>
            {moment.decision ? (
              <div className="mt-3 rounded border border-border bg-card-hi/50 p-3 text-sm">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                  {moment.decision.k}
                </div>
                <div className="font-semibold text-foreground">
                  {moment.decision.v}
                </div>
              </div>
            ) : null}
          </div>
        </NerdSays>
      </div>

      <div className="p-5 md:p-6 bg-card-hi/30 flex flex-col gap-4">
        <div className="pb-4 border-b border-dashed border-border">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            Position P/L
          </div>
          <div
            className={cn(
              "font-mono text-3xl md:text-4xl font-bold tracking-tight leading-none",
              plTone === "pos" && "text-green-500",
              plTone === "neg" && "text-red-500",
            )}
          >
            {pnl != null ? fmtPL(pnl) : "—"}
          </div>
          <div className="font-mono text-[11px] text-muted-foreground mt-1.5">
            {index === 0 && costBasis != null
              ? `cost basis ${fmtPL(-costBasis)} at risk`
              : pnl != null && costBasis != null && costBasis !== 0
                ? `${pnlPct != null ? (pnlPct >= 0 ? "+" : "") + pnlPct.toFixed(0) + "%" : ""} on risk`
                : ""}
          </div>
        </div>

        <div className="pb-4 border-b border-dashed border-border">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
            State · Day {daysFromEntry}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 font-mono text-[11.5px]">
            <span className="text-muted-foreground">Underlying</span>
            <span className="font-semibold text-right">
              {momentCandle ? `$${momentCandle.close.toFixed(2)}` : "—"}
            </span>
            {priceFromEntry != null && priceFromEntryPct != null ? (
              <>
                <span className="text-muted-foreground">Δ from entry</span>
                <span
                  className={cn(
                    "font-semibold text-right",
                    priceFromEntry >= 0 ? "text-green-500" : "text-red-500",
                  )}
                >
                  {priceFromEntry >= 0 ? "+" : ""}
                  {priceFromEntry.toFixed(2)} ({priceFromEntryPct >= 0 ? "+" : ""}
                  {priceFromEntryPct.toFixed(1)}%)
                </span>
              </>
            ) : null}
            <span className="text-muted-foreground">DTE</span>
            <span className="font-semibold text-right">{dte}</span>
            {distToBE != null ? (
              <>
                <span className="text-muted-foreground">Dist to BE</span>
                <span className="font-semibold text-right">
                  {distToBE >= 0 ? "+" : ""}${distToBE.toFixed(2)}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="pb-4 border-b border-dashed border-border">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
            Legs
          </div>
          <div className="flex flex-col gap-1.5">
            {legs.map((ls, i) => (
              <LegSnapshotCard key={i} snapshot={ls} />
            ))}
          </div>
        </div>

        {moment.oneLine ? (
          <blockquote className="font-serif italic text-sm leading-relaxed text-foreground pl-3 border-l-2 border-scenario-accent bg-scenario-accent/5 py-2 pr-2.5 rounded-r">
            &ldquo;{moment.oneLine}&rdquo;
          </blockquote>
        ) : null}
      </div>
    </div>
  );
}

type LegSnapshotCardProps = {
  snapshot: import("@/lib/scenarios/math").LegSnapshot;
};

function LegSnapshotCard({ snapshot }: LegSnapshotCardProps) {
  const { leg, label, entry, mark, intrinsic, extrinsic, pl } = snapshot;
  const totalPerShare = Math.max(0, mark);
  const intrPct = totalPerShare > 0 ? (intrinsic / totalPerShare) * 100 : 0;
  const extrPct = totalPerShare > 0 ? (extrinsic / totalPerShare) * 100 : 0;
  const plToneClass =
    pl > 0 ? "text-green-500" : pl < 0 ? "text-red-500" : "text-foreground";
  const sideClass =
    leg.side === "long"
      ? "text-green-500 bg-green-500/15"
      : "text-red-500 bg-red-500/15";

  return (
    <div className="rounded border border-border bg-card p-2.5 font-mono text-[11.5px]">
      <div className="flex justify-between items-center mb-1.5">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "px-1.5 py-0.5 rounded font-bold text-[10px]",
              sideClass,
            )}
          >
            {leg.side.toUpperCase()}
          </span>
          <strong className="text-foreground">{label}</strong>
        </span>
        <span className={cn("font-bold", plToneClass)}>{fmtPL(pl)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">mark</span>
        <span>${mark.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">entry</span>
        <span>${entry.toFixed(2)}</span>
      </div>
      {totalPerShare > 0 ? (
        <>
          <div className="flex h-3.5 rounded overflow-hidden mt-1.5 bg-muted">
            <div
              className="bg-green-500/85"
              style={{ width: `${intrPct}%` }}
            />
            <div
              className="bg-scenario-accent/75"
              style={{ width: `${extrPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[9.5px] text-muted-foreground mt-0.5">
            <span>intr ${intrinsic.toFixed(2)}</span>
            <span>ext ${extrinsic.toFixed(2)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Consume the type so tsc doesn't flag the unused import when we only use the
 *  parent `ScenarioLegPrice` type indirectly. */
export type _Unused = ScenarioLegPrice;
