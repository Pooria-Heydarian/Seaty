import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ---------- City layout constants ----------
const FLOOR_H = 1.2;        // height of one floor
const LOT = 6;              // a plot of land
const BLOCK = LOT * 2;      // a block = 2x2 plots (every plot touches a road)
const ROAD = 4;
const PITCH = BLOCK + ROAD; // distance between block centers
const FOOT = 4.2;           // building footprint
const TEX_FLOORS = 4;       // floors drawn in one window texture tile
const LABEL_TOP = 5;        // how many tallest towers get floating name tags

const PALETTE = ['#e9d8c4', '#cfd8e3', '#f2c6b4', '#c9dfc9', '#e8e2b0', '#d7cde8', '#f0d2d8', '#bcd3df'];

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

// ---------- Renderer / scene ----------
const container = $('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
Object.assign(labelRenderer.domElement.style, { position: 'absolute', top: '0', pointerEvents: 'none' });
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.5, 4000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 8;
controls.autoRotateSpeed = 0.6;

const hemi = new THREE.HemisphereLight(0xffffff, 0x8a9a7a, 1.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dd, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

// ---------- Textures ----------
function rng(seed) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** One tile = 3 windows wide x TEX_FLOORS floors tall. Returns [colorMap, glowMap]. */
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
    wall.fillStyle = '#e6e6e6';
    wall.fillRect(0, f * 64 + 60, W, 4); // floor slab line
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

const sideMaterials = PALETTE.map((color, i) => {
  const [map, emissiveMap] = windowTextures(i * 97 + 7);
  return new THREE.MeshStandardMaterial({ color, map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.85 });
});
const roofMaterials = PALETTE.map((c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.72), roughness: 0.95 }));
const goldRoof = new THREE.MeshStandardMaterial({ color: '#f5b82e', metalness: 0.6, roughness: 0.35, emissive: '#7a4a00', emissiveIntensity: 0.2 });
const detailMat = new THREE.MeshStandardMaterial({ color: '#8d96a3', roughness: 0.8 });

// ---------- Helpers for the layout ----------
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

/** Plot index -> world position. Block 0 is the town square. */
function plotPosition(i) {
  const [bx, bz] = spiral(Math.floor(i / 4) + 1);
  const [ox, oz] = LOT_OFFSETS[i % 4];
  return new THREE.Vector3(bx * PITCH + ox, 0, bz * PITCH + oz);
}

// ---------- State ----------
let city = null;
const buildings = [];      // { resident, group, body, plot, rank }
const byId = new Map();
const pickables = [];
let selected = null;
let selectionOutline = null;
let selectionLabel = null;
let night = false;
const anims = [];          // { group, t0, dur, delay }

