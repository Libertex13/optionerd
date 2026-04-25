#!/usr/bin/env node
/**
 * Probe Massive (Polygon) quote-source freshness per option contract.
 *
 * For each symbol, hits every endpoint that could produce a "current mark"
 * and prints bid/ask/mid/last + the age of the most recent timestamp. Lets
 * us pick the endpoint whose marks are freshest and closest to TradeStation.
 *
 * Usage:
 *   node scripts/probe-quote-sources.mjs
 */

import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
loadEnv();

const API = "https://api.polygon.io";
const KEY = process.env.MASSIVE_API_KEY;
if (!KEY) {
  console.error("MASSIVE_API_KEY missing");
  process.exit(1);
}

// Symbols taken from the TradeStation screenshot. `tsMid` = implied mid from
// TS MARKET VALUE / qty / 100, used as ground-truth comparator.
const SYMBOLS = [
  { label: "KEYS 350C Jun (works)",        underlying: "KEYS", expiry: "2026-06-18", type: "call", strike: 350, tsLast: 31.00, tsMid: 30.25 },
  { label: "TER 420C May (bug: +$0)",      underlying: "TER",  expiry: "2026-05-15", type: "call", strike: 420, tsLast: 36.00, tsMid: 35.80 },
  { label: "SMCI 5P Sep (bug: +$0)",       underlying: "SMCI", expiry: "2026-09-18", type: "put",  strike: 5,   tsLast: 0.20,  tsMid: 0.12 },
  { label: "CRWV 105P Jun (wrong)",        underlying: "CRWV", expiry: "2026-06-18", type: "put",  strike: 105, tsLast: 12.82, tsMid: 12.625 },
  { label: "CRWV 105P May (short, wrong)", underlying: "CRWV", expiry: "2026-05-15", type: "put",  strike: 105, tsLast: 8.20,  tsMid: 8.225 },
  { label: "GOOG 340C Jun (wrong)",        underlying: "GOOG", expiry: "2026-06-18", type: "call", strike: 340, tsLast: 19.69, tsMid: 19.70 },
  { label: "FORM 155C May (slightly off)", underlying: "FORM", expiry: "2026-05-15", type: "call", strike: 155, tsLast: 16.75, tsMid: 16.45 },
  { label: "ADBE 230P Jun (slightly off)", underlying: "ADBE", expiry: "2026-06-18", type: "put",  strike: 230, tsLast: 11.40, tsMid: 11.225 },
];

function buildOcc(underlying, expiry, type, strike) {
  const [y, m, d] = expiry.split("-");
  const yymmdd = y.slice(2) + m + d;
  const cp = type === "call" ? "C" : "P";
  const strike8 = String(Math.round(strike * 1000)).padStart(8, "0");
  return `O:${underlying}${yymmdd}${cp}${strike8}`;
}

async function get(path, params = {}) {
  const url = new URL(path, API);
  url.searchParams.set("apiKey", KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  try {
    const res = await fetch(url.toString());
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = { _raw: text.slice(0, 300) }; }
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: { _error: err.message } };
  }
}

function fmtAge(nanos) {
  if (!nanos || !Number.isFinite(nanos)) return "—";
  const ms = Math.floor(nanos / 1e6);
  const ageSec = (Date.now() - ms) / 1000;
  if (!Number.isFinite(ageSec) || ageSec < 0) return "future?";
  if (ageSec < 60) return `${ageSec.toFixed(0)}s`;
  if (ageSec < 3600) return `${(ageSec / 60).toFixed(1)}m`;
  if (ageSec < 86_400) return `${(ageSec / 3600).toFixed(1)}h`;
  return `${(ageSec / 86_400).toFixed(1)}d`;
}

function fmtMs(ms) {
  if (!ms || !Number.isFinite(ms)) return "—";
  const ageSec = (Date.now() - ms) / 1000;
  if (!Number.isFinite(ageSec) || ageSec < 0) return "future?";
  if (ageSec < 60) return `${ageSec.toFixed(0)}s`;
  if (ageSec < 3600) return `${(ageSec / 60).toFixed(1)}m`;
  if (ageSec < 86_400) return `${(ageSec / 3600).toFixed(1)}h`;
  return `${(ageSec / 86_400).toFixed(1)}d`;
}

function num(x, d = 2) {
  return typeof x === "number" && Number.isFinite(x) ? x.toFixed(d) : "—";
}

async function probeContractSnapshot(underlying, occ) {
  const { status, body } = await get(`/v3/snapshot/options/${underlying}/${occ}`);
  if (status !== 200) return { status, note: body?.error || body?.message || body?._raw };
  const r = body.results || {};
  const lq = r.last_quote || {};
  const lt = r.last_trade || {};
  const day = r.day || {};
  const bid = lq.bid, ask = lq.ask;
  const mid = lq.midpoint || (bid > 0 && ask > 0 ? (bid + ask) / 2 : null);
  return {
    status,
    bid: num(bid), ask: num(ask),
    mid: num(mid), last: num(lt.price ?? day.close),
    quoteAge: fmtAge(lq.last_updated),
    tradeAge: fmtAge(lt.sip_timestamp),
    dayClose: num(day.close),
    ivGreeks: !!(r.implied_volatility || r.greeks?.delta),
  };
}

