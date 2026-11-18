// Invite friends: a new citizen writes "invited by @name" in their first comment and the inviter gets the credit.
//   3 friends -> 🎖️ Ambassador badge     5 friends -> their own village at the edge of Seaty, where they and
//   the friends they brought live together (a name sign and a gate).
// Stored in web/data/specials.json (invites, villages) so every page that loads specials sees them.
//
//   npm run invite -- add @friend --by @inviter [--comment <id>]
//   npm run invite -- remove @friend
//   npm run invite -- rename @owner "Kirupa's Village"
//   npm run invite -- list
//
// requests.mjs lists the "invited by" comments it finds in comments/today.md with the command to run.

import { readJSON, writeJSON, CITY_FILE, SPECIALS_FILE } from './lib.mjs';
import { AMBASSADOR_INVITES, VILLAGE_INVITES } from '../web/catalog.js';

const [cmd, ...rest] = process.argv.slice(2);
const args = {}, pos = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) { args[rest[i].slice(2)] = rest[i + 1]; i++; } else pos.push(rest[i]);
}
const city = readJSON(CITY_FILE, { residents: [] });
const specials = readJSON(SPECIALS_FILE, {});
specials.invites ||= [];
specials.villages ||= [];
const norm = (s) => String(s || '').trim().replace(/^@/, '').toLowerCase();
const at = (s) => `@${String(s).replace(/^@/, '')}`;
const find = (who) => city.residents.find((r) => r.id === who || norm(r.name) === norm(who));
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const friendsOf = (id) => specials.invites.filter((i) => i.byId === id);
const save = () => writeJSON(SPECIALS_FILE, specials);

if (cmd === 'add') {
  const friend = find(pos[0]);
  const by = find(args.by);
  if (!friend) fail(`${pos[0]} isn't a citizen yet (their comment hasn't counted).`);
  if (!by) fail(`Inviter ${args.by} isn't a citizen.`);
  if (friend.id === by.id) fail('Nobody can invite themselves.');
  const already = specials.invites.find((i) => i.friendId === friend.id);
  if (already) fail(`${friend.name} was already invited by ${already.by}.`);
  if (friend.joined < by.joined) fail(`${friend.name} lived in Seaty before ${by.name} did, so it can't be an invite.`);
  const weekAgo = new Date(Date.now() - 8 * 86400000).toISOString();
  if (friend.joined < weekAgo && !args.force) fail(`${friend.name} moved in on ${friend.joined.slice(0, 10)}: only new citizens count (add --force yes to override).`);
  if (specials.villages.some((v) => v.ownerId === friend.id)) fail(`${friend.name} has their own village.`);
  specials.invites.push({ friend: at(friend.name), friendId: friend.id, by: at(by.name), byId: by.id, comment: args.comment || '', added: new Date().toISOString() });
  const n = friendsOf(by.id).length;
  console.log(`✓ ${by.name} invited ${friend.name} (${n} friend${n === 1 ? '' : 's'} so far)`);
  if (n === AMBASSADOR_INVITES) console.log(`  🎖️ ${by.name} is now an Ambassador!`);
  if (n >= VILLAGE_INVITES && !specials.villages.some((v) => v.ownerId === by.id)) {
    const name = `${by.name.replace(/^@/, '')}'s Village`;
    specials.villages.push({ id: `village-${norm(by.name).replace(/[^a-z0-9]+/g, '-')}`, name, owner: at(by.name), ownerId: by.id, created: new Date().toISOString() });
    console.log(`  🏘️ ${by.name} gets a village: "${name}". They and their friends move there. Rename: npm run invite -- rename ${at(by.name)} "<name>"`);
  }
  save();
} else if (cmd === 'remove') {
  const friend = find(pos[0]);
  const before = specials.invites.length;
  specials.invites = specials.invites.filter((i) => i.friendId !== friend?.id && norm(i.friend) !== norm(pos[0]));
  if (specials.invites.length === before) fail(`No invite for ${pos[0]}.`);
  save();
  console.log(`✓ Removed the invite credit for ${pos[0]} (an existing village stays).`);
} else if (cmd === 'rename') {
  const owner = find(pos[0]);
  const v = specials.villages.find((x) => x.ownerId === owner?.id);
  if (!v) fail(`${pos[0]} has no village.`);
  if (!pos[1]) fail('Give the new name in quotes.');
  v.name = pos[1].slice(0, 32);
  save();
  console.log(`✓ The village is now called "${v.name}".`);
} else if (cmd === 'list' || !cmd) {
  const counts = new Map();
  for (const i of specials.invites) counts.set(i.by, (counts.get(i.by) || 0) + 1);
  if (!counts.size) console.log('No invites yet.');
  for (const [who, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    const badge = n >= VILLAGE_INVITES ? '🏘️ village' : n >= AMBASSADOR_INVITES ? '🎖️ Ambassador' : '';
    console.log(`  ${who}: ${n} friend${n === 1 ? '' : 's'} ${badge}`);
  }
  for (const v of specials.villages) console.log(`  village "${v.name}" (${v.owner})`);
} else fail(`Unknown command "${cmd}". Use add, remove, rename or list.`);
