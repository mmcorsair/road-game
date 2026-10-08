// ---------- Lanes & vehicles ----------
function pickGap() {
  const base = Math.max(120, 250 - level * 15);
  return rand(base, base * 2.2);
}

function pickKind() {
  const r = gameRandom();
  if (level >= BIKE_LEVEL && r < 0.15) return 'bike';
  if (r > 0.8) return 'truck';
  return 'car';
}

// Vehicle sizes and speeds (speed is relative to the lane's base speed).
const VEHICLES = {
  car:       () => ({ w: rand(54, 70), h: 28, speed: rand(0.85, 1.15) }),
  truck:     () => ({ w: rand(95, 125), h: 34, speed: 0.8 }),
  bike:      () => ({ w: 30, h: 14, speed: 1.6 }),
  emergency: () => ({ w: 74, h: 30, speed: 2.2 }),
};

function spawnVehicle(lane, kind) {
  const spec = VEHICLES[kind]();
  const speed = kind === 'emergency' ? Math.max(260, lane.speed * spec.speed) : lane.speed * spec.speed;
  const c = {
    kind, w: spec.w, h: spec.h, speed, v: speed, braking: false,
    x: lane.dir > 0 ? -spec.w / 2 : W + spec.w / 2,
    color: pickFrom(CAR_COLORS),
  };
  lane.cars.push(c);
  return c;
}

function buildLanes() {
  silenceSiren();
  seedRandomness();                // the daily challenge makes every level's traffic the same for everyone
  lanes = [];
  emergencyTimer = rand(EMERGENCY_MIN, EMERGENCY_MAX) / 2;
  const speedMul = 1 + 0.18 * (level - 1);
  for (let i = 0; i < LANES_PER_SIDE * 2; i++) {
    const top = i < LANES_PER_SIDE;
    const y = top
      ? FINISH_H + i * LANE_H + LANE_H / 2
      : MEDIAN_Y + MEDIAN_H + (i - LANES_PER_SIDE) * LANE_H + LANE_H / 2;
    // Right-hand traffic seen from above: upper half drives left, lower half drives right.
    lanes.push({ index: i, y, dir: top ? -1 : 1, speed: rand(70, 150) * speedMul, cars: [], nextGap: pickGap(),
                 reversible: false, switchTimer: 0, draining: false, drainTime: 0, emergency: null, rail: null });
  }
  // A few random lanes periodically reverse direction; more of them on higher levels.
  // Railway lanes (from RAIL_LEVEL) are picked first, so a lane is never both.
  const reversibleCount = Math.min(1 + Math.floor((level - 1) / 2), 4);
  const railCount = railLaneCount();
  const order = shuffled(lanes);
  order.slice(0, railCount).forEach(makeRailLane);
  for (const lane of order.slice(railCount, railCount + reversibleCount)) {
    lane.reversible = true;
    lane.switchTimer = rand(REVERSE_MIN, REVERSE_MAX);
  }
  // Pre-simulate so the road is already full of traffic (lane by lane, so no lane changes).
  presimulating = true;
  for (const lane of lanes) for (let t = 0; t < 30; t += 0.05) updateLane(lane, 0.05);
  presimulating = false;
}

// Moves vehicles front to back; each one keeps its own speed but brakes behind a slower vehicle.
function moveVehicles(lane, dt) {
  for (let i = 0; i < lane.cars.length; i++) {
    const c = lane.cars[i], ahead = lane.cars[i - 1];   // cars[] is ordered front to back: index 0 is in front
    animateLaneChange(c, dt);
    const gapTo = () => (ahead.x - c.x) * lane.dir - (ahead.w + c.w) / 2;
    let target = c.speed;
    if (ahead) {
      const gap = gapTo();
      if (gap < FOLLOW_DIST) target = Math.min(target, Math.max(0, ahead.v + (gap - FOLLOW_DIST) * 2));
    }
    c.braking = target < c.v - 5;
    c.v = target > c.v ? Math.min(target, c.v + ACCEL * dt) : Math.max(target, c.v - BRAKE * dt);
    c.x += lane.dir * c.v * dt;
    if (ahead && gapTo() < 2) {                          // never drive through the vehicle ahead
      c.x = ahead.x - lane.dir * ((ahead.w + c.w) / 2 + 2);
      c.v = Math.min(c.v, ahead.v);
    }
  }
  lane.cars = lane.cars.filter(c => c.x + c.w / 2 > -150 && c.x - c.w / 2 < W + 150);
}

function updateLane(lane, dt) {
  moveVehicles(lane, dt);
  if (lane.rail) { updateRail(lane, dt); return; }
  if (!presimulating) updateLaneChanges(lane, dt);

  // Reversible lanes: stop letting cars in, wait until the lane is empty, then flip direction.
  if (lane.reversible) {
    if (!lane.draining) {
      lane.switchTimer -= dt;
      if (lane.switchTimer <= 0) {
        lane.draining = true;
        lane.drainTime = 0;
        if (state === 'playing') sfx.warn();
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

  // Distance from the entry edge of the screen to the rear of the most recently spawned car.
  const last = lane.cars[lane.cars.length - 1];
  const room = !last ? Infinity
    : lane.dir > 0 ? last.x - last.w / 2 : W - (last.x + last.w / 2);

  // An announced emergency vehicle holds back normal traffic, then enters once there is room.
  if (lane.emergency) {
    lane.emergency.t -= dt;
    if (lane.emergency.t <= 0 && room >= 10) {
      spawnVehicle(lane, 'emergency');
      lane.emergency = null;
      lane.nextGap = pickGap();
    }
    return;
  }

  if (room >= lane.nextGap) {
    spawnVehicle(lane, pickKind());
    lane.nextGap = pickGap();
  }
}

function dispatchEmergency() {
  emergencyTimer = rand(EMERGENCY_MIN, EMERGENCY_MAX);
  const candidates = lanes.filter(l => !l.reversible && !l.emergency && !l.rail);
  if (!candidates.length) return;
  const lane = pickFrom(candidates);
  lane.emergency = { t: EMERGENCY_WARN };
  const crossTime = (W + 150) / Math.max(260, lane.speed * 2.2);
  stopSiren = sfx.siren(EMERGENCY_WARN + crossTime + 0.5, -lane.dir);
}

function silenceSiren() {
  stopSiren();
  stopSiren = () => {};
}