// ---------- Build the world ----------
function buildGround(blockCount, radius) {
  const size = radius * 2 + PITCH * 6;
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: '#6f7782', roughness: 1 }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.receiveShadow = true;
  scene.add(asphalt);

  // Grass beyond the city edge
  const grass = new THREE.Mesh(
    new THREE.RingGeometry(size * 0.5, size * 4, 64),
    new THREE.MeshStandardMaterial({ color: '#8fb46e', roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.02;
  scene.add(grass);

  // Sidewalk pads for each block (+ a ring of empty blocks around the edge)
  const padGeo = new THREE.BoxGeometry(BLOCK, 0.25, BLOCK);
  padGeo.translate(0, 0.125, 0);
  const totalBlocks = blockCount + 1;
  const ringBlocks = Math.pow(Math.ceil(Math.sqrt(totalBlocks)) + 2, 2);
  const pads = new THREE.InstancedMesh(padGeo, new THREE.MeshStandardMaterial({ color: '#d9d6cf', roughness: 1 }), ringBlocks);
  pads.receiveShadow = true;
  const m = new THREE.Matrix4();
  for (let b = 0; b < ringBlocks; b++) {
    const [bx, bz] = spiral(b);
    m.makeTranslation(bx * PITCH, 0, bz * PITCH);
    pads.setMatrixAt(b, m);
  }
  scene.add(pads);

  // Road centre dashes
  const dashGeo = new THREE.PlaneGeometry(0.25, 1.6);
  dashGeo.rotateX(-Math.PI / 2);
  const span = Math.ceil(Math.sqrt(ringBlocks)) + 1;
  const dashPositions = [];
  for (let g = -span; g <= span; g++) {
    const line = g * PITCH + PITCH / 2;
    for (let s = -span * PITCH; s < span * PITCH; s += 4) {
      dashPositions.push([line, s, 0], [s, line, Math.PI / 2]);
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, new THREE.MeshBasicMaterial({ color: '#f1efe6' }), dashPositions.length);
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  dashPositions.forEach(([x, z, rot], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    m.compose(new THREE.Vector3(x, 0.01, z), q, one);
    dashes.setMatrixAt(i, m);
  });
  scene.add(dashes);

  // Trees on empty plots of the last partly-filled blocks and the outer ring
  const usedPlots = city.residents.length;
  const treePlots = [];
  for (let p = usedPlots; p < (ringBlocks - 1) * 4; p++) treePlots.push(plotPosition(p));
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1, 6).translate(0, 0.5, 0);
  const crownGeo = new THREE.IcosahedronGeometry(1.1, 0).translate(0, 1.9, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: '#7b5a3c' }), treePlots.length * 2);
  const crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: '#5f9a4e', flatShading: true }), treePlots.length * 2);
  crowns.castShadow = true;
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

function buildTownHall() {
  // Centre monument: height grows with the number of videos.
  const h = Math.max(6, (city.videoCount || 1) * 0.6);
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 0.6, 32), new THREE.MeshStandardMaterial({ color: '#efe9dd' }));
  base.position.y = 0.55;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, h, 4), new THREE.MeshStandardMaterial({ color: '#fbf7ef', roughness: 0.5 }));
  tower.position.y = 0.85 + h / 2;
  tower.rotation.y = Math.PI / 4;
  const tip = new THREE.Mesh(new THREE.OctahedronGeometry(1.1), goldRoof);
  tip.position.y = 0.85 + h + 1;
  for (const o of [base, tower, tip]) { o.castShadow = o.receiveShadow = true; group.add(o); }
  group.userData.tip = tip;
  scene.add(group);

  const el = document.createElement('div');
  el.className = 'label hall';
  el.textContent = `${city.channel?.title || 'Town Hall'} · ${city.videoCount} videos`;
  const label = new CSS2DObject(el);
  label.position.set(0, 0.85 + h + 3, 0);
  scene.add(label);
  return group;
}

const boxGeoCache = new Map();
function buildingGeometry(floors, uvOffset) {
  const key = `${floors}:${uvOffset}`;
  if (boxGeoCache.has(key)) return boxGeoCache.get(key);
  const h = floors * FLOOR_H;
  const geo = new THREE.BoxGeometry(FOOT, h, FOOT);
  geo.translate(0, h / 2, 0);
  // Stretch the window texture on the 4 side faces so 1 texture row = 1 floor.
  const uv = geo.attributes.uv;
  for (const face of [0, 1, 4, 5]) {
    for (let v = face * 4; v < face * 4 + 4; v++) {
      uv.setY(v, uv.getY(v) * (floors / TEX_FLOORS) + uvOffset / TEX_FLOORS);
    }
  }
  boxGeoCache.set(key, geo);
  return geo;
}
const acGeo = new THREE.BoxGeometry(1.2, 0.6, 1.0).translate(0, 0.3, 0);
const antennaGeo = new THREE.CylinderGeometry(0.06, 0.06, 3, 5).translate(0, 1.5, 0);
const crownGeo = new THREE.ConeGeometry(FOOT * 0.62, 2.2, 4).rotateY(Math.PI / 4).translate(0, 1.1, 0);

