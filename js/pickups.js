// ---------- Pickups & power-ups ----------
// Bonuses that appear in the traffic lanes for a few seconds; walk over one to collect it.
let pickups = [], pickupTimer = 0;
let slowTimer = 0;       // > 0 while traffic is slowed down
let invulnTimer = 0;     // > 0 for a moment after a shield absorbs a hit
let bootsTimer = 0;      // > 0 while wearing speed boots
let magnetTimer = 0;     // > 0 while coins are pulled in
let ghostTimer = 0;      // > 0 while vehicles pass through you

const PICKUP_TYPES = {
  coin:   { weight: 45, color: '#f1c40f' },                 // drawn as a spinning coin
  time:   { weight: 20, color: '#2ecc71', icon: '⏱' },
  shield: { weight: 15, color: '#3498db', icon: '🛡' },
  slow:   { weight: 12, color: '#1abc9c', icon: '🐢' },
  life:   { weight: 8,  color: '#e74c3c', icon: '❤️' },
  boots:  { weight: 12, color: '#e67e22', icon: '👟' },
  magnet: { weight: 8,  color: '#c0392b', icon: '🧲' },
  ghost:  { weight: 6,  color: '#8e9eff', icon: '👻' },
};

// Timed power-ups clear when a new attempt starts (new level, or after losing a life).
function clearPowerUps() {
  slowTimer = invulnTimer = bootsTimer = magnetTimer = ghostTimer = 0;
}

function resetPickups() {
  pickups = [];
  pickupTimer = pickupRand(PICKUP_MIN, PICKUP_MAX) / 2;
  clearPowerUps();
}

// Weighted random type, skipping ones that would be useless right now.
function pickPickupType() {
  const types = Object.keys(PICKUP_TYPES).filter(t =>
    !(t === 'life' && lives >= MAX_LIVES) && !(t === 'shield' && player.shield) && !(t === 'ghost' && ghostTimer > 0));
  let r = pickupRandom() * types.reduce((sum, t) => sum + PICKUP_TYPES[t].weight, 0);
  for (const t of types) {
    r -= PICKUP_TYPES[t].weight;
    if (r <= 0) return t;
  }
  return 'coin';
}

function spawnPickup() {
  const lane = pickFrom(lanes, pickupRandom);
  pickups.push({ type: pickPickupType(), x: pickupRand(40, W - 40), y: lane.y, t: PICKUP_LIFE, age: 0 });
}

function updatePickups(dt) {
  if ((pickupTimer -= dt) <= 0) {
    pickupTimer = pickupRand(PICKUP_MIN, PICKUP_MAX);
    if (pickups.length < 2) spawnPickup();
  }
  for (const p of pickups) {
    p.t -= dt;
    p.age += dt;
    if (magnetTimer > 0 && p.type === 'coin') {           // the magnet pulls nearby coins in
      const d = Math.hypot(player.x - p.x, player.y - p.y);
      if (d < MAGNET_RADIUS && d > 1) {
        const step = Math.min(d, MAGNET_PULL * dt);
        p.x += (player.x - p.x) / d * step;
        p.y += (player.y - p.y) / d * step;
        p.pulled = true;
      }
    }
    if (p.t > 0 && Math.hypot(p.x - player.x, p.y - player.y) < 22) {
      collectPickup(p);
      p.t = 0;
    }
  }
  pickups = pickups.filter(p => p.t > 0);
  slowTimer = Math.max(0, slowTimer - dt);
  invulnTimer = Math.max(0, invulnTimer - dt);
  bootsTimer = Math.max(0, bootsTimer - dt);
  magnetTimer = Math.max(0, magnetTimer - dt);
  ghostTimer = Math.max(0, ghostTimer - dt);
}

