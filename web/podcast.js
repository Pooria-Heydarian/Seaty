// Seaty Weekly: the weekend show. Two hosts at a studio desk talk through the week in the city, with
// cut-aways to the city, comment cards and chapters. The script is data/episode.json (written in the
// weekly session from the real comments). Same frame API as video.js, so scripts/render-video.mjs renders it:
//   npm run podcast             (preview: podcast.html in the browser)
//
// episode.json: { number, title, subtitle, hosts: { A: {name, voice, role}, B: {...} },
//   segments: [ { chapter, lines: [ { who: 'A'|'B', text, shot?, focus?, card?, caption?, panel?, title?, cta? } ] } ] }
//   shot:  'A' | 'B' (close-up, the default is the speaker) | 'wide' (both hosts) | 'screen' (hosts + the city on the
//          big screen behind them) | 'city' (full-screen city)
//   focus: { landmark: "Name" } | { resident: "@name" } | { overview: true }   what the city camera shows
//   card:  { who: "@name", text: "their comment", meta?, tag? }    a comment card
//   caption: { tag, name, sub }   panel: { title, items: [[icon, html], …] }

import { createWorld, THREE } from './world.js';

const W = 1920, H = 1080, FPS = 30;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');
const $ = (id) => document.getElementById(id);
document.body.classList.add(RENDER ? 'render' : 'preview');

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (t) => t * t * (3 - 2 * t);
const fade = (lt, a, b, d = 0.35) => clamp01((lt - a) / d) * (1 - clamp01((lt - b) / d));
function show(el, o, rise = 24) {
  el.style.opacity = o.toFixed(3);
  el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
  el.style.transform = `translateY(${((1 - o) * rise).toFixed(1)}px)`;
}
const getJSON = (u) => fetch(`${u}?t=${Date.now()}`).then((r) => (r.ok ? r.json() : null));
const say = (n) => String(n || '').replace(/^@/, '');
const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const world = createWorld({ container: $('scene'), width: W, height: H, pixelRatio: 1, shadowSize: 4096 });
const { camera, scene, renderer } = world;
camera.fov = 40;
camera.updateProjectionMatrix();

// ---------------------------------------------------------------- the studio
// It stands far away from the city in the same 3D scene (the city is out of sight from in here),
// so the big screen can show the city live through a second camera.
const S = new THREE.Vector3(6000, 0, 0);
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const mesh = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };
const lit = (color, i = 1.6) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.4 });

function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const FONT = (w, px) => `${w} ${px}px Inter, "Segoe UI", system-ui, sans-serif`;

const screenRT = new THREE.WebGLRenderTarget(1280, 720, { samples: 4, type: THREE.HalfFloatType });
const cityCam = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 4000);

