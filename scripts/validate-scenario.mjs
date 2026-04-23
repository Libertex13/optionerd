#!/usr/bin/env node
/**
 * Validate scenario historical-data availability.
 *
 * Pings Polygon for the underlying range + each leg's option contract range.
 * Prints the first/last data points so we can sanity-check that real prices
 * exist for the dates and strikes we picked.
 *
 * Usage:
 *   node scripts/validate-scenario.mjs '<JSON>'
 *
 * JSON shape:
 *   {
 *     ticker: "TSLA",
 *     from: "2024-11-04",
 *     to:   "2024-12-20",
 *     legs: [
 *       { type: "call", strike: 250, expiry: "2024-12-20" },
 *       { type: "put",  strike: 200, expiry: "2024-12-20" }
 *     ]
 *   }
 *
 * Or pass a bare "TICKER FROM TO" to just probe the underlying.
 */

import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const txt = fs.readFileSync(envPath, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const API = "https://api.polygon.io";
const KEY = process.env.MASSIVE_API_KEY;
if (!KEY) {
  console.error("MASSIVE_API_KEY missing from env");
  process.exit(1);
}

function buildOcc(underlying, expiry, type, strike) {
  const [y, m, d] = expiry.split("-");
  const yymmdd = y.slice(2) + m + d;
  const cp = type === "call" ? "C" : "P";
  const k = Math.round(strike * 1000).toString().padStart(8, "0");
  return `O:${underlying}${yymmdd}${cp}${k}`;
}

async function fetchAggs(ticker, from, to) {
  const url = new URL(`${API}/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/day/${from}/${to}`);
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "5000");
  url.searchParams.set("apiKey", KEY);
  const r = await fetch(url);
  if (!r.ok) return { ok: false, status: r.status, body: await r.text() };
  const json = await r.json();
  return { ok: true, status: r.status, results: json.results ?? [], count: json.resultsCount ?? 0 };
}

function fmtRow(r) {
  if (!r) return "—";
  const iso = new Date(r.t).toISOString().slice(0, 10);
  return `${iso} o=${r.o} h=${r.h} l=${r.l} c=${r.c} v=${r.v}`;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Pass JSON config or 'TICKER FROM TO'");
    process.exit(1);
  }

  let cfg;
  try {
    cfg = JSON.parse(arg);
  } catch {
    const [ticker, from, to] = arg.split(/\s+/);
    cfg = { ticker, from, to, legs: [] };
  }

  const { ticker, from, to, legs = [] } = cfg;

  console.log(`\n== Underlying ${ticker} ${from}..${to} ==`);
  const u = await fetchAggs(ticker, from, to);
  if (!u.ok) {
    console.log(`  ERROR ${u.status}: ${u.body.slice(0, 200)}`);
  } else {
    const rs = u.results;
    console.log(`  ${rs.length} bars`);
    console.log(`  first: ${fmtRow(rs[0])}`);
    console.log(`  last:  ${fmtRow(rs[rs.length - 1])}`);
    if (rs.length > 0) {
      const hi = rs.reduce((a, b) => (b.h > a.h ? b : a));
      const lo = rs.reduce((a, b) => (b.l < a.l ? b : a));
      console.log(`  high:  ${fmtRow(hi)}`);
      console.log(`  low:   ${fmtRow(lo)}`);
    }
  }

  for (const leg of legs) {
    const occ = buildOcc(ticker, leg.expiry, leg.type, leg.strike);
    console.log(`\n== Leg ${leg.side ?? ""} ${leg.type.toUpperCase()} ${leg.strike} exp ${leg.expiry}  (${occ})  ${from}..${to} ==`);
    const r = await fetchAggs(occ, from, to);
    if (!r.ok) {
      console.log(`  ERROR ${r.status}: ${r.body.slice(0, 200)}`);
      continue;
    }
    console.log(`  ${r.results.length} bars`);
    if (r.results.length === 0) {
      console.log(`  NO DATA — strike likely didn't trade or wrong expiry`);
      continue;
    }
    console.log(`  first: ${fmtRow(r.results[0])}`);
    console.log(`  last:  ${fmtRow(r.results[r.results.length - 1])}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
