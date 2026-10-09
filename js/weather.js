// ---------- Weather: rain and night ----------
// Rain: wet brakes grip much less (RAIN_BRAKE), so a braking vehicle slides on, fishtails and leaves
// skid marks; drivers keep a longer following distance. Night: everything is dark except what lights
// it — headlight beams, street lamps, the player's glow and glowing warnings.
// Weather depends only on the level, so the daily challenge has the same weather for everyone.
let weather = { rain: false, night: false };

function weatherFor(lvl) {
  if (lvl < 2) return { rain: false, night: false };
  if (lvl === 2) return { rain: true, night: false };
  if (lvl === 3) return { rain: false, night: true };
  const k = (lvl - 4) % 4;                              // then: clear, rain, night, rainy night, …
  return { rain: k === 1 || k === 3, night: k === 2 || k === 3 };
}

const brakeDecel = () => (weather.rain ? RAIN_BRAKE : BRAKE);
const followDist = () => (weather.rain ? RAIN_FOLLOW_DIST : FOLLOW_DIST);

// Called from moveVehicles for every vehicle: a vehicle "skids" while it wants to shed more speed
// than its wet brakes can. c.skid (0…1) only drives visuals and sounds, never the physics.
function updateSkid(c, target, dt) {
  const sliding = weather.rain && c.v - target > RAIN_BRAKE * 0.25;
  c.skid = sliding ? Math.min(1, (c.skid || 0) + dt * 5) : Math.max(0, (c.skid || 0) - dt * 2.5);
  c.skidT = c.skid > 0 ? (c.skidT || 0) + dt : 0;
}

// Fishtail angle while skidding (radians, in the vehicle's direction of travel).
const skidYaw = c => (c.skid ? Math.sin(c.skidT * 13) * 0.13 * c.skid : 0);

function weatherHint(lvl) {
  const w = weatherFor(lvl);
  if (w.rain && w.night) return '🌧🌙 Next: a rainy night — slippery and dark!';
  if (w.rain) return '🌧 Next: rain — cars slide when they brake!';
  if (w.night) return '🌙 Next: night — watch for headlights!';
  return null;
}

const weatherIcons = () => (weather.rain ? ' 🌧' : '') + (weather.night ? ' 🌙' : '');

// ---------- Cosmetic weather effects (fxRand only: never touches gameplay randomness) ----------
let skidMarks = [];            // { x1, y1, x2, y2, a } fading tyre marks on the road
let raindrops = [];
let puddles = [];
let squealCooldown = 0;
let stopRainSound = null;

function setupWeatherScene() {
  skidMarks = [];
  raindrops = Array.from({ length: liteMode ? 60 : 140 }, () => ({ x: fxRand(0, W + 80), y: fxRand(0, H), len: fxRand(10, 18),
                                                   speed: fxRand(650, 900) }));
  puddles = Array.from({ length: 9 }, () => ({ x: fxRand(20, W - 20), y: fxRand(FINISH_H + 10, H - START_H - 10),
                                               rx: fxRand(14, 34), ry: fxRand(5, 10), phase: fxRand(0, 6) }));
}

function updateWeather(dt) {
  for (const m of skidMarks) m.a -= dt / 5;
  skidMarks = skidMarks.filter(m => m.a > 0);
  if (weather.rain) {
    for (const d of raindrops) {
      d.y += d.speed * dt;
      d.x -= d.speed * 0.12 * dt;
      if (d.y > H) { d.y -= H + 20; d.x = fxRand(0, W + 80); }
    }
  }
  squealCooldown = Math.max(0, squealCooldown - dt);

  // Steady rain sound while a rainy level is being played.
  const wantRain = weather.rain && ['countdown', 'playing', 'hit', 'levelup'].includes(state);
  if (wantRain && !stopRainSound) stopRainSound = sfx.rainLoop();
  if (!wantRain && stopRainSound) { stopRainSound(); stopRainSound = null; }
}

