// Adds a special building to web/data/specials.json (checked against the catalog and the rules).
// Used in the daily session; you can also run it yourself.
//
//   npm run special -- kit                                   show every shape / roof / extra / upgrade
//   npm run special -- house <who> '<recipe json>' --title "Purple Castle"
//        recipe: {"shape":"castle","roof":"spire","wall":"#b49ad8","roofColor":"#5b3e96","door":"#6b4630","accent":"#ffd23f","extras":["flag"]}
//        (any field can be left out; a new design replaces the person's old one)
//   npm run special -- upgrade <who> pool|apple-tree|capybara
//   npm run special -- landmark "Pizza Shop" --by <who> [--type spaghetti-factory]   (no --type = generic hall)
//   npm run special -- wish "dragon statue" --by <who> --note "needs its own 3D model"
//   npm run special -- remove house|upgrade|landmark <who-or-landmark-id> [type]
//
// <who> = @handle, display name or channel ID of a resident. Add --comment <commentId> to remember which comment asked.

import path from 'node:path';
import { readJSON, writeJSON, today, CITY_FILE, SPECIALS_FILE, WISHLIST_FILE } from './lib.mjs';
import { UPGRADE_TYPES, LANDMARK_TYPES, HOUSE_SHAPES, HOUSE_ROOFS, HOUSE_EXTRAS, MAX_HOUSE_EXTRAS, cleanHouseRecipe } from '../web/catalog.js';
import { LANDMARK_BLOCKS, nextEdgeLandmarkBlock } from '../web/layout.js';

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
const slug = (s) => norm(s).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'landmark';

switch (cmd) {
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
    specials.houses.push({ resident: r.id, name: r.name, title, recipe, ...(flags.comment ? { requestedIn: flags.comment } : {}), added: date });
    save();
    console.log(`✓ ${r.name}'s house is now "${title}": ${JSON.stringify(recipe)}`);
    break;
  }
  case 'upgrade': {
    const r = resident(a);
    if (!UPGRADE_TYPES[b]) fail(`Unknown upgrade "${b}". Options: ${Object.keys(UPGRADE_TYPES).join(', ')}`);
    if (specials.upgrades.some((u) => same(u.resident, r) && u.type === b)) fail(`${r.name} already has the ${b}.`);
    specials.upgrades.push({ resident: r.id, name: r.name, type: b, ...(flags.comment ? { requestedIn: flags.comment } : {}), added: date });
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
    let id = slug(name);
    while (specials.landmarks.some((l) => l.id === id)) id += '-2';
    const def = { id, type, name, ...(by ? { requestedBy: by.name, requestedById: by.id } : {}), ...(flags.comment ? { requestedIn: flags.comment } : {}), added: date };
    if (specials.landmarks.length >= LANDMARK_BLOCKS.length) {
      const edge = specials.landmarks.slice(LANDMARK_BLOCKS.length).map((l) => l.block).filter(Array.isArray);
      def.block = nextEdgeLandmarkBlock(city.residents.length, edge);
    }
    specials.landmarks.push(def);
    save();
    console.log(`✓ Landmark "${name}" (${type}) added${def.block ? ` on edge block ${def.block}` : ' downtown'}${by ? `, requested by ${by.name}` : ''}`);
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
