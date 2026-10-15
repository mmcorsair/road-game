// ---------- Menu ----------
// Opened with Esc or the ☰ button; pauses a game in progress. Holds the actions that used to clutter
// the help line (daily challenge, skins, achievements, tips, fullscreen, quit) and the settings.
import { G } from './store.js';
import { applySettings, setSetting } from './settings.js';
import { saveHiScore } from './state.js';
import { sfx, sound } from './sound.js';
import { silenceSiren } from './traffic.js';
import { closeSkinPicker, openSkinPicker, skinPickerOpen } from './skins.js';
import { startDailyFromUI } from './daily.js';
import { replayTips } from './tutorial.js';
import { achievementCount, toast } from './achievements.js';
import { updateHud } from './game.js';
import { fullscreenSupported, releaseKeys, setPaused, toggleFullscreen } from './input.js';
import { openLevelPicker } from './practice.js';

export const menu = document.getElementById('menu');
export const $ = id => document.getElementById(id);
G.menuPausedGame = false;
G.resetArmed = 0;                 // > 0 while "tap again to confirm" is showing (seconds)

export const gameInProgress = () => ['countdown', 'playing', 'paused', 'hit', 'levelup'].includes(G.state);
export const menuOpen = () => !menu.hidden;

export function openMenu() {
  if (skinPickerOpen()) closeSkinPicker();
  G.menuPausedGame = ['countdown', 'playing', 'hit', 'levelup'].includes(G.state);
  if (G.menuPausedGame) setPaused(true);
  releaseKeys();
  G.resetArmed = 0;
  menu.hidden = false;
  renderMenu();
}

// Closing the menu resumes the game it paused (unless we're leaving for another panel or the title).
export function closeMenu(resume = true) {
  menu.hidden = true;
  if (resume && G.menuPausedGame && G.state === 'paused') setPaused(false);
  G.menuPausedGame = false;
}

export function toggleMenu() {
  if (menuOpen()) closeMenu(); else openMenu();
}

export function renderMenu() {
  if (menu.hidden) return;
  const inGame = gameInProgress();
  $('mResume').hidden = !inGame;
  $('mQuit').hidden = !inGame;
  $('mDaily').disabled = inGame;
  $('mPractice').disabled = inGame;
  $('mPractice').textContent = inGame ? '🎯 Practice a level (after this game)' : '🎯 Practice a level';
  $('mDaily').textContent = inGame ? '📅 Daily challenge (after this game)' : '📅 Daily challenge';
  $('mAchCount').textContent = achievementCount();
  $('mFullscreen').hidden = !fullscreenSupported;
  $('mReset').textContent = G.resetArmed > 0 ? '⚠️ Tap again to erase everything' : '🗑 Reset all progress';
  $('mReset').classList.toggle('armed', G.resetArmed > 0);

  const toggle = (id, on) => { $(id).textContent = on ? 'On' : 'Off'; $(id).classList.toggle('on', on); };
  toggle('sSound', !sound.muted);
  toggle('sShake', G.settings.shake);
  toggle('sMusic', G.settings.musicOn);
  $('sMusicVolume').value = Math.round(G.settings.musicVolume * 100);
  $('sMusicVolume').disabled = !G.settings.musicOn;
  toggle('sContrast', G.settings.contrast);
  $('sVolume').value = Math.round(G.settings.volume * 100);
  $('sVolume').disabled = sound.muted;
  for (const b of document.querySelectorAll('#sGraphics button')) b.classList.toggle('active', b.dataset.v === G.settings.graphics);
  $('sGraphicsNote').textContent = G.settings.graphics === 'auto'
    ? (G.liteMode ? 'Auto — switched to lite mode for smoother play' : 'Auto — switches to lite mode if the game runs slowly')
    : G.settings.graphics === 'high' ? 'High — always full quality' : 'Lite — lower resolution, fewer effects';
}

export function quitToTitle() {
  closeMenu(false);
  saveHiScore();
  silenceSiren();
  releaseKeys();
  G.state = 'title';
  updateHud();
}

// Erases everything the game has saved except settings, and resets it in memory too.
export function resetProgress() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('roadCrossing') && k !== 'roadCrossingSettings' && k !== 'roadCrossingMuted') localStorage.removeItem(k);
  }
  G.hiScore = 0;
  G.skinId = 'classic';
  G.achievements = { unlocked: {}, bonusKinds: [], bosses: [] };
  G.seenTips = new Set();
  G.dailyStats = null;
  G.resetArmed = 0;
  updateHud();
  toast('🗑 Progress reset');
}

export function menuTick(dt) {                                 // called every frame (real time)
  if (G.resetArmed > 0 && (G.resetArmed -= dt) <= 0) renderMenu();
}

// ---------- Wiring ----------
export const onClick = (id, fn) => {
  $(id).addEventListener('pointerdown', e => e.preventDefault());   // never take keyboard focus
  $(id).addEventListener('click', fn);
};

   // click outside the box

   // a sample at the new volume

// Wires up the menu and applies the saved settings (called once by main.js at start-up).
export function initMenu() {
  onClick('menuBtn', toggleMenu);
  onClick('menuLink', toggleMenu);
  onClick('menuClose', () => closeMenu());
  menu.addEventListener('click', e => { if (e.target === menu) closeMenu(); });
  onClick('mResume', () => closeMenu());
  onClick('mDaily', () => { closeMenu(false); startDailyFromUI(); });
  onClick('mPractice', () => { closeMenu(false); openLevelPicker(); });
  onClick('mSkins', () => { closeMenu(false); openSkinPicker('skins'); });
  onClick('mAch', () => { closeMenu(false); openSkinPicker('achievements'); });
  onClick('mTips', () => { replayTips(); renderMenu(); });
  onClick('mFullscreen', () => toggleFullscreen());
  onClick('mQuit', quitToTitle);
  onClick('mReset', () => {
    if (G.resetArmed > 0) resetProgress();
    else G.resetArmed = 3;
    renderMenu();
  });
  onClick('sSound', () => { sound.init(); sound.toggleMute(); renderMenu(); });
  onClick('sShake', () => { setSetting('shake', !G.settings.shake); renderMenu(); });
  onClick('sMusic', () => { sound.init(); setSetting('musicOn', !G.settings.musicOn); renderMenu(); });
  $('sMusicVolume').addEventListener('input', e => { setSetting('musicVolume', e.target.value / 100); });
  onClick('sContrast', () => { setSetting('contrast', !G.settings.contrast); renderMenu(); });
  $('sVolume').addEventListener('input', e => { setSetting('volume', e.target.value / 100); });
  $('sVolume').addEventListener('change', () => { sound.init(); sfx.point(); });
  for (const b of document.querySelectorAll('#sGraphics button')) {
    b.addEventListener('click', () => { setSetting('graphics', b.dataset.v); renderMenu(); });
  }
  applySettings();
}
