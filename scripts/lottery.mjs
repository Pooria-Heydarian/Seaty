// Monthly draw that anyone can verify.
//
//   npm run lottery -- --seed "<public value>" [--tickets floors] [--month 2026-11]
//
// --seed     Something nobody (including you) knows in advance and everyone can
//            check later, e.g. the Bitcoin block hash at a pre-announced height,
//            or the closing value of a public index on the draw date.
//            ANNOUNCE which seed source you'll use BEFORE the draw.
// --tickets  "equal" (default): one ticket per resident.
//            "floors": one ticket per floor (rewards loyal commenters).
// --month    Label for the output files (default: current month).
//
// Writes lottery/<month>-entrants.json (publish this!) and lottery/<month>-result.json.
// Anyone can re-run this script with the same entrant list + seed and get the same winner.

import crypto from 'node:crypto';
import path from 'node:path';
import { readJSON, writeJSON, CITY_FILE, LOTTERY_DIR } from './lib.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const seed = args.seed;
const mode = args.tickets || 'equal';
const month = args.month || new Date().toISOString().slice(0, 7);

if (!seed) {
  console.error('Usage: npm run lottery -- --seed "<public random value>" [--tickets equal|floors] [--month YYYY-MM]');
  process.exit(1);
}
if (!['equal', 'floors'].includes(mode)) {
  console.error('--tickets must be "equal" or "floors"');
  process.exit(1);
}

const city = readJSON(CITY_FILE);
if (!city) {
  console.error('No city data. Run `npm run fetch` first.');
  process.exit(1);
}
if (city.mode === 'demo') console.warn('⚠ Running on DEMO data. Use real data (npm run fetch) for the real draw.\n');

// Stable ordering so the result is reproducible.
const entrants = [...city.residents]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((r) => ({ id: r.id, name: r.name, tickets: mode === 'floors' ? r.floors : 1 }));
const totalTickets = entrants.reduce((s, e) => s + e.tickets, 0);
const listHash = crypto.createHash('sha256').update(JSON.stringify(entrants)).digest('hex');

// winning ticket = SHA-256(seed + entrant list hash) mod total tickets
const digest = crypto.createHash('sha256').update(`${seed}|${listHash}`).digest('hex');
const ticket = Number(BigInt('0x' + digest) % BigInt(totalTickets));

let acc = 0;
const winner = entrants.find((e) => (acc += e.tickets) > ticket);

const result = {
  month,
  drawnAt: new Date().toISOString(),
  seed,
  ticketMode: mode,
  entrantCount: entrants.length,
  totalTickets,
  entrantListSha256: listHash,
  digest,
  winningTicket: ticket,
  winner: { id: winner.id, name: winner.name, tickets: winner.tickets },
};

writeJSON(path.join(LOTTERY_DIR, `${month}-entrants.json`), entrants);
writeJSON(path.join(LOTTERY_DIR, `${month}-result.json`), result);

console.log(`Entrants: ${entrants.length} · tickets: ${totalTickets} (${mode})`);
console.log(`Entrant list SHA-256: ${listHash}`);
console.log(`Winning ticket #${ticket}`);
console.log(`\n🎉 Winner: ${winner.name}  (${winner.id})\n`);
console.log(`Saved lottery/${month}-entrants.json and lottery/${month}-result.json`);
