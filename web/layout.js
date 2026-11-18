// Seaty city plan, shared by the browser (world.js) and the daily scripts (Node). No dependencies except catalog.js.
//
// The city is a grid of blocks (bx, bz); each block is 12 x 12 with 4 house lots, and roads between blocks.
// North is -z.
//
//   Downtown         the 3 x 3 blocks around the town hall (0, 0): civic landmarks (museum, school, hospital…)
//   Main Street      a pedestrian promenade running east from downtown (row bz = 0), shops on both sides
//                    (rows bz = -1 and +1); the Seaty Rail station sits at its east end
//   Boulevards       tree-lined strips on the other three axes (north, south, west)
//   Neighbourhoods   wedges around downtown, one per house style: Classic Homes (north + west), Tower Row,
//                    Villa Hills, Fantasy Lane, Old Town (east and south). Every 4th block is a pocket park;
//                    everyday shops (bakery, corner shop, market) sit on the edge of those parks.
//   Green belt       two rings of blocks around the city: stadiums, theme park, circus, farm, big park…
//   Outskirts        past a meadow ring: factories, power plant, airport, space center
//
// Stability: a classic house keeps lot number = join order (people who move out leave a garden behind);
// styled houses line up by the day they got their style; shops and landmarks by the day they were added.
// When the city outgrows its radius, the green belt and outskirts move one ring further out.

import { houseStyle, landmarkPlan } from './catalog.js';

export const LOT = 6;
export const BLOCK = LOT * 2;
export const ROAD = 4;
export const PITCH = BLOCK + ROAD;
/** Lots in a block: 0, 1 = north row (face north), 2, 3 = south row (face south). */
export const LOT_OFFSETS = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [(x * LOT) / 2, (z * LOT) / 2]);
const LOT_ROT = [Math.PI, Math.PI, 0, 0];

const key = (x, z) => `${x},${z}`;
const ring = (x, z) => Math.max(Math.abs(x), Math.abs(z));
/** Angle round the centre, starting north and going clockwise (0..2π). */
const angle = (x, z) => (Math.atan2(x, -z) + Math.PI * 2) % (Math.PI * 2);

/** Which neighbourhood wedge a block belongs to (or null for downtown, Main Street and the boulevards). */
function wedgeOf(x, z) {
  if (ring(x, z) <= 1) return null; // downtown
  if (x >= 2 && Math.abs(z) <= 1) return null; // Main Street (promenade + shops)
  if (x === 0 || (z === 0 && x < 0)) return null; // boulevards
  if (z < 0) {
    if (x > 0 && x > -z) return 'tower'; // east-north-east, next to Main Street
    return 'classic'; // north
  }
  if (x > 0) return x >= z ? 'villa' : 'fantasy'; // east-south-east / south-south-east
  if (z >= -x) return 'old'; // south-south-west
  return 'classic'; // west-south-west
}

/** Blocks of one wedge in order: ring by ring, then clockwise. */
function wedgeBlocks(style, maxRing = 40) {
  const out = [];
  for (let r = 2; r <= maxRing; r++) {
    const ringBlocks = [];
    for (let x = -r; x <= r; x++) for (let z = -r; z <= r; z++) {
      if (ring(x, z) === r && wedgeOf(x, z) === style) ringBlocks.push([x, z]);
    }
    ringBlocks.sort((a, b) => angle(...a) - angle(...b));
    out.push(...ringBlocks);
  }
  return out;
}
const WEDGES = {};
const wedge = (style) => (WEDGES[style] ||= wedgeBlocks(style));
const CIVIC_SLOTS = [[0, -1], [-1, 0], [0, 1], [1, -1], [-1, -1], [-1, 1], [1, 1], [1, 0]];

/**
 * @param {Array<{id:string, recipe?:object, styleSince?:string}>} residents  in join order
 * @param {Array<object>} landmarks  specials.landmarks, in the order they were added
 */
