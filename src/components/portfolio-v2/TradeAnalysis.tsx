"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./portfolio.module.css";

interface TradeAnalysisReport {
  id: string;
  source_filename: string | null;
  account_names: string[];
  first_trade_at: string | null;
  last_trade_at: string | null;
  counts: { pairedTrades?: number; tradeActionRows?: number };
  performance_summary: string[][];
  trade_analysis: string[][];
  periodical_returns: {
    monthly?: PeriodReturn[];
  };
  imported_at: string;
}

interface PeriodReturn {
  period: string | null;
  netProfit: number | null;
  percentGain: number | null;
  profitFactor: number | null;
  trades: number | null;
  percentProfitable: number | null;
}

interface ImportedTrade {
  id: string;
  trade_number: number | null;
  account: string | null;
  symbol: string;
  trade_type: string | null;
  opened_at: string | null;
  closed_at: string | null;
  entry_action: string | null;
  exit_action: string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  quantity: number | string | null;
  net_profit: number | string | null;
  percent_profit: number | string | null;
  commission: number | string | null;
}

interface TradeAnalysisPayload {
  report: TradeAnalysisReport | null;
  trades: ImportedTrade[];
}

interface EquityPoint {
  label: string;
  value: number;
}

interface BarPoint {
  label: string;
  value: number;
  sortKey: string;
}

interface TradeStructure {
  key: string;
  netProfit: number;
  legs: number;
}

