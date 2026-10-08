// ---------- Lane changes ----------
// Cars and motorbikes sometimes move to a neighbouring lane going the same way: to overtake a
// slower vehicle, or just because. They always signal first (LANE_CHANGE_SIGNAL seconds of blinking
// indicators), then glide over in LANE_CHANGE_TIME seconds. While gliding, a vehicle already belongs
// to the new lane and c.dy is its vertical offset from that lane's centre line.
let presimulating = false;       // no lane changes while buildLanes() fast-forwards traffic

const vehicleY = (c, lane) => lane.y + (c.dy || 0);

// Neighbouring lanes a vehicle could move into: same side of the median, same direction, ordinary road.
function laneChangeTargets(lane) {
  const half = lane.index < LANES_PER_SIDE ? 0 : 1;
  return [lanes[lane.index - 1], lanes[lane.index + 1]].filter(t =>
    t && (t.index < LANES_PER_SIDE ? 0 : 1) === half && t.dir === lane.dir &&
    !t.rail && !t.draining && !t.emergency);
}

// Is there a safe gap in `target` for vehicle c, including room for faster traffic behind?
function hasRoom(target, c) {
  for (const t of target.cars) {
    const ahead = (t.x - c.x) * target.dir > 0;
    const gap = Math.abs(t.x - c.x) - (t.w + c.w) / 2;
    const closing = ahead ? c.v - t.v : t.v - c.v;      // how fast the gap is shrinking
    if (gap < 30 + Math.max(0, closing) * 0.8) return false;
  }
  return true;
}

function updateLaneChanges(lane, dt) {
  for (const c of [...lane.cars]) {                     // copy: a vehicle may leave this lane
    if (c.kind !== 'car' && c.kind !== 'bike') continue;
    if (c.signal) {
      if ((c.signal.t -= dt) > 0) continue;
      const target = c.signal.target;
      if (laneChangeTargets(lane).includes(target) && hasRoom(target, c)) moveToLane(c, lane, target);
      else c.signal = null;                             // the gap closed: give up for now
      c.laneTimer = rand(1.5, 4);
      continue;
    }
    if (c.change || c.x < 40 || c.x > W - 40) continue;   // only start on screen, so the signal is seen
    if ((c.laneTimer = (c.laneTimer ?? rand(1, 4)) - dt) > 0) continue;
    c.laneTimer = rand(1.5, 4);

    const i = lane.cars.indexOf(c), ahead = lane.cars[i - 1];
    const stuck = ahead && c.v < c.speed - 15 &&
      (ahead.x - c.x) * lane.dir - (ahead.w + c.w) / 2 < FOLLOW_DIST * 1.5;
    const chance = stuck ? 0.9 : Math.min(0.15 + 0.05 * level, 0.45);
    if (Math.random() > chance) continue;

    const options = laneChangeTargets(lane).filter(t => hasRoom(t, c));
    if (!options.length) continue;
    const target = options[Math.floor(Math.random() * options.length)];
    c.signal = { target, side: Math.sign(target.y - lane.y), t: LANE_CHANGE_SIGNAL };
  }
}

// Moves c into `to`, keeping that lane's front-to-back order, and starts the glide.
function moveToLane(c, from, to) {
  from.cars.splice(from.cars.indexOf(c), 1);
  let i = to.cars.findIndex(t => t.x * to.dir < c.x * to.dir);
  if (i < 0) i = to.cars.length;
  to.cars.splice(i, 0, c);
  c.dy = from.y - to.y;
  c.change = { t: 0, from: c.dy };
}

// Called every frame for every vehicle: eases c.dy to 0 and records the vertical speed for tilting.
function animateLaneChange(c, dt) {
  if (!c.change) return;
  c.change.t += dt;
  const p = Math.min(1, c.change.t / LANE_CHANGE_TIME);
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

// Blinking amber indicators on the side the vehicle is moving to (front and rear corners).
// Drawn in the vehicle's local frame, where the front points to +x.
function drawTurnSignals(c, now) {
  if (!c.signal || Math.floor(now / 250) % 2) return;
  const { w, h } = c, y = c.signal.side * (h / 2 - 1);
  ctx.fillStyle = 'rgba(255,179,0,.35)';
  ctx.beginPath(); ctx.arc(w / 2 - 3, y, 7, 0, Math.PI * 2); ctx.arc(-w / 2 + 3, y, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb300';
  ctx.fillRect(w / 2 - 6, y - 2, 5, 4);
  ctx.fillRect(-w / 2 + 1, y - 2, 5, 4);
}
