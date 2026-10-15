(() => {
  // src/store.js
  var G = {};

  // src/config.js
  var W = 480;
  var H = 640;
  var FINISH_H = 64;
  var START_H = 64;
  var LANE_H = 48;
  var MEDIAN_H = 32;
  var LANES_PER_SIDE = 5;
  var MEDIAN_Y = FINISH_H + LANES_PER_SIDE * LANE_H;
  var PLAYER_SPEED = 150;
  var PLAYER_SIZE = 22;
  var START_LIVES = 3;
  var REVERSE_MIN = 6;
  var REVERSE_MAX = 12;
  var MIN_WARNING = 2;
  var FOLLOW_DIST = 60;
  var ACCEL = 150;
  var BRAKE = 400;
  var RAIN_BRAKE = 170;
  var RAIN_FOLLOW_DIST = 95;
  var RAIN_GRIP_GUESS = 1.3;
  var BIKE_LEVEL = 2;
  var RAIL_LEVEL = 3;
  var EMERGENCY_LEVEL = 4;
  var EMERGENCY_MIN = 10;
  var EMERGENCY_MAX = 18;
  var EMERGENCY_WARN = 2.5;
  var COUNTDOWN_STEP = 0.7;
  var LEVELUP_TIME = 2.2;
  var TRAIN_MIN = 6;
  var TRAIN_MAX = 12;
  var TRAIN_WARN = 2.5;
  var TRAIN_SPEED_MIN = 420;
  var TRAIN_SPEED_MAX = 560;
  var LANE_CHANGE_SIGNAL = 1;
  var LANE_CHANGE_TIME = 0.8;
  var TRUCK_SIGNAL = 1.6;
  var TRUCK_CHANGE_TIME = 1.4;
  var BIKE_SIGNAL = 0.5;
  var BIKE_CHANGE_TIME = 0.45;
  var MAX_RENDER_SCALE = 2;
  var LITE_FPS = 42;
  var BUS_MIN = 10;
  var BUS_MAX = 16;
  var BUS_DWELL = 4;
  var STOPPED_V = 8;
  var BOSS_EVERY = 5;
  var BOSS_BONUS = 500;
  var HIGHWAY_SPEED = 1.5;
  var PARADE_SPEED = 55;
  var PARADE_GAP_MIN = 110;
  var PARADE_GAP_MAX = 150;
  var ROLLER_SPEED = 40;
  var RUBBLE_SPEED = 0.55;
  var TIME_LIMIT = 30;
  var PROGRESS_POINTS = 10;
  var LEVEL_POINTS = 100;
  var TIME_POINTS = 10;
  var PICKUP_MIN = 4;
  var PICKUP_MAX = 8;
  var PICKUP_LIFE = 8;
  var COIN_POINTS = 50;
  var TIME_PICKUP = 10;
  var MAX_LIVES = 5;
  var SLOW_TIME = 5;
  var SLOW_FACTOR = 0.4;
  var BOOTS_TIME = 5;
  var BOOTS_SPEED = 1.6;
  var MAGNET_TIME = 8;
  var MAGNET_RADIUS = 140;
  var MAGNET_PULL = 260;
  var GHOST_TIME = 4;
  var SHIELD_GRACE = 1.5;
  var CAR_COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#9b59b6", "#1abc9c", "#e67e22", "#ecf0f1", "#2ecc71"];
  G.gameRandom = Math.random;
  G.pickupRandom = Math.random;
  var rand = (a, b) => a + G.gameRandom() * (b - a);
  var pickupRand = (a, b) => a + G.pickupRandom() * (b - a);
  var fxRand = (a, b) => a + Math.random() * (b - a);
  var pickFrom = (list, random = G.gameRandom) => list[Math.floor(random() * list.length)];
  function shuffled(list) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(G.gameRandom() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // src/state.js
  G.level = 1;
  G.lives = START_LIVES;
  G.score = 0;
  G.hiScore = loadHiScore();
  G.newHighScore = false;
  G.timeLeft = TIME_LIMIT;
  G.lastTick = 0;
  G.levelProgress = 0;
  G.levelBonus = null;
  G.hitReason = "car";
  G.popups = [];
  G.lanes = [];
  G.player = void 0;
  G.state = "title";
  G.stateTimer = 0;
  G.emergencyTimer = 0;
  G.stopSiren = () => {
  };
  G.goTimer = 0;
  G.pausedFrom = "playing";
  G.mode = "normal";
  var keys = { up: false, down: false, left: false, right: false };
  function loadHiScore() {
    try {
      return Number(localStorage.getItem("roadCrossingHiScore")) || 0;
    } catch {
      return 0;
    }
  }
  function saveHiScore() {
    if (G.mode === "practice") return;
    G.hiScore = Math.max(G.hiScore, G.score);
    try {
      localStorage.setItem("roadCrossingHiScore", G.hiScore);
    } catch {
    }
  }

  // src/rail.js
  var WAGON_COLORS = ["#8e5b3a", "#2c3e50", "#7f8c8d", "#16a085", "#b03a2e", "#5d6d7e"];
  var LOCO_COLORS = ["#c0392b", "#1f618d", "#d68910", "#196f3d"];
  var LOCO_LEN = 100;
  var WAGON_LEN = 90;
  var COUPLING = 4;
  function railLaneCount() {
    if (G.level < RAIL_LEVEL) return 0;
    return G.level >= RAIL_LEVEL + 4 ? 2 : 1;
  }
  function makeRailLane(lane) {
    lane.rail = { phase: "idle", timer: rand(2, 5), bell: 0 };
    lane.cars = [];
  }
  function spawnTrain(lane) {
    lane.dir = G.gameRandom() < 0.5 ? -1 : 1;
    const wagons = 3 + Math.floor(G.gameRandom() * 4);
    const w = LOCO_LEN + wagons * (WAGON_LEN + COUPLING);
    const speed = rand(TRAIN_SPEED_MIN, TRAIN_SPEED_MAX) * (1 + 0.05 * (G.level - RAIL_LEVEL));
    const train = {
      kind: "train",
      w,
      h: 34,
      speed,
      v: speed,
      braking: false,
      wagons,
      x: lane.dir > 0 ? -w / 2 : W + w / 2,
      color: pickFrom(LOCO_COLORS),
      wagonColors: Array.from({ length: wagons }, () => pickFrom(WAGON_COLORS))
    };
    lane.cars.push(train);
    return train;
  }
  function updateRail(lane, dt) {
    const r = lane.rail;
    const audible = G.state === "playing" || G.state === "countdown";
    if (r.phase === "idle") {
      if ((r.timer -= dt) <= 0) {
        r.phase = "warning";
        r.timer = TRAIN_WARN;
        r.bell = 0;
      }
    } else if (r.phase === "warning") {
      if ((r.timer -= dt) <= 0) {
        const train = spawnTrain(lane);
        r.phase = "passing";
        if (audible) {
          sfx.trainHorn(-lane.dir);
          sfx.rumble((W + train.w) / train.speed);
        }
      }
    } else if (!lane.cars.length) {
      r.phase = "idle";
      r.timer = rand(TRAIN_MIN, TRAIN_MAX);
    }
    if (r.phase !== "idle" && (r.bell -= dt) <= 0) {
      r.bell = 0.45;
      if (audible) sfx.bell();
    }
  }
  function drawRailTracks(now) {
    for (const lane of G.lanes) {
      if (!lane.rail) continue;
      const top = lane.y - LANE_H / 2;
      ctx.fillStyle = "#6b6158";
      ctx.fillRect(0, top, W, LANE_H);
      ctx.fillStyle = "#4e3626";
      for (let x = 4; x < W; x += 16) ctx.fillRect(x, top + 5, 7, LANE_H - 10);
      for (const ry of [lane.y - 11, lane.y + 11]) {
        ctx.fillStyle = "#8a8f94";
        ctx.fillRect(0, ry - 2, W, 4);
        ctx.fillStyle = "#d5d9dd";
        ctx.fillRect(0, ry - 2, W, 1.5);
      }
      ctx.fillStyle = "#e8e8e8";
      ctx.fillRect(0, top, W, 2);
      ctx.fillRect(0, top + LANE_H - 2, W, 2);
      const active = lane.rail.phase !== "idle";
      const flash = Math.floor(now / 300) % 2;
      if (active) {
        ctx.fillStyle = `rgba(255,40,40,${flash ? 0.2 : 0.08})`;
        ctx.fillRect(0, top, W, LANE_H);
      }
      drawCrossingSignal(16, lane.y, active, flash);
      drawCrossingSignal(W - 16, lane.y, active, flash);
    }
  }
  function drawCrossingSignal(x, y, active, flash) {
    ctx.save();
    ctx.translate(x, y);
    if (active) {
      ctx.fillStyle = "#1b1b1b";
      ctx.beginPath();
      ctx.roundRect(-8, -17, 16, 34, 6);
      ctx.fill();
      for (const [ly, on] of [[-8, flash], [8, !flash]]) {
        if (on) {
          const g = ctx.createRadialGradient(0, ly, 2, 0, ly, 16);
          g.addColorStop(0, "rgba(255,60,60,.7)");
          g.addColorStop(1, "rgba(255,60,60,0)");
          ctx.fillStyle = g;
          ctx.fillRect(-16, ly - 16, 32, 32);
        }
        ctx.fillStyle = on ? "#ff3b3b" : "#5a1414";
        ctx.beginPath();
        ctx.arc(0, ly, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.lineCap = "round";
      for (const [w, color] of [[5, "#b03a2e"], [3, "#ffffff"]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(8, 8);
        ctx.moveTo(-8, 8);
        ctx.lineTo(8, -8);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function drawTrain(c, y, dir) {
    const { w, h } = c;
    ctx.save();
    ctx.translate(c.x, y);
    if (dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    for (let i = 0; i < c.wagons; i++) {
      const x0 = -w / 2 + i * (WAGON_LEN + COUPLING);
      ctx.fillStyle = c.wagonColors[i];
      ctx.beginPath();
      ctx.roundRect(x0, -h / 2 + 2, WAGON_LEN, h - 4, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.12)";
      ctx.fillRect(x0 + 4, -3, WAGON_LEN - 8, 6);
      ctx.fillStyle = "#2b2b2b";
      ctx.fillRect(x0 + WAGON_LEN, -2, COUPLING, 4);
    }
    const lx = w / 2 - LOCO_LEN;
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(lx, -h / 2, LOCO_LEN, h, [3, 14, 14, 3]);
    ctx.fill();
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(w / 2 - 8, -h / 2 + 4, 3, h - 8);
    ctx.fillStyle = "#1b2733";
    ctx.beginPath();
    ctx.roundRect(w / 2 - 28, -h / 2 + 5, 10, h - 10, 3);
    ctx.fill();
    ctx.fillStyle = "#7f8c8d";
    ctx.fillRect(lx + 12, -7, 34, 14);
    ctx.fillRect(lx + 52, -5, 14, 10);
    const beam2 = ctx.createLinearGradient(w / 2, 0, w / 2 + 60, 0);
    beam2.addColorStop(0, "rgba(255,246,168,.35)");
    beam2.addColorStop(1, "rgba(255,246,168,0)");
    ctx.fillStyle = beam2;
    ctx.beginPath();
    ctx.moveTo(w / 2, -4);
    ctx.lineTo(w / 2 + 60, -16);
    ctx.lineTo(w / 2 + 60, 16);
    ctx.lineTo(w / 2, 4);
    ctx.fill();
    ctx.fillStyle = "#fff6a8";
    ctx.beginPath();
    ctx.arc(w / 2 - 2, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // src/traffic.js
  function pickGap() {
    const base = Math.max(120, 250 - G.level * 15) * bossGapMul();
    return rand(base, base * 2.2);
  }
  function pickKind() {
    const r = G.gameRandom();
    if (G.level >= BIKE_LEVEL && r < 0.15) return "bike";
    if (r > 0.8) return "truck";
    return "car";
  }
  var VEHICLES = {
    car: () => ({ w: rand(54, 70), h: 28, speed: rand(0.85, 1.15) }),
    truck: () => ({ w: rand(95, 125), h: 34, speed: 0.8 }),
    bike: () => ({ w: 30, h: 14, speed: 1.6 }),
    bus: () => ({ w: 120, h: 34, speed: 0.85 }),
    float: () => ({ w: rand(70, 110), h: 36, speed: 1 }),
    // parade boss
    emergency: () => ({ w: 74, h: 30, speed: 2.2 })
  };
  function spawnVehicle(lane, kind) {
    const spec = VEHICLES[kind]();
    const speed = kind === "emergency" ? Math.max(260, lane.speed * spec.speed) : lane.speed * spec.speed;
    const c = {
      kind,
      w: spec.w,
      h: spec.h,
      speed,
      v: speed,
      braking: false,
      x: lane.dir > 0 ? -spec.w / 2 : W + spec.w / 2,
      color: pickFrom(CAR_COLORS)
    };
    const last = lane.cars[lane.cars.length - 1];
    if (last) {
      const gap = (last.x - c.x) * lane.dir - (last.w + c.w) / 2;
      const aheadV = last.braking || last.v < STOPPED_V ? 0 : last.v;
      c.v = Math.min(c.v, Math.sqrt(aheadV * aheadV + 2 * brakeDecel() * Math.max(0, gap - 10)));
    }
    lane.cars.push(c);
    return c;
  }
  function buildLanes() {
    silenceSiren();
    seedRandomness();
    G.weather = weatherFor(G.level);
    setupWeatherScene();
    G.boss = bossFor(G.level);
    G.lanes = [];
    G.emergencyTimer = rand(EMERGENCY_MIN, EMERGENCY_MAX) / 2;
    const speedMul = (1 + 0.18 * (G.level - 1)) * bossSpeedMul();
    for (let i = 0; i < LANES_PER_SIDE * 2; i++) {
      const top = i < LANES_PER_SIDE;
      const y = top ? FINISH_H + i * LANE_H + LANE_H / 2 : MEDIAN_Y + MEDIAN_H + (i - LANES_PER_SIDE) * LANE_H + LANE_H / 2;
      G.lanes.push({
        index: i,
        y,
        dir: top ? -1 : 1,
        speed: rand(70, 150) * speedMul,
        cars: [],
        nextGap: pickGap(),
        reversible: false,
        switchTimer: 0,
        draining: false,
        drainTime: 0,
        emergency: null,
        rail: null
      });
    }
    if (G.boss) {
      setupBoss();
    } else {
      const reversibleCount = Math.min(1 + Math.floor((G.level - 1) / 2), 4);
      const railCount = railLaneCount();
      const order = shuffled(G.lanes);
      order.slice(0, railCount).forEach(makeRailLane);
      for (const lane of order.slice(railCount, railCount + reversibleCount)) {
        lane.reversible = true;
        lane.switchTimer = rand(REVERSE_MIN, REVERSE_MAX);
      }
      setupBusStop();
    }
    G.presimulating = true;
    for (const lane of G.lanes) for (let t = 0; t < 30; t += 0.05) updateLane(lane, 0.05);
    G.presimulating = false;
  }
  function moveVehicles(lane, dt) {
    for (let i = 0; i < lane.cars.length; i++) {
      const c = lane.cars[i], ahead = lane.cars[i - 1];
      if (c.kind === "roller") {
        updateRoller(c, lane, dt);
        continue;
      }
      animateLaneChange(c, dt);
      const gapTo = () => (ahead.x - c.x) * lane.dir - (ahead.w + c.w) / 2;
      let target = c.speed;
      if (ahead) {
        const gap = gapTo();
        const follow = followDist();
        if (gap < follow) target = Math.min(target, Math.max(0, ahead.v + (gap - follow) * 2));
        const careful = c.kind === "bike" || c.kind === "emergency" || ahead.braking || ahead.v < STOPPED_V;
        const grip = G.weather.rain ? RAIN_BRAKE * (careful ? 1 : RAIN_GRIP_GUESS) : BRAKE;
        target = Math.min(target, Math.sqrt(ahead.v * ahead.v + 2 * grip * Math.max(0, gap - 4)));
      }
      target = Math.min(target, stopCap(c, lane));
      c.braking = target < c.v - 5;
      updateSkid(c, target, dt);
      c.v = target > c.v ? Math.min(target, c.v + ACCEL * dt) : Math.max(target, c.v - brakeDecel() * dt);
      c.x += lane.dir * c.v * dt;
      updateBus(c, lane, dt);
      if (ahead && gapTo() < 2) {
        c.x = ahead.x - lane.dir * ((ahead.w + c.w) / 2 + 2);
        c.v = Math.min(c.v, ahead.v);
      }
    }
    lane.cars = lane.cars.filter((c) => c.x + c.w / 2 > -150 && c.x - c.w / 2 < W + 150);
  }
  function updateLane(lane, dt) {
    moveVehicles(lane, dt);
    if (lane.rail) {
      updateRail(lane, dt);
      return;
    }
    if (lane.closed) return;
    if (!G.presimulating) updateLaneChanges(lane, dt);
    if (lane.reversible) {
      if (!lane.draining) {
        lane.switchTimer -= dt;
        if (lane.switchTimer <= 0) {
          lane.draining = true;
          lane.drainTime = 0;
          if (G.state === "playing") sfx.warn();
        }
      } else {
        lane.drainTime += dt;
        if (!lane.cars.length && lane.drainTime >= MIN_WARNING) {
          lane.dir *= -1;
          lane.draining = false;
          lane.switchTimer = rand(REVERSE_MIN, REVERSE_MAX);
        }
      }
      if (lane.draining) return;
    }
    const last = lane.cars[lane.cars.length - 1];
    const room = !last ? Infinity : lane.dir > 0 ? last.x - last.w / 2 : W - (last.x + last.w / 2);
    if (lane.parade) {
      if (room >= lane.nextGap) {
        makeFloat(spawnVehicle(lane, "float"));
        lane.nextGap = nextParadeGap(lane);
      }
      return;
    }
    if (lane.emergency) {
      lane.emergency.t -= dt;
      if (lane.emergency.t <= 0 && room >= 10) {
        spawnVehicle(lane, "emergency");
        lane.emergency = null;
        lane.nextGap = pickGap();
      }
      return;
    }
    const busReady = busDue(lane, dt);
    if (room >= lane.nextGap) {
      const c = spawnVehicle(lane, busReady ? "bus" : pickKind());
      if (busReady) {
        lane.busStop.due = false;
        c.stopAt = lane.busStop.x;
        c.color = pickFrom(["#f39c12", "#2e86c1", "#c0392b"]);
      }
      lane.nextGap = pickGap();
    }
  }
  function updateTraffic(dt) {
    for (const lane of G.lanes) updateLane(lane, dt);
  }
  function dispatchEmergency() {
    G.emergencyTimer = rand(EMERGENCY_MIN, EMERGENCY_MAX);
    const candidates = G.lanes.filter((l) => !l.reversible && !l.emergency && !l.rail && !specialLane(l));
    if (!candidates.length) return;
    const lane = pickFrom(candidates);
    lane.emergency = { t: EMERGENCY_WARN };
    const crossTime = (W + 150) / Math.max(260, lane.speed * 2.2);
    G.stopSiren = sfx.siren(EMERGENCY_WARN + crossTime + 0.5, -lane.dir);
  }
  function silenceSiren() {
    G.stopSiren();
    G.stopSiren = () => {
    };
  }

  // src/tutorial.js
  var TIPS = {
    move: { icon: "\u{1F463}", text: () => touchUI() ? "Hold the arrows (or drag on the road) to walk to the green FINISH." : "Use the arrow keys or WASD to walk to the green FINISH." },
    clock: { icon: "\u23F1", text: "Beat the clock: every second left at the finish is bonus points." },
    median: { icon: "\u{1F33F}", text: "The grass strip in the middle is safe. Catch your breath here." },
    pickup: { icon: "\u{1FA99}", text: "Grab bonuses: \u{1FA99} points \xB7 \u23F1 time \xB7 \u{1F6E1} shield \xB7 \u{1F422} slow traffic \xB7 \u2764\uFE0F life \xB7 \u{1F45F} speed \xB7 \u{1F9F2} coin magnet \xB7 \u{1F47B} ghost." },
    parade: { icon: "\u{1F389}", text: "BOSS: the Parade! Floats fill the lanes by the median \u2014 slip through a gap, rest on the grass, then the next." },
    highway: { icon: "\u{1F6E3}", text: "BOSS: the Highway! Everything is fast and changes lanes a lot. Wait for a really big gap." },
    roadworks: { icon: "\u{1F6A7}", text: "BOSS: Roadworks! Closed lanes are free of traffic, but rubble slows you \u2014 and watch the steamroller." },
    rain: { icon: "\u{1F327}", text: "Rain: wet brakes slip, so cars slide when they stop. Give them extra room." },
    night: { icon: "\u{1F319}", text: "Night: watch for headlights. Street lamps light the safe spots." },
    bus: { icon: "\u{1F68C}", text: "A bus stops to let passengers off. Cars swerve around it \u2014 watch the next lane!" },
    signal: { icon: "\u{1F7E7}", text: "Blinking orange lights: that vehicle is about to change lanes.", hazard: true },
    reversal: { icon: "\u21C4", text: "Blinking arrows: this lane is about to reverse direction.", hazard: true },
    siren: { icon: "\u{1F691}", text: "Siren and flashing lights: an ambulance is coming fast in that lane.", hazard: true },
    train: { icon: "\u{1F686}", text: "Red lights and a bell: a train is coming. Stay off the tracks!", hazard: true }
  };
  var TIP_TIME = 5;
  var TIP_SLOWMO = 0.35;
  var TIP_SLOWMO_TIME = 1.4;
  G.seenTips = new Set((() => {
    try {
      return JSON.parse(localStorage.getItem("roadCrossingTips")) || [];
    } catch {
      return [];
    }
  })());
  G.activeTip = null;
  G.tipQueue = [];
  G.tipSlow = 0;
  function saveSeenTips() {
    try {
      localStorage.setItem("roadCrossingTips", JSON.stringify([...G.seenTips]));
    } catch {
    }
  }
  function showTip(id, target = null) {
    if (G.seenTips.has(id) || G.activeTip && G.activeTip.id === id || G.tipQueue.some((q) => q.id === id)) return;
    const tip = { id, t: TIP_TIME, max: TIP_TIME, target };
    if (!G.activeTip) return startTip(tip);
    if (TIPS[id].hazard && !TIPS[G.activeTip.id].hazard) {
      G.tipQueue.unshift({ ...G.activeTip, t: TIP_TIME, max: TIP_TIME });
      G.seenTips.delete(G.activeTip.id);
      return startTip(tip);
    }
    G.tipQueue.push(tip);
  }
  function startTip(tip) {
    G.activeTip = tip;
    G.seenTips.add(tip.id);
    saveSeenTips();
    if (TIPS[tip.id].hazard) G.tipSlow = TIP_SLOWMO_TIME;
  }
  function dismissTip() {
    if (G.activeTip) G.activeTip.t = Math.min(G.activeTip.t, 0.3);
  }
  function replayTips() {
    G.seenTips = /* @__PURE__ */ new Set();
    saveSeenTips();
    G.activeTip = null;
    G.tipQueue = [];
    G.banner = { text: "\u{1F4A1} Tips will show again", t: 2 };
  }
  function tipTimeScale(realDt) {
    if (G.tipSlow <= 0) return 1;
    G.tipSlow -= realDt;
    return TIP_SLOWMO;
  }
  function updateTips(dt) {
    var _a;
    if (G.activeTip && (G.activeTip.t -= dt) <= 0) {
      G.activeTip = null;
      if (G.tipQueue.length) startTip(G.tipQueue.shift());
    }
    if (G.state !== "playing" && G.state !== "countdown") {
      if (G.state !== "hit") dismissTip();
      return;
    }
    const atPlayer = () => ({ x: G.player.x, y: G.player.y });
    showTip("move", atPlayer);
    if (G.activeTip && G.activeTip.id === "move" && G.activeTip.t > 0.3) {
      (_a = G.activeTip).from ?? (_a.from = { x: G.player.x, y: G.player.y });
      G.activeTip.t = Math.max(G.activeTip.t, 1);
      if (Math.hypot(G.player.x - G.activeTip.from.x, G.player.y - G.activeTip.from.y) > 40) dismissTip();
    }
    if (G.boss) showTip(G.boss);
    if (G.weather.rain) showTip("rain");
    if (G.weather.night) showTip("night");
    if (G.state !== "playing") return;
    if (G.timeLeft < TIME_LIMIT - 6 && G.seenTips.has("move")) showTip("clock", () => ({ x: W - 30, y: H - 14 }));
    if (G.player.y > MEDIAN_Y && G.player.y < MEDIAN_Y + MEDIAN_H) showTip("median", atPlayer);
    const p = G.pickups.find((pk) => pk.age < 1);
    if (p) showTip("pickup", () => ({ x: p.x, y: p.y }));
    for (const lane of G.lanes) {
      const bus = lane.cars.find((c) => c.kind === "bus" && c.dwell);
      if (bus) showTip("bus", () => ({ x: bus.x, y: lane.y }));
      if (lane.draining) showTip("reversal", () => ({ x: W / 2, y: lane.y }));
      if (lane.emergency) showTip("siren", () => ({ x: lane.dir > 0 ? 16 : W - 16, y: lane.y }));
      if (lane.rail && lane.rail.phase === "warning") showTip("train", () => ({ x: W / 2, y: lane.y }));
      for (const c of lane.cars) {
        if (c.signal && c.x > 30 && c.x < W - 30) {
          showTip("signal", () => {
            const l = G.lanes.find((ln) => ln.cars.includes(c));
            return l ? { x: c.x, y: vehicleY(c, l) } : null;
          });
        }
      }
    }
  }
  function wrapText(text, maxWidth) {
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
      const tryLine = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(tryLine).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = tryLine;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  function drawTip(now) {
    if (!G.activeTip) return;
    const tip = TIPS[G.activeTip.id];
    const alpha = Math.max(0, Math.min(1, (G.activeTip.max - G.activeTip.t) * 4, G.activeTip.t * 3));
    const target = G.activeTip.target && G.activeTip.target();
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "600 14px system-ui, sans-serif";
    const text = typeof tip.text === "function" ? tip.text() : tip.text;
    const lines = wrapText(text, W - 90);
    const boxH = 22 + lines.length * 19;
    const top = target && target.y < FINISH_H + 140 ? H - START_H - boxH - 14 : FINISH_H + 50;
    if (target) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 160);
      ctx.strokeStyle = "#ffe36e";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(W / 2, top < target.y ? top + boxH : top);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(target.x, target.y, 22 + pulse * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(15,20,30,.92)";
    ctx.strokeStyle = "#ffe36e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(12, top, W - 24, boxH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.font = "24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(tip.icon, 40, top + boxH / 2);
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "left";
    lines.forEach((line, i) => ctx.fillText(line, 64, top + 20 + i * 19));
    ctx.restore();
  }

  // src/practice.js
  var PRACTICE_LEVELS = 20;
  var panel = document.getElementById("levels");
  var grid = document.getElementById("levelGrid");
  var levelPickerOpen = () => !panel.hidden;
  function levelFeatures(lvl) {
    const items = [];
    const boss = bossFor(lvl);
    if (boss) items.push([BOSS_ICONS[boss], `Boss: ${BOSS_NAMES[boss]}`]);
    const w = weatherFor(lvl);
    if (w.rain) items.push(["\u{1F327}", "rain"]);
    if (w.night) items.push(["\u{1F319}", "night"]);
    if (lvl >= BIKE_LEVEL) items.push(["\u{1F3CD}", "motorbikes"]);
    if (!boss) {
      const savedLevel = G.level;
      G.level = lvl;
      if (railLaneCount() > 0) items.push(["\u{1F686}", "trains"]);
      G.level = savedLevel;
      if (hasBusStop(lvl)) items.push(["\u{1F68C}", "bus stop"]);
    }
    if (lvl >= EMERGENCY_LEVEL) items.push(["\u{1F691}", "ambulances"]);
    return items;
  }
  function openLevelPicker() {
    releaseKeys();
    panel.hidden = false;
    grid.textContent = "";
    for (let lvl = 1; lvl <= PRACTICE_LEVELS; lvl++) {
      const features = levelFeatures(lvl);
      const btn = document.createElement("button");
      btn.className = "level-card" + (bossFor(lvl) ? " boss" : "");
      btn.tabIndex = -1;
      btn.title = `Level ${lvl}` + (features.length ? ": " + features.map((f) => f[1]).join(", ") : "");
      const num = document.createElement("strong");
      num.textContent = lvl;
      const icons = document.createElement("span");
      icons.textContent = features.map((f) => f[0]).join("") || "\xB7";
      btn.append(num, icons);
      btn.addEventListener("click", () => startPractice(lvl));
      grid.append(btn);
    }
  }
  function closeLevelPicker() {
    panel.hidden = true;
  }
  function startPractice(lvl) {
    closeLevelPicker();
    sound.init();
    newGame("practice", lvl);
  }
  function initPractice() {
    document.getElementById("levelsClose").addEventListener("click", closeLevelPicker);
    panel.addEventListener("click", (e) => {
      if (e.target === panel) closeLevelPicker();
    });
  }

  // src/menu.js
  var menu = document.getElementById("menu");
  var $ = (id) => document.getElementById(id);
  G.menuPausedGame = false;
  G.resetArmed = 0;
  var gameInProgress = () => ["countdown", "playing", "paused", "hit", "levelup"].includes(G.state);
  var menuOpen = () => !menu.hidden;
  function openMenu() {
    if (skinPickerOpen()) closeSkinPicker();
    G.menuPausedGame = ["countdown", "playing", "hit", "levelup"].includes(G.state);
    if (G.menuPausedGame) setPaused(true);
    releaseKeys();
    G.resetArmed = 0;
    menu.hidden = false;
    renderMenu();
  }
  function closeMenu(resume = true) {
    menu.hidden = true;
    if (resume && G.menuPausedGame && G.state === "paused") setPaused(false);
    G.menuPausedGame = false;
  }
  function toggleMenu() {
    if (menuOpen()) closeMenu();
    else openMenu();
  }
  function renderMenu() {
    if (menu.hidden) return;
    const inGame = gameInProgress();
    $("mResume").hidden = !inGame;
    $("mQuit").hidden = !inGame;
    $("mDaily").disabled = inGame;
    $("mPractice").disabled = inGame;
    $("mPractice").textContent = inGame ? "\u{1F3AF} Practice a level (after this game)" : "\u{1F3AF} Practice a level";
    $("mDaily").textContent = inGame ? "\u{1F4C5} Daily challenge (after this game)" : "\u{1F4C5} Daily challenge";
    $("mAchCount").textContent = achievementCount();
    $("mFullscreen").hidden = !fullscreenSupported;
    $("mReset").textContent = G.resetArmed > 0 ? "\u26A0\uFE0F Tap again to erase everything" : "\u{1F5D1} Reset all progress";
    $("mReset").classList.toggle("armed", G.resetArmed > 0);
    const toggle = (id, on) => {
      $(id).textContent = on ? "On" : "Off";
      $(id).classList.toggle("on", on);
    };
    toggle("sSound", !sound.muted);
    toggle("sShake", G.settings.shake);
    toggle("sMusic", G.settings.musicOn);
    $("sMusicVolume").value = Math.round(G.settings.musicVolume * 100);
    $("sMusicVolume").disabled = !G.settings.musicOn;
    toggle("sContrast", G.settings.contrast);
    $("sVolume").value = Math.round(G.settings.volume * 100);
    $("sVolume").disabled = sound.muted;
    for (const b of document.querySelectorAll("#sGraphics button")) b.classList.toggle("active", b.dataset.v === G.settings.graphics);
    $("sGraphicsNote").textContent = G.settings.graphics === "auto" ? G.liteMode ? "Auto \u2014 switched to lite mode for smoother play" : "Auto \u2014 switches to lite mode if the game runs slowly" : G.settings.graphics === "high" ? "High \u2014 always full quality" : "Lite \u2014 lower resolution, fewer effects";
  }
  function quitToTitle() {
    closeMenu(false);
    saveHiScore();
    silenceSiren();
    releaseKeys();
    G.state = "title";
    updateHud();
  }
  function resetProgress() {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("roadCrossing") && k !== "roadCrossingSettings" && k !== "roadCrossingMuted") localStorage.removeItem(k);
    }
    G.hiScore = 0;
    G.skinId = "classic";
    G.achievements = { unlocked: {}, bonusKinds: [], bosses: [], dailyDays: [] };
    G.seenTips = /* @__PURE__ */ new Set();
    G.dailyStats = null;
    G.resetArmed = 0;
    updateHud();
    toast("\u{1F5D1} Progress reset");
  }
  function menuTick(dt) {
    if (G.resetArmed > 0 && (G.resetArmed -= dt) <= 0) renderMenu();
  }
  var onClick = (id, fn) => {
    $(id).addEventListener("pointerdown", (e) => e.preventDefault());
    $(id).addEventListener("click", fn);
  };
  function initMenu() {
    onClick("menuBtn", toggleMenu);
    onClick("menuLink", toggleMenu);
    onClick("menuClose", () => closeMenu());
    menu.addEventListener("click", (e) => {
      if (e.target === menu) closeMenu();
    });
    onClick("mResume", () => closeMenu());
    onClick("mDaily", () => {
      closeMenu(false);
      startDailyFromUI();
    });
    onClick("mPractice", () => {
      closeMenu(false);
      openLevelPicker();
    });
    onClick("mSkins", () => {
      closeMenu(false);
      openSkinPicker("skins");
    });
    onClick("mAch", () => {
      closeMenu(false);
      openSkinPicker("achievements");
    });
    onClick("mTips", () => {
      replayTips();
      renderMenu();
    });
    onClick("mFullscreen", () => toggleFullscreen());
    onClick("mQuit", quitToTitle);
    onClick("mReset", () => {
      if (G.resetArmed > 0) resetProgress();
      else G.resetArmed = 3;
      renderMenu();
    });
    onClick("sSound", () => {
      sound.init();
      sound.toggleMute();
      renderMenu();
    });
    onClick("sShake", () => {
      setSetting("shake", !G.settings.shake);
      renderMenu();
    });
    onClick("sMusic", () => {
      sound.init();
      setSetting("musicOn", !G.settings.musicOn);
      renderMenu();
    });
    $("sMusicVolume").addEventListener("input", (e) => {
      setSetting("musicVolume", e.target.value / 100);
    });
    onClick("sContrast", () => {
      setSetting("contrast", !G.settings.contrast);
      renderMenu();
    });
    $("sVolume").addEventListener("input", (e) => {
      setSetting("volume", e.target.value / 100);
    });
    $("sVolume").addEventListener("change", () => {
      sound.init();
      sfx.point();
    });
    for (const b of document.querySelectorAll("#sGraphics button")) {
      b.addEventListener("click", () => {
        setSetting("graphics", b.dataset.v);
        renderMenu();
      });
    }
    applySettings();
  }

  // src/daily.js
  function seededRandom(seed) {
    return function() {
      seed = seed + 1831565813 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashString(s) {
    let h = 2166136261;
    for (const ch of s) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function todayKey() {
    if (G.todayOverride) return G.todayOverride;
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  G.dailyDate = todayKey();
  G.dailyRow = [];
  G.dailyStats = null;
  function seedRandomness() {
    if (G.mode === "daily") {
      G.gameRandom = seededRandom(hashString(`${G.dailyDate}/${G.level}/traffic`));
      G.pickupRandom = seededRandom(hashString(`${G.dailyDate}/${G.level}/pickups`));
    } else if (G.testSeed != null) {
      G.gameRandom = seededRandom(hashString(`${G.testSeed}/${G.level}/traffic`));
      G.pickupRandom = seededRandom(hashString(`${G.testSeed}/${G.level}/pickups`));
    } else {
      G.gameRandom = G.pickupRandom = Math.random;
    }
  }
  function loadDailyStats() {
    try {
      const s = JSON.parse(localStorage.getItem("roadCrossingDaily"));
      if (s && s.date === todayKey()) return s;
    } catch {
    }
    return { date: todayKey(), attempts: 0, best: null };
  }
  function startDaily() {
    G.dailyDate = todayKey();
    G.dailyRow = [];
    G.dailyStats = null;
  }
  function dailyLevelDone() {
    if (G.mode === "daily") G.dailyRow.push("\u{1F7E9}");
  }
  function finishDaily() {
    G.dailyRow.push("\u{1F4A5}");
    const s = loadDailyStats();
    if (s.date !== G.dailyDate) return;
    s.attempts++;
    s.lastScore = G.score;
    if (!s.best || G.score > s.best.score) s.best = { score: G.score, level: G.level, row: G.dailyRow.join("") };
    try {
      localStorage.setItem("roadCrossingDaily", JSON.stringify(s));
    } catch {
    }
    G.dailyStats = s;
    unlockAchievement("daily");
    achOnDailyFinished(G.dailyDate);
  }
  function dailyShareText() {
    const s = G.dailyStats || loadDailyStats();
    if (!s.best) return null;
    const tries = s.attempts === 1 ? "1 try" : `best of ${s.attempts} tries`;
    const url = location.protocol.startsWith("http") ? `
${location.origin}${location.pathname}` : "";
    return `Road Crossing \u{1F4C5} ${s.date}
Level ${s.best.level} \xB7 ${s.best.score.toLocaleString()} pts (${tries})
${s.best.row}${url}`;
  }
  async function shareDaily() {
    const text = dailyShareText();
    if (!text) return;
    const copied = { text: "\u{1F4CB} Result copied \u2014 paste it anywhere!", t: 2.5 };
    try {
      if (navigator.share && document.body.classList.contains("touch")) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      G.banner = copied;
    } catch (e) {
      if (e && e.name === "AbortError") return;
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      G.banner = ok ? copied : { text: "Couldn't copy the result", t: 2.5 };
    }
  }
  function startDailyFromUI() {
    if (gameInProgress()) {
      G.banner = { text: "\u{1F4C5} Finish this game first", t: 1.8 };
      return;
    }
    sound.init();
    newGame("daily");
  }
  var shareBtn = document.getElementById("shareBtn");
  function updateShareButton() {
    const show = G.state === "gameover" && G.mode === "daily" && !!G.dailyStats;
    if (shareBtn.hidden === show) shareBtn.hidden = !show;
  }
  var dailyBtn = document.getElementById("dailyBtn");
  function initDaily() {
    shareBtn.addEventListener("pointerdown", (e) => e.preventDefault());
    shareBtn.addEventListener("click", shareDaily);
    dailyBtn.addEventListener("pointerdown", (e) => e.preventDefault());
    dailyBtn.addEventListener("click", startDailyFromUI);
  }

  // src/input.js
  var DIRS = ["up", "down", "left", "right"];
  var keyboard = {};
  var buttons = {};
  var drag = {};
  function syncKeys() {
    for (const d of DIRS) keys[d] = !!(keyboard[d] || buttons[d] || drag[d]);
  }
  function releaseKeys() {
    for (const src of [keyboard, buttons, drag]) for (const d of DIRS) src[d] = false;
    for (const btn of document.querySelectorAll(".btn.active")) btn.classList.remove("active");
    syncKeys();
  }
  function playAgain() {
    if (G.state === "gameover" && G.mode === "practice") newGame("practice", G.practiceLevel);
    else newGame();
  }
  function startOrResume() {
    sound.init();
    if (G.state === "title" || G.state === "gameover") {
      playAgain();
      return true;
    }
    if (G.state === "paused") {
      setPaused(false);
      return true;
    }
    return false;
  }
  function canPause() {
    return G.state === "playing" || G.state === "countdown";
  }
  function setPaused(on) {
    if (on) G.pausedFrom = G.state;
    G.state = on ? "paused" : G.pausedFrom;
    if (sound.ctx) on ? sound.ctx.suspend() : sound.ctx.resume();
  }
  function pauseIfPlaying() {
    releaseKeys();
    if (canPause()) setPaused(true);
  }
  function vibrate(ms) {
    if (navigator.vibrate) navigator.vibrate(ms);
  }
  var KEY_DIRS = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right"
  };
  function setKey(e, down) {
    const dir = KEY_DIRS[e.key];
    if (!dir) return false;
    keyboard[dir] = down;
    syncKeys();
    return true;
  }
  function enableTouchUI() {
    document.body.classList.add("touch");
  }
  var noFocus = (e) => e.preventDefault();
  var root = document.documentElement;
  var requestFs = root.requestFullscreen || root.webkitRequestFullscreen;
  var fullscreenSupported = !!requestFs;
  function toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (requestFs) {
      const result = requestFs.call(root);
      if (result && result.catch) result.catch(() => {
      });
    }
  }
  G.dragPointer = null;
  function steerToPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const dx = (e.clientX - rect.left) * (W / rect.width) - G.player.x;
    const dy = (e.clientY - rect.top) * (H / rect.height) - G.player.y;
    const dead = 12;
    drag.left = dx < -dead;
    drag.right = dx > dead;
    drag.up = dy < -dead;
    drag.down = dy > dead;
    syncKeys();
  }
  function endDrag(e) {
    if (e.pointerId !== G.dragPointer) return;
    G.dragPointer = null;
    for (const d of DIRS) drag[d] = false;
    syncKeys();
  }
  function initInput() {
    addEventListener("keydown", (e) => {
      sound.init();
      if (levelPickerOpen()) {
        if (e.key === "Escape" || e.key === "l" || e.key === "L") closeLevelPicker();
        if (e.key === " ") e.preventDefault();
        return;
      }
      if (menuOpen()) {
        if (e.key === "Escape") closeMenu();
        if (e.key === " ") e.preventDefault();
        return;
      }
      if (skinPickerOpen()) {
        if (e.key === "Escape" || e.key === "k" || e.key === "K") closeSkinPicker();
        if (e.key === " ") e.preventDefault();
        return;
      }
      if (e.key === "k" || e.key === "K") {
        openSkinPicker();
        return;
      }
      if ((e.key === "c" || e.key === "C") && (G.state === "title" || G.state === "gameover")) {
        newGame("daily");
        return;
      }
      if ((e.key === "l" || e.key === "L") && (G.state === "title" || G.state === "gameover")) {
        openLevelPicker();
        return;
      }
      if ((e.key === "r" || e.key === "R") && G.state === "gameover" && G.mode === "daily") {
        shareDaily();
        return;
      }
      if (setKey(e, true) || e.key === " ") e.preventDefault();
      if (e.key === "m" || e.key === "M") sound.toggleMute();
      if ((e.key === " " || e.key === "Enter") && (G.state === "title" || G.state === "gameover")) playAgain();
      if (e.key === "Escape") {
        openMenu();
        return;
      }
      if (e.key === "p" || e.key === "P") {
        if (canPause()) setPaused(true);
        else if (G.state === "paused") setPaused(false);
      }
    });
    addEventListener("keyup", (e) => setKey(e, false));
    addEventListener("blur", pauseIfPlaying);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseIfPlaying();
    });
    if (window.matchMedia && matchMedia("(pointer: coarse)").matches) enableTouchUI();
    addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") enableTouchUI();
    }, true);
    for (const btn of document.querySelectorAll("[data-dir]")) {
      const dir = btn.dataset.dir;
      const release = () => {
        buttons[dir] = false;
        btn.classList.remove("active");
        syncKeys();
      };
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        startOrResume();
        buttons[dir] = true;
        btn.classList.add("active");
        syncKeys();
      });
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointercancel", release);
      btn.addEventListener("lostpointercapture", release);
    }
    for (const id of ["pauseBtn", "muteBtn"]) {
      document.getElementById(id).addEventListener("pointerdown", noFocus);
    }
    document.getElementById("pauseBtn").addEventListener("click", () => {
      if (canPause()) setPaused(true);
      else startOrResume();
    });
    document.getElementById("muteBtn").addEventListener("click", () => {
      sound.init();
      sound.toggleMute();
    });
    document.getElementById("controls").addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      if (startOrResume()) return;
      G.dragPointer = e.pointerId;
      canvas.setPointerCapture(e.pointerId);
      steerToPointer(e);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId === G.dragPointer) steerToPointer(e);
    });
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
  }

  // src/skins.js
  function ellipse(g, x, y, rx, ry, color) {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }
  var SKINS = [
    {
      id: "classic",
      name: "Classic",
      score: 0,
      draw(g, swing) {
        ellipse(g, -5, swing, 3.5, 6, "#2c3e50");
        ellipse(g, 5, -swing, 3.5, 6, "#2c3e50");
        ellipse(g, -11, -swing * 0.8, 3, 3, "#f0c08a");
        ellipse(g, 11, swing * 0.8, 3, 3, "#f0c08a");
        ellipse(g, 0, 0, 11, 7, "#e67e22");
        ellipse(g, 0, -1, 5.5, 5.5, "#f0c08a");
        ellipse(g, 0, 0.5, 5.5, 4.5, "#6b4226");
      }
    },
    {
      id: "kid",
      name: "Kid",
      score: 500,
      draw(g, swing) {
        g.scale(0.85, 0.85);
        ellipse(g, -4.5, swing, 3, 5.5, "#34495e");
        ellipse(g, 4.5, -swing, 3, 5.5, "#34495e");
        ellipse(g, -10, -swing * 0.8, 3, 3, "#f5cba7");
        ellipse(g, 10, swing * 0.8, 3, 3, "#f5cba7");
        ellipse(g, 0, 0, 10, 6.5, "#3498db");
        ellipse(g, 0, -6.5, 5, 2.5, "#c0392b");
        ellipse(g, 0, 0, 6, 6, "#e74c3c");
        ellipse(g, 0, 0, 1.5, 1.5, "#c0392b");
      }
    },
    {
      id: "dog",
      name: "Dog",
      score: 1e3,
      draw(g, swing, now) {
        ellipse(g, -5, -6 + swing * 0.6, 2.5, 3.5, "#6e3b1f");
        ellipse(g, 5, -6 - swing * 0.6, 2.5, 3.5, "#6e3b1f");
        ellipse(g, -5, 7 - swing * 0.6, 2.5, 3.5, "#6e3b1f");
        ellipse(g, 5, 7 + swing * 0.6, 2.5, 3.5, "#6e3b1f");
        g.save();
        g.translate(0, 10);
        g.rotate(Math.sin(now / 90) * 0.6);
        ellipse(g, 0, 4, 1.8, 5, "#8b4a24");
        g.restore();
        ellipse(g, 0, 1, 7, 11, "#a0522d");
        ellipse(g, 0, -11, 5.5, 5.5, "#a0522d");
        ellipse(g, -5.5, -10, 2.2, 4.5, "#5c2e14");
        ellipse(g, 5.5, -10, 2.2, 4.5, "#5c2e14");
        ellipse(g, 0, -15.5, 3, 2.5, "#c27a4a");
        ellipse(g, 0, -17.5, 1.5, 1, "#1b1b1b");
      }
    },
    {
      id: "granny",
      name: "Granny",
      score: 2e3,
      draw(g, swing) {
        g.strokeStyle = "#bdc3c7";
        g.lineWidth = 2;
        g.strokeRect(-10, -19, 20, 9);
        ellipse(g, -4, swing * 0.5, 3, 5, "#5d4037");
        ellipse(g, 4, -swing * 0.5, 3, 5, "#5d4037");
        ellipse(g, -9, -10, 2.5, 2.5, "#f0c08a");
        ellipse(g, 9, -10, 2.5, 2.5, "#f0c08a");
        ellipse(g, 0, 0, 11, 8, "#8e44ad");
        ellipse(g, 0, 1, 9, 5, "#a569bd");
        ellipse(g, 0, -1, 5.5, 5.5, "#ecf0f1");
        ellipse(g, 0, 4, 2.8, 2.8, "#dfe6e9");
      }
    },
    {
      id: "robot",
      name: "Robot",
      score: 3500,
      draw(g, swing, now) {
        g.fillStyle = "#566573";
        g.fillRect(-8, -4 + swing, 5, 9);
        g.fillRect(3, -4 - swing, 5, 9);
        g.fillStyle = "#7f8c8d";
        g.fillRect(-15, -3 - swing * 0.8, 4, 7);
        g.fillRect(11, -3 + swing * 0.8, 4, 7);
        g.fillStyle = "#aab7b8";
        g.beginPath();
        g.roundRect(-11, -6, 22, 12, 3);
        g.fill();
        g.fillStyle = "#839192";
        g.beginPath();
        g.roundRect(-5.5, -6.5, 11, 11, 2);
        g.fill();
        g.fillStyle = "#48c9ff";
        g.fillRect(-4, -6.5, 8, 2.5);
        ellipse(g, 0, 0, 1.8, 1.8, Math.floor(now / 400) % 2 ? "#e74c3c" : "#2ecc71");
      }
    },
    {
      id: "chicken",
      name: "Chicken",
      score: 5e3,
      draw(g, swing) {
        ellipse(g, -3.5, 2 + swing * 0.7, 2, 3.5, "#f39c12");
        ellipse(g, 3.5, 2 - swing * 0.7, 2, 3.5, "#f39c12");
        const flap = 1 + Math.abs(swing) / 10;
        ellipse(g, -8 * flap, 2, 3.5 * flap, 6, "#ecf0f1");
        ellipse(g, 8 * flap, 2, 3.5 * flap, 6, "#ecf0f1");
        ellipse(g, 0, 3, 7.5, 9, "#ffffff");
        ellipse(g, 0, 11, 4, 3, "#ecf0f1");
        ellipse(g, 0, -8, 5, 5, "#ffffff");
        ellipse(g, 0, -9, 1.6, 4, "#e74c3c");
        g.fillStyle = "#f39c12";
        g.beginPath();
        g.moveTo(-2, -12);
        g.lineTo(2, -12);
        g.lineTo(0, -16);
        g.closePath();
        g.fill();
      }
    },
    {
      id: "ninja",
      name: "Ninja",
      score: 7500,
      draw(g, swing, now) {
        g.strokeStyle = "#e74c3c";
        g.lineWidth = 2;
        g.lineCap = "round";
        for (const side of [-1, 1]) {
          g.beginPath();
          g.moveTo(side * 1.5, 4);
          g.quadraticCurveTo(side * (4 + Math.sin(now / 70 + side) * 3), 10, side * (2 + Math.sin(now / 50) * 2), 16);
          g.stroke();
        }
        ellipse(g, -5, swing, 3.5, 6, "#111");
        ellipse(g, 5, -swing, 3.5, 6, "#111");
        ellipse(g, -11, -swing * 0.8, 3, 3, "#222");
        ellipse(g, 11, swing * 0.8, 3, 3, "#222");
        ellipse(g, 0, 0, 11, 7, "#1c1c1c");
        ellipse(g, 0, -1, 5.5, 5.5, "#2b2b2b");
        g.fillStyle = "#e74c3c";
        g.fillRect(-5.5, -2.5, 11, 2);
        g.fillStyle = "#f0c08a";
        g.fillRect(-3.5, -6, 7, 1.6);
      }
    }
  ];
  G.skinId = (() => {
    try {
      return localStorage.getItem("roadCrossingSkin") || "classic";
    } catch {
      return "classic";
    }
  })();
  G.banner = null;
  G.skinsUnlockedThisGame = [];
  var bestScore = () => Math.max(G.hiScore, G.score);
  var isUnlocked = (skin) => skin.score <= bestScore();
  var currentSkin = () => SKINS.find((s) => s.id === G.skinId && isUnlocked(s)) || SKINS[0];
  function chooseSkin(id) {
    G.skinId = id;
    if (id !== "classic") unlockAchievement("style");
    try {
      localStorage.setItem("roadCrossingSkin", id);
    } catch {
    }
    renderSkinPicker();
  }
  function checkSkinUnlocks(oldScore) {
    if (G.mode === "practice") return;
    for (const skin of SKINS) {
      if (skin.score > G.hiScore && oldScore < skin.score && G.score >= skin.score) {
        G.skinsUnlockedThisGame.push(skin.name);
        toast(`\u{1F389} New skin unlocked: ${skin.name}!`);
        sfx.levelUp();
      }
    }
  }
  function drawBanner() {
    var _a;
    if (!G.banner) return;
    (_a = G.banner).max ?? (_a.max = G.banner.t);
    const t = G.banner.t;
    const slide = Math.min(1, (G.banner.max - t) * 5, t * 3);
    ctx.save();
    ctx.globalAlpha = slide;
    ctx.translate(W / 2, FINISH_H + 26 - (1 - slide) * 20);
    ctx.font = "bold 16px system-ui, sans-serif";
    const width = Math.min(W - 20, ctx.measureText(G.banner.text).width + 40);
    ctx.fillStyle = "rgba(0,0,0,.7)";
    ctx.beginPath();
    ctx.roundRect(-width / 2, -18, width, 36, 18);
    ctx.fill();
    ctx.fillStyle = "#ffe36e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(G.banner.text, 0, 1);
    ctx.restore();
  }
  var skinPanel = document.getElementById("skins");
  var skinGrid = document.getElementById("skinGrid");
  G.panelTab = "skins";
  function skinPickerOpen() {
    return !skinPanel.hidden;
  }
  function openSkinPicker(tab = "skins") {
    if (canPause()) setPaused(true);
    releaseKeys();
    G.panelTab = tab;
    skinPanel.hidden = false;
    renderSkinPicker();
  }
  function closeSkinPicker() {
    skinPanel.hidden = true;
  }
  function renderSkinPicker() {
    if (skinPanel.hidden) return;
    for (const tab of document.querySelectorAll(".tab")) tab.classList.toggle("active", tab.dataset.tab === G.panelTab);
    document.getElementById("achCount").textContent = achievementCount();
    skinGrid.hidden = G.panelTab !== "skins";
    document.getElementById("achList").hidden = G.panelTab !== "achievements";
    document.getElementById("panelNote").textContent = G.panelTab === "skins" ? "Unlock more by reaching higher scores." : "Achievements are saved in this browser.";
    if (G.panelTab === "achievements") return renderAchievements();
    skinGrid.textContent = "";
    for (const skin of SKINS) {
      const unlocked = isUnlocked(skin);
      const card = document.createElement("button");
      card.className = "skin-card" + (skin.id === currentSkin().id ? " selected" : "") + (unlocked ? "" : " locked");
      card.disabled = !unlocked;
      card.tabIndex = -1;
      const preview = document.createElement("canvas");
      preview.width = preview.height = 64 * dpr;
      preview.dataset.skin = skin.id;
      const label = document.createElement("span");
      label.textContent = unlocked ? skin.name : `\u{1F512} ${skin.score.toLocaleString()} pts`;
      card.append(preview, label);
      card.addEventListener("click", () => chooseSkin(skin.id));
      skinGrid.append(card);
    }
    drawSkinPreviews(performance.now());
  }
  function drawSkinPreviews(now) {
    if (skinPanel.hidden || skinGrid.hidden) return;
    for (const c of skinGrid.querySelectorAll("canvas")) {
      const skin = SKINS.find((s) => s.id === c.dataset.skin);
      const g = c.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, 64, 64);
      g.translate(32, 34);
      g.scale(1.6, 1.6);
      if (!isUnlocked(skin)) g.filter = "grayscale(1) brightness(0.5)";
      skin.draw(g, Math.sin(now / 130) * 5, now);
      g.filter = "none";
    }
  }
  function initSkins() {
    document.getElementById("skinsClose").addEventListener("click", closeSkinPicker);
    for (const tab of document.querySelectorAll(".tab")) {
      tab.addEventListener("click", () => {
        G.panelTab = tab.dataset.tab;
        renderSkinPicker();
      });
    }
    skinPanel.addEventListener("click", (e) => {
      if (e.target === skinPanel) closeSkinPicker();
    });
  }

  // src/player.js
  function resetPlayer() {
    G.player = {
      x: W / 2,
      y: H - START_H / 2,
      angle: 0,
      shownAngle: 0,
      walk: 0,
      lastStep: 0,
      knockVx: 0,
      spinRate: 0,
      spin: 0
    };
  }
  function honkAtPlayer() {
    for (const lane of G.lanes) {
      for (const c of lane.cars) {
        if (Math.abs(vehicleY(c, lane) - G.player.y) > LANE_H / 2) continue;
        const gap = (G.player.x - c.x) * lane.dir - c.w / 2 - PLAYER_SIZE / 2;
        if (!c.honked && !["emergency", "train", "float", "roller"].includes(c.kind) && gap > 0 && gap < 70) {
          c.honked = true;
          sfx.honk((c.x - W / 2) / (W / 2));
        }
      }
    }
  }
  function vehicleAt(x, y, moving) {
    const s = PLAYER_SIZE / 2 - 3;
    for (const lane of G.lanes) {
      if (Math.abs(lane.y - y) > LANE_H) continue;
      for (const c of lane.cars) {
        if (c.v >= STOPPED_V !== moving) continue;
        if (Math.abs(c.x - x) < c.w / 2 - 2 + s && Math.abs(vehicleY(c, lane) - y) < c.h / 2 - 2 + s) return { car: c, lane };
      }
    }
    return null;
  }
  var blockedAt = (x, y) => !!vehicleAt(x, y, false);
  function hitsCar() {
    return vehicleAt(G.player.x, G.player.y, true);
  }

  // src/achievements.js
  var ACHIEVEMENTS = [
    { id: "first", icon: "\u{1F463}", name: "First steps", desc: "Complete level 1." },
    { id: "nonstop", icon: "\u{1F3C3}", name: "Non-stop", desc: "Complete a level without stopping." },
    { id: "speedy", icon: "\u26A1", name: "Speed walker", desc: "Finish a level with 20 seconds or more left." },
    { id: "coins", icon: "\u{1FA99}", name: "Coin collector", desc: "Collect 5 coins in one game." },
    { id: "hunter", icon: "\u{1F381}", name: "Bonus hunter", desc: "Collect every kind of bonus." },
    { id: "shield", icon: "\u{1F6E1}", name: "Saved by the shield", desc: "Let a shield take a hit for you." },
    { id: "train", icon: "\u{1F686}", name: "Beat the train", desc: "Cross the tracks while the crossing lights flash." },
    { id: "rain", icon: "\u{1F327}", name: "Singing in the rain", desc: "Complete a rain level without losing a life." },
    { id: "night", icon: "\u{1F319}", name: "Night owl", desc: "Complete a night level without losing a life." },
    { id: "flawless", icon: "\u{1F48E}", name: "Flawless", desc: "Reach level 6 without losing a life." },
    { id: "level5", icon: "\u{1F6A6}", name: "Rush hour", desc: "Reach level 5." },
    { id: "level10", icon: "\u{1F6E3}", name: "Road warrior", desc: "Reach level 10." },
    { id: "score1k", icon: "\u2B50", name: "Rising star", desc: "Score 1,000 points in one game." },
    { id: "score5k", icon: "\u{1F31F}", name: "Pro crosser", desc: "Score 5,000 points in one game." },
    { id: "score10k", icon: "\u{1F3C6}", name: "Legend of the road", desc: "Score 10,000 points in one game." },
    { id: "daily", icon: "\u{1F4C5}", name: "Daily driver", desc: "Finish a daily challenge." },
    { id: "style", icon: "\u{1F455}", name: "New look", desc: "Wear a skin other than Classic." },
    { id: "boss", icon: "\u{1F451}", name: "Boss buster", desc: "Complete a boss level." },
    { id: "tour", icon: "\u{1F5FA}", name: "Grand tour", desc: "Complete all three kinds of boss level." },
    { id: "ghostTrain", icon: "\u{1F47B}", name: "Ghost train", desc: "Let a train pass right through you as a ghost." },
    { id: "magnet3", icon: "\u{1F9F2}", name: "Magnetic personality", desc: "Pull in 3 coins with a single magnet." },
    { id: "sprinter", icon: "\u{1F4A8}", name: "Sprinter", desc: "Finish a crossing within 5 seconds." },
    { id: "parade", icon: "\u{1F389}", name: "Float like a butterfly", desc: "Complete the Parade without losing a life." },
    { id: "hardHat", icon: "\u{1F9BA}", name: "Hard hat", desc: "Complete Roadworks without losing a life." },
    { id: "nightDrive", icon: "\u{1F303}", name: "Night drive", desc: "Complete the Highway at night." },
    { id: "storm", icon: "\u26C8", name: "Storm chaser", desc: "Complete a rainy night level without losing a life." },
    { id: "streak", icon: "\u{1F525}", name: "On a roll", desc: "Finish the daily challenge 3 days in a row." }
  ];
  var ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
  var SCORE_ACHIEVEMENTS = [[1e3, "score1k"], [5e3, "score5k"], [1e4, "score10k"]];
  G.achievements = (() => {
    try {
      const s = JSON.parse(localStorage.getItem("roadCrossingAchievements"));
      if (s && s.unlocked) return { unlocked: s.unlocked, bonusKinds: s.bonusKinds || [], bosses: s.bosses || [], dailyDays: s.dailyDays || [] };
    } catch {
    }
    return { unlocked: {}, bonusKinds: [], bosses: [], dailyDays: [] };
  })();
  G.gameAch = { coins: 0, livesLost: 0, earned: [] };
  G.levelAch = { livesLost: 0, still: 0, onTracks: false, playTime: 0, magnetCoins: 0 };
  G.toastQueue = [];
  function saveAchievements() {
    try {
      localStorage.setItem("roadCrossingAchievements", JSON.stringify(G.achievements));
    } catch {
    }
  }
  var hasAchievement = (id) => id in G.achievements.unlocked;
  function unlockAchievement(id) {
    if (hasAchievement(id) || G.mode === "practice") return;
    G.achievements.unlocked[id] = todayKey();
    saveAchievements();
    const a = ACHIEVEMENT_BY_ID[id];
    G.gameAch.earned.push(a.name);
    toast(`\u{1F3C6} Achievement: ${a.name}`);
    sfx.achievement();
    renderSkinPicker();
  }
  function toast(text) {
    if (G.banner) G.toastQueue.push({ text, t: 2.5 });
    else G.banner = { text, t: 2.5 };
  }
  function pumpToasts() {
    if (!G.banner && G.toastQueue.length) G.banner = G.toastQueue.shift();
  }
  function achOnNewGame() {
    G.gameAch = { coins: 0, livesLost: 0, earned: [] };
    achOnNewLevel();
  }
  function achOnNewLevel() {
    G.levelAch = { livesLost: 0, still: 0, onTracks: false, playTime: 0, magnetCoins: 0 };
  }
  function achOnLifeLost() {
    G.gameAch.livesLost++;
    G.levelAch.livesLost++;
    G.levelAch.onTracks = false;
    G.levelAch.playTime = 0;
  }
  function achOnScore() {
    for (const [points, id] of SCORE_ACHIEVEMENTS) if (G.score >= points) unlockAchievement(id);
  }
  function achOnPickup(type, p = {}) {
    if (G.mode === "practice") return;
    if (type === "coin" && ++G.gameAch.coins >= 5) unlockAchievement("coins");
    if (type === "magnet") G.levelAch.magnetCoins = 0;
    if (type === "coin" && p.pulled && ++G.levelAch.magnetCoins >= 3) unlockAchievement("magnet3");
    if (!G.achievements.bonusKinds.includes(type)) {
      G.achievements.bonusKinds.push(type);
      saveAchievements();
    }
    if (Object.keys(PICKUP_TYPES).every((t) => G.achievements.bonusKinds.includes(t))) unlockAchievement("hunter");
  }
  function achOnLevelComplete() {
    var _a;
    if (G.level === 1) unlockAchievement("first");
    if (G.levelAch.still < 0.5) unlockAchievement("nonstop");
    if (G.timeLeft >= 20) unlockAchievement("speedy");
    if (G.weather.rain && G.levelAch.livesLost === 0) unlockAchievement("rain");
    if (G.weather.night && G.levelAch.livesLost === 0) unlockAchievement("night");
    if (G.level + 1 >= 6 && G.gameAch.livesLost === 0) unlockAchievement("flawless");
    if (G.level + 1 >= 5) unlockAchievement("level5");
    if (G.level + 1 >= 10) unlockAchievement("level10");
    const clean = G.levelAch.livesLost === 0;
    if (G.levelAch.playTime <= 5) unlockAchievement("sprinter");
    if (G.boss === "parade" && clean) unlockAchievement("parade");
    if (G.boss === "roadworks" && clean) unlockAchievement("hardHat");
    if (G.boss === "highway" && G.weather.night) unlockAchievement("nightDrive");
    if (G.weather.rain && G.weather.night && clean) unlockAchievement("storm");
    if (G.boss) {
      unlockAchievement("boss");
      (_a = G.achievements).bosses ?? (_a.bosses = []);
      if (!G.achievements.bosses.includes(G.boss)) {
        G.achievements.bosses.push(G.boss);
        saveAchievements();
      }
      if (BOSSES.every((b) => G.achievements.bosses.includes(b))) unlockAchievement("tour");
    }
  }
  function achUpdate(dt) {
    G.levelAch.playTime += dt;
    if (!keys.up && !keys.down && !keys.left && !keys.right) G.levelAch.still += dt;
    if (G.ghostTimer > 0) {
      const v = vehicleAt(G.player.x, G.player.y, true);
      if (v && v.car.kind === "train") unlockAchievement("ghostTrain");
    }
    const onActiveTracks = G.lanes.some((l) => l.rail && l.rail.phase !== "idle" && Math.abs(G.player.y - l.y) < LANE_H / 2);
    if (onActiveTracks) G.levelAch.onTracks = true;
    else if (G.levelAch.onTracks && !G.lanes.some((l) => l.rail && Math.abs(G.player.y - l.y) < LANE_H / 2)) {
      unlockAchievement("train");
      G.levelAch.onTracks = false;
    }
  }
  var achList = document.getElementById("achList");
  function renderAchievements() {
    achList.textContent = "";
    for (const a of ACHIEVEMENTS) {
      const done = hasAchievement(a.id);
      const row = document.createElement("div");
      row.className = "ach" + (done ? " done" : "");
      const icon = document.createElement("span");
      icon.className = "ach-icon";
      icon.textContent = a.icon;
      const text = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = a.name;
      const desc = document.createElement("div");
      desc.className = "ach-desc";
      desc.textContent = a.desc;
      text.append(name, desc);
      const status = document.createElement("span");
      status.className = "ach-status";
      status.textContent = done ? "\u2713" : "\u{1F512}";
      status.title = done ? `Unlocked ${G.achievements.unlocked[a.id]}` : "Locked";
      row.append(icon, text, status);
      achList.append(row);
    }
  }
  function achievementCount() {
    return `${ACHIEVEMENTS.filter((a) => hasAchievement(a.id)).length}/${ACHIEVEMENTS.length}`;
  }
  function achOnDailyFinished(date) {
    var _a;
    if (G.mode === "practice") return;
    const days = (_a = G.achievements).dailyDays ?? (_a.dailyDays = []);
    if (!days.includes(date)) {
      days.push(date);
      days.sort();
      if (days.length > 30) days.splice(0, days.length - 30);
      saveAchievements();
    }
    const dayNumber = (d) => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 864e5);
    const today = dayNumber(date);
    const have = new Set(days.map(dayNumber));
    if (have.has(today - 1) && have.has(today - 2)) unlockAchievement("streak");
  }

  // src/pickups.js
  G.pickups = [];
  G.pickupTimer = 0;
  G.slowTimer = 0;
  G.invulnTimer = 0;
  G.bootsTimer = 0;
  G.magnetTimer = 0;
  G.ghostTimer = 0;
  var PICKUP_TYPES = {
    coin: { weight: 45, color: "#f1c40f" },
    // drawn as a spinning coin
    time: { weight: 20, color: "#2ecc71", icon: "\u23F1" },
    shield: { weight: 15, color: "#3498db", icon: "\u{1F6E1}" },
    slow: { weight: 12, color: "#1abc9c", icon: "\u{1F422}" },
    life: { weight: 8, color: "#e74c3c", icon: "\u2764\uFE0F" },
    boots: { weight: 12, color: "#e67e22", icon: "\u{1F45F}" },
    magnet: { weight: 8, color: "#c0392b", icon: "\u{1F9F2}" },
    ghost: { weight: 6, color: "#8e9eff", icon: "\u{1F47B}" }
  };
  function clearPowerUps() {
    G.slowTimer = G.invulnTimer = G.bootsTimer = G.magnetTimer = G.ghostTimer = 0;
  }
  function resetPickups() {
    G.pickups = [];
    G.pickupTimer = pickupRand(PICKUP_MIN, PICKUP_MAX) / 2;
    clearPowerUps();
  }
  function pickPickupType() {
    const types = Object.keys(PICKUP_TYPES).filter((t) => !(t === "life" && G.lives >= MAX_LIVES) && !(t === "shield" && G.player.shield) && !(t === "ghost" && G.ghostTimer > 0));
    let r = G.pickupRandom() * types.reduce((sum, t) => sum + PICKUP_TYPES[t].weight, 0);
    for (const t of types) {
      r -= PICKUP_TYPES[t].weight;
      if (r <= 0) return t;
    }
    return "coin";
  }
  function spawnPickup() {
    const lane = pickFrom(G.lanes, G.pickupRandom);
    G.pickups.push({ type: pickPickupType(), x: pickupRand(40, W - 40), y: lane.y, t: PICKUP_LIFE, age: 0 });
  }
  function updatePickups(dt) {
    if ((G.pickupTimer -= dt) <= 0) {
      G.pickupTimer = pickupRand(PICKUP_MIN, PICKUP_MAX);
      if (G.pickups.length < 2) spawnPickup();
    }
    for (const p of G.pickups) {
      p.t -= dt;
      p.age += dt;
      if (G.magnetTimer > 0 && p.type === "coin") {
        const d = Math.hypot(G.player.x - p.x, G.player.y - p.y);
        if (d < MAGNET_RADIUS && d > 1) {
          const step = Math.min(d, MAGNET_PULL * dt);
          p.x += (G.player.x - p.x) / d * step;
          p.y += (G.player.y - p.y) / d * step;
          p.pulled = true;
        }
      }
      if (p.t > 0 && Math.hypot(p.x - G.player.x, p.y - G.player.y) < 22) {
        collectPickup(p);
        p.t = 0;
      }
    }
    G.pickups = G.pickups.filter((p) => p.t > 0);
    G.slowTimer = Math.max(0, G.slowTimer - dt);
    G.invulnTimer = Math.max(0, G.invulnTimer - dt);
    G.bootsTimer = Math.max(0, G.bootsTimer - dt);
    G.magnetTimer = Math.max(0, G.magnetTimer - dt);
    G.ghostTimer = Math.max(0, G.ghostTimer - dt);
  }
  function collectPickup(p) {
    switch (p.type) {
      case "coin":
        addScore(COIN_POINTS, p.x, p.y);
        break;
      case "time":
        G.timeLeft = Math.min(TIME_LIMIT, G.timeLeft + TIME_PICKUP);
        G.lastTick = 0;
        addPopup(`+${TIME_PICKUP}s`, p.x, p.y);
        break;
      case "life":
        G.lives = Math.min(MAX_LIVES, G.lives + 1);
        updateHud();
        addPopup("+1 life", p.x, p.y);
        break;
      case "shield":
        G.player.shield = true;
        addPopup("Shield!", p.x, p.y);
        break;
      case "boots":
        G.bootsTimer = BOOTS_TIME;
        addPopup("Speed boots!", p.x, p.y);
        break;
      case "magnet":
        G.magnetTimer = MAGNET_TIME;
        addPopup("Coin magnet!", p.x, p.y);
        break;
      case "ghost":
        G.ghostTimer = GHOST_TIME;
        addPopup("Ghost!", p.x, p.y);
        break;
      case "slow":
        G.slowTimer = SLOW_TIME;
        addPopup("Slow traffic!", p.x, p.y);
        break;
    }
    fx.sparkle(p.x, p.y, PICKUP_TYPES[p.type].color);
    sfx.pickup(p.type);
    achOnPickup(p.type, p);
  }
  function breakShield(hit) {
    G.player.shield = false;
    G.invulnTimer = SHIELD_GRACE;
    fx.shieldBreak(G.player.x, G.player.y);
    shake(0.2, 4);
    sfx.shieldBreak();
    vibrate(80);
    hit.car.honked = true;
    unlockAchievement("shield");
  }
  function drawPickups(now) {
    for (const p of G.pickups) {
      if (p.t < 2 && Math.floor(now / 120) % 2) continue;
      const pop = Math.min(1, p.age * 5);
      const bob = Math.sin(p.age * 4) * 2;
      ctx.save();
      ctx.translate(p.x, p.y + bob);
      ctx.scale(pop, pop);
      if (p.type === "coin") {
        const spin = Math.abs(Math.cos(p.age * 4)) * 0.8 + 0.2;
        ctx.scale(spin, 1);
        ctx.fillStyle = "#b7950b";
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f7d038";
        ctx.beginPath();
        ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#b7950b";
        ctx.font = "bold 13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", 0, 1);
      } else {
        const glow = 0.6 + 0.4 * Math.sin(p.age * 6);
        ctx.fillStyle = PICKUP_TYPES[p.type].color;
        ctx.globalAlpha = 0.35 * glow;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(PICKUP_TYPES[p.type].icon, 0, 1);
      }
      ctx.restore();
    }
  }
  function drawShield(x, y, now) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 150);
    ctx.fillStyle = "rgba(52,152,219,.15)";
    ctx.strokeStyle = `rgba(120,200,255,${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 20 + pulse * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  function drawPowerUpStatus() {
    if (G.slowTimer > 0) {
      ctx.fillStyle = `rgba(60,150,255,${0.1 * Math.min(1, G.slowTimer)})`;
      ctx.fillRect(0, FINISH_H, W, H - FINISH_H - START_H);
    }
    const badges = [];
    if (G.player && G.player.shield) badges.push(["\u{1F6E1}", null]);
    if (G.slowTimer > 0) badges.push(["\u{1F422}", G.slowTimer / SLOW_TIME]);
    if (G.bootsTimer > 0) badges.push(["\u{1F45F}", G.bootsTimer / BOOTS_TIME]);
    if (G.magnetTimer > 0) badges.push(["\u{1F9F2}", G.magnetTimer / MAGNET_TIME]);
    if (G.ghostTimer > 0) badges.push(["\u{1F47B}", G.ghostTimer / GHOST_TIME]);
    badges.forEach(([icon, frac], i) => {
      const x = 22 + i * 34, y = H - START_H / 2 - 4;
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      if (frac !== null) {
        ctx.strokeStyle = "#1abc9c";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(icon, x, y + 1);
    });
  }
  function drawMagnetField(now) {
    if (G.magnetTimer <= 0 || G.state === "title") return;
    const pulse = now / 900 % 1;
    ctx.strokeStyle = `rgba(231,76,60,${0.35 * (1 - pulse) * Math.min(1, G.magnetTimer)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(G.player.x, G.player.y, 24 + pulse * (MAGNET_RADIUS - 24), 0, Math.PI * 2);
    ctx.stroke();
  }

  // src/weather.js
  G.weather = { rain: false, night: false };
  function weatherFor(lvl) {
    if (lvl < 2) return { rain: false, night: false };
    if (lvl === 2) return { rain: true, night: false };
    if (lvl === 3) return { rain: false, night: true };
    const k = (lvl - 4) % 4;
    return { rain: k === 1 || k === 3, night: k === 2 || k === 3 };
  }
  var brakeDecel = () => G.weather.rain ? RAIN_BRAKE : BRAKE;
  var followDist = () => G.weather.rain ? RAIN_FOLLOW_DIST : FOLLOW_DIST;
  function updateSkid(c, target, dt) {
    const sliding = G.weather.rain && c.v - target > RAIN_BRAKE * 0.25;
    c.skid = sliding ? Math.min(1, (c.skid || 0) + dt * 5) : Math.max(0, (c.skid || 0) - dt * 2.5);
    c.skidT = c.skid > 0 ? (c.skidT || 0) + dt : 0;
  }
  var skidYaw = (c) => c.skid ? Math.sin(c.skidT * 13) * 0.13 * c.skid : 0;
  function weatherHint(lvl) {
    const w = weatherFor(lvl);
    if (w.rain && w.night) return "\u{1F327}\u{1F319} Next: a rainy night \u2014 slippery and dark!";
    if (w.rain) return "\u{1F327} Next: rain \u2014 cars slide when they brake!";
    if (w.night) return "\u{1F319} Next: night \u2014 watch for headlights!";
    return null;
  }
  var weatherIcons = () => (G.weather.rain ? " \u{1F327}" : "") + (G.weather.night ? " \u{1F319}" : "");
  G.skidMarks = [];
  G.raindrops = [];
  G.puddles = [];
  G.squealCooldown = 0;
  G.stopRainSound = null;
  function setupWeatherScene() {
    G.skidMarks = [];
    G.raindrops = Array.from({ length: G.liteMode ? 60 : 140 }, () => ({
      x: fxRand(0, W + 80),
      y: fxRand(0, H),
      len: fxRand(10, 18),
      speed: fxRand(650, 900)
    }));
    G.puddles = Array.from({ length: 9 }, () => ({
      x: fxRand(20, W - 20),
      y: fxRand(FINISH_H + 10, H - START_H - 10),
      rx: fxRand(14, 34),
      ry: fxRand(5, 10),
      phase: fxRand(0, 6)
    }));
  }
  function updateWeather(dt) {
    for (const m of G.skidMarks) m.a -= dt / 5;
    G.skidMarks = G.skidMarks.filter((m) => m.a > 0);
    if (G.weather.rain) {
      for (const d of G.raindrops) {
        d.y += d.speed * dt;
        d.x -= d.speed * 0.12 * dt;
        if (d.y > H) {
          d.y -= H + 20;
          d.x = fxRand(0, W + 80);
        }
      }
    }
    G.squealCooldown = Math.max(0, G.squealCooldown - dt);
    const wantRain = G.weather.rain && ["countdown", "playing", "hit", "levelup"].includes(G.state);
    if (wantRain && !G.stopRainSound) G.stopRainSound = sfx.rainLoop();
    if (!wantRain && G.stopRainSound) {
      G.stopRainSound();
      G.stopRainSound = null;
    }
  }
  function emitWeatherEffects(dt) {
    if (!G.weather.rain) return;
    if (fxRand(0, 1) < dt * (G.liteMode ? 10 : 30)) {
      addParticle({
        kind: "ring",
        x: fxRand(0, W),
        y: fxRand(FINISH_H, H - START_H),
        life: 0.35,
        size: 1,
        grow: 16,
        color: "#c9d6e6",
        alpha: 0.5,
        under: true
      });
    }
    for (const lane of G.lanes) {
      for (const c of lane.cars) {
        if (c.kind === "train" || c.x < -40 || c.x > W + 40) continue;
        const y = vehicleY(c, lane), tailX = c.x - lane.dir * c.w / 2;
        c.spray = (c.spray ?? fxRand(0, 0.1)) - dt;
        if (c.v > 40 && c.spray <= 0 && !G.liteMode) {
          c.spray = fxRand(0.05, 0.12);
          addParticle({
            kind: "smoke",
            x: tailX,
            y: y + fxRand(-c.h / 3, c.h / 3),
            vx: -lane.dir * fxRand(20, 50),
            vy: fxRand(-10, 10),
            life: 0.5,
            size: 3,
            grow: 16,
            color: "#d8e2ee",
            alpha: 0.13,
            drag: 2,
            under: true
          });
        }
        if (c.skid > 0.25) {
          for (const side of [-1, 1]) {
            const ty = y + side * (c.h / 2 - 4);
            const key = side < 0 ? "markA" : "markB";
            const prev = c[key];
            if (prev && Math.abs(prev.x - tailX) < 30) {
              G.skidMarks.push({ x1: prev.x, y1: prev.y, x2: tailX, y2: ty, a: 0.6 * c.skid });
            }
            c[key] = { x: tailX, y: ty };
          }
          if (c.skid > 0.5 && !c.squealed && G.squealCooldown <= 0 && G.state === "playing") {
            sfx.squeal((c.x - W / 2) / (W / 2));
            G.squealCooldown = 0.7;
            c.squealed = true;
          }
        } else {
          c.markA = c.markB = null;
          if (c.skid === 0) c.squealed = false;
        }
      }
    }
    if (G.skidMarks.length > 400) G.skidMarks.splice(0, G.skidMarks.length - 400);
  }
  function drawWetRoad(now) {
    if (G.weather.rain) {
      ctx.fillStyle = "rgba(20,35,60,.25)";
      ctx.fillRect(0, FINISH_H, W, H - FINISH_H - START_H);
      for (const p of G.puddles) {
        ctx.fillStyle = `rgba(170,195,225,${0.12 + 0.06 * Math.sin(now / 400 + p.phase)})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    for (const m of G.skidMarks) {
      ctx.strokeStyle = `rgba(10,10,10,${m.a})`;
      ctx.beginPath();
      ctx.moveTo(m.x1, m.y1);
      ctx.lineTo(m.x2, m.y2);
      ctx.stroke();
    }
  }
  function drawRain() {
    if (!G.weather.rain) return;
    ctx.strokeStyle = "rgba(200,215,235,.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const d of G.raindrops) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + d.len * 0.12, d.y - d.len);
    }
    ctx.stroke();
  }
  G.nightCanvas = null;
  G.nctx = null;
  var LAMPS = [];
  for (const x of [60, 240, 420]) {
    LAMPS.push({ x, y: MEDIAN_Y + MEDIAN_H / 2 }, { x, y: H - START_H + 14 }, { x, y: FINISH_H - 18 });
  }
  var BEAM_LENGTH = { car: 150, bike: 120, truck: 170, bus: 160, emergency: 170, train: 230 };
  var NIGHT_SCALE = 0.5;
  G.poolSprite = null;
  G.beamSprite = null;
  G.warmBeamSprite = null;
  function makeSprite(w, h, paint) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    paint(c.getContext("2d"));
    return c;
  }
  function paintBeam(g, rgb) {
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 24);
    g.lineTo(128, 0);
    g.lineTo(128, 64);
    g.lineTo(0, 40);
    g.closePath();
    g.fill();
  }
  function makeLightSprites() {
    G.poolSprite = makeSprite(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    });
    G.beamSprite = makeSprite(128, 64, (g) => paintBeam(g, "0,0,0"));
    G.warmBeamSprite = makeSprite(128, 64, (g) => paintBeam(g, "255,220,140"));
  }
  function lightPool(g, x, y, r, strength = 0.9) {
    g.globalAlpha = strength;
    g.drawImage(G.poolSprite, x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  }
  function beam(g, c, y, dir, sprite = G.beamSprite, strength = 0.95) {
    const len = BEAM_LENGTH[c.kind] || 150;
    g.save();
    g.translate(c.x + dir * c.w / 2, y);
    g.scale(dir, 1);
    g.globalAlpha = strength;
    g.drawImage(sprite, 0, -38, len, 76);
    g.restore();
  }
  function drawNight(now) {
    if (!G.weather.night) return;
    if (!G.nightCanvas) {
      G.nightCanvas = document.createElement("canvas");
      G.nightCanvas.width = W * NIGHT_SCALE;
      G.nightCanvas.height = H * NIGHT_SCALE;
      G.nctx = G.nightCanvas.getContext("2d");
      G.nctx.scale(NIGHT_SCALE, NIGHT_SCALE);
      makeLightSprites();
    }
    G.nctx.globalCompositeOperation = "source-over";
    G.nctx.clearRect(0, 0, W, H);
    G.nctx.fillStyle = "rgba(4,8,22,.84)";
    G.nctx.fillRect(0, 0, W, H);
    G.nctx.globalCompositeOperation = "destination-out";
    for (const l of LAMPS) lightPool(G.nctx, l.x, l.y, 68);
    if (G.state !== "title") lightPool(G.nctx, G.player.x, G.player.y, 38);
    for (const p of G.pickups) lightPool(G.nctx, p.x, p.y, 24, 0.8);
    for (const lane of G.lanes) {
      if (lane.draining) for (const x of [W * 0.15, W * 0.5, W * 0.85]) lightPool(G.nctx, x, lane.y, 26, 0.7);
      if (lane.emergency) lightPool(G.nctx, lane.dir > 0 ? 16 : W - 16, lane.y, 36);
      if (lane.rail && lane.rail.phase !== "idle") {
        lightPool(G.nctx, 16, lane.y, 34);
        lightPool(G.nctx, W - 16, lane.y, 34);
      }
      for (const c of lane.cars) {
        const y = vehicleY(c, lane);
        if (c.kind === "float") {
          lightPool(G.nctx, c.x, y, 60, 0.75);
          continue;
        }
        if (c.kind === "roller") {
          lightPool(G.nctx, c.x, y, 45, 0.6);
          continue;
        }
        beam(G.nctx, c, y, lane.dir);
        lightPool(G.nctx, c.x, y, Math.min(c.w / 2 + 10, 60), 0.3);
        if (c.kind === "emergency") lightPool(G.nctx, c.x, y, 75, 0.6);
      }
    }
    G.nctx.globalCompositeOperation = "source-over";
    for (const lane of G.lanes) for (const c of lane.cars) {
      if (c.kind !== "float" && c.kind !== "roller") beam(G.nctx, c, vehicleY(c, lane), lane.dir, G.warmBeamSprite, 0.16);
    }
    ctx.drawImage(G.nightCanvas, 0, 0, W, H);
    drawNightLights(now);
  }
  function drawNightLights(now) {
    for (const l of LAMPS) {
      ctx.fillStyle = "rgba(255,214,140,.35)";
      ctx.beginPath();
      ctx.arc(l.x, l.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe6b0";
      ctx.beginPath();
      ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const lane of G.lanes) {
      for (const c of lane.cars) {
        if (c.kind === "float" || c.kind === "roller") continue;
        const y = vehicleY(c, lane);
        ctx.save();
        ctx.translate(c.x, y);
        if (lane.dir < 0) ctx.scale(-1, 1);
        const { w, h } = c;
        const glow = (x, yy, r, color) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, yy, r, 0, Math.PI * 2);
          ctx.fill();
        };
        if (c.kind === "train") {
          glow(w / 2 - 2, 0, 4, "#fff6c8");
          glow(-w / 2 + 2, 0, 3, "#ff3030");
        } else {
          const ys = c.kind === "bike" ? [0] : [-h / 2 + 6, h / 2 - 6];
          for (const yy of ys) {
            glow(w / 2 - 2, yy, 5, "rgba(255,246,200,.45)");
            glow(w / 2 - 2, yy, 2.2, "#fffbe6");
            glow(-w / 2 + 1, yy, c.braking ? 6 : 4, c.braking ? "rgba(255,30,30,.55)" : "rgba(255,30,30,.3)");
            glow(-w / 2 + 1, yy, 1.8, c.braking ? "#ff4040" : "#c01818");
          }
          if (c.kind === "emergency") {
            const red = Math.floor(now / 120) % 2;
            glow(w / 2 - 31, -h / 4, 5, red ? "#ff3030" : "#601010");
            glow(w / 2 - 31, h / 4, 5, red ? "#102060" : "#3a7bff");
          }
          drawTurnSignals(c, now);
          drawBusHazards(c, now);
        }
        ctx.restore();
      }
      if (lane.rail && lane.rail.phase !== "idle") {
        const flash = Math.floor(now / 300) % 2;
        drawCrossingSignal(16, lane.y, true, flash);
        drawCrossingSignal(W - 16, lane.y, true, flash);
      }
    }
    drawReversibleLanes(now, true);
    drawEmergencyWarnings(now);
    drawPickups(now);
  }

  // src/bus.js
  var hasBusStop = (lvl) => lvl >= 2 && lvl % 2 === 0;
  function setupBusStop() {
    for (const l of G.lanes) l.busStop = null;
    if (hasBusStop(G.level)) {
      const curb = [0, LANES_PER_SIDE - 1, LANES_PER_SIDE, LANES_PER_SIDE * 2 - 1].map((i) => G.lanes[i]).filter((l) => !l.rail && !l.reversible);
      if (curb.length) {
        const L = pickFrom(curb);
        const curbSide = L.index === 0 || L.index === LANES_PER_SIDE ? -1 : 1;
        L.busStop = { x: Math.round(rand(130, W - 130)), timer: rand(1, 4), due: false, curbSide };
      }
    }
  }
  function stopCap(c, lane) {
    if (c.kind !== "bus" || c.stopAt == null) return Infinity;
    const dist = (c.stopAt - c.x) * lane.dir;
    return dist > -2 ? Math.sqrt(2 * brakeDecel() * 0.6 * Math.max(0, dist)) : Infinity;
  }
  function updateBus(c, lane, dt) {
    if (c.kind !== "bus" || c.stopAt == null) return;
    if (Math.abs(c.stopAt - c.x) > 3 || c.v > 3) return;
    if (!c.dwell) {
      c.dwell = 1e-4;
      if (G.state === "playing" || G.state === "countdown") sfx.airBrake();
      const side = lane.busStop ? lane.busStop.curbSide : 1;
      for (let i = 0; !G.presimulating && i < 2 + Math.floor(fxRand(0, 3)); i++) {
        addParticle({
          kind: "walker",
          x: c.x + fxRand(-20, 20),
          y: lane.y + side * 14,
          vx: fxRand(-25, 25),
          vy: side * fxRand(18, 28),
          life: 2.2,
          size: 5.5,
          color: pickFrom(CAR_COLORS, Math.random),
          delay: i * 0.35
        });
      }
    }
    if ((c.dwell += dt) >= BUS_DWELL) {
      c.stopAt = null;
      c.dwell = 0;
    }
  }
  function busDue(lane, dt) {
    const stop = lane.busStop;
    if (!stop) return false;
    if (!stop.due && !lane.cars.some((c) => c.kind === "bus") && (stop.timer -= dt) <= 0) {
      stop.due = true;
      stop.timer = rand(BUS_MIN, BUS_MAX);
    }
    return stop.due;
  }
  function drawBusStop() {
    for (const lane of G.lanes) {
      const stop = lane.busStop;
      if (!stop) continue;
      const top = lane.y - LANE_H / 2;
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(stop.x - 70, top + 4, 140, LANE_H - 8);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(241,196,15,.55)";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("BUS STOP", stop.x, lane.y);
      const sy = lane.y + stop.curbSide * (LANE_H / 2 + 9);
      ctx.fillStyle = "#1f5fa8";
      ctx.beginPath();
      ctx.arc(stop.x + 78, sy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px system-ui, sans-serif";
      ctx.fillText("BUS", stop.x + 78, sy + 0.5);
    }
  }
  function drawBusHazards(c, now) {
    if (!c.dwell || Math.floor(now / 330) % 2) return;
    ctx.fillStyle = "#ffb300";
    for (const [x, y] of [[c.w / 2 - 4, -c.h / 2 + 2], [c.w / 2 - 4, c.h / 2 - 5], [-c.w / 2 + 1, -c.h / 2 + 2], [-c.w / 2 + 1, c.h / 2 - 5]]) {
      ctx.fillRect(x, y, 4, 3);
    }
  }
  function drawBus(c) {
    const { w, h } = c;
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.25)";
    ctx.fillRect(-w / 2 + 6, -h / 2 + 7, w - 22, h - 14);
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(-w / 2 + 20, -6, 22, 12);
    ctx.fillRect(-w / 2 + 52, -6, 22, 12);
    ctx.fillStyle = "#1b2733";
    for (let x = -w / 2 + 8; x < w / 2 - 18; x += 14) {
      ctx.fillRect(x, -h / 2 + 1, 10, 3);
      ctx.fillRect(x, h / 2 - 4, 10, 3);
    }
    ctx.fillRect(w / 2 - 9, -h / 2 + 4, 5, h - 8);
    ctx.fillStyle = "#ffb300";
    ctx.fillRect(w / 2 - 3, -6, 2, 12);
  }

  // src/render.js
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var dpr = window.devicePixelRatio || 1;
  G.renderScale = 0;
  G.liteMode = false;
  function setRenderScale(scale) {
    G.renderScale = scale;
    canvas.width = W * scale;
    canvas.height = H * scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  setRenderScale(Math.min(dpr, MAX_RENDER_SCALE));
  function enterLiteMode() {
    if (G.liteMode) return;
    G.liteMode = true;
    setRenderScale(1);
    G.raindrops.length = Math.min(G.raindrops.length, 60);
    console.info("Road Crossing: lite mode");
  }
  function exitLiteMode() {
    if (!G.liteMode) return;
    G.liteMode = false;
    setRenderScale(Math.min(dpr, MAX_RENDER_SCALE));
    setupWeatherScene();
  }
  function drawScene() {
    ctx.fillStyle = "#3c8d40";
    ctx.fillRect(0, 0, W, FINISH_H);
    ctx.fillStyle = "rgba(255,255,255,.25)";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FINISH", W / 2, FINISH_H / 2 - 6);
    for (let x = 0; x < W; x += 12) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (x / 12 + r) % 2 ? "#111" : "#fff";
        ctx.fillRect(x, FINISH_H - 12 + r * 6, 12, 6);
      }
    }
    ctx.fillStyle = "#3a3d44";
    ctx.fillRect(0, FINISH_H, W, H - FINISH_H - START_H);
    ctx.strokeStyle = "rgba(255,255,255,.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([24, 18]);
    for (let k = 1; k < LANES_PER_SIDE; k++) {
      for (const y of [FINISH_H + k * LANE_H, MEDIAN_Y + MEDIAN_H + k * LANE_H]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.fillStyle = "#4a7d3a";
    ctx.fillRect(0, MEDIAN_Y, W, MEDIAN_H);
    ctx.fillStyle = "#f4d03f";
    ctx.fillRect(0, MEDIAN_Y, W, 3);
    ctx.fillRect(0, MEDIAN_Y + MEDIAN_H - 3, W, 3);
    ctx.fillStyle = "#9aa0a6";
    ctx.fillRect(0, H - START_H, W, START_H);
    ctx.strokeStyle = "rgba(0,0,0,.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, H - START_H);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, H - START_H / 2);
    ctx.lineTo(W, H - START_H / 2);
    ctx.stroke();
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, H - START_H, W, 4);
  }
  function drawReversibleLanes(now, warningsOnly = false) {
    for (const lane of G.lanes) {
      if (!lane.reversible) continue;
      if (warningsOnly && !lane.draining) continue;
      if (!warningsOnly) {
        ctx.fillStyle = "rgba(244,180,0,.10)";
        ctx.fillRect(0, lane.y - LANE_H / 2, W, LANE_H);
      }
      let dir = lane.dir, color = "rgba(255,255,255,.35)";
      if (lane.draining) {
        if (Math.floor(now / 250) % 2) continue;
        dir = -lane.dir;
        color = "#f4b400";
      }
      ctx.fillStyle = color;
      const spacing = W * 0.35;
      const shift = lane.draining ? 0 : now / 1e3 * 25 % spacing * dir;
      for (let x = W * 0.15 - spacing + shift; x < W + spacing; x += spacing) {
        ctx.save();
        ctx.translate(x, lane.y);
        ctx.scale(dir, 1);
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(2, -9);
        ctx.lineTo(2, -4);
        ctx.lineTo(-14, -4);
        ctx.lineTo(-14, 4);
        ctx.lineTo(2, 4);
        ctx.lineTo(2, 9);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }
  function drawCar(c, y, dir, now) {
    if (c.kind === "train") {
      drawTrain(c, y, dir);
      return;
    }
    const { w, h } = c;
    ctx.save();
    ctx.translate(c.x, y);
    const laneTilt = c.dyRate ? Math.atan2(c.dyRate, Math.max(c.v, 30)) * 0.5 : 0;
    if (laneTilt || c.skid) ctx.rotate(dir * (laneTilt + skidYaw(c)));
    if (dir < 0) ctx.scale(-1, 1);
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 3, -h / 2 + 3, w, h, 6);
    ctx.fill();
    if (c.kind === "float" || c.kind === "roller") {
      if (c.kind === "float") drawFloat(c, now);
      else drawRoller(c);
      ctx.restore();
      return;
    }
    if (c.kind === "bike") {
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.roundRect(-w / 2, -2, w, 4, 2);
      ctx.fill();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 6, -4, w - 12, 8, 3);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.fillRect(w / 2 - 9, -7, 2, 14);
      ctx.fillStyle = "#333";
      ctx.beginPath();
      ctx.ellipse(-2, 0, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5f5f5";
      ctx.beginPath();
      ctx.arc(1, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6a8";
      ctx.fillRect(w / 2 - 2, -1.5, 2, 3);
      ctx.fillStyle = c.braking ? "#ff1a1a" : "#a01010";
      ctx.fillRect(-w / 2, -1.5, c.braking ? 3 : 2, 3);
      drawTurnSignals(c, now);
      ctx.restore();
      return;
    }
    if (c.kind === "bus") {
      drawBus(c);
    } else if (c.kind === "truck") {
      ctx.fillStyle = "#d0d4d9";
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w - 30, h, 3);
      ctx.fill();
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.roundRect(w / 2 - 28, -h / 2 + 2, 28, h - 4, 6);
      ctx.fill();
      ctx.fillStyle = "#1b2733";
      ctx.beginPath();
      ctx.roundRect(w / 2 - 12, -h / 2 + 5, 7, h - 10, 2);
      ctx.fill();
    } else {
      const emergency = c.kind === "emergency";
      ctx.fillStyle = emergency ? "#f8f8f8" : c.color;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 7);
      ctx.fill();
      if (emergency) {
        ctx.fillStyle = "#e02020";
        ctx.fillRect(-w / 2 + 4, -h / 2 + 1, w - 10, 3);
        ctx.fillRect(-w / 2 + 4, h / 2 - 4, w - 10, 3);
      }
      ctx.fillStyle = "#1b2733";
      ctx.beginPath();
      ctx.roundRect(w / 2 - 24, -h / 2 + 4, 9, h - 8, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 7, -h / 2 + 5, 7, h - 10, 3);
      ctx.fill();
      if (emergency) {
        const flip = Math.floor(now / 120) % 2;
        ctx.fillStyle = flip ? "#ff2a2a" : "#5a1010";
        ctx.fillRect(w / 2 - 34, -h / 2 + 4, 6, h / 2 - 4);
        ctx.fillStyle = flip ? "#10205a" : "#2a6bff";
        ctx.fillRect(w / 2 - 34, 0, 6, h / 2 - 4);
      } else {
        ctx.fillStyle = "rgba(255,255,255,.15)";
        ctx.beginPath();
        ctx.roundRect(-w / 2 + 16, -h / 2 + 5, w - 42, h - 10, 4);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#fff6a8";
    ctx.fillRect(w / 2 - 3, -h / 2 + 3, 3, 6);
    ctx.fillRect(w / 2 - 3, h / 2 - 9, 3, 6);
    if (c.braking) {
      ctx.fillStyle = "rgba(255,40,40,.35)";
      ctx.fillRect(-w / 2 - 4, -h / 2 + 1, 5, 10);
      ctx.fillRect(-w / 2 - 4, h / 2 - 11, 5, 10);
    }
    ctx.fillStyle = c.braking ? "#ff1a1a" : "#b81c1c";
    ctx.fillRect(-w / 2, -h / 2 + 3, c.braking ? 3 : 2, 6);
    ctx.fillRect(-w / 2, h / 2 - 9, c.braking ? 3 : 2, 6);
    drawBusHazards(c, now);
    drawTurnSignals(c, now);
    ctx.restore();
  }
  function drawEmergencyWarnings(now) {
    for (const lane of G.lanes) {
      if (!lane.emergency) continue;
      const red = Math.floor(now / 150) % 2;
      const x = lane.dir > 0 ? 16 : W - 16;
      ctx.save();
      ctx.translate(x, lane.y);
      ctx.scale(lane.dir, 1);
      ctx.fillStyle = red ? "rgba(255,40,40,.35)" : "rgba(40,100,255,.35)";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = red ? "#ff3030" : "#3a7bff";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-4, -10);
      ctx.lineTo(-4, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  function drawPlayer() {
    const crashed = G.state === "hit" && G.hitReason === "car";
    let hop = 0;
    if (G.state === "levelup") {
      const t = LEVELUP_TIME - G.stateTimer;
      hop = Math.abs(Math.sin(t * 9)) * 8 * Math.max(0, 1 - t / 1.5);
    }
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath();
    ctx.ellipse(G.player.x + 2, G.player.y + 3, 12 - hop / 3, 8 - hop / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    const now = performance.now();
    ctx.save();
    if (G.invulnTimer > 0 && Math.floor(now / 80) % 2) ctx.globalAlpha = 0.35;
    if (G.ghostTimer > 0) {
      ctx.globalAlpha = 0.45 + 0.1 * Math.sin(now / 120);
      ctx.filter = "sepia(1) hue-rotate(190deg) saturate(3)";
    }
    ctx.translate(G.player.x, G.player.y - hop);
    ctx.rotate(G.player.shownAngle + (crashed ? G.player.spin : 0));
    currentSkin().draw(ctx, Math.sin(G.player.walk) * 5, now);
    ctx.restore();
    if (G.player.shield) drawShield(G.player.x, G.player.y - hop, now);
    if (crashed) {
      ctx.fillStyle = `rgba(255,60,60,${G.stateTimer / 2})`;
      ctx.beginPath();
      ctx.arc(G.player.x, G.player.y, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function drawTimer(now) {
    const frac = Math.max(0, G.timeLeft / TIME_LIMIT);
    const x = 10, y = H - 12, w = W - 20, h = 6;
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 3);
    ctx.fill();
    if (G.timeLeft <= 5 && G.state === "playing" && Math.floor(now / 200) % 2) return;
    ctx.fillStyle = frac > 0.5 ? "#2ecc71" : frac > 0.2 ? "#f4b400" : "#e74c3c";
    ctx.beginPath();
    ctx.roundRect(x, y, w * frac, h, 3);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(`\u23F1 ${Math.max(0, Math.ceil(G.timeLeft))}`, W - 10, y - 2);
  }
  function drawPopups() {
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    for (const p of G.popups) {
      const age = 1 - p.t;
      const scale = 1 + 0.6 * Math.max(0, 1 - age * 6);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.min(1, p.t * 2);
      ctx.strokeStyle = "rgba(0,0,0,.6)";
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = "#ffe36e";
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    }
  }
  function drawEmergencyGlow(now) {
    const red = Math.floor(now / 120) % 2;
    for (const lane of G.lanes) {
      for (const c of lane.cars) {
        if (c.kind !== "emergency") continue;
        const g = ctx.createRadialGradient(c.x, lane.y, 5, c.x, lane.y, 70);
        g.addColorStop(0, red ? "rgba(255,40,40,.35)" : "rgba(50,110,255,.35)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(c.x - 70, lane.y - 70, 140, 140);
      }
    }
  }
  var countdownLabel = () => G.boss ? `\u{1F451} BOSS: ${BOSS_NAMES[G.boss]}` : `Level ${G.level}`;
  function drawCountdown() {
    let text, t, color;
    if (G.state === "countdown") {
      const n = Math.ceil(G.stateTimer / COUNTDOWN_STEP);
      t = 1 - (G.stateTimer - (n - 1) * COUNTDOWN_STEP) / COUNTDOWN_STEP;
      text = String(n);
      color = "#ffffff";
    } else if (G.goTimer > 0) {
      t = 1 - G.goTimer / 0.7;
      text = "GO!";
      color = "#2ecc71";
    } else {
      return;
    }
    const scale = 1.6 - 0.6 * Math.min(1, t * 4);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
    ctx.font = "bold 80px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "rgba(0,0,0,.5)";
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    if (G.state === "countdown") {
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.lineWidth = 4;
      ctx.strokeText(countdownLabel(), 0, -62);
      ctx.fillStyle = "#ffe36e";
      ctx.fillText(countdownLabel(), 0, -62);
    }
    ctx.restore();
  }
  function overlay(title, ...lines) {
    const boxH = 90 + lines.length * 24;
    ctx.fillStyle = "rgba(0,0,0,.6)";
    ctx.fillRect(0, H / 2 - boxH / 2, W, boxH);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 34px system-ui, sans-serif";
    const top = H / 2 - boxH / 2 + 38;
    ctx.fillText(title, W / 2, top);
    ctx.font = "16px system-ui, sans-serif";
    lines.forEach((line, i) => ctx.fillText(line, W / 2, top + 42 + i * 24));
  }
  var touchUI = () => document.body.classList.contains("touch");
  function nextLevelHint() {
    const next = bossFor(G.level + 1);
    if (next) return `\u{1F451} Next: BOSS LEVEL \u2014 ${BOSS_NAMES[next]}!`;
    if (G.level + 1 === BIKE_LEVEL) return "Next: fast motorbikes, and buses that stop!";
    if (G.level + 1 === RAIL_LEVEL) return "Next: a railway crossing \u2014 mind the lights!";
    if (G.level + 1 === EMERGENCY_LEVEL) return "Next: listen for sirens \u2014 emergency vehicles!";
    return "Faster traffic, more reversing lanes\u2026";
  }
  function draw() {
    const now = performance.now();
    const [sx, sy] = shakeOffset();
    ctx.fillStyle = "#1d2330";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(sx, sy);
    drawScene();
    drawBossRoad(now);
    drawRailTracks(now);
    drawBusStop();
    drawReversibleLanes(now);
    drawWetRoad(now);
    drawParticles(true);
    drawEmergencyGlow(now);
    drawPickups(now);
    for (const lane of G.lanes) for (const c of lane.cars) drawCar(c, vehicleY(c, lane), lane.dir, now);
    drawEmergencyWarnings(now);
    if (G.state !== "title") {
      drawMagnetField(now);
      drawPlayer();
    }
    drawNight(now);
    drawRain();
    if (G.state !== "title") {
      drawPowerUpStatus();
      drawTimer(now);
    }
    drawPopups();
    ctx.restore();
    if (G.state === "title") {
      const today = loadDailyStats();
      overlay(
        "Road Crossing",
        "Cross before the clock runs out",
        "Grab bonuses: coins \u23F1 \u{1F6E1} \u{1F422} \u2764\uFE0F \u{1F45F} \u{1F9F2} \u{1F47B}",
        `Skin: ${currentSkin().name}  \xB7  change it in the \u2630 menu`,
        today.best ? `\u{1F4C5} Today's daily best: ${today.best.score.toLocaleString()}` : "\u{1F4C5} New daily challenge every day!",
        touchUI() ? "Tap the road to play  \xB7  \u{1F4C5} \u2014 daily challenge" : "Space \u2014 play  \xB7  C / \u{1F4C5} \u2014 daily challenge"
      );
    } else if (G.state === "paused") {
      overlay("Paused", "Press P to continue");
    } else if (G.state === "levelup") {
      overlay(
        `Level ${G.level} complete!`,
        `+${G.levelBonus.levelPoints} level  \xB7  +${G.levelBonus.timePoints} time` + (G.levelBonus.bossPoints ? `  \xB7  \u{1F451} +${G.levelBonus.bossPoints} boss` : " bonus"),
        nextLevelHint(),
        ...weatherHint(G.level + 1) ? [weatherHint(G.level + 1)] : []
      );
    } else if (G.state === "gameover") {
      const unlockedLine = [
        ...G.skinsUnlockedThisGame.length ? [`\u{1F455} Unlocked: ${G.skinsUnlockedThisGame.join(", ")} \u2014 try it on!`] : [],
        ...G.gameAch.earned.length ? [G.gameAch.earned.length <= 2 ? `\u{1F3C6} New: ${G.gameAch.earned.join(", ")}` : `\u{1F3C6} ${G.gameAch.earned.length} new achievements!`] : []
      ];
      if (G.mode === "practice") {
        overlay(
          "Practice over",
          `Started at level ${G.practiceLevel}  \xB7  reached level ${G.level}`,
          "Practice games don't count toward scores or achievements",
          touchUI() ? `Tap \u2014 level ${G.practiceLevel} again  \xB7  \u2630 \u2014 choose another` : `Space \u2014 level ${G.practiceLevel} again  \xB7  L \u2014 choose another level`
        );
      } else if (G.mode === "daily" && G.dailyStats) {
        const best = G.dailyStats.best;
        overlay(
          "Daily challenge over",
          `Score ${G.score.toLocaleString()}  \xB7  level ${G.level}`,
          best.score === G.score ? `\u{1F4C5} Today's best! (try ${G.dailyStats.attempts})` : `\u{1F4C5} Today's best: ${best.score.toLocaleString()} (try ${G.dailyStats.attempts})`,
          ...unlockedLine,
          touchUI() ? "\u{1F4C5} \u2014 retry  \xB7  tap the road \u2014 normal game" : "R \u2014 share  \xB7  C \u2014 retry  \xB7  Space \u2014 normal game"
        );
      } else {
        overlay(
          "Game Over",
          `Score ${G.score}  \xB7  level ${G.level}`,
          G.newHighScore ? "\u{1F3C6} New high score!" : `High score ${G.hiScore}`,
          ...unlockedLine,
          touchUI() ? "Tap to play again  \xB7  \u{1F4C5} \u2014 daily challenge" : "Space \u2014 play again  \xB7  C \u2014 daily challenge"
        );
      }
    } else if (G.state === "hit" && G.lives > 0) {
      overlay(G.hitReason === "time" ? "Time's up!" : "Ouch!", `${G.lives} ${G.lives === 1 ? "life" : "lives"} left`);
    }
    drawBanner();
    drawCountdown();
    drawTip(now);
    updateShareButton();
    drawParticles(false);
  }

  // src/boss.js
  var BOSSES = ["parade", "highway", "roadworks"];
  var BOSS_NAMES = { parade: "the Parade", highway: "the Highway", roadworks: "Roadworks" };
  var BOSS_ICONS = { parade: "\u{1F389}", highway: "\u{1F6E3}", roadworks: "\u{1F6A7}" };
  var FLOAT_COLORS = ["#e84393", "#fdcb6e", "#00cec9", "#6c5ce7", "#ff7675", "#55efc4", "#fd79a8"];
  G.boss = null;
  var bossFor = (lvl) => lvl % BOSS_EVERY === 0 ? BOSSES[(lvl / BOSS_EVERY - 1) % BOSSES.length] : null;
  var bossSpeedMul = () => G.boss === "highway" ? HIGHWAY_SPEED : 1;
  var bossGapMul = () => G.boss === "highway" ? 1.4 : G.boss === "roadworks" ? 0.85 : 1;
  var bossLaneChangeMul = () => G.boss === "highway" ? 2.5 : 1;
  var specialLane = (lane) => lane.parade || lane.closed;
  function setupBoss() {
    for (const l of G.lanes) {
      l.parade = false;
      l.closed = false;
      l.busStop = null;
    }
    if (G.boss === "parade") {
      for (const i of [LANES_PER_SIDE - 1, LANES_PER_SIDE]) {
        Object.assign(G.lanes[i], { parade: true, speed: PARADE_SPEED, paradeLeft: 0 });
      }
    } else if (G.boss === "roadworks") {
      for (const i of [1, 3, LANES_PER_SIDE + 1, LANES_PER_SIDE + 3]) G.lanes[i].closed = true;
      const L = G.lanes[3];
      L.cars.push({
        kind: "roller",
        w: 56,
        h: 38,
        speed: ROLLER_SPEED,
        v: ROLLER_SPEED,
        x: rand(80, W - 80),
        color: "#f1c40f"
      });
    }
  }
  function nextParadeGap(lane) {
    if (lane.paradeLeft > 0) {
      lane.paradeLeft--;
      return 6;
    }
    lane.paradeLeft = 3 + Math.floor(rand(0, 4));
    return rand(PARADE_GAP_MIN, PARADE_GAP_MAX);
  }
  function makeFloat(c) {
    c.color = pickFrom(FLOAT_COLORS);
    c.balloons = Array.from({ length: 3 }, () => pickFrom(FLOAT_COLORS));
  }
  function updateRoller(c, lane, dt) {
    c.x += lane.dir * c.v * dt;
    if (lane.dir > 0 && c.x > W - 40 || lane.dir < 0 && c.x < 40) lane.dir *= -1;
  }
  var inRubble = () => G.boss === "roadworks" && G.lanes.some((l) => l.closed && Math.abs(G.player.y - l.y) < LANE_H / 2);
  function drawBossRoad(now) {
    if (G.boss === "highway") {
      ctx.fillStyle = "#b9bec6";
      ctx.fillRect(0, MEDIAN_Y + 6, W, MEDIAN_H - 12);
      ctx.fillStyle = "#8d939c";
      ctx.fillRect(0, MEDIAN_Y + MEDIAN_H / 2 - 1.5, W, 3);
      ctx.fillStyle = "#1f6f3f";
      ctx.beginPath();
      ctx.roundRect(W - 92, 8, 80, 24, 4);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("HIGHWAY", W - 52, 20.5);
    }
    if (G.boss === "roadworks") {
      for (const l of G.lanes) {
        if (!l.closed) continue;
        const top = l.y - LANE_H / 2;
        ctx.fillStyle = "#6e5a43";
        ctx.fillRect(0, top, W, LANE_H);
        ctx.fillStyle = "rgba(0,0,0,.18)";
        for (let x = 7; x < W; x += 23) ctx.fillRect(x, top + x * 7 % 30 + 6, 6, 4);
        for (let x = 10; x < W; x += 34) {
          for (const y of [top + 4, top + LANE_H - 4]) {
            ctx.fillStyle = "#ff7a1a";
            ctx.beginPath();
            ctx.moveTo(x - 5, y + 3);
            ctx.lineTo(x + 5, y + 3);
            ctx.lineTo(x, y - 6);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.fillRect(x - 2.5, y - 2, 5, 1.5);
          }
        }
      }
      ctx.fillStyle = "#ff9f1a";
      ctx.beginPath();
      ctx.roundRect(W - 100, 8, 88, 24, 4);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ROAD WORK", W - 56, 20.5);
    }
  }
  function drawFloat(c, now) {
    const { w, h } = c;
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 6);
    ctx.stroke();
    ctx.setLineDash([]);
    c.balloons.forEach((col, i) => {
      const bx = -w / 2 + (i + 1) * w / 4, by = Math.sin(now / 300 + i + c.x / 50) * 3;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.beginPath();
      ctx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  function drawRoller(c) {
    const { w, h } = c;
    ctx.fillStyle = "#7f8c8d";
    ctx.beginPath();
    ctx.roundRect(w / 2 - 16, -h / 2, 16, h, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.25)";
    for (let y = -h / 2 + 4; y < h / 2; y += 6) ctx.fillRect(w / 2 - 16, y, 16, 1.5);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2 + 5, w - 18, h - 10, 4);
    ctx.fill();
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 8, -9, 18, 18, 3);
    ctx.fill();
    ctx.fillStyle = "#ff9f1a";
    ctx.beginPath();
    ctx.arc(-w / 2 + 17, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  function emitParadeConfetti(dt) {
    if (G.boss !== "parade") return;
    for (const l of G.lanes) {
      if (!l.parade) continue;
      for (const c of l.cars) {
        if (c.x < 0 || c.x > W || fxRand(0, 1) > dt * 0.6) continue;
        for (let i = 0; i < 6; i++) {
          addParticle({
            kind: "shard",
            x: c.x + fxRand(-c.w / 3, c.w / 3),
            y: l.y,
            vx: fxRand(-60, 60),
            vy: fxRand(-60, 60),
            life: fxRand(0.6, 1.1),
            size: fxRand(2.5, 4),
            color: pickFrom(FLOAT_COLORS, Math.random),
            drag: 2.5,
            spin: fxRand(-10, 10),
            rot: fxRand(0, 6)
          });
        }
      }
    }
  }

  // src/lanechange.js
  G.presimulating = false;
  var vehicleY = (c, lane) => lane.y + (c.dy || 0);
  var LANE_CHANGERS = {
    car: { signal: LANE_CHANGE_SIGNAL, time: LANE_CHANGE_TIME, gap: 30, reaction: 0.8, eagerness: 1, every: [1.5, 4] },
    bike: { signal: BIKE_SIGNAL, time: BIKE_CHANGE_TIME, gap: 18, reaction: 0.8, eagerness: 1.6, every: [0.6, 1.8] },
    truck: { signal: TRUCK_SIGNAL, time: TRUCK_CHANGE_TIME, gap: 40, reaction: 0.3, eagerness: 0.9, every: [1.2, 3] }
  };
  function laneChangeTargets(lane) {
    const half = lane.index < LANES_PER_SIDE ? 0 : 1;
    return [G.lanes[lane.index - 1], G.lanes[lane.index + 1]].filter((t) => t && (t.index < LANES_PER_SIDE ? 0 : 1) === half && t.dir === lane.dir && !t.rail && !t.draining && !t.emergency && !specialLane(t));
  }
  function hasRoom(target, c, yielding = false) {
    for (const t of target.cars) {
      const ahead = (t.x - c.x) * target.dir > 0;
      const gap = Math.abs(t.x - c.x) - (t.w + c.w) / 2;
      const closing = Math.max(0, ahead ? c.v - t.v : t.v - c.v);
      const stopping = closing * closing / (2 * brakeDecel());
      const style = LANE_CHANGERS[c.kind];
      const needed = yielding ? style.gap * 0.6 + stopping : style.gap + closing * style.reaction + stopping;
      if (gap < needed) return false;
    }
    return true;
  }
  function updateLaneChanges(lane, dt) {
    for (const c of [...lane.cars]) {
      const style = LANE_CHANGERS[c.kind];
      if (!style) continue;
      if (c.signal) {
        if ((c.signal.t -= dt) > 0) continue;
        const target2 = c.signal.target;
        if (laneChangeTargets(lane).includes(target2) && hasRoom(target2, c, true)) moveToLane(c, lane, target2);
        else c.signal = null;
        c.laneTimer = rand(...style.every);
        continue;
      }
      if (c.change || c.x < 40 || c.x > W - 40) continue;
      if ((c.laneTimer = (c.laneTimer ?? rand(0.5, style.every[1])) - dt) > 0) continue;
      c.laneTimer = rand(...style.every);
      const i = lane.cars.indexOf(c), ahead = lane.cars[i - 1];
      const stuck = ahead && c.v < c.speed - 15 && (ahead.x - c.x) * lane.dir - (ahead.w + c.w) / 2 < FOLLOW_DIST * 1.5;
      const chance = (stuck ? 0.9 : Math.min(0.15 + 0.05 * G.level, 0.45)) * style.eagerness * bossLaneChangeMul();
      if (G.gameRandom() > chance) continue;
      const options = laneChangeTargets(lane).filter((t) => hasRoom(t, c));
      if (!options.length) continue;
      const target = pickFrom(options);
      c.signal = { target, side: Math.sign(target.y - lane.y), t: style.signal };
    }
  }
  var laneHooks = { onMove: null };
  function moveToLane(c, from, to) {
    if (laneHooks.onMove) laneHooks.onMove(c, from, to);
    from.cars.splice(from.cars.indexOf(c), 1);
    let i = to.cars.findIndex((t) => t.x * to.dir < c.x * to.dir);
    if (i < 0) i = to.cars.length;
    to.cars.splice(i, 0, c);
    c.dy = from.y - to.y;
    c.change = { t: 0, from: c.dy, time: LANE_CHANGERS[c.kind].time };
  }
  function animateLaneChange(c, dt) {
    if (!c.change) return;
    c.change.t += dt;
    const p = Math.min(1, c.change.t / c.change.time);
    const eased = p < 0.5 ? 2 * p * p : 1 - (2 - 2 * p) ** 2 / 2;
    const dy = c.change.from * (1 - eased);
    c.dyRate = dt > 0 ? (dy - c.dy) / dt : 0;
    c.dy = dy;
    if (p >= 1) {
      c.change = null;
      c.signal = null;
      c.dy = c.dyRate = 0;
    }
  }
  function drawTurnSignals(c, now) {
    if (!c.signal || Math.floor(now / 250) % 2) return;
    const { w, h } = c, y = c.signal.side * (h / 2 - 1);
    const xs = w > 90 ? [w / 2 - 3.5, 0, -w / 2 + 3.5] : [w / 2 - 3.5, -w / 2 + 3.5];
    for (const x of xs) {
      ctx.fillStyle = "rgba(255,179,0,.35)";
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb300";
      ctx.fillRect(x - 2.5, y - 2, 5, 4);
    }
    if (G.settings.contrast) {
      const s = c.signal.side, tip = y + s * 14;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, y + s * 3);
      ctx.lineTo(8, y + s * 3);
      ctx.lineTo(0, tip);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // src/effects.js
  G.particles = [];
  G.shakeTime = 0;
  G.shakeDuration = 1;
  G.shakeMag = 0;
  var reduceMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var CONFETTI_COLORS = ["#f1c40f", "#e74c3c", "#3498db", "#2ecc71", "#9b59b6", "#ffffff"];
  function addParticle(p) {
    G.particles.push({
      vx: 0,
      vy: 0,
      drag: 0,
      gravity: 0,
      grow: 0,
      spin: 0,
      rot: 0,
      alpha: 1,
      under: false,
      ...p,
      max: p.life
    });
  }
  function shake(duration, magnitude) {
    if (reduceMotion || !G.settings.shake) return;
    G.shakeTime = G.shakeDuration = duration;
    G.shakeMag = magnitude;
  }
  var fx = {
    crash(x, y, dir, color) {
      for (let i = 0; i < 18; i++) {
        addParticle({
          kind: "dot",
          x,
          y,
          vx: dir * fxRand(60, 280) + fxRand(-80, 80),
          vy: fxRand(-220, 220),
          life: fxRand(0.25, 0.55),
          size: fxRand(1.5, 3),
          color: "#ffd35a",
          drag: 3
        });
      }
      for (let i = 0; i < 10; i++) {
        addParticle({
          kind: "shard",
          x,
          y,
          vx: dir * fxRand(40, 200),
          vy: fxRand(-150, 150),
          life: fxRand(0.6, 1.1),
          size: fxRand(3, 6),
          color,
          drag: 4,
          spin: fxRand(-14, 14),
          rot: fxRand(0, 6)
        });
      }
      for (let i = 0; i < 8; i++) {
        addParticle({
          kind: "smoke",
          x: x + fxRand(-8, 8),
          y: y + fxRand(-8, 8),
          vx: fxRand(-40, 40),
          vy: fxRand(-40, 40),
          life: fxRand(0.6, 1),
          size: fxRand(5, 10),
          grow: 20,
          color: "#cfcfcf",
          alpha: 0.5,
          drag: 2
        });
      }
      shake(0.4, 8);
    },
    confetti() {
      for (let i = 0; i < 80; i++) {
        addParticle({
          kind: "shard",
          x: fxRand(0, W),
          y: fxRand(-30, FINISH_H),
          vx: fxRand(-50, 50),
          vy: fxRand(40, 160),
          life: fxRand(1.2, 2.2),
          size: fxRand(3, 6),
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          gravity: 140,
          drag: 0.8,
          spin: fxRand(-10, 10),
          rot: fxRand(0, 6)
        });
      }
    },
    sparkle(x, y, color) {
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, speed = fxRand(80, 160);
        addParticle({
          kind: "dot",
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: fxRand(0.35, 0.6),
          size: fxRand(1.5, 3),
          color: i % 2 ? color : "#ffffff",
          drag: 4
        });
      }
    },
    shieldBreak(x, y) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, speed = fxRand(120, 220);
        addParticle({
          kind: "shard",
          x: x + Math.cos(a) * 18,
          y: y + Math.sin(a) * 18,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: fxRand(0.4, 0.7),
          size: fxRand(4, 7),
          color: "#8fd3ff",
          drag: 3,
          spin: fxRand(-12, 12),
          rot: a
        });
      }
    },
    exhaust(x, y, dir) {
      addParticle({
        kind: "smoke",
        x,
        y: y + fxRand(-2, 2),
        vx: -dir * fxRand(10, 30),
        vy: fxRand(-6, 6),
        life: 0.8,
        size: 2,
        grow: 6,
        color: "#d2d2d2",
        alpha: 0.16,
        drag: 1.5,
        under: true
      });
    }
  };
  function emitExhaust(dt) {
    for (const lane of G.lanes) {
      for (const c of lane.cars) {
        c.puff = (c.puff ?? fxRand(0, 0.4)) - dt;
        if (c.puff > 0) continue;
        c.puff = fxRand(0.25, 0.5);
        const tailX = c.x - lane.dir * (c.w / 2 + 2);
        if (c.kind !== "train" && c.v > 5 && tailX > 0 && tailX < W) fx.exhaust(tailX, vehicleY(c, lane) + c.h / 4, lane.dir);
      }
    }
  }
  function updateEffects(dt) {
    for (const p of G.particles) {
      if (p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      p.vx -= p.vx * Math.min(1, p.drag * dt);
      p.vy -= p.vy * Math.min(1, p.drag * dt);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      p.size += p.grow * dt;
      p.life -= dt;
    }
    G.particles = G.particles.filter((p) => p.life > 0);
    if (G.shakeTime > 0) G.shakeTime -= dt;
  }
  function drawParticles(under) {
    for (const p of G.particles) {
      if (p.under !== under || p.delay > 0) continue;
      ctx.globalAlpha = p.alpha * Math.min(1, p.life / p.max * 2);
      ctx.fillStyle = p.color;
      if (p.kind === "walker") {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size + 1, p.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5b3a1e";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "shard") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function shakeOffset() {
    if (G.shakeTime <= 0) return [0, 0];
    const m = G.shakeMag * (G.shakeTime / G.shakeDuration);
    return [fxRand(-m, m), fxRand(-m, m)];
  }

  // src/game.js
  function newGame(newMode = "normal", startLevel = 1) {
    G.mode = newMode;
    if (G.mode === "daily") startDaily();
    G.level = startLevel;
    G.practiceLevel = startLevel;
    G.lives = START_LIVES;
    G.score = 0;
    G.newHighScore = false;
    G.levelProgress = 0;
    G.popups = [];
    G.particles = [];
    G.banner = null;
    G.skinsUnlockedThisGame = [];
    achOnNewGame();
    buildLanes();
    resetPickups();
    startAttempt();
    startCountdown();
    updateHud();
  }
  function startCountdown() {
    G.state = "countdown";
    G.stateTimer = COUNTDOWN_STEP * 3;
    sfx.count();
  }
  function startAttempt() {
    resetPlayer();
    G.timeLeft = TIME_LIMIT;
    G.lastTick = 0;
    clearPowerUps();
  }
  function addPopup(text, x, y) {
    G.popups.push({ text, x, y, t: 1 });
  }
  function addScore(points, x, y) {
    const oldScore = G.score;
    G.score += points;
    checkSkinUnlocks(oldScore);
    achOnScore();
    addPopup(`+${points}`, x, y);
    updateHud();
  }
  function loseLife(reason, hit) {
    G.lives--;
    achOnLifeLost();
    G.hitReason = reason;
    G.state = "hit";
    G.stateTimer = 1.2;
    updateHud();
    silenceSiren();
    for (const l of G.lanes) l.emergency = null;
    if (reason === "car") {
      const dir = hit.lane.dir;
      G.player.knockVx = dir * Math.min(hit.car.v + 80, 320);
      G.player.spinRate = dir * 14;
      fx.crash(G.player.x, G.player.y, dir, hit.car.kind === "emergency" ? "#f8f8f8" : hit.car.color);
      sfx.crash();
      vibrate(250);
    } else {
      sfx.timeUp();
      vibrate(120);
    }
  }
  function update(dt) {
    if (G.state !== "paused") {
      for (const p of G.popups) {
        p.t -= dt;
        p.y -= 30 * dt;
      }
      G.popups = G.popups.filter((p) => p.t > 0);
      G.goTimer = Math.max(0, G.goTimer - dt);
      if (G.banner && (G.banner.t -= dt) <= 0) G.banner = null;
      pumpToasts();
      updateTips(dt);
      updateEffects(dt);
      updateWeather(dt);
      if (G.state !== "hit") {
        emitExhaust(dt);
        emitWeatherEffects(dt);
        emitParadeConfetti(dt);
      }
    }
    switch (G.state) {
      case "title":
      case "gameover":
        updateTraffic(dt);
        break;
      case "countdown": {
        updateTraffic(dt);
        const before = Math.ceil(G.stateTimer / COUNTDOWN_STEP);
        G.stateTimer -= dt;
        const after = Math.ceil(G.stateTimer / COUNTDOWN_STEP);
        if (G.stateTimer <= 0) {
          G.state = "playing";
          G.goTimer = 0.7;
          sfx.start();
        } else if (after !== before) {
          sfx.count();
        }
        break;
      }
      case "playing": {
        const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
        if (dx || dy) {
          const speed = PLAYER_SPEED * (G.bootsTimer > 0 ? BOOTS_SPEED : 1) * (inRubble() ? RUBBLE_SPEED : 1);
          const dist = speed * dt / Math.hypot(dx, dy);
          const nx = Math.min(W - PLAYER_SIZE / 2, Math.max(PLAYER_SIZE / 2, G.player.x + dx * dist));
          const ny = Math.min(H - START_H / 2, Math.max(FINISH_H / 2, G.player.y + dy * dist));
          if (!blockedAt(nx, G.player.y)) G.player.x = nx;
          if (!blockedAt(G.player.x, ny)) G.player.y = ny;
          G.player.angle = Math.atan2(dx, -dy);
          G.player.walk += dt * (G.bootsTimer > 0 ? 19 : 12);
          if (G.bootsTimer > 0 && fxRand(0, 1) < dt * 25) {
            addParticle({
              kind: "smoke",
              x: G.player.x - dx * 8,
              y: G.player.y - dy * 8,
              vx: -dx * 30,
              vy: -dy * 30,
              life: 0.4,
              size: 2,
              grow: 10,
              color: "#d9c7a3",
              alpha: 0.4,
              drag: 3,
              under: true
            });
          }
          const step = Math.floor(G.player.walk / Math.PI);
          if (step !== G.player.lastStep) {
            G.player.lastStep = step;
            sfx.step();
          }
        }
        const turn = Math.atan2(Math.sin(G.player.angle - G.player.shownAngle), Math.cos(G.player.angle - G.player.shownAngle));
        G.player.shownAngle += turn * Math.min(1, dt * 14);
        const trafficDt = G.slowTimer > 0 ? dt * SLOW_FACTOR : dt;
        updateTraffic(trafficDt);
        honkAtPlayer();
        achUpdate(dt);
        if (G.level >= EMERGENCY_LEVEL && (G.emergencyTimer -= trafficDt) <= 0) dispatchEmergency();
        updatePickups(dt);
        G.timeLeft -= dt;
        const sec = Math.ceil(G.timeLeft);
        if (sec <= 5 && sec > 0 && sec !== G.lastTick) {
          G.lastTick = sec;
          sfx.tick();
        }
        const hit = G.invulnTimer > 0 || G.ghostTimer > 0 ? null : hitsCar();
        if (hit && G.player.shield) {
          breakShield(hit);
        } else if (hit) {
          loseLife("car", hit);
        } else if (G.timeLeft <= 0) {
          loseLife("time");
        } else if (G.player.y + PLAYER_SIZE / 2 < FINISH_H) {
          const levelPoints = LEVEL_POINTS * G.level * (G.boss ? 2 : 1);
          const bossPoints = G.boss ? BOSS_BONUS : 0;
          const timePoints = Math.ceil(G.timeLeft) * TIME_POINTS;
          G.levelBonus = { levelPoints, timePoints, bossPoints };
          addScore(levelPoints + timePoints + bossPoints, G.player.x, G.player.y);
          G.state = "levelup";
          G.stateTimer = LEVELUP_TIME;
          silenceSiren();
          dailyLevelDone();
          achOnLevelComplete();
          fx.confetti();
          sfx.levelUp();
        } else {
          const crossed = G.lanes.filter((l) => G.player.y < l.y - LANE_H / 2).length;
          if (crossed > G.levelProgress) {
            addScore((crossed - G.levelProgress) * PROGRESS_POINTS, G.player.x + 28, G.player.y);
            G.levelProgress = crossed;
            sfx.point();
          }
        }
        break;
      }
      case "hit":
        G.stateTimer -= dt;
        if (G.hitReason === "car") {
          G.player.x = Math.min(W - PLAYER_SIZE / 2, Math.max(PLAYER_SIZE / 2, G.player.x + G.player.knockVx * dt));
          G.player.knockVx *= Math.exp(-3 * dt);
          G.player.spin += G.player.spinRate * dt;
          G.player.spinRate *= Math.exp(-2.5 * dt);
        }
        if (G.stateTimer <= 0) {
          if (G.lives > 0) {
            startAttempt();
            G.state = "playing";
          } else {
            G.state = "gameover";
            G.newHighScore = G.mode !== "practice" && G.score > G.hiScore;
            saveHiScore();
            if (G.mode === "daily") finishDaily();
            updateHud();
            sfx.gameOver();
          }
        }
        break;
      case "levelup":
        updateTraffic(dt);
        G.stateTimer -= dt;
        if (G.stateTimer <= 0) {
          G.level++;
          G.levelProgress = 0;
          achOnNewLevel();
          buildLanes();
          resetPickups();
          startAttempt();
          startCountdown();
          updateHud();
        }
        break;
    }
  }
  function updateHud() {
    const modeIcon = { daily: "\u{1F4C5} ", practice: "\u{1F3AF} " }[G.mode] || "";
    document.getElementById("level").textContent = `${modeIcon}Level ${G.level}${G.boss ? " \u{1F451}" : ""}${weatherIcons()}`;
    document.getElementById("score").textContent = `Score ${G.score}`;
    document.getElementById("lives").textContent = "\u2764\uFE0F".repeat(Math.max(0, G.lives)) || "\u{1F480}";
    document.getElementById("hiscore").textContent = `Hi ${G.mode === "practice" ? G.hiScore : Math.max(G.hiScore, G.score)}`;
    document.getElementById("sound").textContent = sound.muted ? "off" : "on";
    document.getElementById("muteBtn").textContent = sound.muted ? "\u{1F507}" : "\u{1F50A}";
  }

  // src/sound.js
  var sound = {
    ctx: null,
    master: null,
    noise: null,
    muted: (() => {
      try {
        return localStorage.getItem("roadCrossingMuted") === "1";
      } catch {
        return false;
      }
    })(),
    // Browsers only allow audio to start after a user gesture, so this is called from input handlers.
    init() {
      if (this.ctx) {
        if (this.ctx.state === "suspended" && G.state !== "paused") this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.applyVolume();
      this.master.connect(this.ctx.destination);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    },
    ready() {
      return this.ctx && !this.muted;
    },
    applyVolume() {
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.6 * G.settings.volume;
    },
    toggleMute() {
      this.muted = !this.muted;
      this.applyVolume();
      try {
        localStorage.setItem("roadCrossingMuted", this.muted ? "1" : "0");
      } catch {
      }
      updateHud();
    },
    output(node, pan) {
      if (pan && this.ctx.createStereoPanner) {
        const p = this.ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan));
        node.connect(p);
        p.connect(this.master);
      } else {
        node.connect(this.master);
      }
    }
  };
  function tone(freq, dur, { type = "square", gain = 0.2, endFreq = freq, delay = 0, hold = 0, pan = 0 } = {}) {
    if (!sound.ready()) return;
    const ac = sound.ctx, t = ac.currentTime + delay;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.setValueAtTime(gain, t + hold);
    g.gain.exponentialRampToValueAtTime(1e-3, t + dur);
    osc.connect(g);
    sound.output(g, pan);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  function noiseBurst(dur, { gain = 0.3, freq = 1e3, endFreq = freq, delay = 0 } = {}) {
    if (!sound.ready()) return;
    const ac = sound.ctx, t = ac.currentTime + delay;
    const src = ac.createBufferSource(), filter = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = sound.noise;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, t);
    if (endFreq !== freq) filter.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(1e-3, t + dur);
    src.connect(filter);
    filter.connect(g);
    sound.output(g);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.02);
  }
  var sfx = {
    step() {
      noiseBurst(0.05, { gain: 0.12, freq: 900 });
    },
    start() {
      tone(660, 0.12, { type: "triangle", gain: 0.2 });
      tone(990, 0.18, { type: "triangle", gain: 0.2, delay: 0.1 });
    },
    honk(pan) {
      tone(392, 0.4, { gain: 0.05, hold: 0.28, pan });
      tone(494, 0.4, { gain: 0.05, hold: 0.28, pan });
    },
    warn() {
      tone(880, 0.09, { type: "sine", gain: 0.12 });
      tone(880, 0.09, { type: "sine", gain: 0.12, delay: 0.16 });
    },
    crash() {
      tone(1300, 0.2, { type: "sawtooth", gain: 0.05, endFreq: 800 });
      noiseBurst(0.7, { gain: 0.5, freq: 4e3, endFreq: 150, delay: 0.08 });
      tone(140, 0.45, { gain: 0.25, endFreq: 40, delay: 0.08 });
    },
    levelUp() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: "triangle", gain: 0.22, delay: i * 0.11 }));
    },
    pickup(type) {
      if (type === "coin") {
        tone(988, 0.08, { gain: 0.08 });
        tone(1319, 0.2, { gain: 0.08, delay: 0.07 });
      } else {
        [659, 880, 1175].forEach((f, i) => tone(f, 0.16, { type: "triangle", gain: 0.18, delay: i * 0.06 }));
      }
    },
    shieldBreak() {
      noiseBurst(0.25, { gain: 0.3, freq: 6e3, endFreq: 800 });
      tone(700, 0.3, { type: "triangle", gain: 0.2, endFreq: 200 });
    },
    bell() {
      tone(1750, 0.3, { type: "sine", gain: 0.07 });
      tone(2630, 0.2, { type: "sine", gain: 0.03 });
    },
    trainHorn(pan) {
      for (const f of [277, 349, 415]) tone(f, 1.1, { type: "sawtooth", gain: 0.035, hold: 0.85, pan });
    },
    rumble(dur) {
      if (!sound.ready()) return;
      const ac = sound.ctx, t = ac.currentTime;
      const src = ac.createBufferSource(), filter = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = sound.noise;
      src.loop = true;
      filter.type = "lowpass";
      filter.frequency.value = 180;
      g.gain.setValueAtTime(1e-3, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.3);
      g.gain.setValueAtTime(0.5, t + Math.max(0.3, dur - 0.5));
      g.gain.exponentialRampToValueAtTime(1e-3, t + dur + 0.3);
      src.connect(filter);
      filter.connect(g);
      sound.output(g);
      src.start(t);
      src.stop(t + dur + 0.35);
    },
    squeal(pan) {
      tone(1150, 0.4, { type: "sawtooth", gain: 0.025, endFreq: 780, pan });
      tone(1230, 0.35, { type: "square", gain: 0.012, endFreq: 850, pan });
    },
    rainLoop() {
      if (!sound.ready()) return null;
      const ac = sound.ctx, t = ac.currentTime;
      const src = ac.createBufferSource(), filter = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = sound.noise;
      src.loop = true;
      filter.type = "bandpass";
      filter.frequency.value = 1400;
      filter.Q.value = 0.5;
      g.gain.setValueAtTime(1e-3, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 1);
      src.connect(filter);
      filter.connect(g);
      sound.output(g);
      src.start(t);
      return () => {
        const now = ac.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(Math.max(g.gain.value, 1e-3), now);
        g.gain.exponentialRampToValueAtTime(1e-3, now + 0.5);
        src.stop(now + 0.55);
      };
    },
    achievement() {
      [784, 988, 1319, 1568].forEach((f, i) => tone(f, 0.22, { type: "triangle", gain: 0.16, delay: i * 0.07 }));
    },
    airBrake() {
      noiseBurst(0.45, { gain: 0.18, freq: 6e3, endFreq: 1800 });
    },
    count() {
      tone(660, 0.12, { type: "triangle", gain: 0.18 });
    },
    point() {
      tone(1200, 0.07, { type: "sine", gain: 0.1 });
    },
    tick() {
      tone(1600, 0.04, { gain: 0.06 });
    },
    timeUp() {
      tone(220, 0.6, { gain: 0.15, hold: 0.4 });
      tone(233, 0.6, { gain: 0.15, hold: 0.4 });
    },
    // Wailing siren that swells during the warning, then pans across as the vehicle passes.
    // Returns a function that stops it early.
    siren(dur, panFrom) {
      if (!sound.ready()) return () => {
      };
      const ac = sound.ctx, t = ac.currentTime;
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = "triangle";
      for (let s = 0; s < dur; s += 0.7) {
        osc.frequency.setValueAtTime(950, t + s);
        osc.frequency.setValueAtTime(700, t + s + 0.35);
      }
      g.gain.setValueAtTime(0.02, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + EMERGENCY_WARN);
      g.gain.setValueAtTime(0.12, t + dur - 0.6);
      g.gain.exponentialRampToValueAtTime(1e-3, t + dur);
      osc.connect(g);
      if (ac.createStereoPanner) {
        const p = ac.createStereoPanner();
        p.pan.setValueAtTime(panFrom, t + EMERGENCY_WARN);
        p.pan.linearRampToValueAtTime(-panFrom, t + dur);
        g.connect(p);
        p.connect(sound.master);
      } else {
        g.connect(sound.master);
      }
      osc.start(t);
      osc.stop(t + dur);
      return () => {
        try {
          osc.stop();
        } catch {
        }
      };
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, { type: "triangle", gain: 0.22, delay: i * 0.22 }));
    }
  };

  // src/music.js
  var MIDI = (m) => 440 * Math.pow(2, (m - 69) / 12);
  var PROGRESSIONS = {
    // chord tones for the arpeggio (MIDI), and the bass root for each bar
    normal: { chords: [[69, 72, 76], [65, 69, 72], [64, 67, 72], [67, 71, 74]], bass: [45, 41, 48, 43] },
    // Am F C G
    boss: { chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [61, 64, 69]], bass: [38, 46, 48, 45] }
    // Dm Bb C A
  };
  var ARP = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, -1];
  var BASS_STEPS = /* @__PURE__ */ new Set([0, 3, 6, 8, 11, 14]);
  var MUSIC_STATES = ["countdown", "playing", "hit", "levelup"];
  var music = { bus: null, playing: false, nextTime: 0, step: 0 };
  var MUSIC_LEVEL = 0.6;
  function musicTempo() {
    const bpm = Math.min(150, 112 + 2 * G.level);
    return musicUrgent() ? bpm * 1.3 : bpm;
  }
  var musicUrgent = () => G.state === "playing" && G.timeLeft <= 8;
  var musicProgression = () => PROGRESSIONS[G.boss ? "boss" : "normal"];
  function musicWanted() {
    return !!sound.ctx && !sound.muted && G.settings.musicOn && MUSIC_STATES.includes(G.state);
  }
  function applyMusicVolume() {
    if (music.bus) music.bus.gain.value = MUSIC_LEVEL * G.settings.musicVolume;
  }
  function startMusic() {
    const ac = sound.ctx;
    music.bus = ac.createGain();
    music.bus.gain.setValueAtTime(1e-4, ac.currentTime);
    music.bus.gain.exponentialRampToValueAtTime(Math.max(1e-4, MUSIC_LEVEL * G.settings.musicVolume), ac.currentTime + 0.6);
    music.bus.connect(sound.master);
    music.playing = true;
    music.nextTime = ac.currentTime + 0.05;
    music.step = 0;
  }
  function stopMusic() {
    const ac = sound.ctx, bus = music.bus;
    music.playing = false;
    music.bus = null;
    if (!bus || !ac) return;
    bus.gain.cancelScheduledValues(ac.currentTime);
    bus.gain.setValueAtTime(Math.max(bus.gain.value, 1e-4), ac.currentTime);
    bus.gain.exponentialRampToValueAtTime(1e-4, ac.currentTime + 0.4);
    setTimeout(() => bus.disconnect(), 600);
  }
  function musicTick() {
    if (!musicWanted()) {
      if (music.playing) stopMusic();
      return;
    }
    if (!music.playing) startMusic();
    const ac = sound.ctx;
    if (music.nextTime < ac.currentTime) music.nextTime = ac.currentTime + 0.02;
    while (music.nextTime < ac.currentTime + 0.15) {
      scheduleStep(music.step, music.nextTime);
      music.nextTime += 60 / musicTempo() / 4;
      music.step++;
    }
  }
  function scheduleStep(step, t) {
    const s = step % 16, bar = Math.floor(step / 16) % 4;
    const prog = musicProgression(), chord = prog.chords[bar];
    const urgent = musicUrgent();
    const i = ARP[s];
    if (i >= 0) {
      const up = s >= 8 && Math.floor(step / 16) % 2 ? 12 : 0;
      musicNote(MIDI(chord[i] + up + (urgent ? 12 : 0)), t, 0.09, G.weather.night ? "triangle" : "square", 0.045);
    }
    if (BASS_STEPS.has(s)) musicNote(MIDI(prog.bass[bar] + (s === 8 ? 12 : 0)), t, 0.16, "triangle", 0.11);
    if (s % 8 === 0 || (G.boss || urgent) && s % 4 === 0) musicKick(t);
    if (s === 4 || s === 12) musicNoise(t, 0.12, 1800, "bandpass", 0.16);
    if (urgent || s % 2 === 0) musicNoise(t, 0.03, 7e3, "highpass", 0.05);
  }
  function musicNote(freq, t, dur, type, gain) {
    const ac = sound.ctx, osc = ac.createOscillator(), g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    osc.connect(g);
    g.connect(music.bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  function musicKick(t) {
    const ac = sound.ctx, osc = ac.createOscillator(), g = ac.createGain();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(1e-4, t + 0.15);
    osc.connect(g);
    g.connect(music.bus);
    osc.start(t);
    osc.stop(t + 0.17);
  }
  function musicNoise(t, dur, freq, type, gain) {
    const ac = sound.ctx, src = ac.createBufferSource(), filter = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = sound.noise;
    filter.type = type;
    filter.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(music.bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // src/settings.js
  var DEFAULT_SETTINGS = {
    volume: 0.8,
    // 0…1, sound effects (and the master level)
    musicOn: true,
    // background music (music.js)
    musicVolume: 0.6,
    // 0…1
    shake: true,
    // screen shake on crashes
    graphics: "auto",
    // 'auto' (switch to lite mode if slow), 'high' or 'lite'
    contrast: false
    // high-contrast signals: turn signals also show a white arrow
  };
  G.settings = (() => {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("roadCrossingSettings")) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  })();
  function setSetting(key, value) {
    G.settings[key] = value;
    try {
      localStorage.setItem("roadCrossingSettings", JSON.stringify(G.settings));
    } catch {
    }
    applySettings();
  }
  function applySettings() {
    sound.applyVolume();
    applyMusicVolume();
    if (G.settings.graphics === "lite") enterLiteMode();
    else if (G.settings.graphics === "high") exitLiteMode();
  }

  // src/main.js
  var STEP = 1 / 120;
  G.lastTime = performance.now();
  G.pending = 0;
  G.slowTime = 0;
  function watchFrameRate(realDt) {
    if (G.settings.graphics !== "auto" || G.liteMode || G.state !== "playing" || realDt > 0.25) return;
    G.slowTime = realDt > 1 / LITE_FPS ? G.slowTime + realDt : Math.max(0, G.slowTime - realDt);
    if (G.slowTime > 3) enterLiteMode();
  }
  function frame(now) {
    const realDt = Math.min(0.1, (now - G.lastTime) / 1e3);
    watchFrameRate((now - G.lastTime) / 1e3);
    menuTick(realDt);
    G.pending += realDt * tipTimeScale(realDt);
    G.lastTime = now;
    while (G.pending >= STEP) {
      update(STEP);
      G.pending -= STEP;
    }
    draw();
    drawSkinPreviews(now);
    musicTick();
    requestAnimationFrame(frame);
  }
  function start() {
    initSkins();
    initDaily();
    initPractice();
    initMenu();
    initInput();
    buildLanes();
    resetPlayer();
    updateHud();
    requestAnimationFrame(frame);
  }

  // src/index.js
  start();
})();
//# sourceMappingURL=game.js.map