function numeric(value: number | string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmtMoney(value: number | string | null | undefined): string {
  const amount = numeric(value);
  if (amount == null) return "-";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function fmtNumber(value: number | string | null | undefined, digits = 1): string {
  const amount = numeric(value);
  if (amount == null) return "-";
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPercentValue(value: number | string | null | undefined): string {
  const amount = numeric(value);
  if (amount == null) return "-";
  const percent = Math.abs(amount) <= 1 ? amount * 100 : amount;
  return `${fmtNumber(percent, 1)}%`;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(value: string | null): string {
  if (!value) return "-";
  const date = normalizedPeriodDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function summaryValue(rows: string[][], label: string): string | null {
  const needle = label.toLowerCase();
  for (const row of rows) {
    const index = row.findIndex((cell) => String(cell).toLowerCase() === needle);
    if (index >= 0 && row[index + 1]) return row[index + 1];
  }
  return null;
}

function summaryNumber(rows: string[][], label: string): number | null {
  return numeric(summaryValue(rows, label));
}

function underlyingSymbol(symbol: string): string {
  return symbol.trim().split(/\s+/)[0] || symbol;
}

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function normalizedPeriodDate(value: string): Date {
  const date = new Date(value);
  if (
    !Number.isNaN(date.getTime()) &&
    date.getUTCMonth() === 0 &&
    date.getUTCDate() > 1 &&
    date.getUTCDate() <= 12
  ) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCDate() - 1, 1));
  }
  return date;
}

function periodSortKey(value: string | null): string {
  if (!value) return "";
  const date = normalizedPeriodDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function calculateTradeStructures(trades: ImportedTrade[]): TradeStructure[] {
  const byUnderlying = new Map<
    string,
    Array<{
      id: string;
      start: number;
      end: number;
      netProfit: number;
    }>
  >();

  for (const trade of trades) {
    const opened = timestamp(trade.opened_at);
    const closed = timestamp(trade.closed_at);
    const fallbackTime = opened ?? closed ?? 0;
    const start = Math.min(opened ?? fallbackTime, closed ?? fallbackTime);
    const end = Math.max(opened ?? fallbackTime, closed ?? fallbackTime);
    const groupKey = [trade.account ?? "", underlyingSymbol(trade.symbol)].join("|");
    const group = byUnderlying.get(groupKey) ?? [];

    group.push({
      id: trade.id,
      start,
      end,
      netProfit: numeric(trade.net_profit) ?? 0,
    });
    byUnderlying.set(groupKey, group);
  }

  const structures: TradeStructure[] = [];

  for (const [groupKey, legs] of byUnderlying) {
    const sorted = legs.sort((a, b) => a.start - b.start || a.end - b.end);
    let current: TradeStructure & { end: number } | null = null;

    for (const leg of sorted) {
      if (!current || leg.start > current.end) {
        current = {
          key: `${groupKey}|${leg.id}`,
          netProfit: leg.netProfit,
          legs: 1,
          end: leg.end,
        };
        structures.push(current);
        continue;
      }

      current.netProfit += leg.netProfit;
      current.legs += 1;
      current.end = Math.max(current.end, leg.end);
    }
  }

  return structures;
}

function calculateEquityCurve(trades: ImportedTrade[]): EquityPoint[] {
  let cumulative = 0;
  return [...trades]
    .sort((a, b) => String(a.closed_at ?? "").localeCompare(String(b.closed_at ?? "")))
    .map((trade) => {
      cumulative += numeric(trade.net_profit) ?? 0;
      return {
        label: fmtDate(trade.closed_at),
        value: cumulative,
      };
    });
}

function calculateMonthlyReturns(
  trades: ImportedTrade[],
  report: TradeAnalysisReport | null,
): BarPoint[] {
  const reportMonthly = report?.periodical_returns?.monthly ?? [];
  if (reportMonthly.length > 0) {
    return reportMonthly
      .filter((row) => numeric(row.netProfit) != null)
      .map((row) => ({
        label: monthLabel(row.period),
        value: numeric(row.netProfit) ?? 0,
        sortKey: periodSortKey(row.period),
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }

  const byMonth = new Map<string, number>();
  for (const trade of trades) {
    if (!trade.closed_at) continue;
    const date = new Date(trade.closed_at);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + (numeric(trade.net_profit) ?? 0));
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      label: monthLabel(`${key}-01T00:00:00.000Z`),
      value,
      sortKey: key,
    }));
}

function calculateSymbolReturns(trades: ImportedTrade[]): BarPoint[] {
  const bySymbol = new Map<string, number>();
  for (const trade of trades) {
    const symbol = underlyingSymbol(trade.symbol);
    bySymbol.set(
      symbol,
      (bySymbol.get(symbol) ?? 0) + (numeric(trade.net_profit) ?? 0),
    );
  }

  return Array.from(bySymbol.entries())
    .map(([label, value]) => ({ label, value, sortKey: label }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 8);
}

function maxDrawdown(points: EquityPoint[]): number {
  let peak = 0;
  let drawdown = 0;
  for (const point of points) {
    peak = Math.max(peak, point.value);
    drawdown = Math.min(drawdown, point.value - peak);
  }
  return drawdown;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className={styles.chartTooltip}>
      <div>{label}</div>
      <strong className={value >= 0 ? styles.pos : styles.neg}>{fmtMoney(value)}</strong>
    </div>
  );
}

export function TradeAnalysis() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<TradeAnalysisPayload>({ report: null, trades: [] });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brokerage/tradestation/trade-analysis");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Failed to load TradeStation analysis");
        return;
      }
      setData({
        report: body.report ?? null,
        trades: Array.isArray(body.trades) ? body.trades : [],
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function uploadReport(file: File | null | undefined) {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/brokerage/tradestation/trade-analysis/import", {
        method: "POST",
        body: form,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "TradeStation report import failed");
        return;
      }
      setMessage(`Imported ${body.trades ?? 0} paired trades from TradeManager Analysis.`);
      await refresh();
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const equityCurve = useMemo(() => calculateEquityCurve(data.trades), [data.trades]);
  const monthlyReturns = useMemo(
    () => calculateMonthlyReturns(data.trades, data.report),
    [data.report, data.trades],
  );
  const symbolReturns = useMemo(() => calculateSymbolReturns(data.trades), [data.trades]);
  const tradeStructures = useMemo(
    () => calculateTradeStructures(data.trades),
    [data.trades],
  );

  const totalPnl = data.trades.reduce(
    (sum, trade) => sum + (numeric(trade.net_profit) ?? 0),
    0,
  );
  const winners = tradeStructures.filter((structure) => structure.netProfit > 0);
  const losers = tradeStructures.filter((structure) => structure.netProfit < 0);
  const grossWin = winners.reduce((sum, structure) => sum + structure.netProfit, 0);
  const grossLoss = Math.abs(
    losers.reduce((sum, structure) => sum + structure.netProfit, 0),
  );
  const winRate =
    tradeStructures.length > 0 ? (winners.length / tradeStructures.length) * 100 : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : null;
  const summaryTotalNetProfit = data.report
    ? summaryValue(data.report.performance_summary, "Total Net Profit")
    : null;
  const reportWinRate = data.report
    ? summaryNumber(data.report.performance_summary, "Percent Profitable")
    : null;
  const reportWinningTrades = data.report
    ? summaryNumber(data.report.performance_summary, "Winning Trades")
    : null;
  const reportLosingTrades = data.report
    ? summaryNumber(data.report.performance_summary, "Losing Trades")
    : null;

  return (
    <section>
      <div className={styles.reportHeader}>
        <div>
          <h2>TradeStation Trade Analysis</h2>
          <p>
            Upload the generated TradeManager Analysis `.xlsx` export. This uses
            TradeStation&apos;s paired trades and official report sheets instead of
            reconstructing trades from broker orders.
          </p>
          {data.report && (
            <div className={styles.reportMeta}>
              {data.report.source_filename ?? "TradeManager Analysis"} ·{" "}
              {fmtDate(data.report.first_trade_at)} to {fmtDate(data.report.last_trade_at)} ·{" "}
              imported {fmtDate(data.report.imported_at)}
            </div>
          )}
        </div>
        <div className={styles.reportActions}>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(event) => void uploadReport(event.target.files?.[0])}
          />
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Importing..." : data.report ? "Replace report" : "Import TS report"}
          </button>
          <button className={styles.btn} onClick={refresh} disabled={loading || uploading}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.note} style={{ borderLeftColor: "#ef4444", color: "#ef4444" }}>
          <strong>Trade analysis error:</strong> {error}
        </div>
      )}
      {message && (
        <div className={styles.note}>
          <strong>Import complete.</strong> {message}
        </div>
      )}

      {loading ? (
        <div className={styles.note}>Loading TradeStation analysis...</div>
      ) : !data.report ? (
        <div className={styles.note}>
          <strong>No TradeStation report imported yet.</strong> Export from TradeManager
          Analysis in TradeStation desktop, then upload the `.xlsx` here.
        </div>
      ) : (
        <>
          <div className={styles.analysisGrid}>
            <div className={styles.analysisMetric}>
              <span>Total P/L</span>
              <strong className={totalPnl >= 0 ? styles.pos : styles.neg}>
                {summaryTotalNetProfit ?? fmtMoney(totalPnl)}
              </strong>
              <em>
                {tradeStructures.length} structures · {data.trades.length} paired legs
              </em>
            </div>
            <div className={styles.analysisMetric}>
              <span>Win Rate</span>
              <strong>{reportWinRate == null ? fmtPercentValue(winRate) : fmtPercentValue(reportWinRate)}</strong>
              <em>
                {reportWinningTrades == null || reportLosingTrades == null
                  ? `${winners.length} winning structures / ${losers.length} losing`
                  : `${fmtNumber(reportWinningTrades, 0)} winning trades / ${fmtNumber(reportLosingTrades, 0)} losing`}
              </em>
            </div>
            <div className={styles.analysisMetric}>
              <span>Profit Factor</span>
              <strong>{profitFactor == null ? "-" : fmtNumber(profitFactor, 2)}</strong>
              <em>{fmtMoney(grossWin)} gross win</em>
            </div>
            <div className={styles.analysisMetric}>
              <span>Max Drawdown</span>
              <strong className={styles.neg}>{fmtMoney(maxDrawdown(equityCurve))}</strong>
              <em>Derived from imported closed trades</em>
            </div>
          </div>

          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span>Equity Curve</span>
                <em>Cumulative net profit</em>
              </div>
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityCurve}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" hide />
                    <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} width={54} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                    <Line type="monotone" dataKey="value" stroke="#22c55e" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span>Monthly Returns</span>
                <em>From TradeManager sheets</em>
              </div>
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyReturns}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} width={54} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                    <Bar dataKey="value">
                      {monthlyReturns.map((point, index) => (
                        <Cell
                          key={`${point.label}-${index}`}
                          fill={point.value >= 0 ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <span>Top Symbols</span>
                <em>By absolute P/L</em>
              </div>
              <div className={styles.chartBody}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={symbolReturns} layout="vertical">
                    <CartesianGrid stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                    <YAxis type="category" dataKey="label" width={74} />
                    <Tooltip content={<ChartTooltip />} />
                    <ReferenceLine x={0} stroke="var(--muted-foreground)" />
                    <Bar dataKey="value">
                      {symbolReturns.map((point, index) => (
                        <Cell
                          key={`${point.label}-${index}`}
                          fill={point.value >= 0 ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className={styles.tradeTableWrap}>
            <table className={styles.tradeTable}>
              <thead>
                <tr>
                  <th>Closed</th>
                  <th>Symbol</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>P/L</th>
                  <th>%</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {data.trades.slice(0, 80).map((trade) => {
                  const pnl = numeric(trade.net_profit) ?? 0;
                  return (
                    <tr key={trade.id}>
                      <td>{fmtDate(trade.closed_at)}</td>
                      <td>{trade.symbol}</td>
                      <td>{trade.trade_type ?? "-"}</td>
                      <td>{fmtNumber(trade.quantity, 0)}</td>
                      <td>{fmtNumber(trade.entry_price, 2)}</td>
                      <td>{fmtNumber(trade.exit_price, 2)}</td>
                      <td className={pnl >= 0 ? styles.pos : styles.neg}>{fmtMoney(pnl)}</td>
                      <td>{fmtNumber(trade.percent_profit, 1)}%</td>
                      <td>{fmtMoney(trade.commission)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
