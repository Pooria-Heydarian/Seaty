// The daily Short: a scripted, frame-exact timeline over the 3D town.
//
//   video.html            -> live preview with a scrubber (for you to watch)
//   video.html?render=1   -> used by scripts/render-video.mjs, which calls
//                            window.seaty.frame(t) for every frame and screenshots it.
//
// Optional query params: site=<url shown at the end>, date=YYYY-MM-DD

import { createWorld, THREE, hashId, FLOOR_H } from './world.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const W = 1080, H = 1920, FPS = 30;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const $ = (id) => document.getElementById(id);
document.body.classList.add(RENDER ? 'render' : 'preview');

const MAX_FEATURED_NEW = 4;
const MAX_FEATURED_GROW = 2;
const MAX_FEATURED_HOUSES = 4; // more dream houses than this share one "+N more" shot
const MAX_FEATURED_LANDMARKS = 4; // same for new landmarks
const MAX_FEATURED_UPGRADES = 4; // and for house upgrades
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
  const [city, changes, specials, news] = await Promise.all([
    getJSON('data/city.json'),
    getJSON('data/changes.json').catch(() => null),
    getJSON('data/specials.json').catch(() => null),
    getJSON('data/news.json').catch(() => null),
  ]);
  const ch = changes || { day: 1, newResidents: [], grew: [], top: [], residentCount: city.residentCount, totalFloors: city.totalFloors, floorsAdded: 0, firstReport: true };
  // news of the day (data/news.json): only on the day it was written for
  if (news?.date && news.date === ch.date) ch.news = news.items || [];
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
  return clearestView(entry.outer.position, entry.outer.rotation.y + 0.5, targetY, dist, elevationDeg, entry.outer, 4);
}

/**
 * Of `steps` camera directions around `p` (starting at baseAz), the one whose line of sight is least
 * blocked by houses and landmarks (tall cooling towers hide a lot). `self` is ignored as a blocker.
 */
function clearestView(p, baseAz, targetY, dist, elevationDeg, self, steps = 8) {
  const blockers = [
    ...world.list.filter((o) => o.outer !== self).map((o) => ({ pos: o.outer.position, half: 2.6, top: o.roofTop || 0 })),
    ...[...world.landmarks.values()].filter((l) => l.outer !== self).map((l) => ({ pos: l.outer.position, half: 5.2, top: l.height })),
  ].filter((b) => b.pos.distanceTo(p) < dist + 8);
  const el = (elevationDeg * Math.PI) / 180;
  let best = null;
  for (let q = 0; q < steps; q++) {
    const az = baseAz + (q * Math.PI * 2) / steps;
    let blocked = 0;
    for (let d = 2; d < dist; d += 1) {
      const x = p.x + Math.sin(az) * Math.cos(el) * d;
      const z = p.z + Math.cos(az) * Math.cos(el) * d;
      const y = targetY + Math.sin(el) * d;
      for (const b of blockers) {
        if (Math.abs(b.pos.x - x) < b.half && Math.abs(b.pos.z - z) < b.half && b.top > y) blocked += b.top - y;
      }
    }
    if (!best || blocked < best.blocked - 0.01) best = { az, blocked };
  }
  return best.az;
}

/** Frames a house upgrade from the side it is on (a garage beside the house, a pond behind it…). */
function upgradeShot(s, lt) {
  const e = s.entry;
  const obj = e.upgradeObjects?.[s.sp.type];
  const h = e.resident.floors * FLOOR_H;
  const p = e.outer.position;
  const lx = obj ? obj.position.x : 0, lz = obj ? obj.position.z : 3;
  const ry = e.outer.rotation.y;
  // the upgrade's spot in world space, and the direction from the house towards it
  const wx = p.x + lx * Math.cos(ry) + lz * Math.sin(ry);
  const wz = p.z - lx * Math.sin(ry) + lz * Math.cos(ry);
  // Aim at the upgrade itself (a roof sign: at its height). Try camera spots around its preferred side (an upgrade can
  // set userData.view = yaw from the house's front, e.g. a portal's face; otherwise: from the house towards it) and
  // keep the first one with a clear line of sight to it, checked with real rays against the buildings around.
  const ty = obj && obj.position.y > 1 ? obj.position.y + 1.4 : 1.1;
  const target = new THREE.Vector3(wx, ty, wz);
  if (!s.shot) {
    const pref = ry + (obj?.userData.view ?? Math.atan2(lx, lz));
    const near = ty > 2 ? Math.max(15, h * 0.5 + 10) : 12;
    s.shot = clearShot(target, pref, [near, near * 0.75], ty > 2 ? [26, 40] : [34, 48, 62], obj) || { az: pref, dist: near, el: 40 };
  }
  return orbit(target, s.shot.dist, s.shot.az + (lt / s.dur) * 0.25, s.shot.el);
}

/** The first camera spot (around `pref`, then further round) that can see `target` without a building in between. */
const ray = new THREE.Raycaster();
function clearShot(target, pref, dists, elevations, ignore) {
  world.scene.updateMatrixWorld(true);
  const skip = new Set();
  ignore?.traverse((o) => skip.add(o));
  const solid = [];
  world.scene.traverse((o) => { if ((o.isMesh || o.isInstancedMesh) && !skip.has(o) && o.visible !== false && !o.material?.transparent) solid.push(o); });
  for (const d of [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, Math.PI]) {
    for (const el of elevations) {
      for (const dist of dists) {
        const cam = orbit(target, dist, pref + d, el).pos;
        const dir = cam.clone().sub(target);
        const len = dir.length();
        ray.set(target.clone().addScaledVector(dir.normalize(), 0.6), dir);
        ray.far = len - 0.6;
        // look along the whole view, not just the centre line: three rays a little apart
        const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(0.7);
        const blocked = [0, 1, -1].some((k) => {
          ray.set(target.clone().addScaledVector(side, k).addScaledVector(dir, 0.6), dir);
          return ray.intersectObjects(solid, false).some((hit) => hit.object.isMesh || hit.object.isInstancedMesh);
        });
        if (!blocked) return { az: pref + d, dist, el };
      }
    }
  }
  return null;
}

// ---------- Timeline ----------
// The Short tells the day like a story:
//   1. hook: the best request of the day, told by the anchor as a little story (their comment on the card), then it gets built
//   2. "Day N of adding every commenter…" over the whole city
//   3. more requests (the set-up → the building is drawn as a blueprint and filled in → the pay-off line)
//   4. a fast montage of everything else that is new, then newcomers, growers, the leaderboard
//   5. the outro at night, and a last camera glide back to the opening shot, so the Short loops
// Captions light up word by word with the voice; whooshes, thuds, pops and dings go on an effects track.
const MAX_STORIES = 3; // full set-up → build stories (the rest go into the fast montage)

