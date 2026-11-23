// The interactive website. The 3D town itself lives in world.js.
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWorld, THREE, CSS2DObject } from './world.js';

const LABEL_TOP = 5; // with labels on: the 5 tallest buildings get a name tag
// Name labels are off by default (a clean city); the Labels button / L key turns them on, and the choice is remembered.
let labelsOn = false;
try { labelsOn = localStorage.getItem('seaty-labels') === '1'; } catch {}
let hallLabelObj = null;
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
let invites = []; // specials.invites: { friend, friendId, by, byId }
let villages = []; // specials.villages: { id, name, owner, ownerId }
const AMBASSADOR = 3, VILLAGE = 5;
let selected = null;
let selectedLandmark = null;
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
  if (selected) {
    if (labelsOn && selected.rank <= LABEL_TOP) world.addLabel(selected);
    else world.removeLabel(selected);
  }
  selected = entry;
  selectedLandmark = null;
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
  const UPGRADE_NAMES = { pool: '🏊 Pool', 'apple-tree': '🍎 Apple tree', capybara: '🦫 Capybara', cat: '🐈 Cat', dog: '🐕 Dog', gems: '💎 Ruby & Sapphire', 'flower-tree': '🌸 Blossom tree', pond: '🪷 Pond', campfire: '🔥 Campfire', chickens: '🐔 Chickens', 'giant-apple-tree': '🍎 Giant apple tree', 'giant-oak-tree': '🌳 Giant oak', garage: '🏎️ Garage', torii: '⛩️ Shrine gate', quail: '🐦 Quail', 'soccer-field': '⚽ Soccer field', elephant: '🐘 Elephant', shelter: '🛖 Storm shelter', drone: '🛸 Drone', 'koi-pond': '🎏 Koi pond', trophy: '🏆 Challenge winner', 'capybara-pen': '🦫 Capybara pen', 'xmas-hats': '🎅 Christmas hats', 'big-cats': '🦁 Lion & tiger', 'mango-tree': '🥭 Mango tree', 'milk-portal': '🥛 Milk portal', 'rooftop-sign': '🪧 Rooftop sign', garden: '🌷 Garden', golf: '⛳ Golf green', 'pickup-trucks': '🛻 Pickup trucks', 'delivery-truck': '🚚 Delivery truck', 'giant-nugget': '🍗 Giant nugget', 'dark-portal': '🌀 Dark portal', 'lava-portal': '🌋 Lava portal', tesseract: '🧊 Tesseract', 'giant-flag': '🇲🇾 Giant flag', 'capybara-boxing': '🥊 Capybara boxing', helicopter: '🚁 Helicopter', 'giant-block': '🟩 Giant grass block', 'robot-guard': '🤖 Robot guard', 'xmas-tree': '🎄 Christmas tree', weathervane: '🐓 Weathervane', 'roof-pizza': '🍕 Roof pizza', 'yard-sign': '🪧 Yard sign', 'roof-zombie': '🧟 Roof zombie', '3d-printer': '🖨️ 3D printer', 'toy-train': '🚂 Toy train' };
  const ups = [...(entry.recipe ? [`🏰 ${entry.houseTitle || 'Dream house'}`] : []), ...[...(entry.upgrades || [])].map((u) => UPGRADE_NAMES[u] || u)];
  const friends = invites.filter((i) => i.byId === r.id).length;
  const invitedBy = invites.find((i) => i.friendId === r.id)?.by;
  const ownVillage = villages.find((v) => v.ownerId === r.id);
  const social = [
    ownVillage ? `🏘️ Founder of ${ownVillage.name}` : friends >= AMBASSADOR ? '🎖️ Ambassador' : '',
    friends ? `🤝 ${friends} friend${friends === 1 ? '' : 's'} invited` : '',
    invitedBy ? `invited by ${invitedBy}` : '',
  ].filter(Boolean);
  $('info-meta').textContent = `${entry.neighbourhood ? `${entry.neighbourhood} · ` : ''}Resident since ${new Date(r.joined).toLocaleDateString()}${[...social, ...ups].length ? ` · ${[...social, ...ups].join(' · ')}` : ''}`;
  $('info-invite').hidden = false;
  $('info-invite').dataset.name = r.name;
  $('info-invite').dataset.id = r.id;
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