function buildBuildings() {
  const ranked = [...city.residents].sort((a, b) => b.floors - a.floors || a.joined.localeCompare(b.joined));
  const rankOf = new Map(ranked.map((r, i) => [r.id, i + 1]));

  city.residents.forEach((resident, plot) => {
    const hash = [...resident.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const colorIdx = hash % PALETTE.length;
    const floors = Math.max(1, resident.floors);
    const h = floors * FLOOR_H;
    const rank = rankOf.get(resident.id);

    const roof = rank === 1 ? goldRoof : roofMaterials[colorIdx];
    const side = sideMaterials[colorIdx];
    const body = new THREE.Mesh(buildingGeometry(floors, hash % TEX_FLOORS), [side, side, roof, roof, side, side]);
    body.castShadow = body.receiveShadow = true;

    const group = new THREE.Group();
    group.add(body);
    group.position.copy(plotPosition(plot));
    group.rotation.y = ((hash >> 3) % 4) * (Math.PI / 2);

    // Rooftop details make tall towers recognisable.
    if (rank <= 3) {
      const crown = new THREE.Mesh(crownGeo, roof);
      crown.position.y = h;
      crown.castShadow = true;
      group.add(crown);
    } else if (floors >= 4) {
      const ac = new THREE.Mesh(acGeo, detailMat);
      ac.position.set(0.8, h, -0.6);
      group.add(ac);
    }
    if (floors >= 15) {
      const ant = new THREE.Mesh(antennaGeo, detailMat);
      ant.position.set(-1.2, h + (rank <= 3 ? 0 : 0), 1.2);
      group.add(ant);
    }

    const entry = { resident, group, body, plot: plot + 1, rank, height: h };
    body.userData.entry = entry;
    buildings.push(entry);
    byId.set(resident.id, entry);
    pickables.push(body);
    scene.add(group);

    if (rank <= LABEL_TOP) addLabel(entry, false);
  });
}

function addLabel(entry, isSelected) {
  const el = document.createElement('div');
  el.className = 'label' + (isSelected ? ' selected' : '');
  el.textContent = entry.resident.name;
  const b = document.createElement('b');
  b.textContent = entry.resident.floors;
  el.appendChild(b);
  const obj = new CSS2DObject(el);
  obj.position.set(0, entry.height + (entry.rank <= 3 ? 4 : 2.2), 0);
  entry.group.add(obj);
  return obj;
}

function frameCity(radius) {
  const d = Math.max(60, radius * 1.6);
  camera.position.set(d * 0.8, d * 0.75, d * 0.95);
  controls.target.set(0, 0, 0);
  controls.maxDistance = d * 4;
  scene.fog = new THREE.Fog(0xbcd8ee, d * 1.6, d * 5);

  sun.position.set(radius * 0.8 + 40, radius + 80, radius * 0.4 + 30);
  const s = radius + PITCH * 2;
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: radius * 4 + 300 });
  sun.shadow.camera.updateProjectionMatrix();
}

// ---------- Day / night ----------
function setNight(on) {
  night = on;
  document.documentElement.toggleAttribute('data-night', on);
  const sky = new THREE.Color(on ? '#0b1222' : '#bcd8ee');
  scene.background = sky;
  if (scene.fog) scene.fog.color.copy(sky);
  hemi.intensity = on ? 0.25 : 1.4;
  hemi.color.set(on ? '#8aa0ff' : '#ffffff');
  sun.intensity = on ? 0.15 : 2.4;
  for (const m of sideMaterials) m.emissiveIntensity = on ? 1.3 : 0;
  goldRoof.emissiveIntensity = on ? 0.8 : 0.2;
  $('btn-night').textContent = on ? '☀ Day' : '🌙 Night';
}

// ---------- Selection / camera flights ----------
let flight = null;
function flyTo(entry) {
  const target = new THREE.Vector3(entry.group.position.x, entry.height * 0.55, entry.group.position.z);
  const dist = Math.max(22, entry.height * 1.6);
  const dir = camera.position.clone().sub(controls.target).setY(0).normalize();
  if (dir.lengthSq() === 0) dir.set(1, 0, 1).normalize();
  const pos = target.clone().addScaledVector(dir, dist).setY(target.y + dist * 0.55);
  flight = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: pos, toTarget: target, t0: performance.now(), dur: 1200 };
}

