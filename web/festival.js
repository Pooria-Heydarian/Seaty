// The Seaty festival (asked for by the owner when the channel reached 100 subscribers, Day 13): fireworks over the lake,
// a giant golden "100" with balloons, bunting over the shopping streets, hot-air balloons and a stage on the lakeside.
// Two famous visitors on a road trip (a couple in a retro convertible) stay in the city for a week: they land at the
// airport and cruise down to the lake. Inspired looks only: no logos, no names.
//
// isFestival() is true from FESTIVAL.from to FESTIVAL.to (UTC dates), or with ?fest=1 (?fest=0 turns it off).

import * as THREE from 'three';
import { PITCH } from './layout.js';

export const FESTIVAL = { from: '2026-11-24', to: '2026-12-01' };

export function isFestival(date = new Date(), search = (typeof location !== 'undefined' ? location.search : '')) {
  const q = new URLSearchParams(search).get('fest');
  if (q === '1') return true;
  if (q === '0') return false;
  const d = date.toISOString().slice(0, 10);
  return d >= FESTIVAL.from && d <= FESTIVAL.to;
}

/** A polyline you can walk along: at(d) -> { x, z, yaw }. */
function walker(pts) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
    const len = Math.hypot(bx - ax, bz - az);
    seg.push({ ax, az, bx, bz, len, start: total });
    total += len;
  }
  return {
    total,
    at(d) {
      d = Math.max(0, Math.min(total, d));
      const s = seg.find((s) => d <= s.start + s.len) || seg.at(-1);
      const k = s.len ? (d - s.start) / s.len : 0;
      return { x: s.ax + (s.bx - s.ax) * k, z: s.az + (s.bz - s.az) * k, yaw: Math.atan2(s.bx - s.ax, s.bz - s.az) };
    },
  };
}

