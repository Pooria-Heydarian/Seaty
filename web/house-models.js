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
};
