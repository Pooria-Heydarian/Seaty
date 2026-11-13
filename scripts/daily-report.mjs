// Compares today's city with the last snapshot and writes a "town report"
// you can read out in the daily video:  reports/YYYY-MM-DD.md
//
// Run once a day, after `npm run fetch` (or just `npm run daily`).

import fs from 'node:fs';
import path from 'node:path';
import { readJSON, writeJSON, today, ROOT, CITY_FILE, CHANGES_FILE, SPECIALS_FILE, HISTORY_DIR, REPORTS_DIR } from './lib.mjs';

const city = readJSON(CITY_FILE);
if (!city) {
  console.error('No city data. Run `npm run fetch` (or `npm run demo`) first.');
  process.exit(1);
}

const date = today();
fs.mkdirSync(HISTORY_DIR, { recursive: true });
// Only compare with snapshots of the same kind (never mix demo data with real data).
const snapshots = fs
  .readdirSync(HISTORY_DIR)
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(0, 10) < date)
  .sort()
  .filter((f) => readJSON(path.join(HISTORY_DIR, f))?.mode === city.mode);
const prevFile = snapshots.at(-1);
const prev = prevFile ? readJSON(path.join(HISTORY_DIR, prevFile)) : null;
const dayNumber = snapshots.length + 1;
const prevById = new Map((prev?.residents || []).map((r) => [r.id, r]));

const newResidents = city.residents.filter((r) => !prevById.has(r.id));
const grew = city.residents
  .filter((r) => prevById.has(r.id) && r.floors > prevById.get(r.id).floors)
  .map((r) => ({ ...r, added: r.floors - prevById.get(r.id).floors }))
  .sort((a, b) => b.added - a.added || b.floors - a.floors);

const ranked = [...city.residents].sort((a, b) => b.floors - a.floors || a.joined.localeCompare(b.joined));
const prevRank = new Map(
  [...(prev?.residents || [])].sort((a, b) => b.floors - a.floors || a.joined.localeCompare(b.joined)).map((r, i) => [r.id, i + 1]),
);
const floorsAdded = city.totalFloors - (prev?.totalFloors || 0);

// Special buildings & upgrades (web/data/specials.json) that are new since the last report.
// data/specials-seen.json remembers when each one was first shown (per data mode, so demo runs don't count).
const specials = readJSON(SPECIALS_FILE, { landmarks: [], upgrades: [] });
const SEEN_FILE = path.join(ROOT, 'data', 'specials-seen.json');
const seenAll = readJSON(SEEN_FILE, {});
const seen = (seenAll[city.mode] ||= {});
const norm = (s) => String(s || '').trim().replace(/^@/, '').toLowerCase();
const findResident = (who) => city.residents.find((r) => r.id === who || norm(r.name) === norm(who));
const isNew = (key) => !seen[key] || seen[key] === date; // a re-run on the same day still shows it
const newSpecials = [];
(specials.landmarks || []).slice(0, 8).forEach((l) => {
  const key = `landmark:${l.id}`;
  if (isNew(key)) { newSpecials.push({ kind: 'landmark', id: l.id, name: l.name, requestedBy: l.requestedBy || '' }); seen[key] = date; }
});
for (const u of specials.upgrades || []) {
  const r = findResident(u.resident);
  if (!r) continue; // shows up once that person lives in the city
  const key = `upgrade:${r.id}:${u.type}`;
  if (isNew(key)) { newSpecials.push({ kind: 'upgrade', id: r.id, name: r.name, type: u.type }); seen[key] = date; }
}
writeJSON(SEEN_FILE, seenAll);

const lines = [];
lines.push(`# Seaty town report: ${date}`, '');
lines.push(`**${city.residentCount.toLocaleString()} residents · ${city.totalFloors.toLocaleString()} floors · ${city.videoCount} video${city.videoCount === 1 ? "" : "s"}**`, '');
if (prev) {
  lines.push(`Since ${prevFile.slice(0, 10)}: **+${newResidents.length} new residents**, **+${floorsAdded} floors** built.`, '');
} else {
  lines.push('_First report: no earlier snapshot to compare with, so everyone counts as new._', '');
}

if (newSpecials.length) {
  const UP = { pool: 'a swimming pool', 'apple-tree': 'an apple tree', capybara: 'a capybara' };
  lines.push('## ✨ New in town');
  for (const s of newSpecials) {
    lines.push(s.kind === 'landmark'
      ? `- **${s.name}** opened${s.requestedBy ? ` (requested by ${s.requestedBy})` : ''}`
      : `- **${s.name}** got ${UP[s.type] || s.type}`);
  }
  lines.push('');
}

lines.push('## 🏠 New residents');
if (newResidents.length) {
  const shown = newResidents.slice(0, 30).map((r) => r.name).join(', ');
  lines.push(shown + (newResidents.length > 30 ? ` … and ${newResidents.length - 30} more` : ''), '');
} else lines.push('Nobody moved in today.', '');

lines.push('## 🏗️ Biggest builders today');
if (grew.length) grew.slice(0, 10).forEach((r) => lines.push(`- **${r.name}**: +${r.added} → ${r.floors} floors`));
else lines.push('No new floors today.');
lines.push('');

lines.push('## 🏙️ Skyline: tallest towers');
ranked.slice(0, 10).forEach((r, i) => {
  const before = prevRank.get(r.id);
  const move = !before ? ' 🆕' : before > i + 1 ? ` ▲${before - (i + 1)}` : before < i + 1 ? ` ▼${i + 1 - before}` : '';
  lines.push(`${i + 1}. **${r.name}**: ${r.floors} floors${move}`);
});
lines.push('');

const loyal = ranked.filter((r) => r.floors === city.videoCount).length;
lines.push('## 📊 Fun facts');
lines.push(`- Average building height: ${(city.totalFloors / Math.max(1, city.residentCount)).toFixed(1)} floors`);
lines.push(`- Residents who commented on every single video: ${loyal}`);
lines.push(`- Single-floor houses (one comment so far): ${city.residents.filter((r) => r.floors === 1).length}`);
lines.push('');
lines.push('_Comment on today\'s video to add a floor to your building!_');

fs.mkdirSync(REPORTS_DIR, { recursive: true });
const reportFile = path.join(REPORTS_DIR, `${date}.md`);
fs.writeFileSync(reportFile, lines.join('\n') + '\n');
writeJSON(path.join(HISTORY_DIR, `${date}.json`), city);

// Everything the daily video needs (web/video.html reads this).
const plotOf = new Map(city.residents.map((r, i) => [r.id, i + 1]));
writeJSON(CHANGES_FILE, {
  date,
  day: dayNumber,
  firstReport: !prev,
  residentCount: city.residentCount,
  totalFloors: city.totalFloors,
  videoCount: city.videoCount,
  floorsAdded,
  newResidents: newResidents.map((r) => ({ id: r.id, name: r.name, comment: r.comment || '', plot: plotOf.get(r.id), floors: r.floors })),
  grew: grew.map((r) => ({ id: r.id, name: r.name, comment: r.comment || '', from: r.floors - r.added, to: r.floors })),
  top: ranked.slice(0, 3).map((r) => ({ id: r.id, name: r.name, floors: r.floors })),
  newSpecials,
});

console.log(lines.join('\n'));
console.log(`\nSaved ${reportFile}`);
