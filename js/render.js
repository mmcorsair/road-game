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
// warningsOnly: just the blinking warning arrows (redrawn on top of the darkness at night).
function drawReversibleLanes(now, warningsOnly = false) {
  for (const lane of lanes) {
    if (!lane.reversible) continue;
    if (warningsOnly && !lane.draining) continue;
    if (!warningsOnly) {
      ctx.fillStyle = 'rgba(244,180,0,.10)';
      ctx.fillRect(0, lane.y - LANE_H / 2, W, LANE_H);
    }

    let dir = lane.dir, color = 'rgba(255,255,255,.35)';
    if (lane.draining) {
      if (Math.floor(now / 250) % 2) continue;   // blink
      dir = -lane.dir;
      color = '#f4b400';
    }
    ctx.fillStyle = color;
    // Normal arrows slowly slide with the traffic; warning arrows stay put and blink.
    const spacing = W * 0.35;
    const shift = lane.draining ? 0 : ((now / 1000 * 25) % spacing) * dir;
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
  if (c.kind === 'train') { drawTrain(c, y, dir); return; }
  const { w, h } = c;
  ctx.save();
  ctx.translate(c.x, y);
  const laneTilt = c.dyRate ? Math.atan2(c.dyRate, Math.max(c.v, 30)) * 0.5 : 0;   // nose into a lane change
  if (laneTilt || c.skid) ctx.rotate(dir * (laneTilt + skidYaw(c)));                // + fishtail when skidding
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
    drawTurnSignals(c, now);
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
  drawTurnSignals(c, now);
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

  // Happy hops while celebrating a completed level.
  let hop = 0;
  if (state === 'levelup') {
    const t = LEVELUP_TIME - stateTimer;
    hop = Math.abs(Math.sin(t * 9)) * 8 * Math.max(0, 1 - t / 1.5);
  }

  ctx.fillStyle = 'rgba(0,0,0,.25)';                         // shadow stays on the ground
  ctx.beginPath();
  ctx.ellipse(player.x + 2, player.y + 3, 12 - hop / 3, 8 - hop / 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const now = performance.now();
  ctx.save();
  if (invulnTimer > 0 && Math.floor(now / 80) % 2) ctx.globalAlpha = 0.35;   // blink while protected
  ctx.translate(player.x, player.y - hop);
  ctx.rotate(player.shownAngle + (crashed ? player.spin : 0)); // sprite is drawn facing up

  currentSkin().draw(ctx, Math.sin(player.walk) * 5, now);
  ctx.restore();
  if (player.shield) drawShield(player.x, player.y - hop, now);

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
    const age = 1 - p.t;
    const scale = 1 + 0.6 * Math.max(0, 1 - age * 6);       // pops in large, settles quickly
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.min(1, p.t * 2);
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(p.text, 0, 0);
    ctx.fillStyle = '#ffe36e';
    ctx.fillText(p.text, 0, 0);
    ctx.restore();
  }
}

// Red/blue light thrown onto the road around emergency vehicles.
function drawEmergencyGlow(now) {
  const red = Math.floor(now / 120) % 2;
  for (const lane of lanes) {
    for (const c of lane.cars) {
      if (c.kind !== 'emergency') continue;
      const g = ctx.createRadialGradient(c.x, lane.y, 5, c.x, lane.y, 70);
      g.addColorStop(0, red ? 'rgba(255,40,40,.35)' : 'rgba(50,110,255,.35)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(c.x - 70, lane.y - 70, 140, 140);
    }
  }
}

// Big 3-2-1 numbers that zoom in, then "GO!".
function drawCountdown() {
  let text, t, color;
  if (state === 'countdown') {
    const n = Math.ceil(stateTimer / COUNTDOWN_STEP);
    t = 1 - (stateTimer - (n - 1) * COUNTDOWN_STEP) / COUNTDOWN_STEP;   // 0 → 1 within each number
    text = String(n);
    color = '#ffffff';
  } else if (goTimer > 0) {
    t = 1 - goTimer / 0.7;
    text = 'GO!';
    color = '#2ecc71';
  } else {
    return;
  }
  const scale = 1.6 - 0.6 * Math.min(1, t * 4);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = t < 0.7 ? 1 : (1 - t) / 0.3;
  ctx.font = 'bold 80px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 8;
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  if (state === 'countdown') {
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeText(`Level ${level}`, 0, -62);
    ctx.fillStyle = '#ffe36e';
    ctx.fillText(`Level ${level}`, 0, -62);
  }
  ctx.restore();
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

const touchUI = () => document.body.classList.contains('touch');

function nextLevelHint() {
  if (level + 1 === BIKE_LEVEL) return 'Next: watch out for fast motorbikes!';
  if (level + 1 === RAIL_LEVEL) return 'Next: a railway crossing — mind the lights!';
  if (level + 1 === EMERGENCY_LEVEL) return 'Next: listen for sirens — emergency vehicles!';
  return 'Faster traffic, more reversing lanes…';
}

function draw() {
  const now = performance.now();
  const [sx, sy] = shakeOffset();
  ctx.fillStyle = '#1d2330';                 // backdrop revealed at the edges while shaking
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(sx, sy);
  drawScene();
  drawRailTracks(now);
  drawReversibleLanes(now);
  drawWetRoad(now);                          // puddles and skid marks
  drawParticles(true);                       // exhaust, spray and splashes, beneath the vehicles
  drawEmergencyGlow(now);
  drawPickups(now);                          // lying on the road; vehicles drive over them
  for (const lane of lanes) for (const c of lane.cars) drawCar(c, vehicleY(c, lane), lane.dir, now);
  drawEmergencyWarnings(now);
  if (state !== 'title') drawPlayer();
  drawNight(now);                            // darkness with headlights and lamps (night levels)
  drawRain();
  if (state !== 'title') {
    drawPowerUpStatus();
    drawTimer(now);
  }
  drawPopups();
  ctx.restore();

  if (state === 'title') {
    const today = loadDailyStats();
    overlay('Road Crossing', 'Cross before the clock runs out', 'Grab bonuses: coins ⏱ 🛡 🐢 ❤️',
      `Skin: ${currentSkin().name}  ·  👕 to change`,
      today.best ? `📅 Today's daily best: ${today.best.score.toLocaleString()}` : '📅 New daily challenge every day!',
      touchUI() ? 'Tap the road to play  ·  📅 — daily challenge' : 'Space — play  ·  C / 📅 — daily challenge');
  } else if (state === 'paused') {
    overlay('Paused', 'Press P to continue');
  } else if (state === 'levelup') {
    overlay(`Level ${level} complete!`,
      `+${levelBonus.levelPoints} level  ·  +${levelBonus.timePoints} time bonus`, nextLevelHint(),
      ...(weatherHint(level + 1) ? [weatherHint(level + 1)] : []));
  } else if (state === 'gameover') {
    const unlockedLine = skinsUnlockedThisGame.length
      ? [`👕 Unlocked: ${skinsUnlockedThisGame.join(', ')} — try it on!`] : [];
    if (mode === 'daily' && dailyStats) {
      const best = dailyStats.best;
      overlay('Daily challenge over', `Score ${score.toLocaleString()}  ·  level ${level}`,
        best.score === score ? `📅 Today's best! (try ${dailyStats.attempts})`
                             : `📅 Today's best: ${best.score.toLocaleString()} (try ${dailyStats.attempts})`,
        ...unlockedLine, touchUI() ? '📅 — retry  ·  tap the road — normal game' : 'R — share  ·  C — retry  ·  Space — normal game');
    } else {
      overlay('Game Over', `Score ${score}  ·  level ${level}`,
        newHighScore ? '🏆 New high score!' : `High score ${hiScore}`, ...unlockedLine,
        touchUI() ? 'Tap to play again  ·  📅 — daily challenge' : 'Space — play again  ·  C — daily challenge');
    }
  } else if (state === 'hit' && lives > 0) {
    overlay(hitReason === 'time' ? "Time's up!" : 'Ouch!', `${lives} ${lives === 1 ? 'life' : 'lives'} left`);
  }
  drawBanner();
  drawCountdown();
  drawTip(now);
  updateShareButton();
  drawParticles(false);                      // sparks, debris, confetti on top of everything
}
