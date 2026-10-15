// ---------- Achievements ----------
// Goals that unlock once, forever, with a banner. They only observe the game — never change it —
// so the daily challenge is unaffected. Shown in the second tab of the skins panel.
import { G } from './store.js';
import { LANE_H } from './config.js';
import { keys } from './state.js';
import { sfx } from './sound.js';
import { BOSSES } from './boss.js';
import { PICKUP_TYPES } from './pickups.js';
import { renderSkinPicker } from './skins.js';
import { todayKey } from './daily.js';

export const ACHIEVEMENTS = [
  { id: 'first',    icon: '👣', name: 'First steps',         desc: 'Complete level 1.' },
  { id: 'nonstop',  icon: '🏃', name: 'Non-stop',            desc: 'Complete a level without stopping.' },
  { id: 'speedy',   icon: '⚡', name: 'Speed walker',        desc: 'Finish a level with 20 seconds or more left.' },
  { id: 'coins',    icon: '🪙', name: 'Coin collector',      desc: 'Collect 5 coins in one game.' },
  { id: 'hunter',   icon: '🎁', name: 'Bonus hunter',        desc: 'Collect every kind of bonus.' },
  { id: 'shield',   icon: '🛡', name: 'Saved by the shield', desc: 'Let a shield take a hit for you.' },
  { id: 'train',    icon: '🚆', name: 'Beat the train',      desc: 'Cross the tracks while the crossing lights flash.' },
  { id: 'rain',     icon: '🌧', name: 'Singing in the rain', desc: 'Complete a rain level without losing a life.' },
  { id: 'night',    icon: '🌙', name: 'Night owl',           desc: 'Complete a night level without losing a life.' },
  { id: 'flawless', icon: '💎', name: 'Flawless',            desc: 'Reach level 6 without losing a life.' },
  { id: 'level5',   icon: '🚦', name: 'Rush hour',           desc: 'Reach level 5.' },
  { id: 'level10',  icon: '🛣', name: 'Road warrior',        desc: 'Reach level 10.' },
  { id: 'score1k',  icon: '⭐', name: 'Rising star',         desc: 'Score 1,000 points in one game.' },
  { id: 'score5k',  icon: '🌟', name: 'Pro crosser',         desc: 'Score 5,000 points in one game.' },
  { id: 'score10k', icon: '🏆', name: 'Legend of the road',  desc: 'Score 10,000 points in one game.' },
  { id: 'daily',    icon: '📅', name: 'Daily driver',        desc: 'Finish a daily challenge.' },
  { id: 'style',    icon: '👕', name: 'New look',            desc: 'Wear a skin other than Classic.' },
  { id: 'boss',     icon: '👑', name: 'Boss buster',         desc: 'Complete a boss level.' },
  { id: 'tour',     icon: '🗺', name: 'Grand tour',          desc: 'Complete all three kinds of boss level.' },
];
export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
export const SCORE_ACHIEVEMENTS = [[1000, 'score1k'], [5000, 'score5k'], [10000, 'score10k']];

// Saved: which are unlocked (with the date) and which bonus kinds were ever collected.
G.achievements = (() => {
  try {
    const s = JSON.parse(localStorage.getItem('roadCrossingAchievements'));
    if (s && s.unlocked) return { unlocked: s.unlocked, bonusKinds: s.bonusKinds || [], bosses: s.bosses || [] };
  } catch {}
  return { unlocked: {}, bonusKinds: [], bosses: [] };
})();
G.gameAch = { coins: 0, livesLost: 0, earned: [] };          // this game
G.levelAch = { livesLost: 0, still: 0, onTracks: false };    // this level
G.toastQueue = [];

export function saveAchievements() {
  try { localStorage.setItem('roadCrossingAchievements', JSON.stringify(G.achievements)); } catch {}
}

export const hasAchievement = id => id in G.achievements.unlocked;

export function unlockAchievement(id) {
  if (hasAchievement(id) || G.mode === 'practice') return;   // practice games don't count
  G.achievements.unlocked[id] = todayKey();
  saveAchievements();
  const a = ACHIEVEMENT_BY_ID[id];
  G.gameAch.earned.push(a.name);
  toast(`🏆 Achievement: ${a.name}`);
  sfx.achievement();
  renderSkinPicker();                                    // refresh the panel if it's open
}

