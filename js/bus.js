// ---------- Bus stop ----------
// On even levels from 2, a curb lane gets a bus stop. Now and then a bus pulls in, stops with its
// hazard lights on, lets passengers off and drives on — cars queue behind it or swerve around it.
const hasBusStop = lvl => lvl >= 2 && lvl % 2 === 0;

// Called by buildLanes() for each level, after the railway and reversible lanes are chosen.
function setupBusStop() {
  for (const l of lanes) l.busStop = null;
  if (hasBusStop(level)) {
    // Curb lanes: next to the finish (0), the median (4, 5) or the sidewalk (last).
    const curb = [0, LANES_PER_SIDE - 1, LANES_PER_SIDE, LANES_PER_SIDE * 2 - 1]
      .map(i => lanes[i]).filter(l => !l.rail && !l.reversible);
    if (curb.length) {
      const L = pickFrom(curb);
      const curbSide = L.index === 0 || L.index === LANES_PER_SIDE ? -1 : 1;   // which way the curb is (y)
      L.busStop = { x: Math.round(rand(130, W - 130)), timer: rand(1, 4), due: false, curbSide };
    }
  }
}

// Highest speed vehicle c may have now so it can still stop where it must (a bus at its stop).
function stopCap(c, lane) {
  if (c.kind !== 'bus' || c.stopAt == null) return Infinity;
  const dist = (c.stopAt - c.x) * lane.dir;
  return dist > -2 ? Math.sqrt(2 * brakeDecel() * 0.6 * Math.max(0, dist)) : Infinity;
}

// Bus at its stop: wait, let passengers off, then drive on.
function updateBus(c, lane, dt) {
  if (c.kind !== 'bus' || c.stopAt == null) return;
  if (Math.abs(c.stopAt - c.x) > 3 || c.v > 3) return;
  if (!c.dwell) {
    c.dwell = 0.0001;
    if (state === 'playing' || state === 'countdown') sfx.airBrake();
    const side = lane.busStop ? lane.busStop.curbSide : 1;
    for (let i = 0; !presimulating && i < 2 + Math.floor(fxRand(0, 3)); i++) {   // passengers step off to the curb
      addParticle({ kind: 'walker', x: c.x + fxRand(-20, 20), y: lane.y + side * 14, vx: fxRand(-25, 25),
                    vy: side * fxRand(18, 28), life: 2.2, size: 5.5, color: pickFrom(CAR_COLORS, Math.random),
                    delay: i * 0.35 });
    }
  }
  if ((c.dwell += dt) >= BUS_DWELL) { c.stopAt = null; c.dwell = 0; }
}

// Bus lanes: one bus at a time, every BUS_MIN–BUS_MAX seconds. Returns true when a bus should spawn.
function busDue(lane, dt) {
  const stop = lane.busStop;
  if (!stop) return false;
  if (!stop.due && !lane.cars.some(c => c.kind === 'bus') && (stop.timer -= dt) <= 0) {
    stop.due = true;
    stop.timer = rand(BUS_MIN, BUS_MAX);
  }
  return stop.due;
}

// ---------- Drawing ----------
function drawBusStop() {
  for (const lane of lanes) {
    const stop = lane.busStop;
    if (!stop) continue;
    const top = lane.y - LANE_H / 2;
    ctx.strokeStyle = '#f1c40f';                                    // yellow "BUS STOP" box on the road
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(stop.x - 70, top + 4, 140, LANE_H - 8);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(241,196,15,.55)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BUS STOP', stop.x, lane.y);
    const sy = lane.y + stop.curbSide * (LANE_H / 2 + 9);           // sign on the curb
    ctx.fillStyle = '#1f5fa8';
    ctx.beginPath(); ctx.arc(stop.x + 78, sy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.fillText('BUS', stop.x + 78, sy + 0.5);
  }
}

// Hazard lights on a bus at its stop (front and rear corners, both sides). Local frame, front = +x.
function drawBusHazards(c, now) {
  if (!c.dwell || Math.floor(now / 330) % 2) return;
  ctx.fillStyle = '#ffb300';
  for (const [x, y] of [[c.w / 2 - 4, -c.h / 2 + 2], [c.w / 2 - 4, c.h / 2 - 5], [-c.w / 2 + 1, -c.h / 2 + 2], [-c.w / 2 + 1, c.h / 2 - 5]]) {
    ctx.fillRect(x, y, 4, 3);
  }
}

function drawBus(c) {
  const { w, h } = c;
  ctx.fillStyle = c.color;                                          // body
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 5); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.25)';                          // roof with air-con units
  ctx.fillRect(-w / 2 + 6, -h / 2 + 7, w - 22, h - 14);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(-w / 2 + 20, -6, 22, 12);
  ctx.fillRect(-w / 2 + 52, -6, 22, 12);
  ctx.fillStyle = '#1b2733';                                        // side windows and windscreen
  for (let x = -w / 2 + 8; x < w / 2 - 18; x += 14) {
    ctx.fillRect(x, -h / 2 + 1, 10, 3);
    ctx.fillRect(x, h / 2 - 4, 10, 3);
  }
  ctx.fillRect(w / 2 - 9, -h / 2 + 4, 5, h - 8);
  ctx.fillStyle = '#ffb300';                                        // destination display
  ctx.fillRect(w / 2 - 3, -6, 2, 12);
}
