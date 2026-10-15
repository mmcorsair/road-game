// ---------- Game state ----------
import { G } from './store.js';
import { START_LIVES, TIME_LIMIT } from './config.js';

G.level = 1;
G.lives = START_LIVES;
G.score = 0;
G.hiScore = loadHiScore();
G.newHighScore = false;
G.timeLeft = TIME_LIMIT;
G.lastTick = 0;
G.levelProgress = 0;
G.levelBonus = null;
G.hitReason = 'car';
G.popups = [];
G.lanes = [];
G.player = undefined;
G.state = 'title';
G.stateTimer = 0;
G.emergencyTimer = 0;
G.stopSiren = () => {};
G.goTimer = 0;
G.pausedFrom = 'playing';
G.mode = 'normal';            // 'normal' or 'daily' (see daily.js)
export const keys = { up: false, down: false, left: false, right: false };

export function loadHiScore() {
  try { return Number(localStorage.getItem('roadCrossingHiScore')) || 0; } catch { return 0; }
}
export function saveHiScore() {
  if (G.mode === 'practice') return;                     // practice scores don't count
  G.hiScore = Math.max(G.hiScore, G.score);
  try { localStorage.setItem('roadCrossingHiScore', G.hiScore); } catch {}
}
