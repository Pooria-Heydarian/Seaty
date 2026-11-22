// Christmas in Seaty, after Zurich at Christmas: snow on the ground and the trees, a big Christmas tree with a
// Christmas market on the Münsterhof square by the river, the "Lucy" light tubes hanging over Bahnhofstrasse, stars
// over the Niederdorf lane, light garlands on the bridges, floating candles on the river (like the Lichterschwimmen),
// a second market at Central, falling snow, and Santa's sleigh circling over the city.
//
// On by itself from 20 November (when Zurich switches its Christmas lights on) to 6 January.
// ?xmas=1 forces it on, ?xmas=0 off (for previews and checks).

import * as THREE from 'three';
import { PITCH, BLOCK, LOT_OFFSETS } from './layout.js';

/** Is it Christmas time? */
export function isChristmas(date = new Date(), search = (typeof location !== 'undefined' ? location.search : '')) {
  const q = new URLSearchParams(search).get('xmas');
  if (q === '1') return true;
  if (q === '0') return false;
  const m = date.getMonth(), d = date.getDate();
  return (m === 10 && d >= 20) || m === 11 || (m === 0 && d <= 6);
}

/** Christmas tab icon: swaps the page's favicon for the festive one (favicon-xmas.svg / -32.png). */
export function festiveIcon() {
  if (typeof document === 'undefined') return;
  for (const l of document.querySelectorAll('link[rel="icon"]')) {
    const href = l.getAttribute('href') || '';
    if (href.endsWith('favicon.svg')) l.setAttribute('href', href.replace('favicon.svg', 'favicon-xmas.svg'));
    else if (href.endsWith('favicon-32.png')) l.setAttribute('href', href.replace('favicon-32.png', 'favicon-xmas-32.png'));
  }
}

/** The snowy colour of each ground material (world.js tags them with userData.snow). */
function snowGround(scene) {
  scene.traverse((o) => {
    if (!o.isMesh || !o.userData.snow) return;
    o.material.color.set(o.userData.snow);
    if (o.isInstancedMesh && o.instanceColor && o.userData.snowInstances) {
      const c = new THREE.Color();
      for (let i = 0; i < o.count; i++) {
        c.set(o.userData.snowInstances).offsetHSL(0, 0, ((i * 37) % 7) * 0.006 - 0.02);
        o.setColorAt(i, c);
      }
      o.instanceColor.needsUpdate = true;
    }
  });
}

/**
 * Decorate the city. `glow(color, day, night)` makes a material that shines more at night (world.js keeps it in
 * step with day and night). Returns tick(seconds) for the moving parts.
 */
