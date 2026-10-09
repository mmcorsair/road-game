// ---------- Layout & tuning ----------
const W = 480, H = 640;
const FINISH_H = 64, START_H = 64, LANE_H = 48, MEDIAN_H = 32, LANES_PER_SIDE = 5;
const MEDIAN_Y = FINISH_H + LANES_PER_SIDE * LANE_H;          // top of the median strip
const PLAYER_SPEED = 150, PLAYER_SIZE = 22, START_LIVES = 3;
const REVERSE_MIN = 6, REVERSE_MAX = 12;  // seconds between direction changes of a reversible lane
const MIN_WARNING = 2;                    // a reversing lane blinks at least this long before flipping
const FOLLOW_DIST = 60, ACCEL = 150, BRAKE = 400;  // car-following: keep distance, accelerate, brake (px, px/s²)
const RAIN_BRAKE = 170, RAIN_FOLLOW_DIST = 95;   // wet road: weaker brakes (px/s²), longer following distance (px)
const RAIN_GRIP_GUESS = 1.3;               // wet-road drivers expect this much more grip than they have
const BIKE_LEVEL = 2;                     // motorbikes appear from this level
const RAIL_LEVEL = 3;                     // a railway crossing replaces a lane from this level (two from +4)
const EMERGENCY_LEVEL = 4;                // emergency vehicles appear from this level
const EMERGENCY_MIN = 10, EMERGENCY_MAX = 18;  // seconds between emergency vehicles
const EMERGENCY_WARN = 2.5;               // siren + flashing warning this long before it enters
const COUNTDOWN_STEP = 0.7;               // seconds per number of the 3-2-1 countdown before each level
const LEVELUP_TIME = 2.2;                 // seconds the level-complete celebration lasts
const TRAIN_MIN = 6, TRAIN_MAX = 12;      // seconds between trains on a railway lane
const TRAIN_WARN = 2.5;                   // lights + bell this long before a train arrives
const TRAIN_SPEED_MIN = 420, TRAIN_SPEED_MAX = 560;   // px/s
const LANE_CHANGE_SIGNAL = 1;             // seconds a vehicle blinks before changing lanes
const LANE_CHANGE_TIME = 0.8;             // seconds the move to the next lane takes
const TRUCK_SIGNAL = 1.6, TRUCK_CHANGE_TIME = 1.4;    // trucks signal longer and move over more slowly
const BIKE_SIGNAL = 0.5, BIKE_CHANGE_TIME = 0.45;    // motorbikes barely signal and swerve quickly
const MAX_RENDER_SCALE = 2;               // canvas pixel density cap (see render.js)
const LITE_FPS = 42;                      // below this for a few seconds, switch to lite mode
const BUS_MIN = 10, BUS_MAX = 16;         // seconds between buses
const BUS_DWELL = 4;                      // seconds a bus waits at its stop
const STOPPED_V = 8;                      // vehicles slower than this (px/s) block the player instead of hurting
const TIME_LIMIT = 30;                    // seconds per attempt; running out costs a life
const PROGRESS_POINTS = 10;               // per lane crossed for the first time in a level
const LEVEL_POINTS = 100;                 // × level, for reaching the finish
const TIME_POINTS = 10;                   // per second left on the clock at the finish
const PICKUP_MIN = 4, PICKUP_MAX = 8;    // seconds between pickups appearing (at most 2 on the road)
const PICKUP_LIFE = 8;                   // seconds a pickup stays before vanishing
const COIN_POINTS = 50;
const TIME_PICKUP = 10;                   // seconds added by a clock pickup
const MAX_LIVES = 5;
const SLOW_TIME = 5, SLOW_FACTOR = 0.4;   // slow-traffic power-up: duration and speed multiplier
const SHIELD_GRACE = 1.5;                 // seconds of safety after a shield breaks
const CAR_COLORS =['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#2ecc71'];

// Gameplay randomness goes through gameRandom()/pickupRandom(). The daily challenge swaps them for
// generators seeded by the date (see daily.js); cosmetic effects use fxRand() so they never disturb them.
let gameRandom = Math.random, pickupRandom = Math.random;
const rand = (a, b) => a + gameRandom() * (b - a);
const pickupRand = (a, b) => a + pickupRandom() * (b - a);
const fxRand = (a, b) => a + Math.random() * (b - a);
const pickFrom = (list, random = gameRandom) => list[Math.floor(random() * list.length)];

// Fisher–Yates shuffle (unlike sort() with a random comparator, it's the same in every browser).
function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(gameRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
