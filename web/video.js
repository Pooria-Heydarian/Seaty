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
const MAX_FEATURED_HOUSES = 4; // more dream houses than this share one "+N more" shot
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
  const [city, changes, specials] = await Promise.all([
    getJSON('data/city.json'),
    getJSON('data/changes.json').catch(() => null),
    getJSON('data/specials.json').catch(() => null),
  ]);
  const ch = changes || { day: 1, newResidents: [], grew: [], top: [], residentCount: city.residentCount, totalFloors: city.totalFloors, floorsAdded: 0, firstReport: true };
  world.build(city, { labelTop: 0, specials });
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

/**
 * Of 4 camera directions around a building, the one whose line of sight is least blocked by
 * neighbouring buildings (counts how much of the view ray runs below neighbours' roofs).
 */
function clearestAzimuth(entry, targetY, dist, elevationDeg) {
  const p = entry.outer.position;
  const near = world.list.filter((o) => o !== entry && o.outer.position.distanceTo(p) < dist + 6);
  const el = (elevationDeg * Math.PI) / 180;
  let best = null;
  for (let q = 0; q < 4; q++) {
    const az = entry.outer.rotation.y + 0.5 + (q * Math.PI) / 2;
    let blocked = 0;
    for (let d = 2; d < dist; d += 1) {
      const x = p.x + Math.sin(az) * Math.cos(el) * d;
      const z = p.z + Math.cos(az) * Math.cos(el) * d;
      const y = targetY + Math.sin(el) * d;
      for (const o of near) {
        const op = o.outer.position;
        if (Math.abs(op.x - x) < 2.6 && Math.abs(op.z - z) < 2.6 && (o.roofTop || 0) > y) blocked += (o.roofTop - y);
      }
    }
    if (!best || blocked < best.blocked - 0.01) best = { az, blocked };
  }
  return best.az;
}

