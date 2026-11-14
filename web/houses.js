// Custom houses: builds a resident's special house from a recipe (see catalog.js HOUSE_SHAPES / HOUSE_ROOFS / HOUSE_EXTRAS).
// Used by world.js. Height still follows the resident's floors (1 floor per video they commented on).
//
//   recipe = { shape, roof, wall, roofColor, door, accent, extras: [] }   (cleaned by cleanHouseRecipe)

import * as THREE from 'three';
import { cleanHouseRecipe } from './catalog.js';

/**
 * @param {object} o
 * @param {{map: THREE.Texture, emissiveMap: THREE.Texture}} o.windows  shared window textures (white walls, blue windows)
 * @param {number} o.FOOT  house footprint
 * @param {number} o.FLOOR_H  floor height
 * @param {number} o.TEX_FLOORS  floors in one window texture tile
 * @param {(mat: THREE.Material, day: number, night: number) => void} o.nightMat  registers emissive strength by day / night
 */
export function createHouseKit({ windows, FOOT, FLOOR_H, TEX_FLOORS, nightMat }) {
  // ---------- materials (cached by colour) ----------
  const cache = new Map();
  const cached = (key, make) => cache.get(key) || cache.set(key, make()).get(key);
  const plain = (color, extra = {}) =>
    cached(`p${color}${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra }));
  const windowed = (color) =>
    cached(`w${color}`, () => {
      const m = new THREE.MeshStandardMaterial({ color, map: windows.map, emissiveMap: windows.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.85 });
      nightMat(m, 0, 1.3);
      return m;
    });
  const glowing = (color, day = 0.5, night = 2.2) =>
    cached(`g${color}${day}${night}`, () => {
      const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.4 });
      nightMat(m, day, night);
      return m;
    });
  const GOLD = plain('#f5b82e', { metalness: 0.6, roughness: 0.35 });
  const WHITE = plain('#f7f4ee');
  const DARK = plain('#3b4552');
  const WOOD = plain('#7b5a3c');
  const LEAF = plain('#4f8f3f', { flatShading: true });
  const GLASS = plain('#7fa7c9', { roughness: 0.15, metalness: 0.2 });
  const STEAM = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.75 });
  const WATER = plain('#3fb6e8', { roughness: 0.1, emissive: '#0b5c80', emissiveIntensity: 0.35 });

  // ---------- geometry helpers ----------
  /** Window texture UVs: u repeats every ~FOOT of width, v once per TEX_FLOORS floors. */
  function scaleSideUV(geo, faces, su, sv) {
    const uv = geo.attributes.uv;
    const idx = faces ? faces.flatMap((f) => [f * 4, f * 4 + 1, f * 4 + 2, f * 4 + 3]) : [...Array(uv.count).keys()];
    for (const v of idx) uv.setXY(v, uv.getX(v) * su, uv.getY(v) * sv);
    return geo;
  }
  const box = (w, h, d, y = 0) => new THREE.BoxGeometry(w, h, d).translate(0, y + h / 2, 0);
  /** Box with windows on its 4 sides, sitting on y. */
  function windowBox(w, h, d, color, y = 0) {
    const geo = scaleSideUV(box(w, h, d, y), [0, 1, 4, 5], Math.max(1, Math.round(w / FOOT * 3)) / 3, h / FLOOR_H / TEX_FLOORS);
    const side = windowed(color);
    const top = plain(new THREE.Color(color).multiplyScalar(0.75).getStyle());
    return new THREE.Mesh(geo, [side, side, top, top, side, side]);
  }
  /** Open cylinder with windows + a plain top cap. */
  function windowCylinder(rTop, rBottom, h, color, y = 0) {
    const g = new THREE.Group();
    const around = Math.max(1, Math.round((Math.PI * 2 * rBottom) / FOOT * 2));
    const tube = new THREE.Mesh(scaleSideUV(new THREE.CylinderGeometry(rTop, rBottom, h, 28, 1, true).translate(0, y + h / 2, 0), null, around, h / FLOOR_H / TEX_FLOORS), windowed(color));
    const cap = new THREE.Mesh(new THREE.CircleGeometry(rTop, 28).rotateX(-Math.PI / 2).translate(0, y + h, 0), plain(new THREE.Color(color).multiplyScalar(0.75).getStyle()));
    g.add(tube, cap);
    g.userData.body = tube;
    return g;
  }
  function door(color, z, scale = 1, y = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 1.5 * scale, 0.12).translate(0, y + 0.75 * scale, z + 0.03), plain(color));
    return m;
  }

  /** Roof on a w x d box whose top is at y. Returns the roof's top height. */
  function roof(g, kind, color, w, d, y) {
    const mat = plain(color, { flatShading: true });
    if (kind === 'gable') {
      const tri = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.25, 0), new THREE.Vector2(w / 2 + 0.25, 0), new THREE.Vector2(0, 1.7)]);
      const geo = new THREE.ExtrudeGeometry(tri, { depth: d + 0.4, bevelEnabled: false }).translate(0, y, -d / 2 - 0.2);
      g.add(new THREE.Mesh(geo, mat));
      return y + 1.7;
    }
    if (kind === 'flat') {
      g.add(new THREE.Mesh(box(w + 0.2, 0.25, d + 0.2, y), mat));
      return y + 0.25;
    }
    if (kind === 'dome') {
      const r = Math.min(w, d) / 2;
      g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, y, 0), mat));
      return y + r;
    }
    const hip = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.74, 1.8, 4).rotateY(Math.PI / 4).translate(0, y + 0.9, 0), mat);
    hip.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
    g.add(hip);
    if (kind === 'spire') {
      g.add(new THREE.Mesh(new THREE.ConeGeometry(0.35, 3.2, 8).translate(0, y + 1.6 + 1.6, 0), mat));
      return y + 4.8;
    }
    return y + 1.8;
  }
  /** Round roof on a cylinder of radius r whose top is at y. */
  function roundRoof(g, kind, color, r, y) {
    const mat = plain(color, { flatShading: kind !== 'dome' });
    if (kind === 'dome') {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, y, 0), mat));
      return y + r;
    }
    if (kind === 'flat' || kind === 'gable') {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.2, r + 0.2, 0.3, 28).translate(0, y + 0.15, 0), mat));
      return y + 0.3;
    }
    const h = kind === 'spire' ? 5 : 2.4;
    g.add(new THREE.Mesh(new THREE.ConeGeometry(r + 0.3, h, 24).translate(0, y + h / 2, 0), mat));
    return y + h;
  }

  // ---------- shapes ----------
  // Each returns { body, top, eave, front, width } — top = highest point, eave = wall top, front = z of the front wall.
  const SHAPES = {
    classic(g, r, h) {
      const body = windowBox(FOOT, h, FOOT, r.wall);
      g.add(body, door(r.door, FOOT / 2));
      return { body, top: roof(g, r.roof, r.roofColor, FOOT, FOOT, h), eave: h, front: FOOT / 2, width: FOOT };
    },
    cottage(g, r, h) {
      h = Math.max(h, 1.6);
      const w = 4.8, d = 3.8;
      const body = windowBox(w, h, d, r.wall);
      g.add(body, door(r.door, d / 2));
      for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) {
        const beam = new THREE.Mesh(box(0.22, h, 0.22), WOOD);
        beam.position.set(x, 0, z);
        g.add(beam);
      }
      for (let f = 1; f * FLOOR_H < h - 0.1; f++) g.add(new THREE.Mesh(box(w + 0.05, 0.14, d + 0.05, f * FLOOR_H - 0.07), WOOD));
      return { body, top: roof(g, r.roof === 'pointed' ? 'gable' : r.roof, r.roofColor, w, d, h), eave: h, front: d / 2, width: w };
    },
    castle(g, r, h) {
      h = Math.max(h, 2.4);
      const w = 3.4;
      const body = windowBox(w, h, w, r.wall);
      g.add(body, door(r.door, w / 2, 1.15));
      const stone = plain(r.wall);
      const cone = plain(r.roofColor, { flatShading: true });
      // battlements on the keep
      for (let i = 0; i < 4; i++) for (let k = -1; k <= 1; k += 2) {
        const m = new THREE.Mesh(box(0.5, 0.45, 0.5, h), stone);
        const a = (i * Math.PI) / 2;
        m.position.set(Math.cos(a) * w * 0.38 + Math.sin(a) * k * 0.7, 0, Math.sin(a) * w * 0.38 - Math.cos(a) * k * 0.7);
        g.add(m);
      }
      // 4 turrets
      const th = h + 1.2;
      for (const x of [-1, 1]) for (const z of [-1, 1]) {
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, th, 16).translate(0, th / 2, 0), stone);
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.7, 16).translate(0, th + 0.85, 0), cone);
        t.position.set(x * w / 2, 0, z * w / 2);
        c.position.copy(t.position);
        g.add(t, c);
      }
      return { body, top: th + 1.7, eave: h, front: w / 2 + 0.2, width: w + 1.4 };
    },
    tower(g, r, h) {
      const rad = 1.9;
      const c = windowCylinder(rad, rad, h, r.wall);
      g.add(c, door(r.door, rad - 0.05));
      return { body: c.userData.body, top: roundRoof(g, r.roof, r.roofColor, rad, h), eave: h, front: rad, width: rad * 2 };
    },
    dome(g, r, h) {
      const rad = 2.1;
      const c = windowCylinder(rad, rad, h, r.wall);
      g.add(c, door(r.door, rad - 0.05));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(rad, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, h, 0), plain(r.roofColor, { metalness: 0.3, roughness: 0.45 })));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8).translate(0, h + rad + 0.15, 0), GOLD));
      return { body: c.userData.body, top: h + rad + 0.4, eave: h, front: rad, width: rad * 2 };
    },
    pyramid(g, r, h) {
      const n = Math.max(2, Math.round(h / FLOOR_H));
      const stepH = h / n;
      const sand = plain(r.wall, { flatShading: true });
      let body = null;
      for (let i = 0; i < n; i++) {
        const w = 4.8 - (3.8 * i) / n;
        const m = new THREE.Mesh(box(w, stepH, w, i * stepH), sand);
        g.add(m);
        body ||= m;
      }
      g.add(new THREE.Mesh(new THREE.ConeGeometry(0.75, 1, 4).rotateY(Math.PI / 4).translate(0, h + 0.5, 0), plain(r.roofColor, { metalness: 0.5, roughness: 0.35 })));
      g.add(door(r.door, 2.4, 1));
      return { body, top: h + 1, eave: h, front: 2.4, width: 4.8 };
    },
    mushroom(g, r, h) {
      const stemH = Math.max(h, 1.6);
      const c = windowCylinder(1.15, 1.35, stemH, r.wall);
      g.add(c, door(r.door, 1.3));
      const capR = 2.5;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(capR, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), plain(r.roofColor));
      cap.scale.set(1, 0.72, 1);
      cap.position.y = stemH - 0.1;
      g.add(cap);
      const spots = plain('#fff8ec');
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4, el = 0.35 + (i % 3) * 0.33;
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 6), spots);
        s.scale.set(1, 0.35, 1);
        s.position.set(Math.cos(a) * Math.cos(el) * capR, stemH - 0.1 + Math.sin(el) * capR * 0.72, Math.sin(a) * Math.cos(el) * capR);
        s.lookAt(0, stemH - 0.1, 0);
        s.rotateX(Math.PI / 2);
        g.add(s);
      }
      return { body: c.userData.body, top: stemH + capR * 0.72, eave: stemH, front: 1.3, width: capR * 2 };
    },
    treehouse(g, r, h) {
      const trunkH = Math.max(2.2, h);
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, trunkH + 1.2, 10).translate(0, (trunkH + 1.2) / 2, 0), WOOD));
      g.add(new THREE.Mesh(box(3.6, 0.2, 3.6, trunkH), WOOD));
      const body = windowBox(2.6, 1.6, 2.6, r.wall, trunkH + 0.2);
      g.add(body, door(r.door, 1.3, 0.85, trunkH + 0.2));
      const top = roof(g, r.roof, r.roofColor, 2.6, 2.6, trunkH + 1.8);
      for (const [x, y, z, s] of [[-1.7, 0.6, -1.2, 1.1], [1.6, 1.1, -1.4, 1], [-1.5, 1.6, 1.3, 0.9], [1.8, 0.2, 1.1, 0.8]]) {
        g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1).translate(x, trunkH + y, z), LEAF));
      }
      // ladder
      for (let y = 0.4; y < trunkH; y += 0.45) g.add(new THREE.Mesh(box(0.7, 0.07, 0.07, y).translate(0, 0, 0.75), WOOD));
      return { body, top: Math.max(top, trunkH + 2.8), eave: trunkH + 1.8, front: 1.3, width: 3.6 };
    },
    lighthouse(g, r, h) {
      const H = Math.max(h, 3.6);
      const n = Math.max(2, Math.round(H / FLOOR_H));
      const segH = H / n;
      let body = null;
      for (let i = 0; i < n; i++) {
        const rb = 1.9 - (0.7 * i) / n, rt = 1.9 - (0.7 * (i + 1)) / n;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, segH, 24).translate(0, i * segH + segH / 2, 0), plain(i % 2 ? r.accent : r.wall));
        g.add(m);
        body ||= m;
      }
      g.add(door(r.door, 1.85));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.2, 24).translate(0, H + 0.1, 0), DARK));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.2, 16).translate(0, H + 0.8, 0), glowing('#ffe28a', 0.6, 3)));
      g.add(new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.1, 16).translate(0, H + 1.95, 0), plain(r.roofColor)));
      return { body, top: H + 2.5, eave: H, front: 1.9, width: 3.8 };
    },
    rocket(g, r, h) {
      const H = Math.max(h, 3);
      const rad = 1.25;
      const lift = 0.7;
      const c = windowCylinder(rad, rad, H, r.wall, lift);
      g.add(c);
      g.add(new THREE.Mesh(new THREE.ConeGeometry(rad, 2.6, 28).translate(0, lift + H + 1.3, 0), plain(r.roofColor)));
      for (let i = 0; i < 3; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 1.3).translate(0, 0.95, rad + 0.45), plain(r.accent));
        fin.rotation.y = (i * Math.PI * 2) / 3 + Math.PI;
        g.add(fin);
      }
      g.add(door(r.door, rad - 0.02, 0.9, lift));
      return { body: c.userData.body, top: lift + H + 2.6, eave: lift + H, front: rad, width: 2 * rad + 1.8 };
    },
    igloo(g, r, h) {
      const rad = 2.2;
      const sy = Math.max(1, h / rad);
      const ice = plain(r.wall, { roughness: 0.35 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(rad, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), ice);
      body.geometry.scale(1, sy, 1);
      g.add(body);
      const lines = plain(new THREE.Color(r.wall).multiplyScalar(0.82).getStyle());
      for (let i = 1; i < 4; i++) {
        const y = (i / 4) * rad * sy;
        const rr = rad * Math.sqrt(1 - (i / 4) ** 2) + 0.02;
        g.add(new THREE.Mesh(new THREE.TorusGeometry(rr, 0.04, 6, 40).rotateX(Math.PI / 2).translate(0, y, 0), lines));
      }
      const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.3, 16, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, 0, rad - 0.1), ice);
      g.add(tunnel, door(r.door, rad + 0.55, 0.75));
      return { body, top: rad * sy, eave: rad * sy, front: rad + 0.6, width: rad * 2 };
    },
    glass(g, r, h) {
      const w = 4.0;
      const glass = plain(r.wall, { roughness: 0.12, metalness: 0.35 });
      const body = new THREE.Mesh(box(w, h, w), glass);
      g.add(body);
      const slab = plain('#e9edf2');
      const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(w + 0.12, 0.12, w + 0.12), slab, Math.max(1, Math.round(h / FLOOR_H)));
      const m = new THREE.Matrix4();
      for (let f = 0; f < slabs.count; f++) slabs.setMatrixAt(f, m.makeTranslation(0, (f + 1) * FLOOR_H - 0.06, 0));
      g.add(slabs);
      // lit windows at night: a glowing core behind the glass
      g.add(new THREE.Mesh(box(w - 0.3, h - 0.1, w - 0.3), glowing(r.accent, 0, 0.5)));
      g.add(door(r.door, w / 2, 1.2));
      return { body, top: roof(g, r.roof === 'pointed' ? 'flat' : r.roof, r.roofColor, w, w, h), eave: h, front: w / 2, width: w };
    },
  };

  // ---------- extras ----------
  // Yard spots (house faces +z). The lot is 6x6 with the house in the middle.
  const EXTRAS = {
    flag(g, r, s) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4, 6).translate(0, 2, 0), WHITE);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.04).translate(0.62, 3.55, 0), plain(r.accent));
      const f = new THREE.Group();
      f.add(pole, flag);
      f.position.set(2.45, 0.27, 2.45);
      g.add(f);
      return { tick: (t) => { flag.rotation.y = Math.sin(t * 3) * 0.25; } };
    },
    flowers(g, r, s) {
      const colors = ['#ff5d8f', '#ffd23f', '#a06cff', r.accent];
      for (const side of [-1, 1]) {
        const x0 = side * (s.width / 2 + 0.1) - side * 0.9;
        g.add(new THREE.Mesh(box(1.4, 0.18, 0.5, 0.27).translate(x0, 0, s.front + 0.5), WOOD));
        for (let i = 0; i < 5; i++) {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), plain(colors[(i + (side > 0 ? 1 : 0)) % colors.length]));
          fl.position.set(x0 - 0.55 + i * 0.27, 0.55, s.front + 0.5 + ((i % 2) - 0.5) * 0.18);
          g.add(fl);
        }
      }
    },
    fence(g) {
      const pick = new THREE.BoxGeometry(0.1, 0.7, 0.06).translate(0, 0.62, 0);
      const spots = [];
      for (let k = -2.8; k <= 2.8; k += 0.35) {
        spots.push([k, -2.85, 0]);
        if (Math.abs(k) > 0.8) spots.push([k, 2.85, 0]); // gap in front for the path
        spots.push([-2.85, k, Math.PI / 2], [2.85, k, Math.PI / 2]);
      }
      const im = new THREE.InstancedMesh(pick, WHITE, spots.length);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
      spots.forEach(([x, z, rot], i) => im.setMatrixAt(i, m.compose(new THREE.Vector3(x, 0, z), q.setFromAxisAngle(up, rot), one)));
      im.castShadow = true;
      g.add(im);
    },
    'solar-panels'(g) {
      const p = new THREE.Group();
      for (let i = 0; i < 2; i++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.7), plain('#1d3557', { metalness: 0.5, roughness: 0.25 }));
        panel.position.set(-0.6 + i * 1.2, 0.75, 0);
        panel.rotation.x = -0.6;
        const leg = new THREE.Mesh(box(0.06, 0.7, 0.06, 0.27), DARK);
        leg.position.set(-0.6 + i * 1.2, 0, 0.1);
        p.add(panel, leg);
      }
      p.position.set(0, 0, -2.55);
      p.rotation.y = Math.PI;
      g.add(p);
    },
    smoke(g, r, s) {
      const x = Math.min(1.0, s.width / 2 - 0.5);
      g.add(new THREE.Mesh(box(0.45, 1.6, 0.45, s.eave - 0.2).translate(x, 0, -0.6), plain('#9b5b48')));
      const puffs = [];
      for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), STEAM);
        p.castShadow = false;
        g.add(p);
        puffs.push(p);
      }
      const y0 = s.eave + 1.5;
      return {
        top: y0 + 2,
        tick: (t) => puffs.forEach((p, i) => {
          const k = (t * 0.4 + i / puffs.length) % 1;
          p.position.set(x + k * 0.6, y0 + k * 2.2, -0.6 - k * 0.3);
          p.scale.setScalar(0.5 + k * 1.2);
        }),
      };
    },
    'fairy-lights'(g, r, s) {
      const mat = glowing(r.accent, 0.4, 3);
      const n = 11;
      for (let side = 0; side < 2; side++) {
        for (let i = 0; i < n; i++) {
          const k = i / (n - 1);
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat);
          b.position.set(-s.width / 2 + k * s.width, s.eave - 0.25 - Math.sin(k * Math.PI) * 0.25, (side ? -1 : 1) * (s.front + 0.08));
          b.castShadow = false;
          g.add(b);
        }
      }
    },
    statue(g) {
      const st = new THREE.Group();
      st.add(new THREE.Mesh(box(0.8, 0.5, 0.8, 0.27), plain('#d9d6cf')));
      st.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.9, 10).translate(0, 1.22, 0), GOLD));
      st.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10).translate(0, 1.85, 0), GOLD));
      st.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6).rotateZ(-0.6).translate(0.3, 1.75, 0), GOLD));
      st.position.set(-2.45, 0, 0.2);
      g.add(st);
    },
    fountain(g) {
      const f = new THREE.Group();
      f.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.35, 20).translate(0, 0.45, 0), WHITE));
      f.add(new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.05, 20).translate(0, 0.6, 0), WATER));
      f.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 8).translate(0, 0.9, 0), WHITE));
      const jet = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), WATER);
      jet.position.y = 1.3;
      f.add(jet);
      f.position.set(-2.2, 0, 2.2);
      g.add(f);
      return { tick: (t) => { jet.scale.y = 1 + Math.sin(t * 6) * 0.35; } };
    },
    'satellite-dish'(g, r, s) {
      const d = new THREE.Group();
      d.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6).translate(0, 0.3, 0), DARK));
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), WHITE);
      dish.rotation.x = Math.PI + 0.7;
      dish.position.y = 0.95;
      d.add(dish);
      d.position.set(-Math.min(1.0, s.width / 2 - 0.5), s.eave, 0.6);
      g.add(d);
    },
    windmill(g, r) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.6, 8).translate(0, 1.8, 0), WHITE));
      const blades = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.04).translate(0, 0.55, 0), plain(r.accent));
        b.rotation.z = (i * Math.PI * 2) / 3;
        blades.add(b);
      }
      blades.position.set(0, 3.6, 0.15);
      w.add(blades);
      w.position.set(2.45, 0.27, -2.4);
      g.add(w);
      return { tick: (t) => { blades.rotation.z = t * 2.2; } };
    },
    hearts(g, r, s) {
      const heart = new THREE.Shape();
      heart.moveTo(0, -0.35);
      heart.bezierCurveTo(-0.6, 0.05, -0.35, 0.5, 0, 0.22);
      heart.bezierCurveTo(0.35, 0.5, 0.6, 0.05, 0, -0.35);
      const geo = new THREE.ExtrudeGeometry(heart, { depth: 0.14, bevelEnabled: false }).translate(0, 0, -0.07);
      const mat = glowing(r.accent, 0.35, 1.6);
      const hs = [0, 1, 2].map((i) => {
        const h = new THREE.Mesh(geo, mat);
        h.scale.setScalar(1 - i * 0.2);
        g.add(h);
        return h;
      });
      const y0 = s.top + 1.2;
      return {
        top: y0 + 1.6,
        tick: (t) => hs.forEach((h, i) => {
          h.position.set((i - 1) * 0.9, y0 + i * 0.35 + Math.sin(t * 2 + i) * 0.2, 0);
          h.rotation.y = Math.sin(t + i) * 0.6;
        }),
      };
    },
    star(g, r, s) {
      const shape = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        const rr = i % 2 ? 0.32 : 0.8;
        i ? shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      const st = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false }).translate(0, 0, -0.09), glowing(r.accent, 0.5, 2.6));
      const y = s.top + 1.0;
      st.position.y = y;
      g.add(st);
      return { top: y + 0.9, tick: (t) => { st.rotation.y = t * 1.2; } };
    },
  };

  /**
   * Builds a custom house with `floors` floors.
   * @returns {{ group: THREE.Group, body: THREE.Mesh, height: number, roofTop: number, tick?: (t:number)=>void }}
   */
  function build(recipe, floors) {
    const r = cleanHouseRecipe(recipe);
    const g = new THREE.Group();
    const h = Math.max(1, floors) * FLOOR_H;
    const s = (SHAPES[r.shape] || SHAPES.classic)(g, r, h);
    const ticks = [];
    let top = s.top;
    for (const e of r.extras) {
      const out = EXTRAS[e]?.(g, r, { ...s, top });
      if (out?.tick) ticks.push(out.tick);
      if (out?.top) top = Math.max(top, out.top);
    }
    g.traverse((o) => {
      if (o.isMesh && o.material !== STEAM && !o.material.emissiveIntensity) { o.castShadow = true; o.receiveShadow = true; }
    });
    return { group: g, body: s.body, height: s.eave, roofTop: top, tick: ticks.length ? (t) => ticks.forEach((f) => f(t)) : null };
  }

  return { build };
}
