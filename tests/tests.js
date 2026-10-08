// Road Crossing test suite. Open tests.html in a browser; results show on the page, in the console,
// in the tab title (✅/❌) and as <body data-result="pass|fail">, for headless runs.
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
    for (const l of lanes) {
      Object.assign(l, { cars: [], nextGap: NaN, reversible: false, draining: false, emergency: null, rail: null });
    }
    pickups = [];
    pickupTimer = 1e9;
    emergencyTimer = 1e9;
  }

  // A game in the 'playing' state at the given level (countdown skipped).
  function startPlaying({ lvl = 1, daily = false } = {}) {
    newGame(daily ? 'daily' : 'normal');
    if (lvl !== 1) {
      level = lvl;
      buildLanes();
      resetPickups();
      startAttempt();
    }
    state = 'playing';
    goTimer = 0;
  }

  const onSidewalk = () => { player.y = H - START_H / 2; player.x = W / 2; timeLeft = TIME_LIMIT; };

  function resetWorld() {
    releaseKeys();
    closeSkinPicker();
    mode = 'normal';
    hiScore = 0;
    score = 0;
    skinId = 'classic';
    banner = null;
    particles = [];
    popups = [];
    newGame();
    state = 'title';
  }

  const plainCar = (x, extra = {}) =>
    ({ kind: 'car', w: 60, h: 28, speed: 0.001, v: 0.001, x, color: '#f00', ...extra });

  // Front-to-back order and no overlaps in every lane.
  function checkTrafficInvariants() {
    for (const l of lanes) {
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
      run(10, () => state === 'playing');
      eq(state, 'levelup');
      eq(levelProgress, 10, 'lanes crossed');
      eq(levelBonus.levelPoints, LEVEL_POINTS);
      eq(score, 10 * PROGRESS_POINTS + levelBonus.levelPoints + levelBonus.timePoints, 'score');
      assert(levelBonus.timePoints > 0, 'some time bonus');
    });

    test('lane points are not awarded twice in a level', () => {
      startPlaying(); quietRoad();
      player.y = lanes[7].y - LANE_H;          // past 3 lanes
      run(0.05);
      const s = score;
      player.y = H - START_H / 2;              // back to the sidewalk and up again
      run(0.05);
      player.y = lanes[7].y - LANE_H;
      run(0.05);
      eq(score, s);
    });

    test('running out of time costs a life, then a fresh attempt with a full clock', () => {
      startPlaying(); quietRoad();
      timeLeft = 0.3;
      run(0.4);
      eq(state, 'hit');
      eq(hitReason, 'time');
      eq(lives, START_LIVES - 1);
      run(1.3);
      eq(state, 'playing');
      assert(timeLeft > TIME_LIMIT - 0.2, 'clock refilled');
    });

    test('losing the last life ends the game and saves the high score', () => {
      startPlaying(); quietRoad();
      score = 777; lives = 1; timeLeft = 0.01;
      run(1.5);
      eq(state, 'gameover');
      eq(hiScore, 777);
      eq(newHighScore, true);
    });
  });

  // ================================================================
  describe('Countdown & pause', () => {
    test('a new game counts down, and the player cannot move until GO', () => {
      newGame();
      eq(state, 'countdown');
      hold('up');
      const y0 = player.y;
      run(COUNTDOWN_STEP * 3 - 0.05);
      eq(state, 'countdown');
      eq(player.y, y0, 'player stayed put');
      run(0.1);
      eq(state, 'playing');
    });

    test('pausing during the countdown resumes the countdown', () => {
      newGame();
      run(0.5);
      setPaused(true);
      const t = stateTimer;
      run(3);
      eq(state, 'paused');
      eq(stateTimer, t, 'countdown frozen');
      setPaused(false);
      eq(state, 'countdown');
    });

    test('P pauses and resumes a game', () => {
      startPlaying();
      dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      eq(state, 'paused');
      dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
      eq(state, 'playing');
    });
  });

  // ================================================================
  describe('Movement & input', () => {
    test('walking right stops at the screen edge and faces right', () => {
      startPlaying(); quietRoad();
      hold('right');
      run(4);
      eq(player.x, W - PLAYER_SIZE / 2);
      near(player.shownAngle, Math.PI / 2, 0.05, 'facing');
    });

    test('diagonal movement is not faster than straight movement', () => {
      startPlaying(); quietRoad();
      const x0 = player.x, y0 = player.y;
      hold('up'); hold('left');
      run(0.5);
      const moved = Math.hypot(player.x - x0, player.y - y0);
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
      const y0 = player.y;
      dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      run(0.3);
      dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
      assert(player.y < y0 - 30, 'moved up');
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
      const L = lanes[6];
      L.cars = [plainCar(300, { speed: 40, v: 40 }), plainCar(200, { speed: 200, v: 200 })];
      run(2, onSidewalk);
      const [slow, fast] = L.cars;
      assert(fast.v <= slow.v + 5, `follower slowed to ${fast.v.toFixed(1)}`);
      checkTrafficInvariants();
    });

    test('a reversible lane warns, empties, then flips direction', () => {
      startPlaying({ lvl: 3 });
      const L = lanes.find(l => l.reversible);
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
        emergencyTimer = 0.001;
        run(0.02, onSidewalk);
        const L = lanes.find(l => l.emergency);
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
        level = lvl;
        buildLanes();
        eq(lanes.filter(l => l.rail).length, n, `level ${lvl}`);
        assert(!lanes.some(l => l.rail && l.reversible), 'rail lane is never reversible');
      }
    });

    test('a train always comes after the full warning, and only trains use the tracks', () => {
      startPlaying({ lvl: RAIL_LEVEL });
      const R = lanes.find(l => l.rail);
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
      const R = lanes.find(l => l.rail);
      for (const l of lanes) if (l !== R) l.cars = [];
      R.cars = [];
      Object.assign(R.rail, { phase: 'warning', timer: 0.01 });
      player.x = W / 2; player.y = R.y;
      run(2, () => { timeLeft = TIME_LIMIT; return state === 'playing'; });
      eq(state, 'hit');
    });
  });

  // ================================================================
  describe('Lane changes', () => {
    test('every lane change is signalled and legal', () => {
      const original = moveToLane;
      const moves = [];
      moveToLane = (c, from, to) => {
        moves.push({ kind: c.kind, signalled: !!c.signal && c.signal.t <= 0, from, to,
                     fromDir: from.dir, toDir: to.dir });
        return original(c, from, to);
      };
      try {
        for (const lvl of [4, 7]) {
          startPlaying({ lvl });
          run(60, onSidewalk);
        }
      } finally {
        moveToLane = original;
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
      const A = lanes[6], B = lanes[7];
      const car = plainCar(W / 2);
      B.cars.push(car);
      moveToLane(car, B, A);                    // starts at B's height, gliding up into A
      player.x = W / 2; player.y = A.y;
      eq(hitsCar(), null, 'not yet in the lane');
      run(1, () => { timeLeft = TIME_LIMIT; return state === 'playing'; });
      eq(state, 'hit');
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
      pickups = [{ type, x: player.x, y: player.y, t: 5, age: 1 }];
      run(DT);
    };

    test('coin, clock, life, slow and shield do what they say', () => {
      startPlaying(); quietRoad();
      let s = score; collect('coin'); eq(score - s, COIN_POINTS, 'coin');
      timeLeft = 5; collect('time'); near(timeLeft, 5 + TIME_PICKUP, 0.05, 'clock');
      lives = 3; collect('life'); eq(lives, 4, 'life');
      lives = MAX_LIVES; collect('life'); eq(lives, MAX_LIVES, 'life is capped');
      collect('slow'); near(slowTimer, SLOW_TIME, 0.05, 'slow');
      collect('shield'); eq(player.shield, true, 'shield');
      eq(pickups.length, 0, 'collected pickups disappear');
    });

    test('slow traffic moves vehicles at SLOW_FACTOR speed', () => {
      startPlaying(); quietRoad();
      const L = lanes[2];
      L.cars = [plainCar(W / 2, { speed: 100, v: 100 })];
      slowTimer = 3;
      const x0 = L.cars[0].x;
      run(1, () => { timeLeft = TIME_LIMIT; });
      near(Math.abs(L.cars[0].x - x0), 100 * SLOW_FACTOR, 1);
    });

    test('a shield absorbs one hit, gives a grace period, then the next hit counts', () => {
      startPlaying(); quietRoad();
      player.shield = true;
      const L = lanes[7];
      player.x = W / 2; player.y = L.y;
      L.cars = [plainCar(W / 2)];
      run(DT);
      eq(state, 'playing', 'survived');
      eq(player.shield, false, 'shield used up');
      eq(lives, START_LIVES);
      run(SHIELD_GRACE - 0.1, () => { timeLeft = TIME_LIMIT; });
      eq(state, 'playing', 'safe during grace');
      run(0.3, () => { timeLeft = TIME_LIMIT; return state === 'playing'; });
      eq(state, 'hit', 'hit after grace');
    });

    test('at most two pickups on the road; a new level clears them', () => {
      startPlaying(); quietRoad();
      pickupTimer = 0;
      let most = 0;
      run(30, () => { onSidewalk(); most = Math.max(most, pickups.length); });
      assert(most >= 1 && most <= 2, `max on road: ${most}`);
      player.y = FINISH_H - 20;
      run(DT);
      eq(state, 'levelup');
      run(LEVELUP_TIME + 0.1);
      eq(pickups.length, 0);
    });
  });

  // ================================================================
  describe('Skins', () => {
    test('skins unlock at their scores, with one announcement each', () => {
      startPlaying(); quietRoad();
      hiScore = 0;
      eq(SKINS.filter(isUnlocked).length, 1, 'only Classic at first');
      addScore(510, 0, 0);
      eq(skinsUnlockedThisGame.join(), 'Kid');
      assert(banner && banner.text.includes('Kid'), 'banner');
      addScore(600, 0, 0);
      eq(skinsUnlockedThisGame.join(), 'Kid,Dog');
      // next game: thresholds below the saved high score are not announced again
      hiScore = score; newGame(); state = 'playing';
      addScore(1200, 0, 0);
      eq(skinsUnlockedThisGame.length, 0);
    });

    test('a locked skin cannot be worn', () => {
      hiScore = 0; score = 0;
      skinId = 'ninja';
      eq(currentSkin().id, 'classic');
      hiScore = 1000;
      chooseSkin('dog');
      eq(currentSkin().id, 'dog');
    });

    test('K opens the skin picker (pausing the game) and Esc closes it', () => {
      startPlaying();
      dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
      assert(skinPickerOpen(), 'open');
      eq(state, 'paused');
      dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      eq(state, 'paused', 'Space ignored while open');
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
      run(seconds, i => { each(i); timeLeft = TIME_LIMIT; if (state !== 'playing') state = 'playing'; });
      return JSON.stringify(lanes.map(l => [l.dir, l.rail && l.rail.phase, l.reversible,
        l.cars.map(c => [c.kind, Math.round(c.x * 10), Math.round((c.dy || 0) * 10), c.color])]));
    }

    test('the same day gives exactly the same traffic', () => {
      eq(dailyTraffic(5, 30), dailyTraffic(5, 30));
    });

    test('what the player does never changes the traffic', () => {
      const still = dailyTraffic(5, 30);
      const wandering = dailyTraffic(5, 30, i => {     // walks along the median, collecting pickups
        player.y = MEDIAN_Y + MEDIAN_H / 2;
        player.x = 40 + (i % 800) * 0.5;
      });
      eq(wandering, still);
    });

    test('different levels and different days give different traffic', () => {
      const base = dailyTraffic(5, 20);
      assert(dailyTraffic(6, 20) !== base, 'levels differ');
      const realTodayKey = todayKey;
      todayKey = () => '2030-01-01';
      try { assert(dailyTraffic(5, 20) !== base, 'days differ'); } finally { todayKey = realTodayKey; }
    });

    test('normal games stay random', () => {
      newGame();
      originalSeedRandomness();                // the suite itself seeds every test (see runAll)
      eq(gameRandom, Math.random);
      eq(pickupRandom, Math.random);
    });

    test('game over records the result and builds the share text', () => {
      localStorage.removeItem('roadCrossingDaily');
      startPlaying({ daily: true });
      quietRoad();
      score = 1234; level = 3; dailyRow = ['🟩', '🟩']; lives = 1; timeLeft = 0.01;
      run(1.5);
      eq(state, 'gameover');
      eq(dailyStats.attempts, 1);
      eq(dailyStats.best.score, 1234);
      const text = dailyShareText();
      assert(/^Road Crossing 📅 \d{4}-\d{2}-\d{2}\nLevel 3 · 1,234 pts \(1 try\)\n🟩🟩💥/.test(text), text);
    });

    test('a daily game cannot be started over a game in progress', () => {
      startPlaying();
      startDailyFromUI();
      eq(mode, 'normal');
      eq(state, 'playing');
    });
  });

  // ================================================================
  describe('Drawing', () => {
    test('every screen draws without errors', () => {
      const screens = {
        title: () => { state = 'title'; },
        countdown: () => newGame(),
        playing: () => startPlaying({ lvl: 7 }),
        hit: () => { startPlaying(); loseLife('time'); },
        levelup: () => { startPlaying(); quietRoad(); player.y = FINISH_H - 20; run(DT); },
        gameover: () => { startPlaying(); lives = 1; loseLife('time'); run(1.5); },
        paused: () => { startPlaying(); setPaused(true); },
        dailyover: () => { startPlaying({ daily: true }); quietRoad(); lives = 1; timeLeft = 0.01; run(1.5); },
      };
      for (const [name, setUp] of Object.entries(screens)) {
        setUp();
        try { draw(); } catch (e) { throw new AssertionError(`${name}: ${e.message}`); }
      }
    });

    test('effects, pickups, shield and slow-motion draw without errors', () => {
      startPlaying({ lvl: 7 });
      fx.crash(200, 300, 1, '#f00'); fx.confetti(); fx.sparkle(100, 100, '#0f0'); fx.shieldBreak(50, 50);
      pickups = Object.keys(PICKUP_TYPES).map((type, i) => ({ type, x: 60 + i * 80, y: lanes[i].y, t: 5, age: 1 }));
      player.shield = true; slowTimer = 2; invulnTimer = 1;
      banner = { text: 'Test banner', t: 1 };
      run(0.2);
      draw();
    });
  });

  // ---------- Run everything ----------
  const STORAGE_PREFIX = 'roadCrossing';
  const originalSeedRandomness = seedRandomness;

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
    let testSeed = 0;
    seedRandomness = () => {
      if (mode === 'daily') return originalSeedRandomness();
      gameRandom = seededRandom(hashString(`${testSeed}/${level}/traffic`));
      pickupRandom = seededRandom(hashString(`${testSeed}/${level}/pickups`));
    };

    const results = [];
    const started = performance.now();
    for (const t of tests) {
      testSeed = hashString(`${t.group}/${t.name}`);
      resetWorld();
      const t0 = performance.now();
      let error = null;
      try { t.fn(); } catch (e) { error = e; }
      results.push({ ...t, error, ms: performance.now() - t0 });
      await new Promise(r => setTimeout(r));   // keep the page responsive
    }

    seedRandomness = originalSeedRandomness;
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
