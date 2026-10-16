// ---------- Game flow ----------
import { G } from './store.js';
import { BOOTS_SPEED, BOSS_BONUS, COUNTDOWN_STEP, EMERGENCY_LEVEL, FINISH_H, H, LANE_H, LEVELUP_TIME, LEVEL_POINTS, PLAYER_SIZE, PLAYER_SPEED, PROGRESS_POINTS, RUBBLE_SPEED, SLOW_FACTOR, START_H, START_LIVES, TIME_LIMIT, TIME_POINTS, W, fxRand } from './config.js';
import { keys, saveHiScore } from './state.js';
import { sfx, sound } from './sound.js';
import { addParticle, emitExhaust, fx, updateEffects } from './effects.js';
import { buildLanes, dispatchEmergency, silenceSiren, updateTraffic } from './traffic.js';
import { emitParadeConfetti, inRubble } from './boss.js';
import { emitWeatherEffects, updateWeather, weatherIcons } from './weather.js';
import { blockedAt, hitsCar, honkAtPlayer, resetPlayer } from './player.js';
import { breakShield, clearPowerUps, resetPickups, updatePickups } from './pickups.js';
import { checkSkinUnlocks } from './skins.js';
import { dailyLevelDone, finishDaily, startDaily } from './daily.js';
import { updateTips } from './tutorial.js';
import { achOnLevelComplete, achOnLifeLost, achOnNewGame, achOnNewLevel, achOnScore, achUpdate, pumpToasts } from './achievements.js';
import { vibrate } from './input.js';
import { ENDLESS_PAUSE, endlessLanesCrossed, endlessLevel, finishEndless, isEndless, resetEndless } from './endless.js';

