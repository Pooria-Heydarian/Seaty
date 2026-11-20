// Seaty city plan, shared by the browser (world.js) and the daily scripts (Node). No dependencies except catalog.js.
//
// The plan follows a real lake city (Zurich) as its template. North is -z, east is +x. The city is a grid of blocks
// (bx, bz); each block is 12 x 12 with 4 house lots, and roads between the blocks.
//
//   The lake          in the south-east, with a promenade (quays and lakeside parks) all along its shore
//   The river         flows out of the lake north through the old town, then bends north-west past the station
//   Old Town          both banks of the river: the town hall (0, 0) by the water, civic buildings on the west bank
//   Bahnhofstrasse    the main shopping street: from the main station (north) straight down to the lake
//   Niederdorf        the second shopping lane, on the east bank
//   Plazas            Bürkliplatz, Bellevue, Paradeplatz, Central, Lindenhof…: statues and fountains
//   Lakeside          parks, the theme park, the circus, the aquarium along the shore
//   University Hill   east of the old town; the Zürichberg forest behind it (the zoo), the Uetliberg in the west
//   Neighbourhoods    one per house style, each growing outward in its own direction: Tower Row (north-west,
//                     by the railway), Classic Homes (north and west), Old Town houses (north-east), Villa Hills
//                     (east hills and the lake shores), Fantasy Lane (south-west, towards the Uetliberg)
//   Industrial Quarter  along the river and the west railway, out past the city: every factory, power, depot
//   Sports Village    its own little town in the west at the end of the tram line: stadiums, ballpark, race track
//   Airport           north, at the end of the railway; countryside with farms and villages all round
//
// Streets have jobs: two railways from the station (west to the industry and the sports village, north to the
// airport), tram lines on the main avenues, bridges where streets cross the river. Every district is filled first
// come, first served, nearest the centre first, so a new landmark never moves an older one.

import { houseStyle, landmarkPlan, landmarkKind } from './catalog.js';

export const LOT = 6;
export const BLOCK = LOT * 2;
export const ROAD = 4;
export const PITCH = BLOCK + ROAD;
/** Lots in a block: 0, 1 = north row (face north), 2, 3 = south row (face south). */
export const LOT_OFFSETS = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [(x * LOT) / 2, (z * LOT) / 2]);
const LOT_ROT = [Math.PI, Math.PI, 0, 0];

const key = (x, z) => `${x},${z}`;
const ring = (x, z) => Math.max(Math.abs(x), Math.abs(z));
/** Angle round the centre in degrees, starting north and going clockwise (0..360). */
const deg = (x, z) => ((Math.atan2(x, -z) * 180) / Math.PI + 360) % 360;
const angle = (x, z) => (Math.atan2(x, -z) + Math.PI * 2) % (Math.PI * 2);
const range = (a, b) => { const out = []; for (let i = a; a <= b ? i <= b : i >= b; i += a <= b ? 1 : -1) out.push(i); return out; };
const cellsOf = (xs, zs) => xs.flatMap((x) => zs.map((z) => [x, z]));

// ---------------- The template (block units) ----------------
/** Lake shore, clockwise. */
export const LAKE = [[-4.6, 4.6], [3.6, 4.6], [6.2, 6.4], [9.2, 9.8], [12.8, 14.6], [16.5, 20.5], [19.5, 27], [15, 29], [11.5, 22], [7.8, 16.5], [3.6, 12.2], [-0.6, 9.4], [-4.6, 6.8]];
/** The river, from the lake outwards. */
export const RIVER = [[1, 5.6], [1, -3], [-2, -7], [-6, -10.5], [-12, -11.5], [-30, -14]];
export const RIVER_WIDTH = 10; // world units
/** Wooded hills: centre and radii. */
export const FORESTS = [{ name: 'Zürichberg', x: 7.5, z: -4.5, rx: 2.6, rz: 3.2 }, { name: 'Uetliberg', x: -11.5, z: 8.5, rx: 2.4, rz: 3.6 }];

const OLD_TOWN = cellsOf([0, -1], [-2, -1, 0, 1, 2]).filter(([x, z]) => !(x === 0 && z === 0)); // civic, west bank