const studio = new THREE.Group();
studio.position.copy(S);
scene.add(studio);
{
  // floor, back wall and side walls
  studio.add(mesh(new THREE.BoxGeometry(34, 0.2, 26), M('#3a2b24', { roughness: 0.8 }), 0, -0.1, 0));
  studio.add(mesh(new THREE.CylinderGeometry(6.5, 6.5, 0.06, 48), M('#1f2d48'), 0, 0.03, -0.5));
  const wall = M('#17233a');
  studio.add(mesh(new THREE.BoxGeometry(34, 14, 0.4), wall, 0, 7, -9));
  for (const x of [-15, 15]) studio.add(mesh(new THREE.BoxGeometry(0.4, 14, 26), wall, x, 7, 0));
  // vertical light strips on the back wall
  for (const x of [-12.5, -9.5, 9.5, 12.5]) studio.add(mesh(new THREE.BoxGeometry(0.25, 9, 0.1), lit(x < 0 ? '#ff7a45' : '#3fb6e8', 1.4), x, 5.5, -8.75));
  // the big screen: the city, live
  studio.add(mesh(new THREE.BoxGeometry(13.4, 7.9, 0.3), M('#0b0f18'), 0, 5.6, -8.7));
  const screenMat = new THREE.MeshBasicMaterial({ map: screenRT.texture, toneMapped: true });
  studio.add(mesh(new THREE.PlaneGeometry(12.8, 7.2), screenMat, 0, 5.6, -8.5));
  // shelves with little houses (the city's merch corner)
  const shelfM = M('#5b4636');
  for (const [x, rot] of [[-14.7, Math.PI / 2], [14.7, -Math.PI / 2]]) {
    for (const y of [3.2, 5.2, 7.2]) {
      const sh = mesh(new THREE.BoxGeometry(6, 0.15, 1), shelfM, x, y, -4);
      sh.rotation.y = rot;
      studio.add(sh);
      for (let k = 0; k < 3; k++) {
        const c = ['#e63946', '#3a86ff', '#ffd23f', '#7cb342', '#ff7a45'][(k + Math.round(y)) % 5];
        const hz = -4 - 2 + k * 2;
        studio.add(mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), M('#f3e9d2'), x + (x < 0 ? 0.1 : -0.1), y + 0.38, hz));
        const roof = mesh(new THREE.ConeGeometry(0.55, 0.45, 4), M(c), x + (x < 0 ? 0.1 : -0.1), y + 0.9, hz);
        roof.rotation.y = Math.PI / 4;
        studio.add(roof);
      }
    }
  }
  // plants
  for (const x of [-11.5, 11.5]) {
    studio.add(mesh(new THREE.CylinderGeometry(0.7, 0.55, 1.2, 12), M('#d9cdb4'), x, 0.6, -6.8));
    studio.add(mesh(new THREE.IcosahedronGeometry(1.4, 0), M('#4f8f3f', { flatShading: true }), x, 2.4, -6.8));
  }
  // the desk: a long rounded desk with a glowing logo panel
  const deskTop = mesh(new THREE.BoxGeometry(9.6, 0.18, 2.6), M('#f3efe6', { roughness: 0.35 }), 0, 1.28, 0.3);
  studio.add(deskTop);
  const front = canvasTex(1024, 160, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0);
    gr.addColorStop(0, '#ff7a45'); gr.addColorStop(1, '#f5b82e');
    g.fillStyle = '#1b2840'; g.fillRect(0, 0, w, h);
    g.fillStyle = gr; g.fillRect(0, h - 14, w, 14);
    g.font = FONT(900, 92); g.textAlign = 'center'; g.fillStyle = '#ffffff';
    g.fillText('SEATY WEEKLY', w / 2, 112);
  });
  studio.add(mesh(new THREE.BoxGeometry(9.2, 1.18, 2.2), M('#1b2840'), 0, 0.6, 0.3));
  studio.add(mesh(new THREE.PlaneGeometry(9.2, 1.18), new THREE.MeshStandardMaterial({ map: front, emissive: '#ffffff', emissiveMap: front, emissiveIntensity: 0.55 }), 0, 0.6, 1.41));
  // mugs and a tiny model of a Seaty house on the desk
  for (const [x, c] of [[-3.6, '#ff7a45'], [3.6, '#3fb6e8']]) {
    studio.add(mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.36, 12), M(c), x, 1.55, 0.9));
    studio.add(mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 10), M(c), x + 0.2, 1.56, 0.9));
  }
  // lights
  studio.add(new THREE.AmbientLight('#ffffff', 0.25));
  const key = new THREE.PointLight('#fff1dc', 120, 40, 2);
  key.position.set(0, 9, 9);
  studio.add(key);
  const rimA = new THREE.PointLight('#ff7a45', 50, 18, 2);
  rimA.position.set(-6, 5, -4);
  const rimB = new THREE.PointLight('#3fb6e8', 50, 18, 2);
  rimB.position.set(6, 5, -4);
  studio.add(rimA, rimB);
}

