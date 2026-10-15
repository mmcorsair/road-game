// ---------- Skins ----------
// Unlocked by best score ever. Each draw(g, swing, now) paints the character centered at 0,0,
// facing up (-y), about 24 px across; `swing` (-5…5) animates the walk.
import { G } from './store.js';
import { FINISH_H, W } from './config.js';
import { sfx } from './sound.js';
import { ACHIEVEMENT_BY_ID, achievementCount, hasAchievement, renderAchievements, toast, unlockAchievement } from './achievements.js';
import { ctx, dpr } from './render.js';
import { canPause, releaseKeys, setPaused } from './input.js';

export function ellipse(g, x, y, rx, ry, color) {
  g.fillStyle = color;
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

export const SKINS = [
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
  {
    id: 'skater', name: 'Skater', score: 10000,
    draw(g, swing) {
      g.rotate(swing * 0.02);                                  // gentle sway on the board
      g.fillStyle = '#8e44ad';                                 // the board, along the direction of travel
      g.beginPath(); g.roundRect(-6, -15, 12, 30, 6); g.fill();
      g.fillStyle = '#f1c40f';                                 // wheels
      for (const [x, y] of [[-6, -10], [6, -10], [-6, 10], [6, 10]]) { g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); }
      ellipse(g, 0, -6, 3, 4, '#2c3e50');                      // feet, one in front of the other
      ellipse(g, 0, 7, 3, 4, '#2c3e50');
      ellipse(g, -12, 1, 3, 3, '#f0c08a');                     // arms out for balance
      ellipse(g, 12, -1, 3, 3, '#f0c08a');
      ellipse(g, 0, 0, 7, 10, '#e67e22');                      // standing sideways: shoulders along the board
      ellipse(g, 0, 0, 5, 5, '#f0c08a');
      ellipse(g, 0, 1, 5, 4, '#c0392b');                       // backwards cap
    },
  },
  {
    id: 'duck', name: 'Duck', score: 12500, previewScale: 1.15, previewY: 26,
    draw(g, swing, now) {
      for (let i = 0; i < 3; i++) {                            // ducklings waddling behind (decoration only)
        const x = Math.sin(now / 170 + i * 1.7) * 2.5, y = 15 + i * 8;
        ellipse(g, x, y, 3.2, 3.6, '#f7dc6f');
        ellipse(g, x, y - 3.5, 1.2, 1, '#e67e22');
      }
      ellipse(g, -3.5, 2 + swing * 0.6, 2.5, 3.5, '#e67e22'); // orange feet
      ellipse(g, 3.5, 2 - swing * 0.6, 2.5, 3.5, '#e67e22');
      ellipse(g, 0, 2, 7.5, 10, '#8d6e63');                    // brown body
      ellipse(g, -6, 3, 2.5, 6, '#6d4c41');                    // folded wings
      ellipse(g, 6, 3, 2.5, 6, '#6d4c41');
      ellipse(g, 0, -8, 4.5, 4.5, '#1e8449');                  // green head
      g.fillStyle = '#f39c12';                                 // bill
      g.beginPath(); g.roundRect(-2, -15, 4, 5, 2); g.fill();
    },
  },
  {
    id: 'astronaut', name: 'Astronaut', score: 15000,
    draw(g, swing) {
      g.fillStyle = '#95a5a6';                                 // life-support backpack
      g.beginPath(); g.roundRect(-8, 3, 16, 9, 3); g.fill();
      ellipse(g, -5, swing, 3.5, 6, '#7f8c8d');                // boots
      ellipse(g, 5, -swing, 3.5, 6, '#7f8c8d');
      ellipse(g, -11, -swing * 0.8, 3.2, 3.2, '#ecf0f1');      // gloves
      ellipse(g, 11, swing * 0.8, 3.2, 3.2, '#ecf0f1');
      ellipse(g, 0, 0, 11, 7.5, '#fdfefe');                    // suit
      ellipse(g, 0, -1, 6.5, 6.5, '#ecf0f1');                  // helmet
      g.fillStyle = '#f5b041';                                 // gold visor facing forward
      g.beginPath(); g.ellipse(0, -4, 4.5, 2.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#e74c3c';                                 // mission patch
      g.fillRect(6, -2, 2.5, 2.5);
    },
  },
  {
    id: 'penguin', name: 'Penguin', score: 17500,
    draw(g, swing) {
      g.rotate(swing * 0.04);                                  // the waddle
      ellipse(g, -3, 3, 2.5, 3, '#f39c12');                    // feet
      ellipse(g, 3, 3, 2.5, 3, '#f39c12');
      const flap = Math.abs(swing) / 5;
      ellipse(g, -8 - flap, 2, 2.5, 6.5, '#17202a');           // flippers
      ellipse(g, 8 + flap, 2, 2.5, 6.5, '#17202a');
      ellipse(g, 0, 1, 8, 10, '#1c2833');                      // body
      ellipse(g, 0, -2, 5.5, 6.5, '#fdfefe');                  // white front
      ellipse(g, 0, -6, 4.5, 4.5, '#1c2833');                  // head
      g.fillStyle = '#f39c12';                                 // beak
      g.beginPath(); g.moveTo(-1.5, -10); g.lineTo(1.5, -10); g.lineTo(0, -13); g.closePath(); g.fill();
    },
  },
  {
    id: 'knight', name: 'Knight', score: 20000,
    draw(g, swing) {
      g.strokeStyle = '#d5d8dc';                               // sword
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(12, swing * 0.8); g.lineTo(12, -16 + swing * 0.8); g.stroke();
      g.fillStyle = '#7d6608';
      g.fillRect(9, -1 + swing * 0.8, 6, 2);
      ellipse(g, -5, swing, 3.5, 6, '#566573');
      ellipse(g, 5, -swing, 3.5, 6, '#566573');
      ellipse(g, 0, 0, 11, 7.5, '#aab7b8');                    // armour
      g.fillStyle = '#1f618d';                                 // shield with a cross
      g.beginPath(); g.roundRect(-16, -6 - swing * 0.8, 7, 12, 2); g.fill();
      g.fillStyle = '#f4d03f';
      g.fillRect(-13.2, -5 - swing * 0.8, 1.4, 10);
      g.fillRect(-15, -1 - swing * 0.8, 5, 1.4);
      ellipse(g, 0, -1, 5.5, 5.5, '#839192');                  // helmet
      g.fillStyle = '#1b2631';                                 // visor slit
      g.fillRect(-3.5, -5.5, 7, 1.4);
      ellipse(g, 0, 2, 1.8, 5, '#c0392b');                     // red plume
    },
  },
  {
    id: 'royal', name: 'Royal', achievement: 'tour',
    draw(g, swing, now) {
      const flow = Math.sin(now / 200) * 1.5;                  // flowing cape behind
      g.fillStyle = '#6c3483';
      g.beginPath(); g.moveTo(-10, 0); g.quadraticCurveTo(-12 + flow, 14, 0, 17); g.quadraticCurveTo(12 + flow, 14, 10, 0); g.closePath(); g.fill();
      ellipse(g, -5, swing, 3.5, 6, '#2c3e50');
      ellipse(g, 5, -swing, 3.5, 6, '#2c3e50');
      ellipse(g, -11, -swing * 0.8, 3, 3, '#f0c08a');
      ellipse(g, 11, swing * 0.8, 3, 3, '#f0c08a');
      ellipse(g, 0, 0, 11, 7, '#922b21');                      // red robe
      ellipse(g, 0, -1, 5.5, 5.5, '#f0c08a');
      g.fillStyle = '#f4d03f';                                 // golden crown with points
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, r = i % 2 ? 3.5 : 6;
        g.lineTo(Math.cos(a) * r, -1 + Math.sin(a) * r);
      }
      g.closePath(); g.fill();
      ellipse(g, 0, -1, 1.5, 1.5, '#e74c3c');                  // a ruby on top
    },
  },
  {
    id: 'ghost', name: 'Ghost', achievement: 'ghostTrain',
    draw(g, swing, now) {
      g.save();
      g.globalAlpha *= 0.88;
      g.fillStyle = '#fbfcfc';                                 // the sheet, with a wavy hem trailing behind
      g.beginPath();
      g.moveTo(-10, -2);
      g.quadraticCurveTo(-10, -13, 0, -13);
      g.quadraticCurveTo(10, -13, 10, -2);
      for (let i = 0; i <= 4; i++) {
        const x = 10 - i * 5, y = 11 + Math.sin(now / 120 + i) * 2.5;
        g.lineTo(x, y);
      }
      g.closePath(); g.fill();
      g.restore();
      ellipse(g, -3, -7, 1.6, 2.4, '#2c3e50');                 // eyes looking forward
      ellipse(g, 3, -7, 1.6, 2.4, '#2c3e50');
    },
  },
];

