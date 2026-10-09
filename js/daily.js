// ---------- Daily challenge ----------
// Everyone gets the same roads on a given (local) day: each level's traffic and pickups come from
// generators seeded by the date and the level number, so level 4 is the same for everyone no matter
// how long levels 1–3 took. Retries are allowed; the day's best result can be shared, Wordle-style.

// mulberry32: a tiny seeded generator returning numbers in [0, 1).
function seededRandom(seed) {
  return function () {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a: turns a string like "2026-10-08/4/traffic" into a 32-bit seed.
function hashString(s) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let dailyDate = todayKey();     // fixed when a daily game starts, so midnight doesn't change it mid-game
let dailyRow = [];              // 🟩 per completed level, 💥 where the game ended
let dailyStats = null;          // today's stats, shown on the game-over screen

// Called by buildLanes() at the start of every level.
function seedRandomness() {
  if (mode === 'daily') {
    gameRandom = seededRandom(hashString(`${dailyDate}/${level}/traffic`));
    pickupRandom = seededRandom(hashString(`${dailyDate}/${level}/pickups`));
  } else {
    gameRandom = pickupRandom = Math.random;
  }
}

function loadDailyStats() {
  try {
    const s = JSON.parse(localStorage.getItem('roadCrossingDaily'));
    if (s && s.date === todayKey()) return s;
  } catch {}
  return { date: todayKey(), attempts: 0, best: null };
}

function startDaily() {
  dailyDate = todayKey();
  dailyRow = [];
  dailyStats = null;
}

function dailyLevelDone() {
  if (mode === 'daily') dailyRow.push('🟩');
}

function finishDaily() {
  dailyRow.push('💥');
  const s = loadDailyStats();
  if (s.date !== dailyDate) return;                       // played past midnight: don't mix days
  s.attempts++;
  s.lastScore = score;
  if (!s.best || score > s.best.score) s.best = { score, level, row: dailyRow.join('') };
  try { localStorage.setItem('roadCrossingDaily', JSON.stringify(s)); } catch {}
  dailyStats = s;
  unlockAchievement('daily');
}

function dailyShareText() {
  const s = dailyStats || loadDailyStats();
  if (!s.best) return null;
  const tries = s.attempts === 1 ? '1 try' : `best of ${s.attempts} tries`;
  const url = location.protocol.startsWith('http') ? `\n${location.origin}${location.pathname}` : '';
  return `Road Crossing 📅 ${s.date}\nLevel ${s.best.level} · ${s.best.score.toLocaleString()} pts (${tries})\n` +
         `${s.best.row}${url}`;
}

// Phones get the system share sheet; elsewhere the text goes to the clipboard.
async function shareDaily() {
  const text = dailyShareText();
  if (!text) return;
  const copied = { text: '📋 Result copied — paste it anywhere!', t: 2.5 };
  try {
    if (navigator.share && document.body.classList.contains('touch')) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    banner = copied;
  } catch (e) {
    if (e && e.name === 'AbortError') return;             // share sheet closed
    const ta = document.createElement('textarea');        // older browsers / non-secure pages
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    banner = ok ? copied : { text: "Couldn't copy the result", t: 2.5 };
  }
}

function startDailyFromUI() {
  if (gameInProgress()) {                                 // don't throw away a game in progress (even paused)
    banner = { text: '📅 Finish this game first', t: 1.8 };
    return;
  }
  sound.init();
  newGame('daily');
}

// The share button sits over the canvas on the daily game-over screen.
const shareBtn = document.getElementById('shareBtn');
function updateShareButton() {
  const show = state === 'gameover' && mode === 'daily' && !!dailyStats;
  if (shareBtn.hidden === show) shareBtn.hidden = !show;
}
shareBtn.addEventListener('pointerdown', e => e.preventDefault());
shareBtn.addEventListener('click', shareDaily);
const dailyBtn = document.getElementById('dailyBtn');
dailyBtn.addEventListener('pointerdown', e => e.preventDefault());
dailyBtn.addEventListener('click', startDailyFromUI);
