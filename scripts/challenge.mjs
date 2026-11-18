// The weekly challenge: something is hidden in the city (on the website); the first person to comment
// its secret word wins a golden trophy for their house. Data: web/data/challenge.json
//
//   npm run challenge -- new --near <@resident | "Landmark name"> --word <SECRET> --clue "<clue>"
//                            [--name "Golden Capybara"] [--start 2026-11-21] [--days 7]
//   npm run challenge -- status                  what is running, where it hides, the word
//   npm run challenge -- winner <@name> --comment <commentId>   ends the week and gives the trophy
//
// requests.mjs flags every new comment that contains the secret word in comments/today.md.

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readJSON, writeJSON, ROOT, CITY_FILE, SPECIALS_FILE } from './lib.mjs';

export const CHALLENGE_FILE = path.join(ROOT, 'web', 'data', 'challenge.json');
const [cmd, ...rest] = process.argv.slice(2);
const args = {};
const pos = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) { args[rest[i].slice(2)] = rest[i + 1]; i++; } else pos.push(rest[i]);
}
const data = readJSON(CHALLENGE_FILE, { current: null, history: [] });
const norm = (s) => String(s || '').trim().replace(/^@/, '').toLowerCase();
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const word = (c) => Buffer.from(c.code, 'base64').toString();

if (cmd === 'new') {
  if (data.current && !data.current.winner) fail(`Week ${data.current.week} (${data.current.name}) is still running. Give it a winner first, or delete "current" in web/data/challenge.json.`);
  if (!args.near || !args.word || !args.clue) fail('Usage: new --near <@resident | "Landmark name"> --word <SECRET> --clue "<clue>"');
  const city = readJSON(CITY_FILE, { residents: [] });
  const specials = readJSON(SPECIALS_FILE, { landmarks: [] });
  let at = null, where = '';
  const r = city.residents.find((x) => norm(x.name) === norm(args.near) || x.id === args.near);
  if (r) { at = { resident: r.id }; where = `behind ${r.name}'s house`; }
  else {
    const l = (specials.landmarks || []).find((x) => x.name.toLowerCase() === String(args.near).toLowerCase() || x.id === args.near);
    if (l) { at = { landmark: l.id }; where = `at the corner of the ${l.name}`; }
  }
  if (!at) fail(`"${args.near}" is not a resident or a landmark`);
  const start = args.start ? new Date(`${args.start}T00:00:00Z`) : new Date();
  const deadline = new Date(start.getTime() + Number(args.days || 7) * 86400000 - 1000);
  data.current = {
    week: (data.history.at(-1)?.week || data.current?.week || 0) + 1,
    name: args.name || 'Golden Capybara',
    at,
    where,
    clue: args.clue,
    code: Buffer.from(String(args.word).toUpperCase()).toString('base64'), // not plain text in the file
    start: start.toISOString(),
    deadline: deadline.toISOString(),
    winner: null,
  };
  writeJSON(CHALLENGE_FILE, data);
  console.log(`✓ Week ${data.current.week}: the ${data.current.name} hides ${where}. Secret word: ${word(data.current)}`);
  console.log(`  Shows on the website from ${start.toISOString().slice(0, 10)}, answers count until ${deadline.toISOString().slice(0, 16).replace('T', ' ')} UTC.`);
} else if (cmd === 'winner') {
  const c = data.current;
  if (!c) fail('No challenge is running.');
  const who = pos[0];
  if (!who) fail('Usage: winner <@name> --comment <commentId>');
  c.winner = who.startsWith('@') ? who : `@${who}`;
  c.winnerComment = args.comment || '';
  c.won = new Date().toISOString();
  data.history.push({ ...c });
  writeJSON(CHALLENGE_FILE, data);
  console.log(`✓ ${c.winner} won week ${c.week} (${c.name}).`);
  const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'add-special.mjs'), 'upgrade', c.winner, 'trophy', ...(args.comment ? ['--comment', args.comment] : [])], { stdio: 'inherit' });
  if (res.status !== 0) console.log('  (They already have a trophy; the win is still recorded.)');
} else if (cmd === 'status' || !cmd) {
  const c = data.current;
  if (!c) console.log('No challenge yet. Start one with: npm run challenge -- new …');
  else {
    console.log(`Week ${c.week}: ${c.name} ${c.where}`);
    console.log(`  secret word: ${word(c)} · clue: "${c.clue}"`);
    console.log(`  ${c.start.slice(0, 10)} → ${c.deadline.slice(0, 16).replace('T', ' ')} UTC · ${c.winner ? `won by ${c.winner}` : 'no winner yet'}`);
  }
  for (const h of data.history) console.log(`  week ${h.week}: ${h.name} · won by ${h.winner}`);
} else fail(`Unknown command "${cmd}". Use new, status or winner.`);
