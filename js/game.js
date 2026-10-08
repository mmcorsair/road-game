// ---------- Game flow ----------
function newGame() {
  level = 1;
  lives = START_LIVES;
  score = 0;
  newHighScore = false;
  levelProgress = 0;
  popups = [];
  particles = [];
  buildLanes();
  startAttempt();
  startCountdown();
  updateHud();
}

// 3-2-1 before each level: traffic flows, but the man can't move and the clock doesn't run yet.
function startCountdown() {
  state = 'countdown';
  stateTimer = COUNTDOWN_STEP * 3;
  sfx.count();
}

// Every attempt (new level or after losing a life) starts on the sidewalk with a full clock.
function startAttempt() {
  resetPlayer();
  timeLeft = TIME_LIMIT;
  lastTick = 0;
}

function addScore(points, x, y) {
  score += points;
  popups.push({ text: `+${points}`, x, y, t: 1 });
  updateHud();
}

// `hit` is the { car, lane } that ran the player over, if any.
function loseLife(reason, hit) {
  lives--;
  hitReason = reason;
  state = 'hit';
  stateTimer = 1.2;
  updateHud();
  // Cancel any announced emergency vehicle, since traffic freezes and the siren would be out of sync.
  silenceSiren();
  for (const l of lanes) l.emergency = null;
  if (reason === 'car') {
    // Thrown aside in the car's direction of travel, spinning.
    const dir = hit.lane.dir;
    player.knockVx = dir * Math.min(hit.car.v + 80, 320);
    player.spinRate = dir * 14;
    fx.crash(player.x, player.y, dir, hit.car.kind === 'emergency' ? '#f8f8f8' : hit.car.color);
    sfx.crash();
    vibrate(250);
  } else {
    sfx.timeUp();
    vibrate(120);
  }
}

function update(dt) {
  if (state !== 'paused') {
    for (const p of popups) { p.t -= dt; p.y -= 30 * dt; }
    popups = popups.filter(p => p.t > 0);
    goTimer = Math.max(0, goTimer - dt);
    updateEffects(dt);
    if (state !== 'hit') emitExhaust(dt);    // traffic is frozen during 'hit'
  }

  switch (state) {
    case 'title':
    case 'gameover':
      lanes.forEach(l => updateLane(l, dt));
      break;

    case 'countdown': {
      lanes.forEach(l => updateLane(l, dt));
      const before = Math.ceil(stateTimer / COUNTDOWN_STEP);
      stateTimer -= dt;
      const after = Math.ceil(stateTimer / COUNTDOWN_STEP);
      if (stateTimer <= 0) {
        state = 'playing';
        goTimer = 0.7;
        sfx.start();
      } else if (after !== before) {
        sfx.count();
      }
      break;
    }

    case 'playing': {
      const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (dx || dy) {
        const dist = PLAYER_SPEED * dt / Math.hypot(dx, dy);   // same speed diagonally
        player.x = Math.min(W - PLAYER_SIZE / 2, Math.max(PLAYER_SIZE / 2, player.x + dx * dist));
        player.y = Math.min(H - START_H / 2, Math.max(FINISH_H / 2, player.y + dy * dist));
        player.angle = Math.atan2(dx, -dy);                    // 0 = facing up, clockwise
        player.walk += dt * 12;
        const step = Math.floor(player.walk / Math.PI);   // one footstep per half walk cycle
        if (step !== player.lastStep) { player.lastStep = step; sfx.step(); }
      }
      // Turn smoothly toward the direction of travel (along the shorter way round).
      const turn = Math.atan2(Math.sin(player.angle - player.shownAngle), Math.cos(player.angle - player.shownAngle));
      player.shownAngle += turn * Math.min(1, dt * 14);
      lanes.forEach(l => updateLane(l, dt));
      honkAtPlayer();
      if (level >= EMERGENCY_LEVEL && (emergencyTimer -= dt) <= 0) dispatchEmergency();

      timeLeft -= dt;
      const sec = Math.ceil(timeLeft);
      if (sec <= 5 && sec > 0 && sec !== lastTick) { lastTick = sec; sfx.tick(); }

      const hit = hitsCar();
      if (hit) {
        loseLife('car', hit);
      } else if (timeLeft <= 0) {
        loseLife('time');
      } else if (player.y + PLAYER_SIZE / 2 < FINISH_H) {
        const levelPoints = LEVEL_POINTS * level;
        const timePoints = Math.ceil(timeLeft) * TIME_POINTS;
        levelBonus = { levelPoints, timePoints };
        addScore(levelPoints + timePoints, player.x, player.y);
        state = 'levelup';
        stateTimer = LEVELUP_TIME;
        silenceSiren();
        fx.confetti();
        sfx.levelUp();
      } else {
        // Points for each lane crossed for the first time this level (not re-awarded after a crash).
        const crossed = lanes.filter(l => player.y < l.y - LANE_H / 2).length;
        if (crossed > levelProgress) {
          addScore((crossed - levelProgress) * PROGRESS_POINTS, player.x + 28, player.y);
          levelProgress = crossed;
          sfx.point();
        }
      }
      break;
    }

    case 'hit':                       // traffic freezes briefly after an accident
      stateTimer -= dt;
      if (hitReason === 'car') {        // slide and spin to a stop
        player.x = Math.min(W - PLAYER_SIZE / 2, Math.max(PLAYER_SIZE / 2, player.x + player.knockVx * dt));
        player.knockVx *= Math.exp(-3 * dt);
        player.spin += player.spinRate * dt;
        player.spinRate *= Math.exp(-2.5 * dt);
      }
      if (stateTimer <= 0) {
        if (lives > 0) { startAttempt(); state = 'playing'; }
        else {
          state = 'gameover';
          newHighScore = score > hiScore;
          saveHiScore();
          updateHud();
          sfx.gameOver();
        }
      }
      break;

    case 'levelup':
      lanes.forEach(l => updateLane(l, dt));
      stateTimer -= dt;
      if (stateTimer <= 0) {
        level++;
        levelProgress = 0;
        buildLanes();
        startAttempt();
        startCountdown();
        updateHud();
      }
      break;
  }
}

function updateHud() {
  document.getElementById('level').textContent = `Level ${level}`;
  document.getElementById('score').textContent = `Score ${score}`;
  document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, lives)) || '💀';
  document.getElementById('hiscore').textContent = `Hi ${Math.max(hiScore, score)}`;
  document.getElementById('sound').textContent = sound.muted ? 'off' : 'on';
  document.getElementById('muteBtn').textContent = sound.muted ? '🔇' : '🔊';
}
