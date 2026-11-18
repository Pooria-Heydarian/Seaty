// Tourist counter: reads the real visitor total from GoatCounter's statistics API and saves it for the website
// (web/data/tourists.json). GoatCounter's public counter is cached for hours, so the site uses this number.
//
// Needs GOATCOUNTER_TOKEN in .env: GoatCounter → Settings → API → New token, with only "Read statistics" ticked.
// The site code comes from web/data/site.json. Runs in `npm run daily` / `npm run fetch`; never stops the run.

import path from 'node:path';
import { loadEnv, readJSON, writeJSON, ROOT } from './lib.mjs';

loadEnv();
const TOKEN = process.env.GOATCOUNTER_TOKEN;
const code = readJSON(path.join(ROOT, 'web', 'data', 'site.json'))?.goatcounter;
const OUT = path.join(ROOT, 'web', 'data', 'tourists.json');

try {
  if (!code) throw new Error('no GoatCounter code in web/data/site.json');
  if (!TOKEN) throw new Error('no GOATCOUNTER_TOKEN in .env');
  const url = new URL(`https://${code}.goatcounter.com/api/v0/stats/total`);
  url.searchParams.set('start', '2026-11-01T00:00:00Z'); // Seaty's counter started in November 2026 (a much earlier start is refused)
  url.searchParams.set('end', new Date(Date.now() + 86400000).toISOString().slice(0, 19) + 'Z');
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`GoatCounter API ${res.status}: ${body?.error || JSON.stringify(body?.errors || body) || ''}`);
  const total = Number(body?.total ?? body?.total_utc ?? 0);
  writeJSON(OUT, { total, updated: new Date().toISOString() });
  console.log(`Tourists: ${total} visitors so far`);
} catch (e) {
  console.warn(`Tourist count not updated: ${e.message}`);
}
