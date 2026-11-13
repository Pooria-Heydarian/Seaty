// Channel trailer: explains how Seaty works. Same frame API as video.js,
// so scripts/render-video.mjs can render it:  npm run video -- --page trailer.html --name trailer

import { createWorld, THREE, FLOOR_H } from './world.js';

const W = 1080, H = 1920, FPS = 30;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const $ = (id) => document.getElementById(id);
document.body.classList.add(RENDER ? 'render' : 'preview');

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const fade = (lt, a, b, d = 0.35) => clamp01((lt - a) / d) * (1 - clamp01((lt - b) / d));
function show(el, o, rise = 50) {
  el.style.opacity = o.toFixed(3);
  el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
  el.style.transform = `translateY(${((1 - o) * rise).toFixed(1)}px) scale(${(0.94 + 0.06 * o).toFixed(4)})`;
}

// ---------- A sample town (made-up citizens, no real names) ----------
let seed = 21;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const nameParts = [['Nova', 'Kai', 'Luna', 'Max', 'Mila', 'Leo', 'Zoe', 'Rio', 'Ava', 'Finn'], ['Builder', 'Plays', 'TV', 'Art', '_x', 'Studio', '', 'Pro']];
const residents = [];
for (let i = 0; i < 110; i++) {
  const x = rnd();
  const floors = x < 0.6 ? 1 + Math.floor(rnd() * 3) : x < 0.9 ? 4 + Math.floor(rnd() * 8) : 14 + Math.floor(rnd() * 16);
  const name = nameParts[0][Math.floor(rnd() * 10)] + nameParts[1][Math.floor(rnd() * 8)] + (rnd() < 0.5 ? Math.floor(rnd() * 90 + 10) : '');
  residents.push({ id: `t${i}`, name, floors, joined: String(i).padStart(4, '0') });
}
const YOU_FLOORS = 9;
residents.push({ id: 'you', name: 'you', floors: YOU_FLOORS, joined: '9999' });
const city = { residents, videoCount: 40, residentCount: residents.length, channel: { title: 'Seaty' } };

const stage = $('stage');
const world = createWorld({ container: $('scene'), width: W, height: H, pixelRatio: 1 });
const { camera } = world;
camera.fov = 50;
camera.updateProjectionMatrix();

// ---------- Medal art ----------
function medal(color, dark, icon) {
  return `<svg viewBox="0 0 220 280" aria-hidden="true">
    <path d="M60 0h40l20 90H80z" fill="#ff7a45"/><path d="M160 0h-40l-20 90h40z" fill="#2e86ab"/>
    <circle cx="110" cy="175" r="88" fill="${dark}"/><circle cx="110" cy="175" r="72" fill="${color}"/>
    <g transform="translate(110 175)" fill="${dark}" style="color:${dark}">${icon}</g></svg>`;
}
const ICONS = {
  tower: '<rect x="-16" y="-44" width="32" height="80" rx="4"/><rect x="-42" y="-8" width="24" height="44" rx="4"/><rect x="18" y="-22" width="24" height="58" rx="4"/>',
  star: '<path d="M0 -46l13 28 31 4-23 21 6 31-27-15-27 15 6-31-23-21 31-4z"/>',
  key: '<circle cx="-14" cy="-10" r="22" fill="none" stroke="currentColor" stroke-width="12"/><rect x="2" y="-4" width="48" height="12" rx="4"/><rect x="34" y="6" width="10" height="18"/>',
};

