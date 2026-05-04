# TradeStation TradeManager Report Import

TradeStation's public/API order history can be shorter than the history shown in
the desktop TradeManager Analysis report. For full backtests and performance
analytics, use the generated TradeManager Analysis export as the historical
source of truth.

## Recommended Export

1. Open TradeStation desktop.
2. Open `TradeManager Analysis`.
3. Select the account and date range.
4. Click `Generate`.
5. Export the generated report to `.xlsx`.

The important workbook sheets are:

- `Trades List`: paired entry/exit trade rows, including net profit,
  cumulative net profit, run-up/drawdown, efficiency, and commission.
- `Performance Summary`: aggregate profit factor, total net profit, win rate,
  and related headline metrics.
- `Trade Analysis`: average trade, outliers, run-up/drawdown summaries.
- `Daily`, `Weekly`, `Monthly`, `Annual`: periodical returns.

## Fixture

The local sample used while building this flow is:

`C:\Users\User\Downloads\Tradestation-trade-report.xlsx`

Use `scripts/parse-tradestation-report.mjs` to transform it into JSON for tests
or future imports:

```bash
node scripts/parse-tradestation-report.mjs "C:\Users\User\Downloads\Tradestation-trade-report.xlsx"
```

## Product Behavior

- SnapTrade remains the primary multi-user broker integration.
- SnapTrade sync covers live account data, cash balances, and any activity
  ledger entries exposed by the broker connection.
- Historical trade analytics should come from the TradeStation `.xlsx`
  TradeManager report import because the workbook contains the broker's grouped
  trades and official performance metrics.
- The portfolio `Trade Analysis` tab uploads the workbook to
  `/api/brokerage/tradestation/trade-analysis/import`, stores the latest report
  in `tradestation_trade_reports` and `tradestation_trades`, and renders metrics,
  charts, and a closed-trade table from the imported data.
- Run `supabase/add_tradestation_trade_analysis.sql` before using the import.