export function festival(world, glow) {
  const scene = world.scene;
  const L = world.layout;
  const ticks = [];
  const P = (x, z) => [x * PITCH, z * PITCH];
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
  const shadow = (g) => g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const PARTY = ['#ff4f8b', '#ffd23f', '#3fd0ff', '#7bd36b', '#b388ff', '#ff7a45'];

  // ---- a giant golden "100" floating over the lakefront, with a THANK YOU banner and balloons ----
  const hundred = new THREE.Group();
  const gold = M('#ffcf3f', { metalness: 0.6, roughness: 0.3, emissive: '#7a5200', emissiveIntensity: 0.25 });
  hundred.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 11, 2.2).translate(-9, 0, 0), gold));
  hundred.add(new THREE.Mesh(new THREE.BoxGeometry(3, 2, 2.2).translate(-10, 4.6, 0).rotateZ(0), gold));
  for (const x of [-1.5, 6]) hundred.add(new THREE.Mesh(new THREE.TorusGeometry(4.0, 1.1, 12, 32).scale(0.75, 1.25, 1).translate(x, 0, 0), gold));
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 160;
  const c = cv.getContext('2d');
  c.fillStyle = '#ff4f8b'; c.fillRect(0, 0, 1024, 160);
  c.fillStyle = '#ffffff'; c.font = '900 60px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('THANK YOU, 100 CITIZENS!', 512, 84);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  hundred.add(new THREE.Mesh(new THREE.PlaneGeometry(22, 3.4).translate(-1.5, -8.6, 1.2), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.3, side: THREE.DoubleSide })));
  const balloons = [];
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10).scale(1, 1.2, 1), M(PARTY[i % PARTY.length], { roughness: 0.25, emissive: PARTY[i % PARTY.length], emissiveIntensity: 0.15 }));
    b.position.set(-13 + i * 2, 7.5 + (i % 3) * 1.3, (i % 2) * 1.5 - 0.7);
    hundred.add(b);
    balloons.push(b);
  }
  hundred.position.set(-0.5 * PITCH, 34, 6.2 * PITCH);
  hundred.rotation.y = Math.PI * 1.08; // reads from the city side, the lake and the fireworks behind it
  shadow(hundred);
  scene.add(hundred);
  world.festivalSign = hundred;
  ticks.push((t) => {
    hundred.position.y = 34 + Math.sin(t * 0.6) * 0.8;
    balloons.forEach((b, i) => { b.position.y = 7.5 + (i % 3) * 1.3 + Math.sin(t * 1.3 + i) * 0.3; });
    gold.emissiveIntensity = world.night ? 0.9 : 0.25;
  });

  // ---- bunting: strings of little triangle flags over the shopping streets ----
  const flagGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.28, 0, 0), new THREE.Vector3(0.28, 0, 0), new THREE.Vector3(0, -0.6, 0)]);
  flagGeo.computeVertexNormals();
  const flagMats = PARTY.map((col) => new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, emissive: col, emissiveIntensity: 0.2 }));
  const lists = PARTY.map(() => []);
  let fi = 0;
  for (const b of L.blocks || []) {
    if (b.kind !== 'promenade') continue;
    const cx = b.x * PITCH, cz = b.z * PITCH, az = b.along === 'z';
    for (const s of [-4.5, -1.5, 1.5, 4.5]) {
      for (let k = -4.6; k <= 4.61; k += 0.7) {
        const sag = 6.0 - (1 - (k / 4.6) ** 2) * 0.6;
        const m = new THREE.Matrix4().compose(new THREE.Vector3(az ? cx + k : cx + s, sag, az ? cz + s : cz + k), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), az ? 0 : Math.PI / 2), new THREE.Vector3(1, 1, 1));
        lists[fi++ % PARTY.length].push(m);
      }
    }
  }
  lists.forEach((list, i) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(flagGeo, flagMats[i], list.length);
    list.forEach((m, j) => im.setMatrixAt(j, m));
    scene.add(im);
  });

  // ---- hot-air balloons drifting over the city ----
  const hot = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    const cols = [PARTY[i], PARTY[(i + 2) % 6]];
    for (let s = 0; s < 8; s++) g.add(new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12, (s / 8) * Math.PI * 2, Math.PI / 4).scale(1, 1.15, 1).translate(0, 5, 0), M(cols[s % 2], { side: THREE.DoubleSide })));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.6, 0.9, 10).translate(0, 0, 0), M('#8a5a3a')));
    for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 4).translate(x, 1.6, z), M('#3b2a1f')));
    shadow(g);
    scene.add(g);
    hot.push(g);
  }
  const R = Math.max(80, (world.radius || 120) * 0.6);
  ticks.push((t) => hot.forEach((g, i) => {
    const a = t * 0.025 + i * 1.6;
    g.position.set(Math.cos(a) * R * (0.6 + i * 0.12), 38 + i * 6 + Math.sin(t * 0.3 + i) * 2, Math.sin(a) * R * (0.6 + i * 0.12));
  }));

  // ---- the festival stage on the lakeside promenade: a roof truss, lights, speakers ----
  const lz = L.zones?.lakeside || { x: 2 * PITCH, z: 6 * PITCH };
  const stage = new THREE.Group();
  stage.add(new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 7).translate(0, 0.6, 0), M('#2b2d42')));
  for (const [x, z] of [[-5.8, -3.3], [5.8, -3.3], [-5.8, 3.3], [5.8, 3.3]]) stage.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 0.4).translate(x, 4.6, z), M('#9aa0a6', { metalness: 0.6 })));
  stage.add(new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.6, 7.4).translate(0, 8.6, 0), M('#9aa0a6', { metalness: 0.6 })));
  stage.add(new THREE.Mesh(new THREE.BoxGeometry(11, 5, 0.2).translate(0, 4, -3.2), M('#14202f')));
  for (const x of [-6.8, 6.8]) stage.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 3, 1.2).translate(x, 1.5, 3), M('#1c1c1c')));
  const lamps = PARTY.map((col, i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8).translate(-5 + i * 2, 8.1, 3), glow(col, 1.2, 4));
    stage.add(m);
    return m;
  });
  stage.position.set(lz.x, 0.1, lz.z);
  shadow(stage);
  scene.add(stage);
  ticks.push((t) => lamps.forEach((m, i) => { m.visible = Math.sin(t * 6 + i * 1.3) > -0.3; }));

  // ---- fireworks over the lake (always on, bright at night) ----
  const SHELLS = 7, SPARKS = 90;
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); // seeded, so every render looks the same
  const fwCentre = new THREE.Vector3(3.5 * PITCH, 0, 9 * PITCH);
  const shells = [];
  for (let s = 0; s < SHELLS; s++) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(SPARKS * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const col = new THREE.Color(PARTY[s % PARTY.length]);
    const mat = new THREE.PointsMaterial({ color: col, size: 1.6, sizeAttenuation: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    const dirs = [];
    for (let i = 0; i < SPARKS; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
      dirs.push(new THREE.Vector3(r * Math.cos(a), u, r * Math.sin(a)).multiplyScalar(0.85 + rnd() * 0.3));
    }
    shells.push({ pts, mat, dirs, pos, period: 3.2 + (s % 3) * 0.7, offset: s * 0.83, home: new THREE.Vector3(fwCentre.x + Math.cos(s * 2.3) * 40, 0, fwCentre.z + Math.sin(s * 1.7) * 30), height: 55 + (s % 4) * 9, size: 13 + (s % 3) * 4 });
  }
  ticks.push((t) => shells.forEach((sh) => {
    const k = (((t + sh.offset) % sh.period) + sh.period) % sh.period;
    const rise = 0.9;
    for (let i = 0; i < SPARKS; i++) {
      let x, y, z;
      if (k < rise) { // the rocket going up: all sparks bunched at the head
        x = sh.home.x; z = sh.home.z; y = 4 + (sh.height - 4) * (k / rise) - (i % 10) * 0.25;
      } else {
        const e = 1 - Math.exp(-(k - rise) * 2.8);
        const d = sh.dirs[i];
        x = sh.home.x + d.x * sh.size * e; z = sh.home.z + d.z * sh.size * e; y = sh.height + d.y * sh.size * e - (k - rise) ** 2 * 2.2;
      }
      sh.pos[i * 3] = x; sh.pos[i * 3 + 1] = y; sh.pos[i * 3 + 2] = z;
    }
    sh.pts.geometry.attributes.position.needsUpdate = true;
    const fadeOut = k < rise ? 0.9 : Math.max(0, 1 - (k - rise) / (sh.period - rise - 0.2));
    sh.mat.opacity = fadeOut * (world.night ? 1 : 0.55);
    sh.mat.size = k < rise ? 1.2 : 1.9;
  }));
  world.fireworksCentre = fwCentre.clone().setY(60);

  // ---- the two visitors in their retro convertible ----
  const car = new THREE.Group();
  const paint = M('#ff3d7f', { metalness: 0.5, roughness: 0.3 });
  car.add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.7, 5.2).translate(0, 0.75, 0), paint));
  car.add(new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.18, 5.22).translate(0, 0.98, 0), M('#3fd0ff', { metalness: 0.4 }))); // the teal stripe
  car.add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 1.6).translate(0, 1.15, 1.7), paint)); // bonnet
  car.add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.35, 1.0).translate(0, 1.12, -2.0), paint)); // boot
  car.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.05).translate(0, 1.55, 0.85).rotateX(-0.35), M('#bfe6ff', { transparent: true, opacity: 0.5 }))); // windscreen
  car.add(new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.2, 2.2).translate(0, 1.0, -0.4), M('#f4ece0'))); // white seats
  for (const z of [-1.7, 1.7]) for (const x of [-1.15, 1.15]) car.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14).rotateZ(Math.PI / 2).translate(x, 0.42, z), M('#1c1c1c')));
  for (const x of [-0.75, 0.75]) car.add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 0.05).translate(x, 0.85, 2.62), glow('#fff3c4', 0.6, 3)));
  for (const x of [-0.8, 0.8]) car.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05).translate(x, 0.85, -2.62), glow('#ff2a2a', 0.5, 3)));
  const person = ({ skin, hair, top, longHair = false, beard = false, cap = null, shades = false }) => {
    const p = new THREE.Group();
    p.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.7, 0.4).translate(0, 0.35, 0), M(top))); // body
    for (const x of [-0.42, 0.42]) p.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.2).translate(x, 0.35, 0.05), M(skin))); // arms
    p.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.46).translate(0, 0.98, 0), M(skin))); // head
    p.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5).translate(0, 1.27, -0.02), M(hair))); // hair top
    if (longHair) { p.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.12).translate(0, 0.98, -0.27), M(hair))); p.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.75, 6).translate(0, 0.45, -0.32), M(hair))); }
    if (beard) p.add(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.1).translate(0, 0.8, 0.22), M(hair)));
    if (cap) { p.add(new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.52).translate(0, 1.3, 0), M(cap))); p.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.3).translate(0, 1.25, 0.38), M(cap))); }
    if (shades) p.add(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.05).translate(0, 1.02, 0.24), M('#14161c', { metalness: 0.5 })));
    for (const x of [-0.08, 0.08]) if (!shades) p.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.02).translate(x * 1.3, 1.02, 0.235), M('#14161c')));
    return p;
  };
  // the driver: short dark hair, a beard, a cap, a white tank top; the passenger: long dark hair in a braid, sunglasses, a bright top
  const driver = person({ skin: '#c98e62', hair: '#2a1d16', top: '#f4f1ea', beard: true, cap: '#3b4552' });
  driver.position.set(-0.45, 1.1, -0.3);
  const passenger = person({ skin: '#b97d55', hair: '#1c1410', top: '#ff7a45', longHair: true, shades: true });
  passenger.position.set(0.45, 1.1, -0.3);
  passenger.rotation.y = -0.25;
  car.add(driver, passenger);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18).translate(0, 0.3, 0), M('#b97d55')); // the passenger waving
  arm.position.set(0.9, 1.8, -0.25);
  car.add(arm);
  car.scale.setScalar(1.4);
  shadow(car);
  scene.add(car);
  world.visitorsCar = car;
  // the route: from the airport, down the airport road and Bahnhofstrasse, then along the lake on Seestrasse (and back)
  const route = walker([P(-2.5, -19.5), P(-2.5, -5.5), P(-2.5, -3.5), P(-3, -3.5), P(-3, 4.5), P(-4.5, 4.5), P(-5.4, 4.5), P(-5.4, 7.3), P(-2.5, 9.5)]);
  world.visitorsRoute = route;
  world.visitorsAt = null; // the Short sets a distance along the route here to steer the car; null = drive on its own
  const place = (d, back) => {
    const p = route.at(d);
    const side = back ? -1.25 : 1.25; // keep right
    car.position.set(p.x + Math.cos(p.yaw) * side, 0.05, p.z - Math.sin(p.yaw) * side);
    car.rotation.y = p.yaw + (back ? Math.PI : 0);
  };
  ticks.push((t) => {
    if (typeof world.visitorsAt === 'number') place(world.visitorsAt, false);
    else {
      const T = route.total, cyc = ((t * 9) % (2 * T) + 2 * T) % (2 * T);
      place(cyc > T ? 2 * T - cyc : cyc, cyc > T);
    }
    arm.rotation.z = -0.4 + Math.sin(t * 7) * 0.5;
  });

  return (t) => ticks.forEach((f) => f(t));
}
