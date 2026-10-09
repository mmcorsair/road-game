// ---------- Main loop ----------
buildLanes();
resetPlayer();
updateHud();

// The game advances in fixed 1/120 s steps however fast the screen refreshes (60 Hz phone or 120 Hz
// laptop), so the same daily challenge plays out the same way on every device.
const STEP = 1 / 120;
let lastTime = performance.now(), pending = 0;

// Frame-rate watchdog: if the game runs below LITE_FPS for 3 s while playing, switch to lite mode.
let slowTime = 0;
function watchFrameRate(realDt) {
  if (liteMode || state !== 'playing' || realDt > 0.25) return;   // ignore pauses and background tabs
  slowTime = realDt > 1 / LITE_FPS ? slowTime + realDt : Math.max(0, slowTime - realDt);
  if (slowTime > 3) enterLiteMode();
}

function frame(now) {
  const realDt = Math.min(0.1, (now - lastTime) / 1000);   // cap so a background tab doesn't teleport cars
  watchFrameRate((now - lastTime) / 1000);
  pending += realDt * tipTimeScale(realDt);                // brief slow motion when a hazard tip appears
  lastTime = now;
  while (pending >= STEP) {
    update(STEP);
    pending -= STEP;
  }
  draw();
  drawSkinPreviews(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
