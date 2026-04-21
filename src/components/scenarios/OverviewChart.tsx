"use client";

import { useEffect, useRef, useState } from "react";
import type { CandlestickData, Time } from "lightweight-charts";
import type {
  ScenarioCandle,
  ScenarioConfig,
  DecisionPoint,
} from "@/lib/scenarios/types";
import { cn } from "@/lib/utils";
import type { MomentKind } from "@/lib/scenarios/types";

function defaultKindLabel(kind: MomentKind): string {
  switch (kind) {
    case "entry":
      return "Entry";
    case "adjust":
      return "Adjust";
    case "exit":
      return "Exit";
    case "event":
      return "Event";
    case "decay":
      return "Hold";
  }
}

type OverviewChartProps = {
  config: ScenarioConfig;
  underlying: ScenarioCandle[];
  breakEven: number | null;
  activeDate: string | null;
  onJumpToMoment: (index: number) => void;
};

export function OverviewChart({
  config,
  underlying,
  breakEven,
  activeDate,
  onJumpToMoment,
}: OverviewChartProps) {
  const chartHostRef = useRef<HTMLDivElement>(null);
  const [chartLayout, setChartLayout] = useState<{
    priceScaleWidth: number;
    timeScaleHeight: number;
    plotWidth: number;
    decisionX: (number | null)[];
  }>({
    priceScaleWidth: 0,
    timeScaleHeight: 0,
    plotWidth: 0,
    decisionX: config.decisions.map(() => null),
  });

  useEffect(() => {
    const host = chartHostRef.current;
    if (!host || underlying.length === 0) return;
    let disposed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const lw = await import("lightweight-charts");
      if (disposed || !host) return;
      host.innerHTML = "";

      const chart = lw.createChart(host, {
        layout: {
          background: { type: lw.ColorType.Solid, color: "transparent" },
          textColor: "rgba(148, 148, 148, 1)",
          fontFamily:
            "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11,
        },
        grid: {
          vertLines: { color: "rgba(148,148,148,0.08)" },
          horzLines: { color: "rgba(148,148,148,0.08)" },
        },
        rightPriceScale: { borderColor: "rgba(148,148,148,0.12)" },
        timeScale: {
          borderColor: "rgba(148,148,148,0.12)",
          timeVisible: false,
          secondsVisible: false,
        },
        autoSize: true,
        crosshair: { mode: 1 },
      });

      const series = chart.addSeries(lw.CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#16a34a",
        borderDownColor: "#dc2626",
        wickUpColor: "#16a34a",
        wickDownColor: "#dc2626",
        priceFormat: { type: "price", precision: 2, minMove: 0.01 },
      });

      series.setData(
        underlying.map((c) => ({
          time: c.date as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })) as CandlestickData<Time>[],
      );

      for (const leg of config.legs) {
        series.createPriceLine({
          price: leg.strike,
          color:
            leg.side === "long"
              ? "rgba(34,197,94,0.55)"
              : "rgba(239,68,68,0.55)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${leg.side === "long" ? "L" : "S"} ${leg.strike}`,
        });
      }

      if (breakEven != null) {
        series.createPriceLine({
          price: breakEven,
          color: "rgba(245,158,11,0.55)",
          lineWidth: 1,
          lineStyle: 1,
          axisLabelVisible: true,
          title: `BE ${breakEven.toFixed(2)}`,
        });
      }

      chart.timeScale().fitContent();

      const ts = chart.timeScale();
      const updateLayout = () => {
        if (disposed || !host) return;
        const priceScale = chart.priceScale("right");
        const nextWidth = priceScale.width();
        const nextHeight = ts.height();
        const nextPlotWidth = Math.max(0, host.clientWidth - nextWidth);
        const nextCoords = config.decisions.map((d) =>
          ts.timeToCoordinate(d.date as Time),
        );
        setChartLayout((prev) => {
          const same =
            prev.priceScaleWidth === nextWidth &&
            prev.timeScaleHeight === nextHeight &&
            prev.plotWidth === nextPlotWidth &&
            prev.decisionX.length === nextCoords.length &&
            prev.decisionX.every((c, i) => c === nextCoords[i]);
          return same
            ? prev
            : {
                priceScaleWidth: nextWidth,
                timeScaleHeight: nextHeight,
                plotWidth: nextPlotWidth,
                decisionX: nextCoords,
              };
        });
      };

      const kickoff = window.setTimeout(updateLayout, 0);
      ts.subscribeVisibleTimeRangeChange(updateLayout);
      ts.subscribeSizeChange(updateLayout);

      cleanup = () => {
        window.clearTimeout(kickoff);
        ts.unsubscribeVisibleTimeRangeChange(updateLayout);
        ts.unsubscribeSizeChange(updateLayout);
        chart.remove();
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [underlying, config, breakEven]);

  const activeIdx = config.decisions.findIndex(
    (d: DecisionPoint) => d.date === activeDate,
  );

  return (
    <div className="relative">
      <div
        ref={chartHostRef}
        className="h-72 md:h-88 w-full"
        aria-label={`${config.ticker} historical candle chart`}
      />

      <div
        className="absolute left-0 top-0 pointer-events-none"
        style={{
          right: chartLayout.priceScaleWidth,
          bottom: chartLayout.timeScaleHeight,
        }}
      >
        {chartLayout.decisionX.map((x, i) =>
          x == null ? null : (
            <div
              key={i}
              className={cn(
                "absolute top-0 bottom-0 w-px border-l border-dashed",
                activeIdx === i
                  ? "border-amber-500/70"
                  : "border-amber-500/25",
              )}
              style={{ left: `${x}px` }}
            />
          ),
        )}
      </div>

      <div
        className="absolute left-0 top-1 pointer-events-none"
        style={{ right: chartLayout.priceScaleWidth }}
      >
        {chartLayout.decisionX.map((x, i) => {
          if (x == null) return null;
          const d = config.decisions[i]!;
          const isActive = activeIdx === i;
          const label = d.shortLabel ?? defaultKindLabel(d.kind);
          const anchorLeft =
            chartLayout.plotWidth > 0 && x / chartLayout.plotWidth > 0.75;
          return (
            <button
              key={i}
              onClick={() => onJumpToMoment(i)}
              title={`${i + 1}. ${d.title}`}
              aria-label={`Jump to ${d.title}`}
              className={cn(
                "absolute top-0 pointer-events-auto",
                "flex items-center h-6 rounded-full border shadow-sm transition-all",
                "font-mono text-[11px] font-medium backdrop-blur-sm",
                isActive
                  ? "bg-amber-500 text-white border-amber-600 scale-105"
                  : "bg-card/90 text-muted-foreground border-amber-500/50 hover:border-amber-500 hover:text-foreground",
                anchorLeft && "flex-row-reverse",
              )}
              style={{
                left: `${x}px`,
                transform: anchorLeft
                  ? "translateX(calc(-100% + 12px))"
                  : "translateX(-12px)",
              }}
            >
              <span
                className={cn(
                  "flex items-center justify-center h-6 w-6 shrink-0 font-bold rounded-full",
                  isActive
                    ? "text-white"
                    : "text-amber-600 dark:text-amber-400",
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap tracking-tight",
                  anchorLeft ? "pl-2 pr-1" : "pl-0.5 pr-2.5",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
