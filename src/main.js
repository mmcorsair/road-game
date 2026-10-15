// ---------- Main loop ----------
import { G } from './store.js';
import { LITE_FPS } from './config.js';
import { musicTick } from './music.js';
import { buildLanes } from './traffic.js';
import { resetPlayer } from './player.js';
import { drawSkinPreviews, initSkins } from './skins.js';
import { initDaily } from './daily.js';
import { tipTimeScale } from './tutorial.js';
import { initMenu, menuTick } from './menu.js';
import { initInput } from './input.js';
import { initPractice } from './practice.js';
import { update, updateHud } from './game.js';
import { draw, enterLiteMode } from './render.js';

// The game advances in fixed 1/120 s steps however fast the screen refreshes (60 Hz phone or 120 Hz
// laptop), so the same daily challenge plays out the same way on every device.
export const STEP = 1 / 120;
G.lastTime = performance.now();
G.pending = 0;

// Frame-rate watchdog: if the game runs below LITE_FPS for 3 s while playing, switch to lite mode.
G.slowTime = 0;
export function watchFrameRate(realDt) {
  if (G.settings.graphics !== 'auto' || G.liteMode || G.state !== 'playing' || realDt > 0.25) return;   // ignore pauses, background tabs
  G.slowTime = realDt > 1 / LITE_FPS ? G.slowTime + realDt : Math.max(0, G.slowTime - realDt);
  if (G.slowTime > 3) enterLiteMode();
}

export function frame(now) {
  const realDt = Math.min(0.1, (now - G.lastTime) / 1000);   // cap so a background tab doesn't teleport cars
  watchFrameRate((now - G.lastTime) / 1000);
  menuTick(realDt);
  G.pending += realDt * tipTimeScale(realDt);                // brief slow motion when a hazard tip appears
  G.lastTime = now;
  while (G.pending >= STEP) {
    update(STEP);
    G.pending -= STEP;
  }
  draw();
  drawSkinPreviews(now);
  musicTick();
  requestAnimationFrame(frame);
}

// Starts the game (called by index.js once every module has loaded): wire up the page in the order
// the game always used, then build the first road and start the frame loop.
export function start() {
  initSkins();
  initDaily();
  initPractice();
  initMenu();                      // also applies the saved settings
  initInput();
  buildLanes();
  resetPlayer();
  updateHud();
  requestAnimationFrame(frame);
}
