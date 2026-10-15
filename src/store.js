// ---------- Shared game state ----------
// Everything several modules both read and change (the level, the lanes, the player, timers…) lives
// on this one object, so ES-module imports (which are read-only) can share it.
export const G = {};
