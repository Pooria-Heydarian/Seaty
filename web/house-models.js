// One-off house models, made in the daily session for requests the kit can't do
// ("a house shaped like X"). Each model is a shape like the ones in houses.js:
//
//   'model-id'(g, r, h, k) -> { body, top, eave, front, width, tick? }
//     g  THREE.Group to add meshes to (house faces +z, the lot is 6 x 6, keep it within about 5 x 5)
//     r  the recipe: r.wall, r.roofColor, r.door, r.accent (#rrggbb) and r.extras
//     h  height from the floors (floors x 1.2). Every floor must show: start at your minimum height and add
//        (h - k.FLOOR_H), e.g. const H = 3.0 + h, so 1 and 2 floors never look the same
//     k  helpers: THREE, plain(color, extra), glowing(color, day, night), windowBox(w, h, d, color, y),
//        windowCylinder(rTop, rBottom, h, color, y), door(color, z, scale, y), roof(g, kind, color, w, d, y),
//        box(w, h, d, y), WHITE, DARK, GOLD, WOOD, LEAF, GLASS, FOOT, FLOOR_H
//     returns body = the main mesh (clicks + outline), top = highest point, eave = wall top,
//             front = z of the front, width = overall width (extras use these)
//
// After adding a model here, add its id + a one-line description to HOUSE_SHAPES in catalog.js,
// then give it to the person: npm run special -- house <who> '{"shape":"<model-id>", ...}' --title "..."

