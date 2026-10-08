// ---------- Visual effects: particles and screen shake ----------
// Particles are purely cosmetic: they never affect gameplay or collisions.
let particles = [];
let shakeTime = 0, shakeDuration = 1, shakeMag = 0;
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const CONFETTI_COLORS = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#ffffff'];

// kind: 'dot' (round), 'shard' (spinning rectangle) or 'smoke' (soft, growing circle).
// under: drawn beneath the vehicles (exhaust) instead of on top of everything.
function addParticle(p) {
  particles.push({ vx: 0, vy: 0, drag: 0, gravity: 0, grow: 0, spin: 0, rot: 0, alpha: 1, under: false,
                   ...p, max: p.life });
}

function shake(duration, magnitude) {
  if (reduceMotion) return;
  shakeTime = shakeDuration = duration;
  shakeMag = magnitude;
}

const fx = {
  crash(x, y, dir, color) {
    for (let i = 0; i < 18; i++) {           // sparks
      addParticle({ kind: 'dot', x, y, vx: dir * rand(60, 280) + rand(-80, 80), vy: rand(-220, 220),
                    life: rand(0.25, 0.55), size: rand(1.5, 3), color: '#ffd35a', drag: 3 });
    }
    for (let i = 0; i < 10; i++) {           // pieces of the car
      addParticle({ kind: 'shard', x, y, vx: dir * rand(40, 200), vy: rand(-150, 150), life: rand(0.6, 1.1),
                    size: rand(3, 6), color, drag: 4, spin: rand(-14, 14), rot: rand(0, 6) });
    }
    for (let i = 0; i < 8; i++) {            // dust cloud
      addParticle({ kind: 'smoke', x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-40, 40), vy: rand(-40, 40),
                    life: rand(0.6, 1), size: rand(5, 10), grow: 20, color: '#cfcfcf', alpha: 0.5, drag: 2 });
    }
    shake(0.4, 8);
  },

  confetti() {
    for (let i = 0; i < 80; i++) {
      addParticle({ kind: 'shard', x: rand(0, W), y: rand(-30, FINISH_H), vx: rand(-50, 50), vy: rand(40, 160),
                    life: rand(1.2, 2.2), size: rand(3, 6), color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                    gravity: 140, drag: 0.8, spin: rand(-10, 10), rot: rand(0, 6) });
    }
  },

  sparkle(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, speed = rand(80, 160);
      addParticle({ kind: 'dot', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                    life: rand(0.35, 0.6), size: rand(1.5, 3), color: i % 2 ? color : '#ffffff', drag: 4 });
    }
  },

  shieldBreak(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, speed = rand(120, 220);
      addParticle({ kind: 'shard', x: x + Math.cos(a) * 18, y: y + Math.sin(a) * 18,
                    vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: rand(0.4, 0.7), size: rand(4, 7),
                    color: '#8fd3ff', drag: 3, spin: rand(-12, 12), rot: a });
    }
  },

  exhaust(x, y, dir) {
    addParticle({ kind: 'smoke', x, y: y + rand(-2, 2), vx: -dir * rand(10, 30), vy: rand(-6, 6), life: 0.8,
                  size: 2, grow: 6, color: '#d2d2d2', alpha: 0.16, drag: 1.5, under: true });
  },
};

// Moving vehicles puff exhaust from their tailpipes every so often.
function emitExhaust(dt) {
  for (const lane of lanes) {
    for (const c of lane.cars) {
      c.puff = (c.puff ?? rand(0, 0.4)) - dt;
      if (c.puff > 0) continue;
      c.puff = rand(0.25, 0.5);
      const tailX = c.x - lane.dir * (c.w / 2 + 2);
      if (c.kind !== 'train' && c.v > 5 && tailX > 0 && tailX < W) fx.exhaust(tailX, lane.y + c.h / 4, lane.dir);
    }
  }
}

function updateEffects(dt) {
  for (const p of particles) {
    p.vx -= p.vx * Math.min(1, p.drag * dt);
    p.vy -= p.vy * Math.min(1, p.drag * dt);
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.spin * dt;
    p.size += p.grow * dt;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
  if (shakeTime > 0) shakeTime -= dt;
}

function drawParticles(under) {
  for (const p of particles) {
    if (p.under !== under) continue;
    ctx.globalAlpha = p.alpha * Math.min(1, p.life / p.max * 2);   // fade out over the second half of life
    ctx.fillStyle = p.color;
    if (p.kind === 'shard') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// Random offset for the whole scene while a shake is active; fades out over its duration.
function shakeOffset() {
  if (shakeTime <= 0) return [0, 0];
  const m = shakeMag * (shakeTime / shakeDuration);
  return [rand(-m, m), rand(-m, m)];
}
