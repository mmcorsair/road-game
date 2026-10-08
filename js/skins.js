// ---------- Skins ----------
// Unlocked by best score ever. Each draw(g, swing, now) paints the character centered at 0,0,
// facing up (-y), about 24 px across; `swing` (-5…5) animates the walk.

function ellipse(g, x, y, rx, ry, color) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

const SKINS = [
  {
    id: 'classic', name: 'Classic', score: 0,
    draw(g, swing) {
      ellipse(g, -5, swing, 3.5, 6, '#2c3e50');       // feet
      ellipse(g, 5, -swing, 3.5, 6, '#2c3e50');
      ellipse(g, -11, -swing * 0.8, 3, 3, '#f0c08a'); // hands
      ellipse(g, 11, swing * 0.8, 3, 3, '#f0c08a');
      ellipse(g, 0, 0, 11, 7, '#e67e22');             // shoulders / shirt
      ellipse(g, 0, -1, 5.5, 5.5, '#f0c08a');         // head (face toward the front)
      ellipse(g, 0, 0.5, 5.5, 4.5, '#6b4226');        // hair
    },
  },
  {
    id: 'kid', name: 'Kid', score: 500,
    draw(g, swing) {
      g.scale(0.85, 0.85);
      ellipse(g, -4.5, swing, 3, 5.5, '#34495e');
      ellipse(g, 4.5, -swing, 3, 5.5, '#34495e');
      ellipse(g, -10, -swing * 0.8, 3, 3, '#f5cba7');
      ellipse(g, 10, swing * 0.8, 3, 3, '#f5cba7');
      ellipse(g, 0, 0, 10, 6.5, '#3498db');
      ellipse(g, 0, -6.5, 5, 2.5, '#c0392b');          // cap brim pointing forward
      ellipse(g, 0, 0, 6, 6, '#e74c3c');               // cap
      ellipse(g, 0, 0, 1.5, 1.5, '#c0392b');           // button on top
    },
  },
  {
    id: 'dog', name: 'Dog', score: 1000,
    draw(g, swing, now) {
      ellipse(g, -5, -6 + swing * 0.6, 2.5, 3.5, '#6e3b1f');   // legs
      ellipse(g, 5, -6 - swing * 0.6, 2.5, 3.5, '#6e3b1f');
      ellipse(g, -5, 7 - swing * 0.6, 2.5, 3.5, '#6e3b1f');
      ellipse(g, 5, 7 + swing * 0.6, 2.5, 3.5, '#6e3b1f');
      g.save();                                                 // wagging tail
      g.translate(0, 10);
      g.rotate(Math.sin(now / 90) * 0.6);
      ellipse(g, 0, 4, 1.8, 5, '#8b4a24');
      g.restore();
      ellipse(g, 0, 1, 7, 11, '#a0522d');                      // body
      ellipse(g, 0, -11, 5.5, 5.5, '#a0522d');                 // head
      ellipse(g, -5.5, -10, 2.2, 4.5, '#5c2e14');              // floppy ears
      ellipse(g, 5.5, -10, 2.2, 4.5, '#5c2e14');
      ellipse(g, 0, -15.5, 3, 2.5, '#c27a4a');                 // snout
      ellipse(g, 0, -17.5, 1.5, 1, '#1b1b1b');                 // nose
    },
  },
  {
    id: 'granny', name: 'Granny', score: 2000,
    draw(g, swing) {
      g.strokeStyle = '#bdc3c7';                               // walking frame in front
      g.lineWidth = 2;
      g.strokeRect(-10, -19, 20, 9);
      ellipse(g, -4, swing * 0.5, 3, 5, '#5d4037');
      ellipse(g, 4, -swing * 0.5, 3, 5, '#5d4037');
      ellipse(g, -9, -10, 2.5, 2.5, '#f0c08a');                // hands on the frame
      ellipse(g, 9, -10, 2.5, 2.5, '#f0c08a');
      ellipse(g, 0, 0, 11, 8, '#8e44ad');                      // dress
      ellipse(g, 0, 1, 9, 5, '#a569bd');                       // shawl
      ellipse(g, 0, -1, 5.5, 5.5, '#ecf0f1');                  // white hair
      ellipse(g, 0, 4, 2.8, 2.8, '#dfe6e9');                   // bun at the back
    },
  },
  {
    id: 'robot', name: 'Robot', score: 3500,
    draw(g, swing, now) {
      g.fillStyle = '#566573';                                 // feet
      g.fillRect(-8, -4 + swing, 5, 9);
      g.fillRect(3, -4 - swing, 5, 9);
      g.fillStyle = '#7f8c8d';                                 // arms
      g.fillRect(-15, -3 - swing * 0.8, 4, 7);
      g.fillRect(11, -3 + swing * 0.8, 4, 7);
      g.fillStyle = '#aab7b8';                                 // body
      g.beginPath(); g.roundRect(-11, -6, 22, 12, 3); g.fill();
      g.fillStyle = '#839192';                                 // head
      g.beginPath(); g.roundRect(-5.5, -6.5, 11, 11, 2); g.fill();
      g.fillStyle = '#48c9ff';                                 // visor facing forward
      g.fillRect(-4, -6.5, 8, 2.5);
      ellipse(g, 0, 0, 1.8, 1.8, Math.floor(now / 400) % 2 ? '#e74c3c' : '#2ecc71');   // antenna light
    },
  },
  {
    id: 'chicken', name: 'Chicken', score: 5000,
    draw(g, swing) {
      ellipse(g, -3.5, 2 + swing * 0.7, 2, 3.5, '#f39c12');    // feet
      ellipse(g, 3.5, 2 - swing * 0.7, 2, 3.5, '#f39c12');
      const flap = 1 + Math.abs(swing) / 10;
      ellipse(g, -8 * flap, 2, 3.5 * flap, 6, '#ecf0f1');      // wings
      ellipse(g, 8 * flap, 2, 3.5 * flap, 6, '#ecf0f1');
      ellipse(g, 0, 3, 7.5, 9, '#ffffff');                     // body
      ellipse(g, 0, 11, 4, 3, '#ecf0f1');                      // tail feathers
      ellipse(g, 0, -8, 5, 5, '#ffffff');                      // head
      ellipse(g, 0, -9, 1.6, 4, '#e74c3c');                    // comb along the top
      g.fillStyle = '#f39c12';                                 // beak
      g.beginPath(); g.moveTo(-2, -12); g.lineTo(2, -12); g.lineTo(0, -16); g.closePath(); g.fill();
    },
  },
  {
    id: 'ninja', name: 'Ninja', score: 7500,
    draw(g, swing, now) {
      g.strokeStyle = '#e74c3c';                               // headband tails fluttering behind
      g.lineWidth = 2;
      g.lineCap = 'round';
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(side * 1.5, 4);
        g.quadraticCurveTo(side * (4 + Math.sin(now / 70 + side) * 3), 10, side * (2 + Math.sin(now / 50) * 2), 16);
        g.stroke();
      }
      ellipse(g, -5, swing, 3.5, 6, '#111');
      ellipse(g, 5, -swing, 3.5, 6, '#111');
      ellipse(g, -11, -swing * 0.8, 3, 3, '#222');
      ellipse(g, 11, swing * 0.8, 3, 3, '#222');
      ellipse(g, 0, 0, 11, 7, '#1c1c1c');
      ellipse(g, 0, -1, 5.5, 5.5, '#2b2b2b');
      g.fillStyle = '#e74c3c';                                 // headband
      g.fillRect(-5.5, -2.5, 11, 2);
      g.fillStyle = '#f0c08a';                                 // eye slit
      g.fillRect(-3.5, -6, 7, 1.6);
    },
  },
];

