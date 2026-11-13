// The 3D town, shared by the website (city.js) and the video renderer (video.js).
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export { THREE, CSS2DObject };

import { LOT, BLOCK, PITCH, LOT_OFFSETS, LANDMARK_BLOCKS, spiral, spiralIndexOf, createLayout } from './layout.js';
export { LOT, BLOCK, PITCH, LANDMARK_BLOCKS };

// ---------- Layout constants ----------
export const FLOOR_H = 1.2;
export const FOOT = 4.2;
const TEX_FLOORS = 4;
const HOUSE_MAX_FLOORS = 3;     // 1-3 floors = cozy house, 4+ = apartment tower

const WALLS = ['#efe2cf', '#d6dee8', '#f2cdbb', '#d3e4cf', '#ece5b8', '#ddd3ec', '#f3d8dd', '#c6dae5'];
const ROOFS = ['#b5523b', '#6b7a8f', '#8a5a44', '#4f6d5a', '#a8443a', '#5c6f8c'];

export function rng(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
export function hashId(id) {
  return [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}

// The active layout (rebuilt by world.build when specials add edge landmark blocks).
let layout = createLayout();

/** Resident plot index (0-based) -> world position. Block 0 is the town square. */
export function plotPosition(i) {
  const { x, z } = layout.plot(i);
  return new THREE.Vector3(x, 0, z);
}

/** Landmark definition number k -> centre of its block (downtown for the first 8, then its own edge block). */
function landmarkBlock(def, k) {
  return k < LANDMARK_BLOCKS.length ? LANDMARK_BLOCKS[k] : Array.isArray(def.block) ? def.block : null;
}

// ---------- Textures & materials ----------
function windowTextures(seed) {
  const r = rng(seed);
  const W = 96, H = 64 * TEX_FLOORS;
  const make = () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    return [c, c.getContext('2d')];
  };
  const [c1, wall] = make();
  const [c2, glow] = make();
  wall.fillStyle = '#ffffff'; wall.fillRect(0, 0, W, H);
  glow.fillStyle = '#000000'; glow.fillRect(0, 0, W, H);
  for (let f = 0; f < TEX_FLOORS; f++) {
    wall.fillStyle = '#e8e8e8';
    wall.fillRect(0, f * 64 + 60, W, 4);
    for (let w = 0; w < 3; w++) {
      const x = 8 + w * 30, y = f * 64 + 16, ww = 20, wh = 32;
      wall.fillStyle = '#5d7088';
      wall.fillRect(x, y, ww, wh);
      wall.fillStyle = 'rgba(255,255,255,0.35)';
      wall.fillRect(x, y, ww, 5);
      if (r() < 0.45) {
        glow.fillStyle = r() < 0.8 ? '#ffd27a' : '#bfe3ff';
        glow.fillRect(x, y, ww, wh);
      }
    }
  }
  return [c1, c2].map((c) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  });
}

function makeMaterials() {
  const side = WALLS.map((color, i) => {
    const [map, emissiveMap] = windowTextures(i * 97 + 7);
    return new THREE.MeshStandardMaterial({ color, map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.85 });
  });
  const flatRoof = WALLS.map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.72), roughness: 0.95 }));
  const roof = ROOFS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true }));
  const gold = new THREE.MeshStandardMaterial({ color: '#f5b82e', metalness: 0.6, roughness: 0.35, emissive: '#7a4a00', emissiveIntensity: 0.2 });
  const detail = new THREE.MeshStandardMaterial({ color: '#8d96a3', roughness: 0.8 });
  const door = new THREE.MeshStandardMaterial({ color: '#6b4630', roughness: 0.9 });
  const brick = new THREE.MeshStandardMaterial({ color: '#9b5b48', roughness: 0.9 });
  return { side, flatRoof, roof, gold, detail, door, brick };
}

