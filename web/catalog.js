// What Seaty can build. The 3D models live in world.js (UPGRADE_MODELS / LANDMARK_MODELS / HOUSE_SHAPES):
// when you add a model there, add it here too so the daily AI step can grant it.
// No dependencies, so Node (scripts/ai-specials.mjs) can import it directly.

/** House upgrades: one of each type per house. */
export const UPGRADE_TYPES = {
  pool: 'a swimming pool in the yard next to the house',
  'apple-tree': 'an apple tree with red apples in the backyard',
  capybara: 'a pet capybara with an orange on its head in the front yard',
  cat: 'a pet cat sitting in the front yard',
  dog: 'a pet dog in the front yard, wagging its tail',
  gems: 'a glowing red ruby and blue sapphire crystal on stone stands',
  'flower-tree': 'a blossom tree covered in pink flowers',
  pond: 'a little backyard pond with lily pads',
  campfire: 'a stone patio with a campfire and log benches',
  chickens: 'a chicken coop with two chickens',
  'giant-apple-tree': 'a GIANT apple tree towering over the house',
  'giant-oak-tree': 'a GIANT oak tree in the backyard',
  garage: 'a garage with a red sports car in front',
  torii: 'a red Japanese shrine gate (torii) in front of the house',
  quail: 'a pet quail hopping in the front yard',
  'soccer-field': 'a small soccer pitch with two goals beside the house',
};

/** Landmarks with their own 3D model. Any other landmark is built as a generic gold-domed hall with a name sign. */
export const LANDMARK_TYPES = {
  'spaghetti-factory': 'a spaghetti / pasta / noodle factory',
  stadium: 'a football / soccer stadium (use --color for the seats and --accent for the trim)',
  ballpark: 'a baseball park with a diamond and a scoreboard (--color for the seats)',
  'theme-park': 'a theme park: Ferris wheel, roller coaster, carousel',
  'power-plant': 'a (nuclear) power plant with cooling towers',
  park: 'a park with a fountain, trees, benches, a pond and a clock tower',
  farm: 'a farm: red barn, silo, crop fields',
  'watermelon-factory': 'a watermelon factory with a giant slice on the roof (and a "no seeds" sign)',
  'car-show': 'a car showroom with cars and a pickup truck on a turntable',
  mosque: 'a mosque with a big central dome and two minarets (--color walls, --accent domes)',
  'race-track': 'an oval race track with a grandstand and racing cars',
  circus: 'a circus: big striped top tent, flags and a small tent',
  airport: 'an airport: runway, terminal, control tower, planes',
  rail: 'an elevated railway loop with a station and a train',
  aquarium: 'an aquarium: a big glass tank with an octopus',
  'toy-factory': 'a toy factory with giant toy bricks on the roof and a teddy bear',
  hospital: 'a hospital with a red cross, helipad and ambulance',
  'space-center': 'a space center: rocket on a launch pad, service tower, mission control',
  museum: 'a museum: classical columns, triangle pediment, steps and banners',
  bakery: 'a bakery with a striped awning and a giant croissant on the roof',
  'fire-station': 'a fire station: red brick, garage doors, hose tower, fire truck',
  'pet-store': 'a pet store with a paw-print sign, a giant bone and a dog statue',
  'corner-shop': 'a corner shop with an OPEN sign and crates of fruit outside',
  'jewelry-store': 'a black-and-gold jewelry store with a giant turning diamond',
  'mma-gym': 'an MMA gym with a boxing-glove sign and an octagon cage',
  school: 'a school: brick building, clock, flagpole, playground, school bus',
  market: 'a market: striped stalls with fruit and vegetables, and a market hall',
  mall: 'a shopping mall with a glass atrium, glowing sign and car park',
};

// ---------- City rules ----------
/** Each citizen: one house (a new design replaces the old one) and at most this many landmarks. */
export const MAX_LANDMARKS_PER_CITIZEN = 2;

/**
 * The kind of a landmark: the city has at most one of each kind (one airport, one zoo…).
 * Uses def.kind, else the model type, else the name ("Pizza Shop" -> "pizza-shop").
 * Stadiums: a football stadium and a ballpark are different kinds.
 */
export function landmarkKind(def) {
  const slug = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  if (def.kind) return slug(def.kind);
  if (def.type && def.type !== 'generic') return slug(def.type);
  return slug(def.name);
}

