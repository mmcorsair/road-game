// ---------- First-time tips ----------
// Each tip appears once ever, the first time its situation actually happens, and points at the thing
// it explains. Hazard tips briefly slow the game down so there's time to read them. Tips never change
// the simulation itself (slow motion only stretches real time), so the daily challenge is unaffected.
import { G } from './store.js';
import { FINISH_H, H, MEDIAN_H, MEDIAN_Y, START_H, TIME_LIMIT, W } from './config.js';
import { vehicleY } from './lanechange.js';
import { ctx, touchUI } from './render.js';

export const TIPS = {
  move:     { icon: '👣', text: () => touchUI()
              ? 'Hold the arrows (or drag on the road) to walk to the green FINISH.'
              : 'Use the arrow keys or WASD to walk to the green FINISH.' },
  clock:    { icon: '⏱', text: 'Beat the clock: every second left at the finish is bonus points.' },
  median:   { icon: '🌿', text: 'The grass strip in the middle is safe. Catch your breath here.' },
  pickup:   { icon: '🪙', text: 'Grab bonuses: 🪙 points · ⏱ time · 🛡 shield · 🐢 slow traffic · ❤️ life · 👟 speed · 🧲 coin magnet · 👻 ghost.' },
  parade:   { icon: '🎉', text: 'BOSS: the Parade! Floats fill the lanes by the median — slip through a gap, rest on the grass, then the next.' },
  highway:  { icon: '🛣', text: 'BOSS: the Highway! Everything is fast and changes lanes a lot. Wait for a really big gap.' },
  roadworks: { icon: '🚧', text: 'BOSS: Roadworks! Closed lanes are free of traffic, but rubble slows you — and watch the steamroller.' },
  rain:     { icon: '🌧', text: 'Rain: wet brakes slip, so cars slide when they stop. Give them extra room.' },
  night:    { icon: '🌙', text: 'Night: watch for headlights. Street lamps light the safe spots.' },
  bus:      { icon: '🚌', text: 'A bus stops to let passengers off. Cars swerve around it — watch the next lane!' },
  signal:   { icon: '🟧', text: 'Blinking orange lights: that vehicle is about to change lanes.', hazard: true },
  reversal: { icon: '⇄', text: 'Blinking arrows: this lane is about to reverse direction.', hazard: true },
  siren:    { icon: '🚑', text: 'Siren and flashing lights: an ambulance is coming fast in that lane.', hazard: true },
  train:    { icon: '🚆', text: 'Red lights and a bell: a train is coming. Stay off the tracks!', hazard: true },
};
export const TIP_TIME = 5;            // seconds a tip stays up
export const TIP_SLOWMO = 0.35;       // game speed while a hazard tip first appears
export const TIP_SLOWMO_TIME = 1.4;   // real seconds of slow motion

G.seenTips = new Set((() => { try { return JSON.parse(localStorage.getItem('roadCrossingTips')) || []; } catch { return []; } })());
G.activeTip = null;          // { id, t, max, target: () => ({x, y}) | null }
G.tipQueue = [];
G.tipSlow = 0;

export function saveSeenTips() {
  try { localStorage.setItem('roadCrossingTips', JSON.stringify([...G.seenTips])); } catch {}
}

export function showTip(id, target = null) {
  if (G.seenTips.has(id) || (G.activeTip && G.activeTip.id === id) || G.tipQueue.some(q => q.id === id)) return;
  const tip = { id, t: TIP_TIME, max: TIP_TIME, target };
  if (!G.activeTip) return startTip(tip);
  if (TIPS[id].hazard && !TIPS[G.activeTip.id].hazard) {    // hazards go first; the current tip waits
    G.tipQueue.unshift({ ...G.activeTip, t: TIP_TIME, max: TIP_TIME });
    G.seenTips.delete(G.activeTip.id);
    return startTip(tip);
  }
  G.tipQueue.push(tip);
}

export function startTip(tip) {
  G.activeTip = tip;
  G.seenTips.add(tip.id);
  saveSeenTips();
  if (TIPS[tip.id].hazard) G.tipSlow = TIP_SLOWMO_TIME;
}

export function dismissTip() {
  if (G.activeTip) G.activeTip.t = Math.min(G.activeTip.t, 0.3);   // quick fade-out
}

