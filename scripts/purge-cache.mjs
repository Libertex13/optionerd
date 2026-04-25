#!/usr/bin/env node
/**
 * Purge all `optionerd:*` keys from the shared Upstash Redis instance.
 * Run after a deploy that changes the cached payload shape so users don't
 * see stale data parsed by the old code path.
 *
 * Usage:
 *   node scripts/purge-cache.mjs                      # purge everything
 *   node scripts/purge-cache.mjs --pattern "chain:*"  # narrower namespace
 *   node scripts/purge-cache.mjs --dry-run            # list keys without deleting
 */

import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
loadEnv();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing from env");
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const patternArg = (() => {
  const i = args.indexOf("--pattern");
  return i >= 0 ? args[i + 1] : null;
})();

const NS = "optionerd:";
const matchPattern = patternArg ? `${NS}${patternArg}` : `${NS}*`;

const redis = new Redis({ url, token });

console.log(`Scanning Upstash for ${matchPattern} ${dryRun ? "(dry run)" : ""}`);

let cursor = 0;
let total = 0;
let deleted = 0;

do {
  const [next, keys] = await redis.scan(cursor, { match: matchPattern, count: 200 });
  if (keys.length) {
    total += keys.length;
    if (dryRun) {
      for (const k of keys) console.log(`  would delete: ${k}`);
    } else {
      const n = await redis.del(...keys);
      deleted += n;
    }
  }
  cursor = Number(next);
} while (cursor !== 0);

if (dryRun) {
  console.log(`\n${total} keys would be deleted`);
} else {
  console.log(`\nfound ${total} keys, deleted ${deleted}`);
}
