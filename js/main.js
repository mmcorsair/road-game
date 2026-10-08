// ---------- Main loop ----------
buildLanes();
resetPlayer();
updateHud();

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);   // clamp so a background tab doesn't teleport cars
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
