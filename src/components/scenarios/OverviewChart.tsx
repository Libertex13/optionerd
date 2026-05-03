"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type {
  CandlestickData,
  ISeriesMarkersPluginApi,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import type {
  ScenarioCandle,
  ScenarioConfig,
  DecisionPoint,
} from "@/lib/scenarios/types";
import { cn } from "@/lib/utils";
import type { MomentKind } from "@/lib/scenarios/types";
import { readScenarioAccent, readScenarioAccentRgba } from "@/lib/scenarios/colors";

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

function buildMarkers(
  decisions: DecisionPoint[],
  activeIdx: number,
): SeriesMarker<Time>[] {
  const activeColor = readScenarioAccent();
  const inactiveColor = readScenarioAccentRgba(0.85);
  return decisions.map((d, i) => {
    const isActive = i === activeIdx;
    return {
      time: d.date as Time,
      position: "aboveBar",
      shape: "circle",
      color: isActive ? activeColor : inactiveColor,
      text: `${i + 1}`,
      size: isActive ? 2 : 1.4,
    };
  });
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
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
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

  const activeIdx = config.decisions.findIndex(
    (d: DecisionPoint) => d.date === activeDate,
  );

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
        const accentSoft = readScenarioAccentRgba(0.6);
        series.createPriceLine({
          price: breakEven,
          color: accentSoft,
          lineWidth: 1,
          lineStyle: 1,
          axisLabelVisible: true,
          axisLabelColor: readScenarioAccent(),
          axisLabelTextColor: "#ffffff",
          title: `BE ${breakEven.toFixed(2)}`,
        });
      }

      // Pivotal-moment markers — circles anchored to candles, with the
      // moment's number as text. Active styling is updated via the
      // separate effect below that watches activeIdx.
      markersRef.current = lw.createSeriesMarkers(
        series,
        buildMarkers(config.decisions, -1),
      );

      const ts = chart.timeScale();

      // Auto-zoom around the pivotal moments: buffer = 25% of the moment span
      // on the left, 40% on the right (so post-trade context is visible).
      // Falls back to fitContent if there are no decisions.
      const decisions = config.decisions;
      if (decisions.length > 0 && underlying.length > 0) {
        const firstMs = new Date(decisions[0]!.date + "T00:00:00Z").getTime();
        const lastMs = new Date(
          decisions[decisions.length - 1]!.date + "T00:00:00Z",
        ).getTime();
        const minSpanMs = 45 * 86_400_000; // floor at 45 days so single moments don't render too tight
        const spanMs = Math.max(lastMs - firstMs, minSpanMs);
        const targetFromMs = firstMs - spanMs * 1.0;
        const targetToMs = lastMs + spanMs * 1.3;

        const dataFromMs = new Date(
          underlying[0]!.date + "T00:00:00Z",
        ).getTime();
        const dataToMs = new Date(
          underlying[underlying.length - 1]!.date + "T00:00:00Z",
        ).getTime();

        const visFromMs = Math.max(targetFromMs, dataFromMs);
        const visToMs = Math.min(targetToMs, dataToMs);
        const visFrom = new Date(visFromMs).toISOString().slice(0, 10);
        const visTo = new Date(visToMs).toISOString().slice(0, 10);

        ts.setVisibleRange({ from: visFrom as Time, to: visTo as Time });
      } else {
        ts.fitContent();
      }


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
        markersRef.current?.detach();
        markersRef.current = null;
        chart.remove();
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [underlying, config, breakEven, isDark]);

  // Update marker styling when the active moment changes (without rebuilding chart)
  useEffect(() => {
    if (markersRef.current) {
      markersRef.current.setMarkers(buildMarkers(config.decisions, activeIdx));
    }
  }, [activeIdx, config.decisions]);

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
                  ? "border-scenario-accent/70"
                  : "border-scenario-accent/25",
              )}
              style={{ left: `${x}px` }}
            />
          ),
        )}
      </div>

      {/* Legend strip below the chart — pairs numbers with moment labels */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
        {config.decisions.map((d, i) => {
          const isActive = activeIdx === i;
          const label = d.shortLabel ?? defaultKindLabel(d.kind);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onJumpToMoment(i)}
              className={cn(
                "inline-flex items-center gap-1.5 transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold",
                  isActive
                    ? "bg-scenario-accent text-white border-scenario-accent"
                    : "bg-card text-scenario-accent border-scenario-accent/60",
                )}
              >
                {i + 1}
              </span>
              <span className="tracking-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
