#!/usr/bin/env node
/**
 * Definitive check: is our Massive key actually entitled to options quotes?
 *
 * Tests a very liquid near-the-money option (SPY current month) so we can't
 * blame "illiquid contract" for missing last_quote. Also prints the full
 * raw response and response headers so we can see anything tier-related.
 */

import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  for (const l of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
loadEnv();

const API = "https://api.polygon.io";
const KEY = process.env.MASSIVE_API_KEY;
if (!KEY) { console.error("MASSIVE_API_KEY missing"); process.exit(1); }

async function call(label, urlPath, params = {}) {
  const url = new URL(urlPath, API);
  url.searchParams.set("apiKey", KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text.slice(0, 400); }
  console.log(`\n── ${label}`);
  console.log(`   ${urlPath}`);
  console.log(`   status ${res.status}`);
  // Headers that sometimes carry plan/entitlement info
  for (const h of ["x-ratelimit-limit", "x-ratelimit-remaining", "x-request-id", "polygon-plan", "x-plan"]) {
    const v = res.headers.get(h);
    if (v) console.log(`   ${h}: ${v}`);
  }
  return { status: res.status, body };
}

(async () => {
  // 1. Very liquid contract — SPY at-the-money, near-term. If ANYthing gets
  //    a last_quote, this does. Using a known-liquid generic strike; the
  //    exact expiry doesn't matter for entitlement testing.
  const liquid = "O:SPY260619C00500000"; // SPY 500C Jun 2026 — always liquid
  const r1 = await call("SPY 500C contract snapshot (liquid)", `/v3/snapshot/options/SPY/${liquid}`);
  if (r1.status === 200 && r1.body?.results) {
    const r = r1.body.results;
    console.log(`   has last_quote:    ${"last_quote" in r}`);
    console.log(`   has last_trade:    ${"last_trade" in r}`);
    console.log(`   has fmv:           ${"fmv" in r}`);
    console.log(`   underlying_asset keys: ${Object.keys(r.underlying_asset ?? {}).join(", ")}`);
    console.log(`   day keys:           ${Object.keys(r.day ?? {}).join(", ")}`);
    console.log(`   full results dump:`);
    console.log(JSON.stringify(r, null, 2).split("\n").map(l => "     " + l).join("\n"));
  }

  // 2. /v3/quotes/{option} — this 403s if plan doesn't include quotes.
  const r2 = await call("v3 quotes (entitlement check)", `/v3/quotes/${liquid}`, { limit: 1 });
  if (r2.status === 200) console.log(`   ✅ quotes ENTITLED — this contradicts everything`);
  else if (r2.status === 403) console.log(`   ❌ quotes NOT entitled (expected on Starter)`);
  else console.log(`   ? status ${r2.status}: ${JSON.stringify(r2.body).slice(0, 200)}`);

  // 3. /v2/last/trade/{option} — 403s if plan doesn't include trades.
  const r3 = await call("v2 last trade (entitlement check)", `/v2/last/trade/${liquid}`);
  if (r3.status === 200) console.log(`   ✅ trades ENTITLED`);
  else if (r3.status === 403) console.log(`   ❌ trades NOT entitled`);

  // 4. Try SPY stock snapshot — confirms the stocks entitlement level.
  const r4 = await call("SPY stock snapshot", `/v3/snapshot/stocks/SPY`);
  if (r4.status === 200 && r4.body?.results) {
    const r = r4.body.results;
    console.log(`   has last_quote:    ${"last_quote" in r}`);
    console.log(`   has last_trade:    ${"last_trade" in r}`);
  }

  // 5. Aggregates (always available on Starter) — sanity, confirms key works.
  const r5 = await call("SPY prev day agg (sanity)", `/v2/aggs/ticker/SPY/prev`);
  if (r5.status === 200) console.log(`   ✅ key works, aggregates accessible`);

  console.log(`\nConclusion:`);
  console.log(`  - If (1) shows last_quote present → you ARE getting bid/ask from snapshot, something else is wrong in our code`);
  console.log(`  - If (1) is bare and (2) is 403 → definitively no quotes on current plan`);
})();