// Spray, splashes, skid marks and squeals; called each step while traffic is moving.
function emitWeatherEffects(dt) {
  if (!weather.rain) return;
  if (fxRand(0, 1) < dt * (liteMode ? 10 : 30)) {                       // raindrops splashing on the road
    addParticle({ kind: 'ring', x: fxRand(0, W), y: fxRand(FINISH_H, H - START_H), life: 0.35, size: 1,
                  grow: 16, color: '#c9d6e6', alpha: 0.5, under: true });
  }
  for (const lane of lanes) {
    for (const c of lane.cars) {
      if (c.kind === 'train' || c.x < -40 || c.x > W + 40) continue;
      const y = vehicleY(c, lane), tailX = c.x - lane.dir * c.w / 2;
      c.spray = (c.spray ?? fxRand(0, 0.1)) - dt;
      if (c.v > 40 && c.spray <= 0 && !liteMode) {      // tyre spray behind moving vehicles
        c.spray = fxRand(0.05, 0.12);
        addParticle({ kind: 'smoke', x: tailX, y: y + fxRand(-c.h / 3, c.h / 3), vx: -lane.dir * fxRand(20, 50),
                      vy: fxRand(-10, 10), life: 0.5, size: 3, grow: 16, color: '#d8e2ee', alpha: 0.13,
                      drag: 2, under: true });
      }
      if (c.skid > 0.25) {                              // black tyre marks from both rear wheels
        for (const side of [-1, 1]) {
          const ty = y + side * (c.h / 2 - 4);
          const key = side < 0 ? 'markA' : 'markB';
          const prev = c[key];
          if (prev && Math.abs(prev.x - tailX) < 30) {
            skidMarks.push({ x1: prev.x, y1: prev.y, x2: tailX, y2: ty, a: 0.6 * c.skid });
          }
          c[key] = { x: tailX, y: ty };
        }
        if (c.skid > 0.5 && !c.squealed && squealCooldown <= 0 && state === 'playing') {
          sfx.squeal((c.x - W / 2) / (W / 2));
          squealCooldown = 0.7;
          c.squealed = true;
        }
      } else {
        c.markA = c.markB = null;
        if (c.skid === 0) c.squealed = false;
      }
    }
  }
  if (skidMarks.length > 400) skidMarks.splice(0, skidMarks.length - 400);
}

// Wet road: darker, with shimmering puddles. Drawn under the vehicles.
function drawWetRoad(now) {
  if (weather.rain) {
    ctx.fillStyle = 'rgba(20,35,60,.25)';
    ctx.fillRect(0, FINISH_H, W, H - FINISH_H - START_H);
    for (const p of puddles) {
      ctx.fillStyle = `rgba(170,195,225,${0.12 + 0.06 * Math.sin(now / 400 + p.phase)})`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  for (const m of skidMarks) {
    ctx.strokeStyle = `rgba(10,10,10,${m.a})`;
    ctx.beginPath(); ctx.moveTo(m.x1, m.y1); ctx.lineTo(m.x2, m.y2); ctx.stroke();
  }
}

function drawRain() {
  if (!weather.rain) return;
  ctx.strokeStyle = 'rgba(200,215,235,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const d of raindrops) {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.len * 0.12, d.y - d.len);
  }
  ctx.stroke();
}

// ---------- Night ----------
let nightCanvas = null, nctx = null;
const LAMPS = [];
for (const x of [60, 240, 420]) {
  LAMPS.push({ x, y: MEDIAN_Y + MEDIAN_H / 2 }, { x, y: H - START_H + 14 }, { x, y: FINISH_H - 18 });
}
const BEAM_LENGTH = { car: 150, bike: 120, truck: 170, bus: 160, emergency: 170, train: 230 };

// Light shapes are drawn once into small sprites and stamped each frame (creating dozens of
// gradients per frame was the main cost of night levels). Black = light: with 'destination-out'
// the sprite's alpha cuts a soft hole in the darkness.
const NIGHT_SCALE = 0.5;          // the darkness layer is drawn at half the game's resolution, then smoothed
let poolSprite = null, beamSprite = null, warmBeamSprite = null;

function makeSprite(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'));
  return c;
}

// A headlight cone pointing right: narrow at x = 0, wide and faded at the far end.
function paintBeam(g, rgb) {
  const grad = g.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, 24); g.lineTo(128, 0); g.lineTo(128, 64); g.lineTo(0, 40);
  g.closePath();
  g.fill();
}

function makeLightSprites() {
  poolSprite = makeSprite(64, 64, g => {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });
  beamSprite = makeSprite(128, 64, g => paintBeam(g, '0,0,0'));
  warmBeamSprite = makeSprite(128, 64, g => paintBeam(g, '255,220,140'));
}

