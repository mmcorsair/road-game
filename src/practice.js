// ---------- Practice mode ----------
// Start a game at any level, to try the later features without playing up to them. Practice games
// never save a high score, unlock skins or earn achievements. Opened from the menu (or L).
import { G } from './store.js';
import { BIKE_LEVEL, EMERGENCY_LEVEL } from './config.js';
import { newGame } from './game.js';
import { bossFor, BOSS_ICONS, BOSS_NAMES } from './boss.js';
import { hasBusStop } from './bus.js';
import { railLaneCount } from './rail.js';
import { weatherFor } from './weather.js';
import { releaseKeys } from './input.js';
import { sound } from './sound.js';

export const PRACTICE_LEVELS = 20;
const panel = document.getElementById('levels');
const grid = document.getElementById('levelGrid');

export const levelPickerOpen = () => !panel.hidden;

// What a level contains, as icons (and a description for the tooltip / screen readers).
export function levelFeatures(lvl) {
  const items = [];
  const boss = bossFor(lvl);
  if (boss) items.push([BOSS_ICONS[boss], `Boss: ${BOSS_NAMES[boss]}`]);
  const w = weatherFor(lvl);
  if (w.rain) items.push(['🌧', 'rain']);
  if (w.night) items.push(['🌙', 'night']);
  if (lvl >= BIKE_LEVEL) items.push(['🏍', 'motorbikes']);
  if (!boss) {
    const savedLevel = G.level;                        // railLaneCount() reads the current level
    G.level = lvl;
    if (railLaneCount() > 0) items.push(['🚆', 'trains']);
    G.level = savedLevel;
    if (hasBusStop(lvl)) items.push(['🚌', 'bus stop']);
  }
  if (lvl >= EMERGENCY_LEVEL) items.push(['🚑', 'ambulances']);
  return items;
}

export function openLevelPicker() {
  releaseKeys();
  panel.hidden = false;
  grid.textContent = '';
  for (let lvl = 1; lvl <= PRACTICE_LEVELS; lvl++) {
    const features = levelFeatures(lvl);
    const btn = document.createElement('button');
    btn.className = 'level-card' + (bossFor(lvl) ? ' boss' : '');
    btn.tabIndex = -1;
    btn.title = `Level ${lvl}` + (features.length ? ': ' + features.map(f => f[1]).join(', ') : '');
    const num = document.createElement('strong');
    num.textContent = lvl;
    const icons = document.createElement('span');
    icons.textContent = features.map(f => f[0]).join('') || '·';
    btn.append(num, icons);
    btn.addEventListener('click', () => startPractice(lvl));
    grid.append(btn);
  }
}

export function closeLevelPicker() {
  panel.hidden = true;
}

export function startPractice(lvl) {
  closeLevelPicker();
  sound.init();
  newGame('practice', lvl);
}

// Wires up the level picker (called once by main.js at start-up).
export function initPractice() {
  document.getElementById('levelsClose').addEventListener('click', closeLevelPicker);
  panel.addEventListener('click', e => { if (e.target === panel) closeLevelPicker(); });   // click outside the box
}