// newMode: 'normal', 'daily' or 'practice' (which may start at any level).
export function newGame(newMode = 'normal', startLevel = 1) {
  G.mode = newMode;
  if (G.mode === 'daily') startDaily();
  G.level = startLevel;
  G.practiceLevel = startLevel;
  resetEndless();
  G.lives = newMode === 'endless' ? 1 : START_LIVES;    // endless: one life
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

// 3-2-1 before each level: traffic flows, but the man can't move and the clock doesn't run yet.
export function startCountdown() {
  G.state = 'countdown';
  G.stateTimer = COUNTDOWN_STEP * 3;
  sfx.count();
}

// Every attempt (new level or after losing a life) starts on the sidewalk with a full clock.
export function startAttempt() {
  resetPlayer();
  G.timeLeft = TIME_LIMIT;
  G.lastTick = 0;
  clearPowerUps();
}

export function addPopup(text, x, y) {
  G.popups.push({ text, x, y, t: 1 });
}

export function addScore(points, x, y) {
  const oldScore = G.score;
  G.score += points;
  checkSkinUnlocks(oldScore);
  achOnScore();
  addPopup(`+${points}`, x, y);
  updateHud();
}

// `hit` is the { car, lane } that ran the player over, if any.
export function loseLife(reason, hit) {
  G.lives--;
  achOnLifeLost();
  G.hitReason = reason;
  G.state = 'hit';
  G.stateTimer = 1.2;
  updateHud();
  // Cancel any announced emergency vehicle, since traffic freezes and the siren would be out of sync.
  silenceSiren();
  for (const l of G.lanes) l.emergency = null;
  if (reason === 'car') {
    // Thrown aside in the car's direction of travel, spinning.
    const dir = hit.lane.dir;
    G.player.knockVx = dir * Math.min(hit.car.v + 80, 320);
    G.player.spinRate = dir * 14;
    fx.crash(G.player.x, G.player.y, dir, hit.car.kind === 'emergency' ? '#f8f8f8' : hit.car.color);
    sfx.crash();
    vibrate(250);
  } else {
    sfx.timeUp();
    vibrate(120);
  }
}

export function update(dt) {
  if (G.state !== 'paused') {
    for (const p of G.popups) { p.t -= dt; p.y -= 30 * dt; }
    G.popups = G.popups.filter(p => p.t > 0);
    G.goTimer = Math.max(0, G.goTimer - dt);
    if (G.banner && (G.banner.t -= dt) <= 0) G.banner = null;
    pumpToasts();
    updateTips(dt);
    updateEffects(dt);
    updateWeather(dt);
    if (G.state !== 'hit') {                   // traffic is frozen during 'hit'
      emitExhaust(dt);
      emitWeatherEffects(dt);
      emitParadeConfetti(dt);
    }
  }

  switch (G.state) {
    case 'title':
    case 'gameover':
      updateTraffic(dt);
      break;

    case 'countdown': {
      updateTraffic(dt);
      const before = Math.ceil(G.stateTimer / COUNTDOWN_STEP);
      G.stateTimer -= dt;
      const after = Math.ceil(G.stateTimer / COUNTDOWN_STEP);
      if (G.stateTimer <= 0) {
        G.state = 'playing';
        G.goTimer = 0.7;
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
        const speed = PLAYER_SPEED * (G.bootsTimer > 0 ? BOOTS_SPEED : 1) * (inRubble() ? RUBBLE_SPEED : 1);
        const dist = speed * dt / Math.hypot(dx, dy);          // same speed diagonally
        // Stopped vehicles block the way (each axis separately, so you can slide along them).
        const nx = Math.min(W - PLAYER_SIZE / 2, Math.max(PLAYER_SIZE / 2, G.player.x + dx * dist));
        const ny = Math.min(H - START_H / 2, Math.max(FINISH_H / 2, G.player.y + dy * dist));
        if (!blockedAt(nx, G.player.y)) G.player.x = nx;
        if (!blockedAt(G.player.x, ny)) G.player.y = ny;
        G.player.angle = Math.atan2(dx, -dy);                    // 0 = facing up, clockwise
        G.player.walk += dt * (G.bootsTimer > 0 ? 19 : 12);
        if (G.bootsTimer > 0 && fxRand(0, 1) < dt * 25) {          // dust kicked up by the speed boots
          addParticle({ kind: 'smoke', x: G.player.x - dx * 8, y: G.player.y - dy * 8, vx: -dx * 30, vy: -dy * 30,
                        life: 0.4, size: 2, grow: 10, color: '#d9c7a3', alpha: 0.4, drag: 3, under: true });
        }
        const step = Math.floor(G.player.walk / Math.PI);   // one footstep per half walk cycle
        if (step !== G.player.lastStep) { G.player.lastStep = step; sfx.step(); }
      }
      // Turn smoothly toward the direction of travel (along the shorter way round).
      const turn = Math.atan2(Math.sin(G.player.angle - G.player.shownAngle), Math.cos(G.player.angle - G.player.shownAngle));
      G.player.shownAngle += turn * Math.min(1, dt * 14);
      const trafficDt = G.slowTimer > 0 ? dt * SLOW_FACTOR : dt;   // slow-traffic power-up
      updateTraffic(trafficDt);
      honkAtPlayer();
      achUpdate(dt);
      if (G.level >= EMERGENCY_LEVEL && (G.emergencyTimer -= trafficDt) <= 0) dispatchEmergency();
      updatePickups(dt);

      G.timeLeft -= dt;
      const sec = Math.ceil(G.timeLeft);
      if (sec <= 5 && sec > 0 && sec !== G.lastTick) { G.lastTick = sec; sfx.tick(); }

      const hit = G.invulnTimer > 0 || G.ghostTimer > 0 ? null : hitsCar();   // shield grace, or a ghost
      if (hit && G.player.shield) {
        breakShield(hit);
      } else if (hit) {
        loseLife('car', hit);
      } else if (G.timeLeft <= 0) {
        loseLife('time');
      } else if (G.player.y + PLAYER_SIZE / 2 < FINISH_H && isEndless()) {
        G.endless.roads++;                       // endless: straight on to the next, faster road
        G.state = 'levelup';
        G.stateTimer = ENDLESS_PAUSE;
        silenceSiren();
        fx.sparkle(G.player.x, G.player.y, '#2ecc71');
        sfx.levelUp();
      } else if (G.player.y + PLAYER_SIZE / 2 < FINISH_H) {
        const levelPoints = LEVEL_POINTS * G.level * (G.boss ? 2 : 1);   // boss levels: double, plus a bonus
        const bossPoints = G.boss ? BOSS_BONUS : 0;
        const timePoints = Math.ceil(G.timeLeft) * TIME_POINTS;
        G.levelBonus = { levelPoints, timePoints, bossPoints };
        addScore(levelPoints + timePoints + bossPoints, G.player.x, G.player.y);
        G.state = 'levelup';
        G.stateTimer = LEVELUP_TIME;
        silenceSiren();
        dailyLevelDone();
        achOnLevelComplete();
        fx.confetti();
        sfx.levelUp();
      } else {
        // Points for each lane crossed for the first time this level (not re-awarded after a crash).
        const crossed = G.lanes.filter(l => G.player.y < l.y - LANE_H / 2).length;
        if (crossed > G.levelProgress) {
          addScore((crossed - G.levelProgress) * PROGRESS_POINTS, G.player.x + 28, G.player.y);
          if (isEndless()) endlessLanesCrossed(crossed - G.levelProgress);
          G.levelProgress = crossed;
          sfx.point();
        }
      }
      break;
    }

    case 'hit':                       // traffic freezes briefly after an accident
      G.stateTimer -= dt;
      if (G.hitReason === 'car') {        // slide and spin to a stop
        G.player.x = Math.min(W - PLAYER_SIZE / 2, Math.max(PLAYER_SIZE / 2, G.player.x + G.player.knockVx * dt));
        G.player.knockVx *= Math.exp(-3 * dt);
        G.player.spin += G.player.spinRate * dt;
        G.player.spinRate *= Math.exp(-2.5 * dt);
      }
      if (G.stateTimer <= 0) {
        if (G.lives > 0) { startAttempt(); G.state = 'playing'; }
        else {
          G.state = 'gameover';
          G.newHighScore = !['practice', 'endless'].includes(G.mode) && G.score > G.hiScore;
          if (isEndless()) finishEndless();
          saveHiScore();
          if (G.mode === 'daily') finishDaily();
          updateHud();
          sfx.gameOver();
        }
      }
      break;

    case 'levelup':
      updateTraffic(dt);
      G.stateTimer -= dt;
      if (G.stateTimer <= 0 && isEndless()) {   // endless: no countdown, just GO
        G.level = endlessLevel(G.endless.roads);
        G.levelProgress = 0;
        achOnNewLevel();
        buildLanes();
        resetPickups();
        startAttempt();
        G.state = 'playing';
        G.goTimer = 0.7;
        sfx.start();
        updateHud();
      } else if (G.stateTimer <= 0) {
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

export function updateHud() {
  const modeIcon = { daily: '📅 ', practice: '🎯 ' }[G.mode] || '';
  if (isEndless()) {
    document.getElementById('level').textContent = `♾️ Road ${G.endless.roads + 1}${weatherIcons()}`;
    document.getElementById('score').textContent = `Lanes ${G.endless.lanes}`;
    document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, G.lives)) || '💀';
    document.getElementById('hiscore').textContent = `Best ${Math.max(G.endlessBest, G.endless.lanes)}`;
    document.getElementById('sound').textContent = sound.muted ? 'off' : 'on';
    document.getElementById('muteBtn').textContent = sound.muted ? '🔇' : '🔊';
    return;
  }
  document.getElementById('level').textContent = `${modeIcon}Level ${G.level}${G.boss ? ' 👑' : ''}${weatherIcons()}`;
  document.getElementById('score').textContent = `Score ${G.score}`;
  document.getElementById('lives').textContent = '❤️'.repeat(Math.max(0, G.lives)) || '💀';
  document.getElementById('hiscore').textContent = `Hi ${G.mode === 'practice' ? G.hiScore : Math.max(G.hiScore, G.score)}`;
  document.getElementById('sound').textContent = sound.muted ? 'off' : 'on';
  document.getElementById('muteBtn').textContent = sound.muted ? '🔇' : '🔊';
}
