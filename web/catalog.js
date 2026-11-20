// What Seaty can build. The 3D models live in world.js (UPGRADE_MODELS / LANDMARK_MODELS / HOUSE_SHAPES):
// when you add a model there, add it here too so the daily AI step can grant it.
// No dependencies, so Node (scripts/ai-specials.mjs) can import it directly.

/** House upgrades: one of each type per house. */
/** Invite friends: a citizen with this many invited friends is an Ambassador / gets their own village. */
export const AMBASSADOR_INVITES = 3;
export const VILLAGE_INVITES = 5;

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
  elephant: 'a friendly grey elephant in the front yard, flapping its ears',
  shelter: 'a storm shelter / backyard bunker: grassy mound with slanted steel doors',
  drone: 'a camera drone circling over the house',
  'koi-pond': 'a koi pond with orange and white fish and a stone lantern',
  trophy: 'a golden trophy in the front yard (only for weekly challenge winners)',
  'capybara-pen': 'a fenced capybara pen with three capybaras and a little pool (back yard)',
  'xmas-hats': 'Christmas hats on the chickens (needs the chicken coop)',
  'big-cats': 'a pet lion and tiger in the back yard',
  'mango-tree': 'a mango tree with ripe mangoes in the back yard',
  'milk-portal': 'a swirling portal to the milk realm in the back yard (with a milk carton)',
  'rooftop-sign': 'a big lit sign on the roof with their letters (npm run special -- upgrade <who> rooftop-sign --text "P.B.")',
  garden: 'a garden beside the house: raised flower beds, vegetables and a watering can',
  golf: 'a putting green with a flag, a sand bunker and a golf cart in the back yard',
  'pickup-trucks': 'two big pickup trucks parked beside the house',
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
  skyscraper: 'a stepped glass apartment skyscraper with lit window bands and an antenna (--color glass, --accent trim)',
  cafe: 'a cute pastel café with a giant coffee cup on the roof and parasol tables',
  'lemon-farm': 'a lemon orchard with a yellow farmhouse and a lemonade stand',
  'black-hole-reactor': 'a sci-fi reactor: glass dome over a black hole with a glowing disk, viewing gallery',
  'hot-dog-stand': 'a hot dog cart with a parasol and a giant hot dog on top',
  'baguette-statue': 'a giant statue of a girl with red drill pigtails holding up a baguette',
  'samurai-statue': 'a samurai statue in dark armour with a katana, stone lanterns and a cherry tree (--color armour)',
  boutique: 'a clothing boutique with mannequins in dresses and a giant gold hanger sign',
  dojo: 'a Japanese martial-arts dojo with a two-tier roof, training dummy and bamboo',
  cinema: 'a movie theater with a glowing marquee, film reel and popcorn bucket',
  university: 'a neoclassical university main building with columns and a big dome',
  'gothic-church': 'a gothic church with twin dark spired towers and a rose window',
  dam: 'a small dam between two hills with a reservoir, waterfall spillway and power house',
  'construction-site': 'a construction site with a tower crane, steel frame and cement mixer',
  pizzeria: 'a pizza place with a giant pizza slice on the roof',
  'capybara-adoption': 'a capybara adoption centre with a giant capybara head on the roof and a yard of capybaras',
  castle: 'a big stone castle: walls, corner towers, gatehouse, keep, moat',
  'game-store': 'a game store with a neon sign, arcade cabinets and a giant controller on the roof',
  motel: 'a two-storey motel with a pool, parked cars and a tall neon sign',
  'bus-depot': 'a bus depot: garage hall, parked buses and one driving its loop',
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

// ---------- City plan: neighbourhoods, districts, sizes ----------

/** Neighbourhoods by house style. A house lives in the neighbourhood of its style; a makeover moves it. */
export const NEIGHBOURHOODS = {
  classic: 'Classic Homes',
  tower: 'Tower Row',
  villa: 'Villa Hills',
  old: 'Old Town',
  fantasy: 'Fantasy Lane',
};
const SHAPE_STYLE = {
  glass: 'tower', tower: 'tower', dome: 'tower',
  mansion: 'villa', castle: 'villa',
  cottage: 'old', medieval: 'old', 'japanese-cafe': 'old',
  mushroom: 'fantasy', rocket: 'fantasy', igloo: 'fantasy', treehouse: 'fantasy', pyramid: 'fantasy', lighthouse: 'fantasy',
  'gem-head': 'fantasy', 'chess-knight': 'fantasy', bunker: 'fantasy', caravan: 'fantasy',
  'white-house': 'villa', rainbow: 'fantasy', 'space-station': 'fantasy', 'glass-spire': 'tower', donut: 'fantasy', airplane: 'fantasy', 'capybara-head': 'fantasy', roach: 'fantasy', 'lake-house': 'old',
};
/** The neighbourhood of a house recipe (no recipe = classic). A classic shape with a flat roof counts as modern (Tower Row). */
export function houseStyle(recipe) {
  if (!recipe) return 'classic';
  if (SHAPE_STYLE[recipe.shape]) return SHAPE_STYLE[recipe.shape];
  if (recipe.shape === 'classic' && recipe.roof === 'flat') return 'tower';
  return 'classic';
}

