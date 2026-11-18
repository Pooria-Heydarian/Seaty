// Daily step 2: lists every new comment (since the last update) with that person's house info,
// so the daily session can spot special requests and write replies.
//
//   npm run requests   ->  comments/today.md   (run after `npm run fetch`)

import fs from 'node:fs';
import path from 'node:path';
import { readJSON, ROOT, CITY_FILE, SPECIALS_FILE, NEW_COMMENTS_FILE } from './lib.mjs';
import { MAX_LANDMARKS_PER_CITIZEN, landmarkKind } from '../web/catalog.js';

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
  `**Rules:** one house per citizen (a new design replaces the old one) · at most ${MAX_LANDMARKS_PER_CITIZEN} landmarks per citizen · one landmark of each kind in the city.`,
  '',
  `**Landmarks already in the city** (kind · name · owner): ${(specials.landmarks || []).map((l) => `${landmarkKind(l)} · ${l.name} · ${l.requestedBy || 'city'}`).join(' | ') || 'none'}`,
  '',
];
// Weekly challenge: who commented the secret word (earliest first)? The first one in the week wins.
const challenge = readJSON(path.join(ROOT, 'web', 'data', 'challenge.json'))?.current;
if (challenge && !challenge.winner) {
  const secret = Buffer.from(challenge.code, 'base64').toString().toLowerCase();
  const hits = input.comments
    .filter((c) => c.text.toLowerCase().includes(secret) && c.at >= challenge.start && c.at <= challenge.deadline)
    .sort((a, b) => a.at.localeCompare(b.at));
  md.push(`## 🏆 Weekly challenge ${challenge.week}: ${challenge.name} (secret word "${secret.toUpperCase()}", until ${challenge.deadline.slice(0, 16).replace('T', ' ')} UTC)`);
  if (!hits.length) md.push('Nobody has found it yet (no new comment with the secret word).');
  hits.forEach((c, i) => {
    const first = i === 0 ? ` · **first = the winner** → \`npm run challenge -- winner ${c.author} --comment ${c.id}\`` : '';
    md.push(`${i + 1}. ${c.author} · ${c.at.slice(0, 16).replace('T', ' ')} UTC · comment \`${c.id}\`${first}`);
  });
  md.push('');
}
// Invites: new citizens who say who invited them ("invited by @name", "@name invited me").
{
  const credited = new Set((specials.invites || []).map((i) => i.friendId));
  const weekAgo = new Date(Date.now() - 8 * 86400000).toISOString();
  const found = [];
  for (const c of input.comments) {
    const r = byId.get(c.authorId);
    if (!r || credited.has(r.id) || r.joined < weekAgo) continue;
    const m = c.text.match(/invit\w*\s+(?:me\s+)?(?:by|from)\s+@?([\p{L}\p{N}._-]{3,})/iu) || c.text.match(/@([\p{L}\p{N}._-]{3,})\s+(?:has\s+)?invited\s+me/iu);
    if (!m) continue;
    const inviter = city.residents.find((x) => norm(x.name) === norm(m[1]));
    found.push(`- ${c.author} says **invited by @${m[1]}**${inviter ? '' : ' (⚠ no citizen with that name: check the spelling)'} · comment \`${c.id}\`${inviter && inviter.id !== r.id ? ` → \`npm run invite -- add ${c.author} --by ${inviter.name} --comment ${c.id}\`` : ''}`);
    credited.add(r.id);
  }
  if (found.length) md.push('## 🤝 Invites (new citizens who say a friend invited them)', ...found, '');
}
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
    md.push(`- landmarks owned: ${lms.length}/${MAX_LANDMARKS_PER_CITIZEN}${lms.length ? ` (${lms.map((l) => l.name).join(', ')})` : ''}${lms.length >= MAX_LANDMARKS_PER_CITIZEN ? ' · **at the limit**' : ''}`);
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
