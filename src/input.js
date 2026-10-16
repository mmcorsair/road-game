// ---------- Input ----------
// Keyboard, on-screen buttons and dragging on the road each keep their own direction state;
// `keys` (read by the game) is their union, so lifting one thumb never cancels another.
import { G } from './store.js';
import { H, W } from './config.js';
import { keys } from './state.js';
import { sound } from './sound.js';
import { closeSkinPicker, openSkinPicker, skinPickerOpen } from './skins.js';
import { shareDaily } from './daily.js';
import { closeMenu, menuOpen, openMenu } from './menu.js';
import { newGame } from './game.js';
import { canvas } from './render.js';
import { closeLevelPicker, levelPickerOpen, openLevelPicker } from './practice.js';

export const DIRS = ['up', 'down', 'left', 'right'];
export const keyboard = {}, buttons = {}, drag = {};

export function syncKeys() {
  for (const d of DIRS) keys[d] = !!(keyboard[d] || buttons[d] || drag[d]);
}

export function releaseKeys() {
  for (const src of [keyboard, buttons, drag]) for (const d of DIRS) src[d] = false;
  for (const btn of document.querySelectorAll('.btn.active')) btn.classList.remove('active');
  syncKeys();
}

// Starts a new game or resumes a paused one; returns true if it did either.
// Space / tap on the title or game-over screen: a practice game restarts its level; otherwise a new game.
export function playAgain() {
  if (G.state === 'gameover' && G.mode === 'practice') newGame('practice', G.practiceLevel);
  else if (G.state === 'gameover' && G.mode === 'endless') newGame('endless');
  else newGame();
}

export function startOrResume() {
  sound.init();
  if (G.state === 'title' || G.state === 'gameover') { playAgain(); return true; }
  if (G.state === 'paused') { setPaused(false); return true; }
  return false;
}

export function canPause() {
  return G.state === 'playing' || G.state === 'countdown';
}

// Pausing also suspends audio, so a siren picks up exactly where it left off.
export function setPaused(on) {
  if (on) G.pausedFrom = G.state;
  G.state = on ? 'paused' : G.pausedFrom;
  if (sound.ctx) on ? sound.ctx.suspend() : sound.ctx.resume();
}

export function pauseIfPlaying() {
  releaseKeys();
  if (canPause()) setPaused(true);
}

export function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// --- Keyboard ---
export const KEY_DIRS = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
                   ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };

export function setKey(e, down) {
  const dir = KEY_DIRS[e.key];
  if (!dir) return false;
  keyboard[dir] = down;
  syncKeys();
  return true;
}

// --- Touch UI: shown on touch screens, or as soon as the screen is touched ---
export function enableTouchUI() {
  document.body.classList.add('touch');
}

// --- On-screen arrow buttons: hold to walk ---

// --- Pause / sound / fullscreen buttons ---
export const noFocus = e => e.preventDefault();     // so Space never "clicks" a focused button
export const root = document.documentElement;
export const requestFs = root.requestFullscreen || root.webkitRequestFullscreen;
export const fullscreenSupported = !!requestFs;        // not on iPhone; "Add to Home Screen" works there

export function toggleFullscreen() {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else if (requestFs) {
    const result = requestFs.call(root);
    if (result && result.catch) result.catch(() => {});
  }
}

// --- Touch / mouse on the road: hold (and drag) and the man walks toward the pointer ---
G.dragPointer = null;

export function steerToPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const dx = (e.clientX - rect.left) * (W / rect.width) - G.player.x;
  const dy = (e.clientY - rect.top) * (H / rect.height) - G.player.y;
  const dead = 12;                     // stop when the pointer is roughly on the man
  drag.left = dx < -dead;
  drag.right = dx > dead;
  drag.up = dy < -dead;
  drag.down = dy > dead;
  syncKeys();
}

export function endDrag(e) {
  if (e.pointerId !== G.dragPointer) return;
  G.dragPointer = null;
  for (const d of DIRS) drag[d] = false;
  syncKeys();
}

// Wires up keyboard, touch and button input (called once by main.js at start-up).
export function initInput() {
  addEventListener('keydown', e => {
    sound.init();
    if (levelPickerOpen()) {                     // the level picker takes over the keyboard while open
      if (e.key === 'Escape' || e.key === 'l' || e.key === 'L') closeLevelPicker();
      if (e.key === ' ') e.preventDefault();
      return;
    }
    if (menuOpen()) {                            // the menu takes over the keyboard while open
      if (e.key === 'Escape') closeMenu();
      if (e.key === ' ') e.preventDefault();
      return;
    }
    if (skinPickerOpen()) {                       // the skin panel takes over the keyboard while open
      if (e.key === 'Escape' || e.key === 'k' || e.key === 'K') closeSkinPicker();
      if (e.key === ' ') e.preventDefault();
      return;
    }
    if (e.key === 'k' || e.key === 'K') { openSkinPicker(); return; }
    if ((e.key === 'c' || e.key === 'C') && (G.state === 'title' || G.state === 'gameover')) { newGame('daily'); return; }
    if ((e.key === 'l' || e.key === 'L') && (G.state === 'title' || G.state === 'gameover')) { openLevelPicker(); return; }
    if ((e.key === 'e' || e.key === 'E') && (G.state === 'title' || G.state === 'gameover')) { newGame('endless'); return; }
    if ((e.key === 'r' || e.key === 'R') && G.state === 'gameover' && G.mode === 'daily') { shareDaily(); return; }
    if (setKey(e, true) || e.key === ' ') e.preventDefault();
    if (e.key === 'm' || e.key === 'M') sound.toggleMute();
    if ((e.key === ' ' || e.key === 'Enter') && (G.state === 'title' || G.state === 'gameover')) playAgain();
    if (e.key === 'Escape') { openMenu(); return; }
    if (e.key === 'p' || e.key === 'P') {
      if (canPause()) setPaused(true);
      else if (G.state === 'paused') setPaused(false);
    }
  });
  addEventListener('keyup', e => setKey(e, false));
  addEventListener('blur', pauseIfPlaying);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseIfPlaying(); });
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) enableTouchUI();
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') enableTouchUI(); }, true);
  for (const btn of document.querySelectorAll('[data-dir]')) {
    const dir = btn.dataset.dir;
    const release = () => {
      buttons[dir] = false;
      btn.classList.remove('active');
      syncKeys();
    };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);       // keep receiving events even if the thumb slides off
      startOrResume();
      buttons[dir] = true;
      btn.classList.add('active');
      syncKeys();
    });
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
  }
  for (const id of ['pauseBtn', 'muteBtn']) {
    document.getElementById(id).addEventListener('pointerdown', noFocus);
  }
  document.getElementById('pauseBtn').addEventListener('click', () => {
    if (canPause()) setPaused(true);
    else startOrResume();
  });
  document.getElementById('muteBtn').addEventListener('click', () => {
    sound.init();
    sound.toggleMute();
  });
  document.getElementById('controls').addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    if (startOrResume()) return;
    G.dragPointer = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    steerToPointer(e);
  });
  canvas.addEventListener('pointermove', e => { if (e.pointerId === G.dragPointer) steerToPointer(e); });
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
}