/**
 * Real addresses: where each kind of landmark stands in the template city (after Zurich's map). Each entry lists the
 * spots to try in order (a spot = the blocks it covers: 1 for a normal landmark, 4 for a big one). These blocks are
 * kept free for it, so the neighbourhoods never grow over them. A kind without an address goes to its district.
 */
export const ADDRESS = {
  // Old Town, both banks of the river
  'gothic-church': { place: 'Grossmünster', district: 'civic', at: [[[2, 1]], [[2, 2]]] },
  church: { place: 'Fraumünster', district: 'civic', at: [[[0, 2]], [[-1, 2]]] },
  temple: { place: 'Lindenhof', district: 'civic', at: [[[-1, 2]], [[-1, -2]]] },
  'police-station': { place: 'Urania', district: 'civic', at: [[[0, -2]], [[-1, -2]]] },
  library: { place: 'Zentralbibliothek', district: 'civic', at: [[[2, -2]], [[2, -1]]] },
  // the national museum, right behind the main station
  museum: { place: 'Landesmuseum', district: 'civic', at: [[[-2, -5]], [[-2, -4]]] },
  // University Hill above the old town, with the university hospital
  university: { place: 'University Hill', district: 'civic', at: [[[5, -2]], [[5, -1]]] },
  'art-school': { place: 'University Hill', district: 'civic', at: [[[5, -1]], [[5, 0]], [[6, 0]]] },
  hospital: { place: 'University Hospital', district: 'civic', at: [[[6, -1]], [[6, 0]], [[5, 1]]] },
  // public services in the neighbourhoods
  school: { place: 'Aussersihl', district: 'civic', at: [[[-6, 1]], [[-6, 2]]] },
  'fire-station': { place: 'Fire Station West', district: 'civic', at: [[[-6, -3]], [[-6, -2]]] },
  'post-office': { place: 'Sihlpost', district: 'civic', at: [[[-5, -2]], [[-5, -3]]] },
  mosque: { place: 'Balgrist', district: 'civic', at: [[[8, 2]], [[8, 3]]] },
  // Zürich-West and Europaallee, along the railway
  skyscraper: { place: 'Zürich-West', district: 'main', at: [[[-6, -4]], [[-7, -4]]] },
  'construction-site': { place: 'Europaallee', district: 'main', at: [[[-5, -4]], [[-5, -3]]] },
  'mma-gym': { place: 'Zürich-West', district: 'main', at: [[[-7, -4]], [[-7, -3]]] },
  gym: { place: 'Zürich-West', district: 'main', at: [[[-7, -3]], [[-8, -4]]] },
  'car-show': { place: 'Badenerstrasse', district: 'main', at: [[[-7, -1]], [[-7, 0]]] },
  motel: { place: 'Station West', district: 'main', at: [[[-4, -6]], [[-5, -6]]] },
  // by the lake: Bellevue, Sechseläutenplatz, Zürichhorn, Landiwiese
  cinema: { place: 'Bellevue', district: 'main', at: [[[4, 3]], [[4, 2]]] },
  circus: { place: 'Sechseläutenplatz', district: 'leisure', at: [[[3, 4]], [[4, 4]]] },
  'theme-park': { place: 'Zürichhorn', district: 'leisure', at: [[[5, 3], [6, 3], [5, 4], [6, 4]]] },
  aquarium: { place: 'Zürichhorn', district: 'leisure', at: [[[7, 4]], [[7, 3]]] },
  park: { place: 'Landiwiese', district: 'leisure', at: [[[-2, 10], [-1, 10], [-2, 11], [-1, 11]]] },
  // hills, river and fields
  castle: { place: 'Uetliberg', district: 'country', at: [[[-12, 7], [-11, 7], [-12, 8], [-11, 8]]] },
  dam: { place: 'Limmat weir', district: 'country', at: [[[-7, -9], [-6, -9], [-7, -8], [-6, -8]]] },
  'power-plant': { place: 'Industrial Quarter', district: 'industry', at: [[[-12, -10], [-11, -10], [-12, -9], [-11, -9]]] },
  farm: { place: 'Farmland', district: 'country', at: [[[8, -10], [9, -10], [8, -9], [9, -9]]] },
  'lemon-farm': { place: 'Farmland', district: 'country', at: [[[-14, 4], [-13, 4], [-14, 5], [-13, 5]]] },
};
const CIVIC_ORDER = [[0, -1], [-1, 0], [0, 1], [-1, -1], [-1, 1], [0, -2], [-1, -2], [0, 2], [-1, 2]];
const UNI_HILL = cellsOf([5, 6], [0, -1, -2, 1]); // civic overflow (university, hospital…)
const PLAZAS = [[-3, 4], [2, 4], [-3, 0], [3, -3], [-1, -3], [0, 3]]; // Bürkliplatz, Bellevue, Paradeplatz, Central, Lindenhof, Quai
/** Shopping streets: a pedestrian promenade (column) with shops on both sides, filled from the first one on. */
const STREETS = [
  { name: 'Bahnhofstrasse', x: -3, z: range(-3, 3) },
  { name: 'Niederdorf', x: 3, z: range(-2, 3) },
];
const STATION = [[-4, -5], [-3, -5], [-4, -4], [-3, -4]];
const RAIL_WEST = range(-5, -30).map((x) => [x, -5]);
const RAIL_NORTH = range(-6, -19).map((z) => [-3, z]);
const SPORTS = cellsOf(range(-12, -21), range(-2, 1)); // the Sports Village: 4 blocks deep, grows west
const INDUSTRY = cellsOf(range(-11, -26), range(-6, -10)); // the Industrial Quarter, grows west along the railway
const AIRPORT = cellsOf(range(-3, -10).concat(range(-2, 4)), range(-20, -24)); // north, at the end of the railway