function select(entry, { fly = true, updateUrl = true } = {}) {
  if (selectionOutline) { selectionOutline.removeFromParent(); selectionOutline = null; }
  if (selectionLabel) { selectionLabel.removeFromParent(); selectionLabel = null; }
  selected = entry;
  const info = $('info');
  if (!entry) {
    info.hidden = true;
    if (updateUrl) history.replaceState(null, '', location.pathname);
    return;
  }
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(entry.body.geometry), new THREE.LineBasicMaterial({ color: '#ff7a45' }));
  edges.scale.setScalar(1.03);
  entry.group.add(edges);
  selectionOutline = edges;
  if (entry.rank > LABEL_TOP) selectionLabel = addLabel(entry, true);

  const r = entry.resident;
  $('info-name').textContent = r.name;
  $('info-meta').textContent = `Resident since ${new Date(r.joined).toLocaleDateString()}`;
  $('info-floors').textContent = r.floors;
  $('info-rank').textContent = `#${entry.rank}`;
  $('info-plot').textContent = entry.plot;
  const avatar = $('info-avatar');
  avatar.textContent = '';
  if (r.avatar) {
    const img = new Image();
    img.src = r.avatar;
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => { avatar.textContent = r.name[0]?.toUpperCase() || '?'; };
    avatar.appendChild(img);
  } else {
    avatar.textContent = r.name[0]?.toUpperCase() || '?';
  }
  const link = $('info-channel');
  link.hidden = city.mode !== 'live';
  link.href = `https://www.youtube.com/channel/${encodeURIComponent(r.id)}`;
  info.hidden = false;

  if (updateUrl) history.replaceState(null, '', `?u=${encodeURIComponent(r.id)}`);
  if (fly) flyTo(entry);
}

// ---------- Growth replay (nice for the daily video) ----------
function replayGrowth(totalMs = 8000) {
  const t0 = performance.now();
  const n = buildings.length;
  anims.length = 0;
  buildings.forEach((b, i) => {
    b.group.scale.y = 0.0001;
    b.group.visible = false;
    anims.push({ b, start: t0 + (i / Math.max(1, n)) * totalMs, dur: 700 });
  });
}

// ---------- UI ----------
function fillUi() {
  $('channel-title').textContent = city.mode === 'demo' ? 'Demo city · fake residents' : city.channel?.title || '';
  $('stat-residents').textContent = city.residentCount.toLocaleString();
  $('stat-floors').textContent = city.totalFloors.toLocaleString();
  $('stat-videos').textContent = (city.videoCount || 0).toLocaleString();

  const board = $('leaderboard');
  [...buildings].sort((a, b) => a.rank - b.rank).slice(0, 10).forEach((b) => {
    const li = document.createElement('li');
    const n = document.createElement('span'); n.className = 'n'; n.textContent = b.resident.name;
    const f = document.createElement('span'); f.className = 'f'; f.textContent = b.resident.floors;
    li.append(n, f);
    li.onclick = () => select(b);
    board.appendChild(li);
  });
  if (innerWidth < 760) $('board').classList.add('collapsed');
  $('board-toggle').onclick = () => {
    const c = $('board').classList.toggle('collapsed');
    $('board-toggle').setAttribute('aria-expanded', String(!c));
  };

  // Search
  const input = $('search');
  const results = $('results');
  let active = -1;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    results.innerHTML = '';
    active = -1;
    if (!q) return;
    buildings
      .filter((b) => b.resident.name.toLowerCase().includes(q))
      .sort((a, b) => (a.resident.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.resident.name.toLowerCase().startsWith(q) ? 0 : 1) || a.rank - b.rank)
      .slice(0, 8)
      .forEach((b) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.textContent = b.resident.name;
        const s = document.createElement('span');
        s.textContent = `${b.resident.floors} floors · plot ${b.plot}`;
        li.appendChild(s);
        li.onclick = () => { select(b); input.value = ''; results.innerHTML = ''; input.blur(); };
        li._entry = b;
        results.appendChild(li);
      });
    if (!results.children.length) {
      const li = document.createElement('li');
      li.textContent = 'No resident found — comment on a video to move in!';
      results.appendChild(li);
    }
  };
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    const items = [...results.children].filter((li) => li._entry);
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    } else if (e.key === 'Enter') {
      items[Math.max(0, active)].click();
    } else if (e.key === 'Escape') {
      input.value = ''; render();
    }
  });

  $('info-close').onclick = () => select(null);
  $('info-share').onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      $('info-share').textContent = 'Link copied!';
    } catch {
      $('info-share').textContent = 'Copy failed';
    }
    setTimeout(() => ($('info-share').textContent = 'Copy link to this house'), 1500);
  };

  const toggleRotate = () => {
    controls.autoRotate = !controls.autoRotate;
    $('btn-rotate').setAttribute('aria-pressed', String(controls.autoRotate));
  };
  const toggleHide = () => {
    const on = document.body.classList.toggle('recording');
    if (on) { const h = $('hint'); h.hidden = false; h.style.animation = 'none'; void h.offsetWidth; h.style.animation = ''; }
  };
  $('btn-night').onclick = () => setNight(!night);
  $('btn-rotate').onclick = toggleRotate;
  $('btn-replay').onclick = () => replayGrowth();
  $('btn-hide').onclick = toggleHide;
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (k === 'n') setNight(!night);
    else if (k === 'r') toggleRotate();
    else if (k === 'g') replayGrowth();
    else if (k === 'h') toggleHide();
    else if (k === 'escape') select(null);
  });
}