/** Landmarks are buildings too: info panel with the owner and floors (they grow with their owner). */
function selectLandmark(lm, { fly = true, updateUrl = true } = {}) {
  select(null, { updateUrl: false });
  selectedLandmark = lm;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(lm.body.geometry, 25), new THREE.LineBasicMaterial({ color: '#ff7a45' }));
  edges.position.copy(lm.body.position);
  lm.body.parent.add(edges);
  selectionOutline = edges;
  const d = lm.def;
  $('info-name').textContent = d.name;
  $('info-invite').hidden = true;
  $('info-meta').textContent = `Landmark${d.requestedBy ? ` · requested by ${d.requestedBy}` : ''}${d.added ? ` · opened ${new Date(d.added).toLocaleDateString()}` : ''}`;
  $('info-floors').textContent = lm.floors;
  $('info-rank').textContent = '★';
  $('info-plot').textContent = lm.place && lm.place !== lm.district ? `${lm.place} · ${lm.district}` : lm.district || 'downtown';
  const avatar = $('info-avatar');
  avatar.textContent = '★';
  const link = $('info-channel');
  link.hidden = !(city.mode === 'live' && lm.owner);
  if (lm.owner) link.href = `https://www.youtube.com/channel/${encodeURIComponent(lm.owner.resident.id)}`;
  $('info').hidden = false;
  if (updateUrl) history.replaceState(null, '', `?l=${encodeURIComponent(d.id)}`);
  if (fly) flyTo({ outer: lm.outer, height: lm.height * 0.8 });
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
  const showBoard = (kind) => {
    board.innerHTML = '';
    $('tab-tall').classList.toggle('on', kind === 'tall');
    $('tab-invite').classList.toggle('on', kind === 'invite');
    const rows = kind === 'tall'
      ? [...world.list].sort((a, b) => a.rank - b.rank).slice(0, 10).map((b) => [b, b.resident.floors])
      : [...invites.reduce((m, i) => m.set(i.byId, (m.get(i.byId) || 0) + 1), new Map())]
          .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, n]) => [world.entries.get(id), n]).filter(([e]) => e);
    for (const [b, val] of rows) {
      const li = document.createElement('li');
      const n = document.createElement('span'); n.className = 'n'; n.textContent = b.resident.name;
      const f = document.createElement('span'); f.className = 'f'; f.textContent = kind === 'tall' ? val : `${val >= VILLAGE ? '🏘️' : val >= AMBASSADOR ? '🎖️' : ''} ${val}`;
      li.append(n, f);
      li.onclick = () => select(b);
      board.appendChild(li);
    }
    if (!rows.length) {
      const li = document.createElement('li');
      li.textContent = kind === 'tall' ? 'No residents yet. Be the first!' : 'Invite a friend: they write "invited by @you" in their comment. 5 friends = your own village!';
      board.appendChild(li);
    }
  };
  showBoard('tall');
  $('tab-tall').onclick = () => showBoard('tall');
  $('tab-invite').onclick = () => showBoard('invite');
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
  $('info-invite').onclick = async () => {
    const b = $('info-invite');
    const link = `${location.origin}${location.pathname}?u=${encodeURIComponent(b.dataset.id)}`;
    const text = `Come and live next to me in Seaty, a city built by YouTube comments! 🏙️ Comment on any of the channel's videos and write "invited by ${b.dataset.name}", and you get a house. Here's mine: ${link}`;
    try { await navigator.clipboard.writeText(text); b.textContent = 'Invitation copied!'; } catch { b.textContent = 'Copy failed'; }
    setTimeout(() => (b.textContent = 'Invite friends'), 1800);
  };
  $('info-share').onclick = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      $('info-share').textContent = 'Link copied!';
    } catch {
      $('info-share').textContent = 'Copy failed';
    }
    setTimeout(() => ($('info-share').textContent = 'Copy link'), 1500);
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
  $('btn-labels').onclick = () => setLabels(!labelsOn);
  $('btn-labels').setAttribute('aria-pressed', String(labelsOn));
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    if (k === 'n') setNight(!world.night);
    else if (k === 'r') toggleRotate();
    else if (k === 'g') replayGrowth();
    else if (k === 'h') toggleHide();
    else if (k === 'l') setLabels(!labelsOn);
    else if (k === 'escape') select(null);
  });
}

