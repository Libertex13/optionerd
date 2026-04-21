"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ScenarioData } from "@/lib/scenarios/types";
import {
  candleAtOrBefore,
  computeSnapshot,
  entryValue as computeEntryValue,
  fmtDateShort,
  fmtPL,
  positionValueAt,
  verticalDebitBreakEven,
} from "@/lib/scenarios/math";
import { OverviewChart } from "./OverviewChart";
import { MomentCard } from "./MomentCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScenarioPlayerProps = {
  strategySlug: string;
  scenarioId: string;
  className?: string;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: ScenarioData };

export function ScenarioPlayer({
  strategySlug,
  scenarioId,
  className,
}: ScenarioPlayerProps) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++requestIdRef.current;
    fetch(`/api/scenarios/strategy/${strategySlug}/${scenarioId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({ error: r.statusText }));
          throw new Error(body.detail || body.error || r.statusText);
        }
        return (await r.json()) as ScenarioData;
      })
      .then((data) => {
        if (requestIdRef.current !== reqId) return;
        setState({ kind: "ready", data });
      })
      .catch((err: Error) => {
        if (requestIdRef.current !== reqId) return;
        setState({ kind: "error", message: err.message });
      });
  }, [strategySlug, scenarioId]);

  if (state.kind === "loading") {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        Loading scenario data…
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm",
          className,
        )}
      >
        <div className="font-semibold text-destructive mb-1">
          Couldn&apos;t load scenario
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {state.message}
        </div>
      </div>
    );
  }

  return <ScenarioShell data={state.data} className={className} />;
}

function ScenarioShell({
  data,
  className,
}: {
  data: ScenarioData;
  className?: string;
}) {
  const { config, underlying, legPrices } = data;

  const breakEven = useMemo(
    () => verticalDebitBreakEven(config, legPrices),
    [config, legPrices],
  );

  const entryV = useMemo(
    () => computeEntryValue(config.legs, legPrices),
    [config.legs, legPrices],
  );

  /** Close on (or just after) the entry date — anchors the "Δ from entry" hint. */
  const entryClose = useMemo(() => {
    const entryDate = config.decisions[0]?.date ?? config.from;
    const match = underlying.find((c) => c.date >= entryDate);
    return match?.close ?? null;
  }, [underlying, config.decisions, config.from]);

  /** P/L series across the scenario window — legs only have data here. */
  const pnlSeries = useMemo(() => {
    return underlying
      .filter((c) => c.date >= config.from && c.date <= config.to)
      .map((c) => {
        const v = positionValueAt(config.legs, legPrices, c.date);
        const pnl = v != null && entryV != null ? v - entryV : 0;
        return { date: c.date, pnl };
      });
  }, [underlying, config.legs, config.from, config.to, legPrices, entryV]);

  const snapshots = useMemo(
    () =>
      config.decisions.map((d) =>
        computeSnapshot(config, underlying, legPrices, d.date, breakEven),
      ),
    [config, underlying, legPrices, breakEven],
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const activeMoment = config.decisions[activeIdx] ?? null;

  const jumpToMoment = (i: number) => {
    setActiveIdx(i);
    if (typeof document !== "undefined") {
      const el = document.getElementById(`moment-${i}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const finalSnapshot = snapshots[snapshots.length - 1];
  const finalCandle = candleAtOrBefore(underlying, config.to);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        className,
      )}
    >
      {/* Meta */}
      <div className="p-4 md:p-5 border-b border-border flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-1">
            Scenario · {config.ticker} · {fmtDateShort(config.from)} →{" "}
            {fmtDateShort(config.to)}
          </div>
          <h3 className="text-xl md:text-2xl font-bold tracking-tight">
            {config.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {config.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          {config.legs.map((leg, i) => (
            <span
              key={i}
              className={cn(
                "px-2 py-1 rounded border",
                leg.side === "long"
                  ? "text-green-500 border-green-500/30"
                  : "text-red-500 border-red-500/30",
              )}
            >
              {leg.side === "long" ? "L" : "S"} {leg.strike}
              {leg.type === "call" ? "C" : "P"} · {leg.expiry}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-border">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Real fills
          </span>
        </div>
      </div>

      {/* Overview chart */}
      <div className="p-4 md:p-5 bg-card-hi/30 border-b border-border">
        <div className="flex items-baseline justify-between mb-2 font-mono text-[11px] text-muted-foreground">
          <span className="uppercase tracking-[0.14em]">
            Scenario overview · underlying path with pivotal moments marked
          </span>
          <span>
            {config.ticker} · {fmtDateShort(config.contextFrom ?? config.from)}{" "}
            → {fmtDateShort(config.contextTo ?? config.to)}
          </span>
        </div>
        <OverviewChart
          config={config}
          underlying={underlying}
          breakEven={breakEven}
          activeDate={activeMoment?.date ?? null}
          onJumpToMoment={jumpToMoment}
        />
      </div>

      {/* Moments */}
      <div>
        {config.decisions.map((m, i) => (
          <MomentCard
            key={m.date}
            config={config}
            moment={m}
            index={i}
            snapshot={snapshots[i]!}
            underlying={underlying}
            entryClose={entryClose}
            pnlSeries={pnlSeries}
            breakEven={breakEven}
          />
        ))}
      </div>

      {/* Close banner */}
      <ScenarioClose
        config={config}
        finalPnl={finalSnapshot?.pnl ?? null}
        finalUnderlying={finalCandle?.close ?? null}
        initialSpend={entryV}
      />
    </div>
  );
}

function ScenarioClose({
  config,
  finalPnl,
  finalUnderlying,
  initialSpend,
}: {
  config: ScenarioConfigProp;
  finalPnl: number | null;
  finalUnderlying: number | null;
  initialSpend: number | null;
}) {
  const retro = config.retrospective;
  const realized = retro.realizedPL ?? finalPnl ?? 0;
  const verdictColor =
    realized > 0
      ? "text-green-500"
      : realized < 0
        ? "text-red-500"
        : "text-foreground";
  const entryDate = config.decisions[0]?.date ?? config.from;
  const exitDate =
    config.decisions[config.decisions.length - 1]?.date ?? config.to;
  const holdDays =
    retro.holdDays ??
    Math.max(
      0,
      Math.round(
        (new Date(exitDate + "T00:00:00Z").getTime() -
          new Date(entryDate + "T00:00:00Z").getTime()) /
          86400000,
      ),
    );
  const pctOfMax = retro.pctOfMax;
  const returnOnRisk =
    initialSpend != null && initialSpend > 0
      ? (realized / initialSpend) * 100
      : null;

  return (
    <div className="p-5 md:p-6 border-t border-border bg-linear-to-br from-card-hi/40 to-card">
      <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground mb-1">
        Scenario recap · {config.ticker}
      </div>
      <h4 className="text-xl md:text-2xl font-serif font-medium tracking-tight mb-4">
        {retro.verdict}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-6 items-start">
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
            {initialSpend != null ? (
              <StatCell
                label="Initial spend"
                value={`-$${Math.round(initialSpend).toLocaleString("en-US")}`}
                tone="text-red-500"
              />
            ) : null}
            <StatCell
              label="Realized P/L"
              value={fmtPL(realized)}
              tone={verdictColor}
            />
            {returnOnRisk != null ? (
              <StatCell
                label="Return on risk"
                value={`${returnOnRisk >= 0 ? "+" : ""}${returnOnRisk.toFixed(0)}%`}
                tone={verdictColor}
              />
            ) : null}
            {pctOfMax != null ? (
              <StatCell
                label="% of max"
                value={`${(pctOfMax * 100).toFixed(0)}%`}
              />
            ) : null}
            <StatCell label="Days held" value={`${holdDays}`} />
            {finalUnderlying != null ? (
              <StatCell
                label={`${config.ticker} at exit`}
                value={`$${finalUnderlying.toFixed(2)}`}
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Replicate in calculator →</Button>
            <Button size="sm" variant="outline">
              Share this scenario
            </Button>
          </div>
        </div>
        <div className="rounded border border-border bg-card/60 p-4">
          <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground mb-2.5">
            What this scenario teaches
          </div>
          <ul className="list-disc pl-5 text-sm leading-relaxed space-y-1.5">
            {retro.lessons.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded border border-border bg-card/60 p-2.5">
      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("font-mono text-base font-bold mt-1", tone)}>
        {value}
      </div>
    </div>
  );
}

type ScenarioConfigProp = import("@/lib/scenarios/types").ScenarioConfig;