// ---------- Picking ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pick(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(pickables, false)[0]?.object.userData.entry || null;
}
const tooltip = $('tooltip');
let hoverQueued = false;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (hoverQueued || e.pointerType !== 'mouse') return;
  hoverQueued = true;
  requestAnimationFrame(() => {
    hoverQueued = false;
    const hit = pick(e);
    renderer.domElement.style.cursor = hit ? 'pointer' : '';
    if (!hit || document.body.classList.contains('recording')) { tooltip.hidden = true; return; }
    tooltip.textContent = `${hit.resident.name} · ${hit.resident.floors} floor${hit.resident.floors === 1 ? '' : 's'}`;
    tooltip.style.left = `${Math.min(e.clientX + 14, innerWidth - tooltip.offsetWidth - 8)}px`;
    tooltip.style.top = `${e.clientY + 14}px`;
    tooltip.hidden = false;
  });
});
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return; // was a drag
  const hit = pick(e);
  if (hit) select(hit);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

// ---------- Loop ----------
const ease = (t) => 1 - Math.pow(1 - t, 3);
let townHall = null;
function tick(now) {
  if (flight) {
    const t = Math.min(1, (now - flight.t0) / flight.dur);
    const k = ease(t);
    camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
    if (t === 1) flight = null;
  }
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    if (now < a.start) continue;
    a.b.group.visible = true;
    const t = Math.min(1, (now - a.start) / a.dur);
    a.b.group.scale.y = Math.max(0.0001, ease(t));
    if (t === 1) anims.splice(i, 1);
  }
  if (townHall) townHall.userData.tip.rotation.y = now / 900;
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// ---------- Boot ----------
async function boot() {
  try {
    const res = await fetch(`data/city.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(res.statusText);
    city = await res.json();
  } catch (e) {
    $('channel-title').textContent = 'No city data yet. Run "npm run demo" or "npm run fetch".';
    console.error(e);
    return;
  }

  const blocks = Math.ceil(city.residents.length / 4);
  const ring = Math.ceil(Math.sqrt(blocks + 1)) + 1;
  const radius = (ring * PITCH) / 2 + PITCH;

  buildGround(blocks, radius);
  townHall = buildTownHall();
  buildBuildings();
  frameCity(radius);
  setNight(params.get('night') === '1');
  fillUi();

  const start = params.get('u') && byId.get(params.get('u'));
  if (start) {
    select(start, { updateUrl: false });
  } else {
    replayGrowth(Math.min(6000, 1500 + buildings.length * 8));
  }
  requestAnimationFrame(tick);
}
boot();