export function decorate(world, glow) {
  const scene = world.scene;
  const L = world.layout;
  const ticks = [];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const up = V(0, 1, 0);
  const mat4 = (x, y, z, rotY = 0, s = [1, 1, 1]) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(up, rotY), V(...s));
  const rnd = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const instanced = (geo, material, list) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, material, list.length);
    list.forEach((m, i) => im.setMatrixAt(i, m));
    scene.add(im);
    return im;
  };
  const blockAt = (x, z) => L.blocks.find((b) => b.x === x && b.z === z);

  snowGround(scene);

  // ---- the big Christmas tree on the Münsterhof square (by the river, next to the Fraumünster) ----
  const square = [0, 3];
  const tx = square[0] * PITCH, tz = square[1] * PITCH, ty = 0.24;
  const tree = new THREE.Group();
  const needles = new THREE.MeshStandardMaterial({ color: '#1f5a36', roughness: 0.9, flatShading: true });
  const snowCap = new THREE.MeshStandardMaterial({ color: '#f4f8fa', roughness: 1, flatShading: true });
  tree.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 3, 8).translate(0, 1.5, 0), new THREE.MeshStandardMaterial({ color: '#6b4a2f' })));
  const tiers = 6;
  const tierInfo = [];
  for (let i = 0; i < tiers; i++) {
    const r = 4.6 * (1 - i * 0.14), h = 6.2 - i * 0.35, y = 2.2 + i * 3.7;
    tree.add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 10).translate(0, y + h / 2, 0), needles));
    // a little snow on each tier's tips
    tree.add(new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, h * 0.3, 10).translate(0, y + h * 0.78, 0), snowCap));
    tierInfo.push({ r, h, y });
  }
  const top = tierInfo[tiers - 1].y + tierInfo[tiers - 1].h;
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.3, 0), glow('#ffd34d', 1.2, 4));
  star.scale.set(1, 1.25, 0.45);
  star.position.y = top + 1.1;
  tree.add(star);
  // lights: warm white and red in a spiral round the tree, gold and red baubles in between
  const warm = [], red = [], baubles = [];
  tierInfo.forEach(({ r, h, y }, i) => {
    const n = 34 - i * 4;
    for (let k = 0; k < n; k++) {
      const f = k / n, a = f * Math.PI * 2 * 1.5 + i, yy = y + 0.6 + f * (h * 0.7), rr = r * (1 - (yy - y) / h) + 0.15;
      const m = mat4(Math.cos(a) * rr, yy, Math.sin(a) * rr);
      (k % 3 === 0 ? red : warm).push(m);
    }
    for (let k = 0; k < 10 - i; k++) {
      const a = rnd() * Math.PI * 2, yy = y + 0.5 + rnd() * h * 0.5, rr = r * (1 - (yy - y) / h) + 0.2;
      baubles.push(mat4(Math.cos(a) * rr, yy, Math.sin(a) * rr));
    }
  });
  const bulb = new THREE.SphereGeometry(0.17, 8, 6);
  const tw = new THREE.InstancedMesh(bulb, glow('#fff1c2', 0.9, 3.5), warm.length);
  warm.forEach((m, i) => tw.setMatrixAt(i, m));
  const tr = new THREE.InstancedMesh(bulb, glow('#ff4a4a', 0.9, 3), red.length);
  red.forEach((m, i) => tr.setMatrixAt(i, m));
  const tb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.7, roughness: 0.25 }), baubles.length);
  baubles.forEach((m, i) => { tb.setMatrixAt(i, m); tb.setColorAt(i, new THREE.Color(i % 2 ? '#c8102e' : '#d4af37')); });
  tree.add(tw, tr, tb);
  tree.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) o.castShadow = true; });
  tree.position.set(tx, ty, tz);
  scene.add(tree);
  // a warm glow on the tree at night
  const treeLight = new THREE.PointLight('#ffcf8a', 0, 26, 1.6);
  treeLight.position.set(tx + 6, 14, tz + 6);
  scene.add(treeLight);
  ticks.push((t) => {
    star.rotation.y = t * 0.6;
    tw.material.emissiveIntensity = (world.night ? 3.5 : 0.9) * (0.85 + 0.15 * Math.sin(t * 3));
    treeLight.intensity = world.night ? 260 : 0;
  });
  world.christmasTree = tree;

  // ---- the power plant dressed for Christmas (asked for by @TheplantWorker): strings of lights from a star on top
  // down to the ground all round it, like a giant light tree ----
  {
    const plant = [...world.landmarks.values()].find((l) => l.def.type === 'power-plant');
    if (plant) {
      const bb = new THREE.Box3().setFromObject(plant.outer);
      const c = bb.getCenter(new THREE.Vector3());
      const topY = bb.max.y + 1.5;
      const rx = (bb.max.x - bb.min.x) / 2 + 1, rz = (bb.max.z - bb.min.z) / 2 + 1;
      const bulbsW = [], bulbsR = [], bulbsG = [];
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const end = new THREE.Vector3(c.x + Math.cos(a) * rx, 0.3, c.z + Math.sin(a) * rz);
        const top = new THREE.Vector3(c.x, topY, c.z);
        for (let k = 1; k < 26; k++) {
          const f = k / 26;
          const p = top.clone().lerp(end, f);
          p.y -= Math.sin(Math.PI * f) * 1.2; // a little sag
          (k % 3 === 0 ? bulbsR : k % 3 === 1 ? bulbsW : bulbsG).push(mat4(p.x, p.y, p.z));
        }
      }
      const geo = new THREE.SphereGeometry(0.32, 6, 5);
      instanced(geo, glow('#fff1c2', 0.7, 3.4), bulbsW);
      instanced(geo, glow('#ff4a4a', 0.7, 3), bulbsR);
      instanced(geo, glow('#4cd964', 0.7, 3), bulbsG);
      const pstar = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), glow('#ffd34d', 1.2, 4));
      pstar.scale.set(1, 1.25, 0.45);
      pstar.position.set(c.x, topY + 1.6, c.z);
      scene.add(pstar);
      ticks.push((t) => { pstar.rotation.y = t * 0.5; });
    }
  }

  // ---- Christmas market huts: two rows on the lawn next to the tree, and a little market on the Central square ----
  const huts = [];
  const market = [-1, 3];
  const mx = market[0] * PITCH, mz = market[1] * PITCH;
  for (const sx of [-1, 1]) for (const dz of [-4.2, -1.4, 1.4, 4.2]) huts.push({ x: mx + sx * 2.6, z: mz + dz, rot: -sx * Math.PI / 2 });
  // clear the market lawn's trees for the huts
  scene.traverse((o) => {
    if (!o.isInstancedMesh || !o.userData.trees) return;
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      p.setFromMatrixPosition(m);
      if (Math.abs(p.x - mx) < BLOCK / 2 + 0.5 && Math.abs(p.z - mz) < BLOCK / 2 + 0.5) { m.makeScale(0, 0, 0); o.setMatrixAt(i, m); }
    }
    o.instanceMatrix.needsUpdate = true;
  });
  const central = [3, -3];
  for (const [ox, oz] of LOT_OFFSETS) huts.push({ x: central[0] * PITCH + ox * 1.15, z: central[1] * PITCH + oz * 1.15, rot: Math.atan2(-ox, -oz) });
  const wood = new THREE.MeshStandardMaterial({ color: '#8a5a3a', roughness: 0.9 });
  const counterGlow = glow('#ffd58a', 0.5, 2.6);
  for (const h of huts) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 1.7).translate(0, 0.85, 0), wood));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.55, 2.6, 3, 1).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), snowCap);
    roof.scale.set(1, 0.55, 1);
    roof.position.y = 2.15;
    roof.rotation.y = Math.PI / 2;
    g.add(roof);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 0.12).translate(0, 1.25, 0.87), counterGlow));
    g.position.set(h.x, 0.24, h.z);
    g.rotation.y = h.rot;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
  }

  // ---- "Lucy" over Bahnhofstrasse: rows of thin light tubes hanging from wires across the street ----
  const tubes = [], wires = [];
  const stars = [];
  for (const b of L.blocks) {
    if (b.kind !== 'promenade') continue;
    const cx = b.x * PITCH, cz = b.z * PITCH, az = b.along === 'z';
    for (const t of [-6, -3, 0, 3, 6]) {
      const wx = az ? cx : cx + t, wz = az ? cz + t : cz;
      wires.push(mat4(wx, 7.4, wz, az ? 0 : Math.PI / 2));
      if (b.street === 'Bahnhofstrasse') {
        for (let s = -4.8; s <= 4.81; s += 0.8) {
          const len = 0.8 + rnd() * 2.2;
          tubes.push(mat4(az ? wx + s : wx, 7.4 - len / 2, az ? wz : wz + s, 0, [1, len, 1]));
        }
      } else {
        // the Niederdorf: big golden stars over the lane
        for (const s of [-3, 0, 3]) stars.push(mat4(az ? wx + s : wx, 6.4, az ? wz : wz + s, az ? 0 : Math.PI / 2));
      }
    }
  }
  instanced(new THREE.BoxGeometry(10.4, 0.04, 0.04), new THREE.MeshStandardMaterial({ color: '#2b2f36' }), wires);
  instanced(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), glow('#e8f6ff', 0.7, 3.2), tubes);
  const starGeo = new THREE.OctahedronGeometry(0.6, 0);
  starGeo.scale(1, 1.2, 0.35);
  instanced(starGeo, glow('#ffcf4a', 0.8, 3), stars);

  // ---- light garlands on the bridges ----
  const garland = [];
  for (const br of world.bridges || []) {
    const [ax, az] = br.a, [bx, bz] = br.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len;
    for (const sd of [-1, 1]) {
      const ox = -uz * sd * (br.width / 2 - 0.15), oz = ux * sd * (br.width / 2 - 0.15);
      for (let s = 0.4; s < len; s += 0.9) garland.push(mat4(ax + ux * s + ox, 0.75 + Math.sin(s * 1.7) * 0.06, az + uz * s + oz));
    }
  }
  instanced(new THREE.SphereGeometry(0.13, 6, 5), glow('#fff0b8', 0.8, 3.2), garland);

  // ---- floating candles on the river ----
  const candles = [];
  const R = L.river || [];
  const lake = L.lake || [];
  const inLake = (x, z) => {
    let inside = false;
    for (let i = 0, j = lake.length - 1; i < lake.length; j = i++) {
      const [xi, zi] = lake[i], [xj, zj] = lake[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
  for (let i = 1; i < R.length; i++) {
    const [ax, az] = R[i - 1], [bx, bz] = R[i], len = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < len && candles.length < 260; s += 2.2) {
      const nx = -(bz - az) / len, nz = (bx - ax) / len, side = (rnd() - 0.5) * (L.riverWidth - 2);
      const x = ax + ((bx - ax) * s) / len + nx * side, z = az + ((bz - az) * s) / len + nz * side;
      if (inLake(x, z) || Math.hypot(x, z) > 18 * PITCH) continue;
      candles.push({ x, z, ph: rnd() * 6 });
    }
  }
  if (candles.length) {
    const cm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 6, 5), glow('#ffb84a', 1, 3.6), candles.length);
    scene.add(cm);
    const place = (t) => {
      candles.forEach((c, i) => cm.setMatrixAt(i, mat4(c.x, 0.12 + Math.sin(t * 1.5 + c.ph) * 0.04, c.z)));
      cm.instanceMatrix.needsUpdate = true;
    };
    place(0);
    ticks.push(place);
  }

  // ---- falling snow (positions follow from the time, so the Short renders the same every time) ----
  const N = 5000, span = Math.max(260, world.radius * 3), H = 70;
  const flakes = [];
  for (let i = 0; i < N; i++) flakes.push({ x: (rnd() - 0.5) * span, z: (rnd() - 0.5) * span, y: rnd() * H, v: 2 + rnd() * 2.5, ph: rnd() * 6 });
  const pos = new Float32Array(N * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const c2 = cv.getContext('2d');
  const grad = c2.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  c2.fillStyle = grad;
  c2.fillRect(0, 0, 32, 32);
  const snow = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.95, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, opacity: 0.95 }));
  snow.frustumCulled = false;
  scene.add(snow);
  const fall = (t) => {
    flakes.forEach((f, i) => {
      pos[i * 3] = f.x + Math.sin(t * 0.7 + f.ph) * 1.2;
      pos[i * 3 + 1] = (((f.y - t * f.v) % H) + H) % H;
      pos[i * 3 + 2] = f.z + Math.cos(t * 0.5 + f.ph) * 1.2;
    });
    geo.attributes.position.needsUpdate = true;
  };
  fall(0);
  ticks.push(fall);

  // ---- Santa's sleigh with eight reindeer, circling over the city ----
  const sleigh = new THREE.Group();
  const redM = new THREE.MeshStandardMaterial({ color: '#c8102e', roughness: 0.5 });
  const goldM = new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.6, roughness: 0.3 });
  const brown = new THREE.MeshStandardMaterial({ color: '#7a5233', roughness: 0.8 });
  sleigh.add(new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 3).translate(0, 0.9, 0), redM));
  sleigh.add(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 3.6).translate(0, 0.2, 0.1), goldM));
  sleigh.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 1).translate(0, 1.8, -0.6), new THREE.MeshStandardMaterial({ color: '#2e7d32' }))); // the sack
  sleigh.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8).translate(0, 2.0, 0.6), redM)); // Santa
  sleigh.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8).translate(0, 2.65, 0.6), new THREE.MeshStandardMaterial({ color: '#f1c27d' })));
  sleigh.add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 10).translate(0, 3.05, 0.6), redM));
  const deer = [];
  for (let k = 0; k < 8; k++) {
    const d = new THREE.Group();
    d.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.2).translate(0, 0.9, 0), brown));
    d.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.45).translate(0, 1.35, 0.7), brown));
    if (k === 7) d.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6).translate(0, 1.32, 0.98), glow('#ff2a2a', 2, 5))); // the red nose
    for (const sx of [-0.15, 0.15]) d.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05).translate(sx, 1.75, 0.6), brown));
    d.position.set(k % 2 ? 0.45 : -0.45, 0, 3 + Math.floor(k / 2) * 1.6);
    sleigh.add(d);
    deer.push(d);
  }
  // a lantern on the front of the sleigh, and a warm light on Santa and the reindeer at night
  sleigh.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8).translate(0.7, 1.6, 1.6), glow('#ffd58a', 1.5, 4)));
  const sleighLight = new THREE.PointLight('#ffd9a0', 0, 30, 1.4);
  sleighLight.position.set(0, 4, 4);
  sleigh.add(sleighLight);
  ticks.push(() => { sleighLight.intensity = world.night ? 180 : 0; });
  sleigh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(sleigh);
  const ringR = Math.max(70, world.radius * 0.75); // right over the city
  /** Where the sleigh is at time t, and which way it faces (the Short's camera follows it with this). */
  world.sleighAt = (t) => {
    t = Math.max(0, t);
    const a = t * 0.12;
    return { pos: new THREE.Vector3(Math.cos(a) * ringR, 40 + Math.sin(t * 0.8) * 2, Math.sin(a) * ringR), heading: -a };
  };
  ticks.push((t) => {
    const at = world.sleighAt(t);
    sleigh.position.copy(at.pos);
    sleigh.rotation.y = at.heading; // facing along the circle
    deer.forEach((d, k) => { d.position.y = Math.sin(t * 6 + k) * 0.25; });
  });
  world.sleigh = sleigh;

  return (t) => ticks.forEach((f) => f(t));
}