export function replayTips() {
  G.seenTips = new Set();
  saveSeenTips();
  G.activeTip = null;
  G.tipQueue = [];
  G.banner = { text: '💡 Tips will show again', t: 2 };
}

// Real-time multiplier for the main loop: slow motion while a hazard tip is fresh.
export function tipTimeScale(realDt) {
  if (G.tipSlow <= 0) return 1;
  G.tipSlow -= realDt;
  return TIP_SLOWMO;
}

// Called every simulation step (not while paused): advance the current tip and watch for new situations.
export function updateTips(dt) {
  if (G.activeTip && (G.activeTip.t -= dt) <= 0) {
    G.activeTip = null;
    if (G.tipQueue.length) startTip(G.tipQueue.shift());
  }
  if (G.state !== 'playing' && G.state !== 'countdown') {
    if (G.state !== 'hit') dismissTip();
    return;
  }
  const atPlayer = () => ({ x: G.player.x, y: G.player.y });

  showTip('move', atPlayer);
  if (G.activeTip && G.activeTip.id === 'move' && G.activeTip.t > 0.3) {
    G.activeTip.from ??= { x: G.player.x, y: G.player.y };
    G.activeTip.t = Math.max(G.activeTip.t, 1);                  // stays until the player has walked a bit
    if (Math.hypot(G.player.x - G.activeTip.from.x, G.player.y - G.activeTip.from.y) > 40) dismissTip();
  }
  if (G.boss) showTip(G.boss);
  if (G.weather.rain) showTip('rain');
  if (G.weather.night) showTip('night');
  if (G.state !== 'playing') return;

  if (G.timeLeft < TIME_LIMIT - 6 && G.seenTips.has('move')) showTip('clock', () => ({ x: W - 30, y: H - 14 }));
  if (G.player.y > MEDIAN_Y && G.player.y < MEDIAN_Y + MEDIAN_H) showTip('median', atPlayer);
  const p = G.pickups.find(pk => pk.age < 1);
  if (p) showTip('pickup', () => ({ x: p.x, y: p.y }));

  for (const lane of G.lanes) {
    const bus = lane.cars.find(c => c.kind === 'bus' && c.dwell);
    if (bus) showTip('bus', () => ({ x: bus.x, y: lane.y }));
    if (lane.draining) showTip('reversal', () => ({ x: W / 2, y: lane.y }));
    if (lane.emergency) showTip('siren', () => ({ x: lane.dir > 0 ? 16 : W - 16, y: lane.y }));
    if (lane.rail && lane.rail.phase === 'warning') showTip('train', () => ({ x: W / 2, y: lane.y }));
    for (const c of lane.cars) {
      if (c.signal && c.x > 30 && c.x < W - 30) {
        showTip('signal', () => {
          const l = G.lanes.find(ln => ln.cars.includes(c));
          return l ? { x: c.x, y: vehicleY(c, l) } : null;
        });
      }
    }
  }
}

// Splits text into lines that fit maxWidth (in the current ctx font).
export function wrapText(text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const tryLine = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(tryLine).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = tryLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawTip(now) {
  if (!G.activeTip) return;
  const tip = TIPS[G.activeTip.id];
  const alpha = Math.max(0, Math.min(1, (G.activeTip.max - G.activeTip.t) * 4, G.activeTip.t * 3));
  const target = G.activeTip.target && G.activeTip.target();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '600 14px system-ui, sans-serif';
  const text = typeof tip.text === 'function' ? tip.text() : tip.text;
  const lines = wrapText(text, W - 90);
  const boxH = 22 + lines.length * 19;
  // Card near the top of the road, or near the bottom if the thing it points at is up there.
  const top = target && target.y < FINISH_H + 140 ? H - START_H - boxH - 14 : FINISH_H + 50;

  if (target) {                                              // pulsing ring + pointer line to the target
    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    ctx.strokeStyle = '#ffe36e';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(W / 2, top < target.y ? top + boxH : top);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 22 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(15,20,30,.92)';
  ctx.strokeStyle = '#ffe36e';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(12, top, W - 24, boxH, 12); ctx.fill(); ctx.stroke();
  ctx.font = '24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(tip.icon, 40, top + boxH / 2);
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => ctx.fillText(line, 64, top + 20 + i * 19));
  ctx.restore();
}
