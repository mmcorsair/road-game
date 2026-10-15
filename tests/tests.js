// Road Crossing test suite. Open tests.html in a browser; results show on the page, in the console,
// in the tab title (✅/❌) and as <body data-result="pass|fail">, for headless runs.
import '../src/index.js';                  // the whole game, loaded exactly as on the real page
import { G } from '../src/store.js';
import { BOOTS_SPEED, BOOTS_TIME, BOSS_BONUS, COIN_POINTS, COUNTDOWN_STEP, EMERGENCY_LEVEL, EMERGENCY_WARN, FINISH_H, GHOST_TIME, H, LANES_PER_SIDE, LANE_H, LEVELUP_TIME, LEVEL_POINTS, MAGNET_RADIUS, MAX_LIVES, MAX_RENDER_SCALE, MEDIAN_H, MEDIAN_Y, MIN_WARNING, PARADE_GAP_MIN, PARADE_SPEED, PLAYER_SIZE, PLAYER_SPEED, PROGRESS_POINTS, RAIL_LEVEL, RAIN_BRAKE, RUBBLE_SPEED, SHIELD_GRACE, SLOW_FACTOR, SLOW_TIME, START_H, START_LIVES, TIME_LIMIT, TIME_PICKUP, TRAIN_WARN, W } from '../src/config.js';
import { DEFAULT_SETTINGS, setSetting } from '../src/settings.js';
import { keys, saveHiScore } from '../src/state.js';
import { sound } from '../src/sound.js';
import { BASS_STEPS, MIDI, MUSIC_LEVEL, PROGRESSIONS, music, musicTempo, musicTick, stopMusic } from '../src/music.js';
import { fx, reduceMotion } from '../src/effects.js';
import { buildLanes } from '../src/traffic.js';
import { bossFor } from '../src/boss.js';
import { LANE_CHANGERS, laneHooks, moveToLane } from '../src/lanechange.js';
import { weatherFor } from '../src/weather.js';
import { hitsCar } from '../src/player.js';
import { PICKUP_TYPES, resetPickups } from '../src/pickups.js';
import { SKINS, chooseSkin, closeSkinPicker, currentSkin, isUnlocked, openSkinPicker, skinPickerOpen } from '../src/skins.js';
import { dailyShareText, hashString, seedRandomness, seededRandom, startDailyFromUI, todayKey } from '../src/daily.js';
import { TIPS, TIP_SLOWMO, TIP_TIME, replayTips, tipTimeScale } from '../src/tutorial.js';
import { ACHIEVEMENTS, achievementCount, hasAchievement, unlockAchievement } from '../src/achievements.js';
import { closeMenu, menuOpen, openMenu } from '../src/menu.js';
import { addScore, loseLife, newGame, startAttempt, startCountdown, update } from '../src/game.js';
import { canvas, ctx, dpr, draw, setRenderScale } from '../src/render.js';
import { buttons, drag, keyboard, releaseKeys, setPaused, syncKeys } from '../src/input.js';
import { watchFrameRate } from '../src/main.js';

