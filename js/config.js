// ---------- Layout & tuning ----------
const W = 480, H = 640;
const FINISH_H = 64, START_H = 64, LANE_H = 48, MEDIAN_H = 32, LANES_PER_SIDE = 5;
const MEDIAN_Y = FINISH_H + LANES_PER_SIDE * LANE_H;          // top of the median strip
const PLAYER_SPEED = 150, PLAYER_SIZE = 22, START_LIVES = 3;
const REVERSE_MIN = 6, REVERSE_MAX = 12;  // seconds between direction changes of a reversible lane
const MIN_WARNING = 2;                    // a reversing lane blinks at least this long before flipping
const FOLLOW_DIST = 60, ACCEL = 150, BRAKE = 400;  // car-following: keep distance, accelerate, brake (px, px/s²)
const BIKE_LEVEL = 2;                     // motorbikes appear from this level
const EMERGENCY_LEVEL = 3;                // emergency vehicles appear from this level
const EMERGENCY_MIN = 10, EMERGENCY_MAX = 18;  // seconds between emergency vehicles
const EMERGENCY_WARN = 2.5;               // siren + flashing warning this long before it enters
const COUNTDOWN_STEP = 0.7;               // seconds per number of the 3-2-1 countdown before each level
const LEVELUP_TIME = 2.2;                 // seconds the level-complete celebration lasts
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

const rand = (a, b) => a + Math.random() * (b - a);