/** Show or hide name labels on buildings, landmarks and the town hall (the selected building always keeps its own). */
function setLabels(on) {
  labelsOn = on;
  try { localStorage.setItem('seaty-labels', on ? '1' : '0'); } catch {}
  $('btn-labels')?.setAttribute('aria-pressed', String(on));
  for (const e of world.list) {
    if (e === selected) continue;
    if (on && e.rank <= LABEL_TOP) world.addLabel(e);
    else world.removeLabel(e);
  }
  if (hallLabelObj) hallLabelObj.visible = on;
}

// ---------- Picking ----------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pick(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const d = raycaster.intersectObjects(world.pickables, false)[0]?.object.userData;
  return d?.entry || d?.landmark || d?.airship || d?.challenge || null;
}
const isLandmark = (x) => Boolean(x?.def);
const isBillboard = (x) => x === world.airship?.info;
const isChallenge = (x) => Boolean(x?.code);
function showFound(ch) {
  let box = document.getElementById('found');
  if (!box) {
    box = document.createElement('div');
    box.id = 'found';
    box.style.cssText = 'position:fixed;inset:0;display:grid;place-items:center;background:rgba(10,16,30,.55);z-index:50;font-family:Inter,system-ui,sans-serif';
    box.onclick = (e) => { if (e.target === box) box.remove(); };
    document.body.appendChild(box);
  }
  let word = '';
  try { word = atob(ch.code); } catch { word = ch.code; }
  box.innerHTML = `<div style="background:#fff;border-radius:24px;padding:28px 32px;max-width:440px;margin:16px;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.4)">
    <div style="font-size:56px">🏆</div>
    <div style="font-weight:900;font-size:26px;color:#14202f;margin:6px 0">You found the ${ch.name}!</div>
    <div style="font-size:16px;color:#4a5a70;line-height:1.45">To win, comment this secret word under my newest video:</div>
    <div style="font-weight:900;font-size:34px;letter-spacing:4px;color:#ff7a45;margin:14px 0;user-select:all">${word}</div>
    <div style="font-size:14px;color:#6a7a90;line-height:1.4">The first correct comment wins and gets a golden trophy for their house. Keep it secret!</div>
    <button style="margin-top:18px;background:#ff7a45;color:#fff;border:0;border-radius:999px;padding:10px 22px;font:700 15px Inter,system-ui;cursor:pointer" onclick="this.closest('#found').remove()">Got it</button></div>`;
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
    tooltip.textContent = isChallenge(hit) ? '✨ What is this?' : isBillboard(hit)
      ? (hit.url ? `▶ New video: ${hit.title} · click to watch` : 'Seaty airship')
      : isLandmark(hit)
      ? `${hit.def.name}${hit.def.requestedBy ? ` · by ${hit.def.requestedBy}` : ''} · ${hit.floors} floor${hit.floors === 1 ? '' : 's'}`
      : `${hit.resident.name} · ${hit.resident.floors} floor${hit.resident.floors === 1 ? '' : 's'}`;
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
  if (isChallenge(hit)) showFound(hit);
  else if (isBillboard(hit)) { if (hit.url) open(hit.url, '_blank', 'noopener'); }
  else if (isLandmark(hit)) selectLandmark(hit);
  else if (hit) select(hit);
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
  // Landmark signs: only near the camera (or the selected one), so the overview isn't a wall of signs.
  for (const l of world.landmarks.values()) {
    l.label.visible = l === selectedLandmark || (labelsOn && camera.position.distanceTo(l.outer.position) < 55);
  }
  world.tick(now / 1000);
  controls.update();
  world.render();
  requestAnimationFrame(tick);
}

