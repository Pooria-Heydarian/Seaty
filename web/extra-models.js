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
      g.userData.hens = hens;
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

    /** A giant oak: thick trunk, wide dark-green crown (Day 4, @SEASALT-k7u). */
    'giant-oak-tree'() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(0.45, 0.75, 3.2, 8).translate(0, 1.6, 0), M('#5e4330', { flatShading: true })));
      for (const [r, x, z] of [[0.18, 0.5, 0.2], [0.16, -0.45, -0.2]]) g.add(mesh(new THREE.CylinderGeometry(r * 0.6, r, 1.8, 6).rotateZ(x > 0 ? -0.8 : 0.8).translate(x * 1.6, 3.0, z), M('#5e4330')));
      const oak = M('#3f6f32', { flatShading: true });
      for (const [x, y, z, r] of [[0, 4.4, 0, 2.1], [-1.4, 3.9, 0.6, 1.4], [1.5, 4.0, -0.5, 1.45], [0.4, 5.3, 0.4, 1.3], [-0.6, 4.9, -0.9, 1.2]]) {
        const c = mesh(new THREE.IcosahedronGeometry(r, 1).translate(x, y, z), oak);
        c.scale.set(1, 0.8, 1);
        g.add(c);
      }
      shadowAll(g);
      g.position.set(-2.3, 0.27, -2.3);
      return g;
    },

    /** A garage with a red sports car parked in front of it (Day 4, @TeteaLalu). */
    garage() {
      const g = new THREE.Group();
      const wall = M('#d6d3cc');
      g.add(mesh(box(1.4, 1.25, 2.0, 0, 0, 0), wall));
      g.add(mesh(box(1.55, 0.12, 2.15, 0, 1.25, 0), DARK));
      g.add(mesh(box(1.1, 0.95, 0.05, 0, 0, 1.01), M('#9aa0a6', { metalness: 0.4, roughness: 0.4 })));
      for (let i = 1; i < 5; i++) g.add(mesh(box(1.1, 0.02, 0.06, 0, i * 0.19, 1.03), DARK));
      // the sports car: low wedge body, glass, spoiler
      const car = new THREE.Group();
      const paint = M('#d62828', { metalness: 0.5, roughness: 0.3 });
      const side = new THREE.Shape([new THREE.Vector2(-0.8, 0.12), new THREE.Vector2(0.8, 0.12), new THREE.Vector2(0.82, 0.28), new THREE.Vector2(0.35, 0.36), new THREE.Vector2(0.05, 0.55), new THREE.Vector2(-0.45, 0.55), new THREE.Vector2(-0.8, 0.4)]);
      car.add(mesh(new THREE.ExtrudeGeometry(side, { depth: 0.72, bevelEnabled: false }).translate(0, 0, -0.36), paint));
      car.add(mesh(new THREE.BoxGeometry(0.5, 0.16, 0.66).translate(-0.18, 0.5, 0), M('#1d2633', { metalness: 0.3, roughness: 0.15 })));
      car.add(mesh(new THREE.BoxGeometry(0.12, 0.04, 0.74).translate(-0.78, 0.52, 0), DARK));
      for (const x of [-0.5, 0.5]) for (const z of [-0.37, 0.37]) car.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12).rotateX(Math.PI / 2).translate(x, 0.15, z), DARK));
      car.rotation.y = -Math.PI / 2;
      car.position.set(0, 0, 2.0);
      g.add(car);
      shadowAll(g);
      g.position.set(-2.6, 0.27, -0.6);
      return g;
    },

    /** A red Japanese shrine gate (torii) in front of the house (Day 4, @Get_jin_in_use). */
    torii() {
      const g = new THREE.Group();
      const red = M('#c8102e');
      for (const x of [-1.0, 1.0]) g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.0, 10).translate(x, 1.0, 0), red));
      g.add(mesh(box(2.8, 0.16, 0.24, 0, 2.0), M('#1f1f1f')));
      g.add(mesh(box(2.5, 0.14, 0.2, 0, 1.82), red));
      g.add(mesh(box(2.3, 0.12, 0.16, 0, 1.5), red));
      g.add(mesh(box(0.12, 0.32, 0.14, 0, 1.5), red));
      shadowAll(g);
      g.position.set(0, 0.27, 2.75);
      return g;
    },

    /** A little pet quail hopping in the front yard (Day 4, @mdsadiq4737). */
    quail() {
      const g = new THREE.Group();
      const brown = M('#8a6a4a');
      const bird = new THREE.Group();
      const body = mesh(new THREE.SphereGeometry(0.17, 12, 10), brown);
      body.scale.set(1.25, 0.9, 1);
      body.position.y = 0.2;
      bird.add(body);
      bird.add(mesh(new THREE.SphereGeometry(0.09, 10, 8).translate(0.17, 0.32, 0), M('#6b5236')));
      bird.add(mesh(new THREE.ConeGeometry(0.025, 0.07, 4).rotateZ(-Math.PI / 2).translate(0.27, 0.31, 0), M('#3b2a1f')));
      // the little head plume
      const plume = mesh(new THREE.SphereGeometry(0.03, 6, 4).translate(0, 0.08, 0), M('#2b2018'));
      plume.position.set(0.2, 0.39, 0);
      plume.rotation.z = 0.5;
      bird.add(plume);
      for (const z of [-0.06, 0.06]) bird.add(mesh(new THREE.SphereGeometry(0.018, 6, 4).translate(0.22, 0.34, z * 1.1), M('#111111')));
      for (const z of [-0.05, 0.05]) bird.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4).translate(0, 0.05, z), M('#d9a441')));
      for (let i = 0; i < 5; i++) bird.add(mesh(new THREE.SphereGeometry(0.025, 5, 4).translate(-0.12 + (i % 3) * 0.08, 0.26 + (i % 2) * 0.04, (i % 2 ? 1 : -1) * 0.1), M('#e9dcc4')));
      g.add(bird);
      shadowAll(g);
      g.position.set(1.3, 0.27, 2.6);
      g.scale.setScalar(1.3);
      g.userData.tick = (t) => { const k = Math.max(0, Math.sin(t * 4)); bird.position.y = k * 0.06; bird.rotation.y = Math.sin(t * 0.7) * 0.8; };
      return g;
    },

    /** A small soccer pitch with two goals beside the house (Day 4, @prabhasishbhattacharya9226). */
    'soccer-field'() {
      const g = new THREE.Group();
      g.add(mesh(box(1.1, 0.04, 3.4), M('#3f9b4a')));
      const line = WHITE;
      g.add(mesh(box(1.0, 0.01, 0.04, 0, 0.04, 0), line));
      g.add(mesh(new THREE.TorusGeometry(0.25, 0.02, 4, 20).rotateX(Math.PI / 2).translate(0, 0.05, 0), line));
      for (const z of [-1.65, 1.65]) {
        g.add(mesh(box(1.0, 0.01, 0.04, 0, 0.04, z), line));
        for (const x of [-0.3, 0.3]) g.add(mesh(box(0.04, 0.42, 0.04, x, 0.04, z), line));
        g.add(mesh(box(0.64, 0.04, 0.04, 0, 0.46, z), line));
      }
      const ball = mesh(new THREE.IcosahedronGeometry(0.07, 1), WHITE);
      g.add(ball);
      shadowAll(g);
      g.position.set(-2.6, 0.27, 0.1);
      g.userData.tick = (t) => { const z = Math.sin(t * 1.2) * 1.1; ball.position.set(Math.sin(t * 2.3) * 0.25, 0.11, z); ball.rotation.x = t * 5; };
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

  /** Cooling tower profile (hyperboloid) as a lathe geometry. */
  function coolingTower(base, H) {
    const profile = [];
    for (let i = 0; i <= 14; i++) {
      const k = i / 14;
      profile.push(new THREE.Vector2(base * (1 - 0.84 * k + 0.68 * k * k), k * H));
    }
    return new THREE.LatheGeometry(profile, 32);
  }

  /**
   * Nuclear power plant (expanded on Day 4 for @jjk-x2r): one huge cooling tower seen across the city and a smaller one,
   * reactor dome, turbine hall, an industrial block, two striped chimneys, a fence with a gated entrance,
   * and transmission pylons carrying power lines towards the city.
   */
  function powerPlant(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#c9c5bd')));
    const H = 9 + dy(floors) * 1.5; // the big tower
    const h2 = 5.5 + dy(floors);
    const concrete = M('#e4e1da', { side: THREE.DoubleSide });
    const red = M('#d64545');
    const steamMat = M('#ffffff', { transparent: true, opacity: 0.7 });
    const puffs = [];
    const towers = [[-2.3, -2.4, 2.7, H], [2.6, -3.3, 1.6, h2]];
    let body = null;
    for (const [x, z, base, th] of towers) {
      const t = mesh(coolingTower(base, th), concrete);
      t.position.set(x, 0, z);
      g.add(t);
      body ||= t;
      g.add(mesh(new THREE.TorusGeometry(base * 0.84, 0.1, 6, 32).rotateX(Math.PI / 2).translate(x, th - 0.5, z), red));
      for (let i = 0; i < 4; i++) {
        const p = mesh(new THREE.IcosahedronGeometry(base * 0.5, 1), steamMat);
        p.userData = { x, z, top: th, i, s: base / 2 };
        g.add(p);
        puffs.push(p);
      }
    }
    // reactor dome, turbine hall, industrial block
    g.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.0, 24).translate(3.6, 1.0, 1.6), concrete));
    g.add(mesh(new THREE.SphereGeometry(1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(3.6, 2.0, 1.6), concrete));
    g.add(mesh(box(4.0, 2.2, 2.4, -1.6, 0, 2.6), M('#7fa7c9')));
    g.add(mesh(box(4.2, 0.25, 2.6, -1.6, 2.2, 2.6), DARK));
    g.add(mesh(box(2.0, 0.6, 0.06, -1.6, 1.2, 3.82), glow('#ffd23f', 0.5, 2)));
    g.add(mesh(box(2.2, 2.8, 2.0, 1.0, 0, -0.4), M('#a7b0ba')));
    for (let i = 0; i < 3; i++) g.add(mesh(box(0.6, 0.1, 2.0, 0.3 + i * 0.7, 2.8).rotateX(0), DARK));
    // two tall striped chimneys
    const ch = 7.5 + dy(floors);
    for (const [x, z] of [[4.6, -1.0], [4.6, -2.2]]) {
      const n = 8;
      for (let i = 0; i < n; i++) g.add(mesh(new THREE.CylinderGeometry(0.28, 0.32, ch / n, 12).translate(x, (i + 0.5) * (ch / n), z), i % 2 ? WHITE : red));
      for (let i = 0; i < 2; i++) {
        const p = mesh(new THREE.IcosahedronGeometry(0.35, 1), M('#d9d9d9', { transparent: true, opacity: 0.6 }));
        p.userData = { x, z, top: ch, i: i * 2, s: 0.3 };
        g.add(p);
        puffs.push(p);
      }
    }
    // fence around the site with a gated entrance at the front
    const fence = M('#8d96a3', { metalness: 0.3 });
    for (const [w, d, x, z] of [[11, 0.05, 0, -5.4], [0.05, 10.8, -5.4, 0], [0.05, 10.8, 5.4, 0], [4.2, 0.05, -3.3, 5.4], [4.2, 0.05, 3.3, 5.4]]) g.add(mesh(box(w, 0.8, d, x, 0, z), fence));
    g.add(mesh(box(1.0, 1.0, 1.0, -1.7, 0, 5.0), M('#f3e3c3')));
    const barrier = mesh(box(2.0, 0.08, 0.08, 0, 0.7, 0), M('#ffd23f'));
    barrier.position.set(-0.2, 0, 5.5);
    g.add(barrier);
    // transmission pylons carrying power lines towards the city
    const pylon = (x, z) => {
      const p = new THREE.Group();
      p.add(mesh(new THREE.CylinderGeometry(0.08, 0.35, 5.2, 4).translate(0, 2.6, 0), DARK));
      p.add(mesh(box(2.0, 0.1, 0.1, 0, 4.2), DARK), mesh(box(1.4, 0.1, 0.1, 0, 4.9), DARK));
      p.position.set(x, 0, z);
      g.add(p);
    };
    pylon(3.6, 4.3);
    pylon(3.6, 9.5); // out over the road, towards the town square
    for (const [x, y] of [[-1, 4.2], [1, 4.2], [-0.7, 4.9], [0.7, 4.9]]) {
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 12.5, 4).rotateX(Math.PI / 2).translate(3.6 + x, y - 0.25, 7.0), DARK));
    }
    // substation: three big transformers with cooling fins and insulators, behind a fence (added for @jjk-x2r, Day 6)
    g.add(mesh(box(4.6, 0.08, 2.0, -3.4, 0, 4.9), M('#b9b4aa')));
    for (let i = 0; i < 3; i++) {
      const x = -4.9 + i * 1.5;
      g.add(mesh(box(0.9, 1.2, 0.8, x, 0.08, 4.9), M('#8a939c', { metalness: 0.3 })));
      for (let f = 0; f < 5; f++) g.add(mesh(box(0.06, 0.9, 0.95, x - 0.36 + f * 0.18, 0.2, 4.9), M('#6b737c')));
      for (const dx of [-0.25, 0, 0.25]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8).translate(x + dx, 1.58, 4.9), M('#c9a27e')));
    }
    for (let i = 0; i <= 15; i++) g.add(mesh(box(0.04, 0.8, 0.04, -5.7 + i * 0.31, 0.08, 6.0), M('#9aa0a6')));
    shadowAll(g);
    puffs.forEach((p) => (p.castShadow = false));
    g.userData.tick = (t) => puffs.forEach((p) => {
      const d = p.userData;
      const k = (t * 0.18 + d.i / 4) % 1;
      p.position.set(d.x + k * 1.5, d.top + 0.3 + k * 3.5, d.z - k * 0.6);
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

  // ---------------- Day 4 landmarks ----------------

  /** Mosque: prayer hall with a big central dome, four small domes and two minarets (Day 4, @MrTauntyFace). */
  function mosque(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#e9e2d3')));
    const wall = M(def.color || '#f5f0e6');
    const domeMat = M(def.accent || '#2f8f83', { roughness: 0.35, metalness: 0.2 });
    const gold = mat.gold;
    const hall = mesh(box(6.0, 3.2, 6.0, 0, 0, -0.5), wall);
    g.add(hall);
    // arches along the front
    for (let i = 0; i < 4; i++) {
      const x = -2.1 + i * 1.4;
      g.add(mesh(box(0.8, 1.6, 0.06, x, 0, 2.52), M('#3b4552')));
      g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(x, 1.6, 2.53), M('#3b4552')));
    }
    // central dome on a drum + four small corner domes
    g.add(mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.7, 28).translate(0, 3.55, -0.5), wall));
    const dome = mesh(new THREE.SphereGeometry(2.1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 3.9, -0.5), domeMat);
    dome.scale.y = 1.15;
    g.add(dome);
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 1.0, 6).translate(0, 6.6, -0.5), gold), mesh(new THREE.SphereGeometry(0.16, 10, 8).translate(0, 7.2, -0.5), gold));
    for (const x of [-2.4, 2.4]) for (const z of [-2.9, 1.9]) g.add(mesh(new THREE.SphereGeometry(0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 3.2, z), domeMat));
    // two minarets (grow with the floors)
    const mh = 7.5 + dy(floors);
    for (const x of [-4.3, 4.3]) {
      g.add(mesh(new THREE.CylinderGeometry(0.35, 0.45, mh, 12).translate(x, mh / 2, 2.0), wall));
      for (const f of [0.55, 0.85]) g.add(mesh(new THREE.CylinderGeometry(0.62, 0.5, 0.25, 14).translate(x, mh * f, 2.0), wall));
      g.add(mesh(new THREE.ConeGeometry(0.45, 1.3, 12).translate(x, mh + 0.65, 2.0), domeMat));
      g.add(mesh(new THREE.SphereGeometry(0.1, 8, 6).translate(x, mh + 1.4, 2.0), gold));
    }
    // courtyard fountain
    g.add(mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.3, 20).translate(0, 0.15, 4.0), WHITE), mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.05, 20).translate(0, 0.3, 4.0), WATER));
    shadowAll(g);
    return { group: g, body: hall, height: Math.max(7.6, mh + 1.2) };
  }

  /** Race track: an oval with kerbs, grandstand, start line, and three cars racing round (Day 4, @Kirupa_49). */
  function raceTrack(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#7fb36a')));
    const L = 4.2, R = 3.0; // straight half-length, curve radius (track centre line)
    const shape = (r) => {
      const s = new THREE.Shape();
      s.moveTo(-L, -r);
      s.lineTo(L, -r);
      s.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
      s.lineTo(-L, r);
      s.absarc(-L, 0, r, Math.PI / 2, Math.PI * 1.5, false);
      return s;
    };
    const outer = shape(R + 0.8);
    outer.holes.push(shape(R - 0.8));
    const asphalt = mesh(new THREE.ShapeGeometry(outer, 24).rotateX(-Math.PI / 2).translate(0, 0.08, 0), M('#4a4f57'));
    g.add(asphalt);
    // red/white kerb on the outside edge
    const kerbPts = shape(R + 0.85).getSpacedPoints(80);
    kerbPts.forEach((p, i) => g.add(mesh(box(0.35, 0.05, 0.12, p.x, 0.08, -p.y), i % 2 ? WHITE : M('#d62828'))));
    // start/finish line (chequered)
    for (let i = 0; i < 8; i++) g.add(mesh(box(0.2, 0.01, 0.2, 0, 0.09, R - 0.7 + i * 0.2), i % 2 ? M('#111111') : WHITE));
    // grandstand along the front straight (grows with the floors)
    const gh = 1.4 + dy(floors) * 0.6;
    const stand = mesh(box(6.0, gh, 1.2, 0, 0, R + 1.8), M('#2e5aa8'));
    g.add(stand);
    g.add(mesh(box(6.4, 0.12, 1.6, 0, gh + 0.6, R + 1.9), WHITE));
    for (const x of [-3, 3]) g.add(mesh(box(0.1, 0.6, 0.1, x, gh, R + 2.4), DARK));
    // cars
    const curve = shape(R).getSpacedPoints(200);
    const cars = ['#ffd23f', '#e63946', '#3a86ff'].map((c, i) => {
      const car = new THREE.Group();
      car.add(mesh(box(0.7, 0.2, 0.36, 0, 0.08), M(c, { metalness: 0.4, roughness: 0.3 })));
      car.add(mesh(box(0.25, 0.14, 0.25, -0.05, 0.28), DARK));
      car.add(mesh(box(0.08, 0.05, 0.4, -0.35, 0.32), DARK));
      car.userData = { off: i * 0.07, lane: (i - 1) * 0.35 };
      g.add(car);
      return car;
    });
    shadowAll(g);
    g.userData.tick = (t) => cars.forEach((car) => {
      const n = curve.length;
      const u = ((t * 0.09 + car.userData.off) % 1) * n;
      const a = curve[Math.floor(u) % n], b = curve[(Math.floor(u) + 1) % n];
      const dx = b.x - a.x, dz = -(b.y - a.y);
      const len = Math.hypot(dx, dz) || 1;
      car.position.set(a.x + (-dz / len) * car.userData.lane, 0.1, -a.y + (dx / len) * car.userData.lane);
      car.rotation.y = Math.atan2(-dz, dx);
    });
    return { group: g, body: asphalt, height: gh + 2 };
  }

  /** Circus: big striped top tent with flags, a small tent and an entrance (Day 4, @POUSALI2412). */
  function circus(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#c9d97a')));
    const H = 3.0 + dy(floors) * 0.8;
    const red = M('#d62828'), white = M('#f7f4ee'), yellow = M('#ffd23f');
    const n = 16;
    let body = null;
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      const wall = mesh(new THREE.CylinderGeometry(3.6, 3.6, H * 0.45, 6, 1, true, th, (Math.PI * 2) / n).translate(0, H * 0.225, 0), i % 2 ? white : red);
      const roof = mesh(new THREE.ConeGeometry(3.9, H * 0.75, 6, 1, true, th, (Math.PI * 2) / n).translate(0, H * 0.45 + H * 0.375, 0), i % 2 ? white : red);
      g.add(wall, roof);
      body ||= wall;
    }
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6).translate(0, H * 1.2 + 0.7, 0), DARK));
    const flag = mesh(box(0.7, 0.4, 0.03, 0.36, H * 1.2 + 1.1), yellow);
    g.add(flag);
    // entrance
    g.add(mesh(box(1.4, 1.5, 0.6, 0, 0, 3.7), yellow), mesh(box(0.9, 1.2, 0.05, 0, 0, 4.02), DARK));
    // small side tent
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * Math.PI * 2;
      g.add(mesh(new THREE.ConeGeometry(1.2, 1.6, 6, 1, false, th, Math.PI / 4).translate(3.6, 0.8, -3.4), i % 2 ? M('#3a86ff') : white));
    }
    // pennant string lights
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.add(mesh(new THREE.ConeGeometry(0.12, 0.25, 3).rotateX(Math.PI).translate(Math.cos(a) * 3.75, H * 0.43, Math.sin(a) * 3.75), [red, yellow, M('#3a86ff')][i % 3]));
    }
    shadowAll(g);
    g.userData.tick = (t) => { flag.rotation.y = Math.sin(t * 3) * 0.3; };
    return { group: g, body, height: H * 1.2 + 1.5 };
  }

  /** Airport: runway, terminal, control tower (grows with the floors), a parked plane and one circling overhead (Day 4, @Fly4Ever777). */
  function airport(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#9fbf86')));
    // runway (diagonal) with centre dashes
    const run = new THREE.Group();
    run.add(mesh(box(13.5, 0.04, 1.8, 0, 0.06), M('#3d434b')));
    for (let i = -6; i <= 6; i++) run.add(mesh(box(0.6, 0.01, 0.1, i, 0.1), WHITE));
    for (const x of [-6.4, 6.4]) for (let k = -3; k <= 3; k++) run.add(mesh(box(0.4, 0.01, 0.12, x, 0.1, k * 0.22), WHITE));
    run.rotation.y = Math.PI / 4;
    run.position.set(-0.8, 0, -0.8);
    g.add(run);
    // terminal and control tower
    const term = mesh(box(4.6, 1.8, 1.8, 2.6, 0, 3.6), M('#9cc7e6', { roughness: 0.15, metalness: 0.2 }));
    g.add(term, mesh(box(4.8, 0.2, 2.0, 2.6, 1.8, 3.6), WHITE));
    const th = 4.5 + dy(floors);
    g.add(mesh(new THREE.CylinderGeometry(0.35, 0.5, th, 12).translate(-3.6, th / 2, 3.6), WHITE));
    g.add(mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.9, 12).translate(-3.6, th + 0.45, 3.6), M('#2b6cb0', { roughness: 0.2, metalness: 0.3 })));
    g.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 12).translate(-3.6, th + 0.95, 3.6), DARK));
    g.add(mesh(new THREE.SphereGeometry(0.14, 8, 6).translate(-3.6, th + 1.15, 3.6), glow('#ff3b3b', 0.8, 3)));
    // planes
    const plane = (scale = 1) => {
      const p = new THREE.Group();
      p.add(mesh(new THREE.CapsuleGeometry(0.22, 1.8, 4, 10).rotateZ(Math.PI / 2), WHITE));
      p.add(mesh(box(0.55, 0.05, 2.4, 0.05, -0.03), M('#c9ccd1')));
      p.add(mesh(box(0.3, 0.45, 0.05, -0.95, 0.05), M('#2b6cb0')));
      p.add(mesh(box(0.3, 0.05, 0.9, -0.95, 0.1), M('#c9ccd1')));
      for (const z of [-0.6, 0.6]) p.add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.35, 8).rotateZ(Math.PI / 2).translate(0.15, -0.12, z), M('#8d96a3')));
      p.scale.setScalar(scale);
      return p;
    };
    const parked = plane(1);
    parked.position.set(2.6, 0.4, 1.6);
    parked.rotation.y = -Math.PI / 2;
    g.add(parked);
    const flying = plane(0.9);
    g.add(flying);
    shadowAll(g);
    g.userData.tick = (t) => {
      const a = t * 0.35;
      flying.position.set(Math.cos(a) * 4.5, 7.5 + Math.sin(a * 2) * 0.4, Math.sin(a) * 4.5);
      flying.rotation.set(0, -a - Math.PI / 2 + Math.PI, -0.25);
    };
    return { group: g, body: term, height: th + 1.6 };
  }

  /** Seaty Rail Transit: an elevated loop on pillars with a station and a three-car train going round (Day 4, @markchesterajeemercado3237). */
  function rail(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#bfc5cc')));
    const ty = 3.0; // track height
    const s = new THREE.Shape();
    const L = 3.2, R = 1.6;
    s.moveTo(-L, -R - 1.5); s.lineTo(L, -R - 1.5); s.absarc(L, 0, R + 1.5, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-L, R + 1.5); s.absarc(-L, 0, R + 1.5, Math.PI / 2, Math.PI * 1.5, false);
    const path = s.getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, ty, -p.y));
    const curve = new THREE.CatmullRomCurve3(path, true);
    g.add(mesh(new THREE.TubeGeometry(curve, 200, 0.28, 4, true), M('#d6d9dd')));
    for (let i = 0; i < 16; i++) {
      const p = curve.getPointAt(i / 16);
      g.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, ty, 8).translate(p.x, ty / 2, p.z), M('#a7b0ba')));
    }
    // station on the front straight (one storey per floor of its owner)
    const sh = 1.0 + dy(floors) * 0.8;
    const station = mesh(box(3.6, sh, 1.6, 0, ty + 0.25, 3.6), M('#f3f1ee'));
    g.add(station, mesh(box(4.0, 0.15, 2.0, 0, ty + 0.25 + sh, 3.6), M('#6d4c9f')));
    g.add(mesh(box(1.2, ty + 0.25, 1.0, -2.6, 0, 3.8), M('#e9e2d3')));
    g.add(mesh(box(2.4, 0.4, 0.06, 0, ty + 0.25 + sh + 0.25, 4.6), glow('#ffd23f', 0.5, 2)));
    // the train: three white cars with a purple stripe
    const cars = [0, 1, 2].map((i) => {
      const c = new THREE.Group();
      c.add(mesh(box(1.3, 0.6, 0.55, 0, 0.25), WHITE));
      c.add(mesh(box(1.32, 0.12, 0.57, 0, 0.45), M('#6d4c9f')));
      c.add(mesh(box(1.1, 0.18, 0.58, 0, 0.6), M('#1d2633', { roughness: 0.15 })));
      c.userData.i = i;
      g.add(c);
      return c;
    });
    shadowAll(g);
    g.userData.tick = (t) => cars.forEach((c) => {
      const u = (t * 0.06 - c.userData.i * 0.032 + 10) % 1;
      const p = curve.getPointAt(u), q = curve.getPointAt((u + 0.005) % 1);
      c.position.copy(p);
      c.lookAt(q.x, q.y, q.z);
      c.rotateY(-Math.PI / 2);
    });
    return { group: g, body: station, height: ty + sh + 2 };
  }

  /** Octopus aquarium: a round glass tank with a purple octopus waving its arms, on a stone base (Day 4, @Staypositivels). */
  function aquarium(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#d8e6ee')));
    const H = 3.6 + dy(floors);
    const base = mesh(new THREE.CylinderGeometry(3.0, 3.2, 1.0, 32).translate(0, 0.5, 0), M('#8f8a80', { flatShading: true }));
    g.add(base);
    g.add(mesh(new THREE.CylinderGeometry(2.6, 2.6, H, 32).translate(0, 1.0 + H / 2, 0), M('#3fb6e8', { transparent: true, opacity: 0.45, roughness: 0.05, emissive: '#0b5c80', emissiveIntensity: 0.25 })));
    g.add(mesh(new THREE.TorusGeometry(2.62, 0.1, 8, 40).rotateX(Math.PI / 2).translate(0, 1.0 + H, 0), DARK));
    // sand, rocks and seaweed
    g.add(mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.2, 32).translate(0, 1.1, 0), M('#e8d7a8')));
    for (const [x, z] of [[-1.4, 0.8], [1.5, -0.6], [0.6, 1.5]]) {
      g.add(mesh(new THREE.ConeGeometry(0.12, 1.4, 5).translate(x, 1.9, z), M('#3f8f4a')));
    }
    // the octopus
    const purple = M('#9b5de5', { roughness: 0.5 });
    const oct = new THREE.Group();
    const head = mesh(new THREE.SphereGeometry(0.6, 16, 12), purple);
    head.scale.set(1, 1.2, 1);
    head.position.y = 0.9;
    oct.add(head);
    for (const x of [-0.22, 0.22]) oct.add(mesh(new THREE.SphereGeometry(0.1, 8, 6).translate(x, 0.85, 0.52), WHITE), mesh(new THREE.SphereGeometry(0.05, 6, 4).translate(x, 0.85, 0.6), M('#111111')));
    const arms = [];
    for (let i = 0; i < 8; i++) {
      const arm = new THREE.Group();
      arm.add(mesh(new THREE.CylinderGeometry(0.04, 0.12, 1.1, 6).translate(0, -0.55, 0), purple));
      arm.rotation.y = (i / 8) * Math.PI * 2;
      arm.position.y = 0.5;
      oct.add(arm);
      arms.push(arm);
    }
    oct.position.set(0, 1.0 + H * 0.45, 0);
    g.add(oct);
    shadowAll(g);
    g.userData.tick = (t) => {
      oct.position.y = 1.0 + H * 0.45 + Math.sin(t * 0.8) * 0.3;
      oct.rotation.y = t * 0.2;
      arms.forEach((a, i) => { a.rotation.x = 0.5 + Math.sin(t * 2 + i) * 0.35; a.rotation.order = 'YXZ'; });
    };
    return { group: g, body: base, height: H + 1.6 };
  }

  /** Toy factory: a factory hall with giant toy blocks stacked on the roof and a teddy bear by the door (Day 4, @GamerGuy67x). */
  function toyFactory(def, floors = 1) {
    const g = new THREE.Group();
    const bh = 3.0 + dy(floors);
    const hall = mesh(box(8, bh, 5.5), M('#fbe7c6'));
    g.add(hall);
    for (let f = 0; f < floors; f++) for (let i = 0; i < 4; i++) g.add(mesh(box(1.1, 0.7, 0.08, -2.8 + i * 1.9, 1.2 + f * FLOOR_H, 2.79), GLASS));
    g.add(mesh(box(2.0, 1.8, 0.1, 0, 0, 2.8), M('#3a86ff')));
    // giant toy bricks on the roof (with studs)
    const colors = ['#e63946', '#ffd23f', '#3a86ff', '#2a9d8f', '#ff7a45'];
    const bricks = [[-2.2, 0, -0.8, 2.4, 1.2], [0.6, 0, -0.6, 2.4, 1.2], [-0.8, 1, -0.7, 2.4, 1.2], [2.4, 0, 0.9, 1.2, 1.2], [-0.2, 2, -0.7, 1.2, 1.2]];
    bricks.forEach(([x, layer, z, w, d], i) => {
      const y = bh + layer * 0.9;
      const m = M(colors[i % colors.length], { roughness: 0.4 });
      g.add(mesh(box(w, 0.9, d, x, y, z), m));
      for (let sx = 0; sx < Math.round(w / 0.6); sx++) for (let sz = 0; sz < 2; sz++) {
        g.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.16, 10).translate(x - w / 2 + 0.3 + sx * 0.6, y + 0.98, z - 0.3 + sz * 0.6), m));
      }
    });
    // teddy bear by the door
    const fur = M('#b07a45');
    const bear = new THREE.Group();
    bear.add(mesh(new THREE.SphereGeometry(0.55, 14, 10).translate(0, 0.6, 0), fur));
    bear.add(mesh(new THREE.SphereGeometry(0.4, 14, 10).translate(0, 1.35, 0), fur));
    for (const x of [-0.3, 0.3]) bear.add(mesh(new THREE.SphereGeometry(0.14, 8, 6).translate(x, 1.7, 0), fur), mesh(new THREE.SphereGeometry(0.16, 8, 6).translate(x * 1.8, 0.8, 0.2), fur));
    bear.add(mesh(new THREE.SphereGeometry(0.14, 8, 6).translate(0, 1.28, 0.33), M('#e9cfa8')));
    bear.position.set(2.6, 0, 3.6);
    g.add(bear);
    shadowAll(g);
    return { group: g, body: hall, height: bh + 3.0 };
  }

  /** Hospital: white building (3 storeys + one per owner floor) with a glowing red cross, helipad and ambulance (Day 4, @batuSmile75). */
  function hospital(def, floors = 1) {
    const g = new THREE.Group();
    const n = 3 + (floors - 1);
    const bh = n * FLOOR_H + 0.4;
    const block = mesh(box(7, bh, 4.5, 0, 0, -0.8), M('#f7f7f5'));
    g.add(block);
    for (let f = 0; f < n; f++) for (let i = 0; i < 6; i++) g.add(mesh(box(0.7, 0.55, 0.08, -2.75 + i * 1.1, 0.5 + f * FLOOR_H, 1.46), GLASS));
    g.add(mesh(box(2.4, 1.2, 1.2, 0, 0, 2.0), M('#e9edf2')), mesh(box(1.4, 0.95, 0.06, 0, 0, 2.62), GLASS));
    // red cross sign
    const cross = glow('#e63946', 0.6, 2.4);
    g.add(mesh(box(1.4, 0.4, 0.12, 0, bh - 1.2, 1.5), cross), mesh(box(0.4, 1.4, 0.12, 0, bh - 1.7, 1.5), cross));
    // helipad
    g.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.08, 28).translate(0, bh, -0.8), M('#3b4552')));
    const hMat = WHITE;
    g.add(mesh(box(0.15, 0.02, 1.0, -0.35, bh + 0.08, -0.8), hMat), mesh(box(0.15, 0.02, 1.0, 0.35, bh + 0.08, -0.8), hMat), mesh(box(0.7, 0.02, 0.15, 0, bh + 0.08, -0.8), hMat));
    // ambulance
    const amb = new THREE.Group();
    amb.add(mesh(box(1.5, 0.75, 0.8, 0, 0.18), WHITE), mesh(box(0.5, 0.5, 0.78, 0.95, 0.18), WHITE));
    amb.add(mesh(box(1.52, 0.12, 0.82, 0, 0.55), M('#e63946')));
    amb.add(mesh(box(0.25, 0.1, 0.3, 0, 0.98), glow('#3a86ff', 0.6, 2.5)));
    for (const x of [-0.45, 0.85]) for (const z of [-0.4, 0.4]) amb.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.1, 10).rotateX(Math.PI / 2).translate(x, 0.17, z), DARK));
    amb.position.set(3.0, 0, 3.4);
    amb.rotation.y = -0.3;
    g.add(amb);
    shadowAll(g);
    return { group: g, body: block, height: bh + 1 };
  }

  /** Space center: a tall rocket on its launch pad beside a service tower, mission control with a dish (Day 4, @GLITCHPROBGAMING). */
  function spaceCenter(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#c9c5bd')));
    const pad = mesh(box(4.0, 0.5, 4.0, -1.8, 0, -1.8), M('#8d96a3'));
    g.add(pad);
    const rh = 6.5 + dy(floors);
    const white = M('#f7f7f5');
    const rocket = new THREE.Group();
    rocket.add(mesh(new THREE.CylinderGeometry(0.55, 0.55, rh, 20).translate(0, rh / 2, 0), white));
    for (const f of [0.2, 0.55]) rocket.add(mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.3, 20).translate(0, rh * f, 0), DARK));
    rocket.add(mesh(new THREE.ConeGeometry(0.55, 1.4, 20).translate(0, rh + 0.7, 0), white));
    for (const s of [-1, 1]) {
      rocket.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, rh * 0.55, 14).translate(s * 0.85, rh * 0.275, 0), white));
      rocket.add(mesh(new THREE.ConeGeometry(0.3, 0.6, 14).translate(s * 0.85, rh * 0.55 + 0.3, 0), white));
    }
    for (let i = 0; i < 4; i++) {
      const fin = mesh(box(0.08, 0.9, 0.6, 0, 0, 0.75), M('#e63946'));
      fin.rotation.y = (i * Math.PI) / 2;
      rocket.add(fin);
    }
    rocket.position.set(-1.8, 0.5, -1.8);
    g.add(rocket);
    // service tower (red lattice) with an arm
    const tower = M('#c8102e');
    const tx = -1.8 + 1.6;
    for (const [x, z] of [[0, 0], [0.8, 0], [0, 0.8], [0.8, 0.8]]) g.add(mesh(box(0.1, rh + 1, 0.1, tx + x, 0.5, -1.8 - 0.4 + z), tower));
    for (let y = 1; y < rh + 1; y += 1) g.add(mesh(box(0.9, 0.08, 0.9, tx + 0.4, 0.5 + y, -1.8), tower));
    g.add(mesh(box(1.0, 0.12, 0.2, tx - 0.4, 0.5 + rh * 0.8, -1.8), tower));
    // mission control + dish
    const mc = mesh(box(4.0, 2.0, 2.6, 2.4, 0, 3.0), M('#e9edf2'));
    g.add(mc, mesh(box(3.6, 0.6, 0.06, 2.4, 1.1, 4.31), GLASS));
    const dish = new THREE.Group();
    dish.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.2, 8).translate(0, 0.6, 0), DARK));
    const bowl = mesh(new THREE.SphereGeometry(1.1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3.5), WHITE);
    bowl.rotation.x = Math.PI + 0.8;
    bowl.position.y = 1.9;
    dish.add(bowl);
    dish.position.set(3.4, 2.0, 2.6);
    g.add(dish);
    shadowAll(g);
    g.userData.tick = (t) => { dish.rotation.y = Math.sin(t * 0.3) * 1.2; };
    return { group: g, body: pad, height: rh + 2.5 };
  }

  // ---------------- Themed shops & public buildings (replace the generic hall) ----------------

  /** A storefront: walls with a row of windows per floor, a big shop window, door and a striped awning. Returns the main mesh. */
  function storefront(g, { w = 6, d = 4.5, h = 2.6, wall = '#f3e3c3', awning = ['#e63946', '#f7f4ee'], floors = 1, z = 0 }) {
    const H = h + dy(floors);
    const body = mesh(box(w, H, d, 0, 0, z), M(wall));
    g.add(body);
    g.add(mesh(box(w + 0.2, 0.25, d + 0.2, 0, H, z), DARK));
    const front = z + d / 2;
    g.add(mesh(box(w * 0.62, 1.3, 0.08, -w * 0.12, 0.3, front + 0.01), GLASS));
    g.add(mesh(box(0.9, 1.6, 0.08, w * 0.34, 0, front + 0.02), M('#6b4630')));
    for (let f = 1; f < floors + 1 && h + f * FLOOR_H <= H + 0.01; f++) {
      for (let i = 0; i < 3; i++) g.add(mesh(box(0.8, 0.6, 0.06, -w / 3 + (i * w) / 3, h - 0.9 + f * FLOOR_H, front + 0.01), GLASS));
    }
    // striped awning
    const n = 8;
    for (let i = 0; i < n; i++) {
      const s = mesh(new THREE.BoxGeometry(w / n, 0.06, 1.1), M(awning[i % 2]));
      s.position.set(-w / 2 + (i + 0.5) * (w / n), 1.95, front + 0.5);
      s.rotation.x = 0.35;
      g.add(s);
    }
    return { body, H, front };
  }

  /** Museum: classical temple front with columns, a triangle pediment, wide steps and banners (Museum, @theel-u7g). */
  function museum(def, floors = 1) {
    const g = new THREE.Group();
    const stone = M(def.color || '#ece6d8');
    const H = 3.6 + dy(floors);
    for (let i = 0; i < 3; i++) g.add(mesh(box(9 - i * 0.5, 0.25, 7 - i * 0.4, 0, i * 0.25, 0.3 - i * 0.1), stone));
    const body = mesh(box(8, H, 5, 0, 0.75, -0.6), stone);
    g.add(body);
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.CylinderGeometry(0.26, 0.3, H, 14).translate(-3.3 + i * 1.32, 0.75 + H / 2, 2.4), WHITE));
    g.add(mesh(box(8.6, 0.4, 1.6, 0, 0.75 + H, 2.0), stone), mesh(box(8.6, 0.35, 5.8, 0, 0.75 + H, -0.4), stone));
    const tri = new THREE.Shape([new THREE.Vector2(-4.3, 0), new THREE.Vector2(4.3, 0), new THREE.Vector2(0, 1.5)]);
    g.add(mesh(new THREE.ExtrudeGeometry(tri, { depth: 1.5, bevelEnabled: false }).translate(0, 1.15 + H, 1.3), stone));
    g.add(mesh(new THREE.ExtrudeGeometry(tri, { depth: 5.4, bevelEnabled: false }).translate(0, 1.1 + H, -3.3), M('#9a8f7d', { flatShading: true })));
    g.add(mesh(box(1.4, 2.2, 0.08, 0, 0.75, 1.92), M('#3b2a1f')));
    for (const x of [-2.6, 2.6]) g.add(mesh(box(0.7, 1.6, 0.05, x, 0.75 + H - 2.2, 1.95), M(def.accent || '#8b1e3f')));
    shadowAll(g);
    return { group: g, body, height: H + 3 };
  }

  /** Bakery: cosy shop with a striped awning, a chimney and a giant croissant on the roof (Bakery, @Staypositivels). */
  function bakery(def, floors = 1) {
    const g = new THREE.Group();
    const { body, H } = storefront(g, { wall: def.color || '#f6dfc0', awning: ['#c8553d', '#fbf3e4'], floors });
    g.add(mesh(box(0.6, 1.6, 0.6, 2.2, H, -1.2), M('#9b5b48')));
    const crust = M('#d9913a', { roughness: 0.6 });
    const croissant = new THREE.Group();
    croissant.add(mesh(new THREE.TorusGeometry(0.95, 0.45, 12, 20, Math.PI * 1.25), crust));
    for (const a of [0.15, 0.45, 0.75, 1.05]) croissant.add(mesh(new THREE.TorusGeometry(0.95, 0.47, 6, 4, 0.08).rotateZ(a * Math.PI), M('#b8742e')));
    croissant.rotation.set(-Math.PI / 2 + 0.3, 0, Math.PI * 0.12);
    croissant.position.set(-0.6, H + 1.0, 0.4);
    g.add(croissant);
    // bread loaves in the window
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CapsuleGeometry(0.16, 0.4, 4, 8).rotateZ(Math.PI / 2).translate(-2 + i * 0.75, 0.55, 2.32), crust));
    shadowAll(g);
    g.userData.tick = (t) => { croissant.position.y = H + 1.0 + Math.sin(t * 1.5) * 0.12; };
    return { group: g, body, height: H + 2.4 };
  }

  /** Fire station: red brick, three big garage doors with a fire truck, a hose-drying tower and a siren light (Fire Station, @Owen_B13). */
  function fireStation(def, floors = 1) {
    const g = new THREE.Group();
    const brick = M(def.color || '#b8322a');
    const H = 3.4 + dy(floors);
    const body = mesh(box(8, H, 5, -0.5, 0, -0.5), brick);
    g.add(body, mesh(box(8.2, 0.25, 5.2, -0.5, H, -0.5), DARK));
    for (let i = 0; i < 3; i++) {
      g.add(mesh(box(2.0, 2.3, 0.08, -3.0 + i * 2.5, 0, 2.02), WHITE));
      for (let k = 1; k < 5; k++) g.add(mesh(box(2.0, 0.03, 0.1, -3.0 + i * 2.5, k * 0.46, 2.06), M('#d9d9d9')));
    }
    g.add(mesh(box(4.0, 0.5, 0.08, -0.5, H - 0.8, 2.02), M('#f7f4ee')));
    const th = H + 2.6;
    g.add(mesh(box(1.4, th, 1.4, 4.2, 0, -1.6), brick), mesh(new THREE.ConeGeometry(1.1, 0.9, 4).rotateY(Math.PI / 4).translate(4.2, th + 0.45, -1.6), DARK));
    g.add(mesh(new THREE.SphereGeometry(0.22, 10, 8).translate(-0.5, H + 0.35, 1.6), glow('#ff3b3b', 0.8, 3)));
    // fire truck parked out front
    const truck = new THREE.Group();
    const red = M('#d62828', { metalness: 0.3, roughness: 0.4 });
    truck.add(mesh(box(2.6, 0.9, 1.0, 0, 0.25), red), mesh(box(0.8, 0.6, 0.98, 1.2, 1.15), red), mesh(box(0.06, 0.4, 0.9, 1.62, 1.2), GLASS));
    truck.add(mesh(box(2.2, 0.08, 0.3, -0.3, 1.2), M('#c9ccd1')));
    for (const x of [-0.85, 0.9]) for (const z of [-0.5, 0.5]) truck.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12).rotateX(Math.PI / 2).translate(x, 0.24, z), DARK));
    truck.position.set(-0.5, 0, 3.4);
    g.add(truck);
    shadowAll(g);
    return { group: g, body, height: th + 1 };
  }

  /** Pet store: shop with a paw-print sign, a giant bone on the roof and a dog statue by the door (Pet Store, @AverageHuman67). */
  function petStore(def, floors = 1) {
    const g = new THREE.Group();
    const { body, H } = storefront(g, { wall: def.color || '#d6ecf3', awning: ['#2a9d8f', '#f7f4ee'], floors });
    // paw print sign
    const sign = new THREE.Group();
    sign.add(mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 24).rotateX(Math.PI / 2), WHITE));
    const paw = M('#7a4a2a');
    sign.add(mesh(new THREE.SphereGeometry(0.34, 12, 8).scale(1, 0.8, 0.3).translate(0, -0.15, 0.08), paw));
    for (const [x, y] of [[-0.38, 0.22], [-0.13, 0.42], [0.13, 0.42], [0.38, 0.22]]) sign.add(mesh(new THREE.SphereGeometry(0.12, 8, 6).scale(1, 1, 0.4).translate(x, y, 0.08), paw));
    sign.position.set(0, H + 1.1, 1.6);
    g.add(sign, mesh(box(0.12, 0.8, 0.12, 0, H, 1.6), DARK));
    // giant bone
    const bone = new THREE.Group();
    bone.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 12).rotateZ(Math.PI / 2), WHITE));
    for (const x of [-1.15, 1.15]) for (const z of [-0.2, 0.2]) bone.add(mesh(new THREE.SphereGeometry(0.3, 12, 8).translate(x, 0, z), WHITE));
    bone.position.set(-1.4, H + 0.5, -0.8);
    g.add(bone);
    // dog statue
    const fur = M('#c98b45');
    const dog = new THREE.Group();
    dog.add(mesh(new THREE.SphereGeometry(0.42, 12, 10).scale(1, 1.1, 0.9).translate(0, 0.5, 0), fur), mesh(new THREE.SphereGeometry(0.3, 12, 10).translate(0.15, 1.15, 0.12), fur));
    for (const z of [-0.18, 0.18]) dog.add(mesh(new THREE.BoxGeometry(0.1, 0.3, 0.14).translate(0.05, 1.35, z), M('#8a5a2c')));
    dog.position.set(2.7, 0, 2.9);
    g.add(dog);
    shadowAll(g);
    g.userData.tick = (t) => { sign.rotation.y = Math.sin(t * 0.7) * 0.5; };
    return { group: g, body, height: H + 2.3 };
  }

  /** Corner shop: two-storey corner store with a green awning, a lit OPEN sign and crates of fruit outside (Corner Shop, @JoelEscott-c1y). */
  function cornerShop(def, floors = 1) {
    const g = new THREE.Group();
    const { body, H } = storefront(g, { w: 5, d: 4, h: 3.2, wall: def.color || '#efe3c8', awning: ['#2f7d4a', '#f7f4ee'], floors });
    g.add(mesh(box(2.0, 0.5, 0.06, -0.8, 2.45, 2.05), glow('#ff3b3b', 0.6, 2.5)));
    const fruit = [['#e63946', 0.11], ['#f3a712', 0.12], ['#7cb342', 0.11], ['#ffd23f', 0.1]];
    fruit.forEach(([c, r], i) => {
      const x = -2.0 + i * 0.95;
      g.add(mesh(box(0.8, 0.45, 0.6, x, 0, 2.8), M('#a0703f')));
      for (let k = 0; k < 6; k++) g.add(mesh(new THREE.SphereGeometry(r, 8, 6).translate(x - 0.25 + (k % 3) * 0.25, 0.52, 2.65 + Math.floor(k / 3) * 0.3), M(c)));
    });
    shadowAll(g);
    return { group: g, body, height: H + 1 };
  }

  /** Jewelry store: elegant black-and-gold shop with a giant diamond turning on the roof (Jewelry Store, @luqmanabdi8368). */
  function jewelryStore(def, floors = 1) {
    const g = new THREE.Group();
    const { body, H } = storefront(g, { wall: def.color || '#22252b', awning: ['#f5b82e', '#22252b'], floors });
    g.add(mesh(box(6.1, 0.15, 4.6, 0, 2.1), mat.gold));
    for (const x of [-2.9, 2.9]) g.add(mesh(box(0.2, H, 0.2, x, 0, 2.3), mat.gold));
    const diamond = new THREE.Group();
    const gem = glow(def.accent || '#bfe7ff', 0.45, 2.2);
    diamond.add(mesh(new THREE.ConeGeometry(1.0, 0.45, 8).rotateX(Math.PI).translate(0, 0.22, 0).rotateX(Math.PI).translate(0, 0.45, 0), gem));
    diamond.add(mesh(new THREE.ConeGeometry(1.0, 1.3, 8).rotateX(Math.PI).translate(0, -0.65, 0), gem));
    diamond.position.set(0, H + 2.0, 0);
    g.add(diamond, mesh(box(0.15, 0.7, 0.15, 0, H), mat.gold));
    // a giant ring by the door
    g.add(mesh(new THREE.TorusGeometry(0.55, 0.1, 10, 24).translate(2.6, 0.8, 2.9), mat.gold), mesh(new THREE.OctahedronGeometry(0.2).translate(2.6, 1.45, 2.9), gem));
    shadowAll(g);
    g.userData.tick = (t) => { diamond.rotation.y = t * 0.8; diamond.position.y = H + 2.0 + Math.sin(t * 1.4) * 0.15; };
    return { group: g, body, height: H + 3.2 };
  }

  /** MMA gym: gym building with a giant red glove sign, and an outdoor octagon cage (MMA Gym, @og-goat1.0). */
  function mmaGym(def, floors = 1) {
    const g = new THREE.Group();
    const H = 3.0 + dy(floors);
    const body = mesh(box(6, H, 4.2, -1.8, 0, -2.2), M(def.color || '#3b4552'));
    g.add(body, mesh(box(6.2, 0.2, 4.4, -1.8, H, -2.2), M('#1f242b')));
    g.add(mesh(box(4.8, 1.2, 0.08, -1.8, 0.4, -0.08), GLASS), mesh(box(3.6, 0.5, 0.08, -1.8, H - 0.8, -0.08), M('#e63946')));
    // boxing glove on the roof
    const glove = new THREE.Group();
    const red = M('#d62828', { roughness: 0.4 });
    glove.add(mesh(new THREE.SphereGeometry(0.9, 16, 12).scale(1, 1.1, 0.95), red), mesh(new THREE.SphereGeometry(0.38, 12, 10).translate(-0.75, -0.2, 0.25), red), mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.7, 14).translate(0, -1.2, 0), WHITE));
    glove.position.set(-1.8, H + 1.5, -2.2);
    g.add(glove);
    // octagon cage
    const oct = new THREE.Group();
    oct.add(mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.5, 8).translate(0, 0.25, 0), DARK));
    oct.add(mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.05, 8).translate(0, 0.52, 0), WHITE));
    oct.add(mesh(new THREE.CylinderGeometry(2.35, 2.35, 1.5, 8, 1, true).translate(0, 1.3, 0), M('#2b2d33', { transparent: true, opacity: 0.35, side: THREE.DoubleSide })));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      oct.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6).translate(Math.cos(a) * 2.42, 1.3, Math.sin(a) * 2.42), DARK));
    }
    oct.position.set(2.0, 0, 2.2);
    g.add(oct);
    shadowAll(g);
    g.userData.tick = (t) => { glove.rotation.y = Math.sin(t * 1.2) * 0.4; };
    return { group: g, body, height: H + 3 };
  }

  /** School: red-brick building (one storey per floor), clock over the door, flagpole, playground and a yellow school bus (School, @Onni_the_furry). */
  function school(def, floors = 1) {
    const g = new THREE.Group();
    const H = 2.8 + dy(floors);
    const brick = M(def.color || '#b5523b');
    const body = mesh(box(8, H, 3.6, 0, 0, -2.4), brick);
    g.add(body, mesh(box(8.2, 0.2, 3.8, 0, H, -2.4), DARK));
    const rows = Math.max(1, Math.round(H / 1.3));
    for (let r = 0; r < rows; r++) for (let i = 0; i < 6; i++) g.add(mesh(box(0.8, 0.7, 0.06, -3.3 + i * 1.32, 0.6 + (r * (H - 1.0)) / rows, -0.58), GLASS));
    g.add(mesh(box(1.6, 2.0, 0.08, 0, 0, -0.56), WHITE), mesh(box(1.2, 1.7, 0.08, 0, 0, -0.5), M('#3a5ba0')));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 20).rotateX(Math.PI / 2).translate(0, H - 0.5, -0.5), WHITE), mesh(box(0.05, 0.35, 0.04, 0, H - 0.4, -0.43), DARK), mesh(box(0.25, 0.05, 0.04, 0.1, H - 0.5, -0.43), DARK));
    // flagpole
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 5, 6).translate(-3.8, 2.5, 1.0), WHITE));
    const flag = mesh(box(1.0, 0.6, 0.03, -3.3, 4.2, 1.0), M(def.accent || '#3a86ff'));
    g.add(flag);
    // playground: slide + swing
    g.add(mesh(box(0.8, 1.4, 0.8, 1.6, 0, 1.4), M('#ffd23f')), mesh(new THREE.BoxGeometry(0.6, 0.06, 2.0).rotateX(0.6).translate(1.6, 0.8, 2.35), M('#e63946')));
    for (const x of [3.2, 4.4]) g.add(mesh(box(0.08, 1.6, 0.08, x, 0, 1.4), DARK));
    g.add(mesh(box(1.3, 0.08, 0.08, 3.8, 1.6, 1.4), DARK), mesh(box(0.4, 0.05, 0.25, 3.8, 0.5, 1.4), M('#3a86ff')));
    // school bus
    const bus = new THREE.Group();
    const yel = M('#f2b705', { roughness: 0.5 });
    bus.add(mesh(box(3.0, 1.0, 1.1, 0, 0.25), yel), mesh(box(2.4, 0.3, 1.12, -0.2, 0.75), GLASS), mesh(box(0.5, 0.6, 1.0, 1.7, 0.25), yel));
    for (const x of [-1.0, 1.1]) for (const z of [-0.55, 0.55]) bus.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.15, 12).rotateX(Math.PI / 2).translate(x, 0.24, z), DARK));
    bus.position.set(-1.6, 0, 3.6);
    g.add(bus);
    shadowAll(g);
    g.userData.tick = (t) => { flag.rotation.y = Math.sin(t * 3) * 0.2; };
    return { group: g, body, height: H + 2 };
  }

  /** Market: rows of open stalls with striped canopies, crates of fruit and vegetables, and a market hall that grows with the floors (Market, @hasmask9103). */
  function market(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#d9cdb4')));
    const H = 2.4 + dy(floors);
    const hall = mesh(box(9, H, 2.6, 0, 0, -3.6), M(def.color || '#e9dcc4'));
    g.add(hall);
    const roofTri = new THREE.Shape([new THREE.Vector2(-4.7, 0), new THREE.Vector2(4.7, 0), new THREE.Vector2(0, 1.2)]);
    g.add(mesh(new THREE.ExtrudeGeometry(roofTri, { depth: 3.0, bevelEnabled: false }).rotateY(Math.PI / 2).rotateY(-Math.PI / 2).translate(0, H, -5.1), M('#8a5a44', { flatShading: true })));
    for (let i = 0; i < 4; i++) g.add(mesh(box(1.4, 1.6, 0.06, -3.3 + i * 2.2, 0, -2.28), M('#6b4630')));
    const canopies = [['#e63946', '#f7f4ee'], ['#2a9d8f', '#f7f4ee'], ['#f3a712', '#f7f4ee'], ['#3a86ff', '#f7f4ee'], ['#7a5cff', '#f7f4ee'], ['#2f7d4a', '#f7f4ee']];
    const produce = ['#e63946', '#f3a712', '#7cb342', '#ffd23f', '#8e5bd6', '#ff7a45'];
    canopies.forEach(([c1, c2], i) => {
      const x = -3.6 + (i % 3) * 3.6, z = i < 3 ? 0.4 : 3.4;
      const stall = new THREE.Group();
      stall.add(mesh(box(2.4, 0.8, 1.0), M('#a0703f')));
      for (const sx of [-1.15, 1.15]) for (const sz of [-0.5, 0.5]) stall.add(mesh(box(0.06, 2.0, 0.06, sx, 0, sz), DARK));
      for (let k = 0; k < 6; k++) {
        const s = mesh(new THREE.BoxGeometry(0.42, 0.05, 1.5), M(k % 2 ? c2 : c1));
        s.position.set(-1.05 + k * 0.42, 2.05, 0);
        s.rotation.x = 0.15;
        stall.add(s);
      }
      for (let k = 0; k < 8; k++) stall.add(mesh(new THREE.SphereGeometry(0.11, 8, 6).translate(-0.9 + (k % 4) * 0.6, 0.9, -0.2 + Math.floor(k / 4) * 0.35), M(produce[(i + k) % produce.length])));
      stall.position.set(x, 0, z);
      g.add(stall);
    });
    shadowAll(g);
    return { group: g, body: hall, height: H + 2 };
  }

  /** Mall: big modern shopping centre with a glass atrium, a glowing sign, a car park and shoppers' cars (Mall, @MRsunglasses2.0). */
  function mall(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11, 0.06, 11), M('#9aa0a6')));
    const H = 3.6 + dy(floors);
    const body = mesh(box(10, H, 5, 0, 0, -2.6), M(def.color || '#e9e4dc'));
    g.add(body, mesh(box(10.2, 0.3, 5.2, 0, H, -2.6), DARK));
    for (let f = 0; f < Math.max(2, floors + 1); f++) g.add(mesh(box(9.6, 0.6, 0.06, 0, 0.7 + (f * (H - 1.2)) / Math.max(2, floors + 1), -0.08), GLASS));
    // glass atrium entrance
    g.add(mesh(box(3.0, H + 0.8, 1.6, 0, 0, 0.2), M('#7fb5e0', { transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.3 })));
    g.add(mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.6, 20, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(0, H + 0.8, 0.2), M('#7fb5e0', { transparent: true, opacity: 0.6 })));
    g.add(mesh(box(4.0, 0.8, 0.1, 0, H + 0.3, -0.05), glow(def.accent || '#ff3b6b', 0.6, 2.6)));
    // car park with lines and cars
    for (let i = 0; i < 7; i++) g.add(mesh(box(0.06, 0.01, 1.6, -4.5 + i * 1.5, 0.07, 3.6), WHITE));
    ['#e63946', '#3a86ff', '#f7f4ee', '#ffd23f'].forEach((c, i) => {
      const car = new THREE.Group();
      car.add(mesh(box(0.85, 0.4, 1.5, 0, 0.12), M(c, { metalness: 0.4, roughness: 0.35 })), mesh(box(0.75, 0.32, 0.8, 0, 0.52, -0.1), M('#2b3440', { roughness: 0.2 })));
      car.position.set(-3.75 + [0, 1, 3, 5][i] * 1.5, 0, 3.6);
      g.add(car);
    });
    shadowAll(g);
    return { group: g, body, height: H + 2.4 };
  }

  // ---------------- Day 5 (2026-11-17) requests ----------------

  Object.assign(upgrades, {
    /** A friendly grey elephant in the front yard, flapping its ears and swinging its trunk (@Staypositivels). */
    elephant() {
      const skin = M('#8e9399', { flatShading: true });
      const g = new THREE.Group();
      const body = mesh(new THREE.CapsuleGeometry(0.55, 0.7, 6, 12).rotateZ(Math.PI / 2), skin);
      body.position.y = 1.05;
      const head = mesh(new THREE.SphereGeometry(0.45, 14, 12), skin);
      head.position.set(0.95, 1.35, 0);
      g.add(body, head);
      for (const x of [-0.45, 0.45]) for (const z of [-0.3, 0.3]) g.add(mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.75, 8).translate(x, 0.37, z), skin));
      const ears = [];
      for (const z of [-1, 1]) {
        const ear = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14).rotateX(Math.PI / 2), M('#a3a8ae', { flatShading: true }));
        const pivot = new THREE.Group();
        pivot.position.set(0.8, 1.42, z * 0.38);
        ear.position.set(-0.15, -0.05, z * 0.05);
        pivot.add(ear);
        ears.push([pivot, z]);
        g.add(pivot);
        g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6).translate(1.25, 1.5, z * 0.22), M('#1f2328')));
        g.add(mesh(new THREE.ConeGeometry(0.05, 0.4, 6).rotateZ(-Math.PI / 2 - 0.4).translate(1.35, 1.05, z * 0.2), WHITE));
      }
      const trunk = new THREE.Group();
      trunk.position.set(1.3, 1.25, 0);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, -0.35, 0), new THREE.Vector3(0.22, -0.75, 0), new THREE.Vector3(0.4, -0.95, 0)]);
      trunk.add(mesh(new THREE.TubeGeometry(curve, 16, 0.11, 8), skin));
      g.add(trunk);
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 5).rotateZ(0.6).translate(-1.15, 0.95, 0), skin));
      shadowAll(g);
      g.scale.setScalar(0.62);
      g.position.set(-1.35, 0.27, 2.7); // front yard, walking towards the door
      g.rotation.y = 0.15;
      g.userData.tick = (t) => {
        for (const [p, z] of ears) p.rotation.y = z * (0.2 + Math.sin(t * 3) * 0.25);
        trunk.rotation.z = Math.sin(t * 1.4) * 0.25;
      };
      return g;
    },

    /** A storm shelter / backyard bunker: grassy mound, concrete frame, slanted steel doors with hazard stripes and an air vent (@ElijahCrone-f4j, @jjk-x2r). */
    shelter() {
      const g = new THREE.Group();
      const mound = mesh(new THREE.SphereGeometry(1.1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#6f9f4f', { flatShading: true }));
      mound.scale.set(1.15, 0.55, 1);
      g.add(mound);
      g.add(mesh(box(1.2, 0.5, 0.9, 0, 0, 0.75), M('#a7a9ac')));
      for (const x of [-0.27, 0.27]) {
        const door = mesh(new THREE.BoxGeometry(0.5, 0.06, 0.95), M('#5c646e', { metalness: 0.4 }));
        door.position.set(x, 0.62, 0.85);
        door.rotation.x = 0.5;
        g.add(door);
        for (let i = 0; i < 3; i++) {
          const s = mesh(new THREE.BoxGeometry(0.5, 0.07, 0.1), M('#ffd23f'));
          s.position.set(x, 0.66 - i * 0.12, 0.62 + i * 0.22);
          s.rotation.x = 0.5;
          g.add(s);
        }
      }
      g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8).translate(-0.7, 0.45, -0.3), M('#c9ccd1', { metalness: 0.5 })));
      g.add(mesh(new THREE.ConeGeometry(0.16, 0.14, 8).translate(-0.7, 0.95, -0.3), DARK));
      shadowAll(g);
      g.position.set(2.25, 0.27, -2.2);
      g.rotation.y = -0.4;
      return g;
    },

    /** A camera drone circling over the house, rotors spinning and a blinking light (@TwoToThePowerOf999ImSmart). */
    drone(entry) {
      const g = new THREE.Group();
      const craft = new THREE.Group();
      craft.add(mesh(box(0.5, 0.16, 0.5, 0, -0.08, 0), M('#f7f7f5')));
      craft.add(mesh(new THREE.SphereGeometry(0.1, 10, 8).translate(0, -0.14, 0.2), M('#1f2328')));
      const rotors = [];
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        craft.add(mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05).rotateY(Math.atan2(z, x) * -1).translate(x * 0.2, 0, z * 0.2), DARK));
        const r = mesh(new THREE.BoxGeometry(0.42, 0.02, 0.06), M('#2b3340'));
        r.position.set(x * 0.36, 0.08, z * 0.36);
        rotors.push(r);
        craft.add(r, mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6).translate(x * 0.36, 0.04, z * 0.36), DARK));
      }
      const light = mesh(new THREE.SphereGeometry(0.06, 8, 6).translate(0, 0.05, -0.24), glow('#ff3b3b', 1, 3));
      craft.add(light);
      g.add(craft);
      shadowAll(g);
      g.userData.tick = (t) => {
        const cx = entry?.upgrades?.has('pool') ? -0.8 : 0;
        const top = Math.min(entry?.roofTop || 5, (entry?.height || 3) + 3) + 1.3;
        const a = t * 0.9;
        craft.position.set(cx + Math.cos(a) * 2.6, top + Math.sin(t * 2.1) * 0.15, Math.sin(a) * 2.6);
        craft.rotation.y = -a;
        for (const r of rotors) r.rotation.y = t * 40;
        light.visible = (t % 1) < 0.5;
      };
      g.userData.tick(0);
      return g;
    },

    /** A koi pond: a stone-rimmed pond with orange and white koi swimming round, lily pads and a stone lantern (@ConnorLukach). */
    'koi-pond'() {
      const g = new THREE.Group();
      const shape = new THREE.Shape();
      shape.absellipse(0, 0, 1.45, 0.75, 0, Math.PI * 2);
      const rim = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.05 }).rotateX(-Math.PI / 2), STONE);
      const water = mesh(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, 0.14, 0), M('#2a8fb8', { roughness: 0.1, emissive: '#0b4d6b', emissiveIntensity: 0.4 }));
      rim.receiveShadow = true;
      g.add(rim, water);
      for (const [x, z] of [[-0.9, 0.25], [0.95, -0.3]]) g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12).translate(x, 0.16, z), M('#5a9e47')));
      const fish = [];
      [['#ff7a20', 0.55, 0], ['#f7f4ee', 0.85, 2.1], ['#ff5a1f', 0.35, 4.2]].forEach(([c, r, off]) => {
        const f = new THREE.Group();
        f.add(mesh(new THREE.CapsuleGeometry(0.06, 0.2, 4, 8).rotateX(Math.PI / 2), M(c)));
        f.add(mesh(new THREE.ConeGeometry(0.07, 0.12, 4).rotateX(-Math.PI / 2).translate(0, 0, -0.2), M(c)));
        g.add(f);
        fish.push([f, r, off]);
      });
      const lantern = new THREE.Group();
      lantern.add(mesh(box(0.3, 0.5, 0.3), STONE), mesh(box(0.42, 0.3, 0.42, 0, 0.5), STONE), mesh(new THREE.ConeGeometry(0.38, 0.25, 4).rotateY(Math.PI / 4).translate(0, 0.92, 0), STONE));
      lantern.add(mesh(box(0.24, 0.18, 0.44, 0, 0.56), glow('#ffd27a', 0.2, 2.5)));
      lantern.position.set(1.55, 0, 0.55);
      g.add(lantern);
      shadowAll(g);
      g.position.set(-0.6, 0.27, -2.55);
      g.userData.tick = (t) => {
        for (const [f, r, off] of fish) {
          const a = t * 0.8 + off;
          f.position.set(Math.cos(a) * r * 1.4, 0.13, Math.sin(a) * r * 0.6);
          f.rotation.y = -a;
        }
      };
      g.userData.tick(0);
      return g;
    },
  });

  /** A mango tree in the back yard, hung with orange-yellow mangoes (Day 7, @ShashankShekhar-o3i). */
  upgrades['mango-tree'] = () => {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.4, 7).translate(0, 0.7, 0), TRUNK));
    const crown = M('#2f7d32', { flatShading: true });
    for (const [x, y, z, r] of [[0, 2.0, 0, 1.0], [-0.55, 1.75, 0.3, 0.7], [0.5, 1.8, -0.25, 0.72]]) g.add(mesh(new THREE.IcosahedronGeometry(r, 0).translate(x, y, z), crown));
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7, rr = 0.85 + (i % 3) * 0.12;
      const m = mesh(new THREE.SphereGeometry(0.12, 8, 6), M(i % 2 ? '#ffb31a' : '#f08a24'));
      m.scale.set(0.8, 1.2, 0.8);
      m.position.set(Math.cos(a) * rr, 1.35 + (i % 3) * 0.2, Math.sin(a) * rr);
      g.add(m);
    }
    shadowAll(g);
    g.position.set(-1.3, 0.27, -2.5);
    return g;
  };

  /** Weekly challenge prize: a golden trophy cup on a little stone plinth in the front yard, slowly turning and sparkling. */
  upgrades.trophy = () => {
    const g = new THREE.Group();
    g.add(mesh(box(0.6, 0.45, 0.6), STONE), mesh(box(0.5, 0.06, 0.5, 0, 0.45), DARK));
    const cup = new THREE.Group();
    cup.position.y = 0.51;
    const gold = mat.gold;
    cup.add(mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 14).translate(0, 0.04, 0), gold));
    cup.add(mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.3, 8).translate(0, 0.23, 0), gold));
    cup.add(mesh(new THREE.CylinderGeometry(0.28, 0.12, 0.42, 16, 1, true).translate(0, 0.58, 0), gold));
    for (const s of [-1, 1]) cup.add(mesh(new THREE.TorusGeometry(0.11, 0.03, 6, 12, Math.PI).rotateZ(-s * Math.PI / 2).translate(s * 0.29, 0.62, 0), gold));
    const star = mesh(new THREE.OctahedronGeometry(0.1), glow('#fff3c4', 1, 3));
    star.position.y = 1.05;
    cup.add(star);
    g.add(cup);
    shadowAll(g);
    g.position.set(2.55, 0.27, 2.55);
    g.userData.tick = (t) => { cup.rotation.y = t * 0.8; star.scale.setScalar(0.8 + Math.sin(t * 4) * 0.25); };
    return g;
  };

  /** Skyscraper: the city's first skyscraper, a stepped glass apartment tower with balconies, lit window bands and an antenna (@immortal_snaiI). */
  function skyscraper(def, floors = 1) {
    const g = new THREE.Group();
    const H = 24 + dy(floors) * 2;
    const glassM = M(def.color || '#2c3e57', { roughness: 0.15, metalness: 0.5 });
    const trim = M(def.accent || '#d4af37', { metalness: 0.6, roughness: 0.3 });
    const lit = glow('#ffe7a8', 0.05, 1.6);
    g.add(mesh(box(9, 1.2, 9), M('#cfd3d8')));
    const tiers = [[7, H * 0.55], [5.6, H * 0.3], [4.2, H * 0.15]];
    let y = 1.2;
    let body;
    tiers.forEach(([w, h], i) => {
      const t = mesh(box(w, h, w, 0, y), glassM);
      if (!i) body = t;
      g.add(t, mesh(box(w + 0.3, 0.3, w + 0.3, 0, y + h - 0.15), trim));
      for (let k = 1; k * 3 < h; k++) {
        g.add(mesh(box(w + 0.06, 0.35, w + 0.06, 0, y + k * 3 - 0.6), lit));
        if (i === 0 && k % 2) for (const s of [-1, 1]) g.add(mesh(box(w * 0.5, 0.12, 0.5, 0, y + k * 3 - 1, s * (w / 2 + 0.25)), WHITE));
      }
      y += h;
    });
    for (const x of [-1, 1]) for (const z of [-1, 1]) g.add(mesh(box(0.35, H, 0.35, x * 3.5, 1.2, z * 3.5), trim));
    g.add(mesh(box(2, 2.4, 0.2, 0, 1.2, 3.55), M('#7fb5e0', { transparent: true, opacity: 0.7 })));
    g.add(mesh(new THREE.CylinderGeometry(0.08, 0.15, 4, 6).translate(0, y + 2, 0), DARK));
    const beacon = mesh(new THREE.SphereGeometry(0.25, 10, 8).translate(0, y + 4.1, 0), glow('#ff3b3b', 1, 3));
    g.add(beacon);
    shadowAll(g);
    g.userData.tick = (t) => { beacon.visible = (t % 1.4) < 0.7; };
    return { group: g, body, height: y + 4.5 };
  }

  /** Cute café: a pastel pink shop with a mint awning, a giant coffee cup with a heart on the roof and little tables with parasols (@AlicePlayz175). */
  function cafe(def, floors = 1) {
    const g = new THREE.Group();
    const { body, H } = storefront(g, { w: 7, d: 5, wall: def.color || '#f8c8d4', awning: ['#7fd1b9', '#fff7f0'], floors });
    const cup = new THREE.Group();
    cup.add(mesh(new THREE.CylinderGeometry(1.1, 0.8, 1.6, 20).translate(0, 0.8, 0), WHITE));
    cup.add(mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.05, 20).translate(0, 1.58, 0), M('#6b4630')));
    cup.add(mesh(new THREE.TorusGeometry(0.45, 0.12, 8, 16).translate(1.15, 0.85, 0), WHITE));
    const heart = new THREE.Shape();
    heart.moveTo(0, -0.35); heart.bezierCurveTo(0.5, 0.05, 0.35, 0.45, 0, 0.2); heart.bezierCurveTo(-0.35, 0.45, -0.5, 0.05, 0, -0.35);
    cup.add(mesh(new THREE.ExtrudeGeometry(heart, { depth: 0.1, bevelEnabled: false }).translate(0, 0.85, 0.95), M(def.accent || '#ff5d8f')));
    cup.position.set(0, H, 0);
    g.add(cup);
    const steam = [];
    for (let i = 0; i < 3; i++) { const s = mesh(new THREE.SphereGeometry(0.22, 8, 6), M('#ffffff', { transparent: true, opacity: 0.7 })); g.add(s); steam.push(s); }
    for (const x of [-2.4, 2.4]) {
      g.add(mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 14).translate(x, 0.75, 4.2), WHITE), mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6).translate(x, 0.37, 4.2), DARK));
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6).translate(x, 1.1, 4.2), DARK), mesh(new THREE.ConeGeometry(1.0, 0.45, 8).translate(x, 2.3, 4.2), M(x < 0 ? '#ff9fb8' : '#7fd1b9')));
      for (const dx of [-0.7, 0.7]) g.add(mesh(box(0.35, 0.45, 0.35, x + dx, 0, 4.2), M('#ffd6e0')));
    }
    shadowAll(g);
    g.userData.tick = (t) => steam.forEach((s, i) => {
      const k = (t * 0.5 + i / 3) % 1;
      s.position.set(Math.sin(t + i) * 0.2, H + 1.8 + k * 1.6, 0);
      s.scale.setScalar(0.6 + k);
      s.material.opacity = 0.7 * (1 - k);
    });
    return { group: g, body, height: H + 3.5 };
  }

  /** Lemon farm: rows of lemon trees, a yellow farmhouse and a lemonade stand with a giant lemon (@LemonCubeDev). */
  function lemonFarm(def, floors = 1) {
    const g = new THREE.Group();
    const field = mesh(box(11.4, 0.06, 11.4), M('#a9c66f'));
    g.add(field);
    const lemon = M('#ffe135');
    const leaf = M('#3f8a3a', { flatShading: true });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = -4.2 + c * 2.0, z = -4 + r * 2.4;
      g.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6).translate(x, 0.45, z), TRUNK));
      g.add(mesh(new THREE.IcosahedronGeometry(0.75, 0).translate(x, 1.4, z), leaf));
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3 + r + c;
        g.add(mesh(new THREE.SphereGeometry(0.13, 8, 6).scale(1, 1, 1.3).translate(x + Math.cos(a) * 0.62, 1.2 + (k % 3) * 0.25, z + Math.sin(a) * 0.62), lemon));
      }
    }
    const H = 2.4 + dy(floors);
    const house = mesh(box(3.4, H, 2.6, 3.2, 0, 3.6), M(def.color || '#ffe9a0'));
    g.add(house);
    const roof = new THREE.Shape([new THREE.Vector2(-1.9, 0), new THREE.Vector2(1.9, 0), new THREE.Vector2(0, 1.3)]);
    g.add(mesh(new THREE.ExtrudeGeometry(roof, { depth: 2.8, bevelEnabled: false }).translate(3.2, H, 2.3), M('#4f8f3f', { flatShading: true })));
    g.add(mesh(box(0.7, 1.3, 0.06, 3.2, 0, 4.92), M('#6b4630')));
    // lemonade stand
    g.add(mesh(box(2.2, 0.9, 0.9, -2.6, 0, 4.4), M('#f7f4ee')), mesh(box(2.3, 0.08, 1.0, -2.6, 0.9, 4.4), M('#ffd23f')));
    for (const x of [-3.6, -1.6]) g.add(mesh(box(0.08, 1.4, 0.08, x, 0.9, 4.0), DARK));
    g.add(mesh(box(2.3, 0.5, 0.06, -2.6, 2.0, 4.0), M('#ffd23f')));
    const giant = mesh(new THREE.SphereGeometry(1.1, 16, 12).scale(1.35, 1, 1), lemon);
    giant.position.set(-2.6, 3.4, 4.0);
    g.add(giant, mesh(new THREE.ConeGeometry(0.22, 0.4, 8).rotateZ(-Math.PI / 2).translate(-1.0, 3.4, 4.0), lemon));
    shadowAll(g);
    g.userData.tick = (t) => { giant.rotation.y = Math.sin(t * 0.8) * 0.4; };
    return { group: g, body: house, height: Math.max(H + 2, 5) };
  }

  /** Black hole reactor: a glass dome over a black hole with a glowing accretion disk, held by containment pylons, with a visitors' viewing gallery (@oppavoidostyle). */
  function blackHoleReactor(def, floors = 1) {
    const g = new THREE.Group();
    const base = mesh(new THREE.CylinderGeometry(5.6, 6, 1.2 + dy(floors), 32).translate(0, (1.2 + dy(floors)) / 2, 0), M('#b9bec6'));
    const top = 1.2 + dy(floors);
    g.add(base);
    // viewing gallery: a ring of lit windows round the base
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const w = mesh(box(1.2, 0.5, 0.1, 0, 0, 0), glow('#7fdcff', 0.4, 2.2));
      w.position.set(Math.sin(a) * 5.75, top - 0.85, Math.cos(a) * 5.75);
      w.rotation.y = a;
      g.add(w);
    }
    g.add(mesh(box(1.4, 1.8, 0.2, 0, 0, 5.85), M('#2b3340')));
    const dome = mesh(new THREE.SphereGeometry(4.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, top, 0), M('#bfe9ff', { transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2 }));
    g.add(dome, mesh(new THREE.TorusGeometry(4.6, 0.18, 8, 40).rotateX(Math.PI / 2).translate(0, top, 0), M('#5c646e', { metalness: 0.5 })));
    const hole = mesh(new THREE.SphereGeometry(1.2, 24, 16), new THREE.MeshBasicMaterial({ color: '#000000' }));
    hole.position.y = top + 2.2;
    const disk = new THREE.Group();
    disk.position.y = top + 2.2;
    disk.rotation.x = 0.35;
    disk.add(mesh(new THREE.RingGeometry(1.45, 2.6, 48).rotateX(-Math.PI / 2), glow('#ff8c2a', 1.4, 3)));
    disk.add(mesh(new THREE.RingGeometry(1.25, 1.45, 48).rotateX(-Math.PI / 2), glow('#fff3c4', 2, 4)));
    disk.children.forEach((c) => { c.material.side = THREE.DoubleSide; });
    g.add(hole, disk);
    // containment pylons with blue field emitters
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.sin(a) * 3.4, z = Math.cos(a) * 3.4;
      g.add(mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.6, 8).translate(x, top + 1.3, z), M('#6b7380', { metalness: 0.5 })));
      g.add(mesh(new THREE.SphereGeometry(0.3, 10, 8).translate(x, top + 2.7, z), glow('#4cc9f0', 1, 3)));
    }
    shadowAll(g);
    dome.castShadow = false;
    hole.castShadow = false;
    g.userData.tick = (t) => { disk.rotation.y = t * 0.8; hole.scale.setScalar(1 + Math.sin(t * 2) * 0.03); };
    return { group: g, body: base, height: top + 5 };
  }

  /** Hot dog stand: a cart with wheels, a striped parasol and a giant hot dog on top (@Jimking12goat). */
  function hotDogStand(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(9, 0.06, 7), M('#d9cdb4')));
    const H = 2.0 + dy(floors) * 0.5;
    const cart = mesh(box(4.4, H, 2.2, 0, 0.5, 0), M(def.color || '#e63946'));
    g.add(cart, mesh(box(4.6, 0.12, 2.4, 0, 0.5 + H, 0), WHITE));
    g.add(mesh(box(4.0, 0.5, 0.06, 0, 0.5 + H * 0.55, 1.12), M('#ffd23f')));
    for (const x of [-1.5, 1.5]) g.add(mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 16).translate(x, 0.45, 1.15), DARK));
    g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6).translate(1.6, 0.62 + H + 1.3, -0.5), DARK));
    for (let i = 0; i < 8; i++) {
      const seg = mesh(new THREE.ConeGeometry(2.0, 0.8, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), M(i % 2 ? '#ffd23f' : '#e63946'));
      seg.position.set(1.6, 0.62 + H + 2.9, -0.5);
      seg.material.side = THREE.DoubleSide;
      g.add(seg);
    }
    const dog = new THREE.Group();
    const bun = M('#e0a252', { roughness: 0.7 });
    dog.add(mesh(new THREE.CapsuleGeometry(0.45, 2.4, 6, 12).rotateZ(Math.PI / 2).translate(0, 0, 0.25), bun));
    dog.add(mesh(new THREE.CapsuleGeometry(0.45, 2.4, 6, 12).rotateZ(Math.PI / 2).translate(0, 0, -0.25), bun));
    dog.add(mesh(new THREE.CapsuleGeometry(0.32, 3.0, 6, 12).rotateZ(Math.PI / 2).translate(0, 0.32, 0), M('#b5462f')));
    const pts = [];
    for (let i = 0; i <= 24; i++) pts.push(new THREE.Vector3(-1.5 + (i / 24) * 3, 0.66, Math.sin(i * 1.3) * 0.15));
    dog.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.07, 6), M('#ffd23f')));
    dog.position.set(-0.6, 0.62 + H + 0.7, 0.1);
    g.add(dog);
    shadowAll(g);
    g.userData.tick = (t) => { dog.position.y = 0.62 + H + 0.7 + Math.sin(t * 2) * 0.12; };
    return { group: g, body: cart, height: H + 4 };
  }

  /** Baguette statue: a giant statue of a girl with red twin drill pigtails proudly holding up a baguette, on a stone plinth in a little plaza (@MrTauntyFace). */
  function baguetteStatue(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.2, 32), M('#e2d6bd')));
    const P = 1.6 + dy(floors) * 0.6;
    const plinth = mesh(box(3.2, P, 3.2, 0, 0.2, 0), M('#cfc6b4'));
    g.add(plinth, mesh(box(3.6, 0.3, 3.6, 0, 0.2 + P, 0), M('#b8ad98')));
    const fig = new THREE.Group();
    fig.position.y = 0.5 + P;
    const skin = M('#f3d2bd'), hair = M(def.color || '#d6334a'), outfit = M('#4a4f5a'), trim = M('#d6334a');
    for (const x of [-0.35, 0.35]) fig.add(mesh(new THREE.CylinderGeometry(0.2, 0.18, 1.6, 8).translate(x, 0.8, 0), M('#2b2d33')));
    fig.add(mesh(new THREE.CylinderGeometry(0.75, 1.15, 1.6, 12).translate(0, 2.2, 0), outfit));
    fig.add(mesh(new THREE.CylinderGeometry(0.6, 0.75, 1.2, 12).translate(0, 3.6, 0), outfit));
    fig.add(mesh(new THREE.TorusGeometry(0.62, 0.08, 6, 16).rotateX(Math.PI / 2).translate(0, 4.1, 0), trim));
    fig.add(mesh(new THREE.ConeGeometry(0.3, 0.6, 3).rotateX(Math.PI).translate(0, 3.9, 0.6), trim));
    const head = mesh(new THREE.SphereGeometry(0.75, 16, 12).translate(0, 4.95, 0), skin);
    fig.add(head, mesh(new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 5.05, -0.05), hair));
    fig.add(mesh(box(1.3, 0.3, 0.2, 0, 5.2, 0.62), hair));
    for (const x of [-0.28, 0.28]) fig.add(mesh(new THREE.SphereGeometry(0.09, 8, 6).translate(x, 4.95, 0.68), M('#c0283c')));
    // twin drill pigtails: stacked cones on each side
    for (const s of [-1, 1]) {
      const drill = new THREE.Group();
      for (let k = 0; k < 4; k++) drill.add(mesh(new THREE.ConeGeometry(0.42 - k * 0.07, 0.7, 10).rotateX(Math.PI).translate(0, -k * 0.55, 0), hair));
      drill.position.set(s * 1.0, 5.0, -0.1);
      drill.rotation.z = s * 0.15;
      fig.add(drill);
    }
    // arms: one on the hip, one holding the baguette up high
    fig.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.4, 8).rotateZ(0.9).translate(-1.05, 3.3, 0), skin));
    const arm = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.5, 8).rotateZ(-2.5).translate(1.15, 4.35, 0.2), skin);
    fig.add(arm);
    const bread = new THREE.Group();
    bread.add(mesh(new THREE.CapsuleGeometry(0.3, 3.2, 6, 12), M('#d39a4a', { roughness: 0.7 })));
    for (let k = 0; k < 5; k++) bread.add(mesh(new THREE.BoxGeometry(0.5, 0.08, 0.12).translate(0, -1.2 + k * 0.6, 0.27).rotateY(0), M('#f0d39a')));
    bread.position.set(1.65, 5.6, 0.3);
    bread.rotation.z = -0.5;
    fig.add(bread);
    g.add(fig);
    shadowAll(g);
    g.userData.tick = (t) => { bread.rotation.z = -0.5 + Math.sin(t * 1.5) * 0.06; };
    return { group: g, body: plinth, height: P + 7.6 };
  }

  /** Clothing boutique: an elegant blush-pink shop with a black-and-white awning, mannequins in dresses in the window and a giant hanger sign (@ZariGolpayegani). */
  function boutique(def, floors = 1) {
    const g = new THREE.Group();
    const { body, H, front } = storefront(g, { w: 8, d: 5, wall: def.color || '#f2d4d7', awning: ['#1f1f24', '#f7f4ee'], floors });
    const gold = M(def.accent || '#d4af37', { metalness: 0.6, roughness: 0.3 });
    g.add(mesh(box(8.2, 0.5, 0.12, 0, 2.3, front + 0.02), gold));
    [['#e63946', -2.6], ['#7a5cff', -1.4], ['#2a9d8f', -0.2]].forEach(([c, x]) => {
      g.add(mesh(new THREE.ConeGeometry(0.42, 1.1, 10).translate(x, 0.75, front - 0.35), M(c)));
      g.add(mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.45, 8).translate(x, 1.5, front - 0.35), M('#f3e3d3')), mesh(new THREE.SphereGeometry(0.15, 8, 6).translate(x, 1.85, front - 0.35), M('#f3e3d3')));
    });
    const hanger = new THREE.Group();
    hanger.add(mesh(new THREE.TorusGeometry(0.3, 0.07, 6, 12, Math.PI * 1.4).rotateZ(-0.2).translate(0, 1.45, 0), gold));
    const tri = new THREE.Shape([new THREE.Vector2(-1.4, 0), new THREE.Vector2(1.4, 0), new THREE.Vector2(0, 1.1)]);
    hanger.add(mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.12, bevelEnabled: false }).translate(0, 0.1, 0), gold));
    hanger.add(mesh(new THREE.BoxGeometry(2.9, 0.12, 0.12).translate(0, 0.1, 0.06), gold));
    hanger.position.set(0, H + 0.3, 0);
    g.add(hanger);
    // bridal floor: white wedding gowns in the upper windows, and a big black SUV parked in front (Day 7, @ZariGolpayegani)
    for (const x of [-2.4, 0, 2.4]) {
      const y0 = 2.62; // on a little balcony in front of the first-floor windows
      g.add(mesh(new THREE.ConeGeometry(0.34, 0.9, 12).translate(x, y0 + 0.45, front + 0.3), M('#fbfbf7', { roughness: 0.4 })));
      g.add(mesh(new THREE.SphereGeometry(0.11, 8, 6).translate(x, y0 + 1.0, front + 0.3), M('#f3e3d3')));
      g.add(mesh(new THREE.ConeGeometry(0.18, 0.5, 8, 1, true).translate(x, y0 + 1.05, front + 0.22), M('#ffffff', { transparent: true, opacity: 0.6, side: THREE.DoubleSide })));
    }
    g.add(mesh(box(8.2, 0.1, 0.7, 0, 2.52, front + 0.3), WHITE));
    const suv = new THREE.Group();
    const paint = M('#14161a', { metalness: 0.5, roughness: 0.3 });
    suv.add(mesh(box(1.5, 0.75, 3.2, 0, 0.3), paint), mesh(box(1.4, 0.6, 2.0, 0, 1.05, -0.3), paint));
    suv.add(mesh(box(1.42, 0.42, 1.9, 0, 1.12, -0.3), M('#2b3440', { roughness: 0.15 })));
    for (const z of [-1.05, 1.05]) for (const x of [-0.72, 0.72]) suv.add(mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 12).rotateZ(Math.PI / 2).translate(x, 0.33, z), DARK));
    suv.add(mesh(box(1.3, 0.12, 0.04, 0, 0.75, 1.61), M('#c9ccd1', { metalness: 0.8 })));
    suv.add(mesh(box(0.4, 0.4, 0.15, 0, 0.75, -1.65), DARK)); // spare wheel
    for (const x of [-0.5, 0.5]) suv.add(mesh(box(0.25, 0.12, 0.05, x, 0.82, 1.61), glow('#fff3c4', 0.4, 2)));
    suv.position.set(1.8, 0, front + 2.2);
    suv.rotation.y = Math.PI / 2;
    g.add(suv);
    shadowAll(g);
    g.userData.tick = (t) => { hanger.rotation.y = Math.sin(t * 0.7) * 0.35; };
    return { group: g, body, height: H + 2.4 };
  }

  /** Dojo: a Japanese martial-arts hall on a stone base, white walls with dark beams, two-tier roof with upturned eaves, a wooden deck, a training dummy and bamboo (@Get_jin_in_use). */
  function dojo(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(10, 0.6, 8, 0, 0, -0.5), M('#9a9488', { flatShading: true })));
    const H = 2.6 + dy(floors);
    const hall = mesh(box(8, H, 5.6, 0, 0.6, -0.8), M(def.color || '#f4efe4'));
    g.add(hall);
    const beam = M('#3b2a1f');
    for (const x of [-4, -2, 0, 2, 4]) g.add(mesh(box(0.25, H, 0.25, x, 0.6, 2.0), beam));
    g.add(mesh(box(8.2, 0.25, 0.3, 0, 0.6 + H - 0.25, 2.0), beam), mesh(box(8.2, 0.2, 0.3, 0, 1.6, 2.0), beam));
    g.add(mesh(box(2.6, 1.9, 0.08, 0, 0.6, 2.05), M('#e9dcc4')));
    g.add(mesh(box(9, 0.2, 1.8, 0, 0.6, 2.9), M('#a0703f')));
    const roofM = M('#2f3640', { flatShading: true });
    const roofTier = (w, d, y, h) => {
      const r = mesh(new THREE.CylinderGeometry(0.5, 1, h, 4, 1).rotateY(Math.PI / 4), roofM);
      r.scale.set(w / 1.414, 1, d / 1.414);
      r.position.set(0, y + h / 2, -0.8);
      g.add(r);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.ConeGeometry(0.18, 0.6, 4).rotateZ(x * 0.9).translate(x * w / 2, y + 0.15, -0.8 + z * d / 2), roofM));
    };
    roofTier(10, 7.6, 0.6 + H, 1.4);
    g.add(mesh(box(5, 1.1, 3.6, 0, 0.6 + H + 1.0, -0.8), M(def.color || '#f4efe4')));
    roofTier(6.6, 5, 0.6 + H + 2.0, 1.3);
    g.add(mesh(box(1.4, 0.8, 0.1, 0, 0.6 + H + 1.15, 1.02), M(def.accent || '#c0283c')));
    // wooden training dummy and bamboo
    const dummy = new THREE.Group();
    dummy.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 2, 10).translate(0, 1, 0), M('#8a5a2c')));
    for (const [y, r] of [[1.6, 0.4], [1.3, -0.4], [0.9, 0]]) dummy.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6).rotateX(Math.PI / 2).rotateY(r).translate(0, y, 0.35), M('#6b4630')));
    dummy.position.set(-3.6, 0.6, 3.2);
    g.add(dummy);
    for (let i = 0; i < 5; i++) g.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 3 + (i % 3) * 0.6, 6).translate(3.4 + (i % 3) * 0.35, 0.6 + 1.6, 3.0 + Math.floor(i / 3) * 0.4), M('#7cb342')));
    // kitsune shrine beside the dojo: a little red shrine with a torii and two white fox guardians (Day 7, @Get_jin_in_use)
    {
      const red = M('#c0392b');
      const sx = -3.4, sz = 1.2, sy = 0.6;
      g.add(mesh(box(1.4, 0.15, 1.2, sx, sy, sz), STONE));
      g.add(mesh(box(0.9, 0.8, 0.7, sx, sy + 0.15, sz - 0.1), red));
      const sr = mesh(new THREE.ConeGeometry(0.85, 0.45, 4).rotateY(Math.PI / 4).translate(sx, sy + 1.17, sz - 0.1), M('#2f3640', { flatShading: true }));
      sr.scale.set(1, 1, 0.85);
      g.add(sr);
      for (const x of [-0.75, 0.75]) g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6).translate(sx + x, sy + 0.75, sz + 1.0), red));
      g.add(mesh(box(1.9, 0.12, 0.14, sx, sy + 1.45, sz + 1.0), red), mesh(box(1.6, 0.08, 0.1, sx, sy + 1.2, sz + 1.0), red));
      for (const s of [-1, 1]) {
        const fox = new THREE.Group();
        const fur = M('#f7f4ee');
        fox.add(mesh(box(0.3, 0.12, 0.3, 0, 0, 0), STONE));
        fox.add(mesh(new THREE.ConeGeometry(0.13, 0.4, 8).translate(0, 0.32, 0), fur));
        fox.add(mesh(new THREE.ConeGeometry(0.09, 0.2, 6).rotateX(Math.PI / 2).translate(0, 0.55, 0.08), fur));
        for (const e of [-0.05, 0.05]) fox.add(mesh(new THREE.ConeGeometry(0.035, 0.1, 4).translate(e, 0.66, -0.01), fur));
        fox.add(mesh(new THREE.ConeGeometry(0.08, 0.32, 6).rotateX(-0.9).translate(s * 0.08, 0.3, -0.18), fur));
        fox.add(mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04).translate(0, 0.42, 0.11), red)); // red bib
        fox.position.set(sx + s * 0.55, sy + 0.12, sz + 0.55);
        g.add(fox);
      }
    }
    // koi pond in front of the dojo (added for @Get_jin_in_use, Day 6)
    const pondShape = new THREE.Shape();
    pondShape.absellipse(0, 0, 2.2, 1.0, 0, Math.PI * 2);
    g.add(mesh(new THREE.ExtrudeGeometry(pondShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.18, bevelThickness: 0.05 }).rotateX(-Math.PI / 2).translate(0.2, 0, 4.75), STONE));
    g.add(mesh(new THREE.ShapeGeometry(pondShape).rotateX(-Math.PI / 2).translate(0.2, 0.17, 4.75), M('#2a8fb8', { roughness: 0.1, emissive: '#0b4d6b', emissiveIntensity: 0.4 })));
    const koi = [];
    for (const [c, r0, off] of [['#ff7a20', 1.2, 0], ['#f7f4ee', 0.8, 2.2], ['#ff5a1f', 1.5, 4.1]]) {
      const f = mesh(new THREE.CapsuleGeometry(0.1, 0.32, 4, 8).rotateX(Math.PI / 2), M(c));
      g.add(f);
      koi.push([f, r0, off]);
    }
    g.add(mesh(new THREE.TorusGeometry(0.9, 0.08, 6, 16, Math.PI).translate(0.2, 0.15, 4.75), M('#c0392b'))); // little bridge
    g.userData.tick = (t) => koi.forEach(([f, r0, off]) => { const a = t * 0.7 + off; f.position.set(0.2 + Math.cos(a) * r0, 0.19, 4.75 + Math.sin(a) * r0 * 0.4); f.rotation.y = -a; });
    shadowAll(g);
    return { group: g, body: hall, height: H + 4.6 };
  }

  /** Movie theater: a red cinema with a glowing marquee of bulbs, poster boxes, a giant film reel and a popcorn bucket on the roof (@prabhasishbhattacharya9226). */
  function cinema(def, floors = 1) {
    const g = new THREE.Group();
    const H = 4.2 + dy(floors);
    const body = mesh(box(9, H, 6, 0, 0, -1.5), M(def.color || '#b0233a'));
    g.add(body, mesh(box(9.3, 0.3, 6.3, 0, H, -1.5), DARK));
    const marquee = mesh(box(7, 1.2, 1.4, 0, 2.4, 2.0), M('#1f1f24'));
    g.add(marquee, mesh(box(6.6, 0.8, 0.08, 0, 2.6, 2.72), glow('#fff3c4', 0.8, 2.4)));
    const bulbs = [];
    for (let i = 0; i < 18; i++) { const b = mesh(new THREE.SphereGeometry(0.09, 6, 4).translate(-3.4 + i * 0.4, 3.62, 2.72), glow('#ffd23f', 0.8, 3)); g.add(b); bulbs.push(b); }
    for (const x of [-3.4, 3.4]) g.add(mesh(box(1.3, 1.9, 0.12, x, 0.2, 1.52), M(x < 0 ? '#3a86ff' : '#ffd23f')));
    g.add(mesh(box(3, 2.2, 0.08, 0, 0, 1.52), M('#7fb5e0', { transparent: true, opacity: 0.7 })));
    const reel = new THREE.Group();
    reel.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 24).rotateX(Math.PI / 2), M('#c9ccd1', { metalness: 0.5 })));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; reel.add(mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.34, 12).rotateX(Math.PI / 2).translate(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0), DARK)); }
    reel.position.set(-2.2, H + 1.6, -1);
    g.add(reel, mesh(box(0.3, 1.2, 0.3, -2.2, H, -1), DARK));
    const pop = new THREE.Group();
    for (let i = 0; i < 8; i++) pop.add(mesh(new THREE.CylinderGeometry(0.12, 0.1, 1.6, 4, 1, false, i * (Math.PI / 4), Math.PI / 4).translate(0, 0.8, 0), M(i % 2 ? '#e63946' : '#f7f4ee')));
    pop.scale.set(5, 1, 5);
    const corn = new THREE.Group();
    corn.position.set(2.4, H, -1);
    g.add(corn);
    for (let i = 0; i < 9; i++) corn.add(mesh(new THREE.SphereGeometry(0.2, 6, 4).translate(Math.cos(i) * 0.3, 1.7 + (i % 3) * 0.12, Math.sin(i) * 0.3), M('#fff4c9')));
    pop.position.set(2.4, H, -1);
    g.add(pop);
    shadowAll(g);
    g.userData.tick = (t) => { reel.rotation.z = t * 0.8; bulbs.forEach((b, i) => { b.visible = (Math.floor(t * 4) + i) % 3 !== 0; }); };
    return { group: g, body, height: H + 3.2 };
  }

  /** University, modelled on ETH Zurich's main building (HG) as seen from the Polyterrasse: long sandstone wings with a
   *  rusticated ground floor and corner pavilions, a curved colonnaded centre, and the big ribbed grey-green dome with
   *  its lantern above it; the terrace with balustrades and stairs in front (@DaryaAnsaripour). */
  function university(def, floors = 1) {
    const g = new THREE.Group();
    const stone = M(def.color || '#e9dfca');
    const stoneDark = M('#d6cab1');
    const roofM = M('#5f666e', { flatShading: true });
    const domeM = M(def.accent || '#8fa39c', { roughness: 0.45, metalness: 0.15 });
    const win = M('#4e5d70', { roughness: 0.3 });
    const G = 1.4; // rusticated ground floor
    const U = 2.3 + dy(floors) * 0.55; // upper storeys: the building stays long and low as it grows
    const rows = 2 + Math.floor(Math.max(0, floors - 1) / 2);
    const H = G + U;
    const T = 0.55; // the building stands on the terrace level

    // terrace (Polyterrasse) with a balustrade and wide stairs in the middle
    g.add(mesh(box(11.8, T, 6.2, 0, 0, 2.8), M('#cfc6b4')));
    const rail = M('#efe8da');
    for (const [x0, x1] of [[-5.8, -1.7], [1.7, 5.8]]) {
      g.add(mesh(box(x1 - x0, 0.1, 0.18, (x0 + x1) / 2, T + 0.5, 5.8), rail));
      for (let x = x0 + 0.15; x < x1; x += 0.3) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 6).translate(x, T + 0.25, 5.8), rail));
    }
    for (let i = 0; i < 3; i++) g.add(mesh(box(3.4, T - i * 0.18, 0.4, 0, 0, 6.1 + i * 0.4), M('#cfc6b4')));

    // the two long wings with corner pavilions
    const wingD = 4.2, wingZ = -2.1; // depth and centre z (front face at z = 0)
    const body = mesh(box(11.4, H, wingD, 0, T, wingZ), stone);
    g.add(body);
    g.add(mesh(box(11.5, 0.12, wingD + 0.1, 0, T + G, wingZ), stoneDark)); // string course above the base
    g.add(mesh(box(11.6, 0.28, wingD + 0.3, 0, T + H, wingZ), stoneDark)); // cornice
    for (const y of [0.4, 0.8, 1.15]) g.add(mesh(box(11.42, 0.04, 0.02, 0, T + y, 0.01), stoneDark)); // rustication grooves
    for (const s of [-1, 1]) {
      g.add(mesh(box(2.0, H + 0.5, 0.5, s * 4.75, T, 0.15), stone));
      g.add(mesh(box(2.1, 0.25, 0.6, s * 4.75, T + H + 0.4, 0.15), stoneDark));
      const pr = mesh(new THREE.CylinderGeometry(0.35, 1, 1.0, 4).rotateY(Math.PI / 4), roofM);
      pr.scale.set(1.6, 1, 3.4);
      pr.position.set(s * 4.75, T + H + 1.15, -1.9);
      g.add(pr);
    }
    // long hipped roofs over the wings
    for (const s of [-1, 1]) {
      const r = mesh(new THREE.CylinderGeometry(0.3, 1, 0.9, 4).rotateY(Math.PI / 4), roofM);
      r.scale.set(2.3, 1, 3.0);
      r.position.set(s * 2.4, T + H + 0.6, wingZ);
      g.add(r);
    }
    // windows: arched on the ground floor, tall with little pediments above, a row per upper storey
    const tri = new THREE.Shape([new THREE.Vector2(-0.3, 0), new THREE.Vector2(0.3, 0), new THREE.Vector2(0, 0.18)]);
    const pedGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.08, bevelEnabled: false });
    const storey = U / rows;
    for (const s of [-1, 1]) {
      const xs = [2.55, 3.1, 3.65, 4.35, 4.85, 5.35].map((x) => x * s);
      for (const x of xs) {
        const front = Math.abs(x) > 3.9 ? 0.41 : 0.01;
        g.add(mesh(box(0.3, 0.6, 0.06, x, T + 0.3, front), win));
        g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 10, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(x, T + 0.9, front + 0.03), win));
        for (let r = 0; r < rows; r++) {
          const y = T + G + 0.35 + r * storey;
          const hgt = Math.min(storey * 0.62, r === 0 ? 1.15 : 0.9);
          g.add(mesh(box(0.3, hgt, 0.06, x, y, front), win));
          if (r === 0) g.add(mesh(pedGeo, stoneDark).translateX(x).translateY(y + hgt + 0.08).translateZ(front));
        }
      }
    }

    // the curved centre: a half rotunda with a ring of giant columns
    const R = 2.0, cz = 0;
    g.add(mesh(new THREE.CylinderGeometry(R, R, H, 32, 1, false, -Math.PI / 2, Math.PI).translate(0, T + H / 2, cz), stone));
    g.add(mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, G, 32, 1, false, -Math.PI / 2, Math.PI).translate(0, T + G / 2, cz), stoneDark));
    for (let i = 0; i < 7; i++) {
      const a = -1.25 + (i * 2.5) / 6;
      const x = Math.sin(a) * (R + 0.45), z = cz + Math.cos(a) * (R + 0.45);
      g.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, U - 0.2, 12).translate(x, T + G + (U - 0.2) / 2, z), WHITE));
      g.add(mesh(box(0.42, 0.14, 0.42, x, T + G, z), stoneDark), mesh(box(0.42, 0.16, 0.42, x, T + H - 0.25, z), stoneDark));
      // tall windows between the columns
      if (i < 6) {
        const b = a + 1.25 / 3;
        const w = mesh(box(0.42, U * 0.6, 0.06, 0, 0, 0), win);
        w.position.set(Math.sin(b) * (R + 0.02), T + G + U * 0.2, cz + Math.cos(b) * (R + 0.02));
        w.rotation.y = b;
        g.add(w);
      }
    }
    g.add(mesh(new THREE.CylinderGeometry(R + 0.75, R + 0.75, 0.32, 32, 1, false, -Math.PI / 2, Math.PI).translate(0, T + H - 0.05, cz), stoneDark)); // entablature
    g.add(mesh(box(1.2, 1.25, 0.08, 0, T, cz + R + 0.03), M('#3b2a1f'))); // entrance

    // drum and the ribbed dome with its lantern
    const dTop = T + H + 0.2;
    const DR = 2.4;
    g.add(mesh(new THREE.CylinderGeometry(DR, DR, 1.1, 32).translate(0, dTop + 0.55, -0.6), stone));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const w = mesh(box(0.3, 0.55, 0.05), win);
      w.position.set(Math.sin(a) * (DR + 0.01), dTop + 0.55, -0.6 + Math.cos(a) * (DR + 0.01));
      w.rotation.y = a;
      g.add(w);
    }
    g.add(mesh(new THREE.CylinderGeometry(DR + 0.15, DR + 0.15, 0.2, 32).translate(0, dTop + 1.15, -0.6), stoneDark));
    const dome = new THREE.Group();
    dome.position.set(0, dTop + 1.2, -0.6);
    dome.scale.set(1, 0.62, 1);
    dome.add(mesh(new THREE.SphereGeometry(DR, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeM));
    for (let i = 0; i < 12; i++) {
      const rib = mesh(new THREE.TorusGeometry(DR + 0.02, 0.06, 5, 24, Math.PI / 2), M('#6f827b'));
      rib.rotation.y = (i / 12) * Math.PI * 2;
      dome.add(rib);
    }
    g.add(dome);
    const lTop = dTop + 1.2 + DR * 0.62;
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.9, 12).translate(0, lTop + 0.4, -0.6), stone));
    g.add(mesh(new THREE.SphereGeometry(0.55, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, lTop + 0.85, -0.6), domeM));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.6, 6).translate(0, lTop + 1.65, -0.6), mat.gold));
    shadowAll(g);
    return { group: g, body, height: lTop + 2 };
  }

  /** Gothic church: a tall nave with a steep roof, buttresses, a glowing rose window and two dark twin towers with pointed spires and little corner spirelets (@nexis1337). */
  function gothicChurch(def, floors = 1) {
    const g = new THREE.Group();
    const stone = M(def.color || '#d8d0c0', { flatShading: true });
    const dark = M(def.accent || '#2f3540', { flatShading: true });
    const H = 5 + dy(floors);
    const nave = mesh(box(5, H, 9, 0, 0, -1.6), stone);
    g.add(nave);
    const roof = new THREE.Shape([new THREE.Vector2(-2.7, 0), new THREE.Vector2(2.7, 0), new THREE.Vector2(0, 3.2)]);
    g.add(mesh(new THREE.ExtrudeGeometry(roof, { depth: 9, bevelEnabled: false }).translate(0, H, -6.1), dark));
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      g.add(mesh(box(0.5, H * 0.75, 0.8, s * 2.85, 0, -5 + i * 2.2), stone));
      g.add(mesh(box(0.08, H * 0.55, 0.7, s * 2.53, 1.2, -4 + i * 2.2), glow('#4a6fd6', 0.3, 1.6)));
    }
    const TH = H + 6 + dy(floors) * 0.5;
    for (const x of [-2.1, 2.1]) {
      g.add(mesh(box(2.2, TH, 2.2, x, 0, 2.6), stone));
      g.add(mesh(new THREE.ConeGeometry(1.35, 5.5, 4).rotateY(Math.PI / 4).translate(x, TH + 2.75, 2.6), dark));
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(new THREE.ConeGeometry(0.3, 2.2, 4).translate(x + dx * 1.0, TH + 1.1, 2.6 + dz * 1.0), dark));
      g.add(mesh(new THREE.SphereGeometry(0.2, 8, 6).translate(x, TH + 5.7, 2.6), mat.gold));
      for (let k = 0; k < 3; k++) g.add(mesh(box(0.5, 1.2, 0.08, x, 1.8 + k * 3, 3.72), M('#2b2d42')));
    }
    g.add(mesh(box(2.0, TH * 0.55, 1.4, 0, 0, 2.6), stone));
    g.add(mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 20).rotateX(Math.PI / 2).translate(0, TH * 0.4, 3.32), glow('#e05a7a', 0.5, 2.4)));
    g.add(mesh(box(1.0, 2.0, 0.1, 0, 0, 3.32), M('#3b2a1f')));
    const arch = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(0, 2.0, 3.33), M('#3b2a1f'));
    g.add(arch);
    shadowAll(g);
    return { group: g, body: nave, height: TH + 6 };
  }

  /** Small dam: a curved concrete dam wall between two hills, a reservoir behind, a waterfall spillway and a little power house below (@jjk-x2r). */
  function dam(def, floors = 1) {
    const g = new THREE.Group();
    const H = 4 + dy(floors) * 0.6;
    const hill = M('#6f9f4f', { flatShading: true });
    for (const x of [-4.6, 4.6]) {
      const h = mesh(new THREE.ConeGeometry(3.4, H + 2.2, 7), hill);
      h.position.set(x, (H + 2.2) / 2, -1);
      g.add(h);
    }
    const wall = mesh(new THREE.CylinderGeometry(7, 7, H, 32, 1, true, -0.55, 1.1), M(def.color || '#c9ccd1'));
    wall.material.side = THREE.DoubleSide;
    wall.position.set(0, H / 2, -6.2);
    g.add(wall);
    g.add(mesh(new THREE.CylinderGeometry(7.2, 7.2, 0.4, 32, 1, false, -0.55, 1.1).translate(0, H, -6.2), M('#b2b6bc')));
    const res = mesh(new THREE.CircleGeometry(6.6, 32, Math.PI / 2 - 0.55, 1.1).rotateX(-Math.PI / 2), WATER);
    res.position.set(0, H - 0.5, -6.2);
    g.add(res, mesh(box(9, 0.05, 4, 0, H - 0.52, -3.8), WATER));
    const fall = mesh(box(1.6, H - 0.4, 0.15, 0, 0.2, 0.9), M('#bfe8fb', { transparent: true, opacity: 0.85, emissive: '#3fb6e8', emissiveIntensity: 0.3 }));
    g.add(fall);
    g.add(mesh(box(2.4, 0.05, 6, 0, 0.05, 3.9), WATER));
    const house = mesh(box(2.4, 1.6, 1.6, 2.6, 0, 2.4), M('#e9e4dc'));
    g.add(house, mesh(box(2.6, 0.2, 1.8, 2.6, 1.6, 2.4), DARK));
    for (const x of [1.8, 3.4]) g.add(mesh(box(0.06, 2.6, 0.06, x, 1.8, 2.4), DARK));
    const foam = [];
    for (let i = 0; i < 5; i++) { const f = mesh(new THREE.SphereGeometry(0.25, 8, 6), WHITE); g.add(f); foam.push(f); }
    shadowAll(g);
    g.userData.tick = (t) => foam.forEach((f, i) => { const k = (t * 0.6 + i / 5) % 1; f.position.set(Math.sin(i * 2.3) * 0.6, 0.15 + Math.sin(k * Math.PI) * 0.3, 1.2 + k * 2.5); f.scale.setScalar(1 - k * 0.6); });
    return { group: g, body: wall, height: H + 2.4 };
  }

  /** Construction site: a fenced dirt lot with a yellow tower crane (its jib turns), a half-built steel frame that rises with the floors, a cement mixer and cones (@djvitixofficial). */
  function constructionSite(def, floors = 1) {
    const g = new THREE.Group();
    const dirt = mesh(box(11.4, 0.08, 11.4), M('#b08a5a'));
    g.add(dirt);
    const yellow = M(def.color || '#f5b82e');
    for (const [w, d, x, z] of [[11.4, 0.1, 0, 5.65], [11.4, 0.1, 0, -5.65], [0.1, 11.4, 5.65, 0], [0.1, 11.4, -5.65, 0]]) g.add(mesh(box(w, 1.0, d, x, 0, z), M('#e8e4da', { transparent: true, opacity: 0.85 })));
    const steel = M('#d9534f');
    const lv = 2 + floors;
    for (let l = 0; l <= lv; l++) g.add(mesh(box(5.2, 0.25, 4.2, -1.8, l * 1.8, -1.8), M('#b9bec6')));
    for (const x of [-4.2, -1.8, 0.6]) for (const z of [-3.7, 0.1]) g.add(mesh(box(0.2, lv * 1.8 + 0.6, 0.2, x, 0, z), steel));
    g.add(mesh(box(5.2, 0.15, 0.15, -1.8, lv * 1.8 + 0.6, 0.1), steel));
    // tower crane
    const CH = lv * 1.8 + 6;
    const mast = mesh(box(0.6, CH, 0.6, 3.6, 0, -3.4), yellow);
    g.add(mast);
    const jib = new THREE.Group();
    jib.position.set(3.6, CH, -3.4);
    jib.add(mesh(box(11, 0.4, 0.4, -2.5, 0, 0), yellow), mesh(box(1.2, 0.8, 1.2, 0, -0.8, 0), M('#3a86ff')), mesh(box(1.2, 0.9, 0.9, 2.2, -0.2, 0), DARK));
    const hook = mesh(box(0.05, 3, 0.05, -5.5, -3, 0), DARK);
    jib.add(hook, mesh(box(1.2, 0.3, 0.6, -5.5, -3.3, 0), M('#a0703f')));
    g.add(jib);
    // cement mixer truck and cones
    const truck = new THREE.Group();
    truck.add(mesh(box(1.4, 1.0, 3.4, 0, 0.3), WHITE), mesh(box(1.4, 0.9, 1.0, 0, 1.3, 1.2), M('#3a86ff')));
    const drum = mesh(new THREE.CylinderGeometry(0.55, 0.75, 2.0, 12).rotateX(Math.PI / 2 - 0.25).translate(0, 1.9, -0.4), M('#ff7a45'));
    truck.add(drum);
    truck.position.set(3.2, 0, 3.0);
    g.add(truck);
    for (const [x, z] of [[-4.8, 4.6], [-3.6, 4.6], [-2.4, 4.6]]) g.add(mesh(new THREE.ConeGeometry(0.22, 0.6, 8).translate(x, 0.3, z), M('#ff7a45')));
    shadowAll(g);
    g.userData.tick = (t) => { jib.rotation.y = Math.sin(t * 0.25) * 1.2; drum.rotation.z = t; };
    return { group: g, body: mast, height: CH + 1.5 };
  }

  const day5Landmarks = {
    skyscraper, cafe, 'lemon-farm': lemonFarm, 'black-hole-reactor': blackHoleReactor, 'hot-dog-stand': hotDogStand, 'baguette-statue': baguetteStatue,
    boutique, dojo, cinema, university, 'gothic-church': gothicChurch, dam, 'construction-site': constructionSite,
  };

  // ---------------- Day 6 (2026-11-18) requests ----------------

  Object.assign(upgrades, {
    /** A fenced capybara pen in the back yard: three capybaras, a little bathing pool and an orange (@ChristinneeeXD). */
    'capybara-pen'() {
      const g = new THREE.Group();
      const fur = M('#a0703f', { flatShading: true });
      const dark = M('#5a3b22');
      g.add(mesh(box(3.2, 0.03, 1.6), M('#b4c98a')));
      for (let i = 0; i <= 8; i++) for (const z of [-0.8, 0.8]) g.add(mesh(box(0.05, 0.35, 0.05, -1.6 + i * 0.4, 0, z), M('#f7f4ee')));
      for (const z of [-0.8, 0.8]) g.add(mesh(box(3.2, 0.04, 0.04, 0, 0.3, z), M('#f7f4ee')));
      for (const x of [-1.6, 1.6]) g.add(mesh(box(0.04, 0.04, 1.6, x, 0.3, 0), M('#f7f4ee')));
      const pool = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 16).translate(0.9, 0.05, 0), WATER);
      g.add(pool);
      const capys = [];
      for (const [x, z, ry, s] of [[-0.9, 0.1, 0.4, 1], [-0.1, -0.3, -0.8, 0.85], [0.9, 0, 2.2, 0.7]]) {
        const c = new THREE.Group();
        const b = mesh(new THREE.SphereGeometry(0.28, 10, 8), fur);
        b.scale.set(1, 0.75, 1.4);
        b.position.y = 0.25;
        const head = mesh(box(0.28, 0.26, 0.34, 0, 0.3, 0.4), fur);
        c.add(b, head, mesh(box(0.18, 0.05, 0.03, 0, 0.47, 0.58), dark));
        for (const sx of [-0.1, 0.1]) c.add(mesh(new THREE.SphereGeometry(0.03, 6, 4).translate(sx, 0.5, 0.5), dark));
        c.position.set(x, x > 0.5 ? -0.08 : 0, z);
        c.rotation.y = ry;
        c.scale.setScalar(s);
        g.add(c);
        capys.push(c);
      }
      g.add(mesh(new THREE.SphereGeometry(0.06, 8, 6).translate(-0.9, 0.62, 0.15), M('#ff8c1a')));
      shadowAll(g);
      g.position.set(-0.2, 0.27, -2.55);
      g.userData.tick = (t) => capys.forEach((c, i) => { c.children[1].rotation.x = Math.sin(t * 1.3 + i * 2) * 0.15; });
      return g;
    },

    /** Little red Christmas hats with white bobbles on the chickens (@Eastonfortniteeee). Needs the chicken coop. */
    'xmas-hats'(entry) {
      const g = new THREE.Group();
      const hens = entry?.upgradeObjects?.chickens?.userData?.hens || [];
      for (const hen of hens) {
        const hat = new THREE.Group();
        hat.add(mesh(new THREE.ConeGeometry(0.075, 0.18, 10).translate(0, 0.09, 0), M('#d62828')));
        hat.add(mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 12).rotateX(Math.PI / 2), WHITE));
        hat.add(mesh(new THREE.SphereGeometry(0.035, 8, 6).translate(0.02, 0.19, 0), WHITE));
        hat.position.set(0.12, 0.43, 0);
        hat.rotation.z = -0.25;
        hen.add(hat);
      }
      return g;
    },

    /** A lion and a tiger lounging in the back yard, tails swishing (@prabhasishbhattacharya9226). */
    'big-cats'() {
      const g = new THREE.Group();
      const cat = (fur, stripes) => {
        const c = new THREE.Group();
        const body = mesh(new THREE.CapsuleGeometry(0.22, 0.6, 4, 10).rotateZ(Math.PI / 2), M(fur));
        body.position.y = 0.32;
        const head = mesh(new THREE.SphereGeometry(0.2, 12, 10), M(fur));
        head.position.set(0.52, 0.5, 0);
        c.add(body, head, mesh(box(0.14, 0.1, 0.16, 0.68, 0.4, 0), M(fur)), mesh(new THREE.SphereGeometry(0.03, 6, 4).translate(0.76, 0.47, 0), M('#2b1d14')));
        for (const z of [-0.09, 0.09]) {
          c.add(mesh(new THREE.SphereGeometry(0.03, 6, 4).translate(0.66, 0.56, z), M('#2b1d14')));
          c.add(mesh(new THREE.SphereGeometry(0.06, 6, 4).translate(0.48, 0.68, z * 1.4), M(fur)));
          for (const x of [-0.25, 0.25]) c.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.25, 6).translate(x, 0.12, z * 1.6), M(fur)));
        }
        if (stripes) for (let i = 0; i < 5; i++) c.add(mesh(new THREE.TorusGeometry(0.225, 0.025, 4, 12, Math.PI).rotateY(Math.PI / 2).translate(-0.3 + i * 0.15, 0.32, 0), M('#1f1a17')));
        const tail = mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.5, 6).translate(0, 0.25, 0), M(fur));
        tail.position.set(-0.5, 0.3, 0);
        tail.rotation.z = 1.0;
        c.add(tail);
        c.userData.tail = tail;
        return c;
      };
      const lion = cat('#d9a441', false);
      lion.add(mesh(new THREE.SphereGeometry(0.3, 12, 10).translate(0.46, 0.52, 0).scale(1, 1, 1), M('#8a4b1f')));
      lion.children.at(-1).position.x = -0.02;
      lion.position.set(-0.8, 0, 0);
      lion.rotation.y = 0.5;
      const tiger = cat('#f08a24', true);
      tiger.position.set(0.7, 0, 0.2);
      tiger.rotation.y = 2.4;
      g.add(lion, tiger);
      shadowAll(g);
      g.position.set(-0.3, 0.27, -2.5);
      g.userData.tick = (t) => { lion.userData.tail.rotation.x = Math.sin(t * 2) * 0.5; tiger.userData.tail.rotation.x = Math.sin(t * 2.4 + 1) * 0.5; };
      return g;
    },
  });

  /** Pizza place: a red-and-white shop with a brick oven chimney and a giant pizza slice on the roof (@POUSALI2412). */
  function pizzeria(def, floors = 1) {
    const g = new THREE.Group();
    const { body, H } = storefront(g, { w: 7, d: 5, wall: def.color || '#fbf3e4', awning: ['#d62828', '#f7f4ee'], floors });
    g.add(mesh(box(0.9, 1.8, 0.9, -2.6, H, -1.4), M('#a4472e', { flatShading: true })));
    const slice = new THREE.Group();
    const tri = new THREE.Shape([new THREE.Vector2(-1.3, 0), new THREE.Vector2(1.3, 0), new THREE.Vector2(0, 2.6)]);
    slice.add(mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.25, bevelEnabled: false }), M('#f6c453')));
    slice.add(mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.7, 12).rotateZ(Math.PI / 2).translate(0, 0, 0.12), M('#c98a3d')));
    for (const [x, y] of [[-0.5, 0.6], [0.45, 0.8], [0, 1.5], [-0.2, 1.05], [0.3, 0.35]]) slice.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 12).rotateX(Math.PI / 2).translate(x, y, 0.27), M('#c0392b')));
    slice.position.set(0.8, H + 0.5, 0.2);
    slice.rotation.x = -0.3;
    g.add(slice);
    shadowAll(g);
    g.userData.tick = (t) => { slice.rotation.y = Math.sin(t * 0.9) * 0.4; };
    return { group: g, body, height: H + 3.4 };
  }

  /** Capybara adoption centre: a friendly shelter with a giant capybara head on the roof and a fenced yard with capybaras and a pond (@ChristinneeeXD). */
  function capybaraAdoption(def, floors = 1) {
    const g = new THREE.Group();
    const H = 2.6 + dy(floors);
    const fur = M('#a0703f', { flatShading: true });
    const dark = M('#5a3b22');
    const body = mesh(box(7, H, 4, 0, 0, -3), M(def.color || '#cfe8d5'));
    g.add(body, mesh(box(7.3, 0.3, 4.3, 0, H, -3), M('#7a5c3e')));
    g.add(mesh(box(1.2, 1.8, 0.08, 0, 0, -0.98), M('#6b4630')));
    for (const x of [-2.4, 2.4]) g.add(mesh(box(1.4, 0.9, 0.06, x, 0.9, -0.98), GLASS));
    g.add(mesh(box(4.4, 0.6, 0.1, 0, H - 0.8, -0.95), M('#ffffff')), mesh(box(4.2, 0.4, 0.12, 0, H - 0.7, -0.92), M('#ff8c42')));
    // the giant capybara head on the roof
    const head = new THREE.Group();
    head.add(mesh(box(2.6, 2.2, 2.4, 0, 0, 0), fur), mesh(box(2.2, 1.4, 1.0, 0, 0.2, 1.5), fur), mesh(box(1.4, 0.3, 0.1, 0, 1.15, 2.02), dark));
    for (const s of [-1, 1]) {
      head.add(mesh(new THREE.SphereGeometry(0.2, 10, 8).translate(s * 0.8, 1.5, 1.22), dark));
      head.add(mesh(new THREE.SphereGeometry(0.35, 10, 8).scale(1, 1, 0.5).translate(s * 1.0, 2.25, -0.3), dark));
    }
    head.add(mesh(new THREE.SphereGeometry(0.4, 12, 10).translate(0, 2.55, 0.2), M('#ff8c1a')));
    head.position.set(0, H + 0.3, -3);
    g.add(head);
    // fenced yard with capybaras and a pond
    g.add(mesh(box(10, 0.05, 4.4, 0, 0, 2.8), M('#b4c98a')));
    for (let i = 0; i <= 20; i++) g.add(mesh(box(0.08, 0.6, 0.08, -5 + i * 0.5, 0, 5.0), WHITE));
    g.add(mesh(box(10, 0.06, 0.06, 0, 0.5, 5.0), WHITE));
    g.add(mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.06, 20).scale(1.4, 1, 0.8).translate(2.6, 0.06, 2.8), WATER));
    for (const [x, z, ry] of [[-3.2, 2.2, 0.6], [-1.6, 3.6, -0.5], [-0.2, 2.4, 2.2], [2.6, 2.8, 1.2]]) {
      const c = new THREE.Group();
      const b = mesh(new THREE.SphereGeometry(0.45, 10, 8), fur);
      b.scale.set(1, 0.75, 1.4);
      b.position.y = 0.4;
      c.add(b, mesh(box(0.45, 0.42, 0.55, 0, 0.45, 0.62), fur), mesh(box(0.3, 0.06, 0.04, 0, 0.72, 0.9), dark));
      c.position.set(x, x > 2 ? -0.15 : 0.05, z);
      c.rotation.y = ry;
      g.add(c);
    }
    shadowAll(g);
    g.userData.tick = (t) => { head.rotation.y = Math.sin(t * 0.6) * 0.25; };
    return { group: g, body, height: H + 3.6 };
  }

  /** Castle: a big stone castle with curtain walls and battlements, four round corner towers with pointed roofs, a gatehouse, a tall keep, flags and a moat (@karanchhabra6434). */
  function castle(def, floors = 1) {
    const g = new THREE.Group();
    const stone = M(def.color || '#b8b2a6', { flatShading: true });
    const roofM = M(def.accent || '#3a4f8c', { flatShading: true });
    const W = 4 + dy(floors) * 0.6; // walls rise with the floors
    // moat
    g.add(mesh(new THREE.RingGeometry(5.0, 5.9, 4, 1, Math.PI / 4).rotateX(-Math.PI / 2).scale(1.18, 1, 1.18).translate(0, 0.05, 0), WATER));
    const body = mesh(box(8, 0.3, 8), stone);
    g.add(body);
    const merlons = (len, x, z, alongX, y) => {
      for (let t = -len / 2 + 0.25; t < len / 2; t += 0.6) g.add(mesh(box(alongX ? 0.32 : 0.6, 0.4, alongX ? 0.6 : 0.32, alongX ? x + t : x, y, alongX ? z : z + t), stone));
    };
    for (const [x, z, alongX] of [[0, -3.7, true], [0, 3.7, true], [-3.7, 0, false], [3.7, 0, false]]) {
      g.add(mesh(box(alongX ? 7.4 : 0.6, W, alongX ? 0.6 : 7.4, x, 0, z), stone));
      merlons(7.4, x, z, alongX, W);
    }
    for (const x of [-3.7, 3.7]) for (const z of [-3.7, 3.7]) {
      g.add(mesh(new THREE.CylinderGeometry(1.0, 1.1, W + 1.6, 14).translate(x, (W + 1.6) / 2, z), stone));
      g.add(mesh(new THREE.ConeGeometry(1.25, 2.2, 14).translate(x, W + 2.7, z), roofM));
    }
    // gatehouse with a dark arch
    g.add(mesh(box(2.6, W + 1.2, 1.4, 0, 0, 3.7), stone));
    merlons(2.6, 0, 3.7, true, W + 1.2);
    g.add(mesh(box(1.3, 2.0, 0.1, 0, 0, 4.42), M('#2b2018')));
    g.add(mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.1, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(0, 2.0, 4.42), M('#2b2018')));
    g.add(mesh(box(1.5, 0.1, 1.6, 0, 0.1, 5.3), M('#7b5a3c'))); // drawbridge
    // keep in the middle with a flag
    const KH = W + 3.5;
    g.add(mesh(box(3.0, KH, 3.0, 0, 0, -0.6), stone));
    merlons(3.0, 0, -2.1, true, KH);
    merlons(3.0, 0, 0.9, true, KH);
    for (let f = 0; f < 3; f++) g.add(mesh(box(0.35, 0.7, 0.08, -0.7 + f * 0.7, KH - 1.6, 0.92), M('#2b2018')));
    g.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6).translate(0, KH + 1.1, -0.6), DARK));
    const flag = mesh(box(1.1, 0.6, 0.04, 0.55, KH + 1.5, -0.6), M('#d62828'));
    g.add(flag);
    shadowAll(g);
    g.userData.tick = (t) => { flag.rotation.y = Math.sin(t * 2) * 0.2; };
    return { group: g, body, height: KH + 2.4 };
  }

  /** Game store: a dark purple shop with a glowing neon sign, arcade cabinets in the window and a giant game controller on the roof (@PolerGG). */
  function gameStore(def, floors = 1) {
    const g = new THREE.Group();
    const { body, H, front } = storefront(g, { w: 8, d: 5, wall: def.color || '#3b2a5c', awning: ['#7a5cff', '#2bd9c4'], floors });
    g.add(mesh(box(5, 0.5, 0.12, 0, 2.35, front + 0.03), glow('#2bd9c4', 1, 3)));
    for (const [x, c] of [[-2.6, '#ff3b6b'], [-1.6, '#ffd23f']]) {
      g.add(mesh(box(0.6, 1.3, 0.5, x, 0, front - 0.5), M('#1f1f24')));
      g.add(mesh(box(0.45, 0.35, 0.05, x, 0.8, front - 0.24), glow(c, 0.8, 2.5)));
    }
    const pad = new THREE.Group();
    pad.add(mesh(new THREE.CapsuleGeometry(0.7, 1.6, 6, 14).rotateZ(Math.PI / 2), M('#2b2d33')));
    for (const s of [-1, 1]) pad.add(mesh(new THREE.SphereGeometry(0.75, 14, 10).translate(s * 1.1, -0.35, 0), M('#2b2d33')));
    pad.add(mesh(box(0.5, 0.15, 0.15, -0.9, 0.05, 0.62), M('#e9edf2')), mesh(box(0.15, 0.5, 0.15, -0.9, -0.12, 0.62), M('#e9edf2')));
    [['#e63946', 0.9, 0.25], ['#3a86ff', 1.2, 0], ['#ffd23f', 0.6, 0], ['#5cc55a', 0.9, -0.25]].forEach(([c, x, y]) => pad.add(mesh(new THREE.SphereGeometry(0.12, 8, 6).translate(x, y, 0.62), glow(c, 0.6, 2))));
    pad.position.set(0, H + 1.4, 0);
    g.add(pad);
    shadowAll(g);
    g.userData.tick = (t) => { pad.rotation.y = Math.sin(t * 0.8) * 0.5; pad.position.y = H + 1.4 + Math.sin(t * 1.6) * 0.15; };
    return { group: g, body, height: H + 2.8 };
  }

  /** Motel: a two-storey L-shaped motel with a walkway, numbered doors, a pool, parked cars and a tall glowing MOTEL sign (@AURABLOX-HQ). */
  function motel(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11.4, 0.05, 11.4), M('#9aa0a6')));
    const S = 2.2; // a storey
    const levels = 2 + Math.floor(Math.max(0, floors - 1) / 2);
    const H = levels * S;
    const wall = M(def.color || '#f2d6a2');
    const body = mesh(box(9, H, 2.6, 0, 0, -4), wall);
    g.add(body, mesh(box(2.6, H, 5, -3.2, 0, 0), wall), mesh(box(9.4, 0.3, 3, 0, H, -4), M('#c0392b')), mesh(box(3, 0.3, 5.4, -3.2, H, 0), M('#c0392b')));
    for (let l = 0; l < levels; l++) {
      const y = l * S;
      if (l > 0) g.add(mesh(box(9, 0.12, 1, 0, y, -2.2), M('#b2b6bc')), mesh(box(9, 0.06, 0.06, 0, y + 0.9, -1.75), M('#e9edf2')));
      for (let i = 0; i < 6; i++) {
        const x = -1.3 + i * 1.05;
        g.add(mesh(box(0.55, 1.5, 0.06, x, y, -2.68), M(['#3a86ff', '#2a9d8f', '#e76f51'][i % 3])));
        g.add(mesh(box(0.22, 0.14, 0.04, x, y + 1.6, -2.64), M('#ffffff')));
      }
    }
    // pool and cars
    g.add(mesh(box(3, 0.12, 2, 2.6, 0, 1.2), WHITE), mesh(box(2.6, 0.06, 1.6, 2.6, 0.08, 1.2), WATER));
    ['#e63946', '#ffd23f', '#3a86ff'].forEach((c, i) => {
      const car = new THREE.Group();
      car.add(mesh(box(0.9, 0.4, 1.6, 0, 0.12), M(c, { metalness: 0.4, roughness: 0.35 })), mesh(box(0.8, 0.32, 0.8, 0, 0.52, -0.1), M('#2b3440')));
      car.position.set(0.2 + i * 1.6, 0, 4.2);
      g.add(car);
    });
    // the tall neon sign
    g.add(mesh(box(0.25, 6, 0.25, 4.8, 0, 4.6), DARK));
    const sign = mesh(box(2.6, 1.0, 0.25, 4.8, 6, 4.6), glow('#ff3b6b', 0.8, 3));
    g.add(sign, mesh(box(0.6, 0.6, 0.2, 4.8, 7.1, 4.6), glow('#ffd23f', 0.8, 3)));
    shadowAll(g);
    g.userData.tick = (t) => { sign.visible = (t % 2.4) > 0.15; };
    return { group: g, body, height: Math.max(H + 1, 7.8) };
  }

  /** Bus depot: a big garage hall with three bays and a row of city buses, one of them driving out on its route and back (@markchesterajeemercado3237). */
  function busDepot(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(box(11.4, 0.05, 11.4), M('#8f959c')));
    const H = 3.4 + dy(floors) * 0.6;
    const body = mesh(box(10, H, 4.4, 0, 0, -3.4), M(def.color || '#d9dde2'));
    g.add(body, mesh(new THREE.CylinderGeometry(2.4, 2.4, 10.2, 20, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).scale(1, 0.35, 1).translate(0, H, -3.4), M('#5c6f8c')));
    for (let i = 0; i < 3; i++) g.add(mesh(box(2.6, 2.6, 0.08, -3.2 + i * 3.2, 0, -1.16), M('#2b3440')));
    g.add(mesh(box(5, 0.7, 0.1, 0, H - 0.9, -1.12), glow('#ffd23f', 0.5, 2)));
    const bus = (c) => {
      const b = new THREE.Group();
      b.add(mesh(box(1.2, 1.3, 3.6, 0, 0.25), M(c, { roughness: 0.4 })), mesh(box(1.22, 0.45, 3.4, 0, 0.85), M('#2b3440', { roughness: 0.2 })));
      b.add(mesh(box(1.0, 0.25, 0.06, 0, 1.3, 1.81), glow('#ffd23f', 0.6, 2)));
      for (const z of [-1.1, 1.1]) for (const x of [-0.6, 0.6]) b.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.2, 10).rotateZ(Math.PI / 2).translate(x, 0.25, z), DARK));
      return b;
    };
    const parked = ['#e63946', '#2a9d8f'].map((c, i) => { const b = bus(c); b.position.set(-3.2 + i * 3.2, 0, 1.0); g.add(b); return b; });
    void parked;
    const mover = bus('#3a86ff');
    g.add(mover);
    shadowAll(g);
    g.userData.tick = (t) => {
      const k = (t * 0.12) % 1; // out of bay 3, round the yard, back in
      const a = k * Math.PI * 2;
      mover.position.set(3.2 + Math.sin(a) * 1.4, 0, 2.6 - Math.cos(a) * 1.6 + 0.0);
      mover.rotation.y = a + Math.PI / 2;
    };
    g.userData.tick(0);
    return { group: g, body, height: H + 1.2 };
  }

  const day6Landmarks = { pizzeria, 'capybara-adoption': capybaraAdoption, castle, 'game-store': gameStore, motel, 'bus-depot': busDepot };

  // ---------------- Day 8 (2026-11-20) requests ----------------

  Object.assign(upgrades, {
    /** A swirling portal to the milk realm in the back yard: a stone ring with a creamy white vortex and milk splashes (@AverageHuman67). */
    'milk-portal'() {
      const g = new THREE.Group();
      const ring = mesh(new THREE.TorusGeometry(0.85, 0.16, 10, 32).translate(0, 1.15, 0), M('#8f8aa3', { flatShading: true }));
      g.add(ring);
      for (const s of [-1, 1]) g.add(mesh(box(0.35, 0.5, 0.5, s * 0.75, 0, 0), STONE));
      const swirl = new THREE.Group();
      swirl.position.y = 1.15;
      const milk = glow('#fffaf0', 0.55, 1.4);
      swirl.add(mesh(new THREE.CircleGeometry(0.76, 32), milk));
      const cream = M('#dfe9ff', { emissive: '#8fb4ff', emissiveIntensity: 0.5 });
      for (let i = 0; i < 3; i++) swirl.add(mesh(new THREE.TorusGeometry(0.2 + i * 0.18, 0.035, 6, 24, Math.PI * 1.4).rotateZ(i * 2.1).translate(0, 0, 0.02 + i * 0.01), cream));
      g.add(swirl);
      // a carton and a puddle in front: you can tell what realm it is
      g.add(mesh(new THREE.CircleGeometry(0.55, 20).rotateX(-Math.PI / 2).translate(0.2, 0.02, 0.55), M('#fffaf0', { roughness: 0.2 })));
      const carton = new THREE.Group();
      carton.add(mesh(box(0.22, 0.34, 0.22), M('#ffffff')), mesh(box(0.22, 0.08, 0.22, 0, 0.34), M('#3a86ff')));
      carton.add(mesh(new THREE.ConeGeometry(0.16, 0.12, 4).rotateY(Math.PI / 4).translate(0, 0.48, 0), M('#ffffff')));
      carton.position.set(0.75, 0, 0.55);
      carton.rotation.y = 0.5;
      g.add(carton);
      const drops = [];
      for (let i = 0; i < 5; i++) { const d = mesh(new THREE.SphereGeometry(0.07, 8, 6), milk); g.add(d); drops.push(d); }
      shadowAll(g);
      g.position.set(1.35, 0.27, -2.45);
      g.rotation.y = Math.PI / 2; // faces the side of the lot (the open side), not the house
      g.userData.view = Math.PI / 2 + 0.35; // the Short films it from that side, looking at the swirl
      g.userData.tick = (t) => {
        swirl.rotation.z = -t * 1.6;
        drops.forEach((d, i) => {
          const k = (t * 0.7 + i / 5) % 1;
          d.position.set(Math.cos(i * 1.3) * 0.3 * k, 1.15 + Math.sin(k * Math.PI) * 0.6 - k * 0.9, 0.3 + k * 0.6);
          d.scale.setScalar(1 - k * 0.6);
        });
      };
      g.userData.tick(0);
      return g;
    },

    /** A big lit sign on the roof with the owner's letters (e.g. "P.B."), on two posts (@prabhasishbhattacharya9226). */
    'rooftop-sign'(entry, up) {
      const text = String(up?.text || entry?.resident?.name?.replace(/^@/, '').slice(0, 2).toUpperCase() || '*').slice(0, 10);
      const g = new THREE.Group();
      const cv = document.createElement('canvas');
      cv.width = 512; cv.height = 192;
      const c = cv.getContext('2d');
      c.fillStyle = '#14202f'; c.fillRect(0, 0, 512, 192);
      c.strokeStyle = '#ffd23f'; c.lineWidth = 10; c.strokeRect(8, 8, 496, 176);
      c.font = `900 ${text.length > 5 ? 96 : 130}px Inter, Arial, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = '#ffb703'; c.shadowBlur = 24;
      c.fillStyle = '#fff3c4'; c.fillText(text, 256, 102);
      const tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
      const W = 2.8, Hs = 1.05;
      const face = new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.6 });
      const board = mesh(new THREE.BoxGeometry(W, Hs, 0.12).translate(0, 0.9 + Hs / 2, 0), [DARK, DARK, DARK, DARK, face, DARK]);
      g.add(board);
      for (const x of [-W * 0.35, W * 0.35]) g.add(mesh(box(0.08, 0.95, 0.08, x, 0, -0.05), M('#5b6b80', { metalness: 0.5 })));
      for (let i = 0; i < 9; i++) g.add(mesh(new THREE.SphereGeometry(0.05, 6, 4).translate(-W / 2 + 0.15 + i * ((W - 0.3) / 8), 0.9 + Hs + 0.06, 0.08), glow('#ffe7a8', 0.6, 2.2)));
      shadowAll(g);
      g.position.set(0, 0, 0.4);
      // stands on the roof, whatever height the house has right now
      g.userData.tick = () => { g.position.y = Math.max(1.5, (entry?.roofTop ?? 3) - 0.35); };
      g.userData.tick(0);
      return g;
    },

    /** A garden beside the house: raised flower beds, vegetable rows and a watering can (@TwoToThePowerOf999ImSmart). */
    garden() {
      const g = new THREE.Group();
      const soil = M('#6b4a2f', { roughness: 1 });
      const wood = M('#a47148');
      g.add(mesh(box(1.5, 0.03, 4.4), M('#b9d48c')));
      for (const z of [-1.5, 0, 1.5]) g.add(mesh(box(1.2, 0.22, 1.1, 0, 0, z), wood), mesh(box(1.08, 0.04, 0.98, 0, 0.2, z), soil));
      // flowers in the front bed, cabbages in the middle, tomato canes at the back
      const petals = ['#ff6fa5', '#ffd23f', '#9b5de5', '#ff7a45', '#ffffff'];
      for (let i = 0; i < 10; i++) {
        const f = mesh(new THREE.SphereGeometry(0.08, 6, 4), M(petals[i % 5]));
        f.position.set(-0.4 + (i % 5) * 0.2, 0.33, 1.25 + Math.floor(i / 5) * 0.45);
        g.add(f, mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 4).translate(f.position.x, 0.27, f.position.z), LEAF));
      }
      for (let i = 0; i < 6; i++) g.add(mesh(new THREE.IcosahedronGeometry(0.13, 0).translate(-0.3 + (i % 3) * 0.3, 0.32, -0.25 + Math.floor(i / 3) * 0.5), M('#6fbf4a', { flatShading: true })));
      for (let i = 0; i < 4; i++) {
        const x = -0.36 + i * 0.24;
        g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 4).translate(x, 0.5, -1.5), wood));
        g.add(mesh(new THREE.IcosahedronGeometry(0.1, 0).translate(x, 0.45, -1.5), LEAF), mesh(new THREE.SphereGeometry(0.06, 6, 4).translate(x + 0.05, 0.4, -1.42), M('#e63946')));
      }
      const can = new THREE.Group();
      can.add(mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.2, 10).translate(0, 0.1, 0), M('#2a9d8f')));
      can.add(mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.22, 5).rotateZ(-0.9).translate(0.15, 0.17, 0), M('#2a9d8f')));
      can.position.set(0.55, 0.03, 0.75);
      g.add(can);
      shadowAll(g);
      g.position.set(-2.55, 0.27, 0);
      return g;
    },

    /** A putting green with a flag, a sand bunker, a golf cart and a ball by the hole (@samuel_pagaimo). */
    golf() {
      const g = new THREE.Group();
      g.add(mesh(new THREE.CylinderGeometry(1, 1, 0.05, 28).scale(2.2, 1, 0.75).translate(0, 0.025, 0), M('#6cc24a', { roughness: 0.9 })));
      g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16).scale(1.3, 1, 0.8).translate(-1.6, 0.03, 0.35), M('#efd9a7')));
      g.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10).translate(1.1, 0.03, -0.1), DARK));
      g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 5).translate(1.1, 0.6, -0.1), WHITE));
      const flag = mesh(new THREE.PlaneGeometry(0.42, 0.26).translate(0.21, 1.05, 0), M('#e63946', { side: THREE.DoubleSide }));
      flag.position.set(1.1, 0, -0.1);
      g.add(flag);
      g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6).translate(0.75, 0.08, 0.15), WHITE));
      // golf cart
      const cart = new THREE.Group();
      cart.add(mesh(box(0.8, 0.3, 0.5, 0, 0.12), WHITE), mesh(box(0.35, 0.3, 0.5, -0.2, 0.42), M('#3b4552')));
      cart.add(mesh(box(0.85, 0.04, 0.55, 0, 0.95), M('#2a9d8f')));
      for (const x of [-0.32, 0.32]) for (const z of [-0.2, 0.2]) cart.add(mesh(box(0.03, 0.55, 0.03, x, 0.42, z), DARK));
      for (const x of [-0.25, 0.25]) for (const z of [-0.27, 0.27]) cart.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 10).rotateX(Math.PI / 2).translate(x, 0.1, z), DARK));
      cart.position.set(-1.0, 0, -0.55);
      cart.rotation.y = 0.3;
      g.add(cart);
      shadowAll(g);
      g.position.set(0.3, 0.27, -2.55);
      g.userData.tick = (t) => { flag.rotation.y = Math.sin(t * 2.4) * 0.25; };
      return g;
    },

    /** Two big pickup trucks parked beside the house: diesel country trucks, no badges (@Yattster). */
    'pickup-trucks'() {
      const g = new THREE.Group();
      const truck = (color) => {
        const t = new THREE.Group();
        const paint = M(color, { roughness: 0.35, metalness: 0.3 });
        t.add(mesh(box(1.9, 0.42, 0.85, 0, 0.22), paint));
        t.add(mesh(box(0.85, 0.42, 0.8, 0.35, 0.64), paint));
        t.add(mesh(box(0.06, 0.32, 0.7, 0.79, 0.68), GLASS), mesh(box(0.6, 0.26, 0.82, 0.35, 0.72), GLASS));
        t.add(mesh(box(0.95, 0.18, 0.75, -0.48, 0.64), M('#2b2d33')));
        t.add(mesh(box(0.1, 0.22, 0.86, 0.97, 0.26), M('#c0c4c8', { metalness: 0.7, roughness: 0.25 })));
        for (const x of [-0.6, 0.6]) for (const z of [-0.45, 0.45]) t.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.2, 14).rotateX(Math.PI / 2).translate(x, 0.24, z), DARK));
        return t;
      };
      const a = truck('#1d3557'); a.rotation.y = Math.PI / 2;
      const b = truck('#8b2e1f'); b.position.set(1.15, 0, 0.2); b.rotation.y = Math.PI / 2 + 0.08;
      g.add(a, b);
      shadowAll(g);
      g.scale.setScalar(0.85);
      g.position.set(2.35, 0.27, 1.1);
      return g;
    },
  });

  /**
   * Samurai Statue: a samurai in dark armour with a white headband, katana held low in both hands, on a stone plinth,
   * with stone lanterns and a cherry tree (@Get_jin_in_use; inspired by a samurai hero, no copied design).
   */
  function samuraiStatue(def, floors = 1) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(5.2, 5.4, 0.2, 32), M('#d9cfba')));
    g.add(mesh(box(9.5, 0.06, 1.6, 0, 0.2, 3.6), M('#c2b59b')));
    const P = 1.8 + dy(floors) * 0.6;
    const plinth = mesh(box(3.4, P, 3.4, 0, 0.2, 0), M('#7d7f86', { flatShading: true }));
    g.add(plinth, mesh(box(3.8, 0.3, 3.8, 0, 0.2 + P, 0), M('#5f6168')));
    const fig = new THREE.Group();
    fig.position.y = 0.5 + P;
    const armour = M(def.color || '#26324a', { roughness: 0.55, metalness: 0.25 });
    const lace = M('#8b1e2d');
    const cloth = M('#1b1d24');
    const skin = M('#e2b98f');
    const steel = M('#d9dde2', { metalness: 0.85, roughness: 0.2 });
    // legs in a wide stance (hakama) and feet
    for (const x of [-0.55, 0.55]) {
      fig.add(mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.7, 8).rotateZ(x > 0 ? -0.18 : 0.18).translate(x, 0.85, 0), cloth));
      fig.add(mesh(box(0.45, 0.2, 0.7, x * 1.25, 0, 0.1), DARK));
    }
    // skirt plates, body armour with lacing bands, gold belt, shoulder plates
    fig.add(mesh(new THREE.CylinderGeometry(0.85, 1.15, 0.9, 10, 1, true).translate(0, 1.75, 0), armour));
    fig.add(mesh(new THREE.CylinderGeometry(0.75, 0.82, 1.4, 10).translate(0, 2.85, 0), armour));
    for (const y of [2.35, 2.75, 3.15]) fig.add(mesh(new THREE.TorusGeometry(0.8, 0.05, 6, 20).rotateX(Math.PI / 2).translate(0, y, 0), lace));
    fig.add(mesh(new THREE.TorusGeometry(0.86, 0.09, 6, 20).rotateX(Math.PI / 2).translate(0, 2.05, 0), M('#c9a227')));
    for (const s of [-1, 1]) {
      const sh = mesh(new THREE.BoxGeometry(0.75, 0.7, 0.9), armour);
      sh.position.set(s * 1.0, 3.25, 0);
      sh.rotation.z = s * -0.35;
      fig.add(sh);
      // arms forward, both hands on the hilt in front of the body
      const arm = mesh(new THREE.CylinderGeometry(0.17, 0.2, 1.1, 8), cloth);
      arm.position.set(s * 0.45, 2.85, 0.5);
      arm.rotation.set(-1.0, 0, s * 0.45);
      fig.add(arm);
    }
    fig.add(mesh(new THREE.SphereGeometry(0.2, 8, 6).translate(0, 2.55, 1.0), skin));
    // katana: guard, grip and a long blade angled down and forward
    const sword = new THREE.Group();
    sword.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6).translate(0, 0.27, 0), M('#2b2d33')));
    sword.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12), M('#c9a227')));
    sword.add(mesh(new THREE.BoxGeometry(0.09, 2.4, 0.03).translate(0, -1.2, 0), steel));
    sword.position.set(0, 2.55, 1.05);
    sword.rotation.x = 2.3; // blade forward and down, ready
    fig.add(sword);
    // scabbard at the hip
    fig.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 6).rotateZ(1.25).translate(-0.7, 1.95, 0.45), M('#1b1d24')));
    // head: neck, face, hair, white headband with tails, topknot, eyes
    fig.add(mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.25, 8).translate(0, 3.6, 0), skin));
    fig.add(mesh(new THREE.SphereGeometry(0.45, 12, 10).translate(0, 4.0, 0), skin));
    fig.add(mesh(new THREE.SphereGeometry(0.48, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 4.05, -0.04), cloth));
    fig.add(mesh(new THREE.TorusGeometry(0.47, 0.06, 6, 20).rotateX(Math.PI / 2).translate(0, 4.12, 0), WHITE));
    for (const s of [-1, 1]) {
      const tail = mesh(new THREE.BoxGeometry(0.1, 0.55, 0.04), WHITE);
      tail.position.set(s * 0.12, 3.85, -0.5);
      tail.rotation.set(0.35, 0, s * 0.2);
      fig.add(tail);
    }
    fig.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.35, 8).translate(0, 4.55, -0.1), cloth));
    fig.add(mesh(box(0.06, 0.06, 0.06, -0.15, 3.97, 0.42), DARK), mesh(box(0.06, 0.06, 0.06, 0.15, 3.97, 0.42), DARK));
    // a cape flowing behind
    const cape = mesh(new THREE.BoxGeometry(1.3, 2.2, 0.08), lace);
    cape.position.set(0, 2.3, -0.9);
    cape.rotation.x = 0.18;
    fig.add(cape);
    fig.scale.setScalar(1.15);
    g.add(fig);
    // stone lanterns and a cherry tree
    for (const x of [-3.8, 3.8]) {
      g.add(mesh(box(0.35, 1.0, 0.35, x, 0.2, 3.4), STONE), mesh(box(0.8, 0.5, 0.8, x, 1.2, 3.4), STONE));
      g.add(mesh(box(0.5, 0.35, 0.5, x, 1.25, 3.4), glow('#ffd38a', 0.25, 2)));
      g.add(mesh(new THREE.ConeGeometry(0.75, 0.5, 4).rotateY(Math.PI / 4).translate(x, 1.95, 3.4), STONE));
    }
    g.add(mesh(new THREE.CylinderGeometry(0.15, 0.25, 2.2, 7).translate(-3.6, 1.3, -2.8), TRUNK));
    for (const [x, y, z, r] of [[-3.6, 3.0, -2.8, 1.3], [-3.0, 2.6, -2.3, 0.9], [-4.2, 2.7, -2.4, 0.85]]) g.add(mesh(new THREE.IcosahedronGeometry(r, 0).translate(x, y, z), M('#f7b6c8', { flatShading: true })));
    shadowAll(g);
    return { group: g, body: plinth, height: 0.5 + P + 4.8 * 1.15 };
  }

  const day8Landmarks = { 'samurai-statue': samuraiStatue };

  return {
    upgrades,
    landmarks: {
      stadium, ballpark, 'theme-park': themePark, 'power-plant': powerPlant, park, farm, 'watermelon-factory': watermelonFactory, 'car-show': carShow,
      mosque, 'race-track': raceTrack, circus, airport, rail, aquarium, 'toy-factory': toyFactory, hospital, 'space-center': spaceCenter,
      museum, bakery, 'fire-station': fireStation, 'pet-store': petStore, 'corner-shop': cornerShop, 'jewelry-store': jewelryStore,
      'mma-gym': mmaGym, school, market, mall,
      ...day5Landmarks,
      ...day6Landmarks,
      ...day8Landmarks,
    },
  };
}
