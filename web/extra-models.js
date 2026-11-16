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

  return {
    upgrades,
    landmarks: {
      stadium, ballpark, 'theme-park': themePark, 'power-plant': powerPlant, park, farm, 'watermelon-factory': watermelonFactory, 'car-show': carShow,
      mosque, 'race-track': raceTrack, circus, airport, rail, aquarium, 'toy-factory': toyFactory, hospital, 'space-center': spaceCenter,
      museum, bakery, 'fire-station': fireStation, 'pet-store': petStore, 'corner-shop': cornerShop, 'jewelry-store': jewelryStore,
      'mma-gym': mmaGym, school, market, mall,
    },
  };
}