// ---------- Unlocking & choosing ----------
G.skinId = (() => { try { return localStorage.getItem('roadCrossingSkin') || 'classic'; } catch { return 'classic'; } })();
G.banner = null;              // { text, t } — "New skin unlocked!" message shown during play
G.skinsUnlockedThisGame = [];

export const bestScore = () => Math.max(G.hiScore, G.score);
// Skins unlock at a best score, or (if they name one) with an achievement.
export const isUnlocked = skin => (skin.achievement ? hasAchievement(skin.achievement) : skin.score <= bestScore());
export const lockedLabel = skin => (skin.achievement ? `🔒 ${ACHIEVEMENT_BY_ID[skin.achievement].name}` : `🔒 ${skin.score.toLocaleString()} pts`);
export const currentSkin = () => SKINS.find(s => s.id === G.skinId && isUnlocked(s)) || SKINS[0];

export function chooseSkin(id) {
  G.skinId = id;
  if (id !== 'classic') unlockAchievement('style');
  try { localStorage.setItem('roadCrossingSkin', id); } catch {}
  renderSkinPicker();
}

// Called whenever the score grows: announce skins whose threshold was just passed for the first time.
export function checkSkinUnlocks(oldScore) {
  if (G.mode === 'practice') return;                     // practice scores don't count
  for (const skin of SKINS) {
    if (skin.score > G.hiScore && oldScore < skin.score && G.score >= skin.score) {
      G.skinsUnlockedThisGame.push(skin.name);
      toast(`🎉 New skin unlocked: ${skin.name}!`);
      sfx.levelUp();
    }
  }
}

