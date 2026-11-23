// The landscape city tour (1920x1080): introduces the city plan, the districts and their landmarks, Christmas in
// Seaty (in season), answers the questions new viewers ask, and invites people to move in. Same frame API as
// video.js, so scripts/render-video.mjs renders it:
//   npm run trailer   the channel trailer: a few highlight landmarks per district (preview: tour.html)
//   npm run tour      the full tour: every landmark (preview: tour.html?full)

import { createWorld, THREE, CSS2DObject, FLOOR_H, PITCH } from './world.js';
import { NEIGHBOURHOODS } from './catalog.js';

const W = 1920, H = 1080, FPS = 30;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const $ = (id) => document.getElementById(id);
document.body.classList.add(RENDER ? 'render' : 'preview');

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fade = (lt, a, b, d = 0.4) => clamp01((lt - a) / d) * (1 - clamp01((lt - b) / d));
function show(el, o, rise = 30) {
  el.style.opacity = o.toFixed(3);
  el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
  el.style.transform = `translateY(${((1 - o) * rise).toFixed(1)}px)`;
}
const getJSON = (u) => fetch(`${u}?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null));

const world = createWorld({ container: $('scene'), width: W, height: H, pixelRatio: 1, shadowSize: 4096 });
const { camera } = world;
camera.fov = 42;
camera.updateProjectionMatrix();

function orbit(target, dist, az, elevDeg) {
  const el = (elevDeg * Math.PI) / 180;
  return { pos: new THREE.Vector3(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist), target: target.clone() };
}
const say = (n) => String(n || '').replace(/^@/, '');

const ready = (async () => {
  const [city, specials] = await Promise.all([getJSON('data/city.json'), getJSON('data/specials.json')]);
  world.build(city, { labelTop: 0, specials });
  await document.fonts.ready;
  return timeline(city, specials);
})();

function timeline(city) {
  const L = world.layout;
  const site = (params.get('site') || `${location.host}${location.pathname.replace(/tour\.html$/, '')}`).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const lms = [...world.landmarks.values()];
  const inDistrict = (d) => lms.filter((l) => l.district === d);
  const VO = window.SEATY_VO || {};
  const scenes = [];
  let t = 0;
  const add = (type, dur, data = {}, text = null, at = 0.6) => {
    const i = scenes.length;
    const vo = text ? { text, at } : null;
    if (vo && VO[i]) dur = Math.max(dur, at + VO[i] + 0.7);
    scenes.push({ type, start: t, dur, vo, ...data });
    t += dur;
  };
  const pick = (arr, i) => arr[i % arr.length];
  const owner = (l) => (l.def.requestedBy ? `Built for ${l.def.requestedBy}` : 'Owned by the city');
  const lmLine = (l, i) => (l.def.requestedBy
    ? pick([`The ${l.def.name}, built for ${say(l.def.requestedBy)}.`, `Here's the ${l.def.name}, requested by ${say(l.def.requestedBy)}.`, `This is the ${l.def.name}, owned by ${say(l.def.requestedBy)}.`, `And the ${l.def.name}, from ${say(l.def.requestedBy)}.`], i)
    : `The ${l.def.name}.`);
  // the trailer shows the biggest few landmarks of each district; ?full shows every one
  const FULL = params.has('full');
  const SIZE = { L: 3, M: 2, S: 1 };
  const highlights = (list) => (FULL ? list : [...list].sort((a, b) => (SIZE[b.size] || 0) - (SIZE[a.size] || 0) || b.floors - a.floors).slice(0, 2));
  // each landmark once (the Old Town district and the Old Town neighbourhood share a name)
  const shown = new Set();
  const lmScenes = (list, chapter) => {
    const pickd = highlights(list.filter((l) => !shown.has(l)));
    pickd.forEach((l) => shown.add(l));
    lmScenesOf(pickd, chapter);
  };
  const lmScenesOf = (list, chapter) => list.forEach((l, i) => add('landmark', 3.4, { l, chapter, caption: { tag: `${l.district} · ${l.floors} floor${l.floors === 1 ? '' : 's'}`, name: l.def.name, sub: owner(l) } }, lmLine(l, i), 0.5));

  // the demo house that grows in "how it works": a plain house near downtown
  const demo = world.list.filter((e) => !e.recipe).sort((a, b) => a.outer.position.length() - b.outer.position.length())[0];
  const residents = city.residentCount;

  // ---- 1. welcome ----
  const centre = new THREE.Vector3();
  const XMAS = !!world.christmasTree;
  add('intro', 7, { title: { kicker: 'WELCOME TO THE NEW', big: 'Seaty<span>.</span>', sub: 'A whole city built by the people who comment on my videos' } },
    `Welcome to the new Seaty: a whole city built by the people who comment on my videos. ${residents} citizens live here, we just rebuilt it with a brand new city plan${XMAS ? ', and Christmas is here' : ''}. Let me show you around.`, 0.6);
  // ---- 2. how it works ----
  add('how', 9, { demo, chapter: 'How it works', panel: { title: 'How Seaty works', items: [['🏠', 'Comment on any video and <b>you get a house</b>'], ['🏗️', 'Every different video you comment on adds <b>+1 floor</b>'], ['🎬', 'Every day a new Short shows <b>who moved in</b>']] } },
    'It works like this. Comment on any video, and you get a house. Every different video you comment on adds one more floor. And every day, a new Short shows who moved in.', 0.6);
  // ---- 3. the plan ----
  add('plan', 9, { chapter: 'The city plan' },
    'Here is the new plan, a real lake city. The river runs out of the lake through the old town, Bahnhofstrasse goes from the main station down to the lake, trams and trains connect everything, and around it all, five neighbourhoods, a Sports Village, the industry by the river and the airport in the north.', 0.6);
  // ---- 4. downtown ----
  add('area', 4.5, { chapter: 'Old Town', target: new THREE.Vector3(0, 0, 0), dist: 60, elev: 38, az0: 0.5 }, 'The old town is the heart of the city, by the river, around the town hall.', 0.5);
  lmScenes(inDistrict('Old Town'), 'Old Town');
  // ---- 5. Main Street ----
  const station = lms.find((l) => l.district === 'Main Station');
  const mainShops = inDistrict('Bahnhofstrasse').sort((a, b) => a.outer.position.z - b.outer.position.z);
  add('street', 8, { chapter: 'Bahnhofstrasse', z0: -3.5 * PITCH, z1: 3.5 * PITCH, x: -3 * PITCH },
    'Bahnhofstrasse is our shopping street: from the main station, past the shops, with the tram running down the middle, all the way to the lake.', 0.5);
  lmScenes(mainShops, 'Bahnhofstrasse');
  if (station) lmScenes([station], 'Bahnhofstrasse');
  // ---- 6. neighbourhoods ----
  const HOOD_LINE = {
    classic: 'Most citizens live in Classic Homes, with pocket parks and everyday shops between the houses.',
    tower: 'Tower Row is for glass towers and modern houses.',
    villa: 'Villa Hills is home to the mansions and villas.',
    old: 'Old Town has the cottages, the medieval house and the Japanese café.',
    fantasy: 'And Fantasy Lane is for the wildest dream houses of all.',
  };
  for (const style of ['classic', 'tower', 'villa', 'old', 'fantasy']) {
    const homes = world.list.filter((e) => [...L.homes.entries()].some(([id, h]) => id === e.resident.id && h.style === style));
    if (!homes.length) continue;
    const c = homes.reduce((s, e) => s.add(e.outer.position), new THREE.Vector3()).divideScalar(homes.length);
    const spread = Math.max(...homes.map((e) => e.outer.position.distanceTo(c)));
    const dream = homes.filter((e) => e.recipe && e.houseTitle).slice(0, 4).map((e) => e.houseTitle);
    add('area', 5.5, {
      chapter: 'Neighbourhoods', target: c, dist: Math.max(38, spread * 2.4 + 20), elev: 42, az0: 0.9,
      caption: { tag: `${homes.length} home${homes.length === 1 ? '' : 's'}`, name: NEIGHBOURHOODS[style], sub: style !== 'classic' && dream.length ? dream.join(' · ') : 'Pocket parks and everyday shops between the houses' },
    }, HOOD_LINE[style], 0.5);
    lmScenes(lms.filter((l) => l.district === NEIGHBOURHOODS[style]), 'Neighbourhoods');
  }
  // ---- 7. plazas, lakeside, the hills ----
  const Z = L.zones;
  if (inDistrict('City Plazas').length) {
    add('area', 4, { chapter: 'City Plazas', target: new THREE.Vector3(-PITCH, 0, 2 * PITCH), dist: 75, elev: 40, az0: 1.4 }, 'The statues stand on the city squares, from the lake up to the old town.', 0.5);
    lmScenes(inDistrict('City Plazas'), 'City Plazas');
  }
  add('area', 4.5, { chapter: 'Lakeside', target: new THREE.Vector3(Z.lakeside.x, 0, Z.lakeside.z), dist: 90, elev: 36, az0: 0.4 },
    'Where the river meets the lake, the lakeside promenade: parks, the theme park, the circus and the aquarium.', 0.5);
  lmScenes(inDistrict('Lakeside'), 'Lakeside');
  lmScenes(inDistrict('Zürichberg'), 'Lakeside');
  // ---- 8. Sports Village, countryside, industry, airport ----
  add('area', 4.5, { chapter: 'Sports Village', target: new THREE.Vector3(Z.sports.x, 0, Z.sports.z), dist: 110, elev: 36, az0: 2.2 },
    'Take tram line 2 west to the Sports Village: the stadiums, the ballpark and the race track, with training pitches all around.', 0.5);
  lmScenes(inDistrict('Sports Village'), 'Sports Village');
  add('area', 4.5, { chapter: 'The countryside', target: new THREE.Vector3(0, 0, 0), dist: (L.beltR + 3) * PITCH * 1.25, elev: 34, az0: 2.2 },
    'All around the city lies the countryside: farms, fields and the dam.', 0.5);
  lmScenes(inDistrict('Countryside'), 'The countryside');
  add('area', 4.5, { chapter: 'Industrial Quarter', target: new THREE.Vector3(Z.industry.x, 0, Z.industry.z), dist: 110, elev: 36, az0: 0.6 },
    'Down the river, between the water and the railway, the Industrial Quarter: every factory, the power plant and the reactor.', 0.5);
  lmScenes(inDistrict('Industrial Quarter'), 'Industrial Quarter');
  lmScenes(inDistrict('Airport'), 'Airport');
  // ---- 9. Christmas (20 Nov to 6 Jan), or just the city at night ----
  if (XMAS) {
    const tree = world.christmasTree.position;
    const plant = lms.find((l) => l.def.type === 'power-plant');
    add('xmas', 7, { chapter: 'Christmas in Seaty', title: { kicker: 'IT’S HERE', big: 'Christmas<span>.</span>', sub: 'Snow on every roof, lights in every street, and Santa over the city' } },
      'And now, the best part: Christmas is here! Snow on every roof, lights in every street, and someone special flying over the city. Let me show you, at night.', 0.6);
    add('xtree', 7, { chapter: 'Christmas in Seaty', night: true, flash: true, tree, caption: { tag: 'Münsterhof · Old Town', name: 'The big Christmas tree', sub: 'With a Christmas market right next to it, by the river' } },
      'In the old town, by the river, stands the big Christmas tree, with a little Christmas market right next to it.', 0.8);
    add('street', 7, { chapter: 'Christmas in Seaty', night: true, z0: 3.5 * PITCH, z1: -3.5 * PITCH, x: -3 * PITCH, y: 9, caption: { tag: 'Bahnhofstrasse', name: 'A street full of lights', sub: 'Thousands of glowing tubes over the shopping street' } },
      'Bahnhofstrasse is covered in thousands of glowing lights, from the lake all the way up to the station.', 0.5);
    add('street', 5.5, { chapter: 'Christmas in Seaty', night: true, z0: -2 * PITCH, z1: 3 * PITCH, x: 3 * PITCH, caption: { tag: 'Niederdorf', name: 'Golden stars', sub: 'Big golden stars over the old lanes' } },
      'Across the river, the old lanes have big golden stars.', 0.5);
    if (plant) add('landmark', 5.5, { l: plant, night: true, chapter: 'Christmas in Seaty', caption: { tag: 'Industrial Quarter', name: 'The power plant light tree', sub: `Dressed for Christmas, as ${plant.def.requestedBy || 'the city'} asked` } },
      'Even the power plant got dressed up, as a giant tree of lights.', 0.5);
    add('santa', 8, { chapter: 'Christmas in Seaty', night: true, caption: { tag: 'Look up!', name: 'Santa’s sleigh', sub: 'Open the website at night and try to spot it' } },
      'And look up! Santa’s sleigh is circling over Seaty. Open the website, press the night button, and try to spot it yourself.', 0.6);
  } else {
    add('night', 6.5, { chapter: 'Seaty at night', night: true, flash: true }, 'And when the sun goes down, Seaty lights up.', 1.0);
  }
  // ---- 10. questions people ask ----
  const tallest = [...world.list].sort((a, b) => b.resident.floors - a.resident.floors)[0];
  const fantasy = world.list.filter((e) => e.recipe && e.houseTitle && [...L.homes.entries()].some(([id, h]) => id === e.resident.id && h.style === 'fantasy'));
  // a low, fun dream house (today's hook if it's there), so the shot isn't one tall tower
  const low = (list) => list.filter((e) => e.resident.floors <= 3);
  const dreamSpot = world.list.find((e) => e.houseTitle === 'Pickle Jar House') || low(fantasy)[0] || low(world.list.filter((e) => e.recipe))[0] || demo;
  const airport = lms.find((l) => l.def.type === 'airport' || l.district === 'Airport') || lms[0];
  const village = (L.villages || [])[0];
  const QA = [
    { q: 'What is Seaty?', a: [['🏙️', 'A 3D city where <b>every citizen is a real commenter</b>'], ['🎬', 'A new Short <b>every day</b> shows who moved in and what I built']],
      vo: 'So, what is Seaty? It is a 3D city where every single citizen is a real person who commented. And every day, a new Short shows who moved in, and what I built.', spot: { target: centre, dist: world.radius * 1.9, elev: 40, az0: 1.0 } },
    { q: 'How do I move in?', a: [['💬', 'Comment on <b>any</b> of my videos'], ['🏠', 'You get a house <b>in the next update</b>'], ['🆓', 'It’s <b>free</b>, nothing to buy']],
      vo: 'How do you move in? Just comment on any of my videos. Your house appears in the next update. It is completely free.', spot: { entry: demo } },
    { q: 'How do I get more floors?', a: [['🏗️', '<b>+1 floor</b> for every different video you comment on'], ['🚫', 'Floors can’t be bought or given away']],
      vo: 'How do you get more floors? Every different video you comment on adds one floor. Floors can not be bought, or given to someone else.', spot: { entry: tallest, high: true } },
    { q: 'Can I choose my house?', a: [['✨', 'Yes! Ask for a <b>dream house</b> in a comment'], ['🐶', 'Or a <b>pool, a pet, a garden</b>, a sign on the roof…'], ['🛠️', 'I build every request I can, <b>every day</b>']],
      vo: 'Can you choose your house? Yes! Ask for a dream house in a comment: a castle, a rocket, even a pickle jar. Or a pool, a pet, or a garden. I build every request I can, every day.', spot: { entry: dreamSpot } },
    { q: 'Where will I live?', a: [['📍', 'Plots go in the order people <b>move in</b>'], ['🏘️', 'Your house style picks your <b>neighbourhood</b>'], ['🔎', 'Find your house on the <b>website</b>']],
      vo: 'Where will you live? Plots go in the order people move in, and your house style picks your neighbourhood. You can find your house on the website.', spot: { target: new THREE.Vector3(PITCH, 0, 0), dist: world.radius * 1.4, elev: 55, az0: 2.0 } },
    { q: 'Can I build a landmark?', a: [['🏛️', 'Ask for one: a shop, a stadium, a factory…'], ['✌️', 'Up to <b>2 landmarks</b> per citizen'], ['⭐', 'Each kind exists only <b>once</b>, so be quick!']],
      vo: 'Can you build a landmark? Yes. Ask for a shop, a stadium, a factory, anything. You can own up to two, and each kind exists only once in the city, so be quick!', spot: { lm: airport } },
    { q: 'Can I bring friends?', a: [['🤝', 'Your friend writes <b>“invited by @you”</b> in their first comment'], ['🎖️', '3 friends: <b>Ambassador</b> medal'], ['🏡', '5 friends: <b>your own village</b> in the countryside']],
      vo: 'Can you bring friends? Yes! When a new friend writes, invited by, and your name, in their first comment, it counts. Three friends make you an Ambassador, and five friends give you your own village in the countryside.',
      spot: village ? { target: new THREE.Vector3(village.sign.x, 0, village.sign.z), dist: 45, elev: 34, az0: 0.6 } : { target: centre, dist: (L.beltR + 3) * PITCH * 1.25, elev: 34, az0: 3.0 } },
    { q: 'What else can I win?', a: [['🏆', '<b>Weekly challenge</b>: find the golden object on the website'], ['🎖️', 'Medals for <b>active citizens</b>'], ['🎁', 'The monthly <b>Citizen Award</b>: rules in the description']],
      vo: 'And what else is there? Every week a golden object hides somewhere on the website, and the first to find it wins a trophy. Active citizens win medals. And there is the monthly Citizen Award: more floors means more chances, and the rules are in the description.',
      spot: { target: centre, dist: world.radius * 1.5, elev: 30, az0: 4.4 } },
  ];
  QA.forEach((x, n) => add('qa', 7, { chapter: 'Your questions', spot: x.spot, flash: n === 0, panel: { title: x.q, items: x.a } }, x.vo, 0.6));
  // ---- 11. invitation ----
  add('outro', 9, { night: true, flash: true, cta:{ big: `Become citizen <span>#${residents + 1}</span>`, small: 'Comment below and I will build your house tomorrow', url: `Find your house: ${site}` } },
    `Seaty has ${residents} citizens so far. Comment below, and you'll be number ${residents + 1}. Find your house on the website, subscribe, and see you in the city!`, 0.8);

  // ---- district labels for the plan scene ----
  const dl = [];
  const label = (text, pos) => {
    const el = document.createElement('div');
    el.className = 'dlabel';
    el.textContent = text;
    const o = new CSS2DObject(el);
    o.position.copy(pos);
    o.visible = false;
    world.scene.add(o);
    dl.push(o);
  };
  label('Old Town', new THREE.Vector3(0, 10, 0));
  label('Bahnhofstrasse', new THREE.Vector3(-3 * PITCH, 6, 0));
  for (const style of Object.keys(NEIGHBOURHOODS)) {
    const pts = [...L.homes.values()].filter((h) => h.style === style);
    if (!pts.length) continue;
    // pushed outward from the centre so the small neighbourhoods' labels don't overlap
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    const out = style === 'classic' ? 1 : 1.9;
    label(NEIGHBOURHOODS[style], new THREE.Vector3(cx * out, 6, cz * out));
  }
  const firstOf = (d) => inDistrict(d)[0];
  label('Lake', new THREE.Vector3(4 * PITCH, 8, 9 * PITCH));
  label('Lakeside', new THREE.Vector3(L.zones.lakeside.x, 12, L.zones.lakeside.z));
  label('Sports Village', new THREE.Vector3(L.zones.sports.x, 12, L.zones.sports.z));
  label('Industrial Quarter', new THREE.Vector3(L.zones.industry.x, 16, L.zones.industry.z));
  label('Airport', new THREE.Vector3(L.zones.airport.x, 16, L.zones.airport.z));

  // ---- camera per scene ----
  function rawPose(s, lt) {
    const k = lt / s.dur;
    switch (s.type) {
      case 'intro': return orbit(centre, world.radius * (3.0 - 0.6 * ease(k)), 0.5 + k * 0.5, 36);
      case 'how': {
        const p = s.demo.outer.position;
        return orbit(new THREE.Vector3(p.x - 6, 3, p.z), 26, s.demo.outer.rotation.y + 0.9 + k * 0.4, 24);
      }
      case 'plan': return orbit(new THREE.Vector3(PITCH, 0, 0), (L.beltR + 3) * PITCH * 1.9, 0.001 + k * 0.15, 80);
      case 'area': return orbit(s.target, s.dist * (1.05 - 0.1 * k), s.az0 + k * 0.45, s.elev);
      case 'street': {
        const z = s.z0 + (s.z1 - s.z0) * ease(k);
        const dir = Math.sign(s.z1 - s.z0) || 1;
        if (s.y) return { pos: new THREE.Vector3(s.x + 7, s.y, z - 10 * dir), target: new THREE.Vector3(s.x, 4.5, z + 18 * dir) };
        return { pos: new THREE.Vector3(s.x + 26, 13, z - 10), target: new THREE.Vector3(s.x, 2, z + 22) };
      }
      case 'xmas': return orbit(new THREE.Vector3(0, 0, PITCH), world.radius * (1.5 - 0.25 * ease(k)), 0.2 + k * 0.5, 34);
      case 'xtree': {
        const p = s.tree;
        return orbit(new THREE.Vector3(p.x, 9, p.z), 46 - 12 * ease(k), 0.5 + k * 0.6, 16);
      }
      case 'santa': {
        // in front of the sleigh and a little above, looking back at it as it flies towards us over the city lights
        const { pos: target, heading } = world.sleighAt(s.start + lt);
        const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
        const side = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
        const pos = target.clone().addScaledVector(fwd, 24 - 4 * k).addScaledVector(side, 9).add(new THREE.Vector3(0, 14, 0));
        return { pos, target: target.clone().add(new THREE.Vector3(0, -6, 0)) };
      }
      case 'qa': {
        const sp = s.spot;
        if (sp.entry) {
          const p = sp.entry.outer.position, h = sp.entry.resident.floors * FLOOR_H;
          return sp.high
            ? orbit(new THREE.Vector3(p.x, h * 0.55, p.z), h * 1.5 + 22, sp.entry.outer.rotation.y + 0.9 + k * 0.4, 20)
            : orbit(new THREE.Vector3(p.x, 3, p.z), 24, sp.entry.outer.rotation.y + 0.7 + k * 0.45, 26);
        }
        if (sp.lm) return rawPose({ type: 'landmark', l: sp.lm, dur: s.dur }, lt);
        return orbit(sp.target, sp.dist * (1.05 - 0.1 * k), sp.az0 + k * 0.4, sp.elev);
      }
      case 'landmark': {
        const l = s.l;
        const big = l.size === 'L', small = l.size === 'S';
        const dist = small ? 14 : Math.max(24, l.height * 2.2) * (big ? 1.7 : 1);
        const p = l.outer.position;
        return orbit(new THREE.Vector3(p.x, Math.max(1, l.height * 0.35), p.z), dist, l.outer.rotation.y + 0.55 + k * 0.5, small ? 32 : 28);
      }
      case 'night': return orbit(centre, world.radius * 2.4, 2.6 + k * 0.5, 30);
      case 'rules': return orbit(new THREE.Vector3(-1.2 * PITCH, 0, 0), world.radius * 1.9, 4.0 + k * 0.3, 34);
      case 'outro': return orbit(centre, world.radius * (2.0 + 0.4 * k), 5.2 + k * 0.4, 32);
    }
  }
  // with the question panel on the right, slide the camera sideways so the subject sits in the left half
  function shifted(s, p) {
    if (s.type !== 'qa') return p;
    const dir = p.target.clone().sub(p.pos);
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).setY(0).normalize().multiplyScalar(dir.length() * 0.24);
    return { pos: p.pos.clone().add(right), target: p.target.clone().add(right) };
  }
  const endPose = scenes.map((s) => shifted(s, rawPose(s, s.dur)));
  function pose(i, lt) {
    const p = shifted(scenes[i], rawPose(scenes[i], lt));
    const BLEND = 1.4;
    if (i === 0 || lt >= BLEND) return p;
    const k = ease(clamp01(lt / BLEND));
    return { pos: endPose[i - 1].pos.clone().lerp(p.pos, k), target: endPose[i - 1].target.clone().lerp(p.target, k) };
  }

  // ---- overlays ----
  let last = null;
  function frame(time) {
    const i = Math.max(0, scenes.findLastIndex((s) => time >= s.start));
    const s = scenes[i];
    const lt = time - s.start;
    if (last !== s) {
      if (s.title) { $('t-kicker').textContent = s.title.kicker; $('t-big').innerHTML = s.title.big; $('t-sub').textContent = s.title.sub; }
      if (s.chapter) $('chapter').innerHTML = `<span>SEATY</span>${s.chapter}`;
      if (s.caption) { $('c-tag').textContent = s.caption.tag; $('c-name').textContent = s.caption.name; $('c-sub').textContent = s.caption.sub; }
      if (s.panel) { $('p-title').textContent = s.panel.title; $('p-list').innerHTML = s.panel.items.map(([ic, txt]) => `<li><span class="ic">${ic}</span><span>${txt}</span></li>`).join(''); }
      if (s.cta) { $('cta-big').innerHTML = s.cta.big; $('cta-small').textContent = s.cta.small; $('cta-url').textContent = s.cta.url; }
      last = s;
    }
    show($('title'), s.title ? fade(lt, 0.3, s.dur - 0.5) : 0, 40);
    show($('chapter'), s.chapter ? fade(lt, 0.2, s.dur - 0.3) : 0, 0);
    show($('caption'), s.caption ? fade(lt, 0.7, s.dur - 0.4) : 0, 30);
    show($('panel'), s.panel ? fade(lt, 0.4, s.dur - 0.4) : 0, 30);
    show($('cta'), s.type === 'outro' ? fade(lt, 0.6, s.dur + 10) : 0, 40);
    $('shade').style.opacity = (s.title ? fade(lt, 0.2, s.dur - 0.5) : 0).toFixed(3);
    if (s.panel) [...$('p-list').children].forEach((li, n) => { const o = clamp01((lt - 1.2 - n * 1.6) / 0.4); li.style.opacity = o.toFixed(3); li.style.transform = `translateX(${((1 - o) * 30).toFixed(1)}px)`; });
    dl.forEach((o) => (o.visible = s.type === 'plan' && lt > 1.2));

    // the demo house grows floor by floor during "how it works"
    if (s.type === 'how') world.setFloors(demo, 1 + Math.floor(clamp01((lt - 2.5) / 5.5) * 5));
    else world.setFloors(demo, demo.resident.floors);

    const night = !!s.night;
    if (night !== world.night) world.setNight(night);
    $('flash').style.opacity = (s.flash ? 0.7 * Math.max(0, 1 - lt / 0.35) : 0).toFixed(3);

    const p = pose(i, lt);
    camera.position.copy(p.pos);
    camera.lookAt(p.target);
    world.tick(time);
    world.render();
  }
  return { duration: t, fps: FPS, frame, scenes: scenes.map((s) => ({ type: s.type, start: s.start, dur: s.dur, vo: s.vo })) };
}

window.seaty = {
  ready: ready.then((tl) => ({ duration: tl.duration, fps: tl.fps, scenes: tl.scenes, width: W, height: H })),
  frame: async (t) => (await ready).frame(t),
};

if (!RENDER) {
  const stage = $('stage');
  const fit = () => { stage.style.transform = `scale(${Math.min((innerHeight - 70) / H, innerWidth / W)})`; };
  fit();
  addEventListener('resize', fit);
  ready.then((tl) => {
    let playing = true, t = 0, lastNow = performance.now();
    $('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; lastNow = performance.now(); };
    $('scrub').oninput = (e) => { t = (e.target.value / 1000) * tl.duration; };
    const loop = (now) => {
      if (playing) { t += (now - lastNow) / 1000; if (t > tl.duration) t = 0; }
      lastNow = now;
      tl.frame(t);
      $('scrub').value = String(Math.round((t / tl.duration) * 1000));
      $('time').textContent = `${t.toFixed(1)}s / ${tl.duration.toFixed(1)}s`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
