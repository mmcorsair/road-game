// ---------- Daily challenge ----------
// Everyone gets the same roads on a given (local) day: each level's traffic and pickups come from
// generators seeded by the date and the level number, so level 4 is the same for everyone no matter
// how long levels 1–3 took. Retries are allowed; the day's best result can be shared, Wordle-style.
import { G } from './store.js';
import { sound } from './sound.js';
import { achOnDailyFinished, unlockAchievement } from './achievements.js';
import { gameInProgress } from './menu.js';
import { newGame } from './game.js';

// mulberry32: a tiny seeded generator returning numbers in [0, 1).
export function seededRandom(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a: turns a string like "2026-10-08/4/traffic" into a 32-bit seed.
export function hashString(s) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function todayKey() {
  if (G.todayOverride) return G.todayOverride;          // fixed date (tests)
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

G.dailyDate = todayKey();     // fixed when a daily game starts, so midnight doesn't change it mid-game
G.dailyRow = [];              // 🟩 per completed level, 💥 where the game ended
G.dailyStats = null;          // today's stats, shown on the game-over screen

// Called by buildLanes() at the start of every level.
export function seedRandomness() {
  if (G.mode === 'daily') {
    G.gameRandom = seededRandom(hashString(`${G.dailyDate}/${G.level}/traffic`));
    G.pickupRandom = seededRandom(hashString(`${G.dailyDate}/${G.level}/pickups`));
  } else if (G.testSeed != null) {                     // repeatable normal games (tests)
    G.gameRandom = seededRandom(hashString(`${G.testSeed}/${G.level}/traffic`));
    G.pickupRandom = seededRandom(hashString(`${G.testSeed}/${G.level}/pickups`));
  } else {
    G.gameRandom = G.pickupRandom = Math.random;
  }
}

export function loadDailyStats() {
  try {
    const s = JSON.parse(localStorage.getItem('roadCrossingDaily'));
    if (s && s.date === todayKey()) return s;
  } catch {}
  return { date: todayKey(), attempts: 0, best: null };
}

export function startDaily() {
  G.dailyDate = todayKey();
  G.dailyRow = [];
  G.dailyStats = null;
}

export function dailyLevelDone() {
  if (G.mode === 'daily') G.dailyRow.push('🟩');
}

export function finishDaily() {
  G.dailyRow.push('💥');
  const s = loadDailyStats();
  if (s.date !== G.dailyDate) return;                       // played past midnight: don't mix days
  s.attempts++;
  s.lastScore = G.score;
  if (!s.best || G.score > s.best.score) s.best = { score: G.score, level: G.level, row: G.dailyRow.join('') };
  try { localStorage.setItem('roadCrossingDaily', JSON.stringify(s)); } catch {}
  G.dailyStats = s;
  unlockAchievement('daily');
  achOnDailyFinished(G.dailyDate);
}

export function dailyShareText() {
  const s = G.dailyStats || loadDailyStats();
  if (!s.best) return null;
  const tries = s.attempts === 1 ? '1 try' : `best of ${s.attempts} tries`;
  const url = location.protocol.startsWith('http') ? `\n${location.origin}${location.pathname}` : '';
  return `Road Crossing 📅 ${s.date}\nLevel ${s.best.level} · ${s.best.score.toLocaleString()} pts (${tries})\n` +
         `${s.best.row}${url}`;
}

// Phones get the system share sheet; elsewhere the text goes to the clipboard.
export async function shareDaily() {
  const text = dailyShareText();
  if (!text) return;
  const copied = { text: '📋 Result copied — paste it anywhere!', t: 2.5 };
  try {
    if (navigator.share && document.body.classList.contains('touch')) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    G.banner = copied;
  } catch (e) {
    if (e && e.name === 'AbortError') return;             // share sheet closed
    const ta = document.createElement('textarea');        // older browsers / non-secure pages
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    G.banner = ok ? copied : { text: "Couldn't copy the result", t: 2.5 };
  }
}

export function startDailyFromUI() {
  if (gameInProgress()) {                                 // don't throw away a game in progress (even paused)
    G.banner = { text: '📅 Finish this game first', t: 1.8 };
    return;
  }
  sound.init();
  newGame('daily');
}

// The share button sits over the canvas on the daily game-over screen.
export const shareBtn = document.getElementById('shareBtn');
export function updateShareButton() {
  const show = G.state === 'gameover' && G.mode === 'daily' && !!G.dailyStats;
  if (shareBtn.hidden === show) shareBtn.hidden = !show;
}
export const dailyBtn = document.getElementById('dailyBtn');

// Wires up the daily-challenge buttons (called once by main.js at start-up).
export function initDaily() {
  shareBtn.addEventListener('pointerdown', e => e.preventDefault());
  shareBtn.addEventListener('click', shareDaily);
  dailyBtn.addEventListener('pointerdown', e => e.preventDefault());
  dailyBtn.addEventListener('click', startDailyFromUI);
}
