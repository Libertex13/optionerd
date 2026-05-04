#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const workbookPath = process.argv[2];

if (!workbookPath || !existsSync(workbookPath)) {
  console.error("Usage: node scripts/parse-tradestation-report.mjs <report.xlsx>");
  process.exit(1);
}

function unzipText(entry) {
  return execFileSync("unzip", ["-p", workbookPath, entry], { encoding: "utf8" });
}

function attr(tag, name) {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? "";
}

function decodeXml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function columnIndex(ref) {
  const letters = String(ref).match(/[A-Z]+/)?.[0] ?? "";
  return [...letters].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function excelDate(serial) {
  const value = Number(serial);
  if (!Number.isFinite(value) || value < 30000) return null;
  return new Date((value - 25569) * 86400 * 1000).toISOString();
}

function parseDate(value) {
  const serialDate = excelDate(value);
  if (serialDate) return serialDate;

  const match = String(value).match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) return null;

  return new Date(
    Date.UTC(
      Number(match[3]),
      Number(match[1]) - 1,
      Number(match[2]),
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0),
    ),
  ).toISOString();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const workbookXml = unzipText("xl/workbook.xml");
const relsXml = unzipText("xl/_rels/workbook.xml.rels");
const relationships = new Map(
  [...relsXml.matchAll(/<Relationship\b[^>]*>/g)].map(([tag]) => [
    attr(tag, "Id"),
    attr(tag, "Target"),
  ]),
);

let sharedStrings = [];
try {
  const sharedXml = unzipText("xl/sharedStrings.xml");
  sharedStrings = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml(
      [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((textMatch) => textMatch[1])
        .join(""),
    ),
  );
} catch {
  sharedStrings = [];
}

function cellValue(cellXml) {
  const reference = attr(cellXml, "r");
  const type = attr(cellXml, "t");
  const rawValue = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";

  return {
    column: columnIndex(reference),
    value: type === "s" ? sharedStrings[Number(rawValue)] ?? "" : decodeXml(rawValue),
  };
}

function sheetRows(sheetName) {
  const sheetTag = [...workbookXml.matchAll(/<sheet\b[^>]*>/g)]
    .map(([tag]) => ({ name: attr(tag, "name"), relationshipId: attr(tag, "r:id") }))
    .find((sheet) => sheet.name === sheetName);

  if (!sheetTag) return [];

  const target = relationships.get(sheetTag.relationshipId);
  if (!target) return [];

  const sheetXml = unzipText(`xl/${target.replace(/^xl\//, "")}`);
  return [...sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b[^>]*>[\s\S]*?<\/c>/g)) {
      const cell = cellValue(cellMatch[0]);
      row[cell.column] = cell.value;
    }
    return row.map((value) => value ?? "");
  });
}

function tradeTypeToAction(type) {
  const normalized = String(type).toLowerCase();
  if (normalized.includes("buy")) return "BUY";
  if (normalized.includes("sell")) return "SELL";
  return String(type).toUpperCase();
}

const tradeRows = sheetRows("Trades List").slice(2);
const tradeActionRows = tradeRows
  .map((row) => ({
    tradeNumber: row[0] ? Number(row[0]) : null,
    type: row[1] ?? "",
    action: tradeTypeToAction(row[1]),
    time: parseDate(row[2]),
    account: row[3] ?? "",
    symbol: row[4] ?? "",
    price: toNumber(row[5]),
    quantityOrProfitLoss: toNumber(row[7]),
    netProfitOrCumulative: toNumber(row[8]),
    percentProfit: toNumber(row[9]),
    runupOrDrawdown: toNumber(row[10]),
    efficiency: toNumber(row[11]),
    totalEfficiency: toNumber(row[12]),
    commission: toNumber(row[13]),
  }))
  .filter((row) => row.type && row.symbol && row.time);

function buildPairedTrades(rows) {
  const paired = [];
  let openRow = null;

  for (const row of rows) {
    if (row.tradeNumber != null) {
      openRow = row;
      continue;
    }

    if (!openRow) continue;

    paired.push({
      tradeNumber: openRow.tradeNumber,
      account: openRow.account,
      symbol: openRow.symbol,
      type: `${openRow.type} / ${row.type}`,
      openedAt: openRow.time,
      closedAt: row.time,
      entryAction: openRow.action,
      exitAction: row.action,
      entryPrice: openRow.price,
      exitPrice: row.price,
      quantity: openRow.quantityOrProfitLoss,
      netProfit: openRow.netProfitOrCumulative,
      percentProfit: openRow.percentProfit,
      runupOrDrawdown: openRow.runupOrDrawdown,
      efficiency: openRow.efficiency,
      totalEfficiency: openRow.totalEfficiency,
      commission: openRow.commission,
      entryRow: openRow,
      exitRow: row,
    });

    openRow = null;
  }

  return paired;
}

function keyValueSection(sheetName) {
  return sheetRows(sheetName)
    .map((row) => row.filter((value) => value !== ""))
    .filter((row) => row.length > 0);
}

function periodRows(sheetName) {
  const rows = sheetRows(sheetName);
  const headerIndex = rows.findIndex(
    (row) => row[0] === "Period" && row[1] === "Net Profit",
  );
  if (headerIndex < 0) return [];

  return rows
    .slice(headerIndex + 1)
    .filter((row) => row[0] && row[1] != null && row[1] !== "")
    .map((row) => ({
      period: parseDate(row[0]) ?? row[0],
      netProfit: toNumber(row[1]),
      percentGain: toNumber(row[2]),
      profitFactor: toNumber(row[3]),
      trades: toNumber(row[4]),
      percentProfitable: toNumber(row[5]),
    }));
}

const pairedTrades = buildPairedTrades(tradeActionRows);

console.log(
  JSON.stringify(
    {
      source: {
        broker: "tradestation",
        report: "TradeManager Analysis",
        workbookPath,
      },
      counts: {
        tradeActionRows: tradeActionRows.length,
        pairedTrades: pairedTrades.length,
      },
      tradeActionRows,
      pairedTrades,
      performanceSummary: keyValueSection("Performance Summary"),
      tradeAnalysis: keyValueSection("Trade Analysis"),
      periodicalReturns: {
        daily: periodRows("Daily"),
        weekly: periodRows("Weekly"),
        monthly: periodRows("Monthly"),
        annual: periodRows("Annual"),
      },
    },
    null,
    2,
  ),
);
