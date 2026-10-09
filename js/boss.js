// ---------- Boss levels ----------
// Every 5th level is special, cycling through three kinds:
//   parade    — the two lanes beside the median carry a slow convoy of floats with only a few gaps.
//   highway   — every lane is fast, with wider gaps and lots of lane changes; the median is a barrier.
//   roadworks — two lanes per side are closed (cones; rubble slows you down); a steamroller rolls
//               back and forth in one of them; the open lanes are busier.
// Boss levels have no railway, reversible lanes or bus stop, so the boss is the star.
const BOSSES = ['parade', 'highway', 'roadworks'];
const BOSS_NAMES = { parade: 'the Parade', highway: 'the Highway', roadworks: 'Roadworks' };
const BOSS_ICONS = { parade: '🎉', highway: '🛣', roadworks: '🚧' };
const FLOAT_COLORS = ['#e84393', '#fdcb6e', '#00cec9', '#6c5ce7', '#ff7675', '#55efc4', '#fd79a8'];

let boss = null;                  // the current level's boss kind, or null

const bossFor = lvl => (lvl % BOSS_EVERY === 0 ? BOSSES[(lvl / BOSS_EVERY - 1) % BOSSES.length] : null);

// Speed and gap multipliers for ordinary traffic on this level.
const bossSpeedMul = () => (boss === 'highway' ? HIGHWAY_SPEED : 1);
const bossGapMul = () => (boss === 'highway' ? 1.4 : boss === 'roadworks' ? 0.85 : 1);
const bossLaneChangeMul = () => (boss === 'highway' ? 2.5 : 1);

// Lanes ordinary traffic can't use (and lane changes, ambulances and buses avoid).
const specialLane = lane => lane.parade || lane.closed;

// Called by buildLanes() once the lanes exist, instead of railway / reversible lanes / bus stop.
function setupBoss() {
  for (const l of lanes) { l.parade = false; l.closed = false; l.busStop = null; }
  if (boss === 'parade') {
    for (const i of [LANES_PER_SIDE - 1, LANES_PER_SIDE]) {   // either side of the median
      Object.assign(lanes[i], { parade: true, speed: PARADE_SPEED, paradeLeft: 0 });
    }
  } else if (boss === 'roadworks') {
    for (const i of [1, 3, LANES_PER_SIDE + 1, LANES_PER_SIDE + 3]) lanes[i].closed = true;
    const L = lanes[3];                                         // the steamroller's lane
    L.cars.push({ kind: 'roller', w: 56, h: 38, speed: ROLLER_SPEED, v: ROLLER_SPEED, x: rand(80, W - 80),
                  color: '#f1c40f' });
  }
}

// Parade lanes: floats nose to tail, with a walkable gap every few floats.
function nextParadeGap(lane) {
  if (lane.paradeLeft > 0) { lane.paradeLeft--; return 6; }
  lane.paradeLeft = 3 + Math.floor(rand(0, 4));
  return rand(PARADE_GAP_MIN, PARADE_GAP_MAX);
}

function makeFloat(c) {
  c.color = pickFrom(FLOAT_COLORS);
  c.balloons = Array.from({ length: 3 }, () => pickFrom(FLOAT_COLORS));
}

// The steamroller drives itself: back and forth across the closed lane.
function updateRoller(c, lane, dt) {
  c.x += lane.dir * c.v * dt;
  if ((lane.dir > 0 && c.x > W - 40) || (lane.dir < 0 && c.x < 40)) lane.dir *= -1;
}

// Rubble in a closed lane slows the player down.
const inRubble = () => boss === 'roadworks' && lanes.some(l => l.closed && Math.abs(player.y - l.y) < LANE_H / 2);

