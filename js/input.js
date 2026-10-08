// ---------- Input ----------
// Keyboard, on-screen buttons and dragging on the road each keep their own direction state;
// `keys` (read by the game) is their union, so lifting one thumb never cancels another.
const DIRS = ['up', 'down', 'left', 'right'];
const keyboard = {}, buttons = {}, drag = {};

function syncKeys() {
  for (const d of DIRS) keys[d] = !!(keyboard[d] || buttons[d] || drag[d]);
}

function releaseKeys() {
  for (const src of [keyboard, buttons, drag]) for (const d of DIRS) src[d] = false;
  for (const btn of document.querySelectorAll('.btn.active')) btn.classList.remove('active');
  syncKeys();
}

// Starts a new game or resumes a paused one; returns true if it did either.
function startOrResume() {
  sound.init();
  if (state === 'title' || state === 'gameover') { newGame(); return true; }
  if (state === 'paused') { setPaused(false); return true; }
  return false;
}

function canPause() {
  return state === 'playing' || state === 'countdown';
}

// Pausing also suspends audio, so a siren picks up exactly where it left off.
function setPaused(on) {
  if (on) pausedFrom = state;
  state = on ? 'paused' : pausedFrom;
  if (sound.ctx) on ? sound.ctx.suspend() : sound.ctx.resume();
}

function pauseIfPlaying() {
  releaseKeys();
  if (canPause()) setPaused(true);
}

function vibrate(ms) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// --- Keyboard ---
const KEY_DIRS = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down',
                   ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };

function setKey(e, down) {
  const dir = KEY_DIRS[e.key];
  if (!dir) return false;
  keyboard[dir] = down;
  syncKeys();
  return true;
}

addEventListener('keydown', e => {
  sound.init();
  if (setKey(e, true) || e.key === ' ') e.preventDefault();
  if (e.key === 'm' || e.key === 'M') sound.toggleMute();
  if ((e.key === ' ' || e.key === 'Enter') && (state === 'title' || state === 'gameover')) newGame();
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    if (canPause()) setPaused(true);
    else if (state === 'paused') setPaused(false);
  }
});
addEventListener('keyup', e => setKey(e, false));
addEventListener('blur', pauseIfPlaying);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseIfPlaying(); });

// --- Touch UI: shown on touch screens, or as soon as the screen is touched ---
function enableTouchUI() {
  document.body.classList.add('touch');
}
if (window.matchMedia && matchMedia('(pointer: coarse)').matches) enableTouchUI();
addEventListener('pointerdown', e => { if (e.pointerType === 'touch') enableTouchUI(); }, true);

// --- On-screen arrow buttons: hold to walk ---
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

// --- Pause / sound / fullscreen buttons ---
const noFocus = e => e.preventDefault();     // so Space never "clicks" a focused button
for (const id of ['pauseBtn', 'muteBtn', 'fullscreenBtn']) {
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
const fullscreenBtn = document.getElementById('fullscreenBtn');
const root = document.documentElement;
const requestFs = root.requestFullscreen || root.webkitRequestFullscreen;
if (requestFs) {                              // not available on iPhone; "Add to Home Screen" works there
  fullscreenBtn.hidden = false;
  fullscreenBtn.addEventListener('click', () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const result = requestFs.call(root);
      if (result && result.catch) result.catch(() => {});
    }
  });
}
document.getElementById('controls').addEventListener('contextmenu', e => e.preventDefault());

// --- Touch / mouse on the road: hold (and drag) and the man walks toward the pointer ---
let dragPointer = null;

function steerToPointer(e) {
  const rect = canvas.getBoundingClientRect();
  const dx = (e.clientX - rect.left) * (W / rect.width) - player.x;
  const dy = (e.clientY - rect.top) * (H / rect.height) - player.y;
  const dead = 12;                     // stop when the pointer is roughly on the man
  drag.left = dx < -dead;
  drag.right = dx > dead;
  drag.up = dy < -dead;
  drag.down = dy > dead;
  syncKeys();
}

function endDrag(e) {
  if (e.pointerId !== dragPointer) return;
  dragPointer = null;
  for (const d of DIRS) drag[d] = false;
  syncKeys();
}

canvas.addEventListener('pointerdown', e => {
  if (startOrResume()) return;
  dragPointer = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  steerToPointer(e);
});
canvas.addEventListener('pointermove', e => { if (e.pointerId === dragPointer) steerToPointer(e); });
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