// point in polygon / distance to a polyline (block units)
const inPoly = (poly, x, z) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};
const segDist = (px, pz, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};
/** What the ground of a block is by nature: 'lake', 'river', 'forest' or null (land). */
const NATURE = new Map();
function nature(x, z) {
  const k = key(x, z);
  if (NATURE.has(k)) return NATURE.get(k);
  let n = null;
  const h = 0.5; // a block's tile reaches half a pitch round its centre
  const samples = [[0, 0], [-h, -h], [h, -h], [h, h], [-h, h], [0, -h], [0, h], [-h, 0], [h, 0]];
  if (samples.some(([dx, dz]) => inPoly(LAKE, x + dx, z + dz))) n = 'lake';
  else {
    const reach = RIVER_WIDTH / 2 / PITCH + 0.5;
    for (let i = 0; i < RIVER.length - 1 && !n; i++) {
      const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
      const len = Math.hypot(bx - ax, bz - az), ux = Math.abs(bx - ax) / len, uz = Math.abs(bz - az) / len;
      // the river band touches the square if the distance is under half its width plus the square's reach across it
      if (segDist(x, z, RIVER[i], RIVER[i + 1]) < RIVER_WIDTH / 2 / PITCH + 0.5 * (ux + uz) - 0.02 && segDist(x, z, RIVER[i], RIVER[i + 1]) < reach + 0.3) n = 'river';
    }
  }
  if (!n && FORESTS.some((f) => ((x - f.x) / f.rx) ** 2 + ((z - f.z) / f.rz) ** 2 <= 1)) n = 'forest';
  NATURE.set(k, n);
  return n;
}

/** Shore blocks (within 2 of the lake, near the river mouth): the lakeside promenade, nearest the mouth first. */
const QUAY = (() => {
  const out = [];
  for (let x = -12; x <= 16; x++) for (let z = 0; z <= 22; z++) {
    if (nature(x, z)) continue;
    let near = false;
    for (let dx = -2; dx <= 2 && !near; dx++) for (let dz = -2; dz <= 2 && !near; dz++) if (nature(x + dx, z + dz) === 'lake') near = true;
    if (near && Math.hypot(x - 1, z - 4.6) <= 9) out.push([x, z]);
  }
  return out.sort((a, b) => Math.hypot(a[0] - 1, a[1] - 4.6) - Math.hypot(b[0] - 1, b[1] - 4.6));
})();

