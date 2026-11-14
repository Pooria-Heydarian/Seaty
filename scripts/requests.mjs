// Daily step 2: lists every new comment (since the last update) with that person's house info,
// so the daily session can spot special requests and write replies.
//
//   npm run requests   ->  comments/today.md   (run after `npm run fetch`)

import fs from 'node:fs';
import path from 'node:path';
import { readJSON, ROOT, CITY_FILE, SPECIALS_FILE, NEW_COMMENTS_FILE } from './lib.mjs';

const input = readJSON(NEW_COMMENTS_FILE);
if (!input) {
  console.error('No comments/new-comments.json yet. Run `npm run fetch` first.');
  process.exit(1);
}
const city = readJSON(CITY_FILE, { residents: [] });
const specials = readJSON(SPECIALS_FILE, {});
const norm = (s) => String(s || '').trim().replace(/^@/, '').toLowerCase();
const mine = (list, r) => (list || []).filter((x) => x.resident === r.id || norm(x.resident) === norm(r.name));

const ranked = [...city.residents].sort((a, b) => b.floors - a.floors || a.joined.localeCompare(b.joined));
const rankOf = new Map(ranked.map((r, i) => [r.id, i + 1]));
const byId = new Map(city.residents.map((r, i) => [r.id, { ...r, plot: i + 1 }]));

// Group comments by person
const people = new Map();
for (const c of input.comments) {
  if (!people.has(c.authorId)) people.set(c.authorId, []);
  people.get(c.authorId).push(c);
}

const md = [
  `# New comments: ${input.comments.length} from ${people.size} people`,
  '',
  `Written between ${input.since?.slice(0, 16).replace('T', ' ')} and ${input.cutoff?.slice(0, 16).replace('T', ' ')} UTC.`,
  `City: ${city.residentCount} residents, ${city.totalFloors} floors, ${city.videoCount} videos.`,
  '',
];
for (const [id, list] of people) {
  const r = byId.get(id);
  md.push(`## ${list[0].author}  \`${id}\``);
  if (r) {
    const fresh = r.joined >= input.since;
    md.push(`- ${fresh ? '🆕 **moved in today**' : 'resident'} · plot ${r.plot} · ${r.floors} floor(s) · rank #${rankOf.get(id)}`);
    const ups = mine(specials.upgrades, r).map((u) => u.type);
    if (ups.length) md.push(`- upgrades: ${ups.join(', ')}`);
    const house = mine(specials.houses, r).at(-1);
    if (house) md.push(`- custom house: **${house.title || house.recipe?.shape}** \`${JSON.stringify(house.recipe)}\``);
    const lms = (specials.landmarks || []).filter((l) => l.requestedById === id || norm(l.requestedBy) === norm(r.name));
    if (lms.length) md.push(`- requested landmarks: ${lms.map((l) => `${l.name} (${l.added || '?'})`).join(', ')}`);
  } else {
    md.push('- not in the city (comment too short, or written after the cutoff)');
  }
  for (const c of list) {
    md.push('', `> ${c.text.replace(/\n/g, '\n> ')}`, '', `on "${c.videoTitle}" · ${c.at.slice(0, 16).replace('T', ' ')} UTC · comment \`${c.id}\` · [reply](${c.link})`);
  }
  md.push('');
}
if (!input.comments.length) md.push('No new comments since the last update.');

const out = path.join(ROOT, 'comments', 'today.md');
fs.writeFileSync(out, md.join('\n'));
console.log(`${input.comments.length} new comment(s) from ${people.size} people -> ${path.relative(ROOT, out)}`);
