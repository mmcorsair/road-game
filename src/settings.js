// ---------- Settings ----------
// Player preferences, saved in the browser. Changed from the menu (menu.js); read everywhere else.
// (Mute keeps its own older key, roadCrossingMuted, so existing players keep their choice.)
import { G } from './store.js';
import { sound } from './sound.js';
import { applyMusicVolume } from './music.js';
import { enterLiteMode, exitLiteMode } from './render.js';

export const DEFAULT_SETTINGS = {
  volume: 0.8,          // 0…1, sound effects (and the master level)
  musicOn: true,        // background music (music.js)
  musicVolume: 0.6,     // 0…1
  shake: true,          // screen shake on crashes
  graphics: 'auto',     // 'auto' (switch to lite mode if slow), 'high' or 'lite'
  contrast: false,      // high-contrast signals: turn signals also show a white arrow
};

G.settings = (() => {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('roadCrossingSettings')) }; }
  catch { return { ...DEFAULT_SETTINGS }; }
})();

export function setSetting(key, value) {
  G.settings[key] = value;
  try { localStorage.setItem('roadCrossingSettings', JSON.stringify(G.settings)); } catch {}
  applySettings();
}

// Makes the current settings take effect (called at start-up and after every change).
export function applySettings() {
  sound.applyVolume();
  applyMusicVolume();
  if (G.settings.graphics === 'lite') enterLiteMode();
  else if (G.settings.graphics === 'high') exitLiteMode();
}