function collectPickup(p) {
  switch (p.type) {
    case 'coin':
      addScore(COIN_POINTS, p.x, p.y);
      break;
    case 'time':
      timeLeft = Math.min(TIME_LIMIT, timeLeft + TIME_PICKUP);
      lastTick = 0;
      addPopup(`+${TIME_PICKUP}s`, p.x, p.y);
      break;
    case 'life':
      lives = Math.min(MAX_LIVES, lives + 1);
      updateHud();
      addPopup('+1 life', p.x, p.y);
      break;
    case 'shield':
      player.shield = true;
      addPopup('Shield!', p.x, p.y);
      break;
    case 'boots':
      bootsTimer = BOOTS_TIME;
      addPopup('Speed boots!', p.x, p.y);
      break;
    case 'magnet':
      magnetTimer = MAGNET_TIME;
      addPopup('Coin magnet!', p.x, p.y);
      break;
    case 'ghost':
      ghostTimer = GHOST_TIME;
      addPopup('Ghost!', p.x, p.y);
      break;
    case 'slow':
      slowTimer = SLOW_TIME;
      addPopup('Slow traffic!', p.x, p.y);
      break;
  }
  fx.sparkle(p.x, p.y, PICKUP_TYPES[p.type].color);
  sfx.pickup(p.type);
  achOnPickup(p.type);
}

// The shield takes the hit instead of the player, then gives a moment of safety to get clear.
function breakShield(hit) {
  player.shield = false;
  invulnTimer = SHIELD_GRACE;
  fx.shieldBreak(player.x, player.y);
  shake(0.2, 4);
  sfx.shieldBreak();
  vibrate(80);
  hit.car.honked = true;
  unlockAchievement('shield');
}

// ---------- Pickup drawing ----------
function drawPickups(now) {
  for (const p of pickups) {
    if (p.t < 2 && Math.floor(now / 120) % 2) continue;      // blink before disappearing
    const pop = Math.min(1, p.age * 5);                       // pop in when spawned
    const bob = Math.sin(p.age * 4) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(pop, pop);
    if (p.type === 'coin') {
      const spin = Math.abs(Math.cos(p.age * 4)) * 0.8 + 0.2;  // edge-on ↔ face-on
      ctx.scale(spin, 1);
      ctx.fillStyle = '#b7950b';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f7d038';
      ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b7950b';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 1);
    } else {
      const glow = 0.6 + 0.4 * Math.sin(p.age * 6);
      ctx.fillStyle = PICKUP_TYPES[p.type].color;
      ctx.globalAlpha = 0.35 * glow;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';                                 // for platforms that draw the icon as plain text
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(PICKUP_TYPES[p.type].icon, 0, 1);
    }
    ctx.restore();
  }
}

// Bubble around the player while the shield is up.
function drawShield(x, y, now) {
  const pulse = 0.5 + 0.5 * Math.sin(now / 150);
  ctx.fillStyle = 'rgba(52,152,219,.15)';
  ctx.strokeStyle = `rgba(120,200,255,${0.5 + 0.4 * pulse})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 20 + pulse * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

// Blue tint over the road and a countdown badge while traffic is slowed; shield badge too.
function drawPowerUpStatus() {
  if (slowTimer > 0) {
    ctx.fillStyle = `rgba(60,150,255,${0.1 * Math.min(1, slowTimer)})`;
    ctx.fillRect(0, FINISH_H, W, H - FINISH_H - START_H);
  }
  const badges = [];
  if (player && player.shield) badges.push(['🛡', null]);
  if (slowTimer > 0) badges.push(['🐢', slowTimer / SLOW_TIME]);
  if (bootsTimer > 0) badges.push(['👟', bootsTimer / BOOTS_TIME]);
  if (magnetTimer > 0) badges.push(['🧲', magnetTimer / MAGNET_TIME]);
  if (ghostTimer > 0) badges.push(['👻', ghostTimer / GHOST_TIME]);
  badges.forEach(([icon, frac], i) => {
    const x = 22 + i * 34, y = H - START_H / 2 - 4;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
    if (frac !== null) {                                       // ring showing time remaining
      ctx.strokeStyle = '#1abc9c';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = '15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y + 1);
  });
}

// Magnet: a pulsing ring showing its reach. Ghost: drawn in drawPlayer (translucent, blue).
function drawMagnetField(now) {
  if (magnetTimer <= 0 || state === 'title') return;
  const pulse = (now / 900) % 1;
  ctx.strokeStyle = `rgba(231,76,60,${0.35 * (1 - pulse) * Math.min(1, magnetTimer)})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(player.x, player.y, 24 + pulse * (MAGNET_RADIUS - 24), 0, Math.PI * 2); ctx.stroke();
}
