// ---------- Railway crossing ----------
// From RAIL_LEVEL on, a lane is replaced by train tracks. Trains are rare but very long and fast,
// and always announced: flashing lights and a bell for TRAIN_WARN seconds before one arrives.
const WAGON_COLORS = ['#8e5b3a', '#2c3e50', '#7f8c8d', '#16a085', '#b03a2e', '#5d6d7e'];
const LOCO_COLORS = ['#c0392b', '#1f618d', '#d68910', '#196f3d'];
const LOCO_LEN = 100, WAGON_LEN = 90, COUPLING = 4;

function railLaneCount() {
  if (level < RAIL_LEVEL) return 0;
  return level >= RAIL_LEVEL + 4 ? 2 : 1;
}

function makeRailLane(lane) {
  lane.rail = { phase: 'idle', timer: rand(2, 5), bell: 0 };
  lane.cars = [];
}

function spawnTrain(lane) {
  lane.dir = Math.random() < 0.5 ? -1 : 1;              // trains come from either side
  const wagons = 3 + Math.floor(Math.random() * 4);
  const w = LOCO_LEN + wagons * (WAGON_LEN + COUPLING);
  const speed = rand(TRAIN_SPEED_MIN, TRAIN_SPEED_MAX) * (1 + 0.05 * (level - RAIL_LEVEL));
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const train = {
    kind: 'train', w, h: 34, speed, v: speed, braking: false, wagons,
    x: lane.dir > 0 ? -w / 2 : W + w / 2,
    color: pick(LOCO_COLORS),
    wagonColors: Array.from({ length: wagons }, () => pick(WAGON_COLORS)),
  };
  lane.cars.push(train);
  return train;
}

// Rail lanes run their own schedule instead of normal traffic: idle → warning → passing → idle.
function updateRail(lane, dt) {
  const r = lane.rail;
  const audible = state === 'playing' || state === 'countdown';
  if (r.phase === 'idle') {
    if ((r.timer -= dt) <= 0) {
      r.phase = 'warning';
      r.timer = TRAIN_WARN;
      r.bell = 0;
    }
  } else if (r.phase === 'warning') {
    if ((r.timer -= dt) <= 0) {
      const train = spawnTrain(lane);
      r.phase = 'passing';
      if (audible) {
        sfx.trainHorn(-lane.dir);
        sfx.rumble((W + train.w) / train.speed);
      }
    }
  } else if (!lane.cars.length) {                       // passing, and the last wagon has left
    r.phase = 'idle';
    r.timer = rand(TRAIN_MIN, TRAIN_MAX);
  }
  if (r.phase !== 'idle' && (r.bell -= dt) <= 0) {
    r.bell = 0.45;
    if (audible) sfx.bell();
  }
}

// ---------- Railway drawing ----------
function drawRailTracks(now) {
  for (const lane of lanes) {
    if (!lane.rail) continue;
    const top = lane.y - LANE_H / 2;
    ctx.fillStyle = '#6b6158';                           // gravel ballast
    ctx.fillRect(0, top, W, LANE_H);
    ctx.fillStyle = '#4e3626';                           // wooden sleepers
    for (let x = 4; x < W; x += 16) ctx.fillRect(x, top + 5, 7, LANE_H - 10);
    for (const ry of [lane.y - 11, lane.y + 11]) {       // steel rails with a shiny top
      ctx.fillStyle = '#8a8f94';
      ctx.fillRect(0, ry - 2, W, 4);
      ctx.fillStyle = '#d5d9dd';
      ctx.fillRect(0, ry - 2, W, 1.5);
    }
    ctx.fillStyle = '#e8e8e8';                           // edges of the crossing
    ctx.fillRect(0, top, W, 2);
    ctx.fillRect(0, top + LANE_H - 2, W, 2);

    const active = lane.rail.phase !== 'idle';
    const flash = Math.floor(now / 300) % 2;
    if (active) {
      ctx.fillStyle = `rgba(255,40,40,${flash ? 0.2 : 0.08})`;
      ctx.fillRect(0, top, W, LANE_H);
    }
    drawCrossingSignal(16, lane.y, active, flash);
    drawCrossingSignal(W - 16, lane.y, active, flash);
  }
}

// Idle: a white ✕ crossbuck. Active: two red lights flashing alternately.
function drawCrossingSignal(x, y, active, flash) {
  ctx.save();
  ctx.translate(x, y);
  if (active) {
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath(); ctx.roundRect(-8, -17, 16, 34, 6); ctx.fill();
    for (const [ly, on] of [[-8, flash], [8, !flash]]) {
      if (on) {
        const g = ctx.createRadialGradient(0, ly, 2, 0, ly, 16);
        g.addColorStop(0, 'rgba(255,60,60,.7)');
        g.addColorStop(1, 'rgba(255,60,60,0)');
        ctx.fillStyle = g;
        ctx.fillRect(-16, ly - 16, 32, 32);
      }
      ctx.fillStyle = on ? '#ff3b3b' : '#5a1414';
      ctx.beginPath(); ctx.arc(0, ly, 5, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.lineCap = 'round';
    for (const [w, color] of [[5, '#b03a2e'], [3, '#ffffff']]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
      ctx.moveTo(-8, 8); ctx.lineTo(8, -8);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTrain(c, y, dir) {
  const { w, h } = c;
  ctx.save();
  ctx.translate(c.x, y);
  if (dir < 0) ctx.scale(-1, 1);                         // the locomotive's nose always points to +x

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);

  for (let i = 0; i < c.wagons; i++) {                   // wagons, from the back of the train
    const x0 = -w / 2 + i * (WAGON_LEN + COUPLING);
    ctx.fillStyle = c.wagonColors[i];
    ctx.beginPath(); ctx.roundRect(x0, -h / 2 + 2, WAGON_LEN, h - 4, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)';             // roof ridge
    ctx.fillRect(x0 + 4, -3, WAGON_LEN - 8, 6);
    ctx.fillStyle = '#2b2b2b';                           // coupling to the next wagon
    ctx.fillRect(x0 + WAGON_LEN, -2, COUPLING, 4);
  }

  const lx = w / 2 - LOCO_LEN;                           // locomotive
  ctx.fillStyle = c.color;
  ctx.beginPath(); ctx.roundRect(lx, -h / 2, LOCO_LEN, h, [3, 14, 14, 3]); ctx.fill();
  ctx.fillStyle = '#f1c40f';                             // warning stripe on the nose
  ctx.fillRect(w / 2 - 8, -h / 2 + 4, 3, h - 8);
  ctx.fillStyle = '#1b2733';                             // cab windshield
  ctx.beginPath(); ctx.roundRect(w / 2 - 28, -h / 2 + 5, 10, h - 10, 3); ctx.fill();
  ctx.fillStyle = '#7f8c8d';                             // roof vents
  ctx.fillRect(lx + 12, -7, 34, 14);
  ctx.fillRect(lx + 52, -5, 14, 10);

  const beam = ctx.createLinearGradient(w / 2, 0, w / 2 + 60, 0);   // headlight beam
  beam.addColorStop(0, 'rgba(255,246,168,.35)');
  beam.addColorStop(1, 'rgba(255,246,168,0)');
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(w / 2, -4); ctx.lineTo(w / 2 + 60, -16); ctx.lineTo(w / 2 + 60, 16); ctx.lineTo(w / 2, 4); ctx.fill();
  ctx.fillStyle = '#fff6a8';
  ctx.beginPath(); ctx.arc(w / 2 - 2, 0, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