/** Word timings for a spoken line: longer words and pauses after punctuation take longer. */
function wordTimes(text, start, len) {
  const words = text.replace(/@/g, '').split(/\s+/).filter(Boolean);
  const weight = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 3 + (/[.,!?:;]$/.test(w) ? 5 : 0));
  const total = weight.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return words.map((w, i) => {
    const t0 = start + (acc / total) * len;
    acc += weight[i];
    return { w, t0, t1: start + (acc / total) * len };
  });
}
/** Caption chunks: up to 3 words (or ~16 letters), breaking after punctuation. */
function chunks(times) {
  const out = [];
  let cur = [];
  for (const wt of times) {
    cur.push(wt);
    const letters = cur.reduce((a, x) => a + x.w.length, 0);
    if (cur.length >= 4 || letters >= 16 || /[.,!?:;]$/.test(wt.w)) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  // "So I built" + "it." reads badly: a last chunk of one short word joins the one before
  for (let i = out.length - 1; i > 0; i--) {
    if (out[i].length === 1 && out[i][0].w.length <= 6 && !/[.,!?:;]$/.test(out[i - 1].at(-1).w)) out.splice(i - 1, 2, [...out[i - 1], ...out[i]]);
  }
  return out;
}

/**
 * Blueprint to real: a glowing blue outline of the new building draws itself over a blueprint grid, then the real
 * building fills in from the ground up (the outline stays above the fill line), and the outline and grid fade away.
 * Works on any object (a house's outer group, a landmark): clipped copies of its materials during the reveal only.
 */
const BLUEPRINT = { draw: 0.9, fill: 1.1, fade: 0.35 }; // full reveal (a dream house, a landmark)
const BLUEPRINT_QUICK = { draw: 0.25, fill: 0.4, fade: 0.15 }; // in the fast montage
function createBlueprint(world) {
  world.renderer.localClippingEnabled = true;
  const BLUE = '#2f9bff';
  const live = new Map(); // root object -> state
  const strip = (root) => {
    const st = live.get(root);
    if (!st) return;
    for (const m of st.meshes) if (m.mesh.material === m.clone) m.mesh.material = m.orig;
    for (const x of st.extras) { x.removeFromParent(); if (x.isLineSegments2) x.geometry.dispose(); }
    live.delete(root);
  };
  const prepare = (root, key) => {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const st = { key, meshes: [], extras: [], lines: [], total: 0, y0: box.min.y, y1: box.max.y };
    st.below = new THREE.Plane(new THREE.Vector3(0, -1, 0), st.y0 - 1); // keeps y <= constant: the real building
    st.above = new THREE.Plane(new THREE.Vector3(0, 1, 0), -st.y0); // keeps y >= -constant: the blueprint still to fill
    // thick glowing outline (fat lines, 5 px) and a see-through blue "hologram" of every part
    st.lineMat = new LineMaterial({ color: BLUE, linewidth: 5, transparent: true, opacity: 1, clippingPlanes: [st.above], depthTest: true });
    st.lineMat.clipping = true;
    st.lineMat.resolution.set(world.renderer.domElement.width, world.renderer.domElement.height);
    st.ghostMat = new THREE.MeshBasicMaterial({ color: '#4fb3ff', transparent: true, opacity: 0, depthWrite: false, clippingPlanes: [st.above], side: THREE.DoubleSide });
    const parts = [];
    root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.userData.bp && o.visible) parts.push(o); });
    for (const o of parts) {
      const clip = (m) => { const c = m.clone(); c.clippingPlanes = [st.below]; return c; };
      const orig = o.material;
      const clone = Array.isArray(orig) ? orig.map(clip) : clip(orig);
      o.material = clone;
      st.meshes.push({ mesh: o, orig, clone });
      const ghost = new THREE.Mesh(o.geometry, st.ghostMat);
      ghost.userData.bp = true;
      o.add(ghost);
      st.extras.push(ghost);
      const g = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(o.geometry, 20));
      const line = new LineSegments2(g, st.lineMat);
      line.userData.bp = true;
      line.renderOrder = 3;
      o.add(line);
      st.extras.push(line);
      st.lines.push(line);
      line.userData.n = g.instanceCount ?? g.attributes.instanceStart.count;
      st.total += line.userData.n;
    }
    // a blueprint sheet with a grid under the building (just above the lawn)
    const size = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) + 1.2;
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    st.sheetMat = new THREE.MeshBasicMaterial({ color: '#1f6fd1', transparent: true, opacity: 0, depthWrite: false });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), st.sheetMat);
    sheet.position.set(cx, 0.42, cz);
    st.grid = new THREE.GridHelper(size, Math.max(8, Math.round(size * 1.6)), '#ffffff', '#bfe6ff');
    st.grid.material.transparent = true;
    st.grid.material.depthWrite = false;
    st.grid.position.set(cx, 0.44, cz);
    world.scene.add(sheet, st.grid);
    st.extras.push(sheet, st.grid);
    live.set(root, st);
    return st;
  };
  /** Shows `root` as it is at `t` seconds into its reveal (any order of frames works: scrubbing the preview too). */
  return (root, key, t, T = BLUEPRINT) => {
    const end = T.draw + T.fill + T.fade;
    if (t < 0 || t >= end) { strip(root); return; }
    let st = live.get(root);
    if (st && st.key !== key) { strip(root); st = null; }
    st ||= prepare(root, key);
    // the outline draws itself, part after part, and the hologram glows up with it
    const kd = clamp01(t / T.draw);
    let budget = Math.floor(st.total * easeOut(kd));
    for (const l of st.lines) {
      const take = Math.min(l.userData.n, budget);
      l.geometry.instanceCount = take;
      budget -= take;
    }
    // the real building fills in from the ground up
    const kf = clamp01((t - T.draw) / T.fill);
    const y = kf <= 0 ? st.y0 - 1 : st.y0 + (st.y1 - st.y0 + 0.3) * easeInOut(kf);
    st.below.constant = y;
    st.above.constant = -y;
    const fadeK = clamp01((t - T.draw - T.fill) / T.fade);
    const on = clamp01(t / 0.25) * (1 - fadeK);
    st.lineMat.opacity = 1 - fadeK;
    st.ghostMat.opacity = 0.5 * easeOut(kd) * (1 - fadeK);
    st.sheetMat.opacity = 0.45 * on;
    st.grid.material.opacity = 0.85 * on;
  };
}

