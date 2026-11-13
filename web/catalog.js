// What Seaty can build. The 3D models live in world.js (UPGRADE_MODELS / LANDMARK_MODELS):
// when you add a model there, add it here too so the daily AI step can grant it.

/** House upgrades: one of each type per house. */
export const UPGRADE_TYPES = {
  pool: 'a swimming pool in the yard next to the house',
  'apple-tree': 'an apple tree with red apples in the backyard',
  capybara: 'a pet capybara with an orange on its head in the front yard',
};

/** Landmarks with their own 3D model. Any other landmark is built as a generic gold-domed hall with a name sign. */
export const LANDMARK_TYPES = {
  'spaghetti-factory': 'a spaghetti / pasta / noodle factory',
};
