// The interactive website. The 3D town itself lives in world.js.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld, THREE, CSS2DObject } from './world.js';

const LABEL_TOP = 5;
const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const world = createWorld({ container: $('scene'), width: innerWidth, height: innerHeight });
const { camera, renderer } = world;
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 8;
controls.autoRotateSpeed = 0.6;

let city = null;
let selected = null;
let selectionOutline = null;
let flight = null;
const anims = [];

function setNight(on) {
  world.setNight(on);
  document.documentElement.toggleAttribute('data-night', on);
  $('btn-night').textContent = on ? '☀ Day' : '🌙 Night';
}

// ---------- Selection / camera flights ----------
function flyTo(entry) {
  const target = new THREE.Vector3(entry.outer.position.x, entry.height * 0.55, entry.outer.position.z);
  const dist = Math.max(22, entry.height * 1.6);
  const dir = camera.position.clone().sub(controls.target).setY(0).normalize();
  if (dir.lengthSq() === 0) dir.set(1, 0, 1).normalize();
  const pos = target.clone().addScaledVector(dir, dist).setY(target.y + dist * 0.55);
  flight = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), toPos: pos, toTarget: target, t0: performance.now(), dur: 1200 };
}

function select(entry, { fly = true, updateUrl = true } = {}) {
  if (selectionOutline) { selectionOutline.removeFromParent(); selectionOutline = null; }
  if (selected && selected.rank > LABEL_TOP) world.removeLabel(selected);
  if (selected && selected.rank <= LABEL_TOP) world.addLabel(selected);
  selected = entry;
  const info = $('info');
  if (!entry) {
    info.hidden = true;
    if (updateUrl) history.replaceState(null, '', location.pathname);
    return;
  }
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(entry.body.geometry, 25), new THREE.LineBasicMaterial({ color: '#ff7a45' }));
  edges.scale.setScalar(1.03);
  entry.inner.add(edges);
  selectionOutline = edges;
  world.addLabel(entry, 'label selected');

  const r = entry.resident;
  $('info-name').textContent = r.name;
  const UPGRADE_NAMES = { pool: '🏊 Pool', 'apple-tree': '🍎 Apple tree', capybara: '🦫 Capybara', cat: '🐈 Cat' };
  const ups = [...(entry.recipe ? [`🏰 ${entry.houseTitle || 'Dream house'}`] : []), ...[...(entry.upgrades || [])].map((u) => UPGRADE_NAMES[u] || u)];
  $('info-meta').textContent = `Resident since ${new Date(r.joined).toLocaleDateString()}${ups.length ? ` · ${ups.join(' · ')}` : ''}`;
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
    img.onerror = () => { avatar.textContent = r.name.replace(/^@/, '')[0]?.toUpperCase() || '?'; };
    avatar.appendChild(img);
  } else {
    avatar.textContent = r.name.replace(/^@/, '')[0]?.toUpperCase() || '?';
  }
  const link = $('info-channel');
  link.hidden = city.mode !== 'live';
  link.href = `https://www.youtube.com/channel/${encodeURIComponent(r.id)}`;
  info.hidden = false;

  if (updateUrl) history.replaceState(null, '', `?u=${encodeURIComponent(r.id)}`);
  if (fly) flyTo(entry);
}

// ---------- Growth replay ----------
function replayGrowth(totalMs = 8000) {
  const t0 = performance.now();
  const n = world.list.length;
  anims.length = 0;
  world.list.forEach((b, i) => {
    b.outer.scale.y = 0.0001;
    b.outer.visible = false;
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
  [...world.list].sort((a, b) => a.rank - b.rank).slice(0, 10).forEach((b) => {
    const li = document.createElement('li');
    const n = document.createElement('span'); n.className = 'n'; n.textContent = b.resident.name;
    const f = document.createElement('span'); f.className = 'f'; f.textContent = b.resident.floors;
    li.append(n, f);
    li.onclick = () => select(b);
    board.appendChild(li);
  });
  if (!world.list.length) {
    const li = document.createElement('li');
    li.textContent = 'No residents yet. Be the first!';
    board.appendChild(li);
  }
  if (innerWidth < 760) $('board').classList.add('collapsed');
  $('board-toggle').onclick = () => {
    const c = $('board').classList.toggle('collapsed');
    $('board-toggle').setAttribute('aria-expanded', String(!c));
  };

  const input = $('search');
  const results = $('results');
  let active = -1;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    results.innerHTML = '';
    active = -1;
    if (!q) return;
    world.list
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
      li.textContent = 'No resident found. Comment on a video to move in!';
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
  $('btn-night').onclick = () => setNight(!world.night);
  $('btn-rotate').onclick = toggleRotate;
  $('btn-replay').onclick = () => replayGrowth();
  $('btn-hide').onclick = toggleHide;
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (k === 'n') setNight(!world.night);
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
  return raycaster.intersectObjects(world.pickables, false)[0]?.object.userData.entry || null;
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
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  const hit = pick(e);
  if (hit) select(hit);
});
addEventListener('resize', () => world.resize(innerWidth, innerHeight));

// ---------- Loop ----------
const ease = (t) => 1 - Math.pow(1 - t, 3);
function tick(now) {
  if (flight) {
    const t = Math.min(1, (now - flight.t0) / flight.dur);
    camera.position.lerpVectors(flight.fromPos, flight.toPos, ease(t));
    controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease(t));
    if (t === 1) flight = null;
  }
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    if (now < a.start) continue;
    a.b.outer.visible = true;
    const t = Math.min(1, (now - a.start) / a.dur);
    a.b.outer.scale.y = Math.max(0.0001, ease(t));
    if (t === 1) anims.splice(i, 1);
  }
  world.tick(now / 1000);
  controls.update();
  world.render();
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

  const specials = await fetch(`data/specials.json?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  world.build(city, { labelTop: LABEL_TOP, specials });
  const hallLabel = document.createElement('div');
  hallLabel.className = 'label hall';
  hallLabel.textContent = `${city.channel?.title || 'Town Hall'} · ${city.videoCount} video${city.videoCount === 1 ? "" : "s"}`;
  const hl = new CSS2DObject(hallLabel);
  hl.position.set(0, world.townHall.userData.height + 1.5, 0);
  world.scene.add(hl);

  const pose = world.overviewPose();
  camera.position.copy(pose.pos);
  controls.target.copy(pose.target);
  controls.maxDistance = pose.pos.length() * 3;
  setNight(params.get('night') === '1');
  fillUi();

  const start = params.get('u') && world.entries.get(params.get('u'));
  if (start) select(start, { updateUrl: false });
  else replayGrowth(Math.min(6000, 1500 + world.list.length * 8));
  requestAnimationFrame(tick);
}
boot();