function buildTimeline(city, ch) {
  const scenes = [];
  let t = 0;
  // Voiceover: the renderer measures each spoken line and passes its length in
  // window.SEATY_VO = { sceneIndex: seconds }, so scenes stretch to fit the voice.
  const VO = window.SEATY_VO || {};
  const add = (type, dur, data = {}, vo = null) => {
    const i = scenes.length;
    if (vo && VO[i]) dur = Math.max(dur, vo.at + VO[i] + (type === 'ask' ? 0.2 : 0.4));
    const s = { type, start: t, dur, vo, ...data };
    scenes.push(s);
    t += dur;
    return s;
  };
  // spoken names: "AverageHuman67" -> "AverageHuman", "GranttheGreat-g4d" -> "GranttheGreat" (handle tags dropped)
  const say = (name) => name.replace(/^@/, '').replace(/([-_]\p{L}{0,2}\d[\p{L}\d]{0,3})+$/u, '').replace(/(?<=\p{L})\d+$/u, '') || name.replace(/^@/, '');
  const pick = (arr, i) => arr[i % arr.length];
  const art = (w) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

  const UPGRADE_LINE = {
    pool: (n) => [`${n}'s house just got a swimming pool!`, 'Got a swimming pool!'],
    'apple-tree': (n) => [`${n} now has an apple tree in the backyard!`, 'Got an apple tree in the backyard!'],
    capybara: (n) => [`${n}'s house now has its very own capybara!`, 'Got a pet capybara!'],
    cat: (n) => [`${n} adopted a cat! Look at it sitting in the front yard.`, 'Got a pet cat!'],
    dog: (n) => [`${n} got a dog! Look at that tail wag.`, 'Got a pet dog!'],
    gems: (n) => [`${n}'s backyard now has a giant ruby and a sapphire!`, 'Got a ruby and a sapphire!'],
    'flower-tree': (n) => [`${n}'s blossom tree is in full bloom!`, 'Got a blossom tree!'],
    pond: (n) => [`${n} has a brand new pond in the backyard!`, 'Got a backyard pond!'],
    campfire: (n) => [`${n} built a patio with a cozy campfire!`, 'Got a campfire patio!'],
    chickens: (n) => [`${n} moved in with a chicken coop!`, 'Got a chicken coop!'],
    'giant-apple-tree': (n) => [`Whoa! ${n} has a giant apple tree!`, 'Got a giant apple tree!'],
    'giant-oak-tree': (n) => [`A giant oak tree now shades ${n}'s backyard!`, 'Got a giant oak tree!'],
    garage: (n) => [`${n} got a garage and a shiny red sports car!`, 'Got a garage and a sports car!'],
    torii: (n) => [`${n}'s café now has a red shrine gate!`, 'Got a red shrine gate!'],
    quail: (n) => [`Meet ${n}'s new pet quail!`, 'Got a pet quail!'],
    'soccer-field': (n) => [`${n} has a soccer field next to the house!`, 'Got a soccer field!'],
    elephant: (n) => [`${n} got a pet elephant!`, 'Got an elephant!'],
    shelter: (n) => [`${n} built a storm shelter in the yard!`, 'Got a storm shelter!'],
    drone: (n) => [`A drone now circles ${n}'s house!`, 'Got a drone!'],
    'koi-pond': (n) => [`${n} has a koi pond!`, 'Got a koi pond!'],
    'capybara-pen': (n) => [`${n} now has a whole capybara pen in the yard!`, 'Got a capybara pen!'],
    'xmas-hats': (n) => [`${n}'s chickens are ready for Christmas!`, 'Got Christmas hats for the chickens!'],
    'mango-tree': (n) => [`${n} has a mango tree full of mangoes!`, 'Got a mango tree!'],
    'milk-portal': (n) => [`It's real. ${n} now has a portal to the milk realm!`, 'Got a portal to the milk realm!'],
    'rooftop-sign': (n) => [`Now everyone knows whose house this is: ${n} got a giant sign on the roof!`, 'Got a giant rooftop sign!'],
    garden: (n) => [`${n} has a garden now: flowers, cabbages and tomatoes.`, 'Got a garden!'],
    golf: (n) => [`Fore! ${n} has a putting green and a golf cart.`, 'Got a golf green!'],
    'pickup-trucks': (n) => [`Two big trucks are parked at ${n}'s place now.`, 'Got two pickup trucks!'],
    'delivery-truck': (n) => [`${n} is in the delivery business now. The truck is ready to roll.`, 'Got a delivery truck!'],
    'giant-nugget': (n) => [`Yes, that is a giant chicken nugget on ${n}'s roof. With dip.`, 'Got a giant nugget!'],
    'dark-portal': (n) => [`${n}'s backyard now leads to another dimension. Enter at your own risk.`, 'Got a dark portal!'],
    'lava-portal': (n) => [`Careful, it's hot! ${n} has a portal to the lava dimension.`, 'Got a lava portal!'],
    tesseract: (n) => [`${n} lives in a normal house... with a door to the fourth dimension.`, 'Got a tesseract!'],
    'giant-flag': (n) => [`A giant flag of Malaysia now flies over ${n}'s mansion.`, 'Got a giant flag!'],
    'capybara-boxing': (n) => [`Ding ding! Capybara boxing has started at ${n}'s place.`, 'Got a capybara boxing ring!'],
    helicopter: (n) => [`Hear that? ${n}'s helicopter is circling the mansion.`, 'Got a helicopter!'],
    'giant-block': (n) => [`One giant grass block, placed right on top of ${n}'s roof.`, 'Got a giant grass block!'],
    'robot-guard': (n) => [`Nobody gets past ${n}'s new robot guard.`, 'Got a robot guard!'],
    'xmas-tree': (n) => [`${n}'s yard is ready for Christmas, presents and all.`, 'Got a Christmas tree!'],
    weathervane: (n) => [`A golden rooster now tells ${n} which way the wind blows.`, 'Got a weathervane!'],
    'roof-pizza': (n) => [`There's a giant pizza slice on ${n}'s roof. Of course there is.`, 'Got a roof pizza!'],
    'yard-sign': (n) => [`${n} put up a sign. The neighbours have been warned.`, 'Got a yard sign!'],
    'roof-zombie': (n) => [`Something is standing on ${n}'s roof... and it's not a snowman.`, 'Got a roof zombie!'],
    '3d-printer': (n) => [`${n}'s yard has a 3D printer now. What is it printing?`, 'Got a 3D printer!'],
    'toy-train': (n) => [`All aboard! A toy train now circles ${n}'s house.`, 'Got a toy train!'],
    'big-cats': (n) => [`${n} adopted a lion and a tiger!`, 'Got a lion and a tiger!'],
    trophy: (n) => [`${n} won the weekly challenge! A golden trophy now stands in the front yard.`, 'Won the weekly challenge trophy!'],
  };
  const upLine = (sp) => (UPGRADE_LINE[sp.type] || ((n) => [`${n} got a house upgrade!`, 'Got a house upgrade!']))(say(sp.name));
  const upNoun = (sp) => upLine(sp)[1].replace(/^(Got|Won) /, '').replace(/!$/, '');

  // ---- what happened today ----
  const newcomers = ch.newResidents.map((n) => ({ ...n, entry: world.entries.get(n.id) })).filter((n) => n.entry);
  const specials = (ch.newSpecials || []).filter((s) =>
    s.kind === 'landmark' ? world.landmarks.has(s.id)
      : s.kind === 'house' ? world.entries.get(s.id)?.recipe
        : world.entries.get(s.id)?.upgradeObjects?.[s.type]);
  // best stories first: dream houses, then landmarks, then upgrades; one with a written set-up line beats one without
  // the daily session can pick the order itself: top 1 = the hook, top 2, 3 next
  const rank = (s) => (s.top ? s.top - 100 : ({ house: 0, landmark: 1, upgrade: 2 })[s.kind] * 2 + (s.story ? 0 : 1));
  const trophy = specials.filter((s) => s.kind === 'upgrade' && s.type === 'trophy');
  const stories = [...specials].filter((s) => !trophy.includes(s)).sort((a, b) => rank(a) - rank(b));
  const featured = [...stories.slice(0, MAX_STORIES), ...trophy];
  const rapid = stories.slice(MAX_STORIES);
  // a busy day keeps the rest short: fewer separate welcomes and growers
  const busy = featured.length >= 3;
  const featuredNew = newcomers.slice(-(busy ? 2 : MAX_FEATURED_NEW)).reverse();
  const montageNew = newcomers.filter((n) => !featuredNew.includes(n));
  const featuredGrow = ch.firstReport ? [] : ch.grew.slice(0, busy ? 1 : MAX_FEATURED_GROW).map((g) => ({ ...g, entry: world.entries.get(g.id) })).filter((g) => g.entry);

  const nNew = ch.newResidents.length;
  const introLine = ch.firstReport
    ? `Day ${ch.day} of adding every commenter to my city.${city.residentCount ? ` ${city.residentCount} people live here so far.` : ''}`
    : `This is day ${ch.day} of adding every commenter to my city.${nNew ? ` ${nNew} new ${nNew === 1 ? 'neighbor' : 'neighbors'} moved in today.` : ''}`;

  // one request: the anchor sets it up like a little story (the daily session writes it: --story), then it is built
  const setUp = (sp, i) => {
    if (sp.story) return sp.story;
    const n = say(sp.kind === 'landmark' ? sp.requestedBy || 'Someone' : sp.name);
    if (sp.kind === 'house') return pick([`${n} was tired of living in a boring box.`, `${n} wanted a home nobody else has.`, `${n} had a very specific dream.`], i);
    if (sp.kind === 'landmark') return pick([`${n} thought the city was missing something.`, `${n} had a big idea for the whole town.`], i);
    return pick([`${n}'s backyard looked a little empty.`, `${n} wanted something extra at home.`], i);
  };
  const story = (sp, i, hook) => {
    const kind = sp.kind;
    const entry = kind === 'landmark' ? null : world.entries.get(sp.id);
    const asked = (hook || !!sp.story || !!sp.comment) && sp.type !== 'trophy';
    if (asked) add('ask', 2.0, { sp, entry, hook }, { text: setUp(sp, i), at: 0.25 });
    let text;
    if (kind === 'house') {
      text = asked
        ? pick([`So I built it. ${say(sp.name)} now lives in ${art(sp.title)} ${sp.title}.`, `Request granted: ${art(sp.title)} ${sp.title}!`, `Done. Say hello to ${say(sp.name)}'s new ${sp.title}.`], i)
        : pick([`${say(sp.name)} asked for a dream house. Here it is: ${art(sp.title)} ${sp.title}!`, `Makeover time! ${say(sp.name)} now lives in ${art(sp.title)} ${sp.title}.`], i);
    } else if (kind === 'landmark') {
      text = asked
        ? pick([`Done! Seaty now has ${art(sp.name)} ${sp.name}.`, `And here it is: Seaty's brand new ${sp.name}.`], i)
        : `Seaty just opened ${art(sp.name)} ${sp.name}${sp.requestedBy ? `, for ${say(sp.requestedBy)}` : ''}.`;
    } else text = upLine(sp)[0];
    add(kind, 3.4, { sp, entry, caption: kind === 'upgrade' ? upLine(sp)[1] : '' }, { text, at: 1.0 });
  };

  if (featured.length) story(featured[0], 0, true);
  add('intro', 2.8, {}, { text: introLine, at: 0.3 });
  featured.slice(1).forEach((sp, i) => story(sp, i + 1, false));
  if (rapid.length) {
    const items = rapid.slice(0, 10).map((sp) => ({
      sp,
      label: sp.kind === 'house' ? sp.title : sp.kind === 'landmark' ? sp.name : upNoun(sp).replace(/^(a|an) /, ''),
      who: sp.kind === 'landmark' ? sp.requestedBy || '' : sp.name,
      entry: sp.kind === 'landmark' ? null : world.entries.get(sp.id),
    }));
    const names = items.map((x) => (x.sp.kind === 'upgrade' ? upNoun(x.sp) : `${art(x.label)} ${x.label}`));
    const more = rapid.length - 3;
    const list = rapid.length <= 4 ? (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]) : `${names.slice(0, 3).join(', ')}, and ${more} more`;
    add('rapid', Math.max(2.4, items.length * 0.8), { items }, { text: `Also new today: ${list}.`, at: 0.2 });
  }
  if (!city.residents.length) add('empty', 5.5, {}, { text: 'The city is empty. Nobody lives here yet. Comment below, and I will build your house tomorrow!', at: 0.4 });
  featuredNew.forEach((n, i) => add('newcomer', 3.2, { n }, {
    text: pick([`Welcome, ${say(n.name)}!`, `Say hi to ${say(n.name)}, who just moved in.`, `${say(n.name)} joined the city!`, `And here comes ${say(n.name)}.`], i),
    at: 1.0,
  }));
  if (montageNew.length) add('montage', 3.0, { list: montageNew }, { text: `Plus ${montageNew.length} more new ${montageNew.length === 1 ? 'neighbor' : 'neighbors'}!`, at: 0.4 });
  featuredGrow.forEach((g, i) => add('grow', 3.2, { g }, {
    text: pick([`${say(g.name)} commented again. Their building now has ${g.to} floors.`, `${say(g.name)} added ${g.to - g.from === 1 ? 'a floor' : `${g.to - g.from} floors`}, now ${g.to} in total.`, `Look at ${say(g.name)}'s building grow, to ${g.to} floors!`], i),
    at: 0.5,
  }));
  for (const n of (ch.invites || []).slice(0, 2)) {
    const entry = world.entries.get(n.id);
    if (!entry) continue;
    add('invite', 4.6, { inv: n, entry, village: (world.villages || []).find((v) => v.name === n.village) }, {
      text: n.type === 'village'
        ? `${say(n.name)} invited ${n.friends} friends to Seaty, so they all get their own village: ${n.village}! Invite your friends too. Five friends get a village.`
        : `${say(n.name)} invited ${n.friends} friends to Seaty and is now an Ambassador! Invite five friends and you get your own village.`,
      at: 0.4,
    });
  }
  if (ch.challenge?.type === 'new') {
    const c = ch.challenge;
    add('challenge', 5, { chal: c }, { text: `New weekly challenge! A ${c.name} is hidden somewhere in Seaty. Find it on the website and comment the secret word to win a golden trophy. Here's your clue: ${c.clue}`, at: 0.4 });
  }
  if (city.residents.length) {
    const t1 = [...world.list].sort((a, b) => a.rank - b.rank)[0];
    const f = t1.resident.floors;
    add('top', 3.4, {}, {
      text: f > 1 ? `The tallest building in Seaty still belongs to ${say(t1.resident.name)}, with ${f} floors.` : 'Everyone has one floor so far. Who will build the first tower?',
      at: 0.4,
    });
  }
  // the news of the day (new city plan, Christmas…), just before the outro; the Christmas scenes are at night
  for (const n of ch.news || []) {
    if (n.scene === 'tree' && !world.christmasTree) continue;
    if (n.scene === 'santa' && !world.sleigh) continue;
    add(`news-${n.scene}`, 3.6, { night: n.scene === 'tree' || n.scene === 'santa' }, { text: n.text, at: 0.3 });
  }
  const outro = add('outro', 4.4, {}, { text: 'Want your own house? Just comment. Every new video you comment on adds a floor. See you tomorrow!', at: 0.4 });
  // the loop: after the voice, glide back to the opening shot
  const LOOP = 1.4;
  outro.dur += LOOP;
  t += LOOP;
  const total = t;

  // ---- when does each thing appear? (and the sounds that go with it) ----
  const sfx = [];
  const blueprint = createBlueprint(world);
  const rise = new Map(); // object -> { at, kind, quick }
  for (const s of scenes) {
    if (s.type === 'house') rise.set(s.entry, { at: s.start + 0.3, kind: 'house' });
    if (s.type === 'landmark') rise.set(world.landmarks.get(s.sp.id), { at: s.start + 0.3, kind: 'landmark' });
    if (s.type === 'upgrade') rise.set(s.entry.upgradeObjects[s.sp.type], { at: s.start + 0.3, kind: 'upgrade' });
    if (s.type === 'rapid') {
      s.slot = s.dur / s.items.length;
      s.items.forEach((x, j) => {
        const at = s.start + j * s.slot + 0.12;
        if (x.sp.kind === 'house') rise.set(x.entry, { at, kind: 'house', quick: true });
        else if (x.sp.kind === 'landmark') rise.set(world.landmarks.get(x.sp.id), { at, kind: 'landmark', quick: true });
        else rise.set(x.entry.upgradeObjects[x.sp.type], { at, kind: 'upgrade' });
        if (j) sfx.push({ t: s.start + j * s.slot - 0.12, kind: 'whoosh' });
      });
    }
    if (s.type === 'newcomer' && !rise.has(s.n.entry)) rise.set(s.n.entry, { at: s.start + 0.9, kind: 'newcomer' });
    if (s.type === 'montage') s.list.forEach((n, j) => !rise.has(n.entry) && rise.set(n.entry, { at: s.start + 0.5 + (j / Math.max(1, s.list.length)) * 1.8, kind: 'montage' }));
    if (['montage'].includes(s.type)) {
      const pts = s.list.map((n) => n.entry.outer.position);
      s.center = pts.reduce((c, p) => c.add(p), new THREE.Vector3()).divideScalar(pts.length);
      s.dist = Math.max(62, ...pts.map((p) => p.distanceTo(s.center) * 2.4 + 30));
    }
  }
  for (const [obj, r] of rise) {
    if (!obj) continue;
    r.T = r.quick ? BLUEPRINT_QUICK : BLUEPRINT;
    const land = r.at + (r.kind === 'upgrade' || r.kind === 'montage' ? 0.45 : r.T.draw + r.T.fill);
    r.land = land;
    if (r.kind === 'upgrade') { sfx.push({ t: r.at + 0.05, kind: 'pop' }); sfx.push({ t: land, kind: 'sparkle' }); continue; }
    if (r.kind === 'montage') { sfx.push({ t: r.at, kind: 'pop' }); continue; }
    // the outline drawing has its own little sound, the finished building a sparkle
    if (!r.quick) sfx.push({ t: r.at, kind: 'build' });
    sfx.push({ t: land - 0.05, kind: 'sparkle' });
  }
  const growFrom = new Map(featuredGrow.map((g) => [g.id, g]));
  const growScene = new Map(scenes.filter((s) => s.type === 'grow').map((s) => [s.g.id, s]));
  for (const g of featuredGrow) {
    const gs = growScene.get(g.id);
    const steps = Math.min(8, g.to - g.from);
    for (let j = 1; j <= steps; j++) sfx.push({ t: gs.start + 0.9 + 1.3 * (1 - Math.cbrt(1 - j / steps)), kind: 'ding' });
  }
  // a whoosh for every camera flight (not between a request and its build: same spot)
  scenes.forEach((s, i) => { if (i && !(scenes[i - 1].type === 'ask' && scenes[i - 1].sp === s.sp)) sfx.push({ t: Math.max(0, s.start - 0.2), kind: 'whoosh' }); });
  sfx.push({ t: total - LOOP - 0.1, kind: 'whoosh' });

  const ranked = [...world.list].sort((a, b) => a.rank - b.rank);
  const top = ranked.slice(0, 3);

  // ----- static overlay content -----
  $('t-day').textContent = ch.day;
  $('badge').textContent = `DAY ${ch.day}`;
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

  // ----- captions: when is each word spoken -----
  scenes.forEach((s, i) => {
    if (!s.vo) return;
    const words = s.vo.text.split(/\s+/).length;
    const len = VO[i] || words * 0.34;
    s.words = wordTimes(s.vo.text, s.start + s.vo.at, len);
    s.chunks = chunks(s.words);
  });

  // ----- per-scene camera poses -----
  function storyPose(s, k) {
    const sp = s.sp;
    if (sp.kind === 'landmark') {
      const l = world.landmarks.get(sp.id);
      const target = new THREE.Vector3(l.outer.position.x, l.height * 0.45, l.outer.position.z);
      const dist = Math.max(27, l.height * 1.7, l.size === 'L' ? 44 : 0);
      s.az ??= clearestView(l.outer.position, l.outer.rotation.y + 0.55, target.y, dist, 30, l.outer, 8);
      return orbit(target, dist * (1 - 0.1 * k), s.az + k * 0.4, 30);
    }
    if (sp.kind === 'upgrade') return upgradeShot(s, k * s.dur);
    const e = s.entry;
    const topY = Math.max(6, e.roofTop || 0);
    const p = e.outer.position;
    const dist = Math.max(18, topY * 1.35 + 9);
    s.az ??= clearestAzimuth(e, topY * 0.42, dist, 40);
    return orbit(new THREE.Vector3(p.x, topY * 0.42, p.z), dist, s.az + k * 0.45, 40);
  }
  function rawPose(s, lt) {
    const k = clamp01(lt / s.dur);
    switch (s.type) {
      case 'ask': {
        // the same spot as the build that follows, a little further back, slowly pushing in
        const next = scenes[scenes.indexOf(s) + 1];
        const p = storyPose(next, 0);
        const back = 1.22 - 0.22 * easeInOut(k);
        return { pos: p.target.clone().add(p.pos.clone().sub(p.target).multiplyScalar(back)), target: p.target };
      }
      case 'house':
      case 'landmark':
      case 'upgrade':
        return storyPose(s, k);
      case 'intro': {
        const d = overviewDist() * (1.15 - 0.15 * easeOut(k));
        return orbit(new THREE.Vector3(0, 0, 0), d, 0.7 + k * 0.25, 50 - 6 * k);
      }
      case 'empty':
        return orbit(new THREE.Vector3(0, 3, 0), 46 - 8 * k, 1.0 + k * 0.6, 30);
      case 'rapid': {
        const j = Math.min(s.items.length - 1, Math.floor(lt / s.slot));
        const x = s.items[j];
        const kk = (lt - j * s.slot) / s.slot;
        if (x.sp.kind === 'landmark') {
          const l = world.landmarks.get(x.sp.id);
          const target = new THREE.Vector3(l.outer.position.x, l.height * 0.4, l.outer.position.z);
          x.az ??= clearestView(l.outer.position, l.outer.rotation.y + 0.55, target.y, Math.max(26, l.height * 1.6), 32, l.outer, 8);
          return orbit(target, Math.max(26, l.height * 1.6, l.size === 'L' ? 42 : 0) * (1 - 0.08 * kk), x.az + kk * 0.3, 32);
        }
        const e = x.entry;
        const topY = Math.max(5, e.roofTop || 0);
        const dist = Math.max(16, topY * 1.3 + 8);
        x.az ??= clearestAzimuth(e, topY * 0.4, dist, 38);
        return orbit(new THREE.Vector3(e.outer.position.x, topY * 0.4, e.outer.position.z), dist * (1 - 0.08 * kk), x.az + kk * 0.3, 38);
      }
      case 'newcomer':
        return buildingShot(s.n.entry, s.n.entry.resident.floors, lt, s.dur);
      case 'grow':
        return buildingShot(s.g.entry, s.g.to, lt, s.dur);
      case 'montage':
        return orbit(s.center, s.dist || 62, 0.9 + k * 0.4, 50);
      case 'top': {
        const e = top[0];
        const h = e.resident.floors * FLOOR_H;
        const p = e.outer.position;
        const target = new THREE.Vector3(p.x * (1 - k * 0.6), h * 0.55 * (1 - k * 0.5), p.z * (1 - k * 0.6));
        return orbit(target, Math.max(28, h * 1.4 + 18) + k * overviewDist() * 0.35, e.outer.rotation.y + 0.8 + k * 0.5, 26 + k * 14);
      }
      case 'outro': {
        const live = s.dur - LOOP;
        const ko = clamp01(lt / live);
        const o = orbit(new THREE.Vector3(0, 0, 0), overviewDist() * (0.95 - 0.1 * ko), 2.2 + ko * 0.45, 40);
        if (lt <= live) return o;
        // loop: fly back to where the Short began
        const q = easeInOut(clamp01((lt - live) / LOOP));
        return flight(o, rawPose(scenes[0], 0), q);
      }
      case 'invite': {
        const v = s.village;
        const p = v ? new THREE.Vector3(v.sign.x, 2.5, v.sign.z) : s.entry.outer.position.clone().setY((s.entry.height || 3) * 0.6);
        s.az ??= Math.atan2(p.x, p.z) + 0.6;
        return orbit(p, v ? 30 - 4 * k : 18 - 2 * k, s.az + k * 0.35, 32);
      }
      case 'challenge':
        return orbit(new THREE.Vector3(0, 0, 0), overviewDist() * (0.75 - 0.08 * k), 0.9 + k * 0.6, 34);
      case 'news-layout':
        // high over the lake and the river, slowly turning: the whole new plan
        return orbit(new THREE.Vector3(-1.5 * 16, 0, 1 * 16), overviewDist() * (1.25 - 0.12 * k), 0.35 + k * 0.4, 56);
      case 'news-tree': {
        const p = world.christmasTree.position;
        return orbit(new THREE.Vector3(p.x, 11, p.z), 44 - 10 * easeOut(k), 0.5 + k * 0.55, 18);
      }
      case 'news-santa': {
        // in front of the sleigh and a little above, looking back at it as it flies towards us over the city lights
        const { pos: target, heading } = world.sleighAt(s.start + lt);
        const fwd = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
        const side = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
        const pos = target.clone().addScaledVector(fwd, 24 - 4 * k).addScaledVector(side, 9).add(new THREE.Vector3(0, 14, 0));
        return { pos, target: target.clone().add(new THREE.Vector3(0, -6, 0)) };
      }
    }
  }
  // one drone flight between two shots: straight across, rising in an arc over the roofs in the middle
  function flight(a, b, q) {
    const pos = a.pos.clone().lerp(b.pos, q);
    pos.y += Math.sin(Math.PI * q) * Math.min(30, a.pos.distanceTo(b.pos) * 0.22);
    return { pos, target: a.target.clone().lerp(b.target, q) };
  }
  const endPose = scenes.map((s) => rawPose(s, s.dur));
  function pose(i, lt) {
    const s = scenes[i];
    const p = rawPose(s, lt);
    if (i === 0) return p;
    const from = endPose[i - 1];
    const BLEND = Math.min(1.4, 0.7 + from.pos.distanceTo(p.pos) / 120);
    if (lt >= BLEND) return p;
    return flight(from, p, easeInOut(clamp01(lt / BLEND)));
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
    $('c-name').textContent = `@${name.replace(/^@/, '')}`;
    $('c-tag').textContent = tag;
    $('c-comment').textContent = comment;
    $('c-comment').style.display = comment ? '' : 'none';
    $('c-floors').innerHTML = floorsHtml;
    $('c-floors').style.display = floorsHtml ? '' : 'none';
  }
  // big captions for the anchor's lines
  let capKey = '';
  function caption(s, time) {
    if (!s?.chunks) return 0;
    const c = s.chunks.find((ck) => time >= ck[0].t0 - 0.05 && time < ck.at(-1).t1 + 0.25);
    if (!c) return 0;
    const key = `${scenes.indexOf(s)}:${s.chunks.indexOf(c)}`;
    if (key !== capKey) {
      capKey = key;
      $('caption').innerHTML = '';
      c.forEach((w) => {
        const span = document.createElement('span');
        span.textContent = w.w.replace(/^@/, '');
        $('caption').append(span);
      });
      // one very long word (a long name) would run off the screen: smaller letters for that chunk
      const longest = Math.max(...c.map((w) => w.w.length));
      $('caption').style.fontSize = longest > 16 ? '58px' : longest > 12 ? '70px' : '';
    }
    const spans = $('caption').querySelectorAll('span');
    c.forEach((w, j) => {
      const on = time >= w.t0 && time < w.t1 + 0.05;
      spans[j].className = on ? 'on' : time >= w.t1 ? 'said' : '';
    });
    return 1;
  }

  // ----- the frame function -----
  let lastCard = null;
  function frame(time) {
    const i = Math.max(0, scenes.findLastIndex((s) => time >= s.start));
    const s = scenes[i];
    const lt = time - s.start;

    // New buildings: blueprint to real. Upgrades and the newcomers' montage still pop in.
    for (const [obj, r] of rise) {
      if (!obj) continue;
      if (r.kind === 'house') {
        // the old house sinks away, then the dream house is drawn as a blueprint and filled in
        const e = obj;
        if (time < r.at - 0.25) { world.setCustom(e, false); e.outer.scale.set(1, 1, 1); blueprint(e.outer, '', -1); continue; }
        if (time < r.at) { world.setCustom(e, false); e.outer.scale.set(1, Math.max(0.001, (r.at - time) / 0.25), 1); blueprint(e.outer, '', -1); continue; }
        world.setCustom(e, true);
        e.outer.scale.set(1, 1, 1);
        blueprint(e.outer, `${e.shownKey}`, time - r.at, r.T);
        continue;
      }
      const outer = obj.outer || obj;
      outer.visible = time >= r.at;
      if (r.kind === 'upgrade') {
        const base = (obj.userData.baseScale ??= obj.scale.x || 1);
        const k = clamp01((time - r.at) / 0.45);
        obj.scale.setScalar(Math.max(0.001, easeOutBack(k)) * base);
      } else if (r.kind === 'montage') {
        const k = clamp01((time - r.at) / 0.6);
        outer.scale.set(0.85 + 0.15 * easeOut(k), Math.max(0.001, easeOutBack(k)), 0.85 + 0.15 * easeOut(k));
      } else {
        outer.scale.set(1, 1, 1);
        blueprint(outer, `${obj.shownKey ?? 'lm'}`, time - r.at, r.T);
      }
    }
    // Landmark signs only in their own scene (a city full of signs is unreadable).
    {
      const showing = new Set(s.type === 'landmark' ? [s.sp.id] : s.type === 'rapid' ? s.items.filter((x) => x.sp.kind === 'landmark').map((x) => x.sp.id) : []);
      for (const [id, l] of world.landmarks) {
        const r = rise.get(l);
        l.label.visible = showing.has(id) && l.outer.visible && (!r || time >= r.land + 0.2);
      }
    }
    for (const [id, g] of growFrom) {
      const gs = growScene.get(id);
      const k = clamp01((time - gs.start - 0.9) / 1.3);
      world.setFloors(world.entries.get(id), time < gs.start + 0.9 ? g.from : g.from + Math.ceil((g.to - g.from) * easeOut(k) - 1e-6));
    }

    // Day/night: the outro is at night; the very end flashes back to day for the loop.
    const nightStart = (scenes.find((s) => s.night) || outro).start;
    const night = time >= nightStart + 0.18 && time < total - 0.12;
    if (night !== world.night) world.setNight(night);
    const flashAt = (c) => Math.max(0, 1 - Math.abs(time - c) / 0.18);
    $('flash').style.opacity = (0.85 * Math.max(flashAt(nightStart + 0.18), flashAt(total - 0.12))).toFixed(3);

    // Camera
    const p = pose(i, lt);
    camera.position.copy(p.pos);
    camera.lookAt(p.target);

    // Overlays
    setOverlay($('title'), s.type === 'intro' ? fade(lt, 0.15, s.dur - 0.4) : 0, 40);
    setOverlay($('badge'), s.type === 'intro' || (s.type === 'outro' && lt > s.dur - LOOP) ? 0 : 1, 0);
    let cardOn = 0, montageOn = 0, boardOn = 0, ctaOn = 0;
    const labels = new Map();

    if (s.type === 'ask') {
      const who = s.sp.kind === 'landmark' ? s.sp.requestedBy : s.sp.name;
      if (lastCard !== s) fillCard(who || s.sp.name, 'Asked', s.sp.comment || '', '');
      cardOn = who && s.sp.comment ? fade(lt, 0.15, s.dur + 10, 0.25) : 0;
    } else if (['house', 'landmark', 'upgrade'].includes(s.type)) {
      const prevAsk = scenes[i - 1]?.type === 'ask' && scenes[i - 1].sp === s.sp;
      if (lastCard !== s) {
        const what = s.type === 'house' ? `Now living in: ${s.sp.title}` : s.type === 'upgrade' ? s.caption : `New in town: ${s.sp.name}`;
        fillCard(s.type === 'landmark' ? s.sp.requestedBy || s.sp.name : s.sp.name, 'Built ✔', what, '');
        if (s.type === 'landmark' && !s.sp.requestedBy) { $('c-name').textContent = s.sp.name; $('c-avatar').textContent = '★'; $('c-avatar').style.background = '#f5b82e'; }
      }
      cardOn = prevAsk ? fade(lt, 0.9, s.dur - 0.35, 0.3) : fade(lt, 1.4, s.dur - 0.35);
      if (s.type !== 'landmark' && lt > 1.2) labels.set(s.sp.id, { cls: 'vlabel new', text: `@${s.sp.name.replace(/^@/, '')}` });
    } else if (s.type === 'rapid') {
      const j = Math.min(s.items.length - 1, Math.floor(lt / s.slot));
      const x = s.items[j];
      $('montage').innerHTML = `${x.label}<small>${x.who ? `@${x.who.replace(/^@/, '')}` : 'new today'}</small>`;
      montageOn = fade(lt - j * s.slot, 0.15, s.slot - 0.12, 0.12);
    } else if (s.type === 'newcomer') {
      const n = s.n;
      if (lastCard !== s) fillCard(n.name, `New resident · plot ${n.plot}`, n.comment, '');
      cardOn = fade(lt, 1.2, s.dur - 0.35);
      if (time >= (rise.get(n.entry)?.at ?? 0) + 0.5) labels.set(n.id, { cls: 'vlabel new', text: `@${n.name.replace(/^@/, '')}` });
    } else if (s.type === 'grow') {
      const g = s.g;
      const shown = world.entries.get(g.id).shownFloors;
      const added = shown - g.from;
      if (lastCard !== s || $('c-floors').dataset.n !== String(shown)) {
        fillCard(g.name, 'Commented again', '', `${shown} floors ${added > 0 ? `<b>+${added}</b>` : ''}`);
        $('c-floors').dataset.n = String(shown);
      }
      cardOn = fade(lt, 0.6, s.dur - 0.35);
    } else if (s.type === 'invite') {
      if (lastCard !== s) {
        const v = s.inv.type === 'village';
        fillCard(s.inv.name, v ? 'New village' : 'Ambassador', v ? `${s.inv.village}: ${s.inv.friends} friends moved in together` : `Invited ${s.inv.friends} friends to Seaty`, '');
        $('c-avatar').textContent = v ? '🏘️' : '🎖️';
        $('c-avatar').style.background = '#f5b82e';
      }
      cardOn = fade(lt, 0.9, s.dur - 0.35);
      labels.set(s.inv.id, { cls: 'vlabel new', text: `@${s.inv.name.replace(/^@/, '')}` });
    } else if (s.type === 'challenge') {
      if (lastCard !== s) {
        fillCard('Weekly challenge', `Find the ${s.chal.name}`, `Clue: ${s.chal.clue}`, '');
        $('c-name').textContent = 'Weekly challenge';
        $('c-avatar').textContent = '🏆';
        $('c-avatar').style.background = '#f5b82e';
      }
      cardOn = fade(lt, 0.8, s.dur - 0.35);
    } else if (s.type === 'montage') {
      const k = clamp01((lt - 0.5) / 1.8);
      $('montage').innerHTML = `+${Math.ceil(s.list.length * k)}<small>more new residents</small>`;
      montageOn = fade(lt, 0.3, s.dur - 0.35);
    } else if (s.type === 'top') {
      boardOn = fade(lt, 0.5, s.dur - 0.35);
      top.forEach((e, r) => labels.set(e.resident.id, { cls: r === 0 ? 'vlabel top1' : 'vlabel top', text: `#${r + 1} ${e.resident.name}` }));
    } else if (s.type === 'empty') {
      const sw = Math.max(2.6, s.dur * 0.45);
      $('cta-big').innerHTML = lt < sw ? 'The city is <span>empty</span>…' : 'Be resident <span>#1</span>';
      $('cta-small').textContent = lt < sw ? 'Nobody lives here yet.' : 'Comment below and I’ll build your house tomorrow.';
      $('cta-url').style.display = 'none';
      ctaOn = fade(lt, 0.3, s.dur - 0.35) * (lt > sw - 0.2 && lt < sw + 0.2 ? Math.abs(lt - sw) / 0.2 : 1);
    } else if (s.type === 'outro') {
      $('cta-big').innerHTML = 'Comment to get <span>your own house</span>';
      $('cta-small').textContent = 'Every new video you comment on adds +1 floor';
      $('cta-url').style.display = '';
      ctaOn = fade(lt, 0.45, s.dur - LOOP - 0.1, 0.3);
    }
    lastCard = ['ask', 'house', 'landmark', 'upgrade', 'newcomer', 'grow', 'challenge', 'invite'].includes(s.type) ? s : null;
    $('card').classList.toggle('plain', ['house', 'landmark', 'upgrade', 'challenge', 'invite'].includes(s.type));
    $('card').classList.toggle('ask', s.type === 'ask');
    setOverlay($('card'), cardOn, 60);
    setOverlay($('montage'), montageOn, 40);
    setOverlay($('board'), boardOn, 60);
    setOverlay($('cta'), ctaOn, 40);
    // captions stay out of the way of the big title / CTA text
    setOverlay($('caption'), s.type === 'intro' || s.type === 'outro' || s.type === 'empty' ? 0 : caption(s, time), 0);
    setLabels(labels);

    world.tick(time);
    world.render();
  }

  return { duration: total, fps: FPS, frame, sfx: sfx.filter((e) => e.t >= 0 && e.t < total).sort((a, b) => a.t - b.t), scenes: scenes.map((s) => ({ type: s.type, start: s.start, dur: s.dur, vo: s.vo })) };
}

// ---------- API for the renderer ----------
window.seaty = {
  ready: ready.then((tl) => ({ duration: tl.duration, fps: tl.fps, scenes: tl.scenes, sfx: tl.sfx })),
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