async function probeChainSnapshot(underlying, occ) {
  // Chain endpoint — same one our app uses. Page through looking for our contract.
  let next = `/v3/snapshot/options/${underlying}?limit=250`;
  while (next) {
    const { status, body } = await get(next);
    if (status !== 200) return { status, note: body?.error || body?.message };
    for (const r of body.results || []) {
      if (r.details?.ticker === occ) {
        const lq = r.last_quote || {};
        const lt = r.last_trade || {};
        const day = r.day || {};
        const bid = lq.bid, ask = lq.ask;
        const mid = lq.midpoint || (bid > 0 && ask > 0 ? (bid + ask) / 2 : null);
        return {
          status,
          bid: num(bid), ask: num(ask),
          mid: num(mid), last: num(lt.price ?? day.close),
          quoteAge: fmtAge(lq.last_updated),
          tradeAge: fmtAge(lt.sip_timestamp),
          dayClose: num(day.close),
        };
      }
    }
    if (!body.next_url) return { status, note: "contract not in chain" };
    // next_url is absolute
    const u = new URL(body.next_url);
    next = u.pathname + u.search;
  }
  return { status: 0, note: "exhausted pagination" };
}

async function probeQuotesV3(occ) {
  // Historical NBBO quotes — delayed but real bid/ask stream.
  const { status, body } = await get(`/v3/quotes/${occ}`, { order: "desc", limit: 1 });
  if (status !== 200) return { status, note: body?.error || body?.message || body?._raw };
  const q = body.results?.[0];
  if (!q) return { status, note: "no quotes returned" };
  const bid = q.bid_price, ask = q.ask_price;
  const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : null;
  return {
    status,
    bid: num(bid), ask: num(ask),
    mid: num(mid),
    quoteAge: fmtAge(q.sip_timestamp),
    exch: `${q.bid_exchange ?? "?"}/${q.ask_exchange ?? "?"}`,
  };
}

async function probeLastTradeV2(occ) {
  const { status, body } = await get(`/v2/last/trade/${occ}`);
  if (status !== 200) return { status, note: body?.error || body?.message || body?._raw };
  const t = body.results || body;
  const price = t?.p ?? t?.price;
  const ts = t?.t ?? t?.sip_timestamp;
  return { status, last: num(price), tradeAge: fmtAge(ts) };
}

async function probeTradesV3(occ) {
  const { status, body } = await get(`/v3/trades/${occ}`, { order: "desc", limit: 1 });
  if (status !== 200) return { status, note: body?.error || body?.message || body?._raw };
  const t = body.results?.[0];
  if (!t) return { status, note: "no trades" };
  return { status, last: num(t.price), tradeAge: fmtAge(t.sip_timestamp), size: t.size };
}

async function probePrevDay(occ) {
  const { status, body } = await get(`/v2/aggs/ticker/${occ}/prev`);
  if (status !== 200) return { status, note: body?.error || body?.message || body?._raw };
  const r = body.results?.[0];
  if (!r) return { status, note: "no prev day" };
  return { status, close: num(r.c), vwap: num(r.vw), day: fmtMs(r.t) };
}

async function probeUnified(occ) {
  const { status, body } = await get(`/v3/snapshot`, { "ticker.any_of": occ });
  if (status !== 200) return { status, note: body?.error || body?.message || body?._raw };
  const r = body.results?.[0];
  if (!r) return { status, note: "no result" };
  const lq = r.last_quote || {};
  const lt = r.last_trade || {};
  const sess = r.session || {};
  const bid = lq.bid, ask = lq.ask;
  const mid = lq.midpoint || (bid > 0 && ask > 0 ? (bid + ask) / 2 : null);
  return {
    status,
    bid: num(bid), ask: num(ask),
    mid: num(mid), last: num(lt.price ?? sess.close),
    quoteAge: fmtAge(lq.last_updated ?? lq.timeframe_ns),
    tradeAge: fmtAge(lt.sip_timestamp ?? lt.timestamp),
  };
}

function line(label, res) {
  if (!res) return `    ${label.padEnd(20)} —`;
  if (res.status !== 200) return `    ${label.padEnd(20)} HTTP ${res.status} ${res.note ?? ""}`;
  const parts = [];
  if ("bid" in res) parts.push(`bid ${res.bid}`);
  if ("ask" in res) parts.push(`ask ${res.ask}`);
  if ("mid" in res) parts.push(`mid ${res.mid}`);
  if ("last" in res) parts.push(`last ${res.last}`);
  if ("close" in res) parts.push(`close ${res.close}`);
  if ("dayClose" in res) parts.push(`dayClose ${res.dayClose}`);
  if ("quoteAge" in res) parts.push(`qAge ${res.quoteAge}`);
  if ("tradeAge" in res) parts.push(`tAge ${res.tradeAge}`);
  if (res.note) parts.push(`(${res.note})`);
  return `    ${label.padEnd(20)} ${parts.join("  ")}`;
}

for (const sym of SYMBOLS) {
  const occ = buildOcc(sym.underlying, sym.expiry, sym.type, sym.strike);
  console.log(`\n══ ${sym.label}`);
  console.log(`   ${occ}`);
  console.log(`   TS last ${num(sym.tsLast)}  TS mid ${num(sym.tsMid)}`);

  const [snap, chain, quotes, lastT, trades, prev, unif] = await Promise.all([
    probeContractSnapshot(sym.underlying, occ),
    probeChainSnapshot(sym.underlying, occ),
    probeQuotesV3(occ),
    probeLastTradeV2(occ),
    probeTradesV3(occ),
    probePrevDay(occ),
    probeUnified(occ),
  ]);

  console.log(line("contract snapshot", snap));
  console.log(line("chain snapshot",    chain));
  console.log(line("quotes v3",         quotes));
  console.log(line("last trade v2",     lastT));
  console.log(line("trades v3",         trades));
  console.log(line("prev day agg",      prev));
  console.log(line("unified snapshot",  unif));
}

console.log("\nDone. Look for the endpoint whose mid/bid+ask is closest to TS and whose age is smallest.");
