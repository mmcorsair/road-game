// ---------- Main loop ----------
buildLanes();
resetPlayer();
updateHud();

// The game advances in fixed 1/120 s steps however fast the screen refreshes (60 Hz phone or 120 Hz
// laptop), so the same daily challenge plays out the same way on every device.
const STEP = 1 / 120;
let lastTime = performance.now(), pending = 0;
function frame(now) {
  const realDt = Math.min(0.1, (now - lastTime) / 1000);   // cap so a background tab doesn't teleport cars
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
