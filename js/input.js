// ---------- Input ----------
function setKey(e, down) {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = down;
  else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = down;
  else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = down;
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = down;
  else return false;
  return true;
}

addEventListener('keydown', e => {
  sound.init();
  if (setKey(e, true) || e.key === ' ') e.preventDefault();
  if (e.key === 'm' || e.key === 'M') sound.toggleMute();
  if ((e.key === ' ' || e.key === 'Enter') && (state === 'title' || state === 'gameover')) newGame();
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    if (state === 'playing') setPaused(true);
    else if (state === 'paused') setPaused(false);
  }
});
addEventListener('keyup', e => setKey(e, false));
addEventListener('blur', () => {
  releaseKeys();
  if (state === 'playing') setPaused(true);
});

// Pausing also suspends audio, so a siren picks up exactly where it left off.
function setPaused(on) {
  state = on ? 'paused' : 'playing';
  if (sound.ctx) on ? sound.ctx.suspend() : sound.ctx.resume();
}

function releaseKeys() {
  keys.up = keys.down = keys.left = keys.right = false;
}

// Touch / mouse: hold (and drag) anywhere — the man walks toward the pointer.
let pointerHeld = false;
function steerToPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const dx = (e.clientX - rect.left) * (W / rect.width) - player.x;
  const dy = (e.clientY - rect.top) * (H / rect.height) - player.y;
  const dead = 12;                     // stop when the pointer is roughly on the man
  keys.left = dx < -dead;
  keys.right = dx > dead;
  keys.up = dy < -dead;
  keys.down = dy > dead;
}
canvas.addEventListener('pointerdown', e => {
  sound.init();
  if (state === 'title' || state === 'gameover') { newGame(); return; }
  if (state === 'paused') { setPaused(false); return; }
  pointerHeld = true;
  steerToPointer(e);
});
canvas.addEventListener('pointermove', e => { if (pointerHeld) steerToPointer(e); });
addEventListener('pointerup', () => { pointerHeld = false; releaseKeys(); });
addEventListener('pointercancel', () => { pointerHeld = false; releaseKeys(); });