// ---------- Timeline ----------
const ready = (async () => {
  world.build(city, { labelTop: 0 });
  await document.fonts.ready;

  const you = world.entries.get('you');
  const ranked = [...world.list].sort((a, b) => a.rank - b.rank);
  const top = ranked.slice(0, 3);
  const site = params.get('site') || `${location.host}${location.pathname.replace(/trailer\.html$/, '')}`;
  $('cta-url').textContent = `Find your house: ${site.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  $('medals').innerHTML = [
    ['#f5b82e', '#b9831a', ICONS.tower, 'Top<br>Builder'],
    ['#dfe6ee', '#8b97a6', ICONS.star, 'Challenge<br>Champion'],
    ['#e3a26f', '#9a5a2c', ICONS.key, 'Founding<br>Citizen'],
  ].map(([c, d, i, l]) => `<div class="md">${medal(c, d, i)}<div>${l}</div></div>`).join('');
  const medalSmall = ['#f5b82e', '#dfe6ee', '#e3a26f'];
  $('board').innerHTML = top
    .map((e, i) => `<div class="r"><svg class="m" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="${medalSmall[i]}"/><text x="32" y="43" text-anchor="middle" font-size="30" font-weight="900" fill="#14202f" font-family="Inter">${i + 1}</text></svg><span class="who"></span><span class="f">${e.resident.floors} floors</span></div>`)
    .join('');
  [...$('board').querySelectorAll('.who')].forEach((el, i) => (el.textContent = top[i].resident.name));

  const scenes = [];
  let t = 0;
  // Voiceover lengths come from the renderer (window.SEATY_VO = { sceneIndex: seconds }).
  const VO = window.SEATY_VO || {};
  const add = (type, dur, text, vo) => {
    const i = scenes.length;
    if (VO[i]) dur = Math.max(dur, vo.at + VO[i] + 0.6);
    scenes.push({ type, start: t, dur, text, vo });
    t += dur;
  };
  add('welcome', 4.4, ['WELCOME TO', 'Seaty<span>.</span>', 'The city built by <b>your comments</b>'],
    { text: 'Welcome to Seaty: the city built by your comments.', at: 0.5 });
  add('move', 5.6, ['STEP 1', 'Comment = <span>a house</span>', 'Comment on any video and you move in'],
    { text: 'Step one. Comment on any video, and you move in. I will build you a house.', at: 0.5 });
  add('grow', 6.6, ['STEP 2', 'Every video = <span>+1 floor</span>', 'Comment on each new video to grow'],
    { text: 'Step two. Comment on every new video, and your building grows one more floor.', at: 0.5 });
  add('skyline', 5.8, ['STEP 3', 'Climb the <span>skyline</span>', 'More floors = a more valuable citizen'],
    { text: 'Step three. Climb the skyline. The more floors you have, the more valuable a citizen you are.', at: 0.5 });
  add('award', 8.0, ['EVERY MONTH', 'Citizen <span>Award</span>', 'When Seaty earns money, 10% goes to one lucky citizen'],
    { text: 'And every month, when Seaty earns money, ten percent goes to one lucky citizen. More floors means more chances to win. It is free to join, and the rules are in the description.', at: 0.6 });
  add('medals', 6.4, ['BE ACTIVE', 'Win <span>medals</span>', 'Join city challenges and stories'],
    { text: 'Active citizens can also win medals, by joining city challenges and stories.', at: 0.5 });
  add('outro', 6.4, ['', 'Let’s build Seaty <span>together</span>', 'and grow it together'],
    { text: 'So, let us build Seaty together. Subscribe, and leave your first comment below!', at: 0.6 });
  const S = Object.fromEntries(scenes.map((s) => [s.type, s]));

  function orbit(target, dist, az, elDeg) {
    const el = (elDeg * Math.PI) / 180;
    return { pos: new THREE.Vector3(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist), target: target.clone() };
  }
  const overview = () => Math.max(60, world.radius * 1.6) * 1.3;
  const youPos = you.outer.position;
  const youAz = you.outer.rotation.y + 0.6;

  function rawPose(s, lt) {
    const k = lt / s.dur;
    switch (s.type) {
      case 'welcome': return orbit(new THREE.Vector3(0, 0, 0), overview() * (1.2 - 0.15 * easeOut(k)), 0.6 + k * 0.3, 48);
      case 'move': return orbit(new THREE.Vector3(youPos.x, 2, youPos.z), 21, youAz + k * 0.3, 30);
      case 'grow': {
        const h = YOU_FLOORS * FLOOR_H;
        return orbit(new THREE.Vector3(youPos.x, 2 + (h * 0.5 - 2) * easeInOut(k), youPos.z), 21 + (h * 1.4 + 10 - 21) * easeInOut(k), youAz + 0.3 + k * 0.4, 28);
      }
      case 'skyline': {
        const e = top[0];
        const h = e.resident.floors * FLOOR_H;
        const p = e.outer.position;
        return orbit(new THREE.Vector3(p.x, h * 0.45, p.z), h * 1.3 + 24 + k * 30, e.outer.rotation.y + 0.9 + k * 0.5, 18 + k * 12);
      }
      case 'award': {
        const e = top[0];
        const h = e.resident.floors * FLOOR_H;
        const p = e.outer.position;
        return orbit(new THREE.Vector3(p.x, h * 0.7, p.z), h * 1.1 + 30, e.outer.rotation.y + 1.6 + k * 0.6, 12 + k * 8);
      }
      case 'medals': return orbit(new THREE.Vector3(0, 0, 0), overview() * 0.75, 2.6 + k * 0.4, 38);
      case 'outro': return orbit(new THREE.Vector3(0, 0, 0), overview() * (0.95 - 0.1 * k), 3.2 + k * 0.4, 44);
    }
  }
  const endPose = scenes.map((s) => rawPose(s, s.dur));
  function pose(i, lt) {
    const p = rawPose(scenes[i], lt);
    if (i === 0 || lt >= 1.1) return p;
    const k = easeInOut(clamp01(lt / 1.1));
    return { pos: endPose[i - 1].pos.clone().lerp(p.pos, k), target: endPose[i - 1].target.clone().lerp(p.target, k) };
  }

  const labelState = new Map();
  function labels(want) {
    for (const [id] of labelState) if (!want.has(id)) { world.removeLabel(world.entries.get(id)); labelState.delete(id); }
    for (const [id, w] of want) {
      const e = world.entries.get(id);
      const have = labelState.get(id);
      if (!have || have.cls !== w.cls || have.text !== w.text) { world.addLabel(e, w.cls, w.text); labelState.set(id, w); }
      e.label.position.y = e.roofTop + 1;
    }
  }

  let lastScene = null;
  function frame(time) {
    const i = Math.max(0, scenes.findLastIndex((s) => time >= s.start));
    const s = scenes[i];
    const lt = time - s.start;

    // Your house: hidden until "move", rises, then grows floor by floor in "grow".
    const revealAt = S.move.start + 1.3;
    const k = clamp01((time - revealAt) / 0.7);
    you.outer.visible = time >= revealAt;
    you.outer.scale.set(0.85 + 0.15 * easeOut(k), Math.max(0.001, easeOutBack(k)), 0.85 + 0.15 * easeOut(k));
    const g = clamp01((time - S.grow.start - 0.9) / Math.max(4.6, S.grow.dur - 2));
    const floors = time < S.grow.start + 0.9 ? 1 : 1 + Math.round((YOU_FLOORS - 1) * g);
    world.setFloors(you, floors);

    // Night from the award onward (lit windows, glowing gold roofs).
    const nightAt = S.award.start + 0.18;
    if ((time >= nightAt) !== world.night) world.setNight(time >= nightAt);
    $('flash').style.opacity = (0.85 * Math.max(0, 1 - Math.abs(time - nightAt) / 0.18)).toFixed(3);

    const p = pose(i, lt);
    camera.position.copy(p.pos);
    camera.lookAt(p.target);

    if (lastScene !== s) {
      $('h-kicker').textContent = s.text[0];
      $('h-big').innerHTML = s.text[1];
      $('h-sub').innerHTML = s.text[2];
      $('head').classList.toggle('welcome', s.type === 'welcome');
      lastScene = s;
    }
    show($('head'), fade(lt, 0.25, s.type === 'outro' ? 99 : s.dur - 0.4));
    show($('card'), s.type === 'move' ? fade(lt, 2.0, s.dur - 0.4) : 0, 60);
    show($('floors'), s.type === 'grow' ? fade(lt, 0.7, s.dur - 0.4) : 0, 60);
    $('f-n').innerHTML = floors > 1 ? `${floors} <b>+${floors - 1}</b>` : '1';
    show($('board'), s.type === 'skyline' ? fade(lt, 0.9, s.dur - 0.4) : 0, 60);
    show($('award'), s.type === 'award' ? fade(lt, 1.0, s.dur - 0.4) : 0, 60);
    show($('medals'), s.type === 'medals' ? fade(lt, 0.8, s.dur - 0.4) : 0, 60);
    show($('cta'), s.type === 'outro' ? fade(lt, 1.2, 99) : 0, 60);

    const want = new Map();
    if ((s.type === 'move' && time >= revealAt + 0.3) || s.type === 'grow') want.set('you', { cls: 'vlabel you', text: '@you' });
    if (s.type === 'skyline') top.forEach((e, r) => want.set(e.resident.id, { cls: r === 0 ? 'vlabel top1' : 'vlabel', text: `#${r + 1} ${e.resident.name}` }));
    labels(want);

    world.tick(time);
    world.render();
  }
  return { duration: t, fps: FPS, frame, scenes: scenes.map(({ type, start, dur, vo }) => ({ type, start, dur, vo })) };
})();

window.seaty = {
  ready: ready.then((tl) => ({ duration: tl.duration, fps: tl.fps, scenes: tl.scenes })),
  frame: async (t) => (await ready).frame(t),
};

if (!RENDER) {
  const fit = () => {
    const s = Math.min((innerHeight - 70) / H, innerWidth / W);
    stage.style.transform = `scale(${s})`;
    stage.style.margin = `${-(H - H * s) / 2}px ${-(W - W * s) / 2}px`;
  };
  fit();
  addEventListener('resize', fit);
  ready.then((tl) => {
    let playing = true, t = 0, last = performance.now();
    $('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; last = performance.now(); };
    $('scrub').oninput = (e) => { t = (e.target.value / 1000) * tl.duration; };
    window.go = (sec) => { t = sec; playing = false; $('play').textContent = 'Play'; };
    const loop = (now) => {
      if (playing) { t += (now - last) / 1000; if (t > tl.duration) t = 0; }
      last = now;
      tl.frame(t);
      $('scrub').value = String(Math.round((t / tl.duration) * 1000));
      $('time').textContent = `${t.toFixed(1)}s / ${tl.duration.toFixed(1)}s`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