// ---------- Custom house kit ----------
// A resident can ask for their own special house. The AI step turns the request into a
// "recipe" made only of these parts; world.js builds it. Floors still grow +1 per video.

/** Building shapes. */
export const HOUSE_SHAPES = {
  classic: 'a normal house (use this when they only ask for colours, a roof or extras)',
  cottage: 'a cosy wide cottage with timber beams',
  mansion: 'a grand mansion: main house with two side wings, white columns at the entrance and steps',
  castle: 'a stone castle with four corner turrets and battlements',
  tower: 'a round tower',
  dome: 'a round building with a big dome on top (observatory, mosque-like dome, planetarium)',
  pyramid: 'a stepped pyramid',
  mushroom: 'a mushroom house: thick stem with a big spotted cap',
  treehouse: 'a little house up in a big tree',
  lighthouse: 'a striped lighthouse with a glowing lamp',
  rocket: 'a rocket ship standing on fins',
  igloo: 'an igloo / snow dome house',
  glass: 'a modern glass skyscraper-style building',
  // One-off models (web/house-models.js), made for a request; anyone can ask for them later too.
  'gem-head': 'a giant head with a boxy flat-top afro and a two-colour visor (wall = skin, roofColor = hair, accent = left lens)',
  'chess-knight': 'a chess knight piece on a round base with a floating "!!" badge (wall = piece, roofColor = eyes, accent = badge)',
  medieval: 'a medieval house: stone ground floor, half-timbered upper floors, steep roof (wall = plaster)',
  bunker: 'a concrete bunker in a grassy mound with slit windows and a heavy door (wall = concrete, accent = hazard stripes)',
  caravan: 'a camper caravan with an awning; extra floors add a pop-top level (wall = shell, accent = stripe and awning)',
  'japanese-cafe': 'a Japanese house / café: paper screens, tiled roofs with upturned corners (one tier per floor), noren curtain, red lanterns (wall = wood, accent = curtain)',
};

/** Roofs. Ignored by shapes that have their own top (mushroom, rocket, igloo, pyramid, dome, lighthouse). */
export const HOUSE_ROOFS = {
  pointed: 'a pointed four-sided roof',
  gable: 'a classic triangle (gable) roof',
  flat: 'a flat roof',
  dome: 'a round dome roof',
  spire: 'a tall thin spire',
};

/** Extras: up to 4 per house. */
export const HOUSE_EXTRAS = {
  flag: 'a flag on a pole (in the accent colour)',
  flowers: 'flower beds in front of the house',
  fence: 'a white picket fence around the yard',
  'solar-panels': 'solar panels on the side of the roof',
  smoke: 'a chimney with smoke puffing out',
  'fairy-lights': 'string lights that glow at night (accent colour)',
  statue: 'a small golden statue in the yard',
  fountain: 'a little fountain in the yard',
  'satellite-dish': 'a satellite dish',
  windmill: 'a small windmill with turning blades',
  hearts: 'floating hearts above the roof (accent colour)',
  star: 'a big glowing star on top (accent colour)',
};

export const MAX_HOUSE_EXTRAS = 4;

/** Default colours, used when the AI's colour isn't valid. */
export const HOUSE_DEFAULTS = { wall: '#efe2cf', roof: '#b5523b', door: '#6b4630', accent: '#ff7a45' };

/**
 * Checks and cleans a recipe (from the AI step, or hand-edited specials.json).
 * Unknown parts are dropped, colours must be #rrggbb. Returns null if there is nothing usable.
 */
export function cleanHouseRecipe(r) {
  if (!r || typeof r !== 'object') return null;
  const hex = (c, d) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c.trim()) ? c.trim().toLowerCase() : d);
  const shape = HOUSE_SHAPES[r.shape] ? r.shape : 'classic';
  const roof = HOUSE_ROOFS[r.roof] ? r.roof : 'pointed';
  const extras = [...new Set((Array.isArray(r.extras) ? r.extras : []).filter((e) => HOUSE_EXTRAS[e]))].slice(0, MAX_HOUSE_EXTRAS);
  return {
    shape,
    roof,
    wall: hex(r.wall, HOUSE_DEFAULTS.wall),
    roofColor: hex(r.roofColor, HOUSE_DEFAULTS.roof),
    door: hex(r.door, HOUSE_DEFAULTS.door),
    accent: hex(r.accent, HOUSE_DEFAULTS.accent),
    extras,
  };
}