/**
 * Where a landmark goes and how big it is.
 *   districts: civic (downtown around the town hall), main (Main Street shops), local (everyday shops between houses),
 *              belt (green belt: fun, sports, nature), outskirts (industry and transport), station (end of Main Street)
 *   sizes: S = one house lot, M = one block, L = 2 x 2 blocks
 */
const LANDMARK_PLAN = {
  museum: ['civic', 'M'], school: ['civic', 'M'], hospital: ['civic', 'M'], 'fire-station': ['civic', 'M'], mosque: ['civic', 'M'],
  library: ['civic', 'M'], university: ['civic', 'M'], 'gothic-church': ['civic', 'M'], 'police-station': ['civic', 'M'], church: ['civic', 'M'], temple: ['civic', 'M'], 'post-office': ['civic', 'M'],
  'jewelry-store': ['main', 'M'], 'pet-store': ['main', 'M'], 'mma-gym': ['main', 'M'], skyscraper: ['main', 'M'], boutique: ['main', 'M'], cinema: ['main', 'M'], 'construction-site': ['main', 'M'], 'game-store': ['main', 'M'], motel: ['main', 'M'], gym: ['main', 'M'], 'car-show': ['main', 'M'], mall: ['main', 'M'],
  bakery: ['local', 'S'], 'corner-shop': ['local', 'S'], market: ['local', 'S'], cafe: ['local', 'S'], 'hot-dog-stand': ['local', 'S'], pizzeria: ['local', 'S'], dojo: ['local', 'S'], pharmacy: ['local', 'S'], florist: ['local', 'S'],
  stadium: ['belt', 'L'], ballpark: ['belt', 'L'], 'theme-park': ['belt', 'L'], 'race-track': ['belt', 'L'], circus: ['belt', 'M'], aquarium: ['belt', 'M'],
  park: ['belt', 'L'], farm: ['belt', 'L'], zoo: ['belt', 'L'], 'lemon-farm': ['belt', 'L'], 'baguette-statue': ['belt', 'M'], 'samurai-statue': ['belt', 'M'], 'capybara-adoption': ['belt', 'M'], castle: ['belt', 'L'], statue: ['belt', 'M'],
  'power-plant': ['outskirts', 'L'], 'spaghetti-factory': ['outskirts', 'L'], 'watermelon-factory': ['outskirts', 'L'], 'toy-factory': ['outskirts', 'L'],
  airport: ['outskirts', 'L'], 'space-center': ['outskirts', 'L'], 'black-hole-reactor': ['outskirts', 'L'], dam: ['outskirts', 'L'], 'bus-depot': ['outskirts', 'M'],
  rail: ['station', 'L'], railway: ['station', 'L'],
};
export function landmarkPlan(def) {
  const kind = landmarkKind(def);
  const plan = LANDMARK_PLAN[def.type] || LANDMARK_PLAN[kind];
  if (plan) return { district: plan[0], size: plan[1] };
  if (/factory|plant|works|port$|mine|refinery/.test(kind)) return { district: 'outskirts', size: 'L' };
  if (/stadium|arena|track|zoo|park$|garden/.test(kind)) return { district: 'belt', size: 'L' };
  return { district: 'main', size: 'M' }; // any other shop or public building goes on Main Street
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
  'white-house': 'a white presidential mansion: columned portico with pediment, two wings, roof balustrade, flag (accent = flag)',
  rainbow: 'a rainbow-striped house (one colour per floor band) with a rainbow arching over the roof',
  'space-station': 'a round grey space-station sphere with a trench and a big dish (wall = shell, accent = dish light)',
  'glass-spire': 'a sleek tapering glass skyscraper with a tall lit spire (wall = glass, accent = spire light)',
  donut: 'a giant donut house standing on its edge with icing and sprinkles (wall = dough, roofColor = icing)',
  airplane: 'an airplane house: fuselage with windows, wings, engines and tail (wall = body, accent = stripe and tail)',
  'capybara-head': 'a giant capybara head with an orange on top, a capybara mailbox, plushie and hedge (wall = fur, roofColor = snout, accent = orange)',
  roach: 'a glossy beetle / cockroach-shaped house on six legs with antennae and round windows (wall = shell, roofColor = head and legs, accent = window light)',
  'lake-house': 'a wooden lake cabin with a deck, its own little lake, a dock and a canoe (wall = wood, accent = canoe)',
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
