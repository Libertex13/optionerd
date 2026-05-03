"use client";

import { useEffect, useRef, useState } from "react";
import type { CandlestickData, LineData, Time } from "lightweight-charts";
import type { ScenarioCandle } from "@/lib/scenarios/types";

type MomentCandleChartProps = {
  ticker: string;
  candles: ScenarioCandle[];
  strikes: [number, number];
  markerDate: string;
  height?: number;
};

type MarkerLayout = {
  priceScaleWidth: number;
  timeScaleHeight: number;
  markerX: number | null;
  markerY: number | null;
};

export function MomentCandleChart({
  ticker,
  candles,
  strikes,
  markerDate,
  height = 260,
}: MomentCandleChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<MarkerLayout>({
    priceScaleWidth: 0,
    timeScaleHeight: 0,
    markerX: null,
    markerY: null,
  });

  const markerCandle = useMarkerCandle(candles, markerDate);
  const markerPrice = markerCandle?.close ?? null;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || candles.length === 0) return;
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
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "rgba(148,148,148,0.06)" },
          horzLines: { color: "rgba(148,148,148,0.06)" },
        },
        rightPriceScale: { borderColor: "rgba(148,148,148,0.12)" },
        timeScale: {
          borderColor: "rgba(148,148,148,0.12)",
          timeVisible: false,
          secondsVisible: false,
        },
        autoSize: true,
        crosshair: { mode: 1 },
        handleScroll: false,
        handleScale: false,
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
        candles.map((c) => ({
          time: c.date as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })) as CandlestickData<Time>[],
      );

      series.createPriceLine({
        price: strikes[0],
        color: "rgba(34,197,94,0.55)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `L ${strikes[0]}`,
      });
      series.createPriceLine({
        price: strikes[1],
        color: "rgba(239,68,68,0.55)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `S ${strikes[1]}`,
      });

      chart.timeScale().fitContent();

      const ts = chart.timeScale();
      const update = () => {
        if (disposed) return;
        const x = ts.timeToCoordinate(markerDate as Time);
        const y =
          markerPrice != null ? series.priceToCoordinate(markerPrice) : null;
        const nextWidth = chart.priceScale("right").width();
        const nextHeight = ts.height();
        setLayout((prev) => {
          if (
            prev.priceScaleWidth === nextWidth &&
            prev.timeScaleHeight === nextHeight &&
            prev.markerX === x &&
            prev.markerY === y
          )
            return prev;
          return {
            priceScaleWidth: nextWidth,
            timeScaleHeight: nextHeight,
            markerX: x,
            markerY: y,
          };
        });
      };

      const kickoff = window.setTimeout(update, 0);
      ts.subscribeVisibleTimeRangeChange(update);
      ts.subscribeSizeChange(update);

      cleanup = () => {
        window.clearTimeout(kickoff);
        ts.unsubscribeVisibleTimeRangeChange(update);
        ts.unsubscribeSizeChange(update);
        chart.remove();
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [candles, strikes, markerDate, markerPrice]);

  return (
    <div className="border-b border-border px-3 pt-2.5 pb-1">
      <div className="flex justify-between items-baseline font-mono text-[10.5px] text-muted-foreground uppercase tracking-[0.14em] mb-1">
        <span>Underlying · {ticker}</span>
        {markerCandle ? (
          <span className="text-sm font-bold text-foreground tracking-normal normal-case">
            ${markerCandle.close.toFixed(2)}
          </span>
        ) : null}
      </div>
      <div className="relative">
        <div
          ref={hostRef}
          style={{ height: `${height}px` }}
          className="w-full"
          aria-label={`${ticker} candle chart`}
        />
        {layout.markerX != null ? (
          <div
            className="absolute top-0 pointer-events-none border-l border-dashed border-scenario-accent/70"
            style={{
              left: `${layout.markerX}px`,
              bottom: `${layout.timeScaleHeight}px`,
            }}
          />
        ) : null}
        {layout.markerX != null && layout.markerY != null ? (
          <div
            className="absolute pointer-events-none h-3.5 w-3.5 rounded-full bg-scenario-accent ring-2 ring-card shadow-md"
            style={{
              left: `${layout.markerX}px`,
              top: `${layout.markerY}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

type PnLPoint = { date: string; pnl: number };

type MomentPnLChartProps = {
  series: PnLPoint[];
  markerDate: string;
  height?: number;
};

export function MomentPnLChart({
  series,
  markerDate,
  height = 190,
}: MomentPnLChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<MarkerLayout>({
    priceScaleWidth: 0,
    timeScaleHeight: 0,
    markerX: null,
    markerY: null,
  });

  const markerPnl = useMarkerPnl(series, markerDate);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || series.length === 0) return;
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
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "rgba(148,148,148,0.06)" },
          horzLines: { color: "rgba(148,148,148,0.06)" },
        },
        rightPriceScale: { borderColor: "rgba(148,148,148,0.12)" },
        timeScale: {
          borderColor: "rgba(148,148,148,0.12)",
          timeVisible: false,
          secondsVisible: false,
        },
        autoSize: true,
        crosshair: { mode: 1 },
        handleScroll: false,
        handleScale: false,
      });

      const baseline = chart.addSeries(lw.BaselineSeries, {
        baseValue: { type: "price", price: 0 },
        topLineColor: "#22c55e",
        topFillColor1: "rgba(34,197,94,0.28)",
        topFillColor2: "rgba(34,197,94,0.02)",
        bottomLineColor: "#ef4444",
        bottomFillColor1: "rgba(239,68,68,0.02)",
        bottomFillColor2: "rgba(239,68,68,0.28)",
        lineWidth: 2,
        priceFormat: { type: "price", precision: 0, minMove: 1 },
      });

      baseline.setData(
        series.map((p) => ({
          time: p.date as Time,
          value: p.pnl,
        })) as LineData<Time>[],
      );

      baseline.createPriceLine({
        price: 0,
        color: "rgba(148,148,148,0.35)",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: "",
      });

      chart.timeScale().fitContent();

      const ts = chart.timeScale();
      const update = () => {
        if (disposed) return;
        const x = ts.timeToCoordinate(markerDate as Time);
        const y =
          markerPnl != null ? baseline.priceToCoordinate(markerPnl) : null;
        const nextWidth = chart.priceScale("right").width();
        const nextHeight = ts.height();
        setLayout((prev) => {
          if (
            prev.priceScaleWidth === nextWidth &&
            prev.timeScaleHeight === nextHeight &&
            prev.markerX === x &&
            prev.markerY === y
          )
            return prev;
          return {
            priceScaleWidth: nextWidth,
            timeScaleHeight: nextHeight,
            markerX: x,
            markerY: y,
          };
        });
      };

      const kickoff = window.setTimeout(update, 0);
      ts.subscribeVisibleTimeRangeChange(update);
      ts.subscribeSizeChange(update);

      cleanup = () => {
        window.clearTimeout(kickoff);
        ts.unsubscribeVisibleTimeRangeChange(update);
        ts.unsubscribeSizeChange(update);
        chart.remove();
      };
    })();

    return () => {
      disposed = true;
      if (cleanup) cleanup();
    };
  }, [series, markerDate, markerPnl]);

  const sign = markerPnl == null ? "" : markerPnl > 0 ? "+" : markerPnl < 0 ? "-" : "";
  const abs =
    markerPnl == null
      ? "—"
      : Math.abs(Math.round(markerPnl)).toLocaleString("en-US");
  const plColor =
    markerPnl == null
      ? "var(--foreground)"
      : markerPnl > 0
        ? "#22c55e"
        : markerPnl < 0
          ? "#ef4444"
          : "var(--foreground)";

  return (
    <div className="px-3 pt-2.5 pb-1">
      <div className="flex justify-between items-baseline font-mono text-[10.5px] text-muted-foreground uppercase tracking-[0.14em] mb-1">
        <span>Position P/L</span>
        <span
          className="text-sm font-bold tracking-normal normal-case"
          style={{ color: plColor }}
        >
          {markerPnl == null ? "—" : `${sign}$${abs}`}
        </span>
      </div>
      <div className="relative">
        <div
          ref={hostRef}
          style={{ height: `${height}px` }}
          className="w-full"
          aria-label="Position P/L chart"
        />
        {layout.markerX != null ? (
          <div
            className="absolute top-0 pointer-events-none border-l border-dashed border-scenario-accent/70"
            style={{
              left: `${layout.markerX}px`,
              bottom: `${layout.timeScaleHeight}px`,
            }}
          />
        ) : null}
        {layout.markerX != null && layout.markerY != null ? (
          <div
            className="absolute pointer-events-none h-3.5 w-3.5 rounded-full bg-scenario-accent ring-2 ring-card shadow-md"
            style={{
              left: `${layout.markerX}px`,
              top: `${layout.markerY}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function useMarkerCandle(
  candles: ScenarioCandle[],
  markerDate: string,
): ScenarioCandle | null {
  let last: ScenarioCandle | null = null;
  for (const c of candles) {
    if (c.date <= markerDate) last = c;
    else break;
  }
  return last;
}

function useMarkerPnl(series: PnLPoint[], markerDate: string): number | null {
  let last: number | null = null;
  for (const p of series) {
    if (p.date <= markerDate) last = p.pnl;
    else break;
  }
  return last;
}