// ---------- Boot ----------
/** Tourist counter: GoatCounter (no cookies, no personal data) counts website visits; the total shows in the header. */
async function loadTourists() {
  const site = await fetch(`data/site.json?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const code = site?.goatcounter;
  if (!code || !/^[a-z0-9-]+$/.test(code)) return;
  // every house link (?u=\u2026, ?l=\u2026) counts as a visit to the same page, so that page's counter is the site total
  window.goatcounter = { path: () => location.pathname };
  const sc = document.createElement('script');
  sc.async = true;
  sc.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
  sc.src = 'https://gc.zgo.at/count.js';
  document.head.appendChild(sc);
  // The real total comes from GoatCounter's API in the daily update (data/tourists.json); the public counters are
  // cached for hours, so they only help when they happen to be higher. Show the highest number we have.
  const get = (p) => fetch(`https://${code}.goatcounter.com/counter/${p}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const num = (c) => Number(String(c?.count ?? '0').replace(/[^0-9]/g, '')) || 0;
  const [saved, total, page] = await Promise.all([
    fetch(`data/tourists.json?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    get('TOTAL'),
    get(encodeURIComponent(location.pathname)),
  ]);
  if (saved || total || page) {
    $('stat-tourists').textContent = Math.max(Number(saved?.total) || 0, num(total), num(page)).toLocaleString();
    $('stat-tourists-box').hidden = false;
  }
}

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
  invites = specials?.invites || [];
  villages = specials?.villages || [];
  world.build(city, { labelTop: 0, specials });
  loadTourists();
  // weekly challenge: the hidden object shows from the start date until someone has won
  const challenge = await fetch(`data/challenge.json?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const ch = challenge?.current;
  if (ch && !ch.winner && Date.now() >= Date.parse(ch.start || 0)) world.addChallenge(ch);
  const hallLabel = document.createElement('div');
  hallLabel.className = 'label hall';
  hallLabel.textContent = `${city.channel?.title || 'Town Hall'} · ${city.videoCount} video${city.videoCount === 1 ? "" : "s"}`;
  const hl = new CSS2DObject(hallLabel);
  hl.position.set(0, world.townHall.userData.height + 1.5, 0);
  world.scene.add(hl);
  hallLabelObj = hl;
  setLabels(labelsOn);

  const pose = world.overviewPose();
  camera.position.copy(pose.pos);
  controls.target.copy(pose.target);
  controls.maxDistance = pose.pos.length() * 3;
  setNight(params.get('night') === '1');
  fillUi();

  const start = params.get('u') && world.entries.get(params.get('u'));
  const startLandmark = params.get('l') && world.landmarks.get(params.get('l'));
  if (start) select(start, { updateUrl: false });
  else if (startLandmark) selectLandmark(startLandmark, { updateUrl: false });
  else replayGrowth(Math.min(6000, 1500 + world.list.length * 8));
  // For screenshots / checks: window.__seatyView(azimuth, distance, elevation 0..1 where 1 = straight down)
  window.__seatyView = (az, dist, elevK, tx = 0, tz = 0) => {
    const el = Math.min(1.55, elevK * (Math.PI / 2));
    flight = null;
    controls.maxDistance = Math.max(controls.maxDistance, dist * 1.1);
    controls.maxPolarAngle = Math.PI / 2;
    camera.position.set(tx + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, tz + Math.cos(az) * Math.cos(el) * dist);
    controls.target.set(tx, 0, tz);
    controls.update();
  };
  // For checks: look at the airship from outside its route (k = distance factor)
  window.__seatyAirshipView = (k = 1.55, up = 4) => {
    const p = world.airship?.group.position;
    if (!p) return;
    flight = null;
    controls.maxDistance = Math.max(controls.maxDistance, p.length() * 3);
    camera.position.set(p.x * k, p.y + up, p.z * k);
    controls.target.copy(p);
    controls.update();
  };
  requestAnimationFrame(tick);
}
boot();