// ---------- Geometry caches ----------
const bodyGeoCache = new Map();
function bodyGeometry(floors, uvOffset) {
  const key = `${floors}:${uvOffset}`;
  if (bodyGeoCache.has(key)) return bodyGeoCache.get(key);
  const h = floors * FLOOR_H;
  const geo = new THREE.BoxGeometry(FOOT, h, FOOT);
  geo.translate(0, h / 2, 0);
  const uv = geo.attributes.uv;
  for (const face of [0, 1, 4, 5]) {
    for (let v = face * 4; v < face * 4 + 4; v++) {
      uv.setY(v, uv.getY(v) * (floors / TEX_FLOORS) + uvOffset / TEX_FLOORS);
    }
  }
  bodyGeoCache.set(key, geo);
  return geo;
}
const GEO = {
  hipRoof: new THREE.ConeGeometry(FOOT * 0.74, 1.8, 4).rotateY(Math.PI / 4).translate(0, 0.9, 0),
  crown: new THREE.ConeGeometry(FOOT * 0.62, 2.2, 4).rotateY(Math.PI / 4).translate(0, 1.1, 0),
  door: new THREE.BoxGeometry(0.9, 1.5, 0.12).translate(0, 0.75, 0),
  chimney: new THREE.BoxGeometry(0.45, 1.3, 0.45).translate(0, 0.65, 0),
  ac: new THREE.BoxGeometry(1.2, 0.6, 1.0).translate(0, 0.3, 0),
  antenna: new THREE.CylinderGeometry(0.06, 0.06, 3, 5).translate(0, 1.5, 0),
};

