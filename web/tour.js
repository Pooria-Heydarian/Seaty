// The landscape city tour (1920x1080): introduces the city plan, every district and landmark, the rules,
// and invites people to move in. Same frame API as video.js, so scripts/render-video.mjs renders it:
//   npm run tour      (preview: tour.html in the browser)

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
  const lmScenes = (list, chapter) => list.forEach((l, i) => add('landmark', 3.4, { l, chapter, caption: { tag: `${l.district} · ${l.floors} floor${l.floors === 1 ? '' : 's'}`, name: l.def.name, sub: owner(l) } }, lmLine(l, i), 0.5));

  // the demo house that grows in "how it works": a plain house near downtown
  const demo = world.list.filter((e) => !e.recipe).sort((a, b) => a.outer.position.length() - b.outer.position.length())[0];
  const residents = city.residentCount;

  // ---- 1. welcome ----
  add('intro', 7, { title: { kicker: 'WELCOME TO THE NEW', big: 'Seaty<span>.</span>', sub: 'A whole city built by the people who comment on my videos' } },
    `Welcome to the new Seaty: a whole city built by the people who comment on my videos. ${residents} citizens live here, and we just rebuilt it with a brand new city plan. Let me show you around.`, 0.6);
  // ---- 2. how it works ----
  add('how', 9, { demo, chapter: 'How it works', panel: { title: 'How Seaty works', items: [['🏠', 'Comment on any video and <b>you get a house</b>'], ['🏗️', 'Every different video you comment on adds <b>+1 floor</b>'], ['🎬', 'Every day a new Short shows <b>who moved in</b>']] } },
    'It works like this. Comment on any video, and you get a house. Every different video you comment on adds one more floor. And every day, a new Short shows who moved in.', 0.6);
  // ---- 3. the plan ----
  add('plan', 9, { chapter: 'The city plan' },
    'Here is the new plan. Downtown in the middle, Main Street running east, five neighbourhoods, a green belt with parks and stadiums, and the industry outside town.', 0.6);
  // ---- 4. downtown ----
  add('area', 4.5, { chapter: 'Downtown', target: new THREE.Vector3(0, 0, 0), dist: 60, elev: 38, az0: 0.5 }, 'Downtown is the heart of the city, around the town hall.', 0.5);
  lmScenes(inDistrict('Downtown'), 'Downtown');
  // ---- 5. Main Street ----
  const station = lms.find((l) => l.district === 'Main Street station');
  const mainShops = inDistrict('Main Street').sort((a, b) => a.outer.position.x - b.outer.position.x);
  add('street', 8, { chapter: 'Main Street', x0: 0.5 * PITCH, x1: (station ? station.outer.position.x : 5 * PITCH) - 2 * PITCH },
    'Main Street is our shopping promenade, lined with shops, all the way from downtown to the Seaty Rail station.', 0.5);
  lmScenes(mainShops, 'Main Street');
  if (station) lmScenes([station], 'Main Street');
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
  // ---- 7. green belt ----
  add('area', 4.5, { chapter: 'The green belt', target: new THREE.Vector3(0, 0, 0), dist: (L.beltR + 3) * PITCH * 1.25, elev: 34, az0: 2.2 },
    'Around the city runs the green belt: stadiums, a theme park, a race track, parks and a farm.', 0.5);
  lmScenes(inDistrict('Green belt'), 'The green belt');
  // ---- 8. outskirts ----
  add('area', 4.5, { chapter: 'The outskirts', target: new THREE.Vector3(0, 0, 0), dist: (L.outerR + 2) * PITCH * 1.35, elev: 30, az0: 3.4 },
    'And out in the countryside, the outskirts: factories, the power plant, the airport and the space center.', 0.5);
  lmScenes(inDistrict('Outskirts'), 'The outskirts');
  // ---- 9. night ----
  add('night', 6.5, { chapter: 'Seaty at night' }, 'And when the sun goes down, Seaty lights up.', 1.0);
  // ---- 10. the rules ----
  add('rules', 11, { chapter: 'Make it yours', panel: { title: 'Make Seaty yours', items: [['✨', 'Ask for a <b>dream house</b>: a castle, a rocket, a mansion…'], ['🐶', 'Ask for a <b>pool, a pet or a garden</b>'], ['🏛️', 'Own up to <b>2 landmarks</b>, they grow with your floors'], ['⭐', 'Every landmark kind only <b>once</b>, so be quick!']] } },
    'Want something special? Just ask in a comment: a castle, a rocket, a pool or a pet. I build every request I can, every day. You can own up to two landmarks, and each kind exists only once, so be quick!', 0.6);
  // ---- 11. invitation ----
  add('outro', 9, { cta: { big: `Become citizen <span>#${residents + 1}</span>`, small: 'Comment below and I will build your house tomorrow', url: `Find your house: ${site}` } },
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
  label('Downtown', new THREE.Vector3(0, 10, 0));
  label('Main Street', new THREE.Vector3(3 * PITCH, 6, 0));
  for (const style of Object.keys(NEIGHBOURHOODS)) {
    const pts = [...L.homes.values()].filter((h) => h.style === style);
    if (!pts.length) continue;
    // pushed outward from the centre so the small neighbourhoods' labels don't overlap
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    const out = style === 'classic' ? 1 : 1.9;
    label(NEIGHBOURHOODS[style], new THREE.Vector3(cx * out, 6, cz * out));
  }
  const firstOf = (d) => inDistrict(d)[0];
  if (firstOf('Green belt')) label('Green belt', firstOf('Green belt').outer.position.clone().setY(14));
  if (firstOf('Outskirts')) label('Outskirts', firstOf('Outskirts').outer.position.clone().setY(16));

  // ---- camera per scene ----
  const centre = new THREE.Vector3();
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
        const x = s.x0 + (s.x1 - s.x0) * ease(k);
        return { pos: new THREE.Vector3(x - 10, 13, 26), target: new THREE.Vector3(x + 22, 2, 0) };
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
  const endPose = scenes.map((s) => rawPose(s, s.dur));
  function pose(i, lt) {
    const p = rawPose(scenes[i], lt);
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
    show($('title'), s.type === 'intro' ? fade(lt, 0.3, s.dur - 0.5) : 0, 40);
    show($('chapter'), s.chapter ? fade(lt, 0.2, s.dur - 0.3) : 0, 0);
    show($('caption'), s.caption ? fade(lt, 0.7, s.dur - 0.4) : 0, 30);
    show($('panel'), s.panel ? fade(lt, 0.4, s.dur - 0.4) : 0, 30);
    show($('cta'), s.type === 'outro' ? fade(lt, 0.6, s.dur + 10) : 0, 40);
    $('shade').style.opacity = (s.type === 'intro' ? fade(lt, 0.2, s.dur - 0.5) : s.panel ? fade(lt, 0.2, s.dur - 0.4) * 0 : 0).toFixed(3);
    if (s.panel) [...$('p-list').children].forEach((li, n) => { const o = clamp01((lt - 1.2 - n * 1.6) / 0.4); li.style.opacity = o.toFixed(3); li.style.transform = `translateX(${((1 - o) * 30).toFixed(1)}px)`; });
    dl.forEach((o) => (o.visible = s.type === 'plan' && lt > 1.2));

    // the demo house grows floor by floor during "how it works"
    if (s.type === 'how') world.setFloors(demo, 1 + Math.floor(clamp01((lt - 2.5) / 5.5) * 5));
    else world.setFloors(demo, demo.resident.floors);

    const night = s.type === 'night' || s.type === 'outro';
    if (night !== world.night) world.setNight(night);
    $('flash').style.opacity = (s.type === 'night' ? 0.7 * Math.max(0, 1 - lt / 0.35) : 0).toFixed(3);

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
