// Adds a special building to web/data/specials.json (checked against the catalog and the rules).
// Used in the daily session; you can also run it yourself.
//
//   npm run special -- kit                                   show every shape / roof / extra / upgrade
//   npm run special -- house <who> '<recipe json>' --title "Purple Castle"
//        recipe: {"shape":"castle","roof":"spire","wall":"#b49ad8","roofColor":"#5b3e96","door":"#6b4630","accent":"#ffd23f","extras":["flag"]}
//        (any field can be left out; a new design replaces the person's old one)
//   npm run special -- upgrade <who> pool|apple-tree|capybara
//   npm run special -- landmark "Pizza Shop" --by <who> [--type spaghetti-factory] [--kind pizza-shop]   (no --type = generic hall)
//   npm run special -- landmarks                             every landmark: kind, name, owner
//
// City rules (checked here):
//   - one house per citizen (a new design replaces the old one)
//   - at most MAX_LANDMARKS_PER_CITIZEN landmarks per citizen
//   - one landmark of each kind in the city (one airport, one zoo…). The kind is --kind, or the model type,
//     or the name. Pick --kind by meaning: "Airport", "Big Airport" and "Airfield" are all kind "airport".
//   npm run special -- wish "dragon statue" --by <who> --note "needs its own 3D model"
//   npm run special -- remove house|upgrade|landmark <who-or-landmark-id> [type]
//   npm run special -- story <who | landmark id> "<line>" [upgrade type]   the anchor's set-up line in the Short
//   Any add command also takes --story "<line>".
//
// <who> = @handle, display name or channel ID of a resident. Add --comment <commentId> to remember which comment asked.

import path from 'node:path';
import { readJSON, writeJSON, today, CITY_FILE, SPECIALS_FILE, WISHLIST_FILE } from './lib.mjs';
import { UPGRADE_TYPES, LANDMARK_TYPES, HOUSE_SHAPES, HOUSE_ROOFS, HOUSE_EXTRAS, MAX_HOUSE_EXTRAS, MAX_LANDMARKS_PER_CITIZEN, landmarkKind, landmarkPlan, cleanHouseRecipe } from '../web/catalog.js';
// Landmark positions come from the city plan (web/layout.js); this script only records the landmark.

const argv = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
  else pos.push(argv[i]);
}
const [cmd, a, b, c] = pos;
const date = today();
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };

const city = readJSON(CITY_FILE, { residents: [] });
const specials = readJSON(SPECIALS_FILE, {});
specials.landmarks ||= [];
specials.upgrades ||= [];
specials.houses ||= [];
const norm = (s) => String(s || '').trim().replace(/^@/, '').toLowerCase();
const same = (x, r) => x === r.id || norm(x) === norm(r.name);

function resident(who) {
  if (!who) fail('Say who: @handle, name or channel ID.');
  const r = city.residents.find((r) => same(who, r));
  if (!r) {
    if (flags.force) return { id: who, name: who };
    fail(`"${who}" doesn't live in the city (web/data/city.json). Run \`npm run fetch\` first, or add --force.`);
  }
  return r;
}
const save = () => writeJSON(SPECIALS_FILE, specials);
// --story "<line>": how the anchor sets up this request in the Short, before it is built (a fun retelling, not a quote)
const story = () => {
  const t = typeof flags.story === 'string' ? flags.story.replace(/s+/g, ' ').trim() : '';
  if (t.length > 160) fail('--story is too long: one or two short sentences (max 160 characters).');
  return t ? { story: t } : {};
};
const slug = (s) => norm(s).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'landmark';

