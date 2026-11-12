// The 3D town, shared by the website (city.js) and the video renderer (video.js).
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export { THREE, CSS2DObject };

// ---------- Layout constants ----------
export const FLOOR_H = 1.2;
export const LOT = 6;
export const BLOCK = LOT * 2;   // 2x2 plots per block, so every plot touches a road
export const ROAD = 4;
export const PITCH = BLOCK + ROAD;
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

/** Square spiral: 0 -> (0,0), 1 -> (1,0), 2 -> (1,1), 3 -> (0,1), ... */
function spiral(n) {
  if (n === 0) return [0, 0];
  const k = Math.ceil((Math.sqrt(n + 1) - 1) / 2);
  let t = 2 * k + 1;
  let m = t * t;
  t -= 1;
  if (n >= m - t) return [k - (m - n), -k];
  m -= t;
  if (n >= m - t) return [-k, -k + (m - n)];
  m -= t;
  if (n >= m - t) return [-k + (m - n), k];
  return [k, k - (m - n - t)];
}
const LOT_OFFSETS = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [(x * LOT) / 2, (z * LOT) / 2]);

/** Plot index (0-based) -> world position. Block 0 is the town square. */
export function plotPosition(i) {
  const [bx, bz] = spiral(Math.floor(i / 4) + 1);
  const [ox, oz] = LOT_OFFSETS[i % 4];
  return new THREE.Vector3(bx * PITCH + ox, 0, bz * PITCH + oz);
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
    return { group, body, height: h };
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
    entry.shownFloors = floors;
    entry.outer.add(b.group);
    world.pickables.push(b.body);
    if (entry.label) entry.label.position.y = entry.roofTop + 1.6;
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

    // Lawn on every plot so houses sit in little gardens
    const lawnGeo = new THREE.BoxGeometry(LOT - 0.8, 0.05, LOT - 0.8).translate(0, 0.27, 0);
    const lawns = new THREE.InstancedMesh(lawnGeo, new THREE.MeshStandardMaterial({ color: '#a3c784', roughness: 1 }), (ringBlocks - 1) * 4);
    lawns.receiveShadow = true;
    for (let p = 0; p < (ringBlocks - 1) * 4; p++) {
      const pos = plotPosition(p);
      lawns.setMatrixAt(p, m.makeTranslation(pos.x, 0, pos.z));
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

    // Trees on plots nobody lives on yet
    const used = world.city.residents.length;
    const treePlots = [];
    for (let p = used; p < (ringBlocks - 1) * 4; p++) treePlots.push(plotPosition(p));
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
  world.build = (city, { labelTop = 5 } = {}) => {
    world.city = city;
    const blocks = Math.ceil(city.residents.length / 4);
    const ringBlocks = Math.pow(Math.ceil(Math.sqrt(blocks + 1)) + 2, 2);
    const ring = Math.ceil(Math.sqrt(blocks + 1)) + 1;
    world.radius = (ring * PITCH) / 2 + PITCH;

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