// ---------------------------------------------------------------- the hosts
function makeHost({ skin, hair, style, top, accent, glasses, micSide = 1 }) {
  const g = new THREE.Group();
  const skinM = M(skin, { roughness: 0.7 });
  const hairM = M(hair, { roughness: 0.8, flatShading: true });
  const topM = M(top, { roughness: 0.8 });
  const dark = M('#1c1f26');
  // chair
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.25, 1.4), dark, 0, 0.95, -0.3), mesh(new THREE.BoxGeometry(1.6, 2.0, 0.25), dark, 0, 1.9, -1.0), mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 8), M('#8a93a3'), 0, 0.45, -0.3));
  // body
  const torso = mesh(new THREE.CapsuleGeometry(0.62, 0.75, 6, 14), topM, 0, 1.75, -0.35);
  torso.scale.set(1.15, 1, 0.8);
  g.add(torso);
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.35, 10), skinM, 0, 2.45, -0.35));
  // arms resting on the desk; the right forearm gestures
  const arms = [];
  for (const s of [-1, 1]) {
    const upper = mesh(new THREE.CapsuleGeometry(0.17, 0.6, 4, 10), topM, s * 0.78, 1.82, -0.15);
    upper.rotation.x = 0.5;
    upper.rotation.z = s * 0.15;
    const fore = new THREE.Group();
    fore.position.set(s * 0.82, 1.48, 0.15);
    const f = mesh(new THREE.CapsuleGeometry(0.15, 0.55, 4, 10), topM, 0, 0, 0.35);
    f.rotation.x = Math.PI / 2;
    const hand = mesh(new THREE.SphereGeometry(0.16, 10, 8), skinM, 0, 0, 0.75);
    fore.add(f, hand);
    g.add(upper, fore);
    arms.push(fore);
  }
  // head
  const head = new THREE.Group();
  head.position.set(0, 2.62, -0.3);
  head.add(mesh(new THREE.SphereGeometry(0.52, 24, 18), skinM, 0, 0.42, 0));
  for (const s of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(0.11, 10, 8), skinM, s * 0.52, 0.4, 0));
  const eyes = [];
  for (const s of [-1, 1]) {
    const eye = new THREE.Group();
    eye.position.set(s * 0.19, 0.5, 0.45);
    eye.add(mesh(new THREE.SphereGeometry(0.085, 12, 10), M('#ffffff', { roughness: 0.3 })), mesh(new THREE.SphereGeometry(0.05, 10, 8), dark, 0, 0, 0.05));
    head.add(eye);
    eyes.push(eye);
    const brow = mesh(new THREE.BoxGeometry(0.2, 0.045, 0.05), hairM, s * 0.19, 0.66, 0.46);
    brow.rotation.z = -s * 0.08;
    head.add(brow);
  }
  head.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), M(skin, { roughness: 0.6 }), 0, 0.38, 0.52));
  const mouth = mesh(new THREE.SphereGeometry(0.11, 14, 10), M('#7a2a33'), 0, 0.22, 0.45);
  mouth.scale.set(1.3, 0.25, 0.5);
  head.add(mouth);
  // hair
  if (style === 'bob') {
    const cap = mesh(new THREE.SphereGeometry(0.58, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.5, -0.04);
    head.add(cap);
    for (const s of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.22, 0.62, 0.62), hairM, s * 0.5, 0.25, -0.08));
    head.add(mesh(new THREE.BoxGeometry(0.9, 0.62, 0.3), hairM, 0, 0.3, -0.42));
    head.add(mesh(new THREE.BoxGeometry(0.8, 0.16, 0.2), hairM, 0, 0.8, 0.38));
  } else {
    head.add(mesh(new THREE.SphereGeometry(0.56, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM, 0, 0.5, -0.03));
    const quiff = mesh(new THREE.BoxGeometry(0.6, 0.22, 0.35), hairM, 0.05, 1.0, 0.25);
    quiff.rotation.x = -0.3;
    head.add(quiff);
    head.add(mesh(new THREE.BoxGeometry(0.9, 0.35, 0.3), hairM, 0, 0.45, -0.42));
  }
  if (glasses) {
    for (const s of [-1, 1]) head.add(mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 16), dark, s * 0.19, 0.5, 0.53));
    head.add(mesh(new THREE.BoxGeometry(0.12, 0.025, 0.025), dark, 0, 0.53, 0.55));
  }
  // headphones
  const band = mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 24, Math.PI), M(accent), 0, 0.45, -0.02);
  head.add(band);
  for (const s of [-1, 1]) head.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 14).rotateZ(Math.PI / 2), M(accent), s * 0.58, 0.4, 0));
  g.add(head);
  // microphone on a little arm from the desk
  g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), M('#2b3340'), micSide * 0.75, 1.75, 0.45));
  const mic = mesh(new THREE.CapsuleGeometry(0.11, 0.22, 4, 10), M('#2b3340', { metalness: 0.5 }), micSide * 0.62, 2.25, 0.35);
  mic.rotation.z = micSide * 0.9;
  g.add(mic);
  return { group: g, head, mouth, eyes, arms };
}