// Banners take turns, so several unlocks at once are all seen.
export function toast(text) {
  if (G.banner) G.toastQueue.push({ text, t: 2.5 });
  else G.banner = { text, t: 2.5 };
}
export function pumpToasts() {
  if (!G.banner && G.toastQueue.length) G.banner = G.toastQueue.shift();
}

// ---------- Hooks called by the game ----------
export function achOnNewGame() {
  G.gameAch = { coins: 0, livesLost: 0, earned: [] };
  achOnNewLevel();
}

export function achOnNewLevel() {
  G.levelAch = { livesLost: 0, still: 0, onTracks: false };
}

export function achOnLifeLost() {
  G.gameAch.livesLost++;
  G.levelAch.livesLost++;
  G.levelAch.onTracks = false;                             // getting hit on the tracks doesn't count
}

export function achOnScore() {
  for (const [points, id] of SCORE_ACHIEVEMENTS) if (G.score >= points) unlockAchievement(id);
}

export function achOnPickup(type) {
  if (G.mode === 'practice') return;
  if (type === 'coin' && ++G.gameAch.coins >= 5) unlockAchievement('coins');
  if (!G.achievements.bonusKinds.includes(type)) {
    G.achievements.bonusKinds.push(type);
    saveAchievements();
  }
  if (Object.keys(PICKUP_TYPES).every(t => G.achievements.bonusKinds.includes(t))) unlockAchievement('hunter');
}

// `level` is the level just completed.
export function achOnLevelComplete() {
  if (G.level === 1) unlockAchievement('first');
  if (G.levelAch.still < 0.5) unlockAchievement('nonstop');
  if (G.timeLeft >= 20) unlockAchievement('speedy');
  if (G.weather.rain && G.levelAch.livesLost === 0) unlockAchievement('rain');
  if (G.weather.night && G.levelAch.livesLost === 0) unlockAchievement('night');
  if (G.level + 1 >= 6 && G.gameAch.livesLost === 0) unlockAchievement('flawless');
  if (G.level + 1 >= 5) unlockAchievement('level5');
  if (G.level + 1 >= 10) unlockAchievement('level10');
  if (G.boss) {
    unlockAchievement('boss');
    G.achievements.bosses ??= [];
    if (!G.achievements.bosses.includes(G.boss)) {
      G.achievements.bosses.push(G.boss);
      saveAchievements();
    }
    if (BOSSES.every(b => G.achievements.bosses.includes(b))) unlockAchievement('tour');
  }
}

// Every playing step: time spent standing still, and crossing tracks while the lights flash.
export function achUpdate(dt) {
  if (!keys.up && !keys.down && !keys.left && !keys.right) G.levelAch.still += dt;
  const onActiveTracks = G.lanes.some(l => l.rail && l.rail.phase !== 'idle' && Math.abs(G.player.y - l.y) < LANE_H / 2);
  if (onActiveTracks) G.levelAch.onTracks = true;
  else if (G.levelAch.onTracks && !G.lanes.some(l => l.rail && Math.abs(G.player.y - l.y) < LANE_H / 2)) {
    unlockAchievement('train');                          // made it off the tracks alive
    G.levelAch.onTracks = false;
  }
}

// ---------- Achievements tab ----------
export const achList = document.getElementById('achList');

export function renderAchievements() {
  achList.textContent = '';
  for (const a of ACHIEVEMENTS) {
    const done = hasAchievement(a.id);
    const row = document.createElement('div');
    row.className = 'ach' + (done ? ' done' : '');
    const icon = document.createElement('span');
    icon.className = 'ach-icon';
    icon.textContent = a.icon;
    const text = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = a.name;
    const desc = document.createElement('div');
    desc.className = 'ach-desc';
    desc.textContent = a.desc;
    text.append(name, desc);
    const status = document.createElement('span');
    status.className = 'ach-status';
    status.textContent = done ? '✓' : '🔒';
    status.title = done ? `Unlocked ${G.achievements.unlocked[a.id]}` : 'Locked';
    row.append(icon, text, status);
    achList.append(row);
  }
}

export function achievementCount() {
  return `${ACHIEVEMENTS.filter(a => hasAchievement(a.id)).length}/${ACHIEVEMENTS.length}`;
}