// Soft circle of light of radius r.
function lightPool(g, x, y, r, strength = 0.9) {
  g.globalAlpha = strength;
  g.drawImage(poolSprite, x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

// Headlight beam from the vehicle's front, in its direction of travel.
function beam(g, c, y, dir, sprite = beamSprite, strength = 0.95) {
  const len = BEAM_LENGTH[c.kind] || 150;
  g.save();
  g.translate(c.x + dir * c.w / 2, y);
  g.scale(dir, 1);
  g.globalAlpha = strength;
  g.drawImage(sprite, 0, -38, len, 76);
  g.restore();
}

function drawNight(now) {
  if (!weather.night) return;
  if (!nightCanvas) {
    nightCanvas = document.createElement('canvas');
    nightCanvas.width = W * NIGHT_SCALE;
    nightCanvas.height = H * NIGHT_SCALE;
    nctx = nightCanvas.getContext('2d');
    nctx.scale(NIGHT_SCALE, NIGHT_SCALE);
    makeLightSprites();
  }
  nctx.globalCompositeOperation = 'source-over';
  nctx.clearRect(0, 0, W, H);
  nctx.fillStyle = 'rgba(4,8,22,.84)';
  nctx.fillRect(0, 0, W, H);

  // Everything that gives light cuts a hole in the darkness.
  nctx.globalCompositeOperation = 'destination-out';
  for (const l of LAMPS) lightPool(nctx, l.x, l.y, 68);
  if (state !== 'title') lightPool(nctx, player.x, player.y, 38);
  for (const p of pickups) lightPool(nctx, p.x, p.y, 24, 0.8);
  for (const lane of lanes) {
    if (lane.draining) for (const x of [W * 0.15, W * 0.5, W * 0.85]) lightPool(nctx, x, lane.y, 26, 0.7);
    if (lane.emergency) lightPool(nctx, lane.dir > 0 ? 16 : W - 16, lane.y, 36);
    if (lane.rail && lane.rail.phase !== 'idle') {
      lightPool(nctx, 16, lane.y, 34);
      lightPool(nctx, W - 16, lane.y, 34);
    }
    for (const c of lane.cars) {
      const y = vehicleY(c, lane);
      beam(nctx, c, y, lane.dir);
      lightPool(nctx, c.x, y, Math.min(c.w / 2 + 10, 60), 0.3);    // faintly lit body
      if (c.kind === 'emergency') lightPool(nctx, c.x, y, 75, 0.6);
    }
  }
  // A faint warm colour inside the beams, painted into the same low-resolution layer (much cheaper
  // than a separate full-screen blend on the main canvas).
  nctx.globalCompositeOperation = 'source-over';
  for (const lane of lanes) for (const c of lane.cars) beam(nctx, c, vehicleY(c, lane), lane.dir, warmBeamSprite, 0.16);

  ctx.drawImage(nightCanvas, 0, 0, W, H);                // scaled up; smoothing keeps it soft
  drawNightLights(now);
}

function drawNightLights(now) {
  for (const l of LAMPS) {
    ctx.fillStyle = 'rgba(255,214,140,.35)';
    ctx.beginPath(); ctx.arc(l.x, l.y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe6b0';
    ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, Math.PI * 2); ctx.fill();
  }
  for (const lane of lanes) {
    for (const c of lane.cars) {
      const y = vehicleY(c, lane);
      ctx.save();
      ctx.translate(c.x, y);
      if (lane.dir < 0) ctx.scale(-1, 1);              // front points to +x
      const { w, h } = c;
      const glow = (x, yy, r, color) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, yy, r, 0, Math.PI * 2); ctx.fill();
      };
      if (c.kind === 'train') {
        glow(w / 2 - 2, 0, 4, '#fff6c8');
        glow(-w / 2 + 2, 0, 3, '#ff3030');
      } else {
        const ys = c.kind === 'bike' ? [0] : [-h / 2 + 6, h / 2 - 6];
        for (const yy of ys) {
          glow(w / 2 - 2, yy, 5, 'rgba(255,246,200,.45)');          // headlights
          glow(w / 2 - 2, yy, 2.2, '#fffbe6');
          glow(-w / 2 + 1, yy, c.braking ? 6 : 4, c.braking ? 'rgba(255,30,30,.55)' : 'rgba(255,30,30,.3)');
          glow(-w / 2 + 1, yy, 1.8, c.braking ? '#ff4040' : '#c01818');   // tail / brake lights
        }
        if (c.kind === 'emergency') {
          const red = Math.floor(now / 120) % 2;
          glow(w / 2 - 31, -h / 4, 5, red ? '#ff3030' : '#601010');
          glow(w / 2 - 31, h / 4, 5, red ? '#102060' : '#3a7bff');
        }
        drawTurnSignals(c, now);
        drawBusHazards(c, now);
      }
      ctx.restore();
    }
    if (lane.rail && lane.rail.phase !== 'idle') {
      const flash = Math.floor(now / 300) % 2;
      drawCrossingSignal(16, lane.y, true, flash);
      drawCrossingSignal(W - 16, lane.y, true, flash);
    }
  }
  drawReversibleLanes(now, true);
  drawEmergencyWarnings(now);
  drawPickups(now);
}