export function drawBanner() {
  if (!G.banner) return;
  G.banner.max ??= G.banner.t;                               // remember the full duration on first draw
  const t = G.banner.t;
  const slide = Math.min(1, (G.banner.max - t) * 5, t * 3);   // slide in, then out
  ctx.save();
  ctx.globalAlpha = slide;
  ctx.translate(W / 2, FINISH_H + 26 - (1 - slide) * 20);
  ctx.font = 'bold 16px system-ui, sans-serif';
  const width = Math.min(W - 20, ctx.measureText(G.banner.text).width + 40);
  ctx.fillStyle = 'rgba(0,0,0,.7)';
  ctx.beginPath(); ctx.roundRect(-width / 2, -18, width, 36, 18); ctx.fill();
  ctx.fillStyle = '#ffe36e';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(G.banner.text, 0, 1);
  ctx.restore();
}

// ---------- Skins & achievements panel ----------
export const skinPanel = document.getElementById('skins');
export const skinGrid = document.getElementById('skinGrid');
G.panelTab = 'skins';           // 'skins' or 'achievements'

export function skinPickerOpen() {
  return !skinPanel.hidden;
}

export function openSkinPicker(tab = 'skins') {
  if (canPause()) setPaused(true);
  releaseKeys();
  G.panelTab = tab;
  skinPanel.hidden = false;
  renderSkinPicker();
}

export function closeSkinPicker() {
  skinPanel.hidden = true;
}

// Rebuilds the cards (cheap: a handful of buttons); previews are animated by drawSkinPreviews().
export function renderSkinPicker() {
  if (skinPanel.hidden) return;
  for (const tab of document.querySelectorAll('.tab')) tab.classList.toggle('active', tab.dataset.tab === G.panelTab);
  document.getElementById('achCount').textContent = achievementCount();
  skinGrid.hidden = G.panelTab !== 'skins';
  document.getElementById('achList').hidden = G.panelTab !== 'achievements';
  document.getElementById('panelNote').textContent = G.panelTab === 'skins'
    ? 'Unlock more with higher scores — and two with achievements.' : 'Achievements are saved in this browser.';
  if (G.panelTab === 'achievements') return renderAchievements();
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
    label.textContent = unlocked ? skin.name : lockedLabel(skin);
    card.append(preview, label);
    card.addEventListener('click', () => chooseSkin(skin.id));
    skinGrid.append(card);
  }
  drawSkinPreviews(performance.now());
}

export function drawSkinPreviews(now) {
  if (skinPanel.hidden || skinGrid.hidden) return;
  for (const c of skinGrid.querySelectorAll('canvas')) {
    const skin = SKINS.find(s => s.id === c.dataset.skin);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, 64, 64);
    g.translate(32, skin.previewY ?? 34);
    g.scale(skin.previewScale ?? 1.6, skin.previewScale ?? 1.6);
    if (!isUnlocked(skin)) g.filter = 'grayscale(1) brightness(0.5)';
    skin.draw(g, Math.sin(now / 130) * 5, now);
    g.filter = 'none';
  }
}

   // click outside the box

// Wires up the skins & achievements panel (called once by main.js at start-up).
export function initSkins() {
  document.getElementById('skinsClose').addEventListener('click', closeSkinPicker);
  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => { G.panelTab = tab.dataset.tab; renderSkinPicker(); });
  }
  skinPanel.addEventListener('click', e => { if (e.target === skinPanel) closeSkinPicker(); });
}