(() => {
  // ---------- Tiny test runner ----------
  const tests = [];
  let group = '';
  const describe = (name, fn) => { group = name; fn(); };
  const test = (name, fn) => tests.push({ group, name, fn });

  class AssertionError extends Error {}
  const assert = (cond, msg = 'assertion failed') => { if (!cond) throw new AssertionError(msg); };
  const eq = (actual, expected, msg = '') =>
    assert(Object.is(actual, expected),
      `${msg ? msg + ': ' : ''}expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  const near = (actual, expected, tol, msg = '') =>
    assert(Math.abs(actual - expected) <= tol,
      `${msg ? msg + ': ' : ''}expected ${expected} ± ${tol}, got ${actual}`);

  // ---------- Helpers for driving the game ----------
  const DT = 1 / 120;                       // the game's fixed step

  // Advance the game by `seconds`, calling each(stepIndex) before every step.
  function run(seconds, each) {
    const n = Math.round(seconds / DT);
    for (let i = 0; i < n; i++) {
      if (each && each(i) === false) return;   // returning false stops early
      update(DT);
    }
  }

  function hold(dir, down = true) {
    keyboard[dir] = down;
    syncKeys();
  }

  // Empty road: no traffic, no pickups, no hazards scheduled. (nextGap = NaN: "room >= NaN" is always
  // false, so nothing spawns — an empty lane has Infinity room, which even a huge gap wouldn't stop.)
  function quietRoad() {
    for (const l of G.lanes) {
      Object.assign(l, { cars: [], nextGap: NaN, reversible: false, draining: false, emergency: null, rail: null,
                         busStop: null });
    }
    G.pickups = [];
    G.pickupTimer = 1e9;
    G.emergencyTimer = 1e9;
  }

  // A game in the 'playing' state at the given level (countdown skipped).
  function startPlaying({ lvl = 1, daily = false } = {}) {
    newGame(daily ? 'daily' : 'normal');
    if (lvl !== 1) {
      G.level = lvl;
      buildLanes();
      resetPickups();
      startAttempt();
    }
    G.state = 'playing';
    G.goTimer = 0;
  }

  const onSidewalk = () => { G.player.y = H - START_H / 2; G.player.x = W / 2; G.timeLeft = TIME_LIMIT; };

  function resetWorld() {
    releaseKeys();
    closeSkinPicker();
    G.mode = 'normal';
    G.hiScore = 0;
    G.score = 0;
    G.skinId = 'classic';
    G.banner = null;
    G.particles = [];
    G.popups = [];
    G.achievements = { unlocked: {}, bonusKinds: [], bosses: [] };
    G.toastQueue = [];
    G.settings = { ...DEFAULT_SETTINGS };      // the player's own settings must not affect results
    if (menuOpen()) closeMenu(false);
    G.seenTips = new Set(Object.keys(TIPS));   // tips off unless a test turns them on
    G.activeTip = null;
    G.tipQueue = [];
    G.tipSlow = 0;
    newGame();
    G.state = 'title';
  }

  const plainCar = (x, extra = {}) =>
    ({ kind: 'car', w: 60, h: 28, speed: 0.001, v: 0.001, x, color: '#f00', ...extra });

  // Front-to-back order and no overlaps in every lane.
  function checkTrafficInvariants() {
    for (const l of G.lanes) {
      for (let j = 1; j < l.cars.length; j++) {
        const a = l.cars[j - 1], c = l.cars[j];
        assert(a.x * l.dir >= c.x * l.dir, `lane ${l.index}: vehicles out of order`);
        assert((a.x - c.x) * l.dir - (a.w + c.w) / 2 >= -1, `lane ${l.index}: vehicles overlap`);
      }
    }
  }

  // ================================================================
  describe('Scoring & timer', () => {
    test('crossing an empty road scores lanes + level + time bonus', () => {
      startPlaying(); quietRoad();
      hold('up');
      run(10, () => G.state === 'playing');
      eq(G.state, 'levelup');
      eq(G.levelProgress, 10, 'lanes crossed');
      eq(G.levelBonus.levelPoints, LEVEL_POINTS);
      eq(G.score, 10 * PROGRESS_POINTS + G.levelBonus.levelPoints + G.levelBonus.timePoints, 'score');
      assert(G.levelBonus.timePoints > 0, 'some time bonus');
    });

    test('lane points are not awarded twice in a level', () => {
      startPlaying(); quietRoad();
      G.player.y = G.lanes[7].y - LANE_H;          // past 3 lanes
      run(0.05);
      const s = G.score;
      G.player.y = H - START_H / 2;              // back to the sidewalk and up again
      run(0.05);
      G.player.y = G.lanes[7].y - LANE_H;
      run(0.05);
      eq(G.score, s);
    });

    test('running out of time costs a life, then a fresh attempt with a full clock', () => {
      startPlaying(); quietRoad();
      G.timeLeft = 0.3;
      run(0.4);
      eq(G.state, 'hit');
      eq(G.hitReason, 'time');
      eq(G.lives, START_LIVES - 1);
      run(1.3);
      eq(G.state, 'playing');
      assert(G.timeLeft > TIME_LIMIT - 0.2, 'clock refilled');
    });

    test('losing the last life ends the game and saves the high score', () => {
      startPlaying(); quietRoad();
      G.score = 777; G.lives = 1; G.timeLeft = 0.01;
      run(1.5);
      eq(G.state, 'gameover');
      eq(G.hiScore, 777);
      eq(G.newHighScore, true);
    });
  });

  // ================================================================
  describe('Countdown & pause', () => {
    test('a new game counts down, and the player cannot move until GO', () => {
      newGame();
      eq(G.state, 'countdown');
      hold('up');
      const y0 = G.player.y;
      run(COUNTDOWN_STEP * 3 - 0.05);
      eq(G.state, 'countdown');
      eq(G.player.y, y0, 'player stayed put');
      run(0.1);
      eq(G.state, 'playing');
    });

    test('pausing during the countdown resumes the countdown', () => {
      newGame();
      run(0.5);
      setPaused(true);
      const t = G.stateTimer;
      run(3);
      eq(G.state, 'paused');
      eq(G.stateTimer, t, 'countdown frozen');
      setPaused(false);
      eq(G.state, 'countdown');
    });

    test('P pauses and resumes a game', () => {
      startPlaying();
      dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      eq(G.state, 'paused');
      dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      eq(G.state, 'playing');
    });
  });

  // ================================================================
  describe('Movement & input', () => {
    test('walking right stops at the screen edge and faces right', () => {
      startPlaying(); quietRoad();
      hold('right');
      run(4);
      eq(G.player.x, W - PLAYER_SIZE / 2);
      near(G.player.shownAngle, Math.PI / 2, 0.05, 'facing');
    });

    test('diagonal movement is not faster than straight movement', () => {
      startPlaying(); quietRoad();
      const x0 = G.player.x, y0 = G.player.y;
      hold('up'); hold('left');
      run(0.5);
      const moved = Math.hypot(G.player.x - x0, G.player.y - y0);
      near(moved, PLAYER_SPEED * 0.5, 2, 'distance');
    });

    test('keyboard, buttons and drag are combined; releasing one keeps the others', () => {
      startPlaying();
      keyboard.up = true; drag.right = true; syncKeys();
      assert(keys.up && keys.right, 'both held');
      drag.right = false; syncKeys();
      assert(keys.up && !keys.right, 'drag released, key still held');
      buttons.down = true; syncKeys();
      assert(keys.up && keys.down, 'button adds to keyboard');
    });

    test('arrow-key events move the player', () => {
      startPlaying(); quietRoad();
      const y0 = G.player.y;
      dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      run(0.3);
      dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      assert(G.player.y < y0 - 30, 'moved up');
      assert(!keys.up, 'released');
    });
  });

  // ================================================================
  describe('Traffic', () => {
    for (const lvl of [1, 4, 7]) {
      test(`level ${lvl}: 60 s of traffic keeps every lane ordered with no overlaps`, () => {
        startPlaying({ lvl });
        run(60, i => { onSidewalk(); if (i % 12 === 0) checkTrafficInvariants(); });
      });
    }

    test('vehicles brake behind slower ones', () => {
      startPlaying(); quietRoad();
      const L = G.lanes[6];
      L.cars = [plainCar(300, { speed: 40, v: 40 }), plainCar(200, { speed: 200, v: 200 })];
      run(2, onSidewalk);
      const [slow, fast] = L.cars;
      assert(fast.v <= slow.v + 5, `follower slowed to ${fast.v.toFixed(1)}`);
      checkTrafficInvariants();
    });

    test('a reversible lane warns, empties, then flips direction', () => {
      startPlaying({ lvl: 3 });
      const L = G.lanes.find(l => l.reversible);
      assert(L, 'level 3 has a reversible lane');
      const dir0 = L.dir;
      L.draining = false;                      // traffic was pre-simulated: start from a known state
      L.switchTimer = 0.01;
      let drainingFor = 0, oldCarsLeft = null, grew = false, prevCount = Infinity;
      run(30, () => {
        onSidewalk();
        if (L.draining) {
          drainingFor += DT;
          if (L.cars.length > prevCount) grew = true;
          prevCount = L.cars.length;
        }
        if (L.dir !== dir0) {
          // Right after the flip the only vehicles allowed are new ones just entering from the other side.
          oldCarsLeft = L.cars.filter(c => (L.dir > 0 ? c.x > 0 : c.x < W)).length;
          return false;
        }
      });
      eq(L.dir, -dir0, 'flipped');
      assert(drainingFor >= MIN_WARNING - DT, `warned for ${drainingFor.toFixed(2)} s`);
      assert(!grew, 'no cars entered while draining');
      eq(oldCarsLeft, 0, 'no old traffic left when it flipped');
    });

    test('emergency vehicles are announced first and never use rail or reversible lanes', () => {
      startPlaying({ lvl: EMERGENCY_LEVEL });
      for (let n = 0; n < 5; n++) {
        G.emergencyTimer = 0.001;
        run(0.02, onSidewalk);
        const L = G.lanes.find(l => l.emergency);
        assert(L, 'a lane was announced');
        assert(!L.rail && !L.reversible, 'ordinary lane');
        // It's fast, so watch for it arriving rather than looking afterwards; ignore an earlier one
        // that may still be on its way out of the same lane.
        const earlier = new Set(L.cars.filter(c => c.kind === 'emergency'));
        let t = 0, arrivedAt = null;
        run(EMERGENCY_WARN + 2, () => {
          onSidewalk();
          t += DT;
          if (arrivedAt === null && L.cars.some(c => c.kind === 'emergency' && !earlier.has(c))) arrivedAt = t;
        });
        assert(arrivedAt !== null, 'the vehicle arrived');
        assert(arrivedAt >= EMERGENCY_WARN - 0.05, `arrived after only ${arrivedAt.toFixed(2)} s of warning`);
      }
    });
  });

  // ================================================================
  describe('Railway', () => {
    test('number of railway lanes per level', () => {
      for (const [lvl, n] of [[1, 0], [2, 0], [RAIL_LEVEL, 1], [RAIL_LEVEL + 3, 1], [RAIL_LEVEL + 4, 2]]) {
        G.level = lvl;
        buildLanes();
        eq(G.lanes.filter(l => l.rail).length, n, `level ${lvl}`);
        assert(!G.lanes.some(l => l.rail && l.reversible), 'rail lane is never reversible');
      }
    });

    test('a train always comes after the full warning, and only trains use the tracks', () => {
      startPlaying({ lvl: RAIL_LEVEL });
      const R = G.lanes.find(l => l.rail);
      let trains = 0, warnTime = null, last = R.rail.phase;   // null until we've seen a warning start
      run(40, () => {
        onSidewalk();
        const p = R.rail.phase;
        if (p === 'warning') warnTime = last === 'idle' ? DT : warnTime === null ? null : warnTime + DT;
        if (p === 'passing' && last !== 'passing') {
          trains++;
          eq(last, 'warning', 'previous phase');
          if (warnTime !== null) near(warnTime, TRAIN_WARN, 0.05, 'warning length');
          warnTime = null;
        }
        last = p;
        assert(R.cars.every(c => c.kind === 'train'), 'only trains on the tracks');
      });
      assert(trains >= 2, `saw ${trains} trains`);
    });

    test('standing on the tracks when a train arrives costs a life', () => {
      startPlaying({ lvl: RAIL_LEVEL });
      const R = G.lanes.find(l => l.rail);
      for (const l of G.lanes) if (l !== R) l.cars = [];
      R.cars = [];
      Object.assign(R.rail, { phase: 'warning', timer: 0.01 });
      G.player.x = W / 2; G.player.y = R.y;
      run(2, () => { G.timeLeft = TIME_LIMIT; return G.state === 'playing'; });
      eq(G.state, 'hit');
    });
  });

  // ================================================================
  describe('Lane changes', () => {
    test('every lane change is signalled and legal', () => {
      const moves = [];
      laneHooks.onMove = (c, from, to) => {
        moves.push({ kind: c.kind, signalled: !!c.signal && c.signal.t <= 0, from, to,
                     fromDir: from.dir, toDir: to.dir });
      };
      try {
        for (const lvl of [4, 7]) {
          startPlaying({ lvl });
          run(60, onSidewalk);
        }
      } finally {
        laneHooks.onMove = null;
      }
      assert(moves.length >= 10, `only ${moves.length} lane changes in 2 minutes`);
      for (const m of moves) {
        assert(m.signalled, `${m.kind} changed lanes without signalling`);
        eq(m.fromDir, m.toDir, 'same direction');
        eq(Math.abs(m.from.index - m.to.index), 1, 'adjacent lane');
        eq(m.from.index < LANES_PER_SIDE, m.to.index < LANES_PER_SIDE, 'same side of the median');
        assert(!m.to.rail, 'not onto the tracks');
        assert(['car', 'bike', 'truck'].includes(m.kind), `${m.kind} should not change lanes`);
      }
    });

    test('a vehicle changing lanes hits the player where it actually is', () => {
      startPlaying(); quietRoad();
      const A = G.lanes[6], B = G.lanes[7];
      const car = plainCar(W / 2, { speed: 20, v: 20 });   // moving (slowly): stopped vehicles only block
      B.cars.push(car);
      moveToLane(car, B, A);                    // starts at B's height, gliding up into A
      G.player.x = W / 2; G.player.y = A.y;
      eq(hitsCar(), null, 'not yet in the lane');
      run(1, () => { G.timeLeft = TIME_LIMIT; return G.state === 'playing'; });
      eq(G.state, 'hit');
    });

    test('motorbikes signal briefly, swerve quickly and squeeze into smaller gaps', () => {
      const bike = LANE_CHANGERS.bike, car = LANE_CHANGERS.car;
      assert(bike.signal < car.signal && bike.signal > 0, 'shorter (but real) signal');
      assert(bike.time < car.time, 'quicker swerve');
      assert(bike.gap < car.gap, 'smaller gaps');
      assert(bike.eagerness > car.eagerness && bike.every[1] < car.every[0] + 1, 'more eager');
    });

    test('motorbikes weave: they change lanes far more often than cars', () => {
      const changes = { car: 0, bike: 0 }, onRoad = { car: 0, bike: 0 };   // lane changes per vehicle-second
      laneHooks.onMove = (c, from, to) => { if (c.kind in changes) changes[c.kind]++; };
      try {
        for (const lvl of [4, 6]) {
          startPlaying({ lvl });
          run(60, () => {
            onSidewalk();
            for (const l of G.lanes) for (const c of l.cars) if (c.kind in onRoad && c.x > 0 && c.x < W) onRoad[c.kind] += DT;
          });
        }
      } finally {
        laneHooks.onMove = null;
      }
      const rate = k => changes[k] / onRoad[k];
      assert(onRoad.bike > 20, `enough motorbikes seen (${onRoad.bike.toFixed(0)} s)`);
      assert(rate('bike') > rate('car') * 2,
        `bike ${(rate('bike') * 60).toFixed(1)} vs car ${(rate('car') * 60).toFixed(1)} changes per minute on screen`);
    });

    test('trucks do change lanes — less often than cars, but regularly', () => {
      const changes = { car: 0, truck: 0 }, onRoad = { car: 0, truck: 0 };
      laneHooks.onMove = (c, from, to) => { if (c.kind in changes) changes[c.kind]++; };
      try {
        // Trucks are rare, so this needs several minutes of traffic (average is ~0.7 per minute).
        for (const lvl of [3, 4, 5, 6, 7, 8]) {
          startPlaying({ lvl });
          run(60, () => {
            onSidewalk();
            for (const l of G.lanes) for (const c of l.cars) if (c.kind in onRoad && c.x > 0 && c.x < W) onRoad[c.kind] += DT;
          });
        }
      } finally {
        laneHooks.onMove = null;
      }
      const perMin = k => changes[k] / onRoad[k] * 60;
      assert(perMin('truck') > 0.2, `trucks: ${perMin('truck').toFixed(2)} lane changes per minute on screen`);
      assert(perMin('truck') < perMin('car'), `trucks ${perMin('truck').toFixed(2)} vs cars ${perMin('car').toFixed(2)}`);
    });

    test('trucks signal longer and move more slowly than cars', () => {
      assert(LANE_CHANGERS.truck.signal > LANE_CHANGERS.car.signal, 'signal');
      assert(LANE_CHANGERS.truck.time > LANE_CHANGERS.car.time, 'glide');
      assert(!LANE_CHANGERS.emergency && !LANE_CHANGERS.train, 'ambulances and trains keep their lane');
    });
  });

  // ================================================================
  describe('Pickups', () => {
    const collect = type => {
      G.pickups = [{ type, x: G.player.x, y: G.player.y, t: 5, age: 1 }];
      run(DT);
    };

    test('coin, clock, life, slow and shield do what they say', () => {
      startPlaying(); quietRoad();
      let s = G.score; collect('coin'); eq(G.score - s, COIN_POINTS, 'coin');
      G.timeLeft = 5; collect('time'); near(G.timeLeft, 5 + TIME_PICKUP, 0.05, 'clock');
      G.lives = 3; collect('life'); eq(G.lives, 4, 'life');
      G.lives = MAX_LIVES; collect('life'); eq(G.lives, MAX_LIVES, 'life is capped');
      collect('slow'); near(G.slowTimer, SLOW_TIME, 0.05, 'slow');
      collect('shield'); eq(G.player.shield, true, 'shield');
      eq(G.pickups.length, 0, 'collected pickups disappear');
    });

    test('speed boots make the player faster for a while', () => {
      startPlaying(); quietRoad();
      collect('boots');
      const y0 = G.player.y;
      hold('up');
      run(1);
      near(y0 - G.player.y, PLAYER_SPEED * BOOTS_SPEED, 3, 'distance in 1 s with boots');
      hold('up', false);
      run(BOOTS_TIME, () => { G.timeLeft = TIME_LIMIT; });    // boots wear off while standing still
      eq(G.bootsTimer, 0);
      G.player.y = H - START_H / 2;
      const y1 = G.player.y;
      hold('up');
      run(0.5);
      near(y1 - G.player.y, PLAYER_SPEED * 0.5, 3, 'normal speed again');
    });

    test('the magnet pulls nearby coins in — only coins, only nearby', () => {
      startPlaying(); quietRoad();
      collect('magnet');
      const near1 = { type: 'coin', x: G.player.x + 100, y: G.player.y, t: 8, age: 1 };
      const far = { type: 'coin', x: G.player.x, y: G.player.y - MAGNET_RADIUS - 60, t: 8, age: 1 };
      const clock = { type: 'time', x: G.player.x - 80, y: G.player.y, t: 8, age: 1 };
      G.pickups = [near1, far, clock];
      const s0 = G.score;
      run(1, () => { G.timeLeft = 20; });
      eq(G.score - s0, COIN_POINTS, 'the nearby coin was pulled in and collected');
      assert(G.pickups.includes(far) && far.y === G.player.y - MAGNET_RADIUS - 60, 'far coin untouched');
      assert(G.pickups.includes(clock) && clock.x === G.player.x - 80, 'other pickups are not pulled');
    });

    test('as a ghost, vehicles pass through you; afterwards they hit again', () => {
      startPlaying(); quietRoad();
      collect('ghost');
      const L = G.lanes[7];
      G.player.y = L.y;
      L.cars = [plainCar(G.player.x - L.dir * 80, { speed: 200, v: 200 })];
      run(1, () => { G.timeLeft = TIME_LIMIT; });
      eq(G.state, 'playing', 'the car went straight through');
      run(GHOST_TIME, () => { G.timeLeft = TIME_LIMIT; });
      L.cars = [plainCar(G.player.x - L.dir * 80, { speed: 200, v: 200 })];
      run(1, () => { G.timeLeft = TIME_LIMIT; return G.state === 'playing'; });
      eq(G.state, 'hit', 'solid again');
    });

    test('power-ups end when a new attempt starts', () => {
      startPlaying(); quietRoad();
      for (const kind of ['boots', 'magnet', 'ghost', 'slow']) collect(kind);
      loseLife('time'); run(1.5);
      eq(G.bootsTimer + G.magnetTimer + G.ghostTimer + G.slowTimer, 0);
    });

    test('every power-up draws without errors', () => {
      startPlaying({ lvl: 3 }); quietRoad();
      for (const kind of ['boots', 'magnet', 'ghost', 'slow', 'shield']) collect(kind);
      hold('up'); run(0.3);
      draw();
    });

    test('slow traffic moves vehicles at SLOW_FACTOR speed', () => {
      startPlaying(); quietRoad();
      const L = G.lanes[2];
      L.cars = [plainCar(W / 2, { speed: 100, v: 100 })];
      G.slowTimer = 3;
      const x0 = L.cars[0].x;
      run(1, () => { G.timeLeft = TIME_LIMIT; });
      near(Math.abs(L.cars[0].x - x0), 100 * SLOW_FACTOR, 1);
    });

    test('a shield absorbs one hit, gives a grace period, then the next hit counts', () => {
      startPlaying(); quietRoad();
      G.player.shield = true;
      const L = G.lanes[7];
      G.player.x = W / 2; G.player.y = L.y;
      L.cars = [plainCar(W / 2 - L.dir * 10, { speed: 20, v: 20 })];   // creeping into the player
      run(DT);
      eq(G.state, 'playing', 'survived');
      eq(G.player.shield, false, 'shield used up');
      eq(G.lives, START_LIVES);
      run(SHIELD_GRACE - 0.1, () => { G.timeLeft = TIME_LIMIT; });
      eq(G.state, 'playing', 'safe during grace');
      run(0.3, () => { G.timeLeft = TIME_LIMIT; return G.state === 'playing'; });
      eq(G.state, 'hit', 'hit after grace');
    });

    test('at most two pickups on the road; a new level clears them', () => {
      startPlaying(); quietRoad();
      G.pickupTimer = 0;
      let most = 0;
      run(30, () => { onSidewalk(); most = Math.max(most, G.pickups.length); });
      assert(most >= 1 && most <= 2, `max on road: ${most}`);
      G.player.y = FINISH_H - 20;
      run(DT);
      eq(G.state, 'levelup');
      run(LEVELUP_TIME + 0.1);
      eq(G.pickups.length, 0);
    });
  });

  // ================================================================
  describe('Skins', () => {
    test('skins unlock at their scores, with one announcement each', () => {
      startPlaying(); quietRoad();
      G.hiScore = 0;
      eq(SKINS.filter(isUnlocked).length, 1, 'only Classic at first');
      addScore(510, 0, 0);
      eq(G.skinsUnlockedThisGame.join(), 'Kid');
      assert(G.banner && G.banner.text.includes('Kid'), 'banner');
      addScore(600, 0, 0);
      eq(G.skinsUnlockedThisGame.join(), 'Kid,Dog');
      // next game: thresholds below the saved high score are not announced again
      G.hiScore = G.score; newGame(); G.state = 'playing';
      addScore(1200, 0, 0);
      eq(G.skinsUnlockedThisGame.length, 0);
    });

    test('a locked skin cannot be worn', () => {
      G.hiScore = 0; G.score = 0;
      G.skinId = 'ninja';
      eq(currentSkin().id, 'classic');
      G.hiScore = 1000;
      chooseSkin('dog');
      eq(currentSkin().id, 'dog');
    });

    test('K opens the skin picker (pausing the game) and Esc closes it', () => {
      startPlaying();
      dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
      assert(skinPickerOpen(), 'open');
      eq(G.state, 'paused');
      dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      eq(G.state, 'paused', 'Space ignored while open');
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      assert(!skinPickerOpen(), 'closed');
    });

    test('every skin draws without errors', () => {
      const g = document.createElement('canvas').getContext('2d');
      for (const s of SKINS) for (const swing of [-5, 0, 5]) s.draw(g, swing, 1234);
    });
  });

  // ================================================================
  describe('Daily challenge', () => {
    // Snapshot of all traffic after `seconds` of a daily game at `lvl`.
    function dailyTraffic(lvl, seconds, each = onSidewalk) {
      startPlaying({ lvl, daily: true });
      run(seconds, i => { each(i); G.timeLeft = TIME_LIMIT; if (G.state !== 'playing') G.state = 'playing'; });
      return JSON.stringify(G.lanes.map(l => [l.dir, l.rail && l.rail.phase, l.reversible,
        l.cars.map(c => [c.kind, Math.round(c.x * 10), Math.round((c.dy || 0) * 10), c.color])]));
    }

    test('the same day gives exactly the same traffic', () => {
      eq(dailyTraffic(5, 30), dailyTraffic(5, 30));
    });

    test('what the player does never changes the traffic', () => {
      const still = dailyTraffic(5, 30);
      const wandering = dailyTraffic(5, 30, i => {     // walks along the median, collecting pickups
        G.player.y = MEDIAN_Y + MEDIAN_H / 2;
        G.player.x = 40 + (i % 800) * 0.5;
      });
      eq(wandering, still);
    });

    test('different levels and different days give different traffic', () => {
      const base = dailyTraffic(5, 20);
      assert(dailyTraffic(6, 20) !== base, 'levels differ');
      G.todayOverride = '2030-01-01';
      try { assert(dailyTraffic(5, 20) !== base, 'days differ'); } finally { G.todayOverride = null; }
    });

    test('normal games stay random', () => {
      newGame();
      const seed = G.testSeed;                 // the suite itself seeds every test (see runAll)
      G.testSeed = null;
      seedRandomness();
      G.testSeed = seed;
      eq(G.gameRandom, Math.random);
      eq(G.pickupRandom, Math.random);
    });

    test('game over records the result and builds the share text', () => {
      localStorage.removeItem('roadCrossingDaily');
      startPlaying({ daily: true });
      quietRoad();
      G.score = 1234; G.level = 3; G.dailyRow = ['🟩', '🟩']; G.lives = 1; G.timeLeft = 0.01;
      run(1.5);
      eq(G.state, 'gameover');
      eq(G.dailyStats.attempts, 1);
      eq(G.dailyStats.best.score, 1234);
      const text = dailyShareText();
      assert(/^Road Crossing 📅 \d{4}-\d{2}-\d{2}\nLevel 3 · 1,234 pts \(1 try\)\n🟩🟩💥/.test(text), text);
    });

    test('a daily game cannot be started over a game in progress', () => {
      startPlaying();
      startDailyFromUI();
      eq(G.mode, 'normal');
      eq(G.state, 'playing');
    });
  });

  // ================================================================
  describe('Bus', () => {
    test('bus stops on even levels from 2', () => {
      for (const lvl of [1, 2, 3, 4, 5, 6]) {
        G.level = lvl; buildLanes();
        eq(G.lanes.some(l => l.busStop), lvl % 2 === 0, `bus stop on level ${lvl}`);
      }
    });

    test('a bus stops at its stop, lets passengers off, then drives on', () => {
      startPlaying({ lvl: 2 });
      const L = G.lanes.find(l => l.busStop);
      let dwellStart = null, left = false, t = 0, walkers = 0, wasDwelling = true;
      run(60, () => {
        onSidewalk(); t += DT;
        const bus = L.cars.find(c => c.kind === 'bus');
        const dwelling = !!(bus && bus.dwell);
        const freshStop = dwelling && !wasDwelling;   // a stop that starts during the test
        wasDwelling = dwelling;
        if (freshStop && dwellStart === null) {
          dwellStart = t;
          near(bus.x, L.busStop.x, 4, 'stopped at the stop');
        }
        walkers = Math.max(walkers, G.particles.filter(p => p.kind === 'walker').length);
        if (dwellStart !== null && bus && !bus.dwell && bus.stopAt == null) { left = true; return false; }
      });
      assert(dwellStart !== null, 'a bus stopped');
      assert(walkers >= 2, 'passengers got off');
      assert(left, 'and drove on');
    });

    test('a stopped bus blocks the player but does not hurt', () => {
      startPlaying({ lvl: 2 }); quietRoad();
      const L = G.lanes[7];
      L.cars = [{ kind: 'bus', w: 120, h: 34, speed: 0, v: 0, x: W / 2, color: '#f39c12' }];
      G.player.x = W / 2; G.player.y = L.y + 40;
      hold('up');
      run(1, () => { G.timeLeft = TIME_LIMIT; });
      eq(G.state, 'playing', 'not hit');
      assert(G.player.y > L.y + 17, `stayed outside the bus (y ${G.player.y.toFixed(0)})`);
    });

    test('buses draw without errors, day and night', () => {
      for (const lvl of [2, 6]) {
        startPlaying({ lvl });
        run(30, onSidewalk);
        draw();
      }
    });
  });

  // ================================================================
  describe('Boss levels', () => {
    test('every 5th level is a boss: parade, highway, roadworks, then again', () => {
      eq([1, 2, 3, 4, 5, 6, 10, 15, 20, 25, 30].map(l => bossFor(l) || '-').join(' '),
         '- - - - parade - highway roadworks parade highway roadworks');
    });

    test('boss levels have no railway, reversible lanes or bus stop', () => {
      for (const lvl of [5, 10, 15, 20]) {
        G.level = lvl; buildLanes();
        assert(!G.lanes.some(l => l.rail || l.reversible || l.busStop), `level ${lvl}`);
      }
    });

    for (const lvl of [5, 10, 15]) {
      test(`level ${lvl} (${bossFor(lvl)}): 60 s of traffic keeps lanes ordered with no overlaps`, () => {
        startPlaying({ lvl });
        run(60, i => { onSidewalk(); if (i % 12 === 0) checkTrafficInvariants(); });
      });
    }

    test('parade: only floats in the parade lanes, slow, with walkable gaps', () => {
      startPlaying({ lvl: 5 });
      const parade = G.lanes.filter(l => l.parade);
      eq(parade.length, 2, 'two parade lanes');
      let gapsSeen = 0;
      run(60, i => {
        onSidewalk();
        if (i % 30) return;
        for (const l of parade) {
          for (const c of l.cars) {
            eq(c.kind, 'float', 'only floats');
            assert(c.v <= PARADE_SPEED + 1, `float speed ${c.v.toFixed(0)}`);
          }
          for (let j = 1; j < l.cars.length; j++) {
            const a = l.cars[j - 1], c = l.cars[j];
            const gap = (a.x - c.x) * l.dir - (a.w + c.w) / 2;
            if (gap >= PARADE_GAP_MIN - 1 && c.x > 0 && a.x < W) gapsSeen++;
          }
        }
      });
      assert(gapsSeen > 10, `walkable gaps seen on screen: ${gapsSeen}`);
    });

    test('highway: traffic is much faster than on the level before', () => {
      const avgSpeed = lvl => {
        startPlaying({ lvl });
        let sum = 0, n = 0;
        run(20, i => { onSidewalk(); if (i % 60 === 0) for (const l of G.lanes) for (const c of l.cars) if (!l.rail) { sum += c.speed; n++; } });
        return sum / n;
      };
      const before = avgSpeed(9), highway = avgSpeed(10);
      assert(highway > before * 1.3, `highway ${highway.toFixed(0)} vs ${before.toFixed(0)} px/s`);
    });

    test('roadworks: closed lanes have only the steamroller, which rolls back and forth', () => {
      startPlaying({ lvl: 15 });
      const closed = G.lanes.filter(l => l.closed);
      eq(closed.length, 4, 'four closed lanes');
      const roller = closed.flatMap(l => l.cars)[0];
      eq(roller && roller.kind, 'roller');
      let minX = Infinity, maxX = -Infinity;
      run(30, () => {
        onSidewalk();
        for (const l of closed) for (const c of l.cars) eq(c.kind, 'roller', 'nothing else in a closed lane');
        minX = Math.min(minX, roller.x); maxX = Math.max(maxX, roller.x);
      });
      assert(minX >= 30 && maxX <= W - 30, 'stays on screen');
      assert(maxX - minX > 300, `rolls across (${minX.toFixed(0)}–${maxX.toFixed(0)})`);
    });

    test('roadworks: rubble slows you down, and the steamroller hits', () => {
      startPlaying({ lvl: 15 });
      const L = G.lanes.find(l => l.closed && !l.cars.length);
      G.player.x = W / 2; G.player.y = L.y + 20;
      hold('up');
      run(0.3, () => { G.timeLeft = TIME_LIMIT; });
      near(L.y + 20 - G.player.y, PLAYER_SPEED * RUBBLE_SPEED * 0.3, 2, 'slow in the rubble');
      hold('up', false);
      const R = G.lanes.find(l => l.cars.some(c => c.kind === 'roller'));
      const roller = R.cars[0];
      G.player.y = R.y; G.player.x = roller.x + R.dir * 60;
      run(3, () => { G.timeLeft = TIME_LIMIT; return G.state === 'playing'; });
      eq(G.state, 'hit', 'run over by the steamroller');
    });

    test('a boss level pays double level points plus the boss bonus, and earns achievements', () => {
      const cross = lvl => {
        startPlaying({ lvl }); quietRoad();
        hold('up');
        run(10, () => G.state === 'playing');
        hold('up', false);
      };
      cross(5);
      eq(G.levelBonus.levelPoints, LEVEL_POINTS * 5 * 2, 'double level points');
      eq(G.levelBonus.bossPoints, BOSS_BONUS, 'boss bonus');
      assert(hasAchievement('boss') && !hasAchievement('tour'), 'boss buster');
      cross(10); cross(15);
      assert(hasAchievement('tour'), 'grand tour');
    });

    test('boss levels draw without errors, day and night', () => {
      for (const lvl of [5, 10, 15, 20, 25, 30]) {   // covers each boss in several weathers
        startPlaying({ lvl });
        run(5, onSidewalk);
        newGame(); G.level = lvl; buildLanes(); startCountdown(); draw();   // the countdown label
        startPlaying({ lvl });
        run(2, onSidewalk);
        draw();
      }
    });
  });

  // ================================================================
  describe('Weather', () => {
    test('weather schedule: clear, rain, night, then a repeating cycle', () => {
      const w = lvl => { const x = weatherFor(lvl); return (x.rain ? 'R' : '') + (x.night ? 'N' : '') || '-'; };
      eq([1, 2, 3, 4, 5, 6, 7, 8, 9].map(w).join(' '), '- R N - R N RN - R');
    });

    // A fast car approaching a stopped one; returns how far it travelled while braking, and its state.
    function brakeTest(lvl) {
      startPlaying({ lvl }); quietRoad();
      const L = G.lanes[6];
      const stopped = plainCar(400), fast = plainCar(400 - L.dir * 260, { speed: 220, v: 220 });
      L.cars = [stopped, fast];
      let maxDecel = 0, maxSkid = 0, brakingFrom = null, prevV = fast.v;
      const gap = () => (stopped.x - fast.x) * L.dir - (stopped.w + fast.w) / 2;
      run(3, () => {
        onSidewalk();
        if (gap() > 3) maxDecel = Math.max(maxDecel, (prevV - fast.v) / DT);   // brakes only, not contact
        prevV = fast.v;
        maxSkid = Math.max(maxSkid, fast.skid || 0);
        if (brakingFrom === null && fast.braking) brakingFrom = fast.x;
      });
      return { maxDecel, maxSkid, brakingDistance: Math.abs(fast.x - brakingFrom) };
    }

    test('in the rain, brakes are weaker, vehicles slide further and skid', () => {
      const dry = brakeTest(1), wet = brakeTest(2);
      assert(dry.maxDecel > RAIN_BRAKE * 1.5, `dry braking ${dry.maxDecel.toFixed(0)}`);
      assert(wet.maxDecel <= RAIN_BRAKE + 1, `wet braking ${wet.maxDecel.toFixed(0)} px/s²`);
      assert(wet.brakingDistance > dry.brakingDistance * 1.5,
        `slides further: ${wet.brakingDistance.toFixed(0)} vs ${dry.brakingDistance.toFixed(0)} px`);
      eq(dry.maxSkid, 0, 'no skidding when dry');
      assert(wet.maxSkid > 0.5, 'skids when wet');
    });

    test('skidding in the rain leaves skid marks', () => {
      G.skidMarks = [];
      brakeTest(2);
      assert(G.skidMarks.length > 0, 'skid marks drawn');
    });

    for (const lvl of [5, 6, 7]) {
      test(`level ${lvl} (${['', 'rain', 'night', 'rainy night'][2 * weatherFor(lvl).night + weatherFor(lvl).rain]}): 60 s of traffic keeps lanes ordered with no overlaps`, () => {
        startPlaying({ lvl });
        run(60, i => { onSidewalk(); if (i % 12 === 0) checkTrafficInvariants(); });
      });
    }

    test('at night, headlights light the road ahead of a vehicle', () => {
      startPlaying({ lvl: 3 }); quietRoad();
      eq(G.weather.night, true);
      const L = G.lanes[2];                         // drives left (dir -1)
      L.cars = [plainCar(300, { speed: 0.001, v: 0.001 })];
      G.player.x = W - 30; G.player.y = H - START_H / 2;
      draw();
      const brightness = (x, y) => {
        const [r, g, b] = ctx.getImageData(Math.round(x * G.renderScale), Math.round(y * G.renderScale), 1, 1).data;
        return (r + g + b) / 3;
      };
      const inBeam = brightness(300 - 30 - 60, L.y);   // 60 px in front of the car
      const behind = brightness(300 + 30 + 80, L.y);   // 80 px behind it, unlit
      assert(inBeam > behind + 25, `beam ${inBeam.toFixed(0)} vs dark ${behind.toFixed(0)}`);
    });

    test('rain, night and both draw without errors', () => {
      for (const lvl of [2, 3, 7]) {
        startPlaying({ lvl });
        run(2, onSidewalk);
        draw();
      }
    });
  });

  // ================================================================
  describe('Achievements', () => {
    // Walk straight to the finish on an empty road; returns once the level is complete.
    function crossLevel() {
      quietRoad();
      G.player.x = W / 2;
      G.player.y = H - START_H / 2;              // (leaves the clock alone)
      hold('up');
      run(10, () => G.state === 'playing');
      hold('up', false);
      eq(G.state, 'levelup');
    }

    test('completing level 1 quickly and without stopping earns three achievements', () => {
      startPlaying();
      crossLevel();
      for (const id of ['first', 'nonstop', 'speedy']) assert(hasAchievement(id), id);
      eq(G.gameAch.earned.length, 3);
    });

    test('stopping on the way, or finishing slowly, does not count', () => {
      startPlaying(); quietRoad();
      run(1, onSidewalk);                        // standing still for a second
      G.timeLeft = 15;
      crossLevel();
      assert(hasAchievement('first'), 'first');
      assert(!hasAchievement('nonstop'), 'stopped');
      assert(!hasAchievement('speedy'), 'slow');
    });

    test('rain and night levels count only without losing a life', () => {
      startPlaying({ lvl: 2 });
      loseLife('time'); run(1.5);
      crossLevel();
      assert(!hasAchievement('rain'), 'lost a life in the rain');
      startPlaying({ lvl: 3 });
      crossLevel();
      assert(hasAchievement('night'), 'night owl');
    });

    test('reaching levels 5, 6 and 10', () => {
      startPlaying({ lvl: 4 }); crossLevel();
      assert(hasAchievement('level5') && !hasAchievement('level10'), 'rush hour only');
      assert(!hasAchievement('flawless'), 'flawless needs level 6');
      startPlaying({ lvl: 5 }); crossLevel();
      assert(hasAchievement('flawless'), 'flawless');
      startPlaying({ lvl: 9 }); crossLevel();
      assert(hasAchievement('level10'), 'road warrior');
    });

    test('score milestones', () => {
      startPlaying();
      addScore(999, 0, 0);
      assert(!hasAchievement('score1k'));
      addScore(1, 0, 0);
      assert(hasAchievement('score1k') && !hasAchievement('score5k'));
      addScore(9000, 0, 0);
      assert(hasAchievement('score5k') && hasAchievement('score10k'));
    });

    test('5 coins in a game, and every kind of bonus across games', () => {
      startPlaying(); quietRoad();
      const grab = type => { G.pickups = [{ type, x: G.player.x, y: G.player.y, t: 5, age: 1 }]; run(DT); };
      for (let i = 0; i < 4; i++) grab('coin');
      assert(!hasAchievement('coins'), '4 coins');
      grab('coin');
      assert(hasAchievement('coins'), '5 coins');
      for (const kind of ['time', 'slow', 'life', 'boots', 'magnet', 'ghost']) grab(kind);
      startPlaying(); quietRoad();               // a new game: kinds collected so far are remembered
      assert(!hasAchievement('hunter'), 'shield still missing');
      grab('shield');
      assert(hasAchievement('hunter'), 'bonus hunter');
    });

    test('a shield taking a hit', () => {
      startPlaying(); quietRoad();
      G.player.shield = true;
      G.player.y = G.lanes[7].y;
      G.lanes[7].cars = [plainCar(G.player.x, { speed: 20, v: 20 })];
      run(DT);
      assert(hasAchievement('shield'));
    });

    test('crossing the tracks while the lights flash — but not if the train gets you', () => {
      startPlaying({ lvl: RAIL_LEVEL });
      const R = G.lanes.find(l => l.rail);
      for (const l of G.lanes) l.cars = [];
      Object.assign(R.rail, { phase: 'warning', timer: 99 });
      G.player.y = R.y;
      run(0.2, () => { G.timeLeft = TIME_LIMIT; });
      loseLife('time'); run(1.5);                // "hit" on the tracks, back to the sidewalk
      assert(!hasAchievement('train'), 'no credit after losing a life');
      G.player.y = R.y;
      run(0.2, () => { G.timeLeft = TIME_LIMIT; });
      G.player.y = R.y - LANE_H;                   // stepped off the far side
      run(0.1, () => { G.timeLeft = TIME_LIMIT; });
      assert(hasAchievement('train'), 'beat the train');
    });

    test('a daily game, a new skin, saving and one banner per achievement', () => {
      startPlaying({ daily: true }); quietRoad();
      G.lives = 1; G.timeLeft = 0.01;
      run(1.5);
      assert(hasAchievement('daily'), 'daily driver');
      G.hiScore = 1000;
      chooseSkin('dog');
      assert(hasAchievement('style'), 'new look');
      chooseSkin('kid');
      const saved = JSON.parse(localStorage.getItem('roadCrossingAchievements'));
      assert(saved.unlocked.daily && saved.unlocked.style, 'saved');
      const banners = [G.banner, ...G.toastQueue].filter(b => b && b.text.startsWith('🏆'));
      eq(banners.length, 2, 'one banner each, queued');
    });

    test('the achievements tab renders and counts', () => {
      unlockAchievement('first');
      openSkinPicker('achievements');
      eq(document.getElementById('achList').children.length, ACHIEVEMENTS.length);
      eq(document.getElementById('achList').querySelectorAll('.ach.done').length, 1);
      eq(achievementCount(), `1/${ACHIEVEMENTS.length}`);
      closeSkinPicker();
    });
  });

  // ================================================================
  describe('Performance safeguards', () => {
    const normalScale = () => Math.min(dpr, MAX_RENDER_SCALE);
    const restore = () => { G.liteMode = false; G.slowTime = 0; setRenderScale(normalScale()); };

    test('the canvas is never drawn at more than 2× density', () => {
      assert(G.renderScale <= MAX_RENDER_SCALE, `render scale ${G.renderScale}`);
      eq(canvas.width, W * G.renderScale);
    });

    test('a slow frame rate while playing switches to lite mode', () => {
      try {
        startPlaying();
        for (let i = 0; i < 60; i++) watchFrameRate(1 / 60);          // smooth: nothing happens
        eq(G.liteMode, false, 'stays normal at 60 fps');
        for (let i = 0; i < 30 * 4; i++) watchFrameRate(1 / 30);      // 4 s at 30 fps
        eq(G.liteMode, true, 'lite mode');
        eq(G.renderScale, 1);
        eq(canvas.width, W);
        run(1); draw();                                               // still draws fine
      } finally { restore(); }
    });

    test('pauses, menus and background tabs never trigger lite mode', () => {
      try {
        startPlaying();
        for (let i = 0; i < 20; i++) watchFrameRate(2);               // a background tab: huge gaps
        G.state = 'paused';
        for (let i = 0; i < 300; i++) watchFrameRate(1 / 20);         // slow, but not playing
        eq(G.liteMode, false);
      } finally { restore(); }
    });
  });

  // ================================================================
  describe('Menu & settings', () => {
    const key = k => dispatchEvent(new KeyboardEvent('keydown', { key: k }));
    const click = id => document.getElementById(id).click();

    test('Esc opens the menu and pauses the game; Esc again closes it and resumes', () => {
      startPlaying();
      key('Escape');
      assert(menuOpen(), 'open');
      eq(G.state, 'paused');
      key('p');
      eq(G.state, 'paused', 'other keys are ignored while the menu is open');
      key('Escape');
      assert(!menuOpen(), 'closed');
      eq(G.state, 'playing');
    });

    test('opening the menu on the title screen does not start or pause anything', () => {
      G.state = 'title';
      openMenu();
      eq(G.state, 'title');
      eq(document.getElementById('mResume').hidden, true, 'no Resume without a game');
      closeMenu();
      eq(G.state, 'title');
    });

    test('a daily challenge cannot replace a game in progress, even a paused one', () => {
      startPlaying();
      openMenu();
      eq(document.getElementById('mDaily').disabled, true, 'button disabled');
      startDailyFromUI();
      eq(G.mode, 'normal');
      closeMenu();
    });

    test('Quit to title saves the high score', () => {
      startPlaying();
      G.score = 4321;
      openMenu();
      click('mQuit');
      eq(G.state, 'title');
      eq(G.hiScore, 4321);
      assert(!menuOpen(), 'menu closed');
    });

    test('Skins and Achievements open the panel on the right tab', () => {
      G.state = 'title';
      openMenu(); click('mAch');
      assert(!menuOpen() && skinPickerOpen(), 'panel open');
      eq(G.panelTab, 'achievements');
      closeSkinPicker();
      openMenu(); click('mSkins');
      eq(G.panelTab, 'skins');
      closeSkinPicker();
    });

    test('screen shake can be turned off', () => {
      setSetting('shake', false);
      G.shakeTime = 0;
      fx.crash(100, 100, 1, '#f00');
      eq(G.shakeTime, 0, 'no shake');
      setSetting('shake', true);
      fx.crash(100, 100, 1, '#f00');
      assert(reduceMotion || G.shakeTime > 0, 'shakes again');
    });

    test('graphics: Lite forces lite mode, High leaves it and stops the watchdog', () => {
      const normal = Math.min(dpr, MAX_RENDER_SCALE);
      try {
        setSetting('graphics', 'lite');
        eq(G.liteMode, true); eq(G.renderScale, 1);
        setSetting('graphics', 'high');
        eq(G.liteMode, false); eq(G.renderScale, normal);
        startPlaying();
        for (let i = 0; i < 30 * 5; i++) watchFrameRate(1 / 30);
        eq(G.liteMode, false, 'High never drops quality');
      } finally {
        G.settings = { ...DEFAULT_SETTINGS };
        G.liteMode = false; G.slowTime = 0; setRenderScale(normal);
      }
    });

    test('settings are saved', () => {
      setSetting('volume', 0.3);
      setSetting('contrast', true);
      const saved = JSON.parse(localStorage.getItem('roadCrossingSettings'));
      eq(saved.volume, 0.3);
      eq(saved.contrast, true);
    });

    test('high-contrast turn signals draw without errors', () => {
      setSetting('contrast', true);
      startPlaying(); quietRoad();
      const c = plainCar(200);
      G.lanes[6].cars = [c];
      c.signal = { target: G.lanes[7], side: 1, t: 1 };
      draw();
    });

    test('Reset needs a second tap, then clears progress but keeps settings', () => {
      G.hiScore = 999; saveHiScore();
      unlockAchievement('first');
      setSetting('volume', 0.5);
      G.state = 'title';
      openMenu();
      click('mReset');
      eq(G.hiScore, 999, 'first tap only arms it');
      click('mReset');
      eq(G.hiScore, 0);
      eq(Object.keys(G.achievements.unlocked).length, 0, 'achievements cleared');
      eq(localStorage.getItem('roadCrossingHiScore'), null, 'saved high score erased');
      eq(JSON.parse(localStorage.getItem('roadCrossingSettings')).volume, 0.5, 'settings kept');
      closeMenu();
    });
  });

  // ================================================================
  describe('Music', () => {
    // A stand-in for the Web Audio API that records every note scheduled.
    function withFakeAudio(fn) {
      const log = [];
      const param = () => ({ value: 0, setValueAtTime(v) { this.value = v; }, exponentialRampToValueAtTime() {},
                             linearRampToValueAtTime() {}, cancelScheduledValues() {} });
      const node = extra => ({ connect(dest) { this.dest = dest; }, disconnect() {}, ...extra });
      // Music notes are wired (via a gain, maybe a filter) into music.bus; sound effects are not.
      const isMusic = n => { for (let i = 0; n && i < 4; i++, n = n.dest) if (n === music.bus) return true; return false; };
      const ctx = {
        currentTime: 0, state: 'running', suspend() {}, resume() {},
        createOscillator: () => { const o = node({ type: 'sine', frequency: param(), stop() {},
          start(t) { if (isMusic(o)) log.push({ kind: 'osc', type: o.type, freq: o.frequency.value, t }); } }); return o; },
        createGain: () => node({ gain: param() }),
        createBiquadFilter: () => node({ type: '', frequency: param(), Q: param() }),
        createBufferSource: () => { const b = node({ buffer: null, loop: false, stop() {},
          start(t) { if (isMusic(b)) log.push({ kind: 'noise', t }); } }); return b; },
        createStereoPanner: () => node({ pan: param() }),
      };
      const saved = { ctx: sound.ctx, master: sound.master, noise: sound.noise, muted: sound.muted };
      Object.assign(sound, { ctx, master: ctx.createGain(), noise: {}, muted: false });
      try {
        fn({ ctx, log, play(seconds, each) {                    // real-time frames with the audio clock running
          for (let i = 0; i < Math.round(seconds * 60); i++) {
            ctx.currentTime += 1 / 60;
            if (each) each();
            update(1 / 60);
            musicTick();
          }
        } });
      } finally {
        if (music.playing) stopMusic();
        Object.assign(sound, saved);
        Object.assign(music, { bus: null, playing: false });
      }
    }
    // Bass is a triangle wave below ~300 Hz (it jumps an octave on the half bar; the lead starts at ~330 Hz).
    const bassNotes = log => log.filter(e => e.kind === 'osc' && e.type === 'triangle' && e.freq < 300);

    test('music plays during a game, not on the title or game-over screens', () => withFakeAudio(({ play }) => {
      G.state = 'title';
      play(0.5);
      eq(music.playing, false, 'title: silent');
      startPlaying(); quietRoad();
      play(0.5, () => { G.timeLeft = TIME_LIMIT; });
      eq(music.playing, true, 'playing');
      G.lives = 1; loseLife('time');
      play(1.5);
      eq(G.state, 'gameover');
      eq(music.playing, false, 'game over: stopped');
    }));

    test('muting, or switching music off, stops it', () => withFakeAudio(({ play }) => {
      startPlaying(); quietRoad();
      play(0.3, () => { G.timeLeft = TIME_LIMIT; });
      sound.muted = true;
      play(0.1, () => { G.timeLeft = TIME_LIMIT; });
      eq(music.playing, false, 'muted');
      sound.muted = false;
      play(0.1, () => { G.timeLeft = TIME_LIMIT; });
      eq(music.playing, true, 'back on');
      setSetting('musicOn', false);
      play(0.1, () => { G.timeLeft = TIME_LIMIT; });
      eq(music.playing, false, 'music switched off');
    }));

    test('tempo: a bit faster each level, and much faster when time runs low', () => {
      startPlaying(); G.timeLeft = TIME_LIMIT;
      const l1 = musicTempo();
      G.level = 8;
      const l8 = musicTempo();
      G.timeLeft = 5;
      const urgent = musicTempo();
      assert(l8 > l1, `level 8 (${l8}) faster than level 1 (${l1})`);
      near(urgent, l8 * 1.3, 0.01, 'last seconds');
    });

    test('notes are scheduled at the tempo, ahead of time and in order', () => withFakeAudio(({ play, log }) => {
      startPlaying(); quietRoad();
      play(4, () => { G.timeLeft = TIME_LIMIT; });
      const expectedSteps = 4 * musicTempo() * 4 / 60;          // sixteenth notes in 4 s
      near(music.step, expectedSteps, expectedSteps * 0.08, 'steps scheduled');
      const times = log.filter(e => e.kind === 'osc').map(e => e.t);
      assert(times.every((t, i) => i === 0 || t >= times[i - 1] - 1e-9), 'in time order');
      const bars = music.step / 16;
      assert(bassNotes(log).length >= Math.floor(bars) * BASS_STEPS.size, `bass is playing (${bassNotes(log).length})`);
      assert(log.some(e => e.kind === 'noise'), 'drums are playing');
    }));

    test('boss levels use the darker progression; night uses a softer lead', () => withFakeAudio(({ play, log }) => {
      startPlaying({ lvl: 5 }); quietRoad();
      play(3, () => { G.timeLeft = TIME_LIMIT; });
      const bossRoots = PROGRESSIONS.boss.bass.map(m => Math.round(MIDI(m)));
      assert(bassNotes(log).some(e => bossRoots.includes(Math.round(e.freq))), 'boss bass line');
      log.length = 0;
      startPlaying({ lvl: 3 }); quietRoad();                 // a night level
      play(2, () => { G.timeLeft = TIME_LIMIT; });
      const lead = log.filter(e => e.kind === 'osc' && e.freq > 300);
      assert(lead.length > 0 && lead.every(e => e.type === 'triangle'), 'soft triangle lead at night');
    }));

    test('the music volume setting is applied and saved', () => withFakeAudio(({ play }) => {
      startPlaying(); quietRoad();
      play(0.2, () => { G.timeLeft = TIME_LIMIT; });
      setSetting('musicVolume', 0.25);
      near(music.bus.gain.value, MUSIC_LEVEL * 0.25, 1e-6);
      eq(JSON.parse(localStorage.getItem('roadCrossingSettings')).musicVolume, 0.25);
    }));
  });

  // ================================================================
  describe('First-time tips', () => {
    test('the move tip shows at the start and goes away once the player walks', () => {
      G.seenTips = new Set();
      newGame();
      run(DT);
      eq(G.activeTip && G.activeTip.id, 'move');
      run(COUNTDOWN_STEP * 3);
      eq(G.activeTip && G.activeTip.id, 'move', 'still there until the player moves');
      hold('up');
      run(1);
      assert(!G.activeTip || G.activeTip.id !== 'move', 'dismissed after walking');
    });

    test('each tip shows only once, and is remembered', () => {
      G.seenTips = new Set();
      startPlaying(); quietRoad();
      run(DT);                                   // move tip
      G.activeTip = null;
      G.pickups = [{ type: 'coin', x: 100, y: G.lanes[2].y, t: 5, age: 0 }];
      run(DT);
      eq(G.activeTip && G.activeTip.id, 'pickup');
      G.activeTip = null;
      G.pickups = [{ type: 'coin', x: 100, y: G.lanes[2].y, t: 5, age: 0 }];
      run(DT);
      eq(G.activeTip, null, 'not shown twice');
      assert(JSON.parse(localStorage.getItem('roadCrossingTips')).includes('pickup'), 'saved');
    });

    test('a hazard tip goes first and briefly slows the game', () => {
      G.seenTips = new Set(Object.keys(TIPS).filter(id => id !== 'clock' && id !== 'train'));
      startPlaying({ lvl: RAIL_LEVEL });
      G.timeLeft = TIME_LIMIT - 7;
      run(DT);
      eq(G.activeTip && G.activeTip.id, 'clock');
      eq(tipTimeScale(0), 1, 'no slow motion for an ordinary tip');
      const R = G.lanes.find(l => l.rail);
      Object.assign(R.rail, { phase: 'warning', timer: 2 });
      run(DT);
      eq(G.activeTip.id, 'train', 'hazard tip took over');
      eq(G.tipQueue[0].id, 'clock', 'ordinary tip waits');
      eq(tipTimeScale(0.1), TIP_SLOWMO, 'slow motion');
    });

    test('replaying tips shows them again', () => {
      G.seenTips = new Set(Object.keys(TIPS));
      replayTips();
      newGame();
      run(DT);
      eq(G.activeTip && G.activeTip.id, 'move');
    });

    test('tips never change the daily traffic', () => {
      const traffic = () => {
        startPlaying({ lvl: RAIL_LEVEL + 1, daily: true });
        run(25, () => { onSidewalk(); if (G.state !== 'playing') G.state = 'playing'; });
        return JSON.stringify(G.lanes.map(l => l.cars.map(c => [c.kind, Math.round(c.x * 10)])));
      };
      G.seenTips = new Set(Object.keys(TIPS));
      const without = traffic();
      G.seenTips = new Set();
      const withTips = traffic();
      eq(withTips, without);
    });
  });

  // ================================================================
  describe('Drawing', () => {
    test('every screen draws without errors', () => {
      const screens = {
        title: () => { G.state = 'title'; },
        countdown: () => newGame(),
        playing: () => startPlaying({ lvl: 7 }),
        hit: () => { startPlaying(); loseLife('time'); },
        levelup: () => { startPlaying(); quietRoad(); G.player.y = FINISH_H - 20; run(DT); },
        gameover: () => { startPlaying(); G.lives = 1; loseLife('time'); run(1.5); },
        paused: () => { startPlaying(); setPaused(true); },
        dailyover: () => { startPlaying({ daily: true }); quietRoad(); G.lives = 1; G.timeLeft = 0.01; run(1.5); },
      };
      for (const [name, setUp] of Object.entries(screens)) {
        setUp();
        try { draw(); } catch (e) { throw new AssertionError(`${name}: ${e.message}`); }
      }
    });

    test('effects, pickups, shield and slow-motion draw without errors', () => {
      startPlaying({ lvl: 7 });
      fx.crash(200, 300, 1, '#f00'); fx.confetti(); fx.sparkle(100, 100, '#0f0'); fx.shieldBreak(50, 50);
      G.pickups = Object.keys(PICKUP_TYPES).map((type, i) => ({ type, x: 60 + i * 80, y: G.lanes[i].y, t: 5, age: 1 }));
      G.player.shield = true; G.slowTimer = 2; G.invulnTimer = 1;
      G.banner = { text: 'Test banner', t: 1 };
      run(0.2);
      draw();
      for (const id of Object.keys(TIPS)) {    // every tip card, with and without a target
        G.activeTip = { id, t: 2, max: TIP_TIME, target: id === 'move' ? null : () => ({ x: 100, y: 120 }) };
        draw();
      }
    });
  });

  // ---------- Run everything ----------
  const STORAGE_PREFIX = 'roadCrossing';

  async function runAll() {
    const saved = {};                          // the player's real data, restored afterwards
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(STORAGE_PREFIX)) saved[k] = localStorage.getItem(k);
    }
    const wasMuted = sound.muted;
    sound.muted = true;
    sound.init = () => {};                     // no audio while testing

    // Every test gets its own fixed random seed (from its name), so results are repeatable: a test
    // either always passes or always fails. Daily games still use the game's own date seeding.

    const results = [];
    const started = performance.now();
    for (const t of tests) {
      G.testSeed = hashString(`${t.group}/${t.name}`);
      resetWorld();
      const t0 = performance.now();
      let error = null;
      try { t.fn(); } catch (e) { error = e; }
      results.push({ ...t, error, ms: performance.now() - t0 });
      await new Promise(r => setTimeout(r));   // keep the page responsive
    }

    G.testSeed = null;
    resetWorld();
    for (const k of Object.keys(localStorage)) if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
    for (const [k, v] of Object.entries(saved)) localStorage.setItem(k, v);
    sound.muted = wasMuted;
    report(results, performance.now() - started);
  }

  function report(results, totalMs) {
    const failed = results.filter(r => r.error);
    const summary = document.getElementById('summary');
    summary.className = failed.length ? 'fail' : 'pass';
    summary.textContent = failed.length
      ? `❌ ${failed.length} of ${results.length} tests failed`
      : `✅ All ${results.length} tests passed`;
    summary.textContent += ` (${(totalMs / 1000).toFixed(1)} s)`;
    const again = document.createElement('button');
    again.textContent = 'Run again';
    again.onclick = () => location.reload();
    summary.append(again);

    const out = document.getElementById('results');
    let currentGroup = null, list = null;
    for (const r of results) {
      if (r.group !== currentGroup) {
        currentGroup = r.group;
        const h = document.createElement('h2');
        h.textContent = r.group;
        list = document.createElement('ul');
        out.append(h, list);
      }
      const li = document.createElement('li');
      li.className = r.error ? 'fail' : 'pass';
      li.textContent = `${r.error ? '❌' : '✅'} ${r.name}`;
      const ms = document.createElement('span');
      ms.className = 'ms';
      ms.textContent = `${Math.round(r.ms)} ms`;
      li.append(ms);
      if (r.error) {
        const pre = document.createElement('pre');
        pre.textContent = r.error instanceof AssertionError ? r.error.message : (r.error.stack || String(r.error));
        li.append(pre);
        console.error(`✗ ${r.group} › ${r.name}\n`, r.error);
      }
      list.append(li);
    }
    document.title = `${failed.length ? '❌' : '✅'} ${results.length - failed.length}/${results.length} — Road Crossing tests`;
    document.body.dataset.result = failed.length ? 'fail' : 'pass';
    document.body.dataset.summary = summary.firstChild.textContent;
    console.log(summary.firstChild.textContent);
  }

  runAll();
})();
