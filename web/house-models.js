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
};
