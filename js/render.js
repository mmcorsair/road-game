// ---------- Canvas setup ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.scale(dpr, dpr);

// ---------- Drawing ----------
function drawScene() {
  // Finish zone (grass + checkered line)
  ctx.fillStyle = '#3c8d40';
  ctx.fillRect(0, 0, W, FINISH_H);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('FINISH', W / 2, FINISH_H / 2 - 6);
  for (let x = 0; x < W; x += 12) {
    for (let r = 0; r < 2; r++) {
      ctx.fillStyle = ((x / 12 + r) % 2) ? '#111' : '#fff';
      ctx.fillRect(x, FINISH_H - 12 + r * 6, 12, 6);
    }
  }

  // Road surface
  ctx.fillStyle = '#3a3d44';
  ctx.fillRect(0, FINISH_H, W, H - FINISH_H - START_H);

  // Dashed lane separators
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([24, 18]);
  for (let k = 1; k < LANES_PER_SIDE; k++) {
    for (const y of [FINISH_H + k * LANE_H, MEDIAN_Y + MEDIAN_H + k * LANE_H]) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // Median strip with yellow edge lines
  ctx.fillStyle = '#4a7d3a';
  ctx.fillRect(0, MEDIAN_Y, W, MEDIAN_H);
  ctx.fillStyle = '#f4d03f';
  ctx.fillRect(0, MEDIAN_Y, W, 3);
  ctx.fillRect(0, MEDIAN_Y + MEDIAN_H - 3, W, 3);

  // Start sidewalk with tiles
  ctx.fillStyle = '#9aa0a6';
  ctx.fillRect(0, H - START_H, W, START_H);
  ctx.strokeStyle = 'rgba(0,0,0,.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, H - START_H); ctx.lineTo(x, H); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, H - START_H / 2); ctx.lineTo(W, H - START_H / 2); ctx.stroke();
  ctx.fillStyle = '#ddd';
  ctx.fillRect(0, H - START_H, W, 4);   // curb
}

// Reversible lanes get an amber tint and painted arrows showing the traffic direction.
// While a lane is about to reverse, the arrows blink amber and point the new way.
function drawReversibleLanes(now) {
  for (const lane of lanes) {
    if (!lane.reversible) continue;
    ctx.fillStyle = 'rgba(244,180,0,.10)';
    ctx.fillRect(0, lane.y - LANE_H / 2, W, LANE_H);

    let dir = lane.dir, color = 'rgba(255,255,255,.35)';
    if (lane.draining) {
      if (Math.floor(now / 250) % 2) continue;   // blink
      dir = -lane.dir;
      color = '#f4b400';
    }
    ctx.fillStyle = color;
    for (const x of [W * 0.15, W * 0.5, W * 0.85]) {
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
  const { w, h } = c;
  ctx.save();
  ctx.translate(c.x, y);
  if (dir < 0) ctx.scale(-1, 1);       // after this, the vehicle's front always points to +x

  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.roundRect(-w / 2 + 3, -h / 2 + 3, w, h, 6); ctx.fill();

  if (c.kind === 'bike') {
    ctx.fillStyle = '#222';             // tyres, seen from above as one long strip
    ctx.beginPath(); ctx.roundRect(-w / 2, -2, w, 4, 2); ctx.fill();
    ctx.fillStyle = c.color;            // tank and seat
    ctx.beginPath(); ctx.roundRect(-w / 2 + 6, -4, w - 12, 8, 3); ctx.fill();
    ctx.fillStyle = '#111';             // handlebar
    ctx.fillRect(w / 2 - 9, -7, 2, 14);
    ctx.fillStyle = '#333';             // rider's shoulders
    ctx.beginPath(); ctx.ellipse(-2, 0, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f5f5f5';          // helmet
    ctx.beginPath(); ctx.arc(1, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff6a8';
    ctx.fillRect(w / 2 - 2, -1.5, 2, 3);
    ctx.fillStyle = c.braking ? '#ff1a1a' : '#a01010';
    ctx.fillRect(-w / 2, -1.5, c.braking ? 3 : 2, 3);
    ctx.restore();
    return;
  }

  if (c.kind === 'truck') {
    ctx.fillStyle = '#d0d4d9';          // cargo box
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w - 30, h, 3); ctx.fill();
    ctx.fillStyle = c.color;            // cab
    ctx.beginPath(); ctx.roundRect(w / 2 - 28, -h / 2 + 2, 28, h - 4, 6); ctx.fill();
    ctx.fillStyle = '#1b2733';
    ctx.beginPath(); ctx.roundRect(w / 2 - 12, -h / 2 + 5, 7, h - 10, 2); ctx.fill();
  } else {
    const emergency = c.kind === 'emergency';
    ctx.fillStyle = emergency ? '#f8f8f8' : c.color;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 7); ctx.fill();
    if (emergency) {
      ctx.fillStyle = '#e02020';        // red stripes along the sides
      ctx.fillRect(-w / 2 + 4, -h / 2 + 1, w - 10, 3);
      ctx.fillRect(-w / 2 + 4, h / 2 - 4, w - 10, 3);
    }
    ctx.fillStyle = '#1b2733';          // windshield & rear window
    ctx.beginPath(); ctx.roundRect(w / 2 - 24, -h / 2 + 4, 9, h - 8, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-w / 2 + 7, -h / 2 + 5, 7, h - 10, 3); ctx.fill();
    if (emergency) {
      const flip = Math.floor(now / 120) % 2;   // alternating light bar on the roof
      ctx.fillStyle = flip ? '#ff2a2a' : '#5a1010';
      ctx.fillRect(w / 2 - 34, -h / 2 + 4, 6, h / 2 - 4);
      ctx.fillStyle = flip ? '#10205a' : '#2a6bff';
      ctx.fillRect(w / 2 - 34, 0, 6, h / 2 - 4);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.15)'; // roof highlight
      ctx.beginPath(); ctx.roundRect(-w / 2 + 16, -h / 2 + 5, w - 42, h - 10, 4); ctx.fill();
    }
  }

  ctx.fillStyle = '#fff6a8';            // headlights
  ctx.fillRect(w / 2 - 3, -h / 2 + 3, 3, 6);
  ctx.fillRect(w / 2 - 3, h / 2 - 9, 3, 6);
  if (c.braking) {                      // brake lights glow when slowing down
    ctx.fillStyle = 'rgba(255,40,40,.35)';
    ctx.fillRect(-w / 2 - 4, -h / 2 + 1, 5, 10);
    ctx.fillRect(-w / 2 - 4, h / 2 - 11, 5, 10);
  }
  ctx.fillStyle = c.braking ? '#ff1a1a' : '#b81c1c';   // tail lights
  ctx.fillRect(-w / 2, -h / 2 + 3, c.braking ? 3 : 2, 6);
  ctx.fillRect(-w / 2, h / 2 - 9, c.braking ? 3 : 2, 6);
  ctx.restore();
}

// Flashing red/blue warning at the edge where an announced emergency vehicle will enter.
function drawEmergencyWarnings(now) {
  for (const lane of lanes) {
    if (!lane.emergency) continue;
    const red = Math.floor(now / 150) % 2;
    const x = lane.dir > 0 ? 16 : W - 16;
    ctx.save();
    ctx.translate(x, lane.y);
    ctx.scale(lane.dir, 1);
    ctx.fillStyle = red ? 'rgba(255,40,40,.35)' : 'rgba(40,100,255,.35)';
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = red ? '#ff3030' : '#3a7bff';
    ctx.beginPath();                    // chevron pointing into the road
    ctx.moveTo(10, 0); ctx.lineTo(-4, -10); ctx.lineTo(-4, 10); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawPlayer() {
  const crashed = state === 'hit' && hitReason === 'car';
  ctx.save();
  ctx.translate(player.x, player.y);
  if (crashed) ctx.rotate((1.2 - stateTimer) * 10);          // spin after being bumped
  else ctx.rotate(player.angle);                             // sprite is drawn facing up

  const swing = Math.sin(player.walk) * 5;
  const ellipse = (x, y, rx, ry, color) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  };
  ellipse(-5, swing, 3.5, 6, '#2c3e50');       // feet
  ellipse(5, -swing, 3.5, 6, '#2c3e50');
  ellipse(-11, -swing * 0.8, 3, 3, '#f0c08a'); // hands
  ellipse(11, swing * 0.8, 3, 3, '#f0c08a');
  ellipse(0, 0, 11, 7, '#e67e22');             // shoulders / shirt
  ellipse(0, -1, 5.5, 5.5, '#f0c08a');         // head (face toward the front)
  ellipse(0, 0.5, 5.5, 4.5, '#6b4226');        // hair
  ctx.restore();

  if (crashed) {
    ctx.fillStyle = `rgba(255,60,60,${stateTimer / 2})`;
    ctx.beginPath(); ctx.arc(player.x, player.y, 30, 0, Math.PI * 2); ctx.fill();
  }
}

// Countdown bar along the bottom of the sidewalk; blinks during the last 5 seconds.
function drawTimer(now) {
  const frac = Math.max(0, timeLeft / TIME_LIMIT);
  const x = 10, y = H - 12, w = W - 20, h = 6;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill();
  if (timeLeft <= 5 && state === 'playing' && Math.floor(now / 200) % 2) return;
  ctx.fillStyle = frac > 0.5 ? '#2ecc71' : frac > 0.2 ? '#f4b400' : '#e74c3c';
  ctx.beginPath(); ctx.roundRect(x, y, w * frac, h, 3); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`⏱ ${Math.max(0, Math.ceil(timeLeft))}`, W - 10, y - 2);
}

function drawPopups() {
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  for (const p of popups) {
    ctx.globalAlpha = Math.min(1, p.t * 2);
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = '#ffe36e';
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;
}

function overlay(title, ...lines) {
  const boxH = 90 + lines.length * 24;
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0, H / 2 - boxH / 2, W, boxH);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 34px system-ui, sans-serif';
  const top = H / 2 - boxH / 2 + 38;
  ctx.fillText(title, W / 2, top);
  ctx.font = '16px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, W / 2, top + 42 + i * 24));
}

function nextLevelHint() {
  if (level + 1 === BIKE_LEVEL) return 'Next: watch out for fast motorbikes!';
  if (level + 1 === EMERGENCY_LEVEL) return 'Next: listen for sirens — emergency vehicles!';
  return 'Faster traffic, more reversing lanes…';
}

function draw() {
  drawScene();
  const now = performance.now();
  drawReversibleLanes(now);
  for (const lane of lanes) for (const c of lane.cars) drawCar(c, lane.y, lane.dir, now);
  drawEmergencyWarnings(now);
  if (state !== 'title') {
    drawPlayer();
    drawTimer(now);
  }
  drawPopups();

  if (state === 'title') {
    overlay('Road Crossing', 'Cross before the clock runs out', 'Press Space (or tap) to start');
  } else if (state === 'paused') {
    overlay('Paused', 'Press P to continue');
  } else if (state === 'levelup') {
    overlay(`Level ${level} complete!`,
      `+${levelBonus.levelPoints} level  ·  +${levelBonus.timePoints} time bonus`, nextLevelHint());
  } else if (state === 'gameover') {
    overlay('Game Over', `Score ${score}  ·  level ${level}`,
      newHighScore ? '🏆 New high score!' : `High score ${hiScore}`, 'Space to play again');
  } else if (state === 'hit' && lives > 0) {
    overlay(hitReason === 'time' ? "Time's up!" : 'Ouch!', `${lives} ${lives === 1 ? 'life' : 'lives'} left`);
  }
}
