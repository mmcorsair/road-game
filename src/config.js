// ---------- Layout & tuning ----------
import { G } from './store.js';

export const W = 480, H = 640;
export const FINISH_H = 64, START_H = 64, LANE_H = 48, MEDIAN_H = 32, LANES_PER_SIDE = 5;
export const MEDIAN_Y = FINISH_H + LANES_PER_SIDE * LANE_H;          // top of the median strip
export const PLAYER_SPEED = 150, PLAYER_SIZE = 22, START_LIVES = 3;
export const REVERSE_MIN = 6, REVERSE_MAX = 12;  // seconds between direction changes of a reversible lane
export const MIN_WARNING = 2;                    // a reversing lane blinks at least this long before flipping
export const FOLLOW_DIST = 60, ACCEL = 150, BRAKE = 400;  // car-following: keep distance, accelerate, brake (px, px/s²)
export const RAIN_BRAKE = 170, RAIN_FOLLOW_DIST = 95;   // wet road: weaker brakes (px/s²), longer following distance (px)
export const RAIN_GRIP_GUESS = 1.3;               // wet-road drivers expect this much more grip than they have
export const BIKE_LEVEL = 2;                     // motorbikes appear from this level
export const RAIL_LEVEL = 3;                     // a railway crossing replaces a lane from this level (two from +4)
export const EMERGENCY_LEVEL = 4;                // emergency vehicles appear from this level
export const EMERGENCY_MIN = 10, EMERGENCY_MAX = 18;  // seconds between emergency vehicles
export const EMERGENCY_WARN = 2.5;               // siren + flashing warning this long before it enters
export const COUNTDOWN_STEP = 0.7;               // seconds per number of the 3-2-1 countdown before each level
export const LEVELUP_TIME = 2.2;                 // seconds the level-complete celebration lasts
export const TRAIN_MIN = 6, TRAIN_MAX = 12;      // seconds between trains on a railway lane
export const TRAIN_WARN = 2.5;                   // lights + bell this long before a train arrives
export const TRAIN_SPEED_MIN = 420, TRAIN_SPEED_MAX = 560;   // px/s
export const LANE_CHANGE_SIGNAL = 1;             // seconds a vehicle blinks before changing lanes
export const LANE_CHANGE_TIME = 0.8;             // seconds the move to the next lane takes
export const TRUCK_SIGNAL = 1.6, TRUCK_CHANGE_TIME = 1.4;    // trucks signal longer and move over more slowly
export const BIKE_SIGNAL = 0.5, BIKE_CHANGE_TIME = 0.45;    // motorbikes barely signal and swerve quickly
export const MAX_RENDER_SCALE = 2;               // canvas pixel density cap (see render.js)
export const LITE_FPS = 42;                      // below this for a few seconds, switch to lite mode
export const BUS_MIN = 10, BUS_MAX = 16;         // seconds between buses
export const BUS_DWELL = 4;                      // seconds a bus waits at its stop
export const STOPPED_V = 8;                      // vehicles slower than this (px/s) block the player instead of hurting
export const BOSS_EVERY = 5;                     // every 5th level is a boss level (see boss.js)
export const BOSS_BONUS = 500;                   // extra points for completing one (level points also double)
export const HIGHWAY_SPEED = 1.5;                // highway boss: traffic speed multiplier
export const PARADE_SPEED = 55;                  // parade boss: float speed (px/s)
export const PARADE_GAP_MIN = 110, PARADE_GAP_MAX = 150;   // parade boss: the walkable gaps in the convoy (px)
export const ROLLER_SPEED = 40;                  // roadworks boss: steamroller speed (px/s)
export const RUBBLE_SPEED = 0.55;                // roadworks boss: walking speed in a closed lane
export const TIME_LIMIT = 30;                    // seconds per attempt; running out costs a life
export const PROGRESS_POINTS = 10;               // per lane crossed for the first time in a level
export const LEVEL_POINTS = 100;                 // × level, for reaching the finish
export const TIME_POINTS = 10;                   // per second left on the clock at the finish
export const PICKUP_MIN = 4, PICKUP_MAX = 8;    // seconds between pickups appearing (at most 2 on the road)
export const PICKUP_LIFE = 8;                   // seconds a pickup stays before vanishing
export const COIN_POINTS = 50;
export const TIME_PICKUP = 10;                   // seconds added by a clock pickup
export const MAX_LIVES = 5;
export const SLOW_TIME = 5, SLOW_FACTOR = 0.4;   // slow-traffic power-up: duration and speed multiplier
export const BOOTS_TIME = 5, BOOTS_SPEED = 1.6;  // speed boots: duration and walking-speed multiplier
export const MAGNET_TIME = 8, MAGNET_RADIUS = 140, MAGNET_PULL = 260;   // coin magnet: s, reach (px), pull (px/s)
export const GHOST_TIME = 4;                     // ghost: seconds that vehicles pass through you
export const SHIELD_GRACE = 1.5;                 // seconds of safety after a shield breaks
export const CAR_COLORS =['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#2ecc71'];

// Gameplay randomness goes through gameRandom()/pickupRandom(). The daily challenge swaps them for
// generators seeded by the date (see daily.js); cosmetic effects use fxRand() so they never disturb them.
G.gameRandom = Math.random;
G.pickupRandom = Math.random;
export const rand = (a, b) => a + G.gameRandom() * (b - a);
export const pickupRand = (a, b) => a + G.pickupRandom() * (b - a);
export const fxRand = (a, b) => a + Math.random() * (b - a);
export const pickFrom = (list, random = G.gameRandom) => list[Math.floor(random() * list.length)];

// Fisher–Yates shuffle (unlike sort() with a random comparator, it's the same in every browser).
export function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(G.gameRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
