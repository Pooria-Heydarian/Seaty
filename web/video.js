// The daily Short: a scripted, frame-exact timeline over the 3D town.
//
//   video.html            -> live preview with a scrubber (for you to watch)
//   video.html?render=1   -> used by scripts/render-video.mjs, which calls
//                            window.seaty.frame(t) for every frame and screenshots it.
//
// Optional query params: site=<url shown at the end>, date=YYYY-MM-DD

import { createWorld, THREE, hashId, FLOOR_H } from './world.js';

const W = 1080, H = 1920, FPS = 30;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const $ = (id) => document.getElementById(id);
document.body.classList.add(RENDER ? 'render' : 'preview');

const MAX_FEATURED_NEW = 4;
const MAX_FEATURED_GROW = 3;
const AVATAR_COLORS = ['#ff7a45', '#2e86ab', '#7a5cff', '#2a9d8f', '#e76f51', '#d62f6f', '#3a86ff'];

// ---------- Easing ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
/** Fade in at [a, a+d], fade out at [b, b+d] (local seconds). */
const fade = (lt, a, b, d = 0.35) => clamp01((lt - a) / d) * (1 - clamp01((lt - b) / d));

function setOverlay(el, opacity, rise = 0) {
  el.style.opacity = opacity.toFixed(3);
  el.style.transform = `translateY(${((1 - opacity) * rise).toFixed(1)}px) scale(${(0.94 + 0.06 * opacity).toFixed(4)})`;
  el.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
}

