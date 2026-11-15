// Yard upgrades and landmark models made in the daily sessions for requests.
// world.js merges them into UPGRADE_MODELS / LANDMARK_MODELS. Add each new type to catalog.js too.
//
//   upgrade:  () -> THREE.Object3D placed in the house's yard (house faces +z, house is 4.2 wide in a 6 x 6 lot);
//             obj.userData.tick = (t) => {} for animation
//   landmark: (def, floors) -> { group, body, height }; the block is 12 x 12, front faces the town square (+z);
//             grow with floors (the owner's floors); group.userData.tick for animation

export function createExtraModels({ THREE, M, mat, FLOOR_H, glow, shadowAll }) {
  const WHITE = M('#f7f4ee');
  const LEAF = M('#4f8f3f', { flatShading: true });
  const TRUNK = M('#7b5a3c');
  const STONE = M('#9aa0a6', { flatShading: true });
  const WATER = M('#3fb6e8', { roughness: 0.1, emissive: '#0b5c80', emissiveIntensity: 0.35 });
  const GLASS = M('#9cc7e6', { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 });
  const DARK = M('#3b4552');
  const box = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
  const mesh = (geo, m) => new THREE.Mesh(geo, m);

  // ---------------- Yard upgrades ----------------
  const upgrades = {
    /** A golden dog standing in the front yard, wagging its tail. */
    dog() {
      const fur = M('#c98b45');
      const dark = M('#3b2a1f');
      const g = new THREE.Group();
      const body = mesh(new THREE.CapsuleGeometry(0.2, 0.5, 4, 10).rotateZ(Math.PI / 2), fur);
      body.position.y = 0.42;
      const head = mesh(new THREE.SphereGeometry(0.19, 12, 10), fur);
      head.position.set(0.48, 0.66, 0);
      const snout = mesh(new THREE.BoxGeometry(0.18, 0.12, 0.14), fur);
      snout.position.set(0.66, 0.62, 0);
      const nose = mesh(new THREE.SphereGeometry(0.04, 6, 4), dark);
      nose.position.set(0.76, 0.65, 0);
      g.add(body, head, snout, nose);
      for (const z of [-0.12, 0.12]) {
        const ear = mesh(new THREE.BoxGeometry(0.08, 0.16, 0.06), M('#8a5a2c'));
        ear.position.set(0.45, 0.74, z * 1.4);
        ear.rotation.x = z > 0 ? 0.4 : -0.4;
        const eye = mesh(new THREE.SphereGeometry(0.03, 6, 4), dark);
        eye.position.set(0.63, 0.71, z * 0.7);
        g.add(ear, eye);
        for (const x of [-0.25, 0.25]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 6).translate(x, 0.16, z), fur));
      }
      const tail = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.36, 6).translate(0, 0.18, 0), fur);
      tail.position.set(-0.44, 0.48, 0);
      tail.rotation.z = 0.7;
      g.add(tail);
      shadowAll(g);
      g.position.set(0.95, 0.27, 2.65);
      g.rotation.y = -0.4;
      g.userData.tick = (t) => { tail.rotation.x = Math.sin(t * 9) * 0.5; };
      return g;
    },

    /** A red ruby and a blue sapphire: two big glowing crystals on little stone stands. */
    gems() {
      const g = new THREE.Group();
      const crystals = [];
      [['#e0115f', -0.45], ['#1f5fd6', 0.45]].forEach(([color, z]) => {
        const stand = mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.3, 8).translate(0, 0.15, 0), STONE);
        stand.position.z = z;
        const c = mesh(new THREE.OctahedronGeometry(0.34, 0), glow(color, 0.45, 2.2));
        c.scale.set(1, 1.6, 1);
        c.position.set(0, 0.95, z);
        c.castShadow = false;
        g.add(stand, c);
        crystals.push(c);
      });
      g.position.set(-2.55, 0.27, 0.3);
      g.userData.tick = (t) => crystals.forEach((c, i) => { c.rotation.y = t * 0.8 + i; c.position.y = 0.95 + Math.sin(t * 1.6 + i * 2) * 0.08; });
      return g;
    },

    /** A blossom tree covered in pink flowers. */
    'flower-tree'() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 6).translate(0, 0.6, 0), TRUNK));
      const pink = M('#f6a5c0', { flatShading: true });
      for (const [x, y, z, r] of [[0, 1.85, 0, 0.8], [-0.45, 1.6, 0.25, 0.5], [0.45, 1.65, -0.2, 0.52], [0.1, 2.25, 0.2, 0.45]]) {
        g.add(mesh(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), pink));
      }
      const petals = M('#ffffff');
      for (let i = 0; i < 14; i++) {
        const a = i * 2.3, y = 1.5 + (i % 4) * 0.25;
        g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4).translate(Math.cos(a) * 0.82, y, Math.sin(a) * 0.82), i % 3 ? petals : M('#ff5d8f')));
      }
      shadowAll(g);
      g.position.set(2.35, 0.27, -2.3);
      return g;
    },

    /** A little pond with lily pads and a flower. */
    pond() {
      const g = new THREE.Group();
      const shape = new THREE.Shape();
      shape.absellipse(0, 0, 1.25, 0.55, 0, Math.PI * 2);
      const rim = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.04 }).rotateX(-Math.PI / 2), STONE);
      const water = mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, 0.13, 0), WATER);
      rim.receiveShadow = true;
      g.add(rim, water);
      const pad = M('#5a9e47');
      for (const [x, z] of [[-0.5, 0.1], [0.35, -0.2], [0.7, 0.18]]) g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 12).translate(x, 0.15, z), pad));
      g.add(mesh(new THREE.SphereGeometry(0.07, 8, 6).translate(-0.5, 0.2, 0.1), M('#ff8fb1')));
      g.position.set(-0.15, 0.27, -2.6);
      return g;
    },

    /** A stone patio with a crackling campfire and two log benches. */
    campfire() {
      const g = new THREE.Group();
      g.add(mesh(box(1.9, 0.06, 1.5), M('#c9b9a6')));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.add(mesh(new THREE.DodecahedronGeometry(0.11, 0).translate(Math.cos(a) * 0.34, 0.12, Math.sin(a) * 0.34), STONE));
      }
      for (const r of [0.5, -0.5]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6).rotateZ(Math.PI / 2).rotateY(r).translate(0, 0.13, 0), TRUNK));
      const flames = [['#ff9a1f', 0.22, 0.42], ['#ffd23f', 0.13, 0.32], ['#ff5a1f', 0.17, 0.5]].map(([c, r, h], i) => {
        const f = mesh(new THREE.ConeGeometry(r, h, 7).translate(0, h / 2, 0), glow(c, 1.2, 3));
        f.position.set((i - 1) * 0.07, 0.12, (i % 2) * 0.06);
        f.castShadow = false;
        g.add(f);
        return f;
      });
      for (const z of [-0.62, 0.62]) g.add(mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.9, 8).rotateZ(Math.PI / 2).translate(0, 0.15, z), TRUNK));
      shadowAll(g);
      flames.forEach((f) => (f.castShadow = false));
      g.position.set(-1.95, 0.27, 2.35);
      g.userData.tick = (t) => flames.forEach((f, i) => { f.scale.set(1, 0.8 + Math.abs(Math.sin(t * 7 + i * 2)) * 0.45, 1); });
      return g;
    },

    /** A red chicken coop on legs with two chickens pecking around it. */
    chickens() {
      const g = new THREE.Group();
      const red = M('#b5523b');
      for (const x of [-0.45, 0.45]) for (const z of [-0.3, 0.3]) g.add(mesh(box(0.07, 0.35, 0.07, x, 0, z), TRUNK));
      g.add(mesh(box(1.1, 0.6, 0.75, 0, 0.35, 0), red));
      const tri = new THREE.Shape([new THREE.Vector2(-0.65, 0), new THREE.Vector2(0.65, 0), new THREE.Vector2(0, 0.42)]);
      g.add(mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.85, bevelEnabled: false }).translate(0, 0.95, -0.425), M('#6b4630', { flatShading: true })));
      g.add(mesh(box(0.3, 0.32, 0.02, 0, 0.45, 0.385), DARK));
      g.add(mesh(box(0.14, 0.03, 0.6, 0, 0.18, 0.62).rotateX(0.45), TRUNK));
      const hens = [];
      for (const [x, z, white] of [[0.0, 0.85, true], [0.35, 1.2, false]]) {
        const h = new THREE.Group();
        h.add(mesh(new THREE.SphereGeometry(0.15, 10, 8).translate(0, 0.2, 0), M(white ? '#f7f4ee' : '#c47a3a')));
        h.add(mesh(new THREE.SphereGeometry(0.09, 8, 6).translate(0.13, 0.36, 0), M(white ? '#f7f4ee' : '#c47a3a')));
        h.add(mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03).translate(0.14, 0.46, 0), M('#d62828')));
        h.add(mesh(new THREE.ConeGeometry(0.03, 0.08, 4).rotateZ(-Math.PI / 2).translate(0.24, 0.35, 0), M('#f3a712')));
        for (const zz of [-0.05, 0.05]) h.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4).translate(0, 0.05, zz), M('#f3a712')));
        h.position.set(x, 0, z);
        g.add(h);
        hens.push(h);
      }
      shadowAll(g);
      g.position.set(2.5, 0.27, -2.3);
      g.scale.setScalar(0.85);
      g.userData.tick = (t) => hens.forEach((h, i) => { h.rotation.z = Math.max(0, Math.sin(t * 3 + i * 1.7)) * -0.6; });
      return g;
    },

    /** A giant apple tree towering over the house. */
    'giant-apple-tree'() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.35, 0.55, 3.6, 8).translate(0, 1.8, 0), TRUNK));
      for (const [x, y, z, r] of [[0, 4.6, 0, 1.9], [-1.0, 4.0, 0.7, 1.2], [1.0, 4.2, -0.6, 1.25], [0.2, 5.6, 0.3, 1.1]]) {
        g.add(mesh(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), LEAF));
      }
      const apple = M('#d9302b', { roughness: 0.4 });
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39, y = 3.4 + (i % 6) * 0.42;
        const rr = 1.85 * Math.sqrt(Math.max(0.15, 1 - ((y - 4.6) / 2.2) ** 2));
        g.add(mesh(new THREE.SphereGeometry(0.2, 10, 8).translate(Math.cos(a) * rr, y, Math.sin(a) * rr), apple));
      }
      shadowAll(g);
      g.position.set(-2.3, 0.27, -2.3);
      return g;
    },
  };

  // ---------------- Landmarks ----------------
  const dy = (floors) => (floors - 1) * FLOOR_H;

  /** Floodlight mast for stadiums. */
  function floodlight(h) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, h, 6).translate(0, h / 2, 0), DARK));
    g.add(mesh(box(1.0, 0.5, 0.15, 0, h - 0.1, 0), glow('#fff6d6', 0.4, 2.5)));
    return g;
  }

  /** Stands (seating) as a sloped block: low edge on the field side (local z = 0), high at the back (z = -depth). */
  function stand(w, depth, h, color) {
    const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(depth, 0), new THREE.Vector2(depth, 0.35), new THREE.Vector2(0, h)]);
    const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(w / 2, 0, -depth);
    const g = new THREE.Group();
    g.add(mesh(geo, M(color, { flatShading: true })));
    // seat rows
    const rows = Math.max(2, Math.round(h / 0.5));
    for (let i = 1; i < rows; i++) {
      const k = i / rows;
      g.add(mesh(box(w - 0.1, 0.06, 0.08, 0, 0.35 + (h - 0.35) * k, -depth * k + 0.04), WHITE));
    }
    return g;
  }

  /** Football stadium: field with lines and goalposts, stands on all four sides, floodlights. def.color / def.accent recolour it. */
  function stadium(def, floors = 1) {
    const g = new THREE.Group();
    const H = 1.6 + dy(floors) * 0.7;
    const seat = def.color || '#2e5aa8';
    const trim = def.accent || '#f7f4ee';
    const field = mesh(box(7.2, 0.1, 4.4), M('#3f9b4a'));
    g.add(field);
    for (let i = -3; i <= 3; i++) g.add(mesh(box(0.05, 0.02, 4.2, i * 1.0, 0.1), WHITE));
    g.add(mesh(box(7.0, 0.02, 0.05, 0, 0.1, 2.1), WHITE), mesh(box(7.0, 0.02, 0.05, 0, 0.1, -2.1), WHITE));
    const post = M('#ffd23f');
    for (const x of [-3.4, 3.4]) {
      g.add(mesh(box(0.08, 1.0, 0.08, x, 0.1), post));
      g.add(mesh(box(0.08, 0.08, 1.2, x, 1.05), post));
      for (const z of [-0.6, 0.6]) g.add(mesh(box(0.08, 1.0, 0.08, x, 1.1, z), post));
    }
    for (const [w, d, x, z, r] of [[8.4, 1.8, 0, -2.3, 0], [8.4, 1.8, 0, 2.3, Math.PI], [4.6, 1.6, -3.7, 0, Math.PI / 2], [4.6, 1.6, 3.7, 0, -Math.PI / 2]]) {
      const s = stand(w, d, H, seat);
      s.position.set(x, 0, z);
      s.rotation.y = r;
      g.add(s);
    }
    // trim band on top of the stands
    for (const [w, d, x, z] of [[11.6, 0.2, 0, -4.15], [11.6, 0.2, 0, 4.15], [0.2, 8.3, -5.4, 0], [0.2, 8.3, 5.4, 0]]) g.add(mesh(box(w, 0.25, d, x, H, z), M(trim)));
    for (const x of [-5.4, 5.4]) for (const z of [-4.1, 4.1]) {
      const f = floodlight(H + 2.6);
      f.position.set(x, 0, z);
      f.lookAt(0, 0, 0);
      g.add(f);
    }
    shadowAll(g);
    return { group: g, body: field, height: H + 2.4 };
  }

  /** Baseball park: diamond, outfield, stands behind home plate, scoreboard. */
  function ballpark(def, floors = 1) {
    const g = new THREE.Group();
    const H = 1.6 + dy(floors) * 0.7;
    const seat = def.color || '#c8102e';
    g.add(mesh(box(10.5, 0.06, 10.5), M('#5aa65a')));
    const dirt = mesh(new THREE.BoxGeometry(3.2, 0.04, 3.2).rotateY(Math.PI / 4).translate(0, 0.1, 1.6), M('#c79a62'));
    g.add(dirt);
    const infield = mesh(new THREE.BoxGeometry(2.3, 0.05, 2.3).rotateY(Math.PI / 4).translate(0, 0.11, 1.6), M('#4fa85a'));
    g.add(infield);
    for (const [x, z] of [[0, 3.85], [1.6, 2.25], [0, 0.55], [-1.6, 2.25]]) g.add(mesh(box(0.22, 0.06, 0.22, x, 0.12, z), WHITE));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.12, 12).translate(0, 0.12, 2.0), M('#c79a62')));
    // stands behind home plate (wrapping the corner)
    for (const [w, x, z, r] of [[4.5, -2.3, 4.4, Math.PI * 0.75], [4.5, 2.3, 4.4, Math.PI * 1.25]]) {
      const s = stand(w, 1.5, H, seat);
      s.position.set(x, 0, z);
      s.rotation.y = r;
      g.add(s);
    }
    // outfield wall + scoreboard
    g.add(mesh(box(10, 0.6, 0.15, 0, 0.05, -4.9), M('#1f4d2b')));
    const board = mesh(box(3.2, 1.6, 0.25, 0, H + 0.6, -5.0), DARK);
    g.add(board, mesh(box(0.2, H + 0.6, 0.2, -1.2, 0, -5.0), DARK), mesh(box(0.2, H + 0.6, 0.2, 1.2, 0, -5.0), DARK));
    g.add(mesh(box(2.8, 1.1, 0.05, 0, H + 0.85, -4.86), glow('#ffd23f', 0.5, 2)));
    for (const x of [-5, 5]) {
      const f = floodlight(H + 3.2);
      f.position.set(x, 0, 3.8);
      f.lookAt(0, 0, 0);
      g.add(f);
    }
    shadowAll(g);
    return { group: g, body: dirt, height: H + 3 };
  }

  /** Theme park: turning Ferris wheel, roller coaster loop, carousel, entrance arch. */
  function themePark(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#9fcf7a')));
    // Ferris wheel (grows with floors)
    const R = 2.4 + dy(floors) * 0.35;
    const wheel = new THREE.Group();
    wheel.add(mesh(new THREE.TorusGeometry(R, 0.08, 6, 40), M('#ff5d8f')));
    const cabins = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      wheel.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, R, 4).translate(0, R / 2, 0).rotateZ(a), WHITE));
      const c = mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), M(['#ffd23f', '#3fb6e8', '#7a5cff', '#2a9d8f'][i % 4]));
      c.position.set(-Math.sin(a) * R, Math.cos(a) * R, 0);
      wheel.add(c);
      cabins.push(c);
    }
    wheel.position.set(-2.6, R + 0.6, -2.6);
    g.add(wheel);
    for (const s of [-1, 1]) g.add(mesh(new THREE.CylinderGeometry(0.08, 0.1, R + 0.9, 6).translate(0, (R + 0.9) / 2, 0).rotateX(s * 0.3).translate(-2.6, 0, -2.6), DARK));
    // roller coaster loop
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(2.6 + Math.cos(t) * 2.4, 0.5 + 1.4 + Math.sin(t * 2) * 1.2 + Math.sin(t) * 0.6, -1.6 + Math.sin(t) * 2.4));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    g.add(mesh(new THREE.TubeGeometry(curve, 160, 0.09, 6, true), M('#e63946')));
    for (let i = 0; i < 64; i += 8) {
      const p = curve.getPoint(i / 64);
      g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, p.y, 4).translate(p.x, p.y / 2, p.z), DARK));
    }
    const car = mesh(new THREE.BoxGeometry(0.5, 0.25, 0.3), M('#ffd23f'));
    g.add(car);
    // carousel
    const carousel = new THREE.Group();
    carousel.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.2, 20).translate(0, 0.1, 0), WHITE));
    carousel.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.6, 8).translate(0, 0.8, 0), M('#ffd23f')));
    const roof = new THREE.ConeGeometry(1.5, 0.9, 16).translate(0, 2.0, 0);
    carousel.add(mesh(roof, M('#e63946', { flatShading: true })));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      carousel.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 4).translate(Math.cos(a) * 1.0, 0.9, Math.sin(a) * 1.0), WHITE));
      carousel.add(mesh(new THREE.BoxGeometry(0.4, 0.25, 0.15).translate(Math.cos(a) * 1.0, 0.7, Math.sin(a) * 1.0), M(['#f7f4ee', '#c98b45'][i % 2])));
    }
    carousel.position.set(-2.4, 0, 2.6);
    g.add(carousel);
    // entrance arch
    const arch = mesh(new THREE.TorusGeometry(1.2, 0.16, 8, 20, Math.PI), M('#7a5cff'));
    arch.position.set(2.4, 0, 4.9);
    g.add(arch, mesh(box(0.3, 0.6, 0.3, 1.2, 0, 4.9), M('#7a5cff')), mesh(box(0.3, 0.6, 0.3, 3.6, 0, 4.9), M('#7a5cff')));
    shadowAll(g);
    g.userData.tick = (t) => {
      wheel.rotation.z = t * 0.25;
      cabins.forEach((c) => { c.rotation.z = -wheel.rotation.z; }); // cabins stay level
      carousel.rotation.y = t * 0.8;
      const u = (t * 0.12) % 1;
      car.position.copy(curve.getPointAt(u));
      car.lookAt(curve.getPointAt((u + 0.01) % 1));
    };
    return { group: g, body: carousel.children[0], height: 2 * R + 1 };
  }

  /** Nuclear power plant: two cooling towers with steam, a reactor dome and a turbine hall. */
  function powerPlant(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#c9c5bd')));
    const H = 5.5 + dy(floors);
    const concrete = M('#e4e1da');
    const profile = [];
    for (let i = 0; i <= 12; i++) {
      const y = (i / 12) * H;
      const k = y / H;
      profile.push(new THREE.Vector2(1.9 - 1.6 * k + 1.3 * k * k, y));
    }
    const towerGeo = new THREE.LatheGeometry(profile, 28);
    const puffs = [];
    let body = null;
    for (const x of [-2.7, 1.0]) {
      const t = mesh(towerGeo, M('#e4e1da', { side: THREE.DoubleSide }));
      t.position.set(x, 0, -2.2);
      g.add(t);
      body ||= t;
      g.add(mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 28).rotateX(Math.PI / 2).translate(x, H - 0.4, -2.2), M('#d64545')));
      for (let i = 0; i < 4; i++) {
        const p = mesh(new THREE.IcosahedronGeometry(0.9, 1), M('#ffffff', { transparent: true, opacity: 0.7 }));
        p.userData = { x, i };
        p.castShadow = false;
        g.add(p);
        puffs.push(p);
      }
    }
    // reactor dome + turbine hall
    g.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.0, 24).translate(3.4, 1.0, 2.0), concrete));
    g.add(mesh(new THREE.SphereGeometry(1.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(3.4, 2.0, 2.0), concrete));
    g.add(mesh(box(4.4, 2.2, 2.6, -1.4, 0, 2.6), M('#7fa7c9')));
    g.add(mesh(box(4.6, 0.25, 2.8, -1.4, 2.2, 2.6), DARK));
    g.add(mesh(box(2.0, 0.6, 0.06, -1.4, 1.2, 3.92), glow('#ffd23f', 0.5, 2)));
    shadowAll(g);
    puffs.forEach((p) => (p.castShadow = false));
    g.userData.tick = (t) => puffs.forEach((p) => {
      const k = (t * 0.2 + p.userData.i / 4) % 1;
      p.position.set(p.userData.x + k * 1.2, H + 0.3 + k * 3.2, -2.2 - k * 0.5);
      p.scale.setScalar(0.7 + k * 1.4);
    });
    return { group: g, body, height: H + 1 };
  }

  /** Park: paths, a fountain, trees, benches, a pond and a clock tower that grows with the floors. */
  function park(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.08, 11), M('#8fc46e')));
    const path = M('#d9cdb4');
    g.add(mesh(box(11, 0.03, 1.1, 0, 0.08), path), mesh(box(1.1, 0.03, 11, 0, 0.08), path));
    const basin = mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.4, 24).translate(0, 0.2, 0), WHITE);
    g.add(basin, mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.05, 24).translate(0, 0.38, 0), WATER));
    g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8).translate(0, 0.6, 0), WHITE));
    const jet = mesh(new THREE.SphereGeometry(0.35, 12, 8).translate(0, 1.3, 0), WATER);
    g.add(jet);
    for (const [x, z, s] of [[-3.5, -3.5, 1.2], [3.6, -3.2, 1.0], [-3.3, 3.6, 1.1], [-4.4, -1.2, 0.8], [1.8, -4.3, 0.9], [-1.8, 4.4, 0.8]]) {
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.2 * s, 6).translate(x, 0.6 * s, z), TRUNK));
      g.add(mesh(new THREE.IcosahedronGeometry(1.0 * s, 1).translate(x, 1.7 * s, z), LEAF));
    }
    // pond corner
    const pond = new THREE.Shape();
    pond.absellipse(0, 0, 1.8, 1.1, 0, Math.PI * 2);
    g.add(mesh(new THREE.ShapeGeometry(pond).rotateX(-Math.PI / 2).translate(3.3, 0.1, 3.4), WATER));
    // benches
    for (const [x, z, r] of [[-1.6, 1.6, 0], [1.6, -1.6, Math.PI], [1.6, 1.6, 0], [-1.6, -1.6, Math.PI]]) {
      const b = new THREE.Group();
      b.add(mesh(box(1.0, 0.08, 0.35, 0, 0.35), TRUNK), mesh(box(1.0, 0.35, 0.06, 0, 0.42, -0.16), TRUNK));
      for (const xx of [-0.4, 0.4]) b.add(mesh(box(0.06, 0.35, 0.3, xx, 0), DARK));
      b.position.set(x, 0, z);
      b.rotation.y = r;
      g.add(b);
    }
    // clock tower (one storey per floor of its owner)
    const th = 3 + dy(floors);
    g.add(mesh(box(0.9, th, 0.9, 4.2, 0, -4.2), M('#b5523b')));
    g.add(mesh(box(0.95, 0.95, 0.95, 4.2, th, -4.2), M('#f3e3c3')));
    for (const [x, z, ry] of [[4.2, -3.72, 0], [3.72, -4.2, -Math.PI / 2]]) {
      const face = mesh(new THREE.CircleGeometry(0.33, 20), WHITE);
      face.position.set(x, th + 0.48, z);
      face.rotation.y = ry;
      g.add(face);
    }
    g.add(mesh(new THREE.ConeGeometry(0.75, 1.0, 4).rotateY(Math.PI / 4).translate(4.2, th + 1.45, -4.2), M('#4f6d5a', { flatShading: true })));
    shadowAll(g);
    g.userData.tick = (t) => { jet.scale.y = 1 + Math.sin(t * 5) * 0.3; };
    return { group: g, body: basin, height: th + 2 };
  }

  /** Farm: red barn, silo (grows with the floors), crop rows and a fence. */
  function farm(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#a8c97a')));
    const red = M('#b8322a');
    const barn = mesh(box(4.0, 2.6, 3.2, -2.3, 0, -1.6), red);
    g.add(barn);
    const gable = new THREE.Shape([new THREE.Vector2(-2.3, 0), new THREE.Vector2(2.3, 0), new THREE.Vector2(1.4, 1.0), new THREE.Vector2(0, 1.7), new THREE.Vector2(-1.4, 1.0)]);
    g.add(mesh(new THREE.ExtrudeGeometry(gable, { depth: 3.5, bevelEnabled: false }).translate(-2.3, 2.6, -3.35), M('#5b4636', { flatShading: true })));
    // barn doors with the white X
    g.add(mesh(box(1.6, 1.8, 0.05, -2.3, 0, 0.02), M('#8f241e')));
    for (const r of [0.85, -0.85]) g.add(mesh(new THREE.BoxGeometry(0.12, 2.2, 0.04).rotateZ(r).translate(-2.3, 0.9, 0.06), WHITE));
    g.add(mesh(box(1.7, 0.12, 0.06, -2.3, 1.8, 0.05), WHITE));
    // silo
    const sh = 3.6 + dy(floors);
    g.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, sh, 20).translate(1.0, sh / 2, -2.2), M('#c9ccd1')));
    for (let y = 0.8; y < sh; y += 0.8) g.add(mesh(new THREE.TorusGeometry(0.91, 0.03, 4, 20).rotateX(Math.PI / 2).translate(1.0, y, -2.2), DARK));
    g.add(mesh(new THREE.SphereGeometry(0.9, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(1.0, sh, -2.2), M('#8a9099')));
    // crop rows
    for (let i = 0; i < 6; i++) {
      g.add(mesh(box(0.35, 0.3, 4.2, 1.0 + i * 0.75, 0.06, 2.6), M(i % 2 ? '#e0b83c' : '#5a9e47', { flatShading: true })));
    }
    // fence
    const fence = M('#f7f4ee');
    for (let x = -5.2; x <= 5.2; x += 0.8) g.add(mesh(box(0.08, 0.6, 0.08, x, 0, 5.2), fence));
    g.add(mesh(box(10.5, 0.08, 0.06, 0, 0.45, 5.2), fence));
    shadowAll(g);
    return { group: g, body: barn, height: Math.max(sh + 1, 4.5) };
  }

  /** Seedless Watermelon Factory: a factory hall with a giant watermelon slice and a "no seeds" sign. */
  function watermelonFactory(def, floors = 1) {
    const g = new THREE.Group();
    const bh = 3.4 + dy(floors);
    const hall = mesh(box(8.5, bh, 6), M('#f3e3c3'));
    g.add(hall);
    for (let f = 0; f < floors; f++) for (let i = 0; i < 4; i++) g.add(mesh(box(1.2, 0.8, 0.08, -3 + i * 2, 1.4 + f * FLOOR_H, 3.02), GLASS));
    g.add(mesh(box(2.2, 2.0, 0.1, 0, 0, 3.05), DARK));
    // giant slice on the roof
    const slice = new THREE.Group();
    slice.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.9, 32, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), M('#2f8f3a')));
    slice.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.94, 32, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), M('#f4f1c9')));
    slice.add(mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.98, 32, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), M('#ef3b4c')));
    slice.rotation.z = Math.PI / 2;
    slice.rotation.x = 0;
    slice.position.set(-1.0, bh, 0);
    g.add(slice);
    // "no seeds" sign: a seed with a red ring and slash
    const sign = new THREE.Group();
    sign.add(mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.1, 28).rotateX(Math.PI / 2), WHITE));
    sign.add(mesh(new THREE.SphereGeometry(0.32, 12, 8).scale(0.6, 1, 0.3), M('#1f1f1f')));
    sign.add(mesh(new THREE.TorusGeometry(0.85, 0.11, 8, 28), M('#d62828')));
    sign.add(mesh(new THREE.BoxGeometry(1.7, 0.2, 0.12).rotateZ(-Math.PI / 4), M('#d62828')));
    sign.position.set(2.6, bh + 1.6, 1.2);
    g.add(sign, mesh(box(0.12, 1.0, 0.12, 2.6, bh, 1.2), DARK));
    shadowAll(g);
    g.userData.tick = (t) => { sign.rotation.y = Math.sin(t * 0.8) * 0.5; };
    return { group: g, body: hall, height: bh + 2.8 };
  }

  /** Car Show: a glass showroom (one storey per floor) with cars on podiums and a pickup truck on a turntable out front. */
  function carShow(def, floors = 1) {
    const g = new THREE.Group();
    const bh = 2.8 + dy(floors);
    g.add(mesh(box(10, 0.08, 9), M('#cfd3d8')));
    const room = mesh(box(8.2, bh, 4.6, 0, 0, -1.8), GLASS);
    g.add(room);
    g.add(mesh(box(8.4, 0.3, 4.8, 0, bh, -1.8), DARK));
    for (let f = 1; f <= floors; f++) g.add(mesh(box(8.25, 0.08, 4.65, 0, f * (bh / floors) - 0.04, -1.8), M('#e9edf2')));
    g.add(mesh(box(4.0, 0.7, 0.1, 0, bh + 0.3, 0.55), glow('#ff3b3b', 0.6, 2.4)));
    const car = (color, x, z, scale = 1) => {
      const c = new THREE.Group();
      c.add(mesh(new THREE.BoxGeometry(1.7, 0.45, 0.85).translate(0, 0.38, 0), M(color, { metalness: 0.4, roughness: 0.35 })));
      c.add(mesh(new THREE.BoxGeometry(0.9, 0.38, 0.78).translate(-0.1, 0.78, 0), M('#2b3440', { metalness: 0.3, roughness: 0.2 })));
      for (const wx of [-0.55, 0.55]) for (const wz of [-0.43, 0.43]) c.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 12).rotateX(Math.PI / 2).translate(wx, 0.17, wz), DARK));
      c.position.set(x, 0.08, z);
      c.scale.setScalar(scale);
      return c;
    };
    for (const [color, x] of [['#e63946', -2.6], ['#f7f4ee', 0], ['#ffd23f', 2.6]]) {
      g.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 24).translate(x, 0.06, -2.0), WHITE));
      g.add(car(color, x, -1.9));
    }
    // pickup truck on a turntable out front
    const truck = new THREE.Group();
    const paint = M('#c0392b', { metalness: 0.4, roughness: 0.35 });
    truck.add(mesh(new THREE.BoxGeometry(2.4, 0.55, 1.05).translate(0, 0.55, 0), paint));
    truck.add(mesh(new THREE.BoxGeometry(1.0, 0.55, 0.98).translate(0.45, 1.05, 0), paint));
    truck.add(mesh(new THREE.BoxGeometry(0.06, 0.4, 0.9).translate(0.96, 1.05, 0), M('#2b3440', { metalness: 0.3, roughness: 0.2 })));
    truck.add(mesh(new THREE.BoxGeometry(1.15, 0.3, 0.95).translate(-0.6, 0.98, 0), M('#7a1e16')));
    for (const wx of [-0.8, 0.75]) for (const wz of [-0.55, 0.55]) truck.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 12).rotateX(Math.PI / 2).translate(wx, 0.26, wz), DARK));
    const turntable = new THREE.Group();
    turntable.add(mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.15, 32).translate(0, 0.08, 0), M('#f5b82e', { metalness: 0.5, roughness: 0.4 })));
    truck.position.y = 0.15;
    turntable.add(truck);
    turntable.position.set(0, 0, 2.6);
    g.add(turntable);
    shadowAll(g);
    room.castShadow = false;
    g.userData.tick = (t) => { turntable.rotation.y = t * 0.5; };
    return { group: g, body: room, height: bh + 1.2 };
  }

  return {
    upgrades,
    landmarks: { stadium, ballpark, 'theme-park': themePark, 'power-plant': powerPlant, park, farm, 'watermelon-factory': watermelonFactory, 'car-show': carShow },
  };
}
