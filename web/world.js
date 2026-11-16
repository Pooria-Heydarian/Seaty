// The 3D town, shared by the website (city.js) and the video renderer (video.js).
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export { THREE, CSS2DObject };

import { LOT, BLOCK, ROAD, PITCH, LOT_OFFSETS, createCityLayout } from './layout.js';
import { createHouseKit } from './houses.js';
import { cleanHouseRecipe, NEIGHBOURHOODS } from './catalog.js';
import { createExtraModels } from './extra-models.js';
export { LOT, BLOCK, PITCH };

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
    townHall: null, cars: null, night: false, customEntries: [], upgradeTicks: [],
  };
  // Materials that glow differently by day and night (custom houses register theirs here).
  const nightMats = [];
  const houseKit = createHouseKit({
    windows: { map: mat.side[0].map, emissiveMap: mat.side[0].emissiveMap },
    FOOT, FLOOR_H, TEX_FLOORS,
    nightMat: (m, day, night) => {
      nightMats.push({ m, day, night });
      m.emissiveIntensity = world.night ? night : day;
    },
  });

  // ----- Buildings -----
  function makeBuilding(entry, floors) {
    if (entry.recipe && entry.useCustom) {
      const b = houseKit.build(entry.recipe, floors);
      b.body.userData.entry = entry;
      return b;
    }
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
    const custom = Boolean(entry.recipe && entry.useCustom);
    const key = `${custom ? 'c' : 'n'}${floors}`;
    if (entry.shownKey === key) return;
    if (entry.inner) {
      entry.outer.remove(entry.inner);
      const i = world.pickables.indexOf(entry.body);
      if (i >= 0) world.pickables.splice(i, 1);
    }
    entry.cache ||= new Map();
    if (!entry.cache.has(key)) entry.cache.set(key, makeBuilding(entry, floors));
    const b = entry.cache.get(key);
    entry.inner = b.group;
    entry.body = b.body;
    entry.height = b.height;
    entry.roofTop = b.roofTop;
    entry.tick = b.tick || null;
    entry.shownFloors = floors;
    entry.shownKey = key;
    b.group.position.x = entry.upgrades?.has('pool') ? -0.8 : 0; // make room for the pool
    entry.outer.add(b.group);
    world.pickables.push(b.body);
    if (entry.label) entry.label.position.y = entry.roofTop + 1.6;
  };

  /** Switch a resident between their custom house and the normal one (the video uses this for the reveal). */
  world.setCustom = (entry, on) => {
    if (!entry.recipe || entry.useCustom === on) return;
    entry.useCustom = on;
    world.setFloors(entry, entry.shownFloors);
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
  /** A material that glows a little by day and more at night. */
  const glow = (color, day = 0.5, night = 2) => {
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: world.night ? night : day, roughness: 0.4 });
    nightMats.push({ m, day, night });
    return m;
  };
  const EXTRA = createExtraModels({ THREE, M, mat, FLOOR_H, glow, shadowAll });

  /** Spaghetti Factory: sawtooth-roof hall, striped chimney with steam, giant spaghetti plate on the roof. */
  function spaghettiFactory(def, floors = 1) {
    const root = new THREE.Group();
    const dy = (floors - 1) * FLOOR_H; // each floor of its owner makes the hall one floor taller
    const hall = new THREE.Mesh(new THREE.BoxGeometry(9.5, 4.2 + dy, 7).translate(0, (4.2 + dy) / 2, 0), SPECIAL_MAT.cream);
    root.add(hall);
    // windows along the front (one row per floor) + big door
    for (let f = 0; f < floors; f++) {
      for (let i = 0; i < 4; i++) {
        root.add(new THREE.Mesh(new THREE.BoxGeometry(1.3, f ? 0.8 : 1.4, 0.1).translate(-3.6 + i * 2.4, f ? 3.6 + (f - 0.5) * FLOOR_H : 2.6, 3.52), SPECIAL_MAT.glass));
      }
    }
    root.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.12).translate(0, 1.3, 3.54), SPECIAL_MAT.dark));
    // everything on the roof sits on the top floor
    const g = new THREE.Group();
    g.position.y = dy;
    root.add(g);
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
    shadowAll(root);
    puffs.forEach((p) => (p.castShadow = false));
    root.userData.tick = (t) => {
      puffs.forEach((p, i) => {
        const k = (t * 0.35 + i / puffs.length) % 1;
        p.position.set(3.6 + k * 1.2, 11.4 + k * 4, -2.4 - k * 0.6);
        p.scale.setScalar(0.5 + k * 1.3);
      });
      noodles.rotation.z = t * 0.6;
    };
    return { group: root, body: hall, height: 9.5 + dy };
  }

  /** Fallback for landmark types without their own model yet: a hall with a gold dome, one floor per floor of its owner. */
  function genericLandmark(def, floors = 1) {
    const g = new THREE.Group();
    const bh = 3.5 + (floors - 1) * FLOOR_H;
    // Each hall gets its own colours (from its name), so a street of halls doesn't look the same.
    const WALLS = ['#f3e3c3', '#e8d5e8', '#d6e6f2', '#e3efd6', '#f6d7c3', '#efe9b8', '#dfe3e8'];
    const DOMES = [mat.gold, M('#2f8f83', { roughness: 0.35, metalness: 0.2 }), M('#c8553d', { roughness: 0.5 }), M('#3a5ba0', { roughness: 0.4, metalness: 0.2 }), M('#7a5cff', { roughness: 0.4 })];
    const h = hashId(def.name || def.id || '');
    const base = new THREE.Mesh(new THREE.BoxGeometry(8, bh, 6).translate(0, bh / 2, 0), def.color ? M(def.color) : M(WALLS[h % WALLS.length]));
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, bh, 0), def.accent ? M(def.accent) : DOMES[(h >>> 3) % DOMES.length]);
    g.add(base, dome);
    for (let i = 0; i < 4; i++) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 3.5, 12).translate(-3 + i * 2, 1.75, 3.2), SPECIAL_MAT.white));
    // a row of windows for every floor above the porch
    for (let f = 1; f < floors; f++) {
      for (const x of [-2.6, 0, 2.6]) g.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.1).translate(x, 3.5 + (f - 0.5) * FLOOR_H, 3.02), SPECIAL_MAT.glass));
    }
    shadowAll(g);
    return { group: g, body: base, height: bh + 2.5 };
  }
  const LANDMARK_MODELS = { 'spaghetti-factory': spaghettiFactory, ...EXTRA.landmarks };

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
  /** Cat: an orange tabby sitting in the front yard (right of the door), tail swishing. */
  function cat() {
    const fur = M('#e8913a');
    const stripe = M('#b8642a');
    const dark = M('#3b2a1f');
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10), fur);
    body.scale.set(0.85, 1.05, 1);
    body.position.y = 0.32;
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), M('#f6e3c8'));
    chest.position.set(0, 0.36, 0.22);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), fur);
    head.position.set(0, 0.74, 0.08);
    g.add(body, chest, head);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), fur);
      ear.position.set(s * 0.12, 0.95, 0.06);
      ear.rotation.z = -s * 0.25;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), dark);
      eye.position.set(s * 0.08, 0.78, 0.28);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M('#f6e3c8'));
      paw.position.set(s * 0.1, 0.05, 0.27);
      g.add(ear, eye, paw);
    }
    for (let i = 0; i < 3; i++) {
      const st = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 6, 20, Math.PI), stripe);
      st.position.set(0, 0.42 + i * 0.1, -0.02);
      st.rotation.set(0, Math.PI / 2, 0);
      g.add(st);
    }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), M('#d9667a'));
    nose.position.set(0, 0.72, 0.3);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 18, Math.PI * 0.9), fur);
    tail.position.set(0, 0.3, -0.28);
    tail.rotation.y = Math.PI / 2;
    g.add(nose, tail);
    shadowAll(g);
    g.position.set(1.75, 0.27, 2.55);
    g.scale.setScalar(0.85);
    g.userData.tick = (t) => { tail.rotation.x = Math.sin(t * 2.4) * 0.35; };
    return g;
  }
  const UPGRADE_MODELS = { pool, 'apple-tree': appleTree, capybara, cat, ...EXTRA.upgrades };

  world.landmarks = new Map();
  /** Adds landmarks and house upgrades from data/specials.json. Call after build(). */
  world.addSpecials = (specials) => {
    const norm = (s) => String(s || '').trim().replace(/^@/, '').toLowerCase();
    (specials?.landmarks || []).forEach((def) => {
      const spot = world.layout?.spots.get(def.id);
      if (!spot) return;
      // A landmark belongs to the person who asked for it and has as many floors as they do.
      const owner = world.list.find((e) => e.resident.id === def.requestedById || (def.requestedBy && norm(e.resident.name) === norm(def.requestedBy)));
      const floors = Math.max(1, owner?.resident.floors || 1);
      const made = (LANDMARK_MODELS[def.type] || genericLandmark)(def, floors);
      // size by use: S = a house lot (x0.5), M = a block, L = 2 x 2 blocks (x2)
      made.group.scale.setScalar(spot.scale);
      made.height *= spot.scale;
      const outer = new THREE.Group();
      const inCity = Math.max(Math.abs(spot.x), Math.abs(spot.z)) <= (world.layout.cityR + 0.5) * PITCH;
      outer.position.set(spot.x, inCity ? 0.25 : 0.02, spot.z); // on the pavement in town, on the grass outside
      outer.rotation.y = spot.rot;
      outer.add(made.group);
      scene.add(outer);
      const el = document.createElement('div');
      el.className = 'label landmark';
      el.textContent = def.name;
      const by = document.createElement('small');
      by.textContent = `${def.requestedBy ? `by @${String(def.requestedBy).replace(/^@/, '')} · ` : ''}${floors} floor${floors === 1 ? '' : 's'}`;
      el.appendChild(by);
      const label = new CSS2DObject(el);
      label.position.set(0, made.height + 2.5, 0);
      outer.add(label);
      const lm = { def, outer, height: made.height, label, floors, owner, body: made.body, tick: made.group.userData.tick, district: spot.district, size: spot.size };
      if (made.body) {
        made.body.userData.landmark = lm;
        world.pickables.push(made.body);
      }
      world.landmarks.set(def.id, lm);
    });
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
      if (obj.userData.tick) world.upgradeTicks.push(obj.userData.tick);
      const shown = entry.shownFloors;
      entry.shownKey = null;
      world.setFloors(entry, shown); // re-place the house (pool shifts it)
    }
    // Custom houses: the latest design per resident wins.
    for (const h of specials?.houses || []) {
      const who = norm(h.resident);
      const entry = world.list.find((e) => e.resident.id === h.resident || norm(e.resident.name) === who);
      const recipe = cleanHouseRecipe(h.recipe);
      if (!entry || !recipe) continue;
      if (!entry.recipe) world.customEntries.push(entry);
      entry.recipe = recipe;
      entry.houseTitle = h.title || '';
      entry.useCustom = true;
      entry.cache?.clear();
      entry.shownKey = null;
      world.setFloors(entry, entry.shownFloors);
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

  // ----- Ground, roads, trees (drawn from the city plan in layout.js) -----
  function buildGround(L) {
    const R = L.cityR;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const v = (x, y, z) => new THREE.Vector3(x, y, z);
    const at = (x, z, sx = 1, sz = 1, rot = 0) => new THREE.Matrix4().compose(v(x, 0, z), new THREE.Quaternion().setFromAxisAngle(up, rot), v(sx, 1, sz));
    const flat = (geo, color, list) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1 }), list.length);
      list.forEach((mat4, i) => im.setMatrixAt(i, mat4));
      im.receiveShadow = true;
      scene.add(im);
    };

    // grass everywhere; roads and pavement only around the blocks that are built (the city grows organically)
    const outer = (L.outerR * 2 + 10) * PITCH;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(outer, outer), new THREE.MeshStandardMaterial({ color: '#8fb46e', roughness: 1 }));
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.02;
    grass.receiveShadow = true;
    scene.add(grass);
    const byKey = new Map(L.blocks.map((b) => [`${b.x},${b.z}`, b]));
    const BUILT = new Set(['square', 'civic-empty', 'homes', 'park', 'promenade', 'main-empty']);
    const isBuilt = (x, z) => {
      const b = byKey.get(`${x},${z}`);
      if (!b) return false;
      if (b.kind === 'landmark') return Math.max(Math.abs(x), Math.abs(z)) <= R;
      if (b.kind === 'boulevard') { // a boulevard runs as far as the houses along it
        const side = x === 0 ? [[-1, z], [1, z]] : [[x, -1], [x, 1]];
        return side.some(([sx, sz]) => { const n = byKey.get(`${sx},${sz}`); return n && ['homes', 'park', 'landmark', 'civic-empty'].includes(n.kind); });
      }
      return BUILT.has(b.kind);
    };
    const built = L.blocks.filter((b) => isBuilt(b.x, b.z));
    world.builtBlocks = built;
    const roads = built.map((b) => at(b.x * PITCH, b.z * PITCH, PITCH / BLOCK, PITCH / BLOCK));

    const pads = [], pavers = [], lotLawns = [], blockLawns = [], paths = [], benches = [], trees = [], lamps = [];
    const r = rng(7);
    const tree = (x, z, s = 1, y = 0.25) => trees.push([x, z, s * (0.75 + r() * 0.5), y]);
    for (const b of L.blocks) {
      const cx = b.x * PITCH, cz = b.z * PITCH;
      const here = isBuilt(b.x, b.z);
      if (here && b.kind !== 'promenade') pads.push(at(cx, cz));
      if (!here && (b.kind === 'lawn' || b.kind === 'boulevard')) { // open meadow until the neighbourhood grows here
        if (r() < 0.6) tree(cx + (r() - 0.5) * 10, cz + (r() - 0.5) * 10, 1.1, 0);
        continue;
      }
      switch (b.kind) {
        case 'homes':
          b.lots.forEach((lot, j) => {
            const [ox, oz] = LOT_OFFSETS[j];
            lotLawns.push(at(cx + ox, cz + oz));
            if (lot !== 'house') { tree(cx + ox - 1, cz + oz - 0.8); tree(cx + ox + 1.1, cz + oz + 0.9, 0.8); } // garden or empty lot
          });
          break;
        case 'park': {
          blockLawns.push(at(cx, cz));
          paths.push(at(cx, cz, 1, 0.12), at(cx, cz, 0.12, 1));
          benches.push([cx - 2.2, cz + 0.9, 0], [cx + 2.2, cz - 0.9, Math.PI]);
          const shopLots = b.lots.map((l, j) => (l === 'shop' ? j : -1)).filter((j) => j >= 0);
          LOT_OFFSETS.forEach(([ox, oz], j) => {
            if (!shopLots.includes(j)) { tree(cx + ox * 1.25, cz + oz * 1.25, 1.1); tree(cx + ox * 0.55, cz + oz * 0.25, 0.8); }
          });
          break;
        }
        case 'lawn':
        case 'civic-empty':
        case 'main-empty':
          blockLawns.push(at(cx, cz));
          LOT_OFFSETS.forEach(([ox, oz]) => tree(cx + ox + (r() - 0.5) * 2, cz + oz + (r() - 0.5) * 2));
          break;
        case 'promenade':
          // Main Street: a paved walk with lamps on both sides and trees down the middle
          pavers.push(at(cx, cz, (PITCH + 0.01) / BLOCK, 1));
          for (const dx of [-5, 0, 5]) lamps.push([cx + dx, cz - 4.6], [cx + dx, cz + 4.6]);
          for (const dx of [-2.6, 2.6]) tree(cx + dx, cz, 0.7);
          benches.push([cx - 5, cz - 1.6, 0], [cx + 5, cz + 1.6, Math.PI]);
          break;
        case 'boulevard': {
          // tree-lined boulevard: lawn median with two rows of trees and lamps along the axis
          const alongZ = b.x === 0;
          blockLawns.push(at(cx, cz, alongZ ? 0.5 : 1, alongZ ? 1 : 0.5));
          for (const t of [-4.5, -1.5, 1.5, 4.5]) {
            if (alongZ) { tree(cx - 3.8, cz + t, 0.9); tree(cx + 3.8, cz + t, 0.9); }
            else { tree(cx + t, cz - 3.8, 0.9); tree(cx + t, cz + 3.8, 0.9); }
          }
          for (const t of [-3, 3]) lamps.push(alongZ ? [cx, cz + t] : [cx + t, cz]);
          break;
        }
        case 'belt':
          for (let k = 0; k < 3; k++) tree(cx + (r() - 0.5) * 10, cz + (r() - 0.5) * 10, 1.1, 0);
          break;
        case 'meadow':
          if (r() < 0.5) tree(cx + (r() - 0.5) * 10, cz + (r() - 0.5) * 10, 1.2, 0);
          break;
      }
    }
    flat(new THREE.BoxGeometry(BLOCK, 0.02, BLOCK).translate(0, 0.01, 0), '#6f7782', roads);
    flat(new THREE.BoxGeometry(BLOCK, 0.25, BLOCK).translate(0, 0.125, 0), '#d9d6cf', pads);
    flat(new THREE.BoxGeometry(BLOCK, 0.22, BLOCK).translate(0, 0.11, 0), '#eadfca', pavers);
    flat(new THREE.BoxGeometry(LOT - 0.8, 0.05, LOT - 0.8).translate(0, 0.27, 0), '#a3c784', lotLawns);
    flat(new THREE.BoxGeometry(BLOCK - 0.6, 0.05, BLOCK - 0.6).translate(0, 0.27, 0), '#9cc77d', blockLawns);
    flat(new THREE.BoxGeometry(BLOCK - 0.6, 0.03, BLOCK - 0.6).translate(0, 0.3, 0), '#e2d6bd', paths);

    if (benches.length) {
      const seat = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.1, 0.4).translate(0, 0.62, 0), new THREE.MeshStandardMaterial({ color: '#7b5a3c' }), benches.length);
      benches.forEach(([x, z, rot], i) => seat.setMatrixAt(i, at(x, z, 1, 1, rot)));
      scene.add(seat);
    }
    if (lamps.length) {
      // street lamps (glow at night)
      const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.08, 2.6, 6).translate(0, 1.55, 0), new THREE.MeshStandardMaterial({ color: '#3b4552' }), lamps.length);
      const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 10, 8).translate(0, 2.9, 0), glow('#ffe7a8', 0.05, 2.6), lamps.length);
      lamps.forEach(([x, z], i) => { pole.setMatrixAt(i, at(x, z)); head.setMatrixAt(i, at(x, z)); });
      scene.add(pole, head);
    }

    // road markings: along every edge of a built block (each edge once)
    world.roadSpan = R + 1;
    const dashGeo = new THREE.PlaneGeometry(0.25, 1.6).rotateX(-Math.PI / 2);
    const dashPositions = [];
    const edges = new Set();
    for (const b of built) {
      const cx = b.x * PITCH, cz = b.z * PITCH, h = PITCH / 2;
      for (const [ex, ez, alongX] of [[cx + h, cz, false], [cx - h, cz, false], [cx, cz + h, true], [cx, cz - h, true]]) {
        const k = `${ex},${ez}`;
        if (edges.has(k)) continue;
        edges.add(k);
        for (let s = -h + 2; s < h; s += 4) dashPositions.push(alongX ? [ex + s, ez, Math.PI / 2] : [ex, ez + s, 0]);
      }
    }
    const dashes = new THREE.InstancedMesh(dashGeo, new THREE.MeshBasicMaterial({ color: '#f1efe6' }), dashPositions.length);
    dashPositions.forEach(([x, z, rot], i) => dashes.setMatrixAt(i, new THREE.Matrix4().compose(v(x, 0.03, z), new THREE.Quaternion().setFromAxisAngle(up, rot), v(1, 1, 1))));
    scene.add(dashes);

    // trees
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.15, 0.2, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#7b5a3c' }), Math.max(1, trees.length));
    const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.1, 0).translate(0, 1.9, 0), new THREE.MeshStandardMaterial({ color: '#5f9a4e', flatShading: true }), Math.max(1, trees.length));
    crowns.castShadow = true;
    trunks.count = crowns.count = trees.length;
    trees.forEach(([x, z, s, y], i) => {
      m.compose(v(x, y, z), q.identity(), v(s, s, s));
      trunks.setMatrixAt(i, m);
      crowns.setMatrixAt(i, m);
    });
    scene.add(trunks, crowns);
  }

  // ----- Cars (only on streets that exist: between built blocks) -----
  function buildCars() {
    const built = new Set((world.builtBlocks || []).map((b) => `${b.x},${b.z}`));
    const has = (x, z) => built.has(`${x},${z}`);
    // every street line with the stretch of built blocks along it
    const streets = [];
    const span = world.roadSpan + 2;
    for (let g = -span; g < span; g++) {
      for (const alongX of [true, false]) {
        const cells = [];
        for (let s = -span; s <= span; s++) if (alongX ? has(s, g) || has(s, g + 1) : has(g, s) || has(g + 1, s)) cells.push(s);
        if (cells.length < 2) continue;
        streets.push({ alongX, line: g * PITCH + PITCH / 2, from: (Math.min(...cells) - 0.5) * PITCH, to: (Math.max(...cells) + 0.5) * PITCH });
      }
    }
    const count = Math.min(80, streets.length * 2);
    const bodyGeo = new THREE.BoxGeometry(1.7, 0.6, 0.95).translate(0, 0.45, 0);
    const cabGeo = new THREE.BoxGeometry(0.9, 0.45, 0.85).translate(-0.1, 0.95, 0);
    const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.5 }), Math.max(1, count));
    const cabs = new THREE.InstancedMesh(cabGeo, new THREE.MeshStandardMaterial({ color: '#dfe8f0', roughness: 0.3 }), Math.max(1, count));
    bodies.count = cabs.count = count;
    bodies.castShadow = true;
    const colors = ['#e4572e', '#2e86ab', '#f3a712', '#ffffff', '#29335c', '#669bbc', '#c1121f'];
    const r = rng(11);
    const cars = [];
    for (let i = 0; i < count; i++) {
      const st = streets[Math.floor(r() * streets.length)];
      cars.push({ ...st, dir: r() < 0.5 ? 1 : -1, speed: 4 + r() * 4, offset: r() });
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
          const len = c.to - c.from;
          const k = ((((c.offset * len + c.dir * c.speed * t) % len) + len) % len);
          const s = c.from + k;
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

  // ----- Airship: circles over the city with the channel's newest video on its sides -----
  // (web/data/latest-video.json + .jpg, written by scripts/latest-video.mjs after every fetch)
  function buildAirship() {
    const A = 13, B = 5; // envelope half-length and radius
    const ship = new THREE.Group(); // nose points along +x
    const white = new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.55 });
    const orange = new THREE.MeshStandardMaterial({ color: '#ff7a45', roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2b3340', roughness: 0.5, metalness: 0.2 });

    const envelope = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), white);
    envelope.scale.set(A, B, B);
    ship.add(envelope);
    // orange nose cap and a band round the tail
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, 0.55), orange);
    nose.rotation.z = -Math.PI / 2;
    nose.scale.set(B * 1.01, A * 1.004, B * 1.01);
    ship.add(nose);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 40, 1, true), orange);
    band.rotation.z = Math.PI / 2;
    const bx = -A * 0.62, br = B * Math.sqrt(1 - (bx / A) ** 2) * 1.015;
    band.position.x = bx;
    band.scale.set(br, 1, br);
    ship.add(band);
    // four tail fins
    for (let k = 0; k < 4; k++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3, 0.3), orange);
      const g = new THREE.Group();
      fin.position.set(-A * 0.82, B * 0.62 + 1.2, 0);
      g.add(fin);
      g.rotation.x = (k * Math.PI) / 2 + Math.PI / 4;
      ship.add(g);
    }
    // gondola with lit windows and two propellers
    const gondola = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.5, 2.2), dark);
    gondola.position.y = -B - 0.5;
    ship.add(gondola);
    const win = glow('#ffe7a8', 0.3, 2.2);
    for (const z of [1.11, -1.11]) for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), win);
      w.position.set(-1.8 + i * 1.2, -B - 0.4, z);
      if (z < 0) w.rotation.y = Math.PI;
      ship.add(w);
    }
    const props = [];
    for (const z of [1.9, -1.9]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.4), dark);
      arm.position.set(-2.4, -B - 0.4, z * 0.8);
      const hub = new THREE.Group();
      hub.position.set(-3, -B - 0.4, z);
      for (let k = 0; k < 3; k++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.35), dark);
        blade.position.y = 0.9;
        const bg = new THREE.Group();
        bg.rotation.x = (k * Math.PI * 2) / 3;
        bg.add(blade);
        hub.add(bg);
      }
      props.push(hub);
      ship.add(arm, hub);
    }
    // navigation lights: red on the left, green on the right, white at the tail
    const navs = [['#ff3b3b', 0, B * 0.98], ['#3bff6e', 0, -B * 0.98], ['#ffffff', -A * 0.99, 0]].map(([c, x, z]) => {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), glow(c, 0.8, 3));
      l.position.set(x, 0.3, z);
      ship.add(l);
      return l;
    });

    // the screens: canvas texture laid on the curve of the envelope, one on each side
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 576;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    const screenMat = new THREE.MeshStandardMaterial({ color: '#000', map: tex, emissive: '#ffffff', emissiveMap: tex, roughness: 0.35 });
    const screenGlow = { m: screenMat, day: 0.9, night: 1.1 };
    screenMat.emissiveIntensity = world.night ? screenGlow.night : screenGlow.day;
    nightMats.push(screenGlow);
    const info = { url: '', title: '', video: null };
    const SW = 12, SH = 6.75;
    for (const side of [1, -1]) {
      const geo = new THREE.PlaneGeometry(SW, SH, 24, 12);
      if (side < 0) geo.rotateY(Math.PI);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i) + 0.4;
        const d = 1 - (x / A) ** 2 - (y / B) ** 2;
        p.setXYZ(i, x, y, side * (Math.sqrt(Math.max(0, d)) * B + 0.06));
      }
      geo.computeVertexNormals();
      const screen = new THREE.Mesh(geo, screenMat);
      screen.userData.airship = info;
      world.pickables.push(screen);
      ship.add(screen);
    }
    envelope.userData.airship = info;
    world.pickables.push(envelope);

    shadowAll(ship);
    for (const s of ship.children) if (s.material === screenMat) s.castShadow = false;
    ship.scale.setScalar(0.8);
    const holder = new THREE.Group(); // turns and moves the ship along its route
    holder.add(ship);
    scene.add(holder);

    // route: a slow circle over the city, above the tallest buildings
    const tallest = Math.max(12, ...world.city.residents.map((r) => r.floors * FLOOR_H + 6));
    const radius = Math.max(28, world.radius * 0.5);
    const height = Math.max(44, tallest + 28);
    const speed = 3.2; // world units per second
    const start = Math.PI * 1.25; // starts behind the city as seen from the opening camera
    const tick = (t) => {
      const a = start + (t * speed) / radius;
      holder.position.set(Math.sin(a) * radius, height + Math.sin(t * 0.5) * 0.8, Math.cos(a) * radius);
      holder.rotation.y = a; // nose along the direction of travel, screens facing in and out
      ship.rotation.z = Math.sin(t * 0.35) * 0.025;
      for (const p of props) p.rotation.x = t * 14;
      const blink = (t % 1.6) < 0.25;
      for (const l of navs) l.visible = !world.night || blink || l === navs[0] || l === navs[1];
    };
    tick(0);

    const draw = (img) => {
      const g = cv.getContext('2d');
      const font = (w, px) => `${w} ${px}px Inter, "Segoe UI", system-ui, sans-serif`;
      g.fillStyle = '#0b1220';
      g.fillRect(0, 0, 1024, 576);
      const top = 84, bottom = 80, ih = 576 - top - bottom;
      if (img) {
        // blurred fill behind, the whole thumbnail in front (works for Shorts and normal videos)
        const cover = Math.max(1024 / img.width, ih / img.height), contain = Math.min(1024 / img.width, ih / img.height);
        g.save();
        g.beginPath(); g.rect(0, top, 1024, ih); g.clip();
        g.filter = 'blur(18px) brightness(0.6)';
        g.drawImage(img, (1024 - img.width * cover) / 2, top + (ih - img.height * cover) / 2, img.width * cover, img.height * cover);
        g.filter = 'none';
        g.drawImage(img, (1024 - img.width * contain) / 2, top + (ih - img.height * contain) / 2, img.width * contain, img.height * contain);
        g.restore();
      } else {
        g.fillStyle = '#1b2a44';
        g.fillRect(0, top, 1024, ih);
        g.fillStyle = '#fff';
        g.textAlign = 'center';
        g.font = font(900, 130);
        g.fillText('SEATY', 512, top + ih / 2 + 45);
      }
      g.fillStyle = '#e63946';
      g.fillRect(0, 0, 1024, top);
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.font = font(900, 60);
      g.fillText(info.url ? '▶ NEW VIDEO' : 'SEATY CITY', 512, 64);
      g.fillStyle = '#ffd23f';
      g.fillRect(0, 576 - bottom, 1024, bottom);
      g.fillStyle = '#0b1220';
      g.font = font(900, 46);
      g.fillText(info.url ? 'Comment on it for +1 floor!' : 'Comment to get a house!', 512, 576 - 24);
      tex.needsUpdate = true;
    };
    draw(null);
    const ready = fetch('data/latest-video.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((video) => {
        if (!video?.id) return;
        Object.assign(info, { video, title: video.title, url: `https://www.youtube.com/watch?v=${video.id}` });
        if (!video.thumb) return draw(null);
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { draw(img); resolve(); };
          img.onerror = () => { draw(null); resolve(); };
          img.src = `${video.thumb}?v=${encodeURIComponent(video.id)}`;
        });
      })
      .catch(() => {});
    world.airship = { group: holder, info, tick, ready };
  }

  /** Build the whole town from city.json data (positions come from the city plan in layout.js). */
  world.build = (city, { labelTop = 5, specials = null } = {}) => {
    world.city = city;
    world.specials = specials;
    // each resident's current design (it decides their neighbourhood) and since when they have it
    const norm = (s) => String(s || '').trim().replace(/^@/, '').toLowerCase();
    const design = new Map();
    for (const h of specials?.houses || []) {
      const r = city.residents.find((x) => x.id === h.resident || norm(x.name) === norm(h.resident));
      if (r) design.set(r.id, { recipe: cleanHouseRecipe(h.recipe), since: h.added || '' });
    }
    const L = createCityLayout(
      city.residents.map((r) => ({ id: r.id, recipe: design.get(r.id)?.recipe || null, styleSince: design.get(r.id)?.since || '' })),
      specials?.landmarks || [],
    );
    world.layout = L;
    world.radius = (L.cityR + 1.5) * PITCH; // the city itself (camera framing)
    world.extent = (L.outerR + 1) * PITCH; // city + green belt + outskirts (ground, shadows)

    buildGround(L);
    buildCars();
    buildTownHall();

    const ranked = [...city.residents].sort((a, b) => b.floors - a.floors || a.joined.localeCompare(b.joined));
    const rankOf = new Map(ranked.map((r, i) => [r.id, i + 1]));
    city.residents.forEach((resident, i) => {
      const hash = hashId(resident.id);
      const home = L.homes.get(resident.id);
      const outer = new THREE.Group();
      outer.position.set(home.x, 0, home.z);
      outer.rotation.y = home.rot; // every house faces its street
      scene.add(outer);
      const entry = { resident, plot: i + 1, rank: rankOf.get(resident.id), hash, outer, neighbourhood: NEIGHBOURHOODS[home.style] };
      world.setFloors(entry, resident.floors);
      world.entries.set(resident.id, entry);
      world.list.push(entry);
      if (entry.rank <= labelTop) world.addLabel(entry);
    });
    if (specials) world.addSpecials(specials);
    buildAirship();

    // Light, shadows and fog sized to the whole map
    const R = world.extent;
    const d = Math.max(60, world.radius * 1.6);
    scene.fog = new THREE.Fog(0xbcd8ee, Math.max(d * 1.6, R * 1.2), Math.max(d * 5, R * 3));
    sun.position.set(R * 0.6 + 40, R + 80, R * 0.3 + 30);
    const s = R + PITCH;
    Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: R * 4 + 300 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(4096, 4096);
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
    for (const n of nightMats) n.m.emissiveIntensity = on ? n.night : n.day;
    mat.gold.emissiveIntensity = on ? 0.8 : 0.2;
  };

  world.tick = (seconds) => {
    if (world.townHall) world.townHall.userData.tip.rotation.y = seconds * 1.1;
    world.cars?.update(seconds);
    for (const l of world.landmarks.values()) l.tick?.(seconds);
    for (const e of world.customEntries) e.tick?.(seconds);
    for (const f of world.upgradeTicks) f(seconds);
    world.airship?.tick(seconds);
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
