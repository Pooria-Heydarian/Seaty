// Compares today's city with the last snapshot and writes a "town report"
// you can read out in the daily video:  reports/YYYY-MM-DD.md
//
// Run once a day, after `npm run fetch` (or just `npm run daily`).

import fs from 'node:fs';
import path from 'node:path';
import { readJSON, writeJSON, today, CITY_FILE, HISTORY_DIR, REPORTS_DIR } from './lib.mjs';

const city = readJSON(CITY_FILE);
if (!city) {
  console.error('No city data. Run `npm run fetch` (or `npm run demo`) first.');
  process.exit(1);
}

const date = today();
fs.mkdirSync(HISTORY_DIR, { recursive: true });
const snapshots = fs.readdirSync(HISTORY_DIR).filter((f) => f.endsWith('.json') && f.slice(0, 10) < date).sort();
const prevFile = snapshots.at(-1);
const prev = prevFile ? readJSON(path.join(HISTORY_DIR, prevFile)) : null;
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

const lines = [];
lines.push(`# Seaty town report: ${date}`, '');
lines.push(`**${city.residentCount.toLocaleString()} residents · ${city.totalFloors.toLocaleString()} floors · ${city.videoCount} videos**`, '');
if (prev) {
  lines.push(`Since ${prevFile.slice(0, 10)}: **+${newResidents.length} new residents**, **+${floorsAdded} floors** built.`, '');
} else {
  lines.push('_First report: no earlier snapshot to compare with, so everyone counts as new._', '');
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

console.log(lines.join('\n'));
console.log(`\nSaved ${reportFile}`);