switch (cmd) {
  case 'story': {
    // npm run special -- story <who | landmark id> "<line>" [upgrade type]   (sets the line on their newest special)
    if (!a || !b) fail('Usage: npm run special -- story <who | landmark id> "<line>" [upgrade type]');
    flags.story = b;
    const line = story();
    const lm = specials.landmarks.find((l) => l.id === a || norm(l.name) === norm(a));
    const r = lm ? null : resident(a);
    const pool = lm ? [lm] : [
      ...(specials.houses || []).filter((h) => h.resident === r.id),
      ...(specials.upgrades || []).filter((u) => u.resident === r.id && (!c || u.type === c)),
    ].sort((x, y) => String(x.added).localeCompare(String(y.added)));
    const target = pool.at(-1);
    if (!target) fail(`No special found for ${a}.`);
    Object.assign(target, line);
    save();
    console.log(`✓ Story for ${target.title || target.name || target.type}: "${line.story}"`);
    break;
  }
  case 'kit': {
    const list = (o) => Object.entries(o).map(([k, v]) => `  ${k.padEnd(15)} ${v}`).join('\n');
    console.log(`SHAPES\n${list(HOUSE_SHAPES)}\n\nROOFS\n${list(HOUSE_ROOFS)}\n\nEXTRAS (max ${MAX_HOUSE_EXTRAS})\n${list(HOUSE_EXTRAS)}\n\nUPGRADES\n${list(UPGRADE_TYPES)}\n\nLANDMARK MODELS (anything else = generic hall)\n${list(LANDMARK_TYPES)}`);
    break;
  }
  case 'house': {
    const r = resident(a);
    let raw;
    try { raw = JSON.parse(b || '{}'); } catch (e) { fail(`Recipe is not valid JSON: ${e.message}`); }
    const unknown = [
      raw.shape && !HOUSE_SHAPES[raw.shape] && `shape "${raw.shape}"`,
      raw.roof && !HOUSE_ROOFS[raw.roof] && `roof "${raw.roof}"`,
      ...(raw.extras || []).filter((e) => !HOUSE_EXTRAS[e]).map((e) => `extra "${e}"`),
      (raw.extras || []).length > MAX_HOUSE_EXTRAS && `more than ${MAX_HOUSE_EXTRAS} extras`,
      ...['wall', 'roofColor', 'door', 'accent'].filter((k) => raw[k] && !/^#[0-9a-f]{6}$/i.test(raw[k])).map((k) => `${k} colour "${raw[k]}" (use #rrggbb)`),
    ].filter(Boolean);
    if (unknown.length) fail(`Not in the kit: ${unknown.join(', ')}. See \`npm run special -- kit\`.`);
    const recipe = cleanHouseRecipe(raw);
    const title = String(flags.title || '').trim().slice(0, 32) || `${recipe.shape[0].toUpperCase()}${recipe.shape.slice(1)} House`;
    specials.houses = specials.houses.filter((h) => !same(h.resident, r));
    specials.houses.push({ resident: r.id, name: r.name, title, recipe, ...(flags.comment ? { requestedIn: flags.comment } : {}), ...story(), added: date });
    save();
    console.log(`✓ ${r.name}'s house is now "${title}": ${JSON.stringify(recipe)}`);
    break;
  }
  case 'upgrade': {
    const r = resident(a);
    if (!UPGRADE_TYPES[b]) fail(`Unknown upgrade "${b}". Options: ${Object.keys(UPGRADE_TYPES).join(', ')}`);
    if (specials.upgrades.some((u) => same(u.resident, r) && u.type === b)) fail(`${r.name} already has the ${b}.`);
    specials.upgrades.push({ resident: r.id, name: r.name, type: b, ...(flags.comment ? { requestedIn: flags.comment } : {}), ...story(), added: date });
    save();
    console.log(`✓ ${r.name} got the ${b}`);
    break;
  }
  case 'landmark': {
    const name = String(a || '').trim().slice(0, 28);
    if (!name) fail('Give the landmark a name, e.g. "Pizza Shop".');
    if (specials.landmarks.some((l) => norm(l.name) === norm(name))) fail(`The city already has a "${name}".`);
    const type = flags.type && flags.type !== true ? flags.type : 'generic';
    if (type !== 'generic' && !LANDMARK_TYPES[type]) fail(`No 3D model "${type}". Models: ${Object.keys(LANDMARK_TYPES).join(', ')} (or leave out --type for the generic hall).`);
    const by = flags.by && flags.by !== true ? resident(flags.by) : null;
    // Rule: one landmark of each kind in the city
    const kind = landmarkKind({ kind: flags.kind && flags.kind !== true ? flags.kind : '', type, name });
    const taken = specials.landmarks.find((l) => landmarkKind(l) === kind);
    if (taken) fail(`ALREADY EXISTS: Seaty already has ${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind} ("${taken.name}"${taken.requestedBy ? `, by ${taken.requestedBy}` : ''}). One of each kind per city.`);
    // Rule: at most MAX_LANDMARKS_PER_CITIZEN landmarks per citizen
    if (by) {
      const owned = specials.landmarks.filter((l) => l.requestedById === by.id || (!l.requestedById && same(l.requestedBy, by)));
      if (owned.length >= MAX_LANDMARKS_PER_CITIZEN) fail(`LIMIT: ${by.name} already owns ${owned.length} landmarks (${owned.map((l) => l.name).join(', ')}). Max ${MAX_LANDMARKS_PER_CITIZEN} per citizen.`);
    }
    // Similar names are a hint that the kind may be the same (e.g. "Airport" vs "Airfield"): check it yourself.
    const words = (s) => norm(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3 && !['seaty', 'city', 'grand', 'great', 'new', 'big', 'small', 'little', 'the', 'house', 'center', 'centre', 'shop', 'store'].includes(w));
    const similar = specials.landmarks.filter((l) => words(l.name).some((w) => words(name).includes(w)));
    if (similar.length) console.log(`⚠ Similar names already in the city: ${similar.map((l) => `"${l.name}" (kind ${landmarkKind(l)})`).join(', ')}. Make sure it's really a different kind.`);
    let id = slug(name);
    while (specials.landmarks.some((l) => l.id === id)) id += '-2';
    const hex = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null);
    const def = { id, type, kind, name, ...(by ? { requestedBy: by.name, requestedById: by.id } : {}), ...(hex(flags.color) ? { color: flags.color } : {}), ...(hex(flags.accent) ? { accent: flags.accent } : {}), ...(flags.comment ? { requestedIn: flags.comment } : {}), ...story(), added: date };
    specials.landmarks.push(def);
    save();
    const plan = landmarkPlan(def);
    const where = { civic: 'downtown', main: 'on Main Street', local: "between the houses of the owner's neighbourhood", belt: 'in the green belt', outskirts: 'in the outskirts', station: 'at the end of Main Street' }[plan.district];
    console.log(`✓ Landmark "${name}" (${type}, size ${plan.size}) added ${where}${by ? `, requested by ${by.name}` : ''}`);
    break;
  }
  case 'landmarks': {
    for (const l of specials.landmarks) console.log(`${landmarkKind(l).padEnd(20)} ${l.name.padEnd(30)} ${l.requestedBy || '(city)'}`);
    break;
  }
  case 'landmark-model': {
    // npm run special -- landmark-model <id-or-name> <type> [--color #hex] [--accent #hex]   give an existing landmark a new 3D model
    const l = specials.landmarks.find((x) => x.id === a || norm(x.name) === norm(a));
    if (!l) fail(`No landmark "${a}".`);
    if (b !== 'generic' && !LANDMARK_TYPES[b]) fail(`No 3D model "${b}". Models: ${Object.keys(LANDMARK_TYPES).join(', ')}`);
    l.type = b;
    for (const k of ['color', 'accent']) if (typeof flags[k] === 'string' && /^#[0-9a-f]{6}$/i.test(flags[k])) l[k] = flags[k];
    save();
    console.log(`✓ "${l.name}" now uses the ${b} model`);
    break;
  }
  case 'wish': {
    const wishlist = readJSON(WISHLIST_FILE, { items: [] });
    if (!a) fail('Say what was wished for.');
    wishlist.items.push({ what: a, by: flags.by && flags.by !== true ? flags.by : '', note: flags.note && flags.note !== true ? flags.note : '', date });
    writeJSON(WISHLIST_FILE, wishlist);
    console.log(`✓ Added to the wish list: ${a}`);
    break;
  }
  case 'remove': {
    if (a === 'landmark') {
      const before = specials.landmarks.length;
      specials.landmarks = specials.landmarks.filter((l) => l.id !== b && norm(l.name) !== norm(b));
      if (specials.landmarks.length === before) fail(`No landmark "${b}".`);
      console.log('⚠ Removing a landmark can move later edge landmarks; prefer keeping them.');
    } else if (a === 'house') {
      const r = resident(b);
      specials.houses = specials.houses.filter((h) => !same(h.resident, r));
    } else if (a === 'upgrade') {
      const r = resident(b);
      specials.upgrades = specials.upgrades.filter((u) => !(same(u.resident, r) && (!c || u.type === c)));
    } else fail('remove house|upgrade|landmark <who-or-id> [type]');
    save();
    console.log('✓ Removed');
    break;
  }
  default:
    console.log(`Usage: see the top of ${path.basename(import.meta.url)}`);
    process.exit(cmd ? 1 : 0);
}