const hosts = {
  A: makeHost({ skin: '#f2c9a8', hair: '#d9622b', style: 'bob', top: '#2a9d8f', accent: '#ff7a45', micSide: -1 }),
  B: makeHost({ skin: '#c98d62', hair: '#2b1d14', style: 'short', top: '#f3a712', accent: '#3fb6e8', glasses: true }),
};
hosts.A.group.position.set(-2.3, 0, -0.9);
hosts.A.group.rotation.y = 0.28;
hosts.B.group.position.set(2.3, 0, -0.9);
hosts.B.group.rotation.y = -0.28;
studio.add(hosts.A.group, hosts.B.group);

// studio camera positions (relative to the studio)
const SHOTS = {
  wide: { pos: [0, 3.6, 10.5], at: [0, 3.2, -2] },
  A: { pos: [1.1, 3.05, 4.6], at: [-2.3, 2.95, -1] },
  B: { pos: [-1.1, 3.05, 4.6], at: [2.3, 2.95, -1] },
  screen: { pos: [0, 2.9, 7.2], at: [0, 4.9, -8.5] },
};

// ---------------------------------------------------------------- the episode
const ready = (async () => {
  const [city, specials, ep] = await Promise.all([getJSON('data/city.json'), getJSON('data/specials.json'), getJSON('data/episode.json')]);
  world.build(city, { labelTop: 0, specials });
  await document.fonts.ready;
  return timeline(ep);
})();

