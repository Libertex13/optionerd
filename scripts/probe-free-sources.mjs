#!/usr/bin/env node
/**
 * Compare three free options-data sources across the user's actual tickers.
 *
 * Endpoints tested:
 *   - Yahoo Finance: https://query1.finance.yahoo.com/v7/finance/options/{T}
 *   - Nasdaq:        https://api.nasdaq.com/api/quote/{T}/option-chain?assetclass=stocks
 *   - Optionwatch:   https://api.optionwatch.io/api/contracts/snapshot/{T}/{expiry}
 *
 * For each source × ticker we report: HTTP status, whether bid/ask are present,
 * number of contracts returned, whether greeks are present, what auth/headers
 * the endpoint requires.
 */

const TICKERS = ["AAPL", "KEYS", "SMCI", "CRWV", "TER", "FORM", "STLA", "GOOG", "ADBE", "CMG"];

const HEADERS_BROWSER = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "application/json",
};

const HEADERS_OPTIONWATCH = {
  ...HEADERS_BROWSER,
  "Origin": "https://optionwatch.io",
  "Referer": "https://optionwatch.io/",
};

async function probe(label, url, headers = HEADERS_BROWSER) {
  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    let body; try { body = JSON.parse(text); } catch { body = null; }
    return { label, url, status: res.status, body, raw: text.slice(0, 200) };
  } catch (err) {
    return { label, url, status: 0, err: err.message };
  }
}

function inspectYahoo(body) {
  const r = body?.optionChain?.result?.[0];
  if (!r) return { ok: false, note: body?.optionChain?.error?.description ?? "no result" };
  const opts = r.options?.[0];
  if (!opts) return { ok: false, note: "no expirations" };
  const calls = opts.calls ?? [];
  const sample = calls[Math.floor(calls.length / 2)] ?? calls[0];
  return {
    ok: true,
    expirations: r.expirationDates?.length ?? 0,
    callsThisExp: calls.length,
    putsThisExp: opts.puts?.length ?? 0,
    sampleHas: {
      bid: typeof sample?.bid === "number",
      ask: typeof sample?.ask === "number",
      lastPrice: typeof sample?.lastPrice === "number",
      impliedVolatility: typeof sample?.impliedVolatility === "number",
    },
    underlyingPrice: r.quote?.regularMarketPrice,
  };
}

function inspectNasdaq(body) {
  const rows = body?.data?.table?.rows ?? [];
  const dataRows = rows.filter(r => r.strike); // skip group-header rows
  if (!dataRows.length) return { ok: false, note: "empty rows" };
  const sample = dataRows[Math.floor(dataRows.length / 2)];
  return {
    ok: true,
    rowCount: dataRows.length,
    sampleHas: {
      callBid: !!sample.c_Bid && sample.c_Bid !== "--",
      callAsk: !!sample.c_Ask && sample.c_Ask !== "--",
      putBid: !!sample.p_Bid && sample.p_Bid !== "--",
      putAsk: !!sample.p_Ask && sample.p_Ask !== "--",
      strike: sample.strike,
    },
    lastTrade: body?.data?.lastTrade,
  };
}

function inspectOptionwatch(body) {
  const keys = Object.keys(body ?? {});
  if (!keys.length) return { ok: false, note: "no contracts in expiry" };
  const sample = body[keys[Math.floor(keys.length / 2)]];
  return {
    ok: true,
    contractCount: keys.length,
    sampleHas: {
      bidPrice: typeof sample?.bidPrice === "number",
      askPrice: typeof sample?.askPrice === "number",
      lastTradePrice: typeof sample?.lastTradePrice === "number",
      bidTime: typeof sample?.bidTime === "number",
      greeks: !!sample?.greeks?.delta,
    },
  };
}

function fmt(insp) {
  if (!insp || !insp.ok) return `MISS (${insp?.note ?? "?"})`;
  const flags = Object.entries(insp.sampleHas).map(([k, v]) => `${v ? "✓" : "✗"}${k}`).join(" ");
  const count = insp.contractCount ?? insp.rowCount ?? insp.callsThisExp ?? "?";
  return `${count} contracts | ${flags}`;
}

console.log("Probing free option-data sources for your portfolio tickers + AAPL baseline\n");

for (const t of TICKERS) {
  console.log(`══ ${t}`);

  const [yahoo, nasdaq, owListing] = await Promise.all([
    probe("yahoo", `https://query1.finance.yahoo.com/v7/finance/options/${t}`),
    probe("nasdaq", `https://api.nasdaq.com/api/quote/${t}/option-chain?assetclass=stocks&limit=20`),
    probe("ow-list", `https://api.optionwatch.io/api/contracts/${t}`, HEADERS_OPTIONWATCH),
  ]);

  // Yahoo
  if (yahoo.status === 200) {
    const i = inspectYahoo(yahoo.body);
    console.log(`   yahoo:        ${fmt(i)}${i.underlyingPrice ? ` | spot=${i.underlyingPrice}` : ""}`);
  } else {
    console.log(`   yahoo:        HTTP ${yahoo.status} ${yahoo.body?.optionChain?.error?.description ?? yahoo.raw?.slice(0, 80) ?? ""}`);
  }

  // Nasdaq
  if (nasdaq.status === 200) {
    const i = inspectNasdaq(nasdaq.body);
    console.log(`   nasdaq:       ${fmt(i)}${i.lastTrade ? ` | ${i.lastTrade.split("(")[0].trim()}` : ""}`);
  } else {
    console.log(`   nasdaq:       HTTP ${nasdaq.status} ${nasdaq.raw?.slice(0, 80) ?? ""}`);
  }

  // Optionwatch — need an expiry
  if (owListing.status === 200 && Array.isArray(owListing.body) && owListing.body.length) {
    const expiryGroup = owListing.body[0];
    const sampleExpiry = expiryGroup?.calls?.[0]?.expiration_date ?? expiryGroup?.puts?.[0]?.expiration_date;
    if (sampleExpiry) {
      const owSnap = await probe("ow-snap", `https://api.optionwatch.io/api/contracts/snapshot/${t}/${sampleExpiry}`, HEADERS_OPTIONWATCH);
      if (owSnap.status === 200) {
        const i = inspectOptionwatch(owSnap.body);
        console.log(`   optionwatch:  ${fmt(i)} | exp=${sampleExpiry}`);
      } else {
        console.log(`   optionwatch:  snap HTTP ${owSnap.status}`);
      }
    } else {
      console.log(`   optionwatch:  listing OK but no expiry parsed`);
    }
  } else {
    console.log(`   optionwatch:  HTTP ${owListing.status}`);
  }
}