// ---------- Unlocking & choosing ----------
let skinId = (() => { try { return localStorage.getItem('roadCrossingSkin') || 'classic'; } catch { return 'classic'; } })();
let banner = null;              // { text, t } — "New skin unlocked!" message shown during play
let skinsUnlockedThisGame = [];

const bestScore = () => Math.max(hiScore, score);
const isUnlocked = skin => skin.score <= bestScore();
const currentSkin = () => SKINS.find(s => s.id === skinId && isUnlocked(s)) || SKINS[0];

function chooseSkin(id) {
  skinId = id;
  try { localStorage.setItem('roadCrossingSkin', id); } catch {}
  renderSkinPicker();
}

// Called whenever the score grows: announce skins whose threshold was just passed for the first time.
function checkSkinUnlocks(oldScore) {
  for (const skin of SKINS) {
    if (skin.score > hiScore && oldScore < skin.score && score >= skin.score) {
      skinsUnlockedThisGame.push(skin.name);
      banner = { text: `New skin unlocked: ${skin.name}!`, t: 2.5 };
      sfx.levelUp();
    }
  }
}

function drawBanner() {
  if (!banner) return;
  const t = banner.t;
  const slide = Math.min(1, (2.5 - t) * 5, t * 3);      // slide in, then out
  ctx.save();
  ctx.globalAlpha = slide;
  ctx.translate(W / 2, FINISH_H + 26 - (1 - slide) * 20);
  ctx.fillStyle = 'rgba(0,0,0,.7)';
  ctx.beginPath(); ctx.roundRect(-150, -18, 300, 36, 18); ctx.fill();
  ctx.fillStyle = '#ffe36e';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🎉 ${banner.text}`, 0, 1);
  ctx.restore();
}

// ---------- Skin picker panel ----------
const skinPanel = document.getElementById('skins');
const skinGrid = document.getElementById('skinGrid');

function skinPickerOpen() {
  return !skinPanel.hidden;
}

function openSkinPicker() {
  if (canPause()) setPaused(true);
  releaseKeys();
  skinPanel.hidden = false;
  renderSkinPicker();
}

function closeSkinPicker() {
  skinPanel.hidden = true;
}

// Rebuilds the cards (cheap: a handful of buttons); previews are animated by drawSkinPreviews().
function renderSkinPicker() {
  if (skinPanel.hidden) return;
  skinGrid.textContent = '';
  for (const skin of SKINS) {
    const unlocked = isUnlocked(skin);
    const card = document.createElement('button');
    card.className = 'skin-card' + (skin.id === currentSkin().id ? ' selected' : '') + (unlocked ? '' : ' locked');
    card.disabled = !unlocked;
    card.tabIndex = -1;
    const preview = document.createElement('canvas');
    preview.width = preview.height = 64 * dpr;
    preview.dataset.skin = skin.id;
    const label = document.createElement('span');
    label.textContent = unlocked ? skin.name : `🔒 ${skin.score.toLocaleString()} pts`;
    card.append(preview, label);
    card.addEventListener('click', () => chooseSkin(skin.id));
    skinGrid.append(card);
  }
  drawSkinPreviews(performance.now());
}

function drawSkinPreviews(now) {
  if (skinPanel.hidden) return;
  for (const c of skinGrid.querySelectorAll('canvas')) {
    const skin = SKINS.find(s => s.id === c.dataset.skin);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, 64, 64);
    g.translate(32, 34);
    g.scale(1.6, 1.6);
    if (!isUnlocked(skin)) g.filter = 'grayscale(1) brightness(0.5)';
    skin.draw(g, Math.sin(now / 130) * 5, now);
    g.filter = 'none';
  }
}

document.getElementById('skinsClose').addEventListener('click', closeSkinPicker);
skinPanel.addEventListener('click', e => { if (e.target === skinPanel) closeSkinPicker(); });   // click outside the box
for (const id of ['skinsBtn', 'skinsLink']) {
  const btn = document.getElementById(id);
  btn.addEventListener('pointerdown', e => e.preventDefault());       // don't take keyboard focus
  btn.addEventListener('click', () => (skinPickerOpen() ? closeSkinPicker() : openSkinPicker()));
}
