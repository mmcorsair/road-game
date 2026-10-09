// ---------- Menu ----------
// Opened with Esc or the ☰ button; pauses a game in progress. Holds the actions that used to clutter
// the help line (daily challenge, skins, achievements, tips, fullscreen, quit) and the settings.
const menu = document.getElementById('menu');
const $ = id => document.getElementById(id);
let menuPausedGame = false;
let resetArmed = 0;                 // > 0 while "tap again to confirm" is showing (seconds)

const gameInProgress = () => ['countdown', 'playing', 'paused', 'hit', 'levelup'].includes(state);
const menuOpen = () => !menu.hidden;

function openMenu() {
  if (skinPickerOpen()) closeSkinPicker();
  menuPausedGame = ['countdown', 'playing', 'hit', 'levelup'].includes(state);
  if (menuPausedGame) setPaused(true);
  releaseKeys();
  resetArmed = 0;
  menu.hidden = false;
  renderMenu();
}

// Closing the menu resumes the game it paused (unless we're leaving for another panel or the title).
function closeMenu(resume = true) {
  menu.hidden = true;
  if (resume && menuPausedGame && state === 'paused') setPaused(false);
  menuPausedGame = false;
}

function toggleMenu() {
  if (menuOpen()) closeMenu(); else openMenu();
}

function renderMenu() {
  if (menu.hidden) return;
  const inGame = gameInProgress();
  $('mResume').hidden = !inGame;
  $('mQuit').hidden = !inGame;
  $('mDaily').disabled = inGame;
  $('mDaily').textContent = inGame ? '📅 Daily challenge (after this game)' : '📅 Daily challenge';
  $('mAchCount').textContent = achievementCount();
  $('mFullscreen').hidden = !fullscreenSupported;
  $('mReset').textContent = resetArmed > 0 ? '⚠️ Tap again to erase everything' : '🗑 Reset all progress';
  $('mReset').classList.toggle('armed', resetArmed > 0);

  const toggle = (id, on) => { $(id).textContent = on ? 'On' : 'Off'; $(id).classList.toggle('on', on); };
  toggle('sSound', !sound.muted);
  toggle('sShake', settings.shake);
  toggle('sContrast', settings.contrast);
  $('sVolume').value = Math.round(settings.volume * 100);
  $('sVolume').disabled = sound.muted;
  for (const b of document.querySelectorAll('#sGraphics button')) b.classList.toggle('active', b.dataset.v === settings.graphics);
  $('sGraphicsNote').textContent = settings.graphics === 'auto'
    ? (liteMode ? 'Auto — switched to lite mode for smoother play' : 'Auto — switches to lite mode if the game runs slowly')
    : settings.graphics === 'high' ? 'High — always full quality' : 'Lite — lower resolution, fewer effects';
}

function quitToTitle() {
  closeMenu(false);
  saveHiScore();
  silenceSiren();
  releaseKeys();
  state = 'title';
  updateHud();
}

// Erases everything the game has saved except settings, and resets it in memory too.
function resetProgress() {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('roadCrossing') && k !== 'roadCrossingSettings' && k !== 'roadCrossingMuted') localStorage.removeItem(k);
  }
  hiScore = 0;
  skinId = 'classic';
  achievements = { unlocked: {}, bonusKinds: [] };
  seenTips = new Set();
  dailyStats = null;
  resetArmed = 0;
  updateHud();
  toast('🗑 Progress reset');
}

function menuTick(dt) {                                 // called every frame (real time)
  if (resetArmed > 0 && (resetArmed -= dt) <= 0) renderMenu();
}

// ---------- Wiring ----------
const onClick = (id, fn) => {
  $(id).addEventListener('pointerdown', e => e.preventDefault());   // never take keyboard focus
  $(id).addEventListener('click', fn);
};

onClick('menuBtn', toggleMenu);
onClick('menuLink', toggleMenu);
onClick('menuClose', () => closeMenu());
menu.addEventListener('click', e => { if (e.target === menu) closeMenu(); });   // click outside the box

onClick('mResume', () => closeMenu());
onClick('mDaily', () => { closeMenu(false); startDailyFromUI(); });
onClick('mSkins', () => { closeMenu(false); openSkinPicker('skins'); });
onClick('mAch', () => { closeMenu(false); openSkinPicker('achievements'); });
onClick('mTips', () => { replayTips(); renderMenu(); });
onClick('mFullscreen', () => toggleFullscreen());
onClick('mQuit', quitToTitle);
onClick('mReset', () => {
  if (resetArmed > 0) resetProgress();
  else resetArmed = 3;
  renderMenu();
});

onClick('sSound', () => { sound.init(); sound.toggleMute(); renderMenu(); });
onClick('sShake', () => { setSetting('shake', !settings.shake); renderMenu(); });
onClick('sContrast', () => { setSetting('contrast', !settings.contrast); renderMenu(); });
$('sVolume').addEventListener('input', e => { setSetting('volume', e.target.value / 100); });
$('sVolume').addEventListener('change', () => { sound.init(); sfx.point(); });   // a sample at the new volume
for (const b of document.querySelectorAll('#sGraphics button')) {
  b.addEventListener('click', () => { setSetting('graphics', b.dataset.v); renderMenu(); });
}

applySettings();