function timeline(ep) {
  const site = (params.get('site') || `${location.host}${location.pathname.replace(/podcast\.html$/, '')}`).replace(/^https?:\/\//, '').replace(/\/$/, '');
  const VO = window.SEATY_VO || {};
  const ENV = window.SEATY_VO_ENV || {};
  const HOSTS = ep.hosts;
  for (const k of ['A', 'B']) document.documentElement.style.setProperty(`--${k.toLowerCase()}`, HOSTS[k].color || (k === 'A' ? '#ff7a45' : '#3fb6e8'));
  $('ep').textContent = `EP ${ep.number}`;

  const scenes = [];
  let t = 0;
  const words = (s) => String(s).split(/\s+/).length;
  // opening sting: title card over the wide shot
  scenes.push({ type: 'sting', start: 0, dur: 4.2, shot: 'wide', title: { kicker: `EPISODE ${ep.number}`, big: 'Seaty<span>Weekly</span>', sub: ep.title } });
  t = 4.2;
  let lastFocusKey = null, focusStart = 0;
  for (const seg of ep.segments) {
    seg.lines.forEach((ln, n) => {
      const i = scenes.length;
      const at = 0.12;
      const vo = { text: ln.text, at, voice: HOSTS[ln.who].voice };
      const est = words(ln.text) / 2.7 + 0.3;
      const dur = (VO[i] ?? est) + at + (ln.pause ?? 0.32);
      const focus = ln.focus || null;
      const key = focus ? JSON.stringify(focus) : null;
      if (key !== lastFocusKey) { lastFocusKey = key; focusStart = t; }
      const shot = ln.shot || (ln.card || ln.panel ? 'wide' : ln.who);
      scenes.push({ type: 'line', start: t, dur, vo, who: ln.who, shot, focus, focusStart, chapter: seg.chapter, newChapter: n === 0, card: ln.card, caption: ln.caption, panel: ln.panel, title: ln.title, cta: ln.cta });
      t += dur;
    });
  }
  scenes.push({ type: 'end', start: t, dur: 3.5, shot: 'wide', cta: { big: 'Become a <span>citizen</span>', small: 'Comment on any video and you get a house', url: site } });
  t += 3.5;

  // city camera for a focus
  const focusPose = (focus, since) => {
    let target = new THREE.Vector3(0, 0, 0), dist = Math.max(60, world.radius * 1.5), elev = 40;
    if (focus?.landmark) {
      const l = [...world.landmarks.values()].find((x) => x.def.name.toLowerCase() === String(focus.landmark).toLowerCase());
      if (l) { target = new THREE.Vector3(l.outer.position.x, l.height * 0.45, l.outer.position.z); dist = Math.max(26, l.height * 1.7, l.size === 'L' ? 44 : 0); elev = 28; }
    } else if (focus?.resident) {
      const who = say(focus.resident).toLowerCase();
      const e = world.list.find((x) => say(x.resident.name).toLowerCase() === who);
      if (e) { target = new THREE.Vector3(e.outer.position.x, (e.height || 3) * 0.6, e.outer.position.z); dist = 15 + (e.height || 3); elev = 30; }
    }
    const az = (hash(JSON.stringify(focus)) % 628) / 100 + since * 0.045;
    const el = (elev * Math.PI) / 180;
    return { pos: new THREE.Vector3(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist), target };
  };
  const studioPose = (name, lt) => {
    const s = SHOTS[name] || SHOTS.wide;
    const push = 1 - 0.035 * Math.min(lt, 6); // slow push-in
    const at = new THREE.Vector3(...s.at);
    const pos = new THREE.Vector3(...s.pos).sub(at).multiplyScalar(push).add(at);
    return { pos: pos.add(S), target: at.add(S) };
  };

  // mouth: loudness of the current line, or a stand-in wobble in the browser preview
  const mouthOpen = (s, i, time) => {
    if (s.type !== 'line') return 0;
    const lt = time - s.start - s.vo.at;
    const env = ENV[i];
    if (env) return env[Math.floor(lt * FPS)] ?? 0;
    const est = words(s.vo.text) / 2.7;
    return lt > 0 && lt < est ? 0.35 + 0.35 * Math.sin(time * 19) * Math.sin(time * 7.3) : 0;
  };

  let last = null;
  function frame(time) {
    const i = Math.max(0, scenes.findLastIndex((s) => time >= s.start));
    const s = scenes[i];
    const lt = time - s.start;
    if (last !== s) {
      if (s.title) { $('t-kicker').textContent = s.title.kicker; $('t-big').innerHTML = s.title.big; $('t-sub').textContent = s.title.sub; }
      if (s.chapter) $('chapter').textContent = s.chapter;
      if (s.who) {
        $('s-name').textContent = HOSTS[s.who].name;
        $('s-role').textContent = HOSTS[s.who].role || 'Host';
        $('s-bar').style.background = `var(--${s.who.toLowerCase()})`;
      }
      if (s.card) {
        $('k-av').textContent = say(s.card.who).slice(0, 1).toUpperCase();
        $('k-av').style.background = `hsl(${hash(s.card.who) % 360} 65% 52%)`;
        $('k-who').textContent = `@${say(s.card.who)}`;
        $('k-meta').textContent = s.card.meta || 'YouTube comment';
        $('k-text').textContent = s.card.text;
        $('k-tag').textContent = s.card.tag || '';
        $('k-tag').style.display = s.card.tag ? 'inline-block' : 'none';
      }
      if (s.caption) { $('c-tag').textContent = s.caption.tag || ''; $('c-name').textContent = s.caption.name || ''; $('c-sub').textContent = s.caption.sub || ''; }
      if (s.panel) { $('p-title').textContent = s.panel.title; $('p-list').innerHTML = s.panel.items.map(([ic, txt]) => `<li><span class="ic">${ic}</span><span>${txt}</span></li>`).join(''); }
      if (s.cta) { $('cta-big').innerHTML = s.cta.big; $('cta-small').textContent = s.cta.small; $('cta-url').textContent = s.cta.url || site; }
      last = s;
    }
    // continuing overlays stay up across lines of the same card / panel
    const same = (k) => { let a = s.start; for (let j = i - 1; j >= 0 && scenes[j][k] && JSON.stringify(scenes[j][k]) === JSON.stringify(s[k]); j--) a = scenes[j].start; return time - a; };
    const keepNext = (k) => scenes[i + 1]?.[k] && JSON.stringify(scenes[i + 1][k]) === JSON.stringify(s[k]);
    const cardO = s.card ? clamp01((same('card') - 0.2) / 0.3) * (keepNext('card') ? 1 : 1 - clamp01((lt - (s.dur - 0.25)) / 0.25)) : 0;
    const panelO = s.panel ? clamp01((same('panel') - 0.2) / 0.3) * (keepNext('panel') ? 1 : 1 - clamp01((lt - (s.dur - 0.25)) / 0.25)) : 0;
    const capO = s.caption ? clamp01((same('caption') - 0.3) / 0.3) * (keepNext('caption') ? 1 : 1 - clamp01((lt - (s.dur - 0.25)) / 0.25)) : 0;
    show($('card'), cardO, 30);
    show($('panel'), panelO, 30);
    show($('caption'), capO, 20);
    show($('title'), s.title ? fade(lt, 0.15, s.dur - 0.4) : 0, 0);
    show($('cta'), s.cta ? fade(lt, 0.3, s.dur + 10) : 0, 30);
    show($('bug'), s.type === 'sting' ? 0 : 1, 0);
    show($('chapter'), s.chapter && s.type === 'line' ? 1 : 0, 0);
    const speakerVisible = s.type === 'line' && !s.card && !s.panel && (s.shot === 'city' || s.shot === 'screen' || s.newChapter || lt < 2.2);
    show($('speaker'), speakerVisible ? fade(lt, 0.1, s.dur - 0.15, 0.2) : 0, 16);
    $('shade').style.opacity = (s.cta ? 0.6 * fade(lt, 0.2, 99) : 0).toFixed(3);
    $('flash').style.opacity = (s.type === 'sting' ? Math.max(0, 1 - time / 0.5) : 0).toFixed(3);

    // hosts: mouths, blinking, looking at each other or the camera, gestures
    for (const k of ['A', 'B']) {
      const h = hosts[k];
      const talking = s.who === k;
      const open = talking ? mouthOpen(s, i, time) : 0;
      h.mouth.scale.y = 0.22 + open * 1.1;
      h.mouth.scale.x = 1.3 - open * 0.25;
      const blink = ((time + (k === 'A' ? 0 : 1.7)) % 3.9) < 0.12;
      for (const e of h.eyes) e.scale.y = blink ? 0.12 : 1;
      const other = k === 'A' ? 0.55 : -0.55;
      const toCam = talking && (s.shot === k || s.shot === 'wide');
      const yaw = toCam ? (k === 'A' ? -0.15 : 0.15) + Math.sin(time * 0.9) * 0.06 : other * (s.type === 'line' ? 1 : 0.3);
      h.head.rotation.y += (yaw - h.head.rotation.y) * 0.18;
      h.head.rotation.x = talking ? Math.sin(time * 4.3) * 0.04 * (open > 0.05 ? 1 : 0.3) - 0.03 : Math.sin(time * 0.8 + 1) * 0.02;
      h.head.rotation.z = Math.sin(time * 0.6 + (k === 'A' ? 0 : 2)) * 0.03;
      const gesture = talking ? Math.max(0, Math.sin(time * 2.1)) * 0.45 * (open > 0.05 ? 1 : 0.4) : 0;
      h.arms[1].rotation.x = -gesture;
      h.arms[0].rotation.x = talking ? -Math.max(0, Math.sin(time * 1.7 + 1)) * 0.2 : 0;
    }

    // cameras
    const focus = s.focus || null;
    const cp = focusPose(focus, time - (s.focusStart ?? 0));
    if (s.shot === 'city') {
      camera.position.copy(cp.pos);
      camera.lookAt(cp.target);
    } else {
      const p = studioPose(s.shot, lt);
      camera.position.copy(p.pos);
      camera.lookAt(p.target);
      // the big screen shows the focus, or the city from above
      cityCam.position.copy(cp.pos);
      cityCam.lookAt(cp.target);
      world.clearAirship(cityCam);
      renderer.setRenderTarget(screenRT);
      renderer.render(scene, cityCam);
      renderer.setRenderTarget(null);
    }
    world.tick(time);
    world.render();
  }
  return {
    duration: t, fps: FPS, frame,
    scenes: scenes.map((s) => ({ type: s.type, start: s.start, dur: s.dur, vo: s.vo, chapter: s.newChapter ? s.chapter : undefined })),
  };
}

window.seaty = {
  ready: ready.then((tl) => ({ duration: tl.duration, fps: tl.fps, scenes: tl.scenes, width: W, height: H })),
  frame: async (t) => (await ready).frame(t),
};

if (!RENDER) {
  const stage = $('stage');
  const fit = () => { stage.style.transform = `scale(${Math.min((innerHeight - 70) / H, innerWidth / W)})`; };
  fit();
  addEventListener('resize', fit);
  ready.then((tl) => {
    let playing = true, t = 0, lastNow = performance.now();
    $('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pause' : 'Play'; lastNow = performance.now(); };
    $('scrub').oninput = (e) => { t = (e.target.value / 1000) * tl.duration; };
    const loop = (now) => {
      if (playing) { t += (now - lastNow) / 1000; if (t > tl.duration) t = 0; }
      lastNow = now;
      tl.frame(t);
      $('scrub').value = String(Math.round((t / tl.duration) * 1000));
      $('time').textContent = `${t.toFixed(1)}s / ${tl.duration.toFixed(1)}s`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}
