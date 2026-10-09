// ---------- Settings ----------
// Player preferences, saved in the browser. Changed from the menu (menu.js); read everywhere else.
// (Mute keeps its own older key, roadCrossingMuted, so existing players keep their choice.)
const DEFAULT_SETTINGS = {
  volume: 0.8,          // 0…1
  shake: true,          // screen shake on crashes
  graphics: 'auto',     // 'auto' (switch to lite mode if slow), 'high' or 'lite'
  contrast: false,      // high-contrast signals: turn signals also show a white arrow
};

let settings = (() => {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('roadCrossingSettings')) }; }
  catch { return { ...DEFAULT_SETTINGS }; }
})();

function setSetting(key, value) {
  settings[key] = value;
  try { localStorage.setItem('roadCrossingSettings', JSON.stringify(settings)); } catch {}
  applySettings();
}

// Makes the current settings take effect (called at start-up and after every change).
function applySettings() {
  sound.applyVolume();
  if (settings.graphics === 'lite') enterLiteMode();
  else if (settings.graphics === 'high') exitLiteMode();
}