export function createCityLayout(residents = [], landmarks = [], villages = []) {
  // invite villages: the owner and the friends they invited live together on the ring between the belt and the outskirts
  const villageOf = new Map();
  for (const v of villages) for (const id of v.members) if (!villageOf.has(id)) villageOf.set(id, v);
  const blocks = new Map(); // "x,z" -> { x, z, kind, lots: [kind|null x4], style?, landmark? }
  const homes = new Map(); // resident id -> { x, z, rot, style }
  const spots = new Map(); // landmark id -> { x, z, rot, scale, size, district }
  const block = (x, z) => {
    const k = key(x, z);
    if (!blocks.has(k)) blocks.set(k, { x, z, kind: 'empty', lots: [null, null, null, null] });
    return blocks.get(k);
  };
  const lotPos = (x, z, j) => ({ x: x * PITCH + LOT_OFFSETS[j][0], z: z * PITCH + LOT_OFFSETS[j][1], rot: LOT_ROT[j] });

  // ---- Neighbourhoods: lots per style, every 4th block a pocket park ----
  const byStyle = { classic: [], tower: [], villa: [], old: [], fantasy: [] };
  residents.forEach((r, i) => {
    if (villageOf.has(r.id)) return; // lives in their village (a classic slot stays a garden)
    const style = houseStyle(r.recipe);
    if (style === 'classic') byStyle.classic.push({ id: r.id, slot: i }); // join order, with gaps for people who moved
    else byStyle[style].push({ id: r.id, since: r.styleSince || '', i });
  });
  for (const s of Object.keys(byStyle)) if (s !== 'classic') byStyle[s].sort((a, b) => a.since.localeCompare(b.since) || a.i - b.i).forEach((h, k) => (h.slot = k));
  const houseBlocks = (style) => wedge(style).filter((_, k) => k % 4 !== 3);
  const parkBlocks = (style) => wedge(style).filter((_, k) => k % 4 === 3);
  const used = { classic: 0, tower: 0, villa: 0, old: 0, fantasy: 0 }; // blocks of each wedge in use (incl. parks)
  for (const [style, list] of Object.entries(byStyle)) {
    const hb = houseBlocks(style);
    const slots = style === 'classic' ? residents.length : list.length;
    // fill classic gaps (people who moved to another neighbourhood) with gardens
    for (let s = 0; s < slots; s++) {
      const [x, z] = hb[Math.floor(s / 4)];
      const b = block(x, z);
      b.kind = 'homes';
      b.style = style;
      b.lots[s % 4] ||= 'garden';
    }
    for (const h of list) {
      const [x, z] = hb[Math.floor(h.slot / 4)];
      block(x, z).lots[h.slot % 4] = 'house';
      homes.set(h.id, { ...lotPos(x, z, h.slot % 4), style });
    }
    if (slots) used[style] = wedge(style).findIndex(([x, z]) => x === hb[Math.floor((slots - 1) / 4)][0] && z === hb[Math.floor((slots - 1) / 4)][1]) + 1;
  }

  // ---- Landmarks ----
  const ownerStyle = (def) => { const st = homes.get(def.requestedById)?.style; return byStyle[st] ? st : 'classic'; };
  const faceCentre = (x, z) => Math.round(Math.atan2(-x, -z) / (Math.PI / 2)) * (Math.PI / 2);
  const civic = [], main = [], local = [], belt = [], outskirts = [], station = [];
  for (const def of landmarks) {
    const plan = landmarkPlan(def);
    ({ civic, main, local, belt, outskirts, station })[plan.district].push({ def, plan });
  }
  // downtown: civic slots, overflow to Main Street
  civic.forEach((l, k) => {
    if (k >= CIVIC_SLOTS.length) return main.push(l);
    const [x, z] = CIVIC_SLOTS[k];
    Object.assign(block(x, z), { kind: 'landmark', landmark: l.def.id });
    spots.set(l.def.id, { x: x * PITCH, z: z * PITCH, rot: faceCentre(x, z), scale: 1, size: 'M', district: 'Downtown' });
  });
  // Main Street: shops alternate north / south side, facing the promenade
  main.forEach((l, k) => {
    const x = 2 + Math.floor(k / 2), z = k % 2 ? 1 : -1;
    Object.assign(block(x, z), { kind: 'landmark', landmark: l.def.id });
    spots.set(l.def.id, { x: x * PITCH, z: z * PITCH, rot: z < 0 ? 0 : Math.PI, scale: 1, size: 'M', district: 'Main Street' });
  });
  const mainLen = Math.ceil(main.length / 2);
  // everyday shops: on the edge of a pocket park in the owner's neighbourhood (2 per park)
  const shopCount = {};
  for (const l of local) {
    const style = ownerStyle(l.def);
    const k = (shopCount[style] = (shopCount[style] || 0) + 1) - 1;
    const pb = parkBlocks(style)[Math.floor(k / 2)];
    const j = k % 2 ? 2 : 1; // two opposite corners of the park
    const b = block(pb[0], pb[1]);
    b.kind = 'park';
    b.style = style;
    b.lots[j] = 'shop';
    spots.set(l.def.id, { ...lotPos(pb[0], pb[1], j), scale: 0.5, size: 'S', district: NAMES[style] });
    used[style] = Math.max(used[style], wedge(style).findIndex(([x, z]) => x === pb[0] && z === pb[1]) + 1);
  }
  // pocket parks among the houses
  for (const style of Object.keys(used)) {
    wedge(style).slice(0, used[style]).forEach(([x, z], k) => {
      if (k % 4 === 3) Object.assign(block(x, z), { kind: 'park', style });
    });
  }
  // the city's radius: neighbourhoods, Main Street, downtown
  let cityR = Math.max(3, mainLen + 1);
  for (const b of blocks.values()) cityR = Math.max(cityR, ring(b.x, b.z));

  // ---- Green belt, outskirts, station ----
  const taken = new Set([...blocks.values()].filter((b) => b.kind !== 'empty').map((b) => key(b.x, b.z)));
  // Spread a band's landmarks evenly round the city: each new one goes where it is farthest (by angle)
  // from the ones already there; the first one goes at startAngle. Earlier ones never move.
  const place = (list, r1, r2, district, startAngle) => {
    const placedAngles = [];
    const gap = (a, b) => { const d = Math.abs(a - b) % (Math.PI * 2); return Math.min(d, Math.PI * 2 - d); };
    for (const { def, plan } of list) {
      const big = plan.size === 'L';
      const cands = [];
      for (let x = -r2; x <= r2; x++) for (let z = -r2; z <= r2; z++) {
        const cells = big ? [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]] : [[x, z]];
        if (cells.every(([cx, cz]) => ring(cx, cz) >= r1 && ring(cx, cz) <= r2 && !taken.has(key(cx, cz)))) cands.push(cells);
      }
      const centre = (cells) => [cells.reduce((s, c) => s + c[0], 0) / cells.length, cells.reduce((s, c) => s + c[1], 0) / cells.length];
      const score = (cells) => {
        const a = angle(...centre(cells));
        return placedAngles.length ? Math.min(...placedAngles.map((p) => gap(a, p))) : -gap(a, startAngle);
      };
      cands.sort((a, b) => score(b) - score(a) || angle(...centre(a)) - angle(...centre(b)));
      const cells = cands[0];
      if (cells) placedAngles.push(angle(...centre(cells)));
      if (!cells) continue; // band full (the bands grow with the city, so this is rare)
      cells.forEach(([cx, cz]) => { taken.add(key(cx, cz)); Object.assign(block(cx, cz), { kind: 'landmark', landmark: def.id }); });
      const [cx, cz] = centre(cells);
      spots.set(def.id, { x: cx * PITCH, z: cz * PITCH, rot: faceCentre(cx, cz), scale: big ? 2 : 1, size: plan.size, district });
    }
  };
  // the station closes the east end of Main Street
  station.forEach(({ def }, k) => {
    const x0 = cityR + 1 + k * 2;
    const cells = [[x0, -1], [x0 + 1, -1], [x0, 0], [x0 + 1, 0]];
    cells.forEach(([cx, cz]) => { taken.add(key(cx, cz)); Object.assign(block(cx, cz), { kind: 'landmark', landmark: def.id }); });
    spots.set(def.id, { x: (x0 + 0.5) * PITCH, z: -0.5 * PITCH, rot: -Math.PI / 2, scale: 2, size: 'L', district: 'Main Street station' });
  });
  const beltR1 = cityR + 1, beltR2 = cityR + 2 + Math.floor(belt.length / 12) * 2;
  place(belt, beltR1, beltR2, 'Green belt', Math.PI * 0.75); // first venue south-east, then spread round
  // ---- Invite villages: a run of blocks on the meadow ring between the belt and the outskirts ----
  const villageInfo = [];
  {
    const rv = beltR2 + 1;
    const ringList = [];
    for (let x = -rv; x <= rv; x++) for (let z = -rv; z <= rv; z++) if (ring(x, z) === rv) ringList.push([x, z]);
    ringList.sort((a, b) => angle(...a) - angle(...b));
    const n = ringList.length;
    villages.forEach((v, k) => {
      const members = v.members.filter((id) => residents.some((r) => r.id === id));
      if (!members.length) return;
      const need = Math.ceil(members.length / 4);
      const target = (Math.PI * 0.25 + k * 2.4) % (Math.PI * 2);
      const gap = (a) => { const d = Math.abs(a - target) % (Math.PI * 2); return Math.min(d, Math.PI * 2 - d); };
      const starts = [...Array(n).keys()].sort((a, b) => gap(angle(...ringList[a])) - gap(angle(...ringList[b])));
      const start = starts.find((i0) => [...Array(need).keys()].every((j) => !taken.has(key(...ringList[(i0 + j) % n]))));
      if (start === undefined) return;
      const cells = [...Array(need).keys()].map((j) => ringList[(start + j) % n]);
      cells.forEach(([x, z]) => { taken.add(key(x, z)); Object.assign(block(x, z), { kind: 'homes', style: 'village', village: v.id }); });
      members.forEach((id, m) => {
        const [x, z] = cells[Math.floor(m / 4)];
        block(x, z).lots[m % 4] = 'house';
        homes.set(id, { ...lotPos(x, z, m % 4), style: 'village', village: v.name });
      });
      for (const [x, z] of cells) block(x, z).lots = block(x, z).lots.map((l) => l || 'garden');
      // the gate and name sign stand on the side of the first block that faces the city
      const [fx, fz] = cells[0];
      const len = Math.hypot(fx, fz) || 1;
      villageInfo.push({ id: v.id, name: v.name, members, blocks: cells, sign: { x: fx * PITCH - (fx / len) * (BLOCK / 2 + 0.8), z: fz * PITCH - (fz / len) * (BLOCK / 2 + 0.8), rot: Math.atan2(-fx, -fz) } });
    });
  }
  const outR1 = beltR2 + 2, outR2 = outR1 + 1 + Math.floor(outskirts.length / 14) * 2;
  place(outskirts, outR1, outR2, 'Outskirts', Math.PI); // industry starts south, away from the homes in the north

  // mark the remaining blocks of each zone so the ground can draw them (meadow, belt trees)
  const outerR = outR2 + 1;
  for (let x = -outerR; x <= outerR; x++) for (let z = -outerR; z <= outerR; z++) {
    const r = ring(x, z);
    const b = block(x, z);
    if (b.kind !== 'empty') continue;
    if (x === 0 && z === 0) b.kind = 'square';
    else if (r <= 1) b.kind = 'civic-empty';
    else if (x >= 2 && z === 0 && x <= cityR) b.kind = 'promenade';
    else if (x >= 2 && Math.abs(z) === 1 && x <= cityR) b.kind = 'main-empty';
    else if ((x === 0 || (z === 0 && x < 0)) && r <= cityR) b.kind = 'boulevard';
    else if (r <= cityR) { b.kind = 'lawn'; b.style = wedgeOf(x, z); }
    else if (r <= beltR2) b.kind = 'belt';
    else if (r < outR1) b.kind = 'meadow';
    else b.kind = 'outskirts';
  }
  return { blocks: [...blocks.values()], homes, spots, cityR, beltR: beltR2, outerR, villages: villageInfo };
}

const NAMES = { classic: 'Classic Homes', tower: 'Tower Row', villa: 'Villa Hills', old: 'Old Town', fantasy: 'Fantasy Lane' };
