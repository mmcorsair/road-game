// ---------- Game state ----------
let level = 1, lives = START_LIVES, score = 0, hiScore = loadHiScore(), newHighScore = false;
let timeLeft = TIME_LIMIT, lastTick = 0, levelProgress = 0, levelBonus = null, hitReason = 'car', popups = [];
let lanes = [], player, state = 'title', stateTimer = 0;
let emergencyTimer = 0, stopSiren = () => {};
let goTimer = 0, pausedFrom = 'playing';
const keys = { up: false, down: false, left: false, right: false };

function loadHiScore() {
  try { return Number(localStorage.getItem('roadCrossingHiScore')) || 0; } catch { return 0; }
}
function saveHiScore() {
  hiScore = Math.max(hiScore, score);
  try { localStorage.setItem('roadCrossingHiScore', hiScore); } catch {}
}
