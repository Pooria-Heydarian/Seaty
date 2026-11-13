// City layout rules, shared by the browser (world.js) and the daily scripts (Node).
// No dependencies, so Node can import it directly.
//
// - Block 0 (the centre) is the town square.
// - 8 downtown blocks around it are kept for the first landmarks.
// - Houses fill the other blocks along a square spiral, 4 plots per block.
// - Landmark #9 and later get their own block at the city edge, recorded in
//   specials.json as "block": [x, z]. Houses that move in later skip those blocks,
//   so no existing house ever moves.

export const LOT = 6;
export const BLOCK = LOT * 2;
export const ROAD = 4;
export const PITCH = BLOCK + ROAD;
export const LOT_OFFSETS = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, z]) => [(x * LOT) / 2, (z * LOT) / 2]);
export const LANDMARK_BLOCKS = [[1, -1], [-1, 1], [1, 1], [-1, -1], [2, -2], [-2, 2], [2, 2], [-2, -2]];

/** Square spiral: 0 -> (0,0), 1 -> (1,0), ... */
export function spiral(n) {
  if (n === 0) return [0, 0];
  const k = Math.ceil((Math.sqrt(n + 1) - 1) / 2);
  let t = 2 * k + 1;
  let m = t * t;
  t -= 1;
  if (n >= m - t) return [k - (m - n), -k];
  m -= t;
  if (n >= m - t) return [-k, -k + (m - n)];
  m -= t;
  if (n >= m - t) return [-k + (m - n), k];
  return [k, k - (m - n - t)];
}

/** Spiral index of a block, or -1 if it is too far out. */
export function spiralIndexOf(bx, bz, limit = 100000) {
  for (let n = 0; n < limit; n++) {
    const [x, z] = spiral(n);
    if (x === bx && z === bz) return n;
  }
  return -1;
}

/**
 * A layout for one set of edge landmark blocks.
 * @param {Array<[number,number]>} edgeBlocks blocks of landmark #9 and later
 */
export function createLayout(edgeBlocks = []) {
  const reserved = new Set([...LANDMARK_BLOCKS, ...edgeBlocks].map(([x, z]) => `${x},${z}`));
  const residentBlocks = []; // [{ bx, bz, n }]
  let cursor = 1;
  const residentBlock = (k) => {
    while (residentBlocks.length <= k) {
      const [bx, bz] = spiral(cursor);
      if (!reserved.has(`${bx},${bz}`)) residentBlocks.push({ bx, bz, n: cursor });
      cursor++;
    }
    return residentBlocks[k];
  };
  return {
    reserved,
    residentBlocks,
    residentBlock,
    isReserved: (bx, bz) => reserved.has(`${bx},${bz}`),
    /** Plot index (0-based) -> {x, z} world position */
    plot(i) {
      const { bx, bz } = residentBlock(Math.floor(i / 4));
      const [ox, oz] = LOT_OFFSETS[i % 4];
      return { x: bx * PITCH + ox, z: bz * PITCH + oz };
    },
    /** Index into residentBlocks for spiral index n (or -1 if n is reserved) */
    residentIndexOfN(n) {
      while (!residentBlocks.length || residentBlocks.at(-1).n < n) residentBlock(residentBlocks.length);
      return residentBlocks.findIndex((rb) => rb.n === n);
    },
  };
}

/**
 * Picks the block for a new edge landmark: the first free spiral block after
 * everything that is already in use (houses and earlier edge landmarks).
 */
export function nextEdgeLandmarkBlock(residentCount, edgeBlocks) {
  const layout = createLayout(edgeBlocks);
  const lastHouseN = residentCount ? layout.residentBlock(Math.ceil(residentCount / 4) - 1).n : 0;
  const lastEdgeN = Math.max(0, ...edgeBlocks.map(([x, z]) => spiralIndexOf(x, z)));
  for (let n = Math.max(8, lastHouseN, lastEdgeN) + 1; ; n++) {
    const [bx, bz] = spiral(n);
    if (!layout.isReserved(bx, bz)) return [bx, bz];
  }
}
