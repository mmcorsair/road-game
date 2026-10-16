// ---------- Endless mode ----------
// One continuous run: reach the finish and a new road appears straight away, a little faster every
// two roads, with random weather and no bosses. One life (a ❤️ pickup still adds one); scored by lanes
// crossed. It has its own best distance and doesn't change the normal high score or unlock score skins
// (a long run unlocks the Dinosaur skin instead).
import { G } from './store.js';
import { rand } from './config.js';
import { unlockAchievement } from './achievements.js';
import { checkEndlessSkinUnlocks } from './skins.js';

export const ENDLESS_PAUSE = 0.9;      // seconds between one road and the next
export const isEndless = () => G.mode === 'endless';

// Difficulty (the level whose traffic and hazards a road uses) rises one step every two roads.
export const endlessLevel = roads => 1 + Math.floor(roads / 2);

G.endless = { roads: 0, lanes: 0 };
G.endlessBest = (() => { try { return Number(localStorage.getItem('roadCrossingEndlessBest')) || 0; } catch { return 0; } })();
G.newEndlessBest = false;

export function resetEndless() {
  G.endless = { roads: 0, lanes: 0 };
  G.newEndlessBest = false;
}

// Random weather for each road (the first one is always clear).
export function endlessWeather() {
  if (G.endless.roads === 0) return { rain: false, night: false };
  return { rain: rand(0, 1) < 0.3, night: rand(0, 1) < 0.3 };
}

export function endlessLanesCrossed(n) {
  const before = G.endless.lanes;
  G.endless.lanes += n;
  checkEndlessSkinUnlocks(before, G.endless.lanes);
  if (G.endless.lanes >= 25) unlockAchievement('walk25');
  if (G.endless.lanes >= 100) unlockAchievement('marathon');
}

export function finishEndless() {
  if (G.endless.lanes > G.endlessBest) {
    G.endlessBest = G.endless.lanes;
    G.newEndlessBest = true;
    try { localStorage.setItem('roadCrossingEndlessBest', G.endlessBest); } catch {}
  }
}