// ---------- Timeline ----------
function buildTimeline(city, ch) {
  const scenes = [];
  let t = 0;
  // Voiceover: the renderer measures each spoken line and passes its length in
  // window.SEATY_VO = { sceneIndex: seconds }, so scenes stretch to fit the voice.
  const VO = window.SEATY_VO || {};
  const add = (type, dur, data = {}, vo = null) => {
    const i = scenes.length;
    if (vo && VO[i]) dur = Math.max(dur, vo.at + VO[i] + 0.5);
    scenes.push({ type, start: t, dur, vo, ...data });
    t += dur;
  };
  const say = (name) => name.replace(/^@/, '');
  const pick = (arr, i) => arr[i % arr.length];

  const newcomers = ch.newResidents.map((n) => ({ ...n, entry: world.entries.get(n.id) })).filter((n) => n.entry);
  // Day 1 / first report: everybody is "new"; feature the most recent ones only.
  const featuredNew = newcomers.slice(-MAX_FEATURED_NEW).reverse();
  const montageNew = newcomers.filter((n) => !featuredNew.includes(n));
  const featuredGrow = ch.firstReport ? [] : ch.grew.slice(0, MAX_FEATURED_GROW).map((g) => ({ ...g, entry: world.entries.get(g.id) })).filter((g) => g.entry);

  const nNew = ch.newResidents.length;
  const introLine = ch.firstReport
    ? `Day ${ch.day} of adding every commenter to my city.${city.residentCount ? ` ${city.residentCount} people live here so far.` : ''}`
    : `Day ${ch.day} of adding every commenter to my city. ${nNew ? `${nNew} new ${nNew === 1 ? 'resident' : 'residents'} moved in today!` : 'No one new moved in today, but the city keeps growing.'}`;
  add('intro', 3.2, {}, { text: introLine, at: 0.3 });
  // Special buildings first (big news), house upgrades after the new residents have moved in.
  const newSpecials = (ch.newSpecials || []).filter((s) =>
    s.kind === 'landmark' ? world.landmarks.has(s.id)
      : s.kind === 'house' ? world.entries.get(s.id)?.recipe
        : world.entries.get(s.id)?.upgradeObjects?.[s.type]);
  const UPGRADE_LINE = {
    pool: (n) => [`${n}'s house just got a swimming pool!`, 'Got a swimming pool!'],
    'apple-tree': (n) => [`${n} now has an apple tree in the backyard!`, 'Got an apple tree in the backyard!'],
    capybara: (n) => [`${n}'s house now has its very own capybara!`, 'Got a pet capybara!'],
  };
  for (const sp of newSpecials.filter((s) => s.kind === 'landmark')) {
    add('landmark', 4.4, { sp }, { text: `Big news! Seaty just opened a brand new ${sp.name}${sp.requestedBy ? `, requested by ${say(sp.requestedBy)}` : ''}!`, at: 1.0 });
  }
  if (!city.residents.length) add('empty', 5.5, {}, { text: 'The city is empty. Nobody lives here yet. Comment below, and I will build your house tomorrow!', at: 0.4 });
  featuredNew.forEach((n, i) => add('newcomer', 3.6, { n }, {
    text: pick([`Welcome, ${say(n.name)}!`, `Say hi to ${say(n.name)}, who just moved in.`, `${say(n.name)} joined the city!`, `And here comes ${say(n.name)}.`], i),
    at: 1.0,
  }));
  if (montageNew.length) add('montage', 3.4, { list: montageNew }, { text: `Plus ${montageNew.length} more new ${montageNew.length === 1 ? 'neighbor' : 'neighbors'}!`, at: 0.4 });
  for (const sp of newSpecials.filter((s) => s.kind === 'upgrade')) {
    const [line, caption] = (UPGRADE_LINE[sp.type] || ((n) => [`${n} got a house upgrade!`, 'Got a house upgrade!']))(say(sp.name));
    add('upgrade', 3.8, { sp, caption, entry: world.entries.get(sp.id) }, { text: line, at: 0.9 });
  }
  const newHouses = newSpecials.filter((s) => s.kind === 'house');
  newHouses.slice(0, MAX_FEATURED_HOUSES).forEach((sp, i) => {
    const article = /^[aeiou]/i.test(sp.title) ? 'an' : 'a';
    add('house', 4.4, { sp, entry: world.entries.get(sp.id) }, {
      text: pick([
        `${say(sp.name)} asked for a dream house. Here it is: ${article} ${sp.title}!`,
        `Makeover time! ${say(sp.name)} now lives in ${article} ${sp.title}.`,
        `Request granted! ${say(sp.name)}'s new home is ${article} ${sp.title}.`,
      ], i),
      at: 0.6,
    });
  });
  const moreHouses = newHouses.slice(MAX_FEATURED_HOUSES).map((sp) => ({ ...sp, entry: world.entries.get(sp.id) }));
  if (moreHouses.length) {
    add('moreHouses', 3.6, { list: moreHouses }, { text: `Plus ${moreHouses.length} more dream ${moreHouses.length === 1 ? 'house' : 'houses'}!`, at: 0.4 });
  }
  featuredGrow.forEach((g, i) => add('grow', 3.2, { g }, {
    text: pick([`${say(g.name)} commented again. Their building now has ${g.to} floors.`, `${say(g.name)} added ${g.to - g.from === 1 ? 'a floor' : `${g.to - g.from} floors`}, now ${g.to} in total.`, `Look at ${say(g.name)}'s building grow, to ${g.to} floors!`], i),
    at: 0.5,
  }));
  if (city.residents.length) {
    const t1 = [...world.list].sort((a, b) => a.rank - b.rank)[0];
    const f = t1.resident.floors;
    add('top', 3.6, {}, {
      text: f > 1
        ? `The tallest building in Seaty belongs to ${say(t1.resident.name)}, with ${f} floors.`
        : 'Everyone has one floor so far. Who will build the first tower?',
      at: 0.4,
    });
  }
  add('outro', 4.6, {}, { text: 'Want your own house? Comment on this video. Every new video you comment on adds one more floor. See you tomorrow!', at: 0.5 });

  // When does each new building appear?
  const reveal = new Map();
  for (const s of scenes) {
    if (s.type === 'newcomer') reveal.set(s.n.id, s.start + 1.15);
    if (s.type === 'montage' || s.type === 'moreHouses') {
      if (s.type === 'montage') s.list.forEach((n, i) => reveal.set(n.id, s.start + 0.5 + (i / Math.max(1, s.list.length)) * 1.8));
      const c = new THREE.Vector3();
      s.list.forEach((n) => c.add(n.entry.outer.position));
      s.center = c.divideScalar(s.list.length);
    }
  }
  // New landmarks rise in their news scene; upgrades pop in during theirs.
  const landmarkReveal = new Map(scenes.filter((s) => s.type === 'landmark').map((s) => [s.sp.id, s.start + 1.0]));
  const upgradeReveal = scenes.filter((s) => s.type === 'upgrade').map((s) => ({ obj: s.entry.upgradeObjects[s.sp.type], at: s.start + 1.0 }));
  // Custom houses: the old house is shown until its makeover scene, then the new one pops up.
  const houseReveal = [
    ...scenes.filter((s) => s.type === 'house').map((s) => ({ entry: s.entry, at: s.start + 1.3 })),
    ...scenes.filter((s) => s.type === 'moreHouses').flatMap((s) => s.list.map((h, i) => ({ entry: h.entry, at: s.start + 0.7 + (i / s.list.length) * 1.6 }))),
  ];
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
      case 'moreHouses':
        return orbit(s.center, 62, 0.9 + k * 0.4, 50);
      case 'landmark': {
        const l = world.landmarks.get(s.sp.id);
        return orbit(new THREE.Vector3(l.outer.position.x, l.height * 0.45, l.outer.position.z), 27 - 3 * k, l.outer.rotation.y + 0.55 + k * 0.4, 26);
      }
      case 'upgrade':
        return buildingShot(s.entry, s.entry.resident.floors, lt, s.dur);
      case 'house': {
        // From higher up and from the side with the clearest view, framed on the house's full height.
        const e = s.entry;
        const top = Math.max(6, e.roofTop || 0);
        const p = e.outer.position;
        const dist = Math.max(18, top * 1.35 + 9);
        s.az ??= clearestAzimuth(e, top * 0.42, dist, 44);
        return orbit(new THREE.Vector3(p.x, top * 0.42, p.z), dist, s.az + k * 0.45, 44);
      }
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
    $('c-name').textContent = `@${name.replace(/^@/, "")}`;
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
    for (const [id, at] of landmarkReveal) {
      const l = world.landmarks.get(id);
      const k = clamp01((time - at) / 0.9);
      l.outer.visible = l.label.visible = time >= at;
      l.outer.scale.set(0.9 + 0.1 * easeOut(k), Math.max(0.001, easeOutBack(k)), 0.9 + 0.1 * easeOut(k));
    }
    for (const u of upgradeReveal) {
      const k = clamp01((time - u.at) / 0.6);
      u.obj.visible = time >= u.at;
      u.obj.scale.setScalar(Math.max(0.001, easeOutBack(k)) * (u.obj.userData.baseScale ??= u.obj.scale.x || 1));
    }
    for (const h of houseReveal) {
      world.setCustom(h.entry, time >= h.at);
      const k = clamp01((time - h.at) / 0.7);
      if (time >= h.at && k < 1) {
        const y = Math.max(0.001, easeOutBack(k));
        h.entry.outer.scale.set(0.85 + 0.15 * easeOut(k), y, 0.85 + 0.15 * easeOut(k));
      } else if (time >= h.at - 0.25 && time < h.at) {
        const q = 1 - (time - (h.at - 0.25)) / 0.25; // the old house shrinks away
        h.entry.outer.scale.set(1, Math.max(0.001, q), 1);
      } else if (!reveal.has(h.entry.resident.id) || time >= reveal.get(h.entry.resident.id) + 0.7) {
        h.entry.outer.scale.set(1, 1, 1);
      }
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
      if (time >= reveal.get(n.id) + 0.3) labels.set(n.id, { cls: 'vlabel new', text: `@${n.name.replace(/^@/, "")}` });
    } else if (s.type === 'grow') {
      const g = s.g;
      const shown = world.entries.get(g.id).shownFloors;
      const added = shown - g.from;
      if (lastCard !== s || $('c-floors').dataset.n !== String(shown)) {
        fillCard(g.name, 'Commented again', '', `${shown} floors ${added > 0 ? `<b>+${added}</b>` : ''}`);
        $('c-floors').dataset.n = String(shown);
      }
      cardOn = fade(lt, 0.6, s.dur - 0.35);
    } else if (s.type === 'landmark') {
      if (lastCard !== s) {
        fillCard(s.sp.name, 'New in town', s.sp.requestedBy ? `Requested by ${s.sp.requestedBy}` : '', '');
        $('c-name').textContent = s.sp.name; // a building, not a @person
        $('c-avatar').textContent = '★';
        $('c-avatar').style.background = '#f5b82e';
      }
      cardOn = fade(lt, 1.6, s.dur - 0.35);
    } else if (s.type === 'upgrade') {
      if (lastCard !== s) fillCard(s.sp.name, 'House upgrade', s.caption, '');
      cardOn = fade(lt, 1.4, s.dur - 0.35);
      labels.set(s.sp.id, { cls: 'vlabel new', text: `@${s.sp.name.replace(/^@/, '')}` });
    } else if (s.type === 'house') {
      if (lastCard !== s) fillCard(s.sp.name, 'Dream house', `Now living in: ${s.sp.title}`, '');
      cardOn = fade(lt, 1.7, s.dur - 0.35);
      if (lt > 1.6) labels.set(s.sp.id, { cls: 'vlabel new', text: `@${s.sp.name.replace(/^@/, '')}` });
    } else if (s.type === 'montage') {
      const k = clamp01((lt - 0.5) / 1.8);
      const shown = Math.ceil(s.list.length * k);
      $('montage').innerHTML = `+${shown}<small>more new residents</small>`;
      montageOn = fade(lt, 0.3, s.dur - 0.35);
    } else if (s.type === 'moreHouses') {
      $('montage').innerHTML = `+${s.list.length}<small>more dream houses</small>`;
      montageOn = fade(lt, 0.3, s.dur - 0.35);
    } else if (s.type === 'top') {
      boardOn = fade(lt, 0.5, s.dur - 0.35);
      top.forEach((e, r) => labels.set(e.resident.id, { cls: r === 0 ? 'vlabel top1' : 'vlabel top', text: `#${r + 1} ${e.resident.name}` }));
    } else if (s.type === 'empty') {
      const sw = Math.max(2.6, s.dur * 0.45); // switch the text about halfway, in step with the voice
      $('cta-big').innerHTML = lt < sw ? 'The city is <span>empty</span>…' : 'Be resident <span>#1</span>';
      $('cta-small').textContent = lt < sw ? 'Nobody lives here yet.' : 'Comment below and I’ll build your house tomorrow.';
      $('cta-url').style.display = 'none';
      ctaOn = fade(lt, 0.3, s.dur - 0.35) * (lt > sw - 0.2 && lt < sw + 0.2 ? Math.abs(lt - sw) / 0.2 : 1);
    } else if (s.type === 'outro') {
      $('cta-big').innerHTML = 'Comment to get <span>your own house</span>';
      $('cta-small').textContent = 'Every new video you comment on adds +1 floor';
      $('cta-url').style.display = '';
      ctaOn = fade(lt, 0.45, s.dur + 10);
    }
    lastCard = ['newcomer', 'grow', 'landmark', 'upgrade', 'house'].includes(s.type) ? s : null;
    $('card').classList.toggle('plain', ['landmark', 'upgrade', 'house'].includes(s.type));
    setOverlay($('card'), cardOn, 60);
    setOverlay($('montage'), montageOn, 40);
    setOverlay($('board'), boardOn, 60);
    setOverlay($('cta'), ctaOn, 40);
    setLabels(labels);

    world.tick(time);
    world.render();
  }

  return { duration: t, fps: FPS, frame, scenes: scenes.map((s) => ({ type: s.type, start: s.start, dur: s.dur, vo: s.vo })) };
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