// ---------- World ----------
export function createWorld({ container, width, height, pixelRatio = Math.min(devicePixelRatio, 2), shadowSize = 2048, preserveDrawingBuffer = false }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  // zIndex 0 makes a stacking context, so page overlays/panels stay above the 3D name tags.
  Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none', zIndex: '0' });
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 4000);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 1.4);
  const sun = new THREE.DirectionalLight(0xfff1dd, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.0005;
  scene.add(hemi, sun, sun.target);

  const mat = makeMaterials();
  const world = {
    THREE, scene, camera, renderer, labelRenderer, sun, hemi, mat,
    city: null, entries: new Map(), list: [], pickables: [], radius: 60,
    townHall: null, cars: null, night: false,
  };

  // ----- Buildings -----
  function makeBuilding(entry, floors) {
    const { hash, rank } = entry;
    const h = floors * FLOOR_H;
    const side = mat.side[hash % WALLS.length];
    const group = new THREE.Group();
    let body;

    if (floors <= HOUSE_MAX_FLOORS) {
      const roofMat = rank === 1 ? mat.gold : mat.roof[(hash >>> 4) % ROOFS.length];
      body = new THREE.Mesh(bodyGeometry(floors, hash % TEX_FLOORS), [side, side, roofMat, roofMat, side, side]);
      const roof = new THREE.Mesh(GEO.hipRoof, roofMat);
      roof.position.y = h;
      const door = new THREE.Mesh(GEO.door, mat.door);
      door.position.set(0, 0, FOOT / 2 + 0.03);
      const chimney = new THREE.Mesh(GEO.chimney, mat.brick);
      chimney.position.set(1.05, h + 0.35, -0.7);
      roof.castShadow = chimney.castShadow = true;
      group.add(roof, door, chimney);
      entry.roofTop = h + 1.8;
    } else {
      const roofMat = rank === 1 ? mat.gold : mat.flatRoof[hash % WALLS.length];
      body = new THREE.Mesh(bodyGeometry(floors, hash % TEX_FLOORS), [side, side, roofMat, roofMat, side, side]);
      const door = new THREE.Mesh(GEO.door, mat.door);
      door.scale.set(1.4, 1, 1);
      door.position.set(0, 0, FOOT / 2 + 0.03);
      group.add(door);
      if (rank <= 3) {
        const crown = new THREE.Mesh(GEO.crown, roofMat);
        crown.position.y = h;
        crown.castShadow = true;
        group.add(crown);
        entry.roofTop = h + 2.2;
      } else {
        const ac = new THREE.Mesh(GEO.ac, mat.detail);
        ac.position.set(0.8, h, -0.6);
        group.add(ac);
        entry.roofTop = h + 0.6;
      }
      if (floors >= 15) {
        const ant = new THREE.Mesh(GEO.antenna, mat.detail);
        ant.position.set(-1.2, h, 1.2);
        group.add(ant);
        entry.roofTop = Math.max(entry.roofTop, h + 3);
      }
    }
    body.castShadow = body.receiveShadow = true;
    body.userData.entry = entry;
    group.add(body);
    return { group, body, height: h, roofTop: entry.roofTop };
  }

  /** Show `floors` floors on this building (used by the video to grow towers floor by floor). */
  world.setFloors = (entry, floors) => {
    floors = Math.max(1, Math.round(floors));
    if (entry.shownFloors === floors) return;
    if (entry.inner) {
      entry.outer.remove(entry.inner);
      const i = world.pickables.indexOf(entry.body);
      if (i >= 0) world.pickables.splice(i, 1);
    }
    entry.cache ||= new Map();
    if (!entry.cache.has(floors)) entry.cache.set(floors, makeBuilding(entry, floors));
    const b = entry.cache.get(floors);
    entry.inner = b.group;
    entry.body = b.body;
    entry.height = b.height;
    entry.roofTop = b.roofTop;
    entry.shownFloors = floors;
    b.group.position.x = entry.upgrades?.has('pool') ? -0.8 : 0; // make room for the pool
    entry.outer.add(b.group);
    world.pickables.push(b.body);
    if (entry.label) entry.label.position.y = entry.roofTop + 1.6;
  };

  // ----- Special buildings & upgrades -----
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
  const SPECIAL_MAT = {
    cream: M('#f3e3c3'), brick: M('#b5523b'), white: M('#f7f4ee'), red: M('#d63a2f'),
    noodle: M('#f2c94c', { roughness: 0.5 }), steel: M('#9aa5b1', { metalness: 0.4, roughness: 0.4 }),
    glass: M('#7fa7c9', { roughness: 0.2, metalness: 0.1 }), dark: M('#3b4552'),
    water: M('#3fb6e8', { roughness: 0.1, emissive: '#0b5c80', emissiveIntensity: 0.35 }),
    leaf: M('#4f8f3f', { flatShading: true }), trunk: M('#7b5a3c'), apple: M('#d9302b', { roughness: 0.4 }),
    steam: M('#ffffff', { transparent: true, opacity: 0.75 }),
  };
  const shadowAll = (g) => g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  /** Spaghetti Factory: sawtooth-roof hall, striped chimney with steam, giant spaghetti plate on the roof. */
  function spaghettiFactory() {
    const g = new THREE.Group();
    const hall = new THREE.Mesh(new THREE.BoxGeometry(9.5, 4.2, 7).translate(0, 2.1, 0), SPECIAL_MAT.cream);
    g.add(hall);
    // sawtooth roof
    const tooth = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(3.1, 0), new THREE.Vector2(0, 1.6)]);
    const toothGeo = new THREE.ExtrudeGeometry(tooth, { depth: 7, bevelEnabled: false }).translate(-4.75, 4.2, -3.5);
    for (let i = 0; i < 3; i++) {
      const t = new THREE.Mesh(toothGeo, SPECIAL_MAT.brick);
      t.position.x = i * 3.15;
      g.add(t);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 6.4).translate(-4.7 + i * 3.15, 4.95, 0), SPECIAL_MAT.glass);
      g.add(win);
    }
    // windows along the front + big door
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.4, 0.1).translate(-3.6 + i * 2.4, 2.6, 3.52), SPECIAL_MAT.glass);
      g.add(w);
    }
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.12).translate(0, 1.3, 3.54), SPECIAL_MAT.dark));
    // striped chimney + steam
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1.2, 16).translate(0, 0.6, 0), i % 2 ? SPECIAL_MAT.white : SPECIAL_MAT.red);
      c.position.set(3.6, 4.2 + i * 1.2, -2.4);
      g.add(c);
    }
    const puffs = [];
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), SPECIAL_MAT.steam);
      g.add(p);
      puffs.push(p);
    }
    // giant plate of spaghetti with a meatball and a fork
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 1.9, 0.35, 32), SPECIAL_MAT.white);
    plate.position.set(-1.2, 6.6, 0.8);
    const noodles = new THREE.Mesh(new THREE.TorusKnotGeometry(1.15, 0.28, 160, 12, 3, 7), SPECIAL_MAT.noodle);
    noodles.position.set(-1.2, 7.35, 0.8);
    noodles.rotation.x = Math.PI / 2;
    noodles.scale.set(1, 1, 0.55);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), SPECIAL_MAT.red);
    ball.position.set(-1.0, 8.05, 0.9);
    const fork = new THREE.Group();
    fork.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 8).translate(0, 1.7, 0), SPECIAL_MAT.steel));
    for (let k = -1; k <= 1; k++) fork.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08).translate(k * 0.22, 3.75, 0), SPECIAL_MAT.steel));
    fork.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.1).translate(0, 3.3, 0), SPECIAL_MAT.steel));
    fork.position.set(-1.6, 7.2, 0.6);
    fork.rotation.z = 0.45;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 2.4, 8).translate(0, 1.2, 0), SPECIAL_MAT.steel);
    stand.position.set(-1.2, 4.2, 0.8);
    g.add(plate, noodles, ball, fork, stand);
    shadowAll(g);
    puffs.forEach((p) => (p.castShadow = false));
    g.userData.tick = (t) => {
      puffs.forEach((p, i) => {
        const k = (t * 0.35 + i / puffs.length) % 1;
        p.position.set(3.6 + k * 1.2, 11.4 + k * 4, -2.4 - k * 0.6);
        p.scale.setScalar(0.5 + k * 1.3);
      });
      noodles.rotation.z = t * 0.6;
    };
    return { group: g, height: 9.5 };
  }

  /** Fallback for landmark types without their own model yet. */
  function genericLandmark(def) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 6).translate(0, 1.75, 0), SPECIAL_MAT.cream);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 3.5, 0), mat.gold);
    g.add(base, dome);
    for (let i = 0; i < 4; i++) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.5, 12).translate(-3 + i * 2, 1.75, 3.2), SPECIAL_MAT.white));
    shadowAll(g);
    return { group: g, height: 6 };
  }
  const LANDMARK_MODELS = { 'spaghetti-factory': spaghettiFactory };

  function pool() {
    const g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 4.4).translate(0, 0.11, 0), SPECIAL_MAT.white);
    const water = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 4.05).translate(0, 0.23, 0), SPECIAL_MAT.water);
    g.add(rim, water);
    g.position.set(2.25, 0.27, 0);
    rim.receiveShadow = true;
    return g;
  }
  function appleTree() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.3, 6).translate(0, 0.65, 0), SPECIAL_MAT.trunk));
    g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 1).translate(0, 1.9, 0), SPECIAL_MAT.leaf));
    const r = rng(3);
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, y = 1.4 + r() * 1.0;
      const rad = Math.sqrt(Math.max(0, 1 - ((y - 1.9) / 1.05) ** 2)) * 1.0;
      const ap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), SPECIAL_MAT.apple);
      ap.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad);
      g.add(ap);
    }
    shadowAll(g);
    g.position.set(-2.35, 0.27, -2.35);
    g.scale.setScalar(0.85);
    return g;
  }
  /** Capybara: a big friendly capybara relaxing in the front yard, with an orange on its head. */
  function capybara() {
    const fur = M('#a0703f', { flatShading: true });
    const dark = M('#5a3b22');
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), fur);
    body.scale.set(1, 0.78, 1.45);
    body.position.y = 0.55;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.6, 0.78, 2, 2, 2), fur);
    head.position.set(0, 0.92, 0.9);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.3), fur);
    snout.position.set(0, 0.84, 1.36);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.05), dark);
    nose.position.set(0, 0.96, 1.52);
    g.add(body, head, snout, nose);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), dark);
      eye.position.set(s * 0.25, 1.05, 1.15);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), dark);
      ear.scale.set(1, 1, 0.5);
      ear.position.set(s * 0.24, 1.24, 0.72);
      g.add(eye, ear);
      for (const z of [-0.55, 0.45]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.32, 8).translate(0, 0.16, 0), fur);
        leg.position.set(s * 0.36, 0, z);
        g.add(leg);
      }
    }
    const orange = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), M('#f39a1e', { roughness: 0.5 }));
    orange.position.set(0, 1.39, 0.85);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.07), SPECIAL_MAT.leaf);
    leaf.position.set(0.05, 1.57, 0.85);
    g.add(orange, leaf);
    shadowAll(g);
    // lies along the front yard, left of the door, facing sideways
    g.position.set(-1.35, 0.27, 2.62);
    g.rotation.y = -Math.PI / 2;
    g.scale.setScalar(0.8);
    return g;
  }
  const UPGRADE_MODELS = { pool, 'apple-tree': appleTree, capybara };

  world.landmarks = new Map();
  /** Adds landmarks and house upgrades from data/specials.json. Call after build(). */
  world.addSpecials = (specials) => {
    (specials?.landmarks || []).forEach((def, k) => {
      const block = landmarkBlock(def, k);
      if (!block) return; // an edge landmark without an assigned block (should not happen)
      const made = (LANDMARK_MODELS[def.type] || genericLandmark)(def);
      const outer = new THREE.Group();
      outer.position.set(block[0] * PITCH, 0, block[1] * PITCH);
      // face the town square
      outer.rotation.y = Math.atan2(-outer.position.x, -outer.position.z);
      outer.add(made.group);
      scene.add(outer);
      const el = document.createElement('div');
      el.className = 'label landmark';
      el.textContent = def.name;
      const label = new CSS2DObject(el);
      label.position.set(0, made.height + 2.5, 0);
      outer.add(label);
      world.landmarks.set(def.id, { def, outer, height: made.height, label, tick: made.group.userData.tick });
    });
    const norm = (s) => String(s || '').trim().replace(/^@/, '').toLowerCase();
    for (const up of specials?.upgrades || []) {
      const who = norm(up.resident);
      const entry = world.list.find((e) => e.resident.id === up.resident || norm(e.resident.name) === who);
      const model = UPGRADE_MODELS[up.type];
      if (!entry || !model) continue;
      entry.upgrades ||= new Set();
      if (entry.upgrades.has(up.type)) continue;
      entry.upgrades.add(up.type);
      const obj = model();
      (entry.upgradeObjects ||= {})[up.type] = obj;
      entry.outer.add(obj);
      const shown = entry.shownFloors;
      entry.shownFloors = null;
      world.setFloors(entry, shown); // re-place the house (pool shifts it)
    }
  };

  world.addLabel = (entry, className = 'label', text = null) => {
    if (entry.label) entry.label.removeFromParent();
    const el = document.createElement('div');
    el.className = className;
    if (text != null) el.textContent = text;
    else {
      el.textContent = entry.resident.name;
      const b = document.createElement('b');
      b.textContent = entry.resident.floors;
      el.appendChild(b);
    }
    const obj = new CSS2DObject(el);
    obj.position.set(0, entry.roofTop + 1.6, 0);
    entry.outer.add(obj);
    entry.label = obj;
    return obj;
  };
  world.removeLabel = (entry) => {
    if (entry.label) { entry.label.removeFromParent(); entry.label = null; }
  };

  // ----- Ground, roads, trees -----
  function buildGround(ringBlocks) {
    const size = world.radius * 2 + PITCH * 6;
    const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ color: '#6f7782', roughness: 1 }));
    asphalt.rotation.x = -Math.PI / 2;
    asphalt.receiveShadow = true;
    scene.add(asphalt);

    const grass = new THREE.Mesh(new THREE.RingGeometry(size * 0.5, size * 4, 64), new THREE.MeshStandardMaterial({ color: '#8fb46e', roughness: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    scene.add(grass);

    const padGeo = new THREE.BoxGeometry(BLOCK, 0.25, BLOCK).translate(0, 0.125, 0);
    const pads = new THREE.InstancedMesh(padGeo, new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 1 }), ringBlocks);
    pads.receiveShadow = true;
    const m = new THREE.Matrix4();
    for (let b = 0; b < ringBlocks; b++) {
      const [bx, bz] = spiral(b);
      pads.setMatrixAt(b, m.makeTranslation(bx * PITCH, 0, bz * PITCH));
    }
    scene.add(pads);

    // Lawn on every plot so houses sit in little gardens; work out which plots get trees.
    const lawnGeo = new THREE.BoxGeometry(LOT - 0.8, 0.05, LOT - 0.8).translate(0, 0.27, 0);
    const lawns = new THREE.InstancedMesh(lawnGeo, new THREE.MeshStandardMaterial({ color: '#a3c784', roughness: 1 }), (ringBlocks - 1) * 4);
    lawns.receiveShadow = true;
    const used = world.city.residents.length;
    const busyLandmark = new Set(
      (world.specials?.landmarks || []).map((d, k) => landmarkBlock(d, k)).filter(Boolean).map(([x, z]) => `${x},${z}`),
    );
    const treePlots = [];
    for (let b = 1; b < ringBlocks; b++) {
      const [bx, bz] = spiral(b);
      const key = `${bx},${bz}`;
      let free; // which of the 4 plots get trees
      if (layout.isReserved(bx, bz)) free = busyLandmark.has(key) ? [] : [0, 1, 2, 3];
      else {
        const ri = layout.residentIndexOfN(b);
        free = [0, 1, 2, 3].filter((j) => ri * 4 + j >= used);
      }
      LOT_OFFSETS.forEach(([ox, oz], j) => {
        const pos = new THREE.Vector3(bx * PITCH + ox, 0, bz * PITCH + oz);
        lawns.setMatrixAt((b - 1) * 4 + j, m.makeTranslation(pos.x, 0, pos.z));
        if (free.includes(j)) treePlots.push(pos);
      });
    }
    scene.add(lawns);

    const dashGeo = new THREE.PlaneGeometry(0.25, 1.6).rotateX(-Math.PI / 2);
    const span = Math.ceil(Math.sqrt(ringBlocks)) + 1;
    world.roadSpan = span;
    const dashPositions = [];
    for (let g = -span; g <= span; g++) {
      const line = g * PITCH + PITCH / 2;
      for (let s = -span * PITCH; s < span * PITCH; s += 4) dashPositions.push([line, s, 0], [s, line, Math.PI / 2]);
    }
    const dashes = new THREE.InstancedMesh(dashGeo, new THREE.MeshBasicMaterial({ color: '#f1efe6' }), dashPositions.length);
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    dashPositions.forEach(([x, z, rot], i) => {
      dashes.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0.01, z), q.setFromAxisAngle(up, rot), one));
    });
    scene.add(dashes);

    // Trees on plots nobody lives on yet (and on landmark blocks still waiting for a landmark)
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1, 6).translate(0, 0.5, 0);
    const crownGeo = new THREE.IcosahedronGeometry(1.1, 0).translate(0, 1.9, 0);
    const n = Math.max(1, treePlots.length * 2);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#7b5a3c' }), n);
    const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: '#5f9a4e', flatShading: true }), n);
    crowns.castShadow = true;
    trunks.count = crowns.count = treePlots.length * 2;
    const r = rng(5);
    treePlots.forEach((p, i) => {
      for (let k = 0; k < 2; k++) {
        const s = 0.7 + r() * 0.6;
        m.compose(new THREE.Vector3(p.x + (r() - 0.5) * 3, 0.25, p.z + (r() - 0.5) * 3), q.identity(), new THREE.Vector3(s, s, s));
        trunks.setMatrixAt(i * 2 + k, m);
        crowns.setMatrixAt(i * 2 + k, m);
      }
    });
    scene.add(trunks, crowns);
  }

  // ----- Cars -----
  function buildCars() {
    const span = world.roadSpan;
    const count = Math.min(80, 10 + span * 6);
    const len = span * 2 * PITCH;
    const bodyGeo = new THREE.BoxGeometry(1.7, 0.6, 0.95).translate(0, 0.45, 0);
    const cabGeo = new THREE.BoxGeometry(0.9, 0.45, 0.85).translate(-0.1, 0.95, 0);
    const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), count);
    const cabs = new THREE.InstancedMesh(cabGeo, new THREE.MeshStandardMaterial({ color: '#dfe8f0', roughness: 0.3 }), count);
    bodies.castShadow = true;
    const colors = ['#e4572e', '#2e86ab', '#f3a712', '#ffffff', '#29335c', '#669bbc', '#c1121f'];
    const r = rng(11);
    const cars = [];
    for (let i = 0; i < count; i++) {
      const g = Math.floor(r() * span * 2) - span;
      cars.push({
        alongX: r() < 0.5,
        line: g * PITCH + PITCH / 2,
        dir: r() < 0.5 ? 1 : -1,
        speed: 4 + r() * 4,
        offset: r() * len,
      });
      bodies.setColorAt(i, new THREE.Color(colors[i % colors.length]));
    }
    scene.add(bodies, cabs);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    world.cars = {
      update(t) {
        cars.forEach((c, i) => {
          const s = ((((c.offset + c.dir * c.speed * t) % len) + len) % len) - len / 2;
          const lane = c.line + c.dir * 1;
          if (c.alongX) { p.set(s, 0, lane); q.setFromAxisAngle(up, c.dir > 0 ? 0 : Math.PI); }
          else { p.set(lane, 0, s); q.setFromAxisAngle(up, c.dir > 0 ? -Math.PI / 2 : Math.PI / 2); }
          m.compose(p, q, one);
          bodies.setMatrixAt(i, m);
          cabs.setMatrixAt(i, m);
        });
        bodies.instanceMatrix.needsUpdate = cabs.instanceMatrix.needsUpdate = true;
      },
    };
    world.cars.update(0);
  }

  // ----- Town hall -----
  function buildTownHall() {
    const h = Math.max(6, (world.city.videoCount || 1) * 0.6);
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 0.6, 32), new THREE.MeshStandardMaterial({ color: '#efe9dd' }));
    base.position.y = 0.55;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, h, 4), new THREE.MeshStandardMaterial({ color: '#fbf7ef', roughness: 0.5 }));
    tower.position.y = 0.85 + h / 2;
    tower.rotation.y = Math.PI / 4;
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), mat.gold);
    tip.position.y = 0.85 + h + 1;
    for (const o of [base, tower, tip]) { o.castShadow = o.receiveShadow = true; group.add(o); }
    group.userData.tip = tip;
    group.userData.height = 0.85 + h + 2;
    scene.add(group);
    world.townHall = group;
  }

  /** Build the whole town from city.json data. */
  world.build = (city, { labelTop = 5, specials = null } = {}) => {
    world.city = city;
    world.specials = specials;
    // Houses skip the blocks of edge landmarks (#9 and later), so rebuild the layout with them.
    const edgeBlocks = (specials?.landmarks || []).slice(LANDMARK_BLOCKS.length).map((d) => d.block).filter(Array.isArray);
    layout = createLayout(edgeBlocks);
    const blocks = Math.ceil(city.residents.length / 4);
    // Furthest spiral block in use: last house block, downtown landmark blocks, or edge landmarks.
    const landmarkReach = (specials?.landmarks?.length || 0) > 4 ? 24 : 8;
    const maxN = Math.max(
      landmarkReach,
      blocks ? layout.residentBlock(blocks - 1).n : 0,
      ...edgeBlocks.map(([x, z]) => spiralIndexOf(x, z)),
    );
    const side = Math.ceil(Math.sqrt(maxN + 1));
    const ringBlocks = Math.pow(side + 2, 2);
    world.radius = ((side + 1) * PITCH) / 2 + PITCH;

    buildGround(ringBlocks);
    buildCars();
    buildTownHall();

    const ranked = [...city.residents].sort((a, b) => b.floors - a.floors || a.joined.localeCompare(b.joined));
    const rankOf = new Map(ranked.map((r, i) => [r.id, i + 1]));
    city.residents.forEach((resident, i) => {
      const hash = hashId(resident.id);
      const outer = new THREE.Group();
      outer.position.copy(plotPosition(i));
      outer.rotation.y = ((hash >>> 3) % 4) * (Math.PI / 2);
      scene.add(outer);
      const entry = { resident, plot: i + 1, rank: rankOf.get(resident.id), hash, outer };
      world.setFloors(entry, resident.floors);
      world.entries.set(resident.id, entry);
      world.list.push(entry);
      if (entry.rank <= labelTop) world.addLabel(entry);
    });
    if (specials) world.addSpecials(specials);

    // Light, shadows and fog sized to the city
    const R = world.radius;
    const d = Math.max(60, R * 1.6);
    scene.fog = new THREE.Fog(0xbcd8ee, d * 1.6, d * 5);
    sun.position.set(R * 0.8 + 40, R + 80, R * 0.4 + 30);
    const s = R + PITCH * 2;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: R * 4 + 300 });
    sun.shadow.camera.updateProjectionMatrix();
    world.setNight(false);
  };

  /** Camera pose that shows the whole city. */
  world.overviewPose = (scale = 1) => {
    const d = Math.max(60, world.radius * 1.6) * scale;
    return { pos: new THREE.Vector3(d * 0.8, d * 0.75, d * 0.95), target: new THREE.Vector3(0, 0, 0) };
  };

  world.setNight = (on) => {
    world.night = on;
    const sky = new THREE.Color(on ? '#0b1222' : '#bcd8ee');
    scene.background = sky;
    if (scene.fog) scene.fog.color.copy(sky);
    hemi.intensity = on ? 0.4 : 1.4;
    hemi.color.set(on ? '#8aa0ff' : '#ffffff');
    sun.intensity = on ? 0.15 : 2.4;
    for (const m of mat.side) m.emissiveIntensity = on ? 1.3 : 0;
    mat.gold.emissiveIntensity = on ? 0.8 : 0.2;
  };

  world.tick = (seconds) => {
    if (world.townHall) world.townHall.userData.tip.rotation.y = seconds * 1.1;
    world.cars?.update(seconds);
    for (const l of world.landmarks.values()) l.tick?.(seconds);
  };

  world.render = () => {
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  };

  world.resize = (w, h) => {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labelRenderer.setSize(w, h);
  };

  return world;
}