// ---------- Drawing ----------
function drawBossRoad(now) {
  if (boss === 'highway') {
    ctx.fillStyle = '#b9bec6';                                  // concrete barrier on the median
    ctx.fillRect(0, MEDIAN_Y + 6, W, MEDIAN_H - 12);
    ctx.fillStyle = '#8d939c';
    ctx.fillRect(0, MEDIAN_Y + MEDIAN_H / 2 - 1.5, W, 3);
    ctx.fillStyle = '#1f6f3f';                                  // highway sign on the finish
    ctx.beginPath(); ctx.roundRect(W - 92, 8, 80, 24, 4); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HIGHWAY', W - 52, 20.5);
  }
  if (boss === 'roadworks') {
    for (const l of lanes) {
      if (!l.closed) continue;
      const top = l.y - LANE_H / 2;
      ctx.fillStyle = '#6e5a43';                                // dug-up road
      ctx.fillRect(0, top, W, LANE_H);
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      for (let x = 7; x < W; x += 23) ctx.fillRect(x, top + ((x * 7) % 30) + 6, 6, 4);   // rubble
      for (let x = 10; x < W; x += 34) {                        // cones along both edges
        for (const y of [top + 4, top + LANE_H - 4]) {
          ctx.fillStyle = '#ff7a1a';
          ctx.beginPath(); ctx.moveTo(x - 5, y + 3); ctx.lineTo(x + 5, y + 3); ctx.lineTo(x, y - 6); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillRect(x - 2.5, y - 2, 5, 1.5);
        }
      }
    }
    ctx.fillStyle = '#ff9f1a';                                  // "ROAD WORK" sign on the finish
    ctx.beginPath(); ctx.roundRect(W - 100, 8, 88, 24, 4); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ROAD WORK', W - 56, 20.5);
  }
}

// A parade float: a decorated platform with balloons. Local frame, front = +x.
function drawFloat(c, now) {
  const { w, h } = c;
  ctx.fillStyle = c.color;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';                     // scalloped trim
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.roundRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, 6); ctx.stroke();
  ctx.setLineDash([]);
  c.balloons.forEach((col, i) => {                              // bobbing balloons
    const bx = -w / 2 + (i + 1) * w / 4, by = Math.sin(now / 300 + i + c.x / 50) * 3;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.arc(bx - 2, by - 2, 2, 0, Math.PI * 2); ctx.fill();
  });
}

// The steamroller: a big drum in front, yellow body, cab on top.
function drawRoller(c) {
  const { w, h } = c;
  ctx.fillStyle = '#7f8c8d';                                    // drum
  ctx.beginPath(); ctx.roundRect(w / 2 - 16, -h / 2, 16, h, 4); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (let y = -h / 2 + 4; y < h / 2; y += 6) ctx.fillRect(w / 2 - 16, y, 16, 1.5);
  ctx.fillStyle = c.color;                                      // body
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2 + 5, w - 18, h - 10, 4); ctx.fill();
  ctx.fillStyle = '#2d3436';                                    // cab roof
  ctx.beginPath(); ctx.roundRect(-w / 2 + 8, -9, 18, 18, 3); ctx.fill();
  ctx.fillStyle = '#ff9f1a';                                    // warning beacon
  ctx.beginPath(); ctx.arc(-w / 2 + 17, 0, 3, 0, Math.PI * 2); ctx.fill();
}

// Now and then a float throws a little confetti.
function emitParadeConfetti(dt) {
  if (boss !== 'parade') return;
  for (const l of lanes) {
    if (!l.parade) continue;
    for (const c of l.cars) {
      if (c.x < 0 || c.x > W || fxRand(0, 1) > dt * 0.6) continue;
      for (let i = 0; i < 6; i++) {
        addParticle({ kind: 'shard', x: c.x + fxRand(-c.w / 3, c.w / 3), y: l.y, vx: fxRand(-60, 60), vy: fxRand(-60, 60),
                      life: fxRand(0.6, 1.1), size: fxRand(2.5, 4), color: pickFrom(FLOAT_COLORS, Math.random),
                      drag: 2.5, spin: fxRand(-10, 10), rot: fxRand(0, 6) });
      }
    }
  }
}
