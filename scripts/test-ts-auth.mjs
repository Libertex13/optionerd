#!/usr/bin/env node
/**
 * Test whether a given redirect_uri is in the TradeStation app's allowed
 * callback list, without writing any OAuth code. We just hit the authorize
 * endpoint and observe how Auth0 responds:
 *
 *   valid redirect_uri  → 302 redirect to a login page
 *   invalid redirect_uri → 400/403, or redirect to an /error page
 *
 * Usage:
 *   node scripts/test-ts-auth.mjs <CLIENT_ID>
 */

const clientId = process.argv[2];
if (!clientId) {
  console.error("Usage: node scripts/test-ts-auth.mjs <CLIENT_ID>");
  process.exit(1);
}

const targets = [
  { label: "A (path-specific, what we want)",
    uri: "http://localhost:3000/api/brokerage/tradestation/callback" },
  { label: "B (bare origin, pre-approved)",
    uri: "http://localhost:3000" },
];

async function probe(redirectUri) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    audience: "https://api.tradestation.com",
    scope: "openid offline_access ReadAccount",
    state: "probe",
  });
  const url = `https://signin.tradestation.com/authorize?${params}`;
  const res = await fetch(url, { redirect: "manual" });
  const location = res.headers.get("location") || "";
  let verdict = "UNKNOWN";
  if (res.status >= 300 && res.status < 400) {
    if (/\/error/i.test(location) || /error=/i.test(location)) {
      verdict = "REJECTED";
    } else if (/login|u\/login|authorize/i.test(location)) {
      verdict = "ACCEPTED";
    } else {
      verdict = `REDIRECT (inspect)`;
    }
  } else if (res.status === 200) {
    const body = (await res.text()).slice(0, 400).replace(/\s+/g, " ");
    verdict = /mismatch|callback/i.test(body) ? "REJECTED" : `200 (inspect body)`;
    return { status: res.status, location, verdict, body };
  } else {
    verdict = `HTTP ${res.status} (likely rejected)`;
  }
  return { status: res.status, location, verdict };
}

for (const { label, uri } of targets) {
  console.log(`\n── Test ${label}`);
  console.log(`   redirect_uri: ${uri}`);
  try {
    const r = await probe(uri);
    console.log(`   status:       ${r.status}`);
    console.log(`   location:     ${r.location || "(none)"}`);
    console.log(`   verdict:      ${r.verdict}`);
    if (r.body) console.log(`   body[0..400]: ${r.body}`);
  } catch (err) {
    console.log(`   ERROR:        ${err.message}`);
  }
}
