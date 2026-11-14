// One-off house models, made in the daily session for requests the kit can't do
// ("a house shaped like X"). Each model is a shape like the ones in houses.js:
//
//   'model-id'(g, r, h, k) -> { body, top, eave, front, width, tick? }
//     g  THREE.Group to add meshes to (house faces +z, the lot is 6 x 6, keep it within about 5 x 5)
//     r  the recipe: r.wall, r.roofColor, r.door, r.accent (#rrggbb) and r.extras
//     h  height from the floors (floors x 1.2); grow the model with it
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
    const H = Math.max(4.2, h + 2.4); // face height grows with the floors
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
    const H = Math.max(4.2, h + 2.6);
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
};