// ---------- Load data ----------
async function getJSON(url) {
  const res = await fetch(`${url}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

const stage = $('stage');
const world = createWorld({ container: $('scene'), width: W, height: H, pixelRatio: 1, shadowSize: 2048 });
const { camera } = world;
camera.fov = 50;
camera.updateProjectionMatrix();

const ready = (async () => {
  const [city, changes] = await Promise.all([getJSON('data/city.json'), getJSON('data/changes.json').catch(() => null)]);
  const ch = changes || { day: 1, newResidents: [], grew: [], top: [], residentCount: city.residentCount, totalFloors: city.totalFloors, floorsAdded: 0, firstReport: true };
  world.build(city, { labelTop: 0 });
  await document.fonts.ready;
  return buildTimeline(city, ch);
})();

// ---------- Camera helpers ----------
function orbit(target, dist, azimuth, elevationDeg) {
  const el = (elevationDeg * Math.PI) / 180;
  return {
    pos: new THREE.Vector3(
      target.x + Math.sin(azimuth) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(azimuth) * Math.cos(el) * dist,
    ),
    target: target.clone(),
  };
}
const overviewDist = () => Math.max(60, world.radius * 1.6) * 1.35;

/** Frames the building nicely, from its front door side. */
function buildingShot(entry, floors, lt, dur) {
  const h = floors * FLOOR_H;
  const p = entry.outer.position;
  const target = new THREE.Vector3(p.x, Math.max(2, h * 0.5), p.z);
  const dist = Math.max(19, h * 1.5 + 10);
  const az = entry.outer.rotation.y + 0.6 + (lt / dur) * 0.35;
  return orbit(target, dist, az, h > 12 ? 22 : 32);
}

// ---------- Timeline ----------
function buildTimeline(city, ch) {
  const scenes = [];
  let t = 0;
  const add = (type, dur, data = {}) => { scenes.push({ type, start: t, dur, ...data }); t += dur; };

  const newcomers = ch.newResidents.map((n) => ({ ...n, entry: world.entries.get(n.id) })).filter((n) => n.entry);
  // Day 1 / first report: everybody is "new"; feature the most recent ones only.
  const featuredNew = newcomers.slice(-MAX_FEATURED_NEW).reverse();
  const montageNew = newcomers.filter((n) => !featuredNew.includes(n));
  const featuredGrow = ch.firstReport ? [] : ch.grew.slice(0, MAX_FEATURED_GROW).map((g) => ({ ...g, entry: world.entries.get(g.id) })).filter((g) => g.entry);

  add('intro', 3.2);
  if (!city.residents.length) add('empty', 5.5);
  for (const n of featuredNew) add('newcomer', 3.6, { n });
  if (montageNew.length) add('montage', 3.4, { list: montageNew });
  for (const g of featuredGrow) add('grow', 3.2, { g });
  if (city.residents.length) add('top', 3.6);
  add('outro', 4.6);

  // When does each new building appear?
  const reveal = new Map();
  for (const s of scenes) {
    if (s.type === 'newcomer') reveal.set(s.n.id, s.start + 1.15);
    if (s.type === 'montage') {
      s.list.forEach((n, i) => reveal.set(n.id, s.start + 0.5 + (i / Math.max(1, s.list.length)) * 1.8));
      const c = new THREE.Vector3();
      s.list.forEach((n) => c.add(n.entry.outer.position));
      s.center = c.divideScalar(s.list.length);
    }
  }
  const growFrom = new Map(featuredGrow.map((g) => [g.id, g]));
  const growScene = new Map(scenes.filter((s) => s.type === 'grow').map((s) => [s.g.id, s]));

  const ranked = [...world.list].sort((a, b) => a.rank - b.rank);
  const top = ranked.slice(0, 3);

  // ----- static overlay content -----
  $('t-day').textContent = ch.day;
  $('t-delta').textContent = ch.firstReport
    ? `${city.residentCount} residents so far`
    : `+${ch.newResidents.length} new residents · +${ch.floorsAdded} floors`;
  $('b-rows').innerHTML = '';
  top.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'r';
    const a = document.createElement('span');
    a.textContent = `${i + 1}. ${e.resident.name}`;
    const b = document.createElement('span');
    b.textContent = `${e.resident.floors} floors`;
    row.append(a, b);
    $('b-rows').appendChild(row);
  });
  const site = params.get('site') || `${location.host}${location.pathname.replace(/video\.html$/, '')}`;
  $('cta-url').textContent = `Find your house: ${site.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;

  // ----- per-scene poses -----
  function rawPose(s, lt) {
    const k = lt / s.dur;
    switch (s.type) {
      case 'intro': {
        const d = overviewDist() * (1.25 - 0.2 * easeOut(k));
        return orbit(new THREE.Vector3(0, 0, 0), d, 0.7 + k * 0.25, 52 - 6 * k);
      }
      case 'empty':
        return orbit(new THREE.Vector3(0, 3, 0), 46 - 8 * k, 1.0 + k * 0.6, 30);
      case 'newcomer':
        return buildingShot(s.n.entry, s.n.entry.resident.floors, lt, s.dur);
      case 'grow':
        return buildingShot(s.g.entry, s.g.to, lt, s.dur);
      case 'montage':
        return orbit(s.center, 62, 0.9 + k * 0.4, 50);
      case 'top': {
        const e = top[0];
        const h = e.resident.floors * FLOOR_H;
        const p = e.outer.position;
        const target = new THREE.Vector3(p.x * (1 - k * 0.6), h * 0.55 * (1 - k * 0.5), p.z * (1 - k * 0.6));
        return orbit(target, Math.max(28, h * 1.4 + 18) + k * overviewDist() * 0.35, e.outer.rotation.y + 0.8 + k * 0.5, 26 + k * 14);
      }
      case 'outro':
        return orbit(new THREE.Vector3(0, 0, 0), overviewDist() * (0.95 - 0.1 * k), 2.2 + k * 0.45, 40);
    }
  }
  const endPose = scenes.map((s) => rawPose(s, s.dur));

  function pose(i, lt) {
    const s = scenes[i];
    const p = rawPose(s, lt);
    const BLEND = 1.1;
    if (i === 0 || lt >= BLEND) return p;
    const k = easeInOut(clamp01(lt / BLEND));
    const from = endPose[i - 1];
    return {
      pos: from.pos.clone().lerp(p.pos, k),
      target: from.target.clone().lerp(p.target, k),
    };
  }

  // ----- labels -----
  const shownLabels = new Map(); // id -> {cls, text}
  function setLabels(desired) {
    for (const [id] of shownLabels) {
      if (!desired.has(id)) { world.removeLabel(world.entries.get(id)); shownLabels.delete(id); }
    }
    for (const [id, want] of desired) {
      const have = shownLabels.get(id);
      const entry = world.entries.get(id);
      if (!have || have.cls !== want.cls) {
        world.addLabel(entry, want.cls, want.text);
        shownLabels.set(id, { ...want });
      } else if (have.text !== want.text) {
        entry.label.element.textContent = want.text;
        have.text = want.text;
      }
      entry.label.position.y = entry.roofTop + 1;
    }
  }

  function fillCard(name, tag, comment, floorsHtml) {
    const color = AVATAR_COLORS[hashId(name) % AVATAR_COLORS.length];
    $('c-avatar').style.background = color;
    $('c-avatar').textContent = (name.replace(/^@/, '')[0] || '?').toUpperCase();
    $('c-name').textContent = `@${name}`;
    $('c-tag').textContent = tag;
    $('c-comment').textContent = comment;
    $('c-comment').style.display = comment ? '' : 'none';
    $('c-floors').innerHTML = floorsHtml;
    $('c-floors').style.display = floorsHtml ? '' : 'none';
  }

  // ----- the frame function -----
  let lastCard = null;
  function frame(time) {
    const i = Math.max(0, scenes.findLastIndex((s) => time >= s.start));
    const s = scenes[i];
    const lt = time - s.start;

    // Buildings: hidden before their reveal, then pop up.
    for (const [id, at] of reveal) {
      const e = world.entries.get(id);
      const k = clamp01((time - at) / 0.7);
      e.outer.visible = time >= at;
      const y = Math.max(0.001, easeOutBack(k));
      const xz = 0.85 + 0.15 * easeOut(k);
      e.outer.scale.set(xz, y, xz);
    }
    for (const [id, g] of growFrom) {
      const gs = growScene.get(id);
      const k = clamp01((time - gs.start - 0.9) / 1.3);
      world.setFloors(world.entries.get(id), time < gs.start + 0.9 ? g.from : g.from + Math.ceil((g.to - g.from) * easeOut(k) - 1e-6));
    }

    // Day/night: the outro is at night.
    const outro = scenes.at(-1);
    const night = time >= outro.start + 0.18;
    if (night !== world.night) world.setNight(night);
    $('flash').style.opacity = (0.85 * Math.max(0, 1 - Math.abs(time - outro.start - 0.18) / 0.18)).toFixed(3);

    // Camera
    const p = pose(i, lt);
    camera.position.copy(p.pos);
    camera.lookAt(p.target);

    // Overlays
    setOverlay($('title'), s.type === 'intro' ? fade(lt, 0.15, s.dur - 0.4) : 0, 40);
    let cardOn = 0, montageOn = 0, boardOn = 0, ctaOn = 0;
    const labels = new Map();

    if (s.type === 'newcomer') {
      const n = s.n;
      if (lastCard !== s) fillCard(n.name, `New resident · plot ${n.plot}`, n.comment, '');
      cardOn = fade(lt, 1.35, s.dur - 0.35);
      if (time >= reveal.get(n.id) + 0.3) labels.set(n.id, { cls: 'vlabel new', text: `@${n.name}` });
    } else if (s.type === 'grow') {
      const g = s.g;
      const shown = world.entries.get(g.id).shownFloors;
      const added = shown - g.from;
      if (lastCard !== s || $('c-floors').dataset.n !== String(shown)) {
        fillCard(g.name, 'Commented again', '', `${shown} floors ${added > 0 ? `<b>+${added}</b>` : ''}`);
        $('c-floors').dataset.n = String(shown);
      }
      cardOn = fade(lt, 0.6, s.dur - 0.35);
    } else if (s.type === 'montage') {
      const k = clamp01((lt - 0.5) / 1.8);
      const shown = Math.ceil(s.list.length * k);
      $('montage').innerHTML = `+${shown}<small>more new residents</small>`;
      montageOn = fade(lt, 0.3, s.dur - 0.35);
    } else if (s.type === 'top') {
      boardOn = fade(lt, 0.5, s.dur - 0.35);
      top.forEach((e, r) => labels.set(e.resident.id, { cls: r === 0 ? 'vlabel top1' : 'vlabel top', text: `#${r + 1} ${e.resident.name}` }));
    } else if (s.type === 'empty') {
      $('cta-big').innerHTML = lt < 2.6 ? 'The city is <span>empty</span>…' : 'Be resident <span>#1</span>';
      $('cta-small').textContent = lt < 2.6 ? 'Nobody lives here yet.' : 'Comment below and I’ll build your house tomorrow.';
      $('cta-url').style.display = 'none';
      ctaOn = fade(lt, 0.3, s.dur - 0.35) * (lt > 2.4 && lt < 2.8 ? Math.abs(lt - 2.6) / 0.2 : 1);
    } else if (s.type === 'outro') {
      $('cta-big').innerHTML = 'Comment to get <span>your own house</span>';
      $('cta-small').textContent = 'Every new video you comment on adds +1 floor';
      $('cta-url').style.display = '';
      ctaOn = fade(lt, 0.45, s.dur + 10);
    }
    lastCard = s.type === 'newcomer' || s.type === 'grow' ? s : null;
    setOverlay($('card'), cardOn, 60);
    setOverlay($('montage'), montageOn, 40);
    setOverlay($('board'), boardOn, 60);
    setOverlay($('cta'), ctaOn, 40);
    setLabels(labels);

    world.tick(time);
    world.render();
  }

  return { duration: t, fps: FPS, frame, scenes: scenes.map((s) => ({ type: s.type, start: s.start, dur: s.dur })) };
}

// ---------- API for the renderer ----------
window.seaty = {
  ready: ready.then((tl) => ({ duration: tl.duration, fps: tl.fps, scenes: tl.scenes })),
  frame: async (t) => (await ready).frame(t),
};

// ---------- Preview player ----------
if (!RENDER) {
  const fit = () => {
    const s = Math.min((innerHeight - 70) / H, innerWidth / W);
    stage.style.transform = `scale(${s})`;
    stage.style.margin = `${-(H - H * s) / 2}px ${-(W - W * s) / 2}px`;
  };
  fit();
  addEventListener('resize', fit);

  ready.then((tl) => {
    let playing = true;
    let t = 0;
    let last = performance.now();
    $('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; last = performance.now(); };
    $('scrub').oninput = (e) => { t = (e.target.value / 1000) * tl.duration; };
    const loop = (now) => {
      if (playing) { t += (now - last) / 1000; if (t > tl.duration) t = 0; }
      last = now;
      tl.frame(t);
      $('scrub').value = String(Math.round((t / tl.duration) * 1000));
      $('time').textContent = `${t.toFixed(1)}s / ${tl.duration.toFixed(1)}s`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }).catch((e) => {
    document.body.insertAdjacentHTML('beforeend', `<pre style="color:#fff;position:fixed;top:10px;left:10px">${String(e)}</pre>`);
  });
}