/** Every block the template keeps for something other than houses. */
const RESERVED = (() => {
  const s = new Set();
  const add = (list) => list.forEach(([x, z]) => s.add(key(x, z)));
  add(OLD_TOWN); add(UNI_HILL); for (const a of Object.values(ADDRESS)) for (const spot of a.at) add(spot); add(PLAZAS); add(STATION); add(RAIL_WEST); add(RAIL_NORTH); add(SPORTS); add(INDUSTRY); add(AIRPORT); add(QUAY);
  for (const st of STREETS) for (const z of st.z) add([[st.x - 1, z], [st.x, z], [st.x + 1, z]]);
  s.add(key(0, 0));
  return s;
})();
const free = (x, z) => !RESERVED.has(key(x, z)) && !nature(x, z);

/** Which neighbourhood a free block belongs to: a slice of the compass round the town hall. */
function wedgeOf(x, z) {
  if (!free(x, z)) return null;
  const a = deg(x, z);
  if (a >= 285 && a < 335) return 'tower'; // north-west, by the station and the railway
  if (a >= 335 || a < 25) return 'classic'; // north
  if (a < 70) return 'old'; // north-east, next to the old town
  if (a < 195) return 'villa'; // the east hills and both lake shores
  if (a < 245) return 'fantasy'; // south-west, towards the Uetliberg
  return 'classic'; // west
}
function wedgeBlocks(style, maxRing = 30) {
  const out = [];
  for (let r = 1; r <= maxRing; r++) {
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

export const DISTRICT_NAMES = {
  civic: 'Old Town', main: 'Bahnhofstrasse', plaza: 'City Plazas', leisure: 'Lakeside', hill: 'Zürichberg', sports: 'Sports Village',
  country: 'Countryside', industry: 'Industrial Quarter', transport: 'Airport', station: 'Main Station',
};

const P = (x, z) => [x * PITCH, z * PITCH]; // block units -> world

/**
 * @param {Array<{id:string, recipe?:object, styleSince?:string}>} residents  in join order
 * @param {Array<object>} landmarks  specials.landmarks, in the order they were added
 */
export function createCityLayout(residents = [], landmarks = [], villages = []) {
  const villageOf = new Map();
  for (const v of villages) for (const id of v.members) if (!villageOf.has(id)) villageOf.set(id, v);
  const blocks = new Map(); // "x,z" -> { x, z, kind, lots: [kind|null x4], style?, landmark?, paved?, along? }
  const homes = new Map(); // resident id -> { x, z, rot, style }
  const spots = new Map(); // landmark id -> { x, z, rot, scale, size, district, paved }
  const block = (x, z) => {
    const k = key(x, z);
    if (!blocks.has(k)) blocks.set(k, { x, z, kind: 'empty', lots: [null, null, null, null] });
    return blocks.get(k);
  };
  const lotPos = (x, z, j) => ({ x: x * PITCH + LOT_OFFSETS[j][0], z: z * PITCH + LOT_OFFSETS[j][1], rot: LOT_ROT[j] });
  const taken = new Set();
  const centre = (cells) => [cells.reduce((s, c) => s + c[0], 0) / cells.length, cells.reduce((s, c) => s + c[1], 0) / cells.length];
  const put = (def, cells, district, rot, size, kind = 'landmark') => {
    const paved = district !== 'country' && district !== 'hill';
    cells.forEach(([cx, cz]) => { taken.add(key(cx, cz)); Object.assign(block(cx, cz), { kind, landmark: def.id, paved }); });
    const [cx, cz] = centre(cells);
    spots.set(def.id, { x: cx * PITCH, z: cz * PITCH, rot, scale: size === 'L' ? 2 : size === 'S' ? 0.5 : 1, size, district: DISTRICT_NAMES[district] || district, paved });
  };
  const snap = (r) => Math.round(r / (Math.PI / 2)) * (Math.PI / 2);
  const faceCentre = (x, z) => snap(Math.atan2(-x, -z));
  const faceLake = (x, z) => {
    let best = null, bd = 1e9;
    for (let dx = -3; dx <= 3; dx++) for (let dz = -3; dz <= 3; dz++) {
      if (nature(Math.round(x) + dx, Math.round(z) + dz) !== 'lake') continue;
      const d = Math.hypot(dx, dz);
      if (d < bd) { bd = d; best = [dx, dz]; }
    }
    return best ? snap(Math.atan2(best[0], best[1])) : faceCentre(x, z);
  };

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
  const used = { classic: 0, tower: 0, villa: 0, old: 0, fantasy: 0 };
  for (const [style, list] of Object.entries(byStyle)) {
    const hb = houseBlocks(style);
    const slots = style === 'classic' ? residents.length : list.length;
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

  // ---- Landmarks by district ----
  const ownerStyle = (def) => { const st = homes.get(def.requestedById)?.style; return byStyle[st] ? st : 'classic'; };
  const lists = { civic: [], main: [], local: [], plaza: [], leisure: [], hill: [], sports: [], country: [], industry: [], transport: [], station: [] };
  for (const def of landmarks) {
    const plan = landmarkPlan(def);
    (lists[plan.district] || lists.main).push({ def, plan });
  }
  /** First free place in an ordered list of blocks (a 2 x 2 for a big one), nearest the start of the list first. */
  const pack = (list, district, cells, rotOf, overflow = null) => {
    const allowed = new Set(cells.map((c) => key(...c)));
    for (const item of list) {
      const big = item.plan.size === 'L';
      let found = null;
      for (const [x, z] of cells) {
        if (taken.has(key(x, z))) continue;
        if (!big) { found = [[x, z]]; break; }
        for (const [dx, dz] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
          const sq = [[x + dx, z + dz], [x + dx + 1, z + dz], [x + dx, z + dz + 1], [x + dx + 1, z + dz + 1]];
          if (sq.every((c) => allowed.has(key(...c)) && !taken.has(key(...c)))) { found = sq; break; }
        }
        if (found) break;
      }
      if (!found) { overflow?.push(item); continue; }
      put(item.def, found, district, rotOf(...centre(found)), big ? 'L' : 'M');
    }
  };

  // the town hall square
  Object.assign(block(0, 0), { kind: 'square' });
  taken.add(key(0, 0));
  // landmarks with a real address first
  for (const name of Object.keys(lists)) {
    lists[name] = lists[name].filter((item) => {
      const a = ADDRESS[item.def.type] || ADDRESS[landmarkKind(item.def)];
      if (!a) return true;
      const big = item.plan.size === 'L';
      const spot = a.at.find((cells) => cells.length === (big ? 4 : 1) && cells.every(([x, z]) => !taken.has(key(x, z)) && nature(x, z) !== 'lake' && nature(x, z) !== 'river'));
      if (!spot) return true; // its address is taken: it goes to its district
      put(item.def, spot, a.district, a.rot ?? faceCentre(...centre(spot)), big ? 'L' : 'M');
      spots.get(item.def.id).place = a.place;
      return false;
    });
  }
  // Old Town (west bank), then University Hill
  const civicCells = [...CIVIC_ORDER, ...UNI_HILL.filter(([x, z]) => !nature(x, z))];
  for (const l of lists.civic) {
    const cell = civicCells.find(([x, z]) => !taken.has(key(x, z)));
    if (!cell) { lists.main.push(l); continue; }
    put(l.def, [cell], 'civic', faceCentre(...cell), 'M');
  }
  // shopping streets: both sides of each promenade, from the north end down
  const shopCells = STREETS.flatMap((st) => st.z.flatMap((z) => [[st.x - 1, z, Math.PI / 2], [st.x + 1, z, -Math.PI / 2]]));
  const mainOverflow = [];
  for (const l of lists.main) {
    const cell = shopCells.find(([x, z]) => !taken.has(key(x, z)));
    if (!cell) { mainOverflow.push(l); continue; }
    put(l.def, [[cell[0], cell[1]]], 'main', cell[2], 'M');
  }
  STREETS.forEach((st, i) => {
    for (const z of st.z) {
      if (PLAZAS.some(([px, pz]) => px === st.x && pz === z)) continue;
      Object.assign(block(st.x, z), { kind: 'promenade', along: 'z', street: st.name });
      taken.add(key(st.x, z));
      for (const x of [st.x - 1, st.x + 1]) if (!taken.has(key(x, z))) { Object.assign(block(x, z), { kind: 'main-empty' }); taken.add(key(x, z)); }
    }
  });
  // everyday shops: on the edge of a pocket park in the owner's neighbourhood (2 per park)
  const shopCount = {};
  for (const l of lists.local) {
    const style = ownerStyle(l.def);
    const k = (shopCount[style] = (shopCount[style] || 0) + 1) - 1;
    const pb = parkBlocks(style)[Math.floor(k / 2)];
    const j = k % 2 ? 2 : 1;
    const b = block(pb[0], pb[1]);
    b.kind = 'park';
    b.style = style;
    b.lots[j] = 'shop';
    spots.set(l.def.id, { ...lotPos(pb[0], pb[1], j), scale: 0.5, size: 'S', district: NAMES[style], paved: true });
    used[style] = Math.max(used[style], wedge(style).findIndex(([x, z]) => x === pb[0] && z === pb[1]) + 1);
  }
  for (const style of Object.keys(used)) {
    wedge(style).slice(0, used[style]).forEach(([x, z], k) => { if (k % 4 === 3) Object.assign(block(x, z), { kind: 'park', style }); });
  }
  for (const b of blocks.values()) if (b.kind !== 'empty') taken.add(key(b.x, b.z));

  // plazas: every plaza is a paved square; statues take them in order, then the lakeside
  const plazaOverflow = [];
  lists.plaza.forEach((l, k) => {
    if (k >= PLAZAS.length) return plazaOverflow.push(l);
    const [x, z] = PLAZAS[k];
    put(l.def, [[x, z]], 'plaza', faceCentre(x, z), 'M', 'plaza');
  });
  for (const [x, z] of PLAZAS) if (!taken.has(key(x, z))) { Object.assign(block(x, z), { kind: 'plaza' }); taken.add(key(x, z)); }
  for (const [x, z] of PLAZAS) if (STREETS.some((st) => st.x === x)) block(x, z).along = 'z'; // a square on a shopping street
  // the lakeside: parks and attractions along the shore, nearest the river mouth first
  pack([...lists.leisure, ...plazaOverflow, ...mainOverflow], 'leisure', QUAY, faceLake);

  // the city's radius: everything in town so far
  let cityR = 3;
  for (const b of blocks.values()) if (b.kind !== 'empty') cityR = Math.max(cityR, ring(b.x, b.z));
  // the lakeside park by the river mouth; further along the shore stays open until it is needed
  for (const [x, z] of QUAY) if (Math.hypot(x - 1, z - 4.6) <= 3.2 && !taken.has(key(x, z))) { Object.assign(block(x, z), { kind: 'green', quay: true }); taken.add(key(x, z)); }
  for (const [x, z] of OLD_TOWN) if (!taken.has(key(x, z))) { Object.assign(block(x, z), { kind: 'civic-empty' }); taken.add(key(x, z)); }
  for (const [x, z] of UNI_HILL) if (!nature(x, z) && !taken.has(key(x, z))) { Object.assign(block(x, z), { kind: 'green' }); taken.add(key(x, z)); }

  // ---- The main station and the railways ----
  const [st0, ...stRest] = lists.station;
  if (st0) put(st0.def, STATION, 'station', 0, 'L');
  lists.transport.push(...stRest);
  for (const [x, z] of [...RAIL_WEST, ...RAIL_NORTH]) { taken.add(key(x, z)); if (!nature(x, z)) block(x, z).kind = 'rail'; }
  const rails = [
    { name: 'West line', path: [P(-4.5, -5), P(-30, -5)] },
    { name: 'Airport line', path: [P(-3, -5.5), P(-3, -19.5)] },
  ];
  // ---- Sports Village: stadiums round a sports park, training pitches in between ----
  const sportsCells = [...SPORTS].sort((a, b) => b[0] - a[0] || Math.abs(a[1] + 0.5) - Math.abs(b[1] + 0.5));
  pack(lists.sports, 'sports', sportsCells, (x, z) => (z < -0.5 ? 0 : Math.PI)); // both rows face the avenue between them
  let sportsW = -12;
  for (const b of blocks.values()) if (b.landmark && spots.get(b.landmark)?.district === DISTRICT_NAMES.sports) sportsW = Math.min(sportsW, b.x);
  // training pitches round the stadiums, one more row of them past the last stadium
  for (const [x, z] of SPORTS) if (x >= sportsW - 1 && !taken.has(key(x, z))) { Object.assign(block(x, z), { kind: 'pitch', paved: true }); taken.add(key(x, z)); }
  // ---- Industrial Quarter: between the river and the west railway, growing west ----
  const indCells = [...INDUSTRY].filter(([x, z]) => !nature(x, z)).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  pack(lists.industry, 'industry', indCells, () => 0);
  let indW = -11;
  for (const b of blocks.values()) if (b.landmark && spots.get(b.landmark)?.district === DISTRICT_NAMES.industry) indW = Math.min(indW, b.x);
  for (const [x, z] of indCells) if (x >= indW - (((indW + 11) % 2) ? 0 : 1) && !taken.has(key(x, z))) { Object.assign(block(x, z), { kind: 'yard', paved: true }); taken.add(key(x, z)); }
  // ---- Airport (north) and the hills ----
  const airCells = [...AIRPORT].sort((a, b) => Math.abs(a[0] + 3) - Math.abs(b[0] + 3) || b[1] - a[1]);
  pack(lists.transport, 'transport', airCells, () => 0);
  const hillCells = [];
  for (let x = -14; x <= 12; x++) for (let z = -10; z <= 12; z++) if (nature(x, z) === 'forest') hillCells.push([x, z]);
  hillCells.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  pack(lists.hill, 'hill', hillCells, faceCentre);

  // ---- Countryside: farms, castle, dam, spread round the city ----
  for (const b of blocks.values()) if (b.kind !== 'empty') taken.add(key(b.x, b.z));
  const blocked = (x, z) => taken.has(key(x, z)) || nature(x, z) || RESERVED.has(key(x, z));
  const place = (list, r1, r2, district, startAngle) => {
    const placedAngles = [];
    const gap = (a, b) => { const d = Math.abs(a - b) % (Math.PI * 2); return Math.min(d, Math.PI * 2 - d); };
    for (const { def, plan } of list) {
      const big = plan.size === 'L';
      const cands = [];
      for (let x = -r2; x <= r2; x++) for (let z = -r2; z <= r2; z++) {
        const cells = big ? [[x, z], [x + 1, z], [x, z + 1], [x + 1, z + 1]] : [[x, z]];
        if (cells.every(([cx, cz]) => ring(cx, cz) >= r1 && ring(cx, cz) <= r2 && !blocked(cx, cz))) cands.push(cells);
      }
      const score = (cells) => {
        const a = angle(...centre(cells));
        return placedAngles.length ? Math.min(...placedAngles.map((p) => gap(a, p))) : -gap(a, startAngle);
      };
      cands.sort((a, b) => score(b) - score(a) || angle(...centre(a)) - angle(...centre(b)));
      const cells = cands[0];
      if (!cells) continue;
      placedAngles.push(angle(...centre(cells)));
      put(def, cells, 'country', faceCentre(...centre(cells)), big ? 'L' : 'M');
    }
  };
  const countryR1 = Math.max(8, cityR + 2);
  const countryR2 = countryR1 + 1 + Math.floor(lists.country.length / 10) * 2;
  place(lists.country, countryR1, countryR2, 'country', Math.PI * 0.4);

  // ---- Invite villages: a run of blocks on the ring just outside the countryside ----
  const villageInfo = [];
  {
    const rv = countryR2 + 1;
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
      const start = starts.find((i0) => [...Array(need).keys()].every((j) => !blocked(...ringList[(i0 + j) % n])));
      if (start === undefined) return;
      const cells = [...Array(need).keys()].map((j) => ringList[(start + j) % n]);
      cells.forEach(([x, z]) => { taken.add(key(x, z)); Object.assign(block(x, z), { kind: 'homes', style: 'village', village: v.id }); });
      members.forEach((id, m) => {
        const [x, z] = cells[Math.floor(m / 4)];
        block(x, z).lots[m % 4] = 'house';
        homes.set(id, { ...lotPos(x, z, m % 4), style: 'village', village: v.name });
      });
      for (const [x, z] of cells) block(x, z).lots = block(x, z).lots.map((l) => l || 'garden');
      const [fx, fz] = cells[0];
      const len = Math.hypot(fx, fz) || 1;
      villageInfo.push({ id: v.id, name: v.name, members, blocks: cells, sign: { x: fx * PITCH - (fx / len) * (BLOCK / 2 + 0.8), z: fz * PITCH - (fz / len) * (BLOCK / 2 + 0.8), rot: Math.atan2(-fx, -fz) } });
    });
  }

  // ---- Streets with a job: avenues out to the districts, tram lines, district gates ----
  const roads = [
    { name: 'Badenerstrasse', path: [P(-4.5, -0.5), P(-11.5, -0.5)] }, // to the Sports Village
    { name: 'Hardturmstrasse', path: [P(-4.5, -5.5), P(-10.5, -5.5)] }, // to the Industrial Quarter
    { name: 'Airport road', path: [P(-2.5, -5.5), P(-2.5, -19.5)] },
    { name: 'Seestrasse', path: [P(-4.5, 4.5), P(-5.4, 4.5), P(-5.4, 7.3), P(-2.5, 9.5)] }, // along the west shore
    { name: 'Uetlibergstrasse', path: [P(-5.4, 5.5), P(-8.5, 5.5)] },
  ];
  const trams = [
    // the old-town loop: down Bahnhofstrasse to the lake, over the bridge, up the east bank, back to the station
    { name: 'Line 1', loop: true, path: [P(-3, -3.5), P(-3, 4.5), P(1.5, 4.5), P(1.5, -3.5), P(-3, -3.5)] },
    // across town: Sports Village - Paradeplatz - town hall bridge - University Hill
    { name: 'Line 2', loop: false, path: [P(-11.5, -0.5), P(6.5, -0.5)] },
  ];
  const signs = [
    { name: 'Sports Village', x: -11.5 * PITCH, z: -0.5 * PITCH, rot: Math.PI / 2 },
    { name: 'Industrial Quarter', x: -10.5 * PITCH, z: -5.5 * PITCH, rot: Math.PI / 2 },
  ];

  // ---- the remaining blocks: lake, river, forest, lawn, fields ----
  let outerR = countryR2 + 3;
  for (const b of blocks.values()) if (b.kind !== 'empty') outerR = Math.max(outerR, ring(b.x, b.z) + 1);
  outerR = Math.min(outerR, 28);
  for (let x = -outerR; x <= outerR; x++) for (let z = -outerR; z <= outerR; z++) {
    const b = block(x, z);
    const n = nature(x, z);
    if (n && b.kind !== 'landmark') { b.kind = n; continue; }
    if (b.kind !== 'empty') continue;
    const r = ring(x, z);
    if (r <= cityR) { b.kind = 'lawn'; b.style = wedgeOf(x, z); }
    else if (r <= countryR2) b.kind = 'country';
    else if (r <= countryR2 + 1) b.kind = 'meadow';
    else b.kind = 'outskirts';
  }
  return {
    blocks: [...blocks.values()], homes, spots, cityR, beltR: countryR2, outerR, villages: villageInfo,
    lake: LAKE.map(([x, z]) => P(x, z)), river: RIVER.map(([x, z]) => P(x, z)), riverWidth: RIVER_WIDTH,
    forests: FORESTS.map((f) => ({ ...f, x: f.x * PITCH, z: f.z * PITCH, rx: f.rx * PITCH, rz: f.rz * PITCH })),
    rails, roads, trams, signs,
    zones: {
      lakeside: { x: -1 * PITCH, z: 5 * PITCH }, sports: { x: (sportsW - 12) / 2 * PITCH, z: -0.5 * PITCH }, industry: { x: (indW - 11) / 2 * PITCH, z: -8 * PITCH },
      airport: { x: -3 * PITCH, z: -21.5 * PITCH }, oldTown: { x: 0, z: 0 }, country: countryR1,
    },
  };
}

const NAMES = { classic: 'Classic Homes', tower: 'Tower Row', villa: 'Villa Hills', old: 'Old Town', fantasy: 'Fantasy Lane' };