export const HOUSE_MODELS = {
  /** A giant head with a boxy flat-top afro and a two-colour visor (requested by @TheBigCityBee, Day 2). */
  'gem-head'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 3.0 + h; // 4.2 at 1 floor, +1.2 per floor
    const skin = plain(r.wall);
    const shade = plain(new THREE.Color(r.wall).multiplyScalar(0.8).getStyle());
    // hair a little lighter than the recipe colour, so its shape reads in shadow
    const hair = plain(new THREE.Color(r.roofColor).lerp(new THREE.Color('#6b4f7a'), 0.25).getStyle(), { flatShading: true, roughness: 0.95 });
    // neck + face (the face is the house)
    g.add(new THREE.Mesh(k.box(1.8, 0.45, 1.8, 0), shade));
    const body = new THREE.Mesh(k.box(3.1, H, 2.8, 0.4), skin);
    g.add(body);
    for (const s of [-1, 1]) g.add(new THREE.Mesh(k.box(0.22, 0.7, 0.5, 0.4 + H * 0.45).translate(s * 1.62, 0, -0.1), skin)); // ears
    // visor: one band, left lens warm, right lens cool
    const vy = 0.4 + H * 0.58;
    g.add(new THREE.Mesh(k.box(3.3, 0.66, 0.26, vy).translate(0, 0, 1.48), k.DARK));
    g.add(new THREE.Mesh(k.box(1.48, 0.5, 0.1, vy + 0.08).translate(-0.78, 0, 1.63), glowing(r.accent, 0.4, 1.6)));
    g.add(new THREE.Mesh(k.box(1.48, 0.5, 0.1, vy + 0.08).translate(0.78, 0, 1.63), glowing('#3fb6e8', 0.4, 1.6)));
    // nose, lips, door in the chin
    g.add(new THREE.Mesh(k.box(0.38, 0.55, 0.32, vy - 0.65).translate(0, 0, 1.5), shade));
    g.add(new THREE.Mesh(k.box(1.1, 0.16, 0.08, vy - 1.15).translate(0, 0, 1.42), plain('#5a2236')));
    g.add(k.door(r.door, 1.4, 0.8, 0.4));
    // boxy flat-top afro: starts just above the visor, wider than the face, with a stepped top so it looks soft
    const hy = vy + 0.5;
    const hairH = Math.max(1.6, H * 0.42);
    g.add(new THREE.Mesh(k.box(3.8, hairH, 3.3, hy).translate(0, 0, -0.2), hair));
    g.add(new THREE.Mesh(k.box(3.45, 0.3, 2.95, hy + hairH).translate(0, 0, -0.2), hair));
    // the back of the hair comes down behind the head
    g.add(new THREE.Mesh(k.box(3.6, hy - 0.4 - H * 0.25, 0.7, 0.4 + H * 0.25).translate(0, 0, -1.5), hair));
    const top = hy + hairH + 0.3;
    return { body, top, eave: hy, front: 1.7, width: 3.8 };
  },

  /** A chess knight standing on a round base, with a blue "!!" brilliant-move badge floating above (requested by @Railey_508, Day 2). */
  'chess-knight'(g, r, h, k) {
    const { THREE, plain } = k;
    const H = 3.0 + h; // 4.2 at 1 floor, +1.2 per floor
    const piece = plain(r.wall, { roughness: 0.45 });
    // round stepped base
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.45, 32).translate(0, 0.225, 0), piece));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.95, 0.4, 32).translate(0, 0.65, 0), piece));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.08, 8, 32).rotateX(Math.PI / 2).translate(0, 0.86, 0), piece));
    // the horse head: a side profile (faces +x), extruded
    const P = [[-1.3, 0], [1.3, 0], [1.1, 0.5], [0.55, 0.9], [0.75, 1.6], [1.55, 2.05], [1.75, 2.55], [1.25, 3.1], [0.6, 3.5],
      [0.42, 4.0], [0.1, 3.62], [-0.3, 3.92], [-0.62, 3.3], [-1.02, 2.4], [-1.12, 1.4], [-0.92, 0.8], [-1.3, 0.5]];
    const shape = new THREE.Shape(P.map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.7, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }).translate(0, 0, -0.85);
    const sy = (H - 0.9) / 4;
    geo.scale(1.15, sy, 1);
    const body = new THREE.Mesh(geo.translate(0, 0.9, 0), piece);
    g.add(body);
    // eye and mane line
    const dark = plain(r.roofColor);
    for (const z of [-0.98, 0.98]) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8).translate(0.75, 0.9 + 3.05 * sy, z), dark));
    // windows down the neck, a door in the base
    for (let i = 0; i < Math.max(1, Math.floor(sy * 3)); i++) {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.06).translate(-0.2, 1.6 + i * 0.85 * sy, 1.0), k.GLASS));
    }
    g.add(k.door(r.door, 1.0, 0.85, 0.85));
    // "!!" badge: blue disc with two white exclamation marks, floating and turning slowly
    const badge = new THREE.Group();
    badge.add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.16, 32).rotateX(Math.PI / 2), k.glowing(r.accent, 0.3, 1.2)));
    const mark = plain('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 });
    for (const x of [-0.22, 0.22]) for (const z of [0.09, -0.09]) {
      badge.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.62, 0.04).translate(x, 0.14, z), mark));
      badge.add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, 0.04).translate(x, -0.4, z), mark));
    }
    const by = 0.9 + 4.0 * sy + 1.3;
    badge.position.set(0.3, by, 0);
    g.add(badge);
    return {
      body, top: by + 0.9, eave: 0.9 + 3.6 * sy, front: 2.2, width: 4.6,
      tick: (t) => { badge.rotation.y = t * 0.9; badge.position.y = by + Math.sin(t * 2) * 0.15; },
    };
  },

  /** Medieval house: stone ground floor, overhanging half-timbered upper floors, steep roof (requested by @Historyguy-i2m, Day 3). */
  medieval(g, r, h, k) {
    const { THREE, plain } = k;
    const stone = plain('#8f8a80', { flatShading: true });
    const beam = plain('#4a3426');
    const plaster = plain(r.wall);
    const gh = 1.4;
    g.add(new THREE.Mesh(k.box(3.6, gh, 3.2), stone));
    // arched door
    g.add(k.door(r.door, 1.6, 0.95));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(0, 1.42, 1.66), plain(r.door)));
    // upper floors: overhang ("jetty"), one band of timber per floor
    const uh = 1.4 + (h - k.FLOOR_H);
    const W = 4.1, D = 3.7;
    const upper = new THREE.Mesh(k.box(W, uh, D, gh), plaster);
    g.add(upper);
    const floors = Math.max(1, Math.round(uh / 1.2));
    for (let i = 0; i <= floors; i++) g.add(new THREE.Mesh(k.box(W + 0.06, 0.14, D + 0.06, gh + (uh * i) / floors - 0.07), beam));
    for (const x of [-W / 2, -W / 6, W / 6, W / 2]) for (const z of [-D / 2, D / 2]) g.add(new THREE.Mesh(k.box(0.14, uh, 0.14, gh).translate(x, 0, z), beam));
    for (const x of [-W / 2, W / 2]) for (const z of [-D / 6, D / 6]) g.add(new THREE.Mesh(k.box(0.14, uh, 0.14, gh).translate(x, 0, z), beam));
    // diagonal braces + small windows, every floor
    for (let i = 0; i < floors; i++) {
      const y0 = gh + (uh * i) / floors, fh = uh / floors;
      for (const s of [-1, 1]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, Math.hypot(W / 3, fh) * 0.95, 0.1), beam);
        brace.position.set(s * W / 3, y0 + fh / 2, D / 2 + 0.03);
        brace.rotation.z = s * Math.atan2(W / 3, fh);
        g.add(brace);
      }
      g.add(new THREE.Mesh(k.box(0.7, fh * 0.5, 0.08, y0 + fh * 0.25).translate(0, 0, D / 2 + 0.04), k.GLASS));
      for (const x of [-W / 2 - 0.04, W / 2 + 0.04]) g.add(new THREE.Mesh(k.box(0.08, fh * 0.45, 0.6, y0 + fh * 0.28).translate(x, 0, 0), k.GLASS));
    }
    // steep gable roof + stone chimney
    const top = gh + uh;
    const tri = new THREE.Shape([new THREE.Vector2(-W / 2 - 0.3, 0), new THREE.Vector2(W / 2 + 0.3, 0), new THREE.Vector2(0, 2.4)]);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: D + 0.5, bevelEnabled: false }).translate(0, top, -D / 2 - 0.25), plain(r.roofColor, { flatShading: true })));
    g.add(new THREE.Mesh(k.box(0.55, 2.6, 0.55, top - 0.2).translate(1.2, 0, -0.9), stone));
    return { body: upper, top: top + 2.4, eave: top, front: D / 2 + 0.1, width: W + 0.6 };
  },

  /** Bunker: concrete bunker half-buried in a grassy mound, slit windows, heavy door, vents, antenna (requested by @GLITCHPROBGAMING, Day 3). */
  bunker(g, r, h, k) {
    const { THREE, plain } = k;
    const concrete = plain(r.wall, { roughness: 0.95 });
    const H = 1.6 + (h - k.FLOOR_H);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), plain('#6f9e4f', { flatShading: true }));
    mound.scale.set(1, (H + 0.4) / 2.5, 1);
    mound.position.z = -0.4;
    g.add(mound);
    const face = new THREE.Mesh(k.box(3.4, H, 1.0).translate(0, 0, 1.55), concrete);
    g.add(face, new THREE.Mesh(k.box(3.8, 0.3, 1.3, H).translate(0, 0, 1.6), concrete));
    // one row of slit windows per floor
    const rows = Math.max(1, Math.round(H / 1.2));
    for (let i = 0; i < rows; i++) for (const x of [-1.15, 1.15]) {
      g.add(new THREE.Mesh(k.box(0.8, 0.14, 0.05, 0.75 + (i * (H - 0.6)) / rows).translate(x, 0, 2.06), k.DARK));
    }
    // heavy door with a wheel and hazard stripes
    g.add(new THREE.Mesh(k.box(1.1, 1.45, 0.08, 0).translate(0, 0, 2.06), plain(r.door, { metalness: 0.5, roughness: 0.45 })));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 16).translate(0, 0.75, 2.13), k.DARK));
    for (let i = 0; i < 5; i++) g.add(new THREE.Mesh(k.box(0.22, 0.18, 0.04, 1.55).translate(-0.44 + i * 0.22, 0, 2.08), i % 2 ? k.DARK : plain(r.accent)));
    // vents and antenna on the mound
    for (const [x, z] of [[-1.0, -0.8], [0.9, -1.2]]) {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, H * 0.9, 8).translate(x, H * 0.45 + 0.4, z), concrete));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8).translate(x, H * 0.9 + 0.45, z), k.DARK));
    }
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 5).translate(0.2, H + 1.4, -0.6), k.DARK));
    return { body: face, top: H + 2.4, eave: H, front: 2.1, width: 3.8 };
  },

  /** Caravan: camper trailer with an awning, wheels and a hitch; every extra floor adds a pop-top level (requested by @MRBNANAMRBNANA, Day 3). */
  caravan(g, r, h, k) {
    const { THREE, plain } = k;
    const shell = plain(r.wall, { roughness: 0.4 });
    const L = 4.0, Wd = 2.0, ch = 1.5, lift = 0.38;
    const body = new THREE.Mesh(k.box(L, ch, Wd, lift), shell);
    g.add(body);
    // rounded ends
    for (const s of [-1, 1]) {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(ch / 2, ch / 2, Wd, 16, 1, false, s > 0 ? 0 : Math.PI, Math.PI).rotateX(Math.PI / 2).translate(s * L / 2, lift + ch / 2, 0), shell));
    }
    // stripe, windows, door
    g.add(new THREE.Mesh(k.box(L + 1.2, 0.16, Wd + 0.02, lift + 0.45), plain(r.accent)));
    for (const x of [-1.25, 0.9]) g.add(new THREE.Mesh(k.box(0.9, 0.45, 0.05, lift + 0.85).translate(x, 0, Wd / 2 + 0.01), k.GLASS));
    g.add(new THREE.Mesh(k.box(0.6, 1.15, 0.05, lift + 0.1).translate(-0.2, 0, Wd / 2 + 0.02), plain(r.door)));
    // wheels + hitch
    for (const z of [-Wd / 2 - 0.05, Wd / 2 + 0.05]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 14).rotateX(Math.PI / 2).translate(0.2, 0.32, z), k.DARK));
    g.add(new THREE.Mesh(k.box(0.9, 0.08, 0.08, 0.4).translate(L / 2 + 1.0, 0, 0), k.DARK));
    // awning over the door, on two poles
    const awn = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 1.1), plain(r.accent));
    awn.position.set(-0.2, lift + ch - 0.12, Wd / 2 + 0.55);
    awn.rotation.x = 0.18;
    g.add(awn);
    for (const x of [-1.15, 0.75]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, lift + ch - 0.2, 5).translate(x, (lift + ch - 0.2) / 2, Wd / 2 + 1.05), k.DARK));
    // pop-top levels for extra floors
    let top = lift + ch + 0.1;
    const extra = h - k.FLOOR_H;
    if (extra > 0.01) {
      g.add(k.windowBox(L - 0.6, extra, Wd - 0.2, r.wall, lift + ch));
      g.add(new THREE.Mesh(k.box(L - 0.4, 0.12, Wd, lift + ch + extra), plain(r.roofColor)));
      top = lift + ch + extra + 0.12;
    }
    return { body, top, eave: lift + ch + Math.max(0, extra), front: Wd / 2 + 1.1, width: L + 1.4 };
  },

  /** Japanese house with a café: stone base, wooden posts, paper screens, tiled roofs with upturned corners (one tier per floor), noren curtain, lanterns (requested by @Get_jin_in_use, Day 3). */
  'japanese-cafe'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const wood = plain(r.wall);
    const paper = plain('#f6f1e4');
    const tile = plain(r.roofColor, { flatShading: true });
    g.add(new THREE.Mesh(k.box(4.4, 0.35, 3.8), plain('#9a958b', { flatShading: true })));
    const tiers = Math.max(1, Math.round(h / k.FLOOR_H));
    let y = 0.35;
    let body = null;
    for (let t = 0; t < tiers; t++) {
      const w = 3.6 - t * 0.45, d = 3.0 - t * 0.35, th = t === 0 ? 1.5 : 1.1;
      const wall = new THREE.Mesh(k.box(w, th, d, y), paper);
      g.add(wall);
      body ||= wall;
      // wooden posts and a rail
      for (const x of [-w / 2, -w / 6, w / 6, w / 2]) for (const z of [-d / 2, d / 2]) g.add(new THREE.Mesh(k.box(0.12, th, 0.12, y).translate(x, 0, z), wood));
      for (const x of [-w / 2, w / 2]) for (const z of [-d / 6, d / 6]) g.add(new THREE.Mesh(k.box(0.12, th, 0.12, y).translate(x, 0, z), wood));
      g.add(new THREE.Mesh(k.box(w + 0.04, 0.06, d + 0.04, y + th * 0.5), wood));
      // tiled roof with upturned corners
      const ry = y + th;
      const rw = w + 1.1, rd = d + 1.1;
      g.add(new THREE.Mesh(k.box(rw, 0.12, rd, ry), tile));
      const cap = new THREE.Mesh(new THREE.ConeGeometry(Math.max(rw, rd) * 0.62, 0.9, 4).rotateY(Math.PI / 4).translate(0, ry + 0.55, 0), tile);
      cap.scale.set(rw / Math.max(rw, rd), 1, rd / Math.max(rw, rd));
      g.add(cap);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 4).translate(0, 0.2, 0), tile);
        tip.position.set(sx * rw / 2, ry + 0.06, sz * rd / 2);
        tip.rotation.set(sz * 0.6, 0, -sx * 0.6);
        g.add(tip);
      }
      y = ry + 0.35;
    }
    // café front: door with a noren curtain, a sign and two red lanterns
    g.add(k.door(r.door, 1.5, 1.0, 0.35));
    for (let i = 0; i < 3; i++) g.add(new THREE.Mesh(k.box(0.3, 0.55, 0.03, 1.3).translate(-0.33 + i * 0.33, 0, 1.58), plain(r.accent)));
    g.add(new THREE.Mesh(k.box(1.2, 0.35, 0.06, 1.95).translate(0, 0, 1.56), wood));
    for (const x of [-1.3, 1.3]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), glowing('#e63946', 0.6, 2.4));
      lamp.scale.set(1, 1.3, 1);
      lamp.position.set(x, 1.35, 1.75);
      g.add(lamp);
    }
    return { body, top: y + 0.6, eave: y - 0.35, front: 1.9, width: 4.6 };
  },

  /** A white presidential mansion: a columned portico with a pediment, two lower wings, a balustrade on the roof, chimneys and a flag (requested by @JacksonGross-q4b, Day 6). */
  'white-house'(g, r, h, k) {
    const { THREE, plain } = k;
    const H = 2.1 + h * 0.55; // stays wide and low: 2.8 at 1 floor, +0.66 per floor
    const wall = plain(r.wall);
    const trim = plain('#ffffff');
    const body = new THREE.Mesh(k.box(2.6, H, 2.6, 0), wall);
    g.add(body);
    for (const s of [-1, 1]) g.add(new THREE.Mesh(k.box(1.2, H * 0.78, 2.2, 0).translate(s * 1.9, 0, -0.1), wall));
    // roof balustrade and low roof
    g.add(new THREE.Mesh(k.box(2.8, 0.18, 2.8, H), trim), new THREE.Mesh(k.box(2.5, 0.35, 2.5, H + 0.18), plain(r.roofColor)));
    for (const s of [-1, 1]) {
      g.add(new THREE.Mesh(k.box(1.3, 0.15, 2.3, H * 0.78).translate(s * 1.9, 0, -0.1), trim));
      g.add(new THREE.Mesh(k.box(0.25, 0.6, 0.25, H + 0.2).translate(s * 0.8, 0, -0.6), plain('#e9e4dc')));
    }
    // portico: four columns, a triangular pediment, steps
    for (let i = 0; i < 4; i++) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, H - 0.35, 12).translate(-0.75 + i * 0.5, (H - 0.35) / 2 + 0.2, 1.65), trim));
    g.add(new THREE.Mesh(k.box(2.0, 0.2, 0.9, H - 0.15).translate(0, 0, 1.55), trim));
    const tri = new THREE.Shape([new THREE.Vector2(-1.05, 0), new THREE.Vector2(1.05, 0), new THREE.Vector2(0, 0.6)]);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.9, bevelEnabled: false }).translate(0, H + 0.05, 1.1), trim));
    for (let i = 0; i < 2; i++) g.add(new THREE.Mesh(k.box(2.2 - i * 0.3, 0.1, 0.4, i * 0.1).translate(0, 0, 2.2 - i * 0.2), trim));
    // windows on every floor
    const win = plain('#3d4a5c');
    const rowsW = Math.max(1, Math.floor((H - 0.6) / 1.0));
    for (let f = 0; f < rowsW; f++) for (const x of [-2.2, -1.6, 1.6, 2.2]) {
      if (Math.abs(x) > 1.4 && 0.45 + f * 1.0 + 0.6 > H * 0.78) continue;
      g.add(new THREE.Mesh(k.box(0.3, 0.5, 0.05, 0.45 + f * 1.0).translate(x, 0, Math.abs(x) > 1.4 ? 1.02 : 1.31), win));
    }
    g.add(k.door(r.door, 1.32, 0.9));
    // flag on the roof
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6).translate(0, H + 1.2, -0.3), k.DARK));
    g.add(new THREE.Mesh(k.box(0.7, 0.4, 0.03, H + 1.45).translate(0.37, 0, -0.3), plain(r.accent)));
    return { body, top: H + 1.9, eave: H, front: 2.4, width: 4.6 };
  },

  /** A rainbow house: every floor band in the next rainbow colour, a white gable roof and a rainbow arching over it (requested by @AverageHuman67, Day 6). */
  rainbow(g, r, h, k) {
    const { THREE, plain } = k;
    const H = 2.4 + h;
    const colors = ['#e63946', '#ff8c42', '#ffd23f', '#5cc55a', '#3a86ff', '#7a5cff'];
    const body = new THREE.Mesh(k.box(3.2, H, 3.0, 0), plain('#ffffff'));
    g.add(body);
    const band = H / Math.ceil(H / 0.6);
    for (let i = 0, y = 0; y < H - 0.01; i++, y += band) g.add(new THREE.Mesh(k.box(3.24, band, 3.04, y), plain(colors[i % colors.length])));
    const win = plain('#ffffff');
    for (let f = 0; f * k.FLOOR_H + 1.0 < H; f++) for (const x of [-0.9, 0.9]) g.add(new THREE.Mesh(k.box(0.5, 0.5, 0.05, 0.7 + f * k.FLOOR_H).translate(x, 0, 1.53), win));
    g.add(k.door(r.door || '#ffffff', 1.52));
    const top = k.roof(g, 'gable', r.roofColor || '#ffffff', 3.2, 3.0, H);
    const arc = new THREE.Group();
    colors.forEach((c, i) => arc.add(new THREE.Mesh(new THREE.TorusGeometry(2.3 - i * 0.14, 0.07, 6, 32, Math.PI), plain(c, { emissive: c, emissiveIntensity: 0.25 }))));
    arc.position.set(0, top - 0.6, -0.4);
    g.add(arc);
    return { body, top: top + 1.8, eave: H, front: 1.5, width: 4.6 };
  },

  /** A round space-station house: a grey sphere with an equator trench, panel lines and a big round dish, on a landing pad (requested by @JackMihna, Day 6). */
  'space-station'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const R = 1.5 + h * 0.32; // the sphere grows with every floor
    const shell = plain(r.wall, { roughness: 0.55, flatShading: true });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.4, 24).translate(0, 0.2, 0), k.DARK));
    const cy = 0.4 + R;
    const body = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 20).translate(0, cy, 0), shell);
    g.add(body);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R * 1.0, R * 0.05, 6, 40).rotateX(Math.PI / 2).translate(0, cy, 0), plain('#5c636e')));
    for (const lat of [-0.55, -0.3, 0.3, 0.55]) {
      const rr = R * Math.cos(lat);
      g.add(new THREE.Mesh(new THREE.TorusGeometry(rr * 1.005, 0.02, 4, 40).rotateX(Math.PI / 2).translate(0, cy + R * Math.sin(lat), 0), plain('#8a919c')));
    }
    // the dish: a dark bowl on the upper front with a glowing centre
    const dish = new THREE.Group();
    dish.add(new THREE.Mesh(new THREE.CircleGeometry(R * 0.32, 24), plain('#5c636e')));
    dish.add(new THREE.Mesh(new THREE.TorusGeometry(R * 0.32, 0.04, 6, 24), plain('#3b4552')));
    dish.add(new THREE.Mesh(new THREE.CircleGeometry(R * 0.07, 12).translate(0, 0, 0.01), glowing(r.accent, 0.8, 2.5)));
    const a = 0.55, b = 0.5; // up and to the side
    dish.position.set(Math.sin(b) * Math.cos(a) * R * 1.0, cy + Math.sin(a) * R, Math.cos(b) * Math.cos(a) * R * 1.0);
    dish.lookAt(new THREE.Vector3(dish.position.x * 2, cy + (dish.position.y - cy) * 2, dish.position.z * 2));
    g.add(dish);
    // little lit windows along the trench
    for (let i = 0; i < 10; i++) {
      const t = -0.9 + i * 0.2;
      g.add(new THREE.Mesh(k.box(0.12, 0.08, 0.04, cy - 0.04).translate(Math.sin(t) * R * 1.01, 0, Math.cos(t) * R * 1.01), glowing('#ffe7a8', 0.3, 2)));
    }
    g.add(k.door(r.door, 1.62, 0.8));
    return { body, top: cy + R + 0.2, eave: cy, front: R, width: R * 2 };
  },

  /** A glass spire tower: a sleek tapering glass skyscraper on a solid base, with a parapet and a tall lit spire (requested by @Owen_B13, Day 6). */
  'glass-spire'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 5.0 + h * 1.4;
    g.add(new THREE.Mesh(k.box(3.4, 1.0, 3.4, 0), plain('#c9ccd1')));
    const glass = plain(r.wall, { roughness: 0.12, metalness: 0.55 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.75, H, 4, 1).rotateY(Math.PI / 4).translate(0, 1.0 + H / 2, 0), glass);
    g.add(body);
    // vertical edge lines and floor bands
    for (let i = 0; i < Math.floor(H / 1.2); i++) {
      const y = 1.0 + (i + 0.5) * (H / Math.floor(H / 1.2));
      const s = 1.75 - (0.7 * (y - 1.0)) / H;
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(s + 0.01, s + 0.01, 0.05, 4, 1, true).rotateY(Math.PI / 4).translate(0, y, 0), glowing('#dff3ff', 0.15, 1.2)));
    }
    g.add(new THREE.Mesh(k.box(1.6, 0.4, 1.6, 1.0 + H), plain('#e9edf2')));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 2.6, 8).translate(0, 1.4 + H + 1.3, 0), plain('#e9edf2')));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6).translate(0, 1.4 + H + 2.7, 0), glowing(r.accent, 1, 3)));
    g.add(k.door(r.door, 1.72, 1.0));
    return { body, top: 1.4 + H + 2.9, eave: 1.0 + H, front: 1.75, width: 3.5 };
  },


  /** A giant donut house standing on its edge: pink icing, sprinkles, a round window in the hole and a door at the bottom (Day 7, @KetchupPac). */
  donut(g, r, h, k) {
    const { THREE, plain } = k;
    const R = 1.25 + h * 0.22; // the donut grows with every floor
    const tube = R * 0.55;
    const cy = R + tube + 0.25;
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(R * 1.2, R * 1.3, 0.25, 32).translate(0, 0.125, 0), plain('#f7f4ee')));
    const body = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 18, 40).translate(0, cy, 0), plain(r.wall, { roughness: 0.7 }));
    g.add(body);
    // icing on the front half, a little bigger than the dough
    const icing = new THREE.Mesh(new THREE.TorusGeometry(R, tube * 1.04, 14, 40, Math.PI * 2).translate(0, cy, 0.05), plain(r.roofColor, { roughness: 0.4 }));
    icing.scale.set(1, 1, 0.75);
    g.add(icing);
    const cols = ['#ffffff', '#3a86ff', '#ffd23f', '#5cc55a', '#e63946'];
    for (let n = 0; n < 46; n++) {
      const a = (n / 46) * Math.PI * 2 + (n % 3) * 0.05;
      const off = (((n * 7) % 5) / 5 - 0.5) * tube * 1.2;
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 2, 4), plain(cols[n % cols.length]));
      s.position.set(Math.cos(a) * (R + off), cy + Math.sin(a) * (R + off), tube * 0.82);
      s.rotation.z = n * 1.3;
      g.add(s);
    }
    // window in the hole and a door at the bottom
    g.add(new THREE.Mesh(new THREE.CircleGeometry(R - tube * 0.95, 24).translate(0, cy, 0), plain('#bfe3ff', { transparent: true, opacity: 0.7 })));
    g.add(k.door(r.door, tube * 0.95, 0.85, 0.25));
    return { body, top: cy + R + tube, eave: cy, front: tube, width: (R + tube) * 2 };
  },

  /** An airplane house: a white fuselage with a row of windows, wings, engines, a tall tail and a stair door (Day 7, @Fly4Ever777). */
  airplane(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const L = 3.6 + h * 0.35; // longer with every floor
    const Rf = 0.75 + h * 0.06;
    const cy = 1.1 + Rf;
    const skin = plain(r.wall, { roughness: 0.45 });
    const stripe = plain(r.accent);
    // the plane points along x, so its side (windows, door) faces the street
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(Rf, L, 8, 20).rotateZ(Math.PI / 2).translate(0, cy, 0), skin);
    g.add(body);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(Rf * 1.01, Rf * 1.01, L * 0.95, 20, 1, true, 0, Math.PI * 0.28).rotateZ(Math.PI / 2).translate(0, cy, 0), stripe));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(Rf * 0.6, 12, 8, 0, Math.PI).rotateY(Math.PI / 2).translate(L / 2 + Rf * 0.55, cy + Rf * 0.25, 0), plain('#2b3440')));
    for (let x = -L / 2 + 0.3; x < L / 2 - 0.2; x += 0.42) g.add(new THREE.Mesh(k.box(0.22, 0.26, 0.04, cy + Rf * 0.12).translate(x, 0, Rf * 0.98), glowing('#cfe9ff', 0.2, 1.8)));
    // wings and engines
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 2.4).translate(0, 0, s * 1.2), skin);
      wing.position.set(-0.2, cy - Rf * 0.4, s * Rf * 0.6);
      wing.rotation.y = s * 0.35;
      g.add(wing);
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.8, 12).rotateZ(Math.PI / 2).translate(0.1, cy - Rf * 0.8, s * (Rf + 0.9)), plain('#c9ccd1')));
    }
    // tail
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.1).translate(0, 0.7, 0), stripe);
    fin.position.set(-L / 2 - Rf * 0.3, cy + Rf * 0.6, 0);
    fin.rotation.z = 0.35;
    g.add(fin);
    for (const s of [-1, 1]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 1.0).translate(-L / 2 - Rf * 0.3, cy + 0.2, s * 0.55), skin));
    // landing gear and the stair to the door
    for (const x of [L / 2 - 0.2, -0.3]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6).translate(x, 0.55, 0), k.DARK));
    g.add(k.door(r.door, Rf * 1.0, 0.75, cy - Rf * 0.75).translateX(L / 2 - 0.55));
    for (let n = 0; n < 5; n++) g.add(new THREE.Mesh(k.box(0.6, 0.06, 0.25, n * (cy - Rf * 0.75) / 5).translate(L / 2 - 0.55, 0, Rf + 0.25 + (4 - n) * 0.22), plain('#f7f4ee')));
    return { body, top: cy + Rf + 1.6, eave: cy, front: Rf + 1.3, width: L + Rf * 2 };
  },
  /**
   * A giant capybara head with an orange on top, plus a capybara mailbox, a capybara plushie on the doorstep and a
   * capybara-shaped hedge (Day 8, @ChristinneeeXD). wall = fur, roofColor = snout, accent = the orange.
   */
  'capybara-head'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const S = Math.min(1.3, 0.85 + (h - k.FLOOR_H) * 0.05); // the head grows a little with every floor
    const fur = plain(r.wall, { roughness: 0.9, flatShading: true });
    const snoutM = plain(r.roofColor, { roughness: 0.9, flatShading: true });
    const dark = plain('#3b2a1f');
    const head = new THREE.Group();
    // a big rounded box: the capybara's famous square face
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.9, 3.0, 2, 2, 2).translate(0, 1.45, -0.2), fur);
    head.add(body);
    for (const [w, hh, d, y, z] of [[3.4, 2.5, 2.6, 1.45, -0.2], [2.8, 3.2, 2.6, 1.45, -0.2]]) head.add(new THREE.Mesh(new THREE.BoxGeometry(w, hh, d).translate(0, y, z), fur));
    // the long snout sticking out at the front, with nostrils
    head.add(new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.7, 1.5).translate(0, 1.05, 1.8), snoutM));
    head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.2, 16).rotateZ(Math.PI / 2).scale(1, 1, 0.55).translate(0, 1.9, 2.25), snoutM));
    head.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 0.1).translate(0, 2.05, 2.72), dark));
    for (const s of [-1, 1]) head.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.06).translate(s * 0.4, 2.05, 2.78), plain('#14202f')));
    // sleepy eyes: dark, half-closed, with a lit window behind each
    for (const s of [-1, 1]) {
      head.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.3, 0.06).translate(s * 0.95, 2.25, 1.32), glowing('#ffe7a8', 0.15, 1.8)));
      head.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.08).translate(s * 0.95, 2.36, 1.34), dark));
    }
    // small round ears
    for (const s of [-1, 1]) head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.25, 12).rotateX(Math.PI / 2).translate(s * 1.35, 3.0, -0.6), snoutM));
    // the orange on top, with a leaf
    const orange = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10).translate(0, 3.35, -0.2), plain(r.accent || '#ff8c1a', { roughness: 0.6 }));
    head.add(orange, new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4).rotateZ(0.8).translate(0.15, 3.85, -0.2), plain('#4f8f3f')));
    head.scale.setScalar(S);
    g.add(head);
    // door in the chin
    g.add(k.door(r.door, 2.55 * S, 0.8, 0));
    // capybara helper: a little capybara made of boxes
    const capy = (m, s) => {
      const c = new THREE.Group();
      c.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 0.42, 1, 1, 1).translate(0, 0.21, 0), m));
      c.add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.34).translate(0.42, 0.34, 0), m));
      c.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.2).translate(0.6, 0.4, 0), dark));
      c.scale.setScalar(s);
      return c;
    };
    // mailbox: a capybara on a post
    const post = new THREE.Mesh(k.box(0.1, 0.9, 0.1, 0).translate(2.2, 0, 2.0), plain('#7b5a3c'));
    const box = capy(fur, 0.7);
    box.position.set(2.2, 0.9, 2.0);
    box.rotation.y = -Math.PI / 2;
    g.add(post, box, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.12).translate(2.48, 1.2, 2.0), plain('#e63946')));
    // a pink plushie capybara by the door
    const plush = capy(plain('#f4a6c0', { roughness: 1 }), 0.55);
    plush.position.set(-0.9, 0, 2.55 * S);
    plush.rotation.y = -0.6;
    g.add(plush);
    // a hedge trimmed into a capybara
    const hedge = capy(plain('#4f8f3f', { flatShading: true, roughness: 1 }), 1.5);
    hedge.position.set(-2.1, 0, 1.6);
    hedge.rotation.y = -Math.PI / 2;
    g.add(hedge);
    return { body, top: 3.8 * S, eave: 2.9 * S, front: 2.6 * S, width: 3.4 * S };
  },

  /**
   * A roach house: a big glossy beetle-shaped house on six legs, with long antennae, round windows down its side and a
   * door in its friendly face (Day 8, @RoachOFC-ALT). wall = shell, roofColor = head and legs, accent = window light.
   */
  roach(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const L = 3.6 + (h - k.FLOOR_H) * 0.25; // longer and taller with every floor
    const Hh = 1.4 + (h - k.FLOOR_H) * 0.25;
    const shell = plain(r.wall, { roughness: 0.25, metalness: 0.2 });
    const dark = plain(r.roofColor, { roughness: 0.4 });
    const cy = 0.75 + Hh * 0.5;
    // the oval body (points to the street, head at the front), with a line down the back
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), shell);
    body.scale.set(1.45, Hh * 0.6, L / 2);
    body.position.set(0, cy, -0.3);
    g.add(body);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, L * 0.9).translate(0, cy + Hh * 0.6 - 0.02, -0.3), dark));
    for (let i = 0; i < 3; i++) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 24, Math.PI), dark);
      band.scale.set(1.47, Hh * 0.61, 1);
      band.position.set(0, cy, -0.3 - L * 0.12 + i * L * 0.16);
      g.add(band);
    }
    // round windows along both sides
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), glowing(r.accent || '#ffe7a8', 0.2, 1.8));
      w.position.set(s * 1.38, cy + 0.1, -0.3 - L * 0.22 + i * L * 0.2);
      w.rotation.y = s * Math.PI / 2;
      g.add(w);
    }
    // the head with big friendly eyes, a door and two long antennae
    const hz = -0.3 + L / 2 + 0.25;
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12).scale(1.1, 0.85, 0.8).translate(0, cy - 0.15, hz), dark));
    for (const s of [-1, 1]) {
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8).translate(s * 0.45, cy + 0.2, hz + 0.5), plain('#ffffff')));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8).translate(s * 0.47, cy + 0.2, hz + 0.7), plain('#14202f')));
      const ant = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(s * 0.3, cy + 0.5, hz + 0.3), new THREE.Vector3(s * 0.9, cy + 2.4, hz + 1.0), new THREE.Vector3(s * 1.6, cy + 2.0, hz + 2.0)), 12, 0.04, 5), dark);
      g.add(ant);
      // three legs each side, bent like a real bug's
      for (let i = 0; i < 3; i++) {
        const z = -0.3 - L * 0.25 + i * L * 0.25;
        const up = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.0, 6), dark);
        up.position.set(s * 1.65, cy - 0.05, z);
        up.rotation.z = s * -1.0;
        const down = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, cy, 6).translate(0, cy / 2, 0), dark);
        down.position.set(s * 2.05, 0, z + (i - 1) * 0.2);
        down.rotation.z = s * 0.12;
        g.add(up, down);
      }
    }
    g.add(k.door(r.door, hz + 0.62, 0.7, 0));
    // little steps up to the door
    g.add(new THREE.Mesh(k.box(0.7, 0.2, 0.5, 0).translate(0, 0, hz + 0.9), plain('#cfc6b4')));
    return { body, top: cy + Hh * 0.6 + 1.9, eave: cy + Hh * 0.6, front: hz + 0.8, width: 4.2 };
  },

  /**
   * A lake house: a wooden cabin with a deck and a big window, beside its own little lake with a dock and a canoe
   * (Day 8, @KyloFerrier). wall = wood, roofColor = roof, accent = the canoe. Extra floors stack on the cabin.
   */
  'lake-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.9 + h; // 3.1 at 1 floor
    const wood = plain(r.wall, { roughness: 0.85 });
    const trim = plain('#f3ead7');
    // the lake: front-left of the lot, with a stone rim and reeds
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.06, 28).scale(1.35, 1, 1.05).translate(-1.15, 0.36, 1.35), plain('#3fb6e8', { roughness: 0.1, emissive: '#0b5c80', emissiveIntensity: 0.3 }));
    g.add(lake, new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.09, 6, 28).rotateX(Math.PI / 2).scale(1.35, 1, 1.05).translate(-1.15, 0.38, 1.35), plain('#9aa0a6', { flatShading: true })));
    for (let i = 0; i < 6; i++) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45, 4).translate(-2.35 + (i % 3) * 0.1, 0.55, 0.7 + Math.floor(i / 3) * 0.25), plain('#6b8f3a')));
    // dock and canoe
    g.add(new THREE.Mesh(k.box(0.5, 0.08, 1.3, 0.45).translate(-0.4, 0, 1.6), plain('#a47148')));
    for (const z of [1.1, 2.1]) g.add(new THREE.Mesh(k.box(0.06, 0.5, 0.06, 0).translate(-0.18, 0, z), plain('#7b5a3c')));
    const canoe = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8).scale(0.75, 0.12, 0.2).translate(-1.6, 0.42, 1.45), plain(r.accent || '#e76f51'));
    canoe.rotation.y = 0.4;
    g.add(canoe);
    // the cabin at the back right, a deck facing the lake
    const body = new THREE.Mesh(k.box(3.0, H, 2.6, 0).translate(0.7, 0, -0.9), wood);
    g.add(body);
    for (let y = 0.3; y < H; y += 0.35) g.add(new THREE.Mesh(k.box(3.04, 0.04, 2.64, y).translate(0.7, 0, -0.9), plain(new THREE.Color(r.wall).multiplyScalar(0.8).getStyle())));
    const cab = new THREE.Group();
    k.roof(cab, 'gable', r.roofColor, 3.4, 3.0, H);
    cab.position.set(0.7, 0, -0.9);
    g.add(cab);
    // a big lit window, side windows on every floor, door and deck
    g.add(new THREE.Mesh(k.box(1.3, Math.min(1.6, H - 0.9), 0.06, 0.7).translate(1.2, 0, 0.41), glowing('#ffe7a8', 0.25, 1.9)));
    for (let y = 0.7; y < H - 0.6; y += k.FLOOR_H) g.add(new THREE.Mesh(k.box(0.06, 0.6, 0.6, y).translate(2.21, 0, -0.9), glowing('#ffe7a8', 0.2, 1.8)));
    g.add(k.door(r.door, 0.41, 0.8, 0).translateX(-0.25));
    g.add(new THREE.Mesh(k.box(3.4, 0.12, 1.0, 0.15).translate(0.7, 0, 0.9), plain('#a47148')));
    for (const x of [-0.9, 2.3]) g.add(new THREE.Mesh(k.box(0.06, 0.55, 0.06, 0.27).translate(x, 0, 1.35), trim));
    g.add(new THREE.Mesh(k.box(3.3, 0.05, 0.05, 0.8).translate(0.7, 0, 1.35), trim));
    // chimney
    g.add(new THREE.Mesh(k.box(0.4, 1.2, 0.4, H + 0.2).translate(1.8, 0, -1.6), plain('#9a8f84', { flatShading: true })));
    return { body, top: H + 1.4, eave: H, front: 1.4, width: 4.6 };
  },

  // ---------------- Day 9 (2026-11-21) requests ----------------

  /** A blocky voxel house: stone base, plank walls with log corners, a stepped roof, glass windows, a torch and a cube tree (Day 9, @Oliverzinn-k7i). */
  'block-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.6 + h; // walls: 2.8 at 1 floor
    const tex = (base, opts) => new THREE.MeshStandardMaterial({ map: pixelTex(THREE, base, opts), roughness: 0.95 });
    const planks = (w, hh) => { const m = tex(r.wall, { planks: true }); m.map.repeat.set(w, hh); return m; };
    // stone foundation and grass blocks round the house
    const stone = tex('#8a8a86', { vary: 0.25 });
    stone.map.repeat.set(4.4, 0.6);
    g.add(new THREE.Mesh(k.box(4.4, 0.6, 4.4, 0), stone));
    const grassTop = tex('#5fae3a', { vary: 0.2 });
    const dirt = tex('#8b5a2b', { vary: 0.2 });
    for (const [x, z] of [[-2.55, 1.6], [2.55, -1.2], [-2.55, -2.0]]) {
      g.add(new THREE.Mesh(k.box(0.9, 0.6, 0.9, 0).translate(x, 0, z), [dirt, dirt, grassTop, dirt, dirt, dirt]));
    }
    // plank walls with log pillars on the corners
    const body = new THREE.Mesh(k.box(4, H, 4, 0.6), planks(4, H));
    g.add(body);
    const log = tex('#5b3d22', { vary: 0.18, stripes: true });
    for (const [x, z] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.add(new THREE.Mesh(k.box(0.5, H, 0.5, 0.6).translate(x, 0, z), log));
    // glass windows on every floor, both sides and the back, and a plank door
    const glass = plain('#bfe3ff', { transparent: true, opacity: 0.75, emissive: '#ffe7a8', emissiveIntensity: 0.15 });
    for (let y = 1.0; y < 0.6 + H - 0.5; y += k.FLOOR_H) {
      g.add(new THREE.Mesh(k.box(0.8, 0.7, 0.06, y).translate(1.1, 0, 2.03), glass));
      for (const s of [-1, 1]) g.add(new THREE.Mesh(k.box(0.06, 0.7, 0.8, y).translate(s * 2.03, 0, 0), glass));
      g.add(new THREE.Mesh(k.box(0.8, 0.7, 0.06, y).translate(0, 0, -2.03), glass));
    }
    const doorM = tex(r.door, { planks: true });
    doorM.map.repeat.set(1, 2);
    g.add(new THREE.Mesh(k.box(0.8, 1.6, 0.08, 0.6).translate(-0.8, 0, 2.04), doorM));
    // stepped roof: three layers of darker planks, like stairs
    for (let i = 0; i < 3; i++) {
      const roofM = tex(r.roofColor, { planks: true });
      roofM.map.repeat.set(4.8, 0.5);
      g.add(new THREE.Mesh(k.box(4.8, 0.5, 4.8 - i * 1.5, 0.6 + H + i * 0.5), roofM));
    }
    // a torch by the door
    g.add(new THREE.Mesh(k.box(0.1, 0.5, 0.1, 1.5).translate(-1.4, 0, 2.15), plain('#7b5a3c')));
    g.add(new THREE.Mesh(k.box(0.16, 0.16, 0.16, 2.0).translate(-1.4, 0, 2.15), glowing(r.accent || '#ffd23f', 1.2, 3)));
    // a cube tree at the side
    g.add(new THREE.Mesh(k.box(0.4, 1.6, 0.4, 0).translate(2.55, 0, 1.6), log));
    g.add(new THREE.Mesh(k.box(1.3, 1.1, 1.3, 1.5).translate(2.55, 0, 1.6), tex('#3f8f2f', { vary: 0.3 })));
    const top = 0.6 + H + 1.5;
    return { body, top, eave: 0.6 + H, front: 2.1, width: 4.8 };
  },

  /** A glass tower for donut lovers: a giant pink-iced donut on the roof, a lit donut sign and a donut-shop front (Day 9, @RichardSpruill). */
  'donut-tower'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 3.2 + h * 1.1;
    const body = k.windowBox(3.0, H, 3.0, r.wall, 0);
    g.add(body);
    g.add(new THREE.Mesh(k.box(3.2, 0.3, 3.2, H), plain('#2b2d42')));
    // shop front: a pink awning and a glowing band all round the tower
    g.add(new THREE.Mesh(k.box(3.3, 0.18, 0.8, 1.6).translate(0, 0, 1.75), plain(r.roofColor)));
    g.add(new THREE.Mesh(k.box(3.06, 0.3, 3.06, H - 0.6), glowing(r.accent, 0.5, 2.2)));
    g.add(k.door(r.door, 1.52, 0.9, 0));
    // the giant donut, standing up on the roof so the street sees its hole
    const R = 1.35, tube = 0.62, cy = H + 0.3 + R + tube;
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.5, 12).translate(0, H + 0.3 + 0.25, 0), plain('#2b2d42')));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(R, tube, 16, 36).translate(0, cy, 0), plain('#d9a066', { roughness: 0.7 })));
    const icing = new THREE.Mesh(new THREE.TorusGeometry(R, tube * 1.05, 14, 36).translate(0, cy, 0.06), plain(r.roofColor, { roughness: 0.35 }));
    icing.scale.set(1, 1, 0.72);
    g.add(icing);
    const cols = ['#ffffff', '#3a86ff', '#ffd23f', '#5cc55a', '#e63946'];
    for (let n = 0; n < 40; n++) {
      const a = (n / 40) * Math.PI * 2, off = (((n * 7) % 5) / 5 - 0.5) * tube;
      const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.12, 2, 4), plain(cols[n % 5]));
      s.position.set(Math.cos(a) * (R + off), cy + Math.sin(a) * (R + off), tube * 0.8);
      s.rotation.z = n * 1.3;
      g.add(s);
    }
    return { body, top: cy + R + tube, eave: H, front: 1.6, width: 3.4 };
  },

  /** A giant strawberry house: red berry with yellow seeds, a leafy green crown, round windows on every floor (Day 9, @ChristianHathaway-h4w). */
  strawberry(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 2.8 + h; // the berry grows with every floor
    // a berry outline: round shoulders, pointed bottom (lathe)
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const y = t * H;
      // from a blunt tip at the ground up to wide shoulders, then rounding in under the leaves
      const rad = t < 0.72 ? 0.7 + 1.45 * Math.pow(Math.sin((Math.PI / 2) * (t / 0.72)), 0.8) : 2.15 * Math.cos(((t - 0.72) / 0.28) * (Math.PI / 2) * 0.72);
      pts.push(new THREE.Vector2(Math.max(0.05, rad), y));
    }
    pts.push(new THREE.Vector2(0.01, H));
    const berry = plain(r.wall, { roughness: 0.45 });
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32).translate(0, 0.15, 0), berry);
    g.add(body);
    // seeds all over
    const seed = plain('#ffd23f');
    for (let n = 0; n < 70; n++) {
      const t = 0.1 + ((n * 37) % 80) / 100, a = n * 2.4;
      const p = pts[Math.round(t * 16)];
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4).scale(1, 1.6, 1), seed);
      s.position.set(Math.cos(a) * p.x * 1.0, p.y + 0.15, Math.sin(a) * p.x * 1.0);
      g.add(s);
    }
    // leafy crown and a stem
    const leaf = plain(r.roofColor || '#3f9a3a', { flatShading: true });
    for (let i = 0; i < 8; i++) {
      const l = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 4).rotateX(Math.PI / 2).translate(0, 0, 0.8), leaf);
      l.position.set(0, H + 0.1, 0);
      l.rotation.set(-0.35, (i / 8) * Math.PI * 2, 0, 'YXZ');
      g.add(l);
    }
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.9, 8).translate(0, H + 0.55, 0), leaf));
    // round windows on every floor and a door at the front
    for (let y = 0.9; y < H - 0.4; y += k.FLOOR_H) {
      const t = (y - 0.15) / H, rad = pts[Math.round(t * 16)].x;
      for (const a of [-0.55, 0.55, Math.PI]) {
        const w = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), glowing('#fff3c4', 0.3, 1.8));
        w.position.set(Math.sin(a) * (rad + 0.02), y + 0.3, Math.cos(a) * (rad + 0.02));
        w.rotation.y = a;
        g.add(w);
      }
    }
    g.add(k.door(r.door, pts[2].x + 0.05, 0.8, 0.15));
    return { body, top: H + 1.1, eave: H * 0.75, front: 2.0, width: 4.4 };
  },

  /** A taco house: a crunchy shell lying on its side, filled with lettuce, tomato, cheese and meat, a door in the end (Day 9, @Ivanna-Gonzalez-12). */
  taco(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const R = 2.0 + h * 0.25; // a bigger taco with every floor
    const D = 1.7; // how thick the taco is (front to back)
    const cy = R + 0.15;
    const shellM = plain(r.wall, { roughness: 0.8, side: THREE.DoubleSide });
    // the fold: the lower half of a tube, front to back
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, D, 32, 1, true, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).translate(0, cy, 0), shellM);
    g.add(body);
    // the two sides of the tortilla: half-moons, with toasted spots
    for (const z of [-D / 2, D / 2]) {
      const side = new THREE.Mesh(new THREE.CircleGeometry(R, 32, Math.PI, Math.PI).translate(0, cy, z), shellM);
      g.add(side);
      for (let n = 0; n < 9; n++) {
        const a = Math.PI + 0.35 + ((n * 37) % 100) / 100 * (Math.PI - 0.7), rr = R * (0.35 + ((n * 53) % 60) / 100);
        g.add(new THREE.Mesh(new THREE.CircleGeometry(0.13, 8).translate(Math.cos(a) * rr, cy + Math.sin(a) * rr, z + Math.sign(z) * 0.01), plain('#c98a2e', { side: THREE.DoubleSide })));
      }
    }
    // the filling along the top: meat, lettuce ruffles poking out, tomato and cheese
    g.add(new THREE.Mesh(new THREE.BoxGeometry(R * 1.85, 0.5, D * 0.9).translate(0, cy - 0.1, 0), plain('#7a4a2b', { flatShading: true })));
    const lettuce = plain(r.roofColor || '#6cc24a', { flatShading: true });
    for (let i = 0; i < 9; i++) {
      const x = -R * 0.9 + (i * R * 1.8) / 8;
      for (const z of [-D / 2, D / 2]) g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 0).translate(x, cy + 0.25, z * 0.85), lettuce));
    }
    for (let i = 0; i < 8; i++) g.add(new THREE.Mesh(k.box(0.3, 0.26, 0.3, cy + 0.3).translate(-R * 0.8 + i * (R * 1.6) / 7, 0, ((i * 31) % 10) / 10 * D * 0.6 - D * 0.3), plain('#e63946')));
    for (let i = 0; i < 12; i++) g.add(new THREE.Mesh(k.box(0.5, 0.05, 0.08, cy + 0.55).translate(-R * 0.75 + (i % 6) * R * 0.3, 0, i < 6 ? -0.25 : 0.25), plain(r.accent || '#ffd23f')));
    // a door and round windows on the front half-moon
    g.add(k.door(r.door, D / 2 + 0.02, 0.8, 0.15));
    for (const x of [-R * 0.55, R * 0.55]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.26, 16), glowing('#fff3c4', 0.3, 1.8));
      w.position.set(x, cy - R * 0.35, D / 2 + 0.03);
      g.add(w);
    }
    return { body, top: cy + 0.9, eave: cy, front: D / 2, width: R * 2 };
  },

  /** A house inside a roller coaster: the track loops round and over the house, a coaster train races round (Day 9, @ThatFury325Guy). */
  'coaster-house'(g, r, h, k) {
    const { THREE, plain } = k;
    const H = 1.8 + h;
    const body = k.windowBox(2.4, H, 2.4, r.wall, 0);
    g.add(body);
    k.roof(g, 'gable', r.roofColor, 2.7, 2.7, H);
    g.add(k.door(r.door, 1.22, 0.8, 0));
    // the track: round the house, up over the roof and through a loop at the side
    const top = H + 2.2;
    // round the front, straight through the top floor (in one side, out the other), over the back and down
    const ty = H - 0.55; // the tunnel through the top floor
    let raw = [
      [2.3, 0.6, 2.2], [0, 0.5, 2.5], [-2.3, 0.7, 2.2], [-2.7, ty * 0.6, 1.0], [-2.3, ty, 0],
      [0, ty, 0], [2.3, ty, 0], [2.7, top * 0.8, -1.0], [1.4, top + 0.5, -2.3], [-1.4, top * 0.7, -2.4],
      [-2.6, 1.4, -1.6], [-0.4, 0.8, -2.6], [2.2, 0.6, -2.3], [2.7, 0.6, 0.6],
    ];
    let tunnels = [ty];
    if ((r.extras || []).includes('triple')) {
      // Day 13 (@ThatFury325Guy): the track wraps through the house three times, climbing a level each lap
      tunnels = [H * 0.25, H * 0.55, ty].map((y) => Math.max(0.9, y));
      raw = [[2.4, 0.5, 2.4], [-2.4, 0.6, 2.4]];
      tunnels.forEach((y, i) => {
        const next = tunnels[i + 1] ?? top + 0.4;
        raw.push([-2.7, y * 0.9, 0.8], [-2.3, y, 0], [0, y, 0], [2.3, y, 0], [2.8, (y + next) / 2, -1.2], [0, (y + next) / 2 + 0.3, -2.8], [-2.8, next * 0.95, -1.2]);
      });
      raw.push([-1.6, top + 0.5, -0.4], [0, top + 0.8, 0.3], [1.8, top * 0.6, 1.5], [2.8, 1.2, 2.0]);
    }
    const pts = raw.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    // dark tunnel openings where the track goes in and out of the house
    for (const y of tunnels) for (const sd of [-1, 1]) g.add(new THREE.Mesh(k.box(0.04, 0.6, 0.7, y - 0.3).translate(sd * 1.22, 0, 0), plain('#14161c')));
    const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
    const rail = plain(r.accent || '#e63946', { metalness: 0.4, roughness: 0.4 });
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, tunnels.length > 1 ? 360 : 160, 0.09, 6, true), rail));
    // supports down to the ground
    for (let i = 0; i < 14; i++) {
      const p = curve.getPointAt(i / 14);
      if (p.y < 0.8) continue;
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, p.y, 5).translate(p.x, p.y / 2, p.z), plain('#8d96a3')));
    }
    // the coaster train: three little cars
    const cars = [0, 1, 2].map((i) => {
      const c = new THREE.Group();
      c.add(new THREE.Mesh(k.box(0.36, 0.22, 0.5, 0.05), plain(['#ffd23f', '#3a86ff', '#5cc55a'][i])));
      g.add(c);
      return c;
    });
    const tick = (t) => {
      cars.forEach((c, i) => {
        const u = (((t * 0.11 - i * 0.025) % 1) + 1) % 1;
        c.position.copy(curve.getPointAt(u));
        c.lookAt(curve.getPointAt((u + 0.01) % 1));
      });
    };
    tick(0);
    return { body, top: top + 0.9, eave: H, front: 2.6, width: 5.4, tick };
  },

  /** Two airplanes stacked on top of each other, held up by pillars and a staircase between them (Day 9, @AldenMacek-k2j). */
  'double-airplane'(g, r, h, k) {
    const { THREE, plain } = k;
    const low = new THREE.Group();
    const a = HOUSE_MODELS.airplane(low, r, Math.max(k.FLOOR_H, h * 0.5), k);
    g.add(low);
    const high = new THREE.Group();
    const r2 = { ...r, accent: r.roofColor || r.accent };
    const b = HOUSE_MODELS.airplane(high, r2, Math.max(k.FLOOR_H, h * 0.5), k);
    const lift = a.eave + 1.1;
    high.position.set(0.3, lift, 0);
    g.add(high);
    for (const [x, z] of [[1.2, -0.9], [-1.2, -0.9], [1.2, 0.9], [-1.2, 0.9]]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, lift + 1.1, 6).translate(x, (lift + 1.1) / 2, z), plain('#8d96a3')));
    return { body: a.body, top: lift + b.top, eave: lift + b.eave, front: a.front, width: Math.max(a.width, b.width) };
  },

  /** A record-player house: the house is the turntable, a giant vinyl record spins on the roof under the tonearm (Day 9, @djvitixofficial). */
  vinyl(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.6 + h;
    const body = k.windowBox(4.4, H, 4.4, r.wall, 0);
    g.add(body);
    g.add(new THREE.Mesh(k.box(4.6, 0.25, 4.6, H), plain(r.roofColor)));
    g.add(k.door(r.door, 2.22, 0.85, 0));
    // the record: black with grooves, a coloured label, spinning
    const rec = new THREE.Group();
    rec.add(new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.08, 48), plain('#141414', { roughness: 0.25, metalness: 0.3 })));
    for (let i = 0; i < 7; i++) rec.add(new THREE.Mesh(new THREE.TorusGeometry(0.85 + i * 0.17, 0.008, 4, 48).rotateX(Math.PI / 2).translate(0, 0.045, 0), plain('#3a3a3a')));
    rec.add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 32), plain(r.accent || '#e63946')));
    rec.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.11, 0.12).translate(0.15, 0, 0.25), plain('#ffffff'))); // a stripe on the label, so you see it spin
    rec.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), plain('#c9ccd1', { metalness: 0.7 })));
    rec.position.set(-0.2, H + 0.35, -0.1);
    g.add(rec);
    // the tonearm
    const arm = plain('#c9ccd1', { metalness: 0.7, roughness: 0.3 });
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.4, 16).translate(1.9, H + 0.45, -1.7), arm));
    const ta = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6).rotateZ(Math.PI / 2).rotateY(-0.65).translate(1.0, H + 0.68, -0.9), arm);
    g.add(ta);
    g.add(new THREE.Mesh(k.box(0.22, 0.12, 0.3, H + 0.52).translate(0.1, 0, -0.15), plain('#2b2d42')));
    // speakers by the door, lit at night
    for (const s of [-1, 1]) g.add(new THREE.Mesh(k.box(0.7, 1.0, 0.5, 0).translate(s * 1.6, 0, 2.6), plain('#2b2d42')), new THREE.Mesh(new THREE.CircleGeometry(0.22, 16).translate(s * 1.6, 0.55, 2.86), glowing(r.accent || '#e63946', 0.3, 1.6)));
    const tick = (t) => { rec.rotation.y = -t * 2.2; };
    return { body, top: H + 0.9, eave: H, front: 2.9, width: 4.8, tick };
  },

  /** A fortified house with an anti-air flak cannon turret on the roof: twin barrels that slowly sweep the sky (Day 9, @Dannexzx). */
  'cannon-fort'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.7 + h;
    const concrete = plain(r.wall, { roughness: 0.95, flatShading: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.3, H, 8).translate(0, H / 2, 0), concrete);
    g.add(body);
    // sandbags round the base and battlements on top
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.35, 2, 6).rotateZ(Math.PI / 2).rotateY(-a).translate(Math.cos(a) * 2.55, 0.2, Math.sin(a) * 2.55), plain('#b59b6d')));
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      g.add(new THREE.Mesh(k.box(0.6, 0.45, 0.4, H).translate(Math.cos(a) * 1.85, 0, Math.sin(a) * 1.85), concrete));
    }
    // slit windows on every floor, a steel door
    for (let y = 0.8; y < H - 0.4; y += k.FLOOR_H) for (const a of [0.6, -0.6, Math.PI / 2, -Math.PI / 2, Math.PI]) {
      const w = new THREE.Mesh(k.box(0.5, 0.18, 0.06, y), glowing('#ffe7a8', 0.2, 1.6));
      w.position.set(Math.sin(a) * 2.18, 0, Math.cos(a) * 2.18);
      w.rotation.y = a;
      g.add(w);
    }
    g.add(k.door(r.door, 2.18, 0.85, 0));
    // the turret: a round base, a shield and twin long barrels pointing at the sky
    const turret = new THREE.Group();
    const steel = plain(r.roofColor, { metalness: 0.5, roughness: 0.45 });
    turret.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.5, 16).translate(0, 0.25, 0), steel));
    turret.add(new THREE.Mesh(k.box(1.6, 1.0, 0.25, 0.5).translate(0, 0, 0.5), steel));
    const guns = new THREE.Group();
    for (const s of [-0.28, 0.28]) {
      guns.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.6, 10).translate(s, 1.3, 0), plain('#3b4552', { metalness: 0.6 })));
      guns.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 10).translate(s, 2.55, 0), plain('#2b2d42')));
    }
    guns.position.set(0, 0.9, 0.2);
    guns.rotation.x = 0.55; // aimed up and forward
    turret.add(guns);
    turret.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6).translate(0.7, 1.4, 0.65), glowing(r.accent || '#ff3b30', 0.8, 2.5)));
    turret.position.y = H + 0.45;
    g.add(turret);
    const tick = (t) => { turret.rotation.y = Math.sin(t * 0.4) * 1.2; guns.rotation.x = 0.45 + Math.sin(t * 0.7) * 0.15; };
    return { body, top: H + 3.6, eave: H, front: 2.4, width: 5.2, tick };
  },

  /** A house on a mountain: a rocky peak with snow on top, a little chalet on a ledge and a zigzag path up (Day 9, @Eastonfortniteeee). */
  mountain(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const M = 3.2 + h * 0.6; // the mountain grows with every floor
    const rock = plain(r.wall, { flatShading: true, roughness: 1 });
    const body = new THREE.Mesh(new THREE.ConeGeometry(2.6 + h * 0.12, M, 7, 3).translate(0, M / 2, -0.4), rock);
    g.add(body);
    g.add(new THREE.Mesh(new THREE.ConeGeometry(1.7 + h * 0.08, M * 0.7, 6, 2).translate(-1.2, M * 0.35, 0.3), rock));
    g.add(new THREE.Mesh(new THREE.ConeGeometry(1.4 + h * 0.06, M * 0.55, 6, 2).translate(1.5, M * 0.275, -1.2), rock));
    g.add(new THREE.Mesh(new THREE.ConeGeometry((2.6 + h * 0.12) * 0.36, M * 0.36, 7).translate(0, M * 0.82 + 0.02, -0.4), plain('#f6f9fb', { flatShading: true }))); // snow cap
    // the chalet sits on a ledge on the front of the mountain
    const ly = M * 0.42;
    g.add(new THREE.Mesh(k.box(2.2, 0.25, 1.6, ly - 0.25).translate(0.6, 0, 1.0), rock));
    const ch = new THREE.Group();
    ch.add(new THREE.Mesh(k.box(1.6, 1.0, 1.1, 0), plain('#a0703f')));
    k.roof(ch, 'gable', r.roofColor, 1.9, 1.4, 1.0);
    ch.add(new THREE.Mesh(k.box(0.5, 0.4, 0.04, 0.45).translate(0.35, 0, 0.56), glowing('#ffe7a8', 0.3, 2)));
    ch.add(k.door(r.door, 0.56, 0.55, 0).translateX(-0.4));
    ch.position.set(0.6, ly, 1.1);
    g.add(ch);
    // a zigzag path up the front, and a door into the mountain at the bottom
    for (let i = 0; i < 5; i++) {
      const y = (i / 5) * ly;
      g.add(new THREE.Mesh(k.box(1.3, 0.1, 0.4, y).translate(i % 2 ? 0.9 : -0.3, 0, 2.0 - i * 0.18), plain('#c9b48a')));
    }
    g.add(k.door(r.door, 2.0, 0.8, 0).translateX(-1.4));
    // pine trees on the slopes
    for (const [x, z, s] of [[-2.1, 1.3, 0.7], [1.9, -1.3, 0.8], [-1.6, -1.9, 0.6]]) {
      g.add(new THREE.Mesh(new THREE.ConeGeometry(0.4 * s, 1.3 * s, 6).translate(x, 0.65 * s + 0.1, z), plain('#2f6b3a', { flatShading: true })));
    }
    return { body, top: M + 0.3, eave: ly + 1, front: 2.2, width: 5.2 };
  },

  // ---------------- Day 10 (2026-11-22) requests ----------------

  /** A tower of airplanes: one plane stacked on the next for every floor, round a steel mast (Day 10, @Fly4Ever777). */
  'plane-stack'(g, r, h, k) {
    const { THREE, plain } = k;
    const n = Math.max(1, Math.round(h / k.FLOOR_H)); // one plane per floor
    const step = 1.15;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, n * step + 1.4, 10).translate(0, (n * step + 1.4) / 2, 0), plain('#8d96a3', { metalness: 0.5 }));
    g.add(mast);
    const cols = [r.accent, r.roofColor, '#ffd23f', '#5cc55a'];
    for (let i = 0; i < n; i++) {
      const sub = new THREE.Group();
      HOUSE_MODELS.airplane(sub, { ...r, accent: cols[i % cols.length] }, k.FLOOR_H, k);
      sub.scale.setScalar(0.62);
      sub.position.y = i * step - 0.55;
      sub.rotation.y = (i % 2 ? 1 : -1) * 0.3 + i * 0.12;
      g.add(sub);
    }
    g.add(k.door(r.door, 0.31, 0.7, 0));
    const top = (n - 1) * step + 2.6;
    return { body: mast, top, eave: top - 1, front: 1.2, width: 4.4 };
  },

  /** A 3D printer printing the house: a frame and gantry, the print head moving over the half-printed top floor, a filament spool (Day 10, @3Dprinter.and.trains). */
  'printer-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.8 + h; // the printed house
    const frameH = H + 1.4;
    const frame = plain(r.roofColor, { metalness: 0.4, roughness: 0.45 });
    // the print bed
    g.add(new THREE.Mesh(k.box(4.4, 0.3, 4.4, 0), plain('#2b2d42')));
    g.add(new THREE.Mesh(k.box(4.0, 0.06, 4.0, 0.3), plain('#5c6670', { metalness: 0.6 })));
    // the house being printed: layer lines all the way up, the top layer still open
    const body = new THREE.Mesh(k.box(2.8, H - 0.4, 2.6, 0.36), plain(r.wall, { roughness: 0.6 }));
    g.add(body);
    for (let y = 0.5; y < H - 0.05; y += 0.18) g.add(new THREE.Mesh(k.box(2.84, 0.025, 2.64, y), plain(new THREE.Color(r.wall).multiplyScalar(0.82).getStyle())));
    g.add(new THREE.Mesh(k.box(2.8, 0.25, 2.6, H - 0.04).translate(-0.7, 0, 0).scale(0.5, 1, 1), plain(r.wall))); // half of the last layer
    for (let y = 0.9; y < H - 0.6; y += k.FLOOR_H) for (const x of [-0.7, 0.7]) g.add(new THREE.Mesh(k.box(0.55, 0.5, 0.05, y).translate(x, 0, 1.31), glowing('#fff3c4', 0.25, 1.8)));
    g.add(k.door(r.door, 1.31, 0.75, 0.36));
    // the frame: four posts and the gantry on top
    for (const [x, z] of [[-2.05, -2.05], [2.05, -2.05], [-2.05, 2.05], [2.05, 2.05]]) g.add(new THREE.Mesh(k.box(0.22, frameH, 0.22, 0).translate(x, 0, z), frame));
    for (const z of [-2.05, 2.05]) g.add(new THREE.Mesh(k.box(4.3, 0.22, 0.22, frameH).translate(0, 0, z), frame));
    const bridge = new THREE.Group();
    bridge.add(new THREE.Mesh(k.box(0.24, 0.24, 4.3, frameH - 0.3), frame));
    const head = new THREE.Group();
    head.add(new THREE.Mesh(k.box(0.6, 0.6, 0.6, frameH - 0.65), plain(r.accent || '#ff7a45')));
    head.add(new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 10).rotateX(Math.PI).translate(0, frameH - 0.82, 0), plain('#c9ccd1', { metalness: 0.7 })));
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6).translate(0, frameH - 1.0, 0), glowing('#ff9b3d', 1, 3)));
    // the nozzle reaches down to the top of the print
    head.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, Math.max(0.1, frameH - 1.0 - H), 6).translate(0, (frameH - 1.0 + H) / 2, 0), plain('#c9ccd1')));
    bridge.add(head);
    g.add(bridge);
    // the filament spool on the side, with a strand up to the head
    const spool = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.22, 10, 24).rotateY(Math.PI / 2).translate(2.35, 1.0, -1.2), plain(r.accent || '#ff7a45'));
    g.add(spool, new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 10).rotateZ(Math.PI / 2).translate(2.35, 1.0, -1.2), plain('#2b2d42')));
    const tick = (t) => {
      bridge.position.x = Math.sin(t * 0.9) * 1.1;
      head.position.z = Math.sin(t * 1.7) * 1.0;
      spool.rotation.x = t * 1.2;
    };
    tick(0);
    return { body, top: frameH + 0.3, eave: H, front: 2.2, width: 4.6, tick };
  },

  /** A chocolate house: chocolate-bar walls, a milk-chocolate roof with dripping white icing, candy canes and gumdrops (Day 10, @prabhasishbhattacharya9226). */
  'chocolate-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.6 + h;
    const choc = plain(r.wall, { roughness: 0.35 });
    const chocLight = plain(new THREE.Color(r.wall).multiplyScalar(1.25).getStyle(), { roughness: 0.35 });
    const body = new THREE.Mesh(k.box(3.6, H, 3.0, 0), choc);
    g.add(body);
    // chocolate-bar squares on the front and the sides
    for (let y = 0.25; y < H - 0.3; y += 0.62) {
      for (let x = -1.45; x <= 1.46; x += 0.72) g.add(new THREE.Mesh(k.box(0.6, 0.52, 0.08, y).translate(x, 0, 1.52), chocLight), new THREE.Mesh(k.box(0.6, 0.52, 0.08, y).translate(x, 0, -1.52), chocLight));
      for (let z = -1.15; z <= 1.16; z += 0.76) for (const s of [-1, 1]) g.add(new THREE.Mesh(k.box(0.08, 0.52, 0.62, y).translate(s * 1.82, 0, z), chocLight));
    }
    // the roof: milk chocolate, white icing dripping over the edge
    const roofG = new THREE.Group();
    k.roof(roofG, 'gable', r.roofColor, 4.0, 3.4, H);
    g.add(roofG);
    const icing = plain('#fff8f0', { roughness: 0.3 });
    g.add(new THREE.Mesh(k.box(4.1, 0.14, 3.5, H - 0.05), icing));
    for (let i = 0; i < 14; i++) {
      const x = -1.9 + i * 0.29, len = 0.15 + ((i * 37) % 7) * 0.05;
      for (const z of [1.72, -1.72]) g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.06, len, 2, 6).translate(x, H - 0.05 - len / 2, z), icing));
    }
    // wafer door, lit windows of white chocolate
    g.add(k.door(r.door, 1.58, 0.85, 0));
    for (let y = 0.9; y < H - 0.5; y += k.FLOOR_H) for (const x of [-1.1, 1.1]) g.add(new THREE.Mesh(k.box(0.5, 0.45, 0.05, y).translate(x, 0, 1.6), glowing('#fff3c4', 0.3, 1.8)));
    // candy canes by the door and gumdrops along the front
    for (const x of [-0.75, 0.75]) {
      for (let i = 0; i < 6; i++) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.2, 8).translate(x, 0.1 + i * 0.2, 1.95), plain(i % 2 ? '#ffffff' : '#e63946')));
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 6, 10, Math.PI).translate(x + 0.2 * Math.sign(x), 1.2, 1.95), plain('#e63946')));
    }
    ['#e63946', '#5cc55a', '#ffd23f', '#9b5de5', '#3a86ff'].forEach((c, i) => g.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(-1.6 + i * 0.8, 0, 2.4), plain(c, { roughness: 0.2 }))));
    return { body, top: H + 1.4, eave: H, front: 1.7, width: 4.2 };
  },

  /** A stack of pizza slices: one pizza for every floor, crust at the back, cheese and pepperoni on each (Day 10, stacked on Day 11, @sportyzbak). */
  'pizza-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const n = Math.max(1, Math.round(h / k.FLOOR_H)); // one pizza for every floor, stacked
    // the slice: tip at the front, the crust curve at the back
    const s = new THREE.Shape();
    s.moveTo(0, -2.6);
    s.lineTo(-2.3, 1.7);
    s.quadraticCurveTo(0, 2.6, 2.3, 1.7);
    s.lineTo(0, -2.6);
    const slice = (depth, y, color, opts = {}) => {
      const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, y, 0);
      const m = new THREE.Mesh(geo, plain(color, opts));
      g.add(m);
      return m;
    };
    const D = 0.85; // each pizza layer: dough (the rooms), sauce, cheese, toppings, crust
    let body = null;
    for (let i = 0; i < n; i++) {
      const y = i * (D + 0.45);
      const dough = slice(D, y, r.wall);
      if (!body) body = dough;
      slice(0.12, y + D, '#e63946');
      slice(0.16, y + D + 0.12, r.accent || '#ffd23f', { roughness: 0.5 });
      const top = y + D + 0.28;
      const crust = new THREE.CatmullRomCurve3([[-2.3, -1.7], [-1.2, -2.25], [0, -2.4], [1.2, -2.25], [2.3, -1.7]].map(([x, z]) => new THREE.Vector3(x, y + D + 0.15, z)));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(crust, 24, 0.3, 10, false), plain(r.roofColor, { roughness: 0.8 })));
      for (const [x, z] of [[0, -1.0], [-0.8, 0.4], [0.8, 0.5], [0, 1.4], [-1.3, 1.4], [1.3, 1.5]]) {
        const pz = -z + ((i * 0.37) % 0.4) - 0.2;
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 18).translate(x, top, pz), plain('#b5302a')));
      }
      for (const [x, z] of [[-0.4, 0.3], [0.5, 0.6], [0.3, -1.0]]) g.add(new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 6, 12).rotateX(Math.PI / 2).translate(x, top + 0.01, z), plain('#2b2d42')));
      // windows in the dough on both long sides
      for (const sd of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), glowing('#fff3c4', 0.3, 1.8));
        w.position.set(sd * 1.6, y + D / 2, -0.35);
        w.rotation.y = sd * 1.09;
        w.translateZ(0.03);
        g.add(w);
      }
      // a short column of dough between the pizzas so they stack
      if (i < n - 1) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 12).translate(0, top + 0.22, -0.6), plain(r.wall)));
    }
    const door = k.door(r.door, 0, 0.6, 0);
    door.rotation.y = 1.08; // flat on the right-hand side wall
    door.position.set(1.17, 0, 0.45);
    g.add(door);
    const topY = (n - 1) * (D + 0.45) + D + 0.6;
    return { body, top: topY, eave: topY - 0.4, front: 2.6, width: 4.8 };
  },

  /** A Christmas cabin: a log cabin with a snowy roof, a wreath on the door, coloured lights on the eaves and snowy pines (Day 10, @ConnorLukach). */
  'christmas-cabin'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.5 + h;
    const log = plain(r.wall, { roughness: 0.9 });
    const logDark = plain(new THREE.Color(r.wall).multiplyScalar(0.8).getStyle(), { roughness: 0.9 });
    const body = new THREE.Mesh(k.box(3.6, H, 2.8, 0), log);
    g.add(body);
    // stacked logs, their ends sticking out at the corners
    for (let y = 0.15, i = 0; y < H; y += 0.3, i++) {
      for (const z of [1.42, -1.42]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.9, 8).rotateZ(Math.PI / 2).translate(0, y, z), i % 2 ? log : logDark));
      for (const x of [1.82, -1.82]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.1, 8).rotateX(Math.PI / 2).translate(x, y + 0.15, 0), i % 2 ? logDark : log));
    }
    // a steep roof covered in snow, a stone chimney
    const roofG = new THREE.Group();
    k.roof(roofG, 'gable', r.roofColor, 4.2, 3.4, H);
    g.add(roofG);
    const snow = new THREE.Group();
    k.roof(snow, 'gable', '#f6f9fb', 4.3, 3.5, H + 0.12);
    g.add(snow);
    g.add(new THREE.Mesh(k.box(0.55, 1.6, 0.55, H + 0.4).translate(1.2, 0, -0.6), plain('#8a8580', { flatShading: true })));
    g.add(new THREE.Mesh(k.box(0.62, 0.12, 0.62, H + 2.0).translate(1.2, 0, -0.6), plain('#f6f9fb')));
    // the door with a wreath, warm windows, lights along the eave
    g.add(k.door(r.door, 1.58, 0.85, 0));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 8, 16).translate(0, 1.15, 1.66), plain('#2a9d5c')));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4).translate(0, 0.95, 1.7), plain('#e63946')));
    for (let y = 0.8; y < H - 0.4; y += k.FLOOR_H) for (const x of [-1.15, 1.15]) g.add(new THREE.Mesh(k.box(0.55, 0.5, 0.05, y).translate(x, 0, 1.6), glowing('#ffcf7a', 0.4, 2.2)));
    const bulbs = ['#e63946', '#ffd23f', '#3a86ff', '#5cc55a'];
    for (let i = 0; i < 16; i++) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4).translate(-2.0 + i * 0.27, H - 0.12, 1.72), glowing(bulbs[i % 4], 0.8, 2.6)));
    // snowy pines either side
    for (const [x, z, s] of [[-2.55, 1.6, 1], [2.55, 1.9, 0.8], [-2.5, -1.8, 0.9]]) {
      for (let i = 0; i < 3; i++) {
        g.add(new THREE.Mesh(new THREE.ConeGeometry((0.6 - i * 0.15) * s, 0.8 * s, 7).translate(x, (0.5 + i * 0.45) * s, z), plain('#2f6b3a', { flatShading: true })));
        g.add(new THREE.Mesh(new THREE.ConeGeometry((0.35 - i * 0.08) * s, 0.3 * s, 7).translate(x, (0.78 + i * 0.45) * s, z), plain('#f6f9fb', { flatShading: true })));
      }
    }
    return { body, top: H + 2.2, eave: H, front: 1.8, width: 4.4 };
  },

  // ---------------- Day 11 (2026-11-23) requests ----------------

  /** A cozy Christmas hotel: a stone ground floor, wooden floors above, a snowy roof, balconies with lights, a lit HOTEL sign and a little garden (Day 11, @TheplantWorker, the garden for @theguy-e4x). */
  'chalet-hotel'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.6 + h;
    const stone = plain('#8f8a84', { flatShading: true, roughness: 1 });
    const wood = plain(r.wall, { roughness: 0.85 });
    const body = new THREE.Mesh(k.box(4.2, 1.2, 3.0, 0).translate(0, 0, -0.4), stone);
    g.add(body, new THREE.Mesh(k.box(4.2, H - 1.2, 3.0, 1.2).translate(0, 0, -0.4), wood));
    for (let y = 1.3; y < H; y += 0.22) g.add(new THREE.Mesh(k.box(4.24, 0.03, 3.04, y).translate(0, 0, -0.4), plain(new THREE.Color(r.wall).multiplyScalar(0.78).getStyle())));
    for (let i = 0; i < 8; i++) g.add(new THREE.Mesh(k.box(0.5, 0.36, 0.06, 0.1 + (i % 2) * 0.4).translate(-1.7 + Math.floor(i / 2) * 1.13, 0, 1.12), plain('#a19a92', { flatShading: true })));
    const roofG = new THREE.Group();
    k.roof(roofG, 'gable', r.roofColor, 4.8, 3.6, H);
    roofG.position.z = -0.4;
    const snowG = new THREE.Group();
    k.roof(snowG, 'gable', '#f6f9fb', 4.9, 3.7, H + 0.12);
    snowG.position.z = -0.4;
    g.add(roofG, snowG);
    // a balcony with lights on every wooden floor, warm windows
    const bulbs = ['#ffd58a', '#e63946', '#5cc55a'];
    for (let y = 1.3, f = 0; y < H - 0.5; y += k.FLOOR_H, f++) {
      g.add(new THREE.Mesh(k.box(3.6, 0.08, 0.5, y).translate(0, 0, 1.35), wood), new THREE.Mesh(k.box(3.6, 0.35, 0.05, y + 0.08).translate(0, 0, 1.58), wood));
      for (const x of [-1.2, 0, 1.2]) g.add(new THREE.Mesh(k.box(0.6, 0.55, 0.05, y + 0.25).translate(x, 0, 1.11), glowing('#ffcf7a', 0.35, 2.2)));
      for (let i = 0; i < 12; i++) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4).translate(-1.75 + i * 0.32, y + 0.5, 1.6), glowing(bulbs[(i + f) % 3], 0.8, 2.6)));
    }
    // stone pillars at the corners and up the front (Day 12: wood and stone, asked for by @TheplantWorker)
    for (const x of [-2.15, 2.15]) for (const z of [-1.95, 1.15]) g.add(new THREE.Mesh(k.box(0.42, H, 0.42, 0).translate(x, 0, z), stone));
    for (const x of [-0.45, 0.45]) g.add(new THREE.Mesh(k.box(0.28, H - 0.3, 0.28, 0).translate(x, 0, 1.3), stone));
    // the lit sign, the door with a wreath
    g.add(new THREE.Mesh(k.box(1.6, 0.35, 0.08, 0.95).translate(0, 0, 1.16), glowing('#ffd23f', 0.6, 2.4)));
    g.add(k.door(r.door, 1.12, 0.8, 0).translateX(-1.0), new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.06, 6, 12).translate(-1.0, 0.95, 1.2), plain('#2a9d5c')));
    // the garden in front: hedges, flower beds, a lantern
    for (const x of [-2.2, 2.2]) g.add(new THREE.Mesh(k.box(0.9, 0.4, 1.4, 0).translate(x, 0, 2.1), plain('#3f8f3a', { flatShading: true })));
    ['#ff6fa5', '#ffd23f', '#9b5de5', '#ff7a45'].forEach((c, i) => g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4).translate(0.6 + i * 0.3, 0.15, 2.3), plain(c))));
    g.add(new THREE.Mesh(k.box(0.08, 0.9, 0.08, 0).translate(1.7, 0, 2.6), k.DARK), new THREE.Mesh(k.box(0.22, 0.22, 0.22, 0.9).translate(1.7, 0, 2.6), glowing('#ffd58a', 0.6, 2.6)));
    return { body, top: H + 1.6, eave: H, front: 2.0, width: 5.0 };
  },

  /** A paper house: white folded-paper walls with creases, a folded roof and a paper crane on top (Day 11, @Süßer_Fisch). */
  'paper-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.6 + h;
    const paper = plain(r.wall, { roughness: 0.95, flatShading: true });
    const crease = plain(new THREE.Color(r.wall).multiplyScalar(0.82).getStyle());
    const body = new THREE.Mesh(k.box(3.4, H, 2.8, 0), paper);
    g.add(body);
    // fold creases on the walls (a little offset panel on each half)
    for (const s of [-1, 1]) {
      g.add(new THREE.Mesh(k.box(0.03, H, 0.03, 0).translate(0, 0, s * 1.41), crease));
      g.add(new THREE.Mesh(k.box(1.6, H - 0.1, 0.02, 0.05).translate(s * 0.85, 0, 1.42), plain(new THREE.Color(r.wall).multiplyScalar(0.95).getStyle(), { flatShading: true })));
    }
    // the folded roof: two sheets meeting at a sharp ridge
    for (const s of [-1, 1]) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.04, 1.8), plain(r.roofColor, { roughness: 0.9 }));
      sheet.position.set(0, H + 0.6, s * 0.72);
      sheet.rotation.x = s * 0.75;
      g.add(sheet);
    }
    // drawn-on door and windows (flat, like paper cutouts)
    g.add(new THREE.Mesh(k.box(0.7, 1.1, 0.02, 0).translate(0, 0, 1.44), plain(r.door)));
    for (let y = 0.8; y < H - 0.4; y += k.FLOOR_H) for (const x of [-1.05, 1.05]) g.add(new THREE.Mesh(k.box(0.5, 0.45, 0.02, y).translate(x, 0, 1.44), glowing('#bfe3ff', 0.2, 1.5)));
    // a paper crane on top
    const crane = new THREE.Group();
    const cm = plain(r.accent || '#ff6fa5', { flatShading: true, side: THREE.DoubleSide });
    crane.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0).scale(1.6, 0.6, 0.6), cm));
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 3).rotateX(Math.PI / 2), cm);
      wing.position.set(0, 0.25, s * 0.45);
      wing.rotation.x = s * 0.9;
      crane.add(wing);
    }
    crane.add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 3).rotateZ(-0.9).translate(0.65, 0.3, 0), cm));
    crane.position.set(0, H + 1.45, 0);
    g.add(crane);
    const tick = (t) => { crane.rotation.y = Math.sin(t * 0.5) * 0.6; };
    return { body, top: H + 2.0, eave: H, front: 1.5, width: 3.8, tick };
  },

  /** A blue house with a little bakery on the ground floor: a striped awning, a window full of bread and a giant pretzel sign (Day 11, @Karso-official2). */
  'bakery-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.6 + h;
    const body = k.windowBox(3.4, H, 2.8, r.wall, 0);
    g.add(body);
    k.roof(g, 'gable', r.roofColor, 3.8, 3.2, H);
    // the shop front: a cream panel, a big display window with loaves, the door
    g.add(new THREE.Mesh(k.box(3.44, 1.4, 0.06, 0).translate(0, 0, 1.42), plain('#f3e3c3')));
    g.add(new THREE.Mesh(k.box(1.8, 0.8, 0.04, 0.35).translate(-0.6, 0, 1.46), glowing('#ffe7a8', 0.4, 2.2)));
    for (let i = 0; i < 5; i++) g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.25, 3, 8).rotateZ(Math.PI / 2).translate(-1.3 + i * 0.35, 0.5 + (i % 2) * 0.22, 1.5), plain('#c98a3a')));
    g.add(k.door(r.door, 1.46, 0.75, 0).translateX(0.95));
    // striped awning
    for (let i = 0; i < 7; i++) g.add(new THREE.Mesh(k.box(0.5, 0.1, 0.7, 1.42).translate(-1.5 + i * 0.5, 0, 1.75), plain(i % 2 ? '#ffffff' : (r.accent || '#e63946'))));
    // a giant pretzel on the gable
    const pretzel = new THREE.Group();
    const dough = plain('#b5651d', { roughness: 0.6 });
    for (const s of [-1, 1]) pretzel.add(new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.08, 8, 16).translate(s * 0.22, 0, 0), dough));
    pretzel.add(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 8, 16, Math.PI).rotateZ(Math.PI).translate(0, 0.05, 0), dough));
    pretzel.position.set(0, H + 0.55, 1.62);
    g.add(pretzel);
    return { body, top: H + 1.5, eave: H, front: 2.1, width: 3.8 };
  },

  /** A hero tower: a tall glass skyscraper with a slanted top, a glowing stripe and a landing pad on the roof (Day 11, @IronProductions-forever). */
  'hero-tower'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 3.2 + h * 1.2;
    const body = k.windowBox(2.8, H, 2.8, r.wall, 0);
    g.add(body);
    // the slanted crown: a wedge rising to the back
    const s = new THREE.Shape();
    s.moveTo(-1.45, 0); s.lineTo(1.45, 0); s.lineTo(1.45, 1.6); s.lineTo(-1.45, 0.3); s.lineTo(-1.45, 0);
    const crown = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 2.9, bevelEnabled: false }).translate(0, H, -1.45), plain(r.roofColor, { metalness: 0.5, roughness: 0.3 }));
    g.add(crown);
    // the glowing stripe up the front and a ring landing pad sticking out
    g.add(new THREE.Mesh(k.box(0.2, H, 0.06, 0).translate(0, 0, 1.43), glowing(r.accent || '#3fb6e8', 0.6, 2.6)));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.12, 24).translate(0, H - 0.9, 1.9), plain('#5c6670', { metalness: 0.6 })));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 6, 24).rotateX(Math.PI / 2).translate(0, H - 0.82, 1.9), glowing(r.accent || '#3fb6e8', 0.8, 3)));
    g.add(k.door(r.door, 1.42, 0.9, 0));
    return { body, top: H + 1.7, eave: H, front: 2.9, width: 3.0 };
  },

  /** A greenhouse house: white frames, glass walls and an arched glass roof, full of plants and flowers on every floor (Day 11, @EliBenjamin-f1b). */
  greenhouse(g, r, h, k) {
    const { THREE, plain } = k;
    const H = 1.6 + h;
    const glass = plain('#cfeaf5', { transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide });
    const frame = plain(r.wall || '#f7f7f5');
    const body = new THREE.Mesh(k.box(3.6, H, 2.8, 0), glass);
    g.add(body);
    // frames on the corners, every floor and the walls
    for (const [x, z] of [[-1.8, -1.4], [1.8, -1.4], [-1.8, 1.4], [1.8, 1.4]]) g.add(new THREE.Mesh(k.box(0.1, H, 0.1, 0).translate(x, 0, z), frame));
    for (let y = 0; y <= H + 0.01; y += k.FLOOR_H) g.add(new THREE.Mesh(k.box(3.7, 0.08, 2.9, Math.min(y, H - 0.08)), frame));
    for (let x = -1.2; x <= 1.21; x += 0.6) for (const z of [-1.42, 1.42]) g.add(new THREE.Mesh(k.box(0.05, H, 0.05, 0).translate(x, 0, z), frame));
    // the arched roof
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 3.6, 16, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).translate(0, H, 0), glass));
    for (let x = -1.8; x <= 1.81; x += 0.9) g.add(new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.04, 6, 16, Math.PI).rotateY(Math.PI / 2).translate(x, H, 0), frame));
    // plants on every floor: pots with leafy bushes and flowers
    const leaf = plain(r.roofColor || '#3f9a3a', { flatShading: true });
    for (let y = 0.08, f = 0; y < H - 0.3; y += k.FLOOR_H, f++) {
      for (let i = 0; i < 5; i++) {
        const x = -1.4 + i * 0.7, z = (i + f) % 2 ? 0.6 : -0.5;
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.25, 8).translate(x, y + 0.12, z), plain('#b5651d')));
        g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0).translate(x, y + 0.45, z), leaf));
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4).translate(x + 0.12, y + 0.6, z + 0.1), plain(['#ff6fa5', '#ffd23f', '#e63946'][(i + f) % 3])));
      }
    }
    g.add(k.door(r.door, 1.44, 0.8, 0));
    return { body, top: H + 1.4, eave: H, front: 1.5, width: 3.8 };
  },

  /** A croissant house: a golden crescent of puffy pastry rolls, darker baked ridges, a door in the middle (Day 11, @JakeMarx-k1w). */
  croissant(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const S = 1 + (h - k.FLOOR_H) * 0.12; // bigger with every floor
    const pastry = plain(r.wall, { roughness: 0.55 });
    const ridge = plain(new THREE.Color(r.wall).multiplyScalar(0.7).getStyle(), { roughness: 0.6 });
    let body = null;
    // five rolls along a crescent: biggest in the middle, tapering to curled tips
    const rolls = [[-1.9, 1.35, 0.5], [-1.15, 0.45, 0.75], [0, 0, 1.0], [1.15, 0.45, 0.75], [1.9, 1.35, 0.5]];
    for (const [x, z, s] of rolls) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14).scale(0.75 * s, 0.95 * s, 1.0 * s).translate(x * S, 0.9 * s * S, -z * S), pastry);
      g.add(m);
      if (!body || s === 1) body = m;
      g.add(new THREE.Mesh(new THREE.TorusGeometry(0.95 * s * S, 0.06 * S, 6, 20).rotateY(Math.PI / 2).scale(1, 1, 1).translate(x * S + 0.35 * s * S, 0.9 * s * S, -z * S), ridge));
    }
    g.add(k.door(r.door, 1.0 * S - 0.05, 0.8, 0));
    for (const x of [-1.2, 1.2]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.2, 14), glowing('#fff3c4', 0.3, 1.8));
      w.position.set(x * S, 0.9 * S, 0.55 * S);
      g.add(w);
    }
    return { body, top: 1.9 * S + 0.2, eave: 1.2 * S, front: 1.0 * S, width: 5 * S };
  },

  /** A train house: a little locomotive and a carriage that drive round an oval track on the plot, smoke puffing (Day 11, @Miniancur). */
  'train-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 0.9 + h * 0.5; // the carriage gets a deck taller with every floor
    // the track: an oval of rail and sleepers
    const curve = new THREE.EllipseCurve(0, 0, 2.3, 1.7, 0, Math.PI * 2);
    const pts = curve.getPoints(64).map((p) => new THREE.Vector3(p.x, 0.36, p.y));
    const path = new THREE.CatmullRomCurve3(pts, true);
    const body = new THREE.Mesh(new THREE.TubeGeometry(path, 96, 0.05, 4, true), plain('#8d96a3', { metalness: 0.6 }));
    g.add(body);
    for (let i = 0; i < 40; i++) {
      const p = path.getPointAt(i / 40), q = path.getPointAt((i / 40 + 0.01) % 1);
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), plain('#6b4a2f'));
      sl.position.set(p.x, 0.33, p.z);
      sl.lookAt(q.x, 0.33, q.z);
      g.add(sl);
    }
    // the locomotive
    const loco = new THREE.Group();
    loco.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 14).rotateX(Math.PI / 2).translate(0, 0.55, 0.15), plain(r.wall)));
    loco.add(new THREE.Mesh(k.box(0.7, 0.75, 0.55, 0.2).translate(0, 0, -0.55), plain(r.wall)), new THREE.Mesh(k.box(0.75, 0.1, 0.6, 0.95).translate(0, 0, -0.55), plain(r.roofColor)));
    loco.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.4, 8).translate(0, 1.05, 0.45), k.DARK), new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4).translate(0, 0.6, 0.72), glowing('#ffd23f', 0.8, 2.6)));
    for (const z of [-0.5, 0.05, 0.45]) for (const x of [-0.3, 0.3]) loco.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10).rotateZ(Math.PI / 2).translate(x, 0.16, z), plain(r.accent || '#e63946')));
    const puffs = [0, 1, 2].map(() => { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), plain('#f2f2f2', { transparent: true, opacity: 0.8 })); loco.add(p); return p; });
    // the carriage: the home, with windows and a door, taller with floors
    const car = new THREE.Group();
    car.add(new THREE.Mesh(k.box(0.75, H, 1.3, 0.2), plain(r.roofColor)), new THREE.Mesh(k.box(0.8, 0.1, 1.35, H + 0.2), plain(r.wall)));
    for (let y = 0.5; y < H; y += 0.5) for (const s of [-1, 1]) for (const z of [-0.35, 0.35]) car.add(new THREE.Mesh(k.box(0.02, 0.22, 0.3, y).translate(s * 0.39, 0, z), glowing('#fff3c4', 0.3, 1.8)));
    car.add(new THREE.Mesh(k.box(0.02, 0.5, 0.3, 0.2).translate(0.39, 0, 0), plain(r.door)));
    for (const z of [-0.45, 0.45]) for (const x of [-0.3, 0.3]) car.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 10).rotateZ(Math.PI / 2).translate(x, 0.16, z), plain(r.accent || '#e63946')));
    g.add(loco, car);
    // a little station platform with a sign in the middle
    g.add(new THREE.Mesh(k.box(1.6, 0.2, 0.8, 0.3), plain('#d9d6cf')), new THREE.Mesh(k.box(0.06, 0.9, 0.06, 0.5).translate(-0.5, 0, 0), k.DARK), new THREE.Mesh(k.box(0.7, 0.3, 0.04, 1.25).translate(-0.5, 0, 0), plain(r.accent || '#e63946')));
    loco.scale.setScalar(1.35);
    car.scale.setScalar(1.35);
    const tick = (t) => {
      const u = ((t * 0.05) % 1 + 1) % 1;
      const place = (obj, v) => { const p = path.getPointAt(v), q = path.getPointAt((v + 0.01) % 1); obj.position.set(p.x, 0.36, p.z); obj.lookAt(q.x, 0.36, q.z); };
      place(loco, u);
      place(car, (u + 0.87) % 1);
      puffs.forEach((p, i) => { const kk = ((t * 0.8 + i / 3) % 1 + 1) % 1; p.position.set(0, 1.25 + kk * 0.8, 0.45 - kk * 0.6); p.scale.setScalar(0.6 + kk); p.material.opacity = 0.8 * (1 - kk); });
    };
    tick(0);
    return { body, top: H * 1.35 + 1.2, eave: H * 1.35, front: 1.8, width: 4.8, tick };
  },

  /** A Jenga tower: one layer of three wooden blocks for every floor, each layer turned, a few blocks pushed out (Day 11, @EvanWR). */
  jenga(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const n = Math.max(3, Math.round(h / k.FLOOR_H) + 2);
    const L = 3.0, W = 0.95, T = 0.62;
    const woods = [r.wall, new THREE.Color(r.wall).multiplyScalar(0.8).getStyle(), new THREE.Color(r.wall).multiplyScalar(1.12).getStyle()];
    let body = null;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) {
        const out = ((i * 5 + j * 3) % 7 === 0 && i > 0) ? 0.55 : 0; // a few blocks pushed half out
        const m = new THREE.Mesh(new THREE.BoxGeometry(i % 2 ? W - 0.08 : L, T - 0.06, i % 2 ? L : W - 0.08), plain(woods[(i + j) % 3], { roughness: 0.75 }));
        if (i % 2) m.position.set((j - 1) * W, i * T + T / 2, out);
        else m.position.set(out, i * T + T / 2, (j - 1) * W);
        g.add(m);
        if (!body) body = m;
        // a lit window in the end of each block facing the street
        if (!(i % 2) && j === 2) g.add(new THREE.Mesh(k.box(0.4, 0.3, 0.03, i * T + 0.15).translate(-0.7 + out, 0, 1.44), glowing('#fff3c4', 0.3, 1.8)));
      }
    }
    g.add(k.door(r.door, 1.45, 0.7, 0).translateX(0.6));
    return { body, top: n * T + 0.2, eave: n * T, front: 1.5, width: 3.2 };
  },

  /** A giant cat house: a brown cat sitting up, orange glowing eyes, pointy ears, a curled tail and a door in its chest (Day 11, @FawazJamal-b7y). */
  'cat-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const S = 1 + (h - k.FLOOR_H) * 0.11; // the cat grows with every floor
    const fur = plain(r.wall, { roughness: 0.8 });
    const furLight = plain(new THREE.Color(r.wall).multiplyScalar(1.3).getStyle(), { roughness: 0.8 });
    const cat = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.4, 20, 16).scale(1, 1.15, 0.9).translate(0, 1.5, -0.2), fur);
    cat.add(body, new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12).scale(1, 1.1, 0.4).translate(0, 1.4, 0.55), furLight));
    cat.add(new THREE.Mesh(new THREE.SphereGeometry(1.0, 20, 16).scale(1.05, 0.9, 0.9).translate(0, 3.3, 0), fur));
    for (const s of [-1, 1]) {
      cat.add(new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.7, 4).translate(s * 0.55, 4.2, -0.05), fur));
      cat.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8).scale(1, 1.2, 0.5).translate(s * 0.38, 3.45, 0.8), glowing(r.accent || '#ff8c1a', 0.6, 2.6)));
      cat.add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6).scale(0.6, 1.4, 0.5).translate(s * 0.38, 3.45, 0.88), k.DARK));
      cat.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8).scale(1, 0.6, 1.3).translate(s * 0.6, 0.25, 0.7), fur)); // front paws
      for (let i = 0; i < 3; i++) cat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 4).rotateZ(Math.PI / 2 + s * (0.1 - i * 0.1)).translate(s * 0.65, 3.05 - i * 0.08, 0.85), plain('#f7f4ee')));
    }
    cat.add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.12, 3).rotateX(Math.PI).translate(0, 3.15, 0.9), plain('#e88a9a')));
    const tail = new THREE.CatmullRomCurve3([[1.0, 0.4, -0.8], [1.8, 0.6, -0.2], [1.9, 1.4, 0.4], [1.5, 2.0, 0.6]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    cat.add(new THREE.Mesh(new THREE.TubeGeometry(tail, 20, 0.2, 8, false), fur));
    cat.add(k.door(r.door, 0.92, 0.85, 0.15));
    cat.scale.setScalar(S);
    g.add(cat);
    return { body, top: 4.6 * S, eave: 3.0 * S, front: 1.0 * S, width: 3.6 * S };
  },

  /** A toy factory house: a colourful building of stacked toy blocks, a sawtooth roof, a chimney puffing rainbow smoke and gift boxes on a belt (Day 11, @CollettePrice-o5d). */
  'toy-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.6 + h;
    const body = new THREE.Mesh(k.box(3.6, H, 2.8, 0), plain(r.wall));
    g.add(body);
    // big toy-block decorations on the walls
    const cols = ['#e63946', '#ffd23f', '#3a86ff', '#5cc55a'];
    for (let y = 0.2, i = 0; y < H - 0.4; y += 0.7, i++) for (const x of [-1.85, 1.85]) g.add(new THREE.Mesh(k.box(0.3, 0.6, 0.6, y).translate(x, 0, 1.0), plain(cols[(i + (x > 0 ? 1 : 0)) % 4])));
    for (let y = 0.8; y < H - 0.4; y += k.FLOOR_H) for (const x of [-0.9, 0.9]) g.add(new THREE.Mesh(k.box(0.6, 0.5, 0.05, y).translate(x, 0, 1.42), glowing('#fff3c4', 0.3, 1.8)));
    // sawtooth roof in rainbow colours
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 3.0), plain(cols[i]));
      p.position.set(-1.35 + i * 0.9, H + 0.3, 0);
      p.rotation.z = 0.55;
      g.add(p);
    }
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.4, 10).translate(1.3, H + 0.7, -0.8), plain(r.roofColor)));
    const puffs = cols.map((c) => { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), plain(c, { transparent: true, opacity: 0.85 })); g.add(p); return p; });
    // the conveyor belt of gift boxes out front
    g.add(new THREE.Mesh(k.box(3.0, 0.25, 0.5, 0.2).translate(0, 0, 2.1), k.DARK));
    const gifts = [0, 1, 2, 3].map((i) => { const b = new THREE.Mesh(k.box(0.35, 0.3, 0.35, 0.45), plain(cols[(i + 2) % 4])); g.add(b); return b; });
    g.add(k.door(r.door, 1.42, 0.8, 0));
    const tick = (t) => {
      puffs.forEach((p, i) => { const kk = ((t * 0.4 + i / 4) % 1 + 1) % 1; p.position.set(1.3 + kk * 0.6, H + 1.5 + kk * 1.5, -0.8); p.scale.setScalar(0.6 + kk); p.material.opacity = 0.85 * (1 - kk); });
      gifts.forEach((b, i) => { b.position.set(-1.3 + ((((t * 0.3 + i / 4) % 1) + 1) % 1) * 2.6, 0, 2.1); });
    };
    tick(0);
    return { body, top: H + 1.4, eave: H, front: 2.4, width: 3.8, tick };
  },

  /** A pickle jar house: a big glass jar of green pickles in brine, a metal lid, a cat sitting on top (Day 11, @mesdake). */
  'pickle-jar'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 2.2 + h;
    const glass = plain('#d6f0c8', { transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, H, 28, 1, true).translate(0, H / 2, 0), glass);
    g.add(body, new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, H * 0.85, 28).translate(0, H * 0.425, 0), plain('#c9d98a', { transparent: true, opacity: 0.35 })));
    // pickles inside
    const pickle = plain(r.wall || '#5a8f2e', { roughness: 0.6 });
    for (let i = 0; i < Math.round(H * 3); i++) {
      const a = i * 2.4, rr = 0.5 + (i % 3) * 0.35, y = 0.4 + ((i * 37) % 100) / 100 * (H * 0.8 - 0.4);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 4, 8), pickle);
      m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr);
      m.rotation.set(0.3 * (i % 2), a, 0.4 * ((i % 3) - 1));
      g.add(m);
    }
    // lid, label, door
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.35, 28).translate(0, H + 0.17, 0), plain(r.roofColor || '#c9ccd1', { metalness: 0.6, roughness: 0.3 })));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.9, 28, 1, true, -0.7, 1.4).translate(0, H * 0.55, 0), plain(r.accent || '#ffd23f', { side: THREE.DoubleSide })));
    g.add(k.door(r.door, 1.7, 0.8, 0.02));
    // the cat on top
    const cat = new THREE.Group();
    const fur = plain('#f0a35e');
    cat.add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10).scale(1, 1.1, 0.9).translate(0, 0.45, 0), fur), new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 10).translate(0, 1.05, 0.1), fur));
    for (const s of [-1, 1]) cat.add(new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 4).translate(s * 0.18, 1.35, 0.1), fur), new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4).translate(s * 0.12, 1.1, 0.4), k.DARK));
    cat.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.3, 0.2, -0.3), new THREE.Vector3(0.7, 0.4, -0.1), new THREE.Vector3(0.6, 0.8, 0.2)]), 10, 0.07, 6), fur));
    cat.position.set(0, H + 0.35, 0);
    g.add(cat);
    const tick = (t) => { cat.rotation.y = Math.sin(t * 0.4) * 0.5; };
    return { body, top: H + 1.9, eave: H, front: 1.8, width: 3.6, tick };
  },

  /** An ant hill house: a big earth mound with tunnel holes, a door at the bottom and ants marching up and down (Day 11, @JasmineSanchez-e9m). */
  'ant-hill'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 2.2 + h * 0.8;
    const earth = plain(r.wall, { roughness: 1, flatShading: true });
    const body = new THREE.Mesh(new THREE.ConeGeometry(2.4, H, 10, 4).translate(0, H / 2, 0), earth);
    g.add(body, new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 6).scale(1, 0.5, 1).translate(0, H - 0.2, 0), earth));
    // tunnel holes all over (lit inside), one per floor at least
    const holes = [];
    for (let i = 0, y = 0.6; y < H - 0.6; y += 0.7, i++) {
      const a = i * 2.2, rr = 2.4 * (1 - y / H) + 0.02;
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), glowing('#ffcf7a', 0.25, 1.8));
      m.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr);
      m.lookAt(Math.sin(a) * 5, y + 1, Math.cos(a) * 5);
      g.add(m);
      holes.push([a, y]);
    }
    g.add(k.door(r.door, 2.0, 0.75, 0));
    // ants marching up and down the hill
    const ants = [];
    for (let i = 0; i < 10; i++) {
      const ant = new THREE.Group();
      for (let j = 0; j < 3; j++) ant.add(new THREE.Mesh(new THREE.SphereGeometry(0.07 + (j === 2 ? 0.02 : 0), 6, 4).translate(0, 0.07, (j - 1) * 0.13), plain('#1c1c1c')));
      g.add(ant);
      ants.push(ant);
    }
    const tick = (t) => ants.forEach((ant, i) => {
      const u = ((t * 0.08 + i / 10) % 1 + 1) % 1, up = i % 2 === 0;
      const v = up ? u : 1 - u, a = i * 0.63 + v * 0.8;
      const y = v * (H - 0.4), rr = 2.4 * (1 - y / H) + 0.08;
      ant.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr);
      ant.lookAt(Math.sin(a) * 0.1, y + (up ? 3 : -3), Math.cos(a) * 0.1);
    });
    tick(0);
    return { body, top: H + 0.3, eave: H * 0.6, front: 2.2, width: 4.8, tick };
  },
  /** An upside-down house half sunk into the ground: the roof buried, the walls on top, the lawn and a tree hanging from the sky side (Day 12, @LuminosityYouTube). */
  'upside-down'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.8 + h; // wall height
    const flip = new THREE.Group(); // the house built the right way up, then turned over
    const wall = plain(r.wall);
    const body = new THREE.Mesh(k.box(4.0, H, 3.4, 0), wall);
    flip.add(body);
    // a gable roof (built as a prism) and a chimney
    const tri = new THREE.Shape();
    tri.moveTo(-2.3, 0); tri.lineTo(2.3, 0); tri.lineTo(0, 1.7); tri.lineTo(-2.3, 0);
    const roofGeo = new THREE.ExtrudeGeometry(tri, { depth: 3.9, bevelEnabled: false }).translate(0, H, -1.95);
    flip.add(new THREE.Mesh(roofGeo, plain(r.roofColor, { flatShading: true })));
    flip.add(new THREE.Mesh(k.box(0.5, 1.2, 0.5, H + 0.8).translate(1.1, 0, -0.6), plain('#8a4b2f')));
    // the front: door, windows on every floor, a flower box (all hanging upside down now)
    flip.add(k.door(r.door, 1.71, 0.85, 0).translateX(-1.0));
    for (let y = 0.5, f = 0; y < H - 0.6; y += k.FLOOR_H, f++) {
      for (const x of f === 0 ? [0.9] : [-1.0, 0.9]) {
        flip.add(new THREE.Mesh(k.box(0.75, 0.6, 0.06, y + 0.15).translate(x, 0, 1.72), glowing('#fff3c4', 0.3, 2.0)));
        flip.add(new THREE.Mesh(k.box(0.85, 0.08, 0.12, y + 0.1).translate(x, 0, 1.76), plain(r.accent)));
      }
    }
    for (const sd of [-1, 1]) {
      const w = new THREE.Mesh(k.box(0.06, 0.6, 0.75, H * 0.55), glowing('#fff3c4', 0.3, 2.0));
      w.position.x = sd * 2.02;
      flip.add(w);
    }
    // the foundation and the lawn that used to be under it, with a little tree and a mailbox
    flip.add(new THREE.Mesh(k.box(4.3, 0.25, 3.7, -0.25), plain('#9aa0a6', { flatShading: true })));
    flip.add(new THREE.Mesh(k.box(5.0, 0.15, 4.6, -0.4), plain('#5cae4a')));
    flip.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 6).translate(-1.9, -0.85, 1.6), plain('#7b5a3c')));
    flip.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0).translate(-1.9, -1.45, 1.6), plain('#4f8f3f', { flatShading: true })));
    flip.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6).translate(1.9, -0.75, 2.0), k.DARK));
    flip.add(new THREE.Mesh(k.box(0.3, 0.22, 0.4, -1.2).translate(1.9, 0, 2.0), plain('#e63946')));
    flip.rotation.z = Math.PI + 0.12; // upside down and a little tipped over
    flip.position.y = H + 1.0;
    g.add(flip);
    // dirt and broken ground where the roof went in
    const dirt = plain('#6b4a2f', { flatShading: true, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + (i % 3) * 0.12, 0).scale(1, 0.55, 1).translate(Math.cos(a) * 2.45, 0.2, Math.sin(a) * 2.0), dirt));
    }
    for (const [x, z, ry] of [[-2.6, 1.2, 0.4], [2.5, -1.4, -0.7], [0.4, 2.3, 1.2]]) {
      const slab = new THREE.Mesh(k.box(0.7, 0.12, 0.5, 0.2), plain('#c9c2b4', { flatShading: true }));
      slab.position.set(x, 0, z);
      slab.rotation.set(0.3, ry, 0.25);
      g.add(slab);
    }
    return { body, top: H + 1.55, eave: H + 1.0, front: 1.9, width: 5.0 };
  },

  /** A house made entirely of sausages: sausage-log walls, a roof of sausages, a mustard zigzag, a sausage chimney (Day 12, @agafvaagaba). */
  'sausage-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.6 + h;
    const R = 0.19, STEP = 0.36;
    const meat = plain(r.wall, { roughness: 0.45 });
    const meat2 = plain(new THREE.Color(r.wall).multiplyScalar(0.82).getStyle(), { roughness: 0.45 });
    const sausage = (len, m) => new THREE.Mesh(new THREE.CapsuleGeometry(R, len, 6, 12), m);
    let body = null;
    // log-cabin walls of sausages, front/back along x and sides along z, overlapping at the corners
    const rows = Math.max(4, Math.round(H / STEP));
    for (let i = 0; i < rows; i++) {
      const y = R + i * STEP;
      const m = i % 2 ? meat : meat2;
      for (const z of [-1.5, 1.5]) {
        const s = sausage(4.1, m);
        s.rotation.z = Math.PI / 2;
        s.position.set(0, y, z);
        g.add(s);
        if (!body) body = s;
      }
      for (const x of [-2.0, 2.0]) {
        const s = sausage(3.0, m);
        s.rotation.x = Math.PI / 2;
        s.position.set(x, y + STEP / 2, 0);
        g.add(s);
      }
    }
    const top = R + rows * STEP;
    // inside block so it never looks hollow, then the gable roof of sausages up each slope
    g.add(new THREE.Mesh(k.box(3.8, top - 0.1, 2.8, 0), meat2));
    const roofM = plain(r.roofColor, { roughness: 0.45 });
    for (const sd of [-1, 1]) {
      for (let j = 0; j < 6; j++) {
        const s = sausage(4.6, roofM);
        s.rotation.z = Math.PI / 2;
        s.position.set(0, top + 0.1 + j * 0.27, sd * (1.85 - j * 0.33));
        g.add(s);
      }
    }
    // a gable end of sausage bits so the roof is closed, a mustard zigzag along the ridge, a ketchup drip
    for (const x of [-2.1, 2.1]) {
      for (let j = 0; j < 6; j++) {
        const s = sausage(Math.max(0.05, 3.2 - j * 0.62), meat);
        s.rotation.x = Math.PI / 2;
        s.position.set(x, top + 0.1 + j * 0.27, 0);
        g.add(s);
      }
    }
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push(new THREE.Vector3(-2.2 + i * 0.275, top + 1.85, i % 2 ? 0.18 : -0.18));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.07, 6, false), plain(r.accent || '#ffd23f', { roughness: 0.3 })));
    const ketchup = [];
    for (let i = 0; i <= 10; i++) ketchup.push(new THREE.Vector3(-1.8 + i * 0.36, top + 1.0 + Math.sin(i * 1.3) * 0.12, 1.25 - Math.sin(i * 0.9) * 0.1));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ketchup), 40, 0.06, 6, false), plain('#c1121f', { roughness: 0.3 })));
    // a standing sausage chimney with smoke-coloured tip, the door and warm windows in the front logs
    const chimney = sausage(1.3, meat);
    chimney.position.set(1.2, top + 1.4, -0.6);
    g.add(chimney);
    g.add(k.door(r.door, 1.72, 0.8, 0));
    for (const x of [-1.3, 1.3]) {
      for (let y = 0.7; y < top - 0.5; y += k.FLOOR_H) g.add(new THREE.Mesh(k.box(0.6, 0.5, 0.06, y).translate(x, 0, 1.72), glowing('#fff3c4', 0.3, 2.0)));
    }
    // a string of sausage links hanging over the door
    for (let i = 0; i < 7; i++) {
      const s = sausage(0.22, meat);
      s.scale.setScalar(0.6);
      s.rotation.z = Math.PI / 2;
      s.position.set(-0.9 + i * 0.3, 2.15 - Math.sin((i / 6) * Math.PI) * 0.25, 1.85);
      g.add(s);
    }
    return { body, top: top + 2.1, eave: top, front: 1.9, width: 4.8 };
  },

  /** A giant dog house (kennel): a big gable kennel with an arched opening, a bone on the roof, a name sign and a food bowl (Day 12, @Levitra86). */
  'dog-house'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.8 + h;
    const wood = plain(r.wall, { roughness: 0.85 });
    const body = new THREE.Mesh(k.box(4.0, H, 3.6, 0).translate(0, 0, -0.3), wood);
    g.add(body);
    for (let y = 0.3; y < H; y += 0.3) g.add(new THREE.Mesh(k.box(4.04, 0.03, 3.64, y).translate(0, 0, -0.3), plain(new THREE.Color(r.wall).multiplyScalar(0.75).getStyle())));
    for (const x of [-2.0, 2.0]) for (const z of [-2.1, 1.5]) g.add(new THREE.Mesh(k.box(0.3, H, 0.3, 0).translate(x, 0, z), plain(r.accent)));
    // the big steep kennel roof
    const tri = new THREE.Shape();
    tri.moveTo(-2.5, 0); tri.lineTo(2.5, 0); tri.lineTo(0, 2.0); tri.lineTo(-2.5, 0);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 4.3, bevelEnabled: false }).translate(0, H, -2.45), plain(r.roofColor, { flatShading: true })));
    // the arched kennel opening (dark) with the real door inside it
    const arch = new THREE.Shape();
    arch.moveTo(-0.9, 0); arch.lineTo(-0.9, 1.4); arch.absarc(0, 1.4, 0.9, Math.PI, 0, true); arch.lineTo(0.9, 0); arch.lineTo(-0.9, 0);
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(arch).translate(0, 0.05, 1.52), plain('#1c1410')));
    g.add(k.door(r.door, 1.53, 0.75, 0));
    // the name sign over the arch, windows up the front for the floors
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 96;
    const c = cv.getContext('2d');
    c.fillStyle = '#fff3c4'; c.fillRect(0, 0, 256, 96);
    c.fillStyle = '#5b3a24'; c.font = '900 60px Inter, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('WOOF', 128, 52);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5).translate(0, Math.min(H - 0.4, 2.65), 1.53), new THREE.MeshStandardMaterial({ map: tex })));
    for (let y = 3.0; y < H - 0.4; y += k.FLOOR_H) for (const x of [-1.2, 1.2]) g.add(new THREE.Mesh(k.box(0.55, 0.5, 0.06, y).translate(x, 0, 1.52), glowing('#fff3c4', 0.3, 2.0)));
    // a giant bone on the ridge, a food bowl and a ball in front
    const bone = new THREE.Group();
    const white = plain('#f7f4ee');
    bone.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 10).rotateZ(Math.PI / 2), white));
    for (const x of [-0.95, 0.95]) for (const z of [-0.17, 0.17]) bone.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8).translate(x, 0, z), white));
    bone.position.set(0, H + 2.15, -0.3);
    g.add(bone);
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.22, 16).translate(1.5, 0.11, 2.2), plain('#e63946')));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 16).translate(1.5, 0.2, 2.2), plain('#8a5a2c')));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8).translate(-1.6, 0.2, 2.3), plain('#ffd23f')));
    return { body, top: H + 2.4, eave: H, front: 1.6, width: 5.0 };
  },
  /** A house that is a huge hole in the ground: a round pit with lit windows going down its walls, a ladder, a hatch roof on a ring (Day 13, @Finbob4000). */
  sinkhole(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const D = 1.2 + h; // the deeper, the more floors (windows down the pit wall)
    const rim = plain(r.wall, { flatShading: true, roughness: 1 });
    // the dark pit, seen from above: a black disc with a ring of earth and stone, and an inner wall (open cylinder, inside faces)
    const body = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.35, 8, 28).rotateX(Math.PI / 2).translate(0, 0.3, 0), rim);
    g.add(body);
    g.add(new THREE.Mesh(new THREE.CircleGeometry(2.05, 28).rotateX(-Math.PI / 2).translate(0, 0.33, 0), plain('#0b0907')));
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 1.2, 28, 1, true).translate(0, -0.25, 0), plain('#3b2a1f', { side: THREE.BackSide }));
    g.add(wall);
    // little lit windows round the top of the pit, one ring per floor showing as glowing slits
    const n = Math.max(1, Math.round(h / k.FLOOR_H));
    for (let f = 0; f < Math.min(n, 3); f++) for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + f * 0.4;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.22), glowing('#ffcf7a', 0.6, 2.4));
      w.position.set(Math.cos(a) * 1.97, 0.15 - f * 0.3, Math.sin(a) * 1.97);
      w.lookAt(0, w.position.y, 0);
      g.add(w);
    }
    // a ladder going down, a hatch with a little roof over the pit on four posts, a sign "MIND THE HOLE"
    for (const x of [-0.25, 0.25]) g.add(new THREE.Mesh(k.box(0.06, 1.6, 0.06, -0.9).translate(x, 0, 1.6), plain('#8a5a3a')));
    for (let y = -0.8; y < 0.7; y += 0.25) g.add(new THREE.Mesh(k.box(0.5, 0.05, 0.05, y).translate(0, 0, 1.6), plain('#8a5a3a')));
    for (const [x, z] of [[-1.9, -1.9], [1.9, -1.9], [1.9, 1.9], [-1.9, 1.9]]) g.add(new THREE.Mesh(k.box(0.14, 2.6, 0.14, 0).translate(x, 0, z), plain('#7b5a3c')));
    k.roof(g, 'pointed', r.roofColor, 4.4, 4.4, 2.6);
    g.add(k.door(r.door, 2.3, 0.6, 0).translateX(1.4));
    // the depth shows as a tall rope-and-bucket winch, one floor more = a longer rope (and a number sign of the depth)
    g.add(new THREE.Mesh(k.box(0.08, D * 0.3 + 0.6, 0.08, 2.6).translate(0, 0, 0), plain('#c9b28a')));
    return { body, top: 4.6, eave: 2.6, front: 2.3, width: 5.0 };
  },

  /** A giant American football helmet house: a red shell, a face mask, a stripe, a door in the ear hole (Day 13, @KCNFLNEWS). */
  'football-helmet'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const S = 1.0 + (h - k.FLOOR_H) * 0.12;
    const shell = plain(r.wall, { metalness: 0.3, roughness: 0.25 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.1 * S, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1, 1.05, 1.15).translate(0, 0.4, 0), shell);
    g.add(body);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(2.12 * S, 0.14, 6, 30, Math.PI * 0.62).rotateY(Math.PI / 2).rotateX(Math.PI * 0.19).scale(1, 1.05, 1.15).translate(0, 0.42, 0), plain(r.accent))); // the stripe over the top
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(2.1 * S, 2.1 * S, 0.4, 24).scale(1, 1, 1.15).translate(0, 0.2, 0), plain(r.roofColor)));
    // the face mask: grey bars in front
    const bar = plain('#d5dbe1', { metalness: 0.6, roughness: 0.3 });
    for (const y of [0.9, 1.5]) g.add(new THREE.Mesh(new THREE.TorusGeometry(1.4 * S, 0.08, 6, 20, Math.PI).rotateX(Math.PI / 2).rotateY(0).translate(0, y * S, 1.55 * S), bar));
    for (const x of [-0.5, 0, 0.5]) g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0 * S, 6).translate(x * S, 1.2 * S, 2.95 * S - 0.1), bar));
    // the ear hole is the front door, the windows round the shell
    g.add(k.door(r.door, 2.35 * S, 0.8, 0.2));
    for (const a of [-1.1, 1.1, -2.2, 2.2]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), glowing('#fff3c4', 0.3, 1.8));
      w.position.set(Math.sin(a) * 2.25 * S, 1.6 * S, Math.cos(a) * 2.25 * S * 1.1);
      w.lookAt(Math.sin(a) * 9, 1.6 * S, Math.cos(a) * 9);
      g.add(w);
    }
    return { body, top: 2.6 * S + 0.4, eave: 1.8 * S, front: 3.0 * S, width: 4.6 * S };
  },

  /** A pure black cube: no windows, no doors, nothing (Day 13, @riku_taizaki_official). */
  'black-cube'(g, r, h, k) {
    const { THREE, plain } = k;
    const H = 2.6 + h;
    const body = new THREE.Mesh(k.box(3.6, H, 3.6, 0), plain(r.wall || '#050505', { roughness: 0.9 }));
    g.add(body);
    return { body, top: H, eave: H, front: 1.8, width: 3.6 };
  },

  /** An empty warehouse for no purpose at all: corrugated walls, a big roll-up door, a curved roof, an empty pallet (Day 13, @WalterHartwellWhite9-7-58). */
  warehouse(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 2.0 + h * 0.6;
    const body = new THREE.Mesh(k.box(4.6, H, 4.0, 0).translate(0, 0, -0.3), plain(r.wall, { roughness: 0.7 }));
    g.add(body);
    for (let x = -2.2; x <= 2.21; x += 0.25) g.add(new THREE.Mesh(k.box(0.05, H, 0.04, 0).translate(x, 0, 1.72), plain(new THREE.Color(r.wall).multiplyScalar(0.8).getStyle())));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(2.32, 2.32, 4.04, 24).rotateX(Math.PI / 2).scale(1, 0.4, 1).translate(0, H, -0.3), plain(r.roofColor))); // the curved roof (its lower half is inside)
    g.add(new THREE.Mesh(k.box(2.4, Math.min(2.4, H - 0.4), 0.08, 0).translate(-0.6, 0, 1.75), plain('#9aa0a6', { metalness: 0.4 })));
    for (let y = 0.2; y < Math.min(2.4, H - 0.4); y += 0.22) g.add(new THREE.Mesh(k.box(2.4, 0.03, 0.1, y).translate(-0.6, 0, 1.79), plain('#7d838a')));
    g.add(k.door(r.door, 1.75, 0.7, 0).translateX(1.5));
    g.add(new THREE.Mesh(k.box(0.5, 0.25, 0.06, H - 0.6).translate(1.5, 0, 1.75), glowing('#fff3c4', 0.4, 2)));
    g.add(new THREE.Mesh(k.box(1.0, 0.15, 0.8, 0).translate(1.0, 0, 2.6), plain('#b08a5a'))); // one empty pallet
    return { body, top: H + 0.95, eave: H, front: 1.8, width: 4.8 };
  },

  /** A mini replica of the city on a table: a little lake and river, tiny blocks of houses, a tiny Christmas tree, under a glass dome (Day 13, @thewindbro-x2n). */
  'city-replica'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const T = 1.0 + h * 0.3; // the table gets taller with floors
    const body = new THREE.Mesh(k.box(4.4, 0.25, 4.4, T), plain(r.wall));
    g.add(body);
    for (const [x, z] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) g.add(new THREE.Mesh(k.box(0.2, T, 0.2, 0).translate(x, 0, z), plain(r.roofColor)));
    const top = T + 0.25;
    g.add(new THREE.Mesh(k.box(4.1, 0.04, 4.1, top), plain('#e9eff3')));
    // the lake and the river
    const lake = new THREE.Shape();
    lake.moveTo(-0.3, 0.6); lake.lineTo(1.9, 0.9); lake.lineTo(1.9, 2.0); lake.lineTo(0.2, 2.0); lake.lineTo(-0.5, 1.2);
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(lake).rotateX(Math.PI / 2).translate(0, top + 0.06, 0), plain('#3fb6e8', { side: THREE.DoubleSide })));
    g.add(new THREE.Mesh(k.box(0.35, 0.02, 2.4, top + 0.05).translate(0.1, 0, -0.6).rotateY(0.25), plain('#3fb6e8')));
    // tiny houses and towers in a grid
    const cols = ['#e63946', '#3a86ff', '#ffd23f', '#5cc55a', '#f7f4ee', '#9b5de5'];
    let n = 0;
    for (let x = -1.7; x <= 1.71; x += 0.42) for (let z = -1.7; z <= 0.4; z += 0.42) {
      if (Math.abs(x - 0.1) < 0.3) continue;
      const hh = 0.1 + ((n * 37) % 7) * 0.05 + (n % 9 === 0 ? 0.35 : 0);
      g.add(new THREE.Mesh(k.box(0.24, hh, 0.24, top + 0.04).translate(x, 0, z), plain(cols[n++ % cols.length])));
    }
    g.add(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 8).translate(-1.2, top + 0.27, 1.4), plain('#2a8a4a')));
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0).translate(-1.2, top + 0.53, 1.4), glowing('#ffd34d', 1, 3)));
    // the glass dome over it, and a little door under the table into the house
    g.add(new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 1).translate(0, top, 0), plain('#bfe6ff', { transparent: true, opacity: 0.22, roughness: 0.05 })));
    g.add(k.door(r.door, 0.6, 0.6, 0));
    return { body, top: top + 1.3, eave: top, front: 2.2, width: 4.6 };
  },

  /** A house shaped like the letters W R C standing side by side, with windows in the letters (Day 13, @WRC_0029). */
  'wrc-letters'(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 2.4 + h; // letter height
    const m = plain(r.wall), m2 = plain(r.accent);
    const D = 1.0; // depth
    const ext = (shape, x, mat) => {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: D, bevelEnabled: false });
      geo.translate(x, 0, -D / 2);
      const mesh = new THREE.Mesh(geo, mat);
      g.add(mesh);
      return mesh;
    };
    const w = 1.5, s = H / 4; // letter width, stroke
    // W
    const W = new THREE.Shape();
    W.moveTo(0, H); W.lineTo(0.3, 0); W.lineTo(0.6, 0); W.lineTo(w / 2, H * 0.55); W.lineTo(w - 0.6, 0); W.lineTo(w - 0.3, 0); W.lineTo(w, H);
    W.lineTo(w - 0.35, H); W.lineTo(w - 0.45, H * 0.35); W.lineTo(w / 2, H * 0.85); W.lineTo(0.45, H * 0.35); W.lineTo(0.35, H); W.lineTo(0, H);
    const body = ext(W, -2.45, m);
    // R
    const R = new THREE.Shape();
    R.moveTo(0, 0); R.lineTo(0.35, 0); R.lineTo(0.35, H * 0.45); R.lineTo(0.55, H * 0.45); R.lineTo(1.15, 0); R.lineTo(1.5, 0); R.lineTo(0.9, H * 0.47);
    R.absarc(0.75, H * 0.73, H * 0.27, -Math.PI / 2, Math.PI / 2, false); R.lineTo(0, H); R.lineTo(0, 0);
    const hole = new THREE.Path();
    hole.moveTo(0.35, H * 0.58); hole.lineTo(0.7, H * 0.58); hole.absarc(0.72, H * 0.73, H * 0.14, -Math.PI / 2, Math.PI / 2, false); hole.lineTo(0.35, H * 0.88); hole.lineTo(0.35, H * 0.58);
    R.holes.push(hole);
    ext(R, -0.75, m2);
    // C
    const C = new THREE.Shape();
    C.absellipse(0.75, H / 2, 0.75, H / 2, Math.PI * 0.3, Math.PI * 1.7, false);
    C.absellipse(0.75, H / 2, 0.38, H / 2 - 0.38, Math.PI * 1.7, Math.PI * 0.3, true);
    ext(C, 0.95, m);
    // windows on each floor in the letters, a door in the R
    for (let y = 0.6; y < H - 0.4; y += k.FLOOR_H) for (const x of [-2.3, -1.2, -0.6, 1.2]) g.add(new THREE.Mesh(k.box(0.22, 0.3, 0.04, y).translate(x, 0, D / 2 + 0.01), glowing('#fff3c4', 0.3, 2)));
    g.add(k.door(r.door, D / 2 + 0.02, 0.6, 0).translateX(-0.57));
    return { body, top: H, eave: H, front: D / 2, width: 5.0 };
  },

  /** A pentagon-shaped building: five wings round an inner courtyard, rows of windows, a flat roof (Day 13, @RedPanda-t2k). */
  pentagon(g, r, h, k) {
    const { THREE, plain, glowing } = k;
    const H = 1.4 + h * 0.5;
    const outer = new THREE.Shape(), inner = new THREE.Path();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
      const [ox, oz] = [Math.cos(a) * 2.5, Math.sin(a) * 2.5], [ix, iz] = [Math.cos(a) * 1.2, Math.sin(a) * 1.2];
      i ? outer.lineTo(ox, oz) : outer.moveTo(ox, oz);
      i ? inner.lineTo(ix, iz) : inner.moveTo(ix, iz);
    }
    outer.holes.push(inner);
    const geo = new THREE.ExtrudeGeometry(outer, { depth: H, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const body = new THREE.Mesh(geo, plain(r.wall));
    body.rotation.y = Math.PI; // one flat side faces the street
    g.add(body);
    const roofGeo = new THREE.ShapeGeometry(outer);
    roofGeo.rotateX(-Math.PI / 2);
    const roof = new THREE.Mesh(roofGeo, plain(r.roofColor));
    roof.position.y = H + 0.01;
    roof.rotation.y = Math.PI;
    g.add(roof);
    g.add(new THREE.Mesh(new THREE.CircleGeometry(1.15, 5).rotateX(-Math.PI / 2).translate(0, 0.05, 0), plain('#5cae4a'))); // the courtyard lawn
    // window rows on all five outer walls
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.PI / 2 + Math.PI / 5 + Math.PI;
      const nx = Math.cos(a), nz = Math.sin(a), dist = 2.5 * Math.cos(Math.PI / 5) + 0.02;
      for (let y = 0.35; y < H - 0.2; y += 0.45) for (let s = -1; s <= 1; s += 0.5) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), glowing('#fff3c4', 0.25, 1.8));
        w.position.set(nx * dist - nz * s, y, nz * dist + nx * s);
        w.lookAt(nx * 9, y, nz * 9);
        g.add(w);
      }
    }
    g.add(k.door(r.door, 2.5 * Math.cos(Math.PI / 5) + 0.03, 0.7, 0));
    return { body, top: H + 0.2, eave: H, front: 2.1, width: 5.0 };
  },
};

/** A little pixel-art texture (16 x 16, crisp): a base colour with noise; planks = board lines, stripes = bark. */
function pixelTex(THREE, base, { vary = 0.14, planks = false, stripes = false } = {}) {
  const n = 16;
  const cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const c = cv.getContext('2d');
  const col = new THREE.Color();
  let seed = 7;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      seed = (seed * 16807) % 2147483647;
      let l = ((seed % 1000) / 1000 - 0.5) * vary;
      if (planks && y % 4 === 3) l -= 0.12;
      if (planks && y % 4 !== 3 && (x + Math.floor(y / 4) * 5) % 16 === 0) l -= 0.08;
      if (stripes && x % 4 === 0) l -= 0.1;
      col.set(base).offsetHSL(0, 0, l);
      c.fillStyle = col.getStyle();
      c.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
