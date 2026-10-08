// ---------- Sound (synthesized with Web Audio, no files needed) ----------
const sound = {
  ctx: null, master: null, noise: null,
  muted: (() => { try { return localStorage.getItem('roadCrossingMuted') === '1'; } catch { return false; } })(),

  // Browsers only allow audio to start after a user gesture, so this is called from input handlers.
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && state !== 'paused') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    // One second of white noise, reused for footsteps and crashes.
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  },

  ready() { return this.ctx && !this.muted; },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    try { localStorage.setItem('roadCrossingMuted', this.muted ? '1' : '0'); } catch {}
    updateHud();
  },

  output(node, pan) {
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(p);
      p.connect(this.master);
    } else {
      node.connect(this.master);
    }
  },
};

function tone(freq, dur, { type = 'square', gain = 0.2, endFreq = freq, delay = 0, hold = 0, pan = 0 } = {}) {
  if (!sound.ready()) return;
  const ac = sound.ctx, t = ac.currentTime + delay;
  const osc = ac.createOscillator(), g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.setValueAtTime(gain, t + hold);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  sound.output(g, pan);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseBurst(dur, { gain = 0.3, freq = 1000, endFreq = freq, delay = 0 } = {}) {
  if (!sound.ready()) return;
  const ac = sound.ctx, t = ac.currentTime + delay;
  const src = ac.createBufferSource(), filter = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = sound.noise;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq, t);
  if (endFreq !== freq) filter.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filter);
  filter.connect(g);
  sound.output(g);
  src.start(t, Math.random() * 0.4);
  src.stop(t + dur + 0.02);
}

const sfx = {
  step()  { noiseBurst(0.05, { gain: 0.12, freq: 900 }); },
  start() {
    tone(660, 0.12, { type: 'triangle', gain: 0.2 });
    tone(990, 0.18, { type: 'triangle', gain: 0.2, delay: 0.1 });
  },
  honk(pan) {
    tone(392, 0.4, { gain: 0.05, hold: 0.28, pan });
    tone(494, 0.4, { gain: 0.05, hold: 0.28, pan });
  },
  warn() {
    tone(880, 0.09, { type: 'sine', gain: 0.12 });
    tone(880, 0.09, { type: 'sine', gain: 0.12, delay: 0.16 });
  },
  crash() {
    tone(1300, 0.2, { type: 'sawtooth', gain: 0.05, endFreq: 800 });  // tyre screech
    noiseBurst(0.7, { gain: 0.5, freq: 4000, endFreq: 150, delay: 0.08 });
    tone(140, 0.45, { gain: 0.25, endFreq: 40, delay: 0.08 });       // thud
  },
  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.22, delay: i * 0.11 }));
  },
  pickup(type) {
    if (type === 'coin') {
      tone(988, 0.08, { gain: 0.08 });
      tone(1319, 0.2, { gain: 0.08, delay: 0.07 });
    } else {
      [659, 880, 1175].forEach((f, i) => tone(f, 0.16, { type: 'triangle', gain: 0.18, delay: i * 0.06 }));
    }
  },
  shieldBreak() {
    noiseBurst(0.25, { gain: 0.3, freq: 6000, endFreq: 800 });
    tone(700, 0.3, { type: 'triangle', gain: 0.2, endFreq: 200 });
  },
  count() { tone(660, 0.12, { type: 'triangle', gain: 0.18 }); },
  point() { tone(1200, 0.07, { type: 'sine', gain: 0.1 }); },
  tick()  { tone(1600, 0.04, { gain: 0.06 }); },
  timeUp() {                            // dissonant buzzer
    tone(220, 0.6, { gain: 0.15, hold: 0.4 });
    tone(233, 0.6, { gain: 0.15, hold: 0.4 });
  },
  // Wailing siren that swells during the warning, then pans across as the vehicle passes.
  // Returns a function that stops it early.
  siren(dur, panFrom) {
    if (!sound.ready()) return () => {};
    const ac = sound.ctx, t = ac.currentTime;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = 'triangle';
    for (let s = 0; s < dur; s += 0.7) {
      osc.frequency.setValueAtTime(950, t + s);
      osc.frequency.setValueAtTime(700, t + s + 0.35);
    }
    g.gain.setValueAtTime(0.02, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + EMERGENCY_WARN);
    g.gain.setValueAtTime(0.12, t + dur - 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    if (ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.setValueAtTime(panFrom, t + EMERGENCY_WARN);
      p.pan.linearRampToValueAtTime(-panFrom, t + dur);
      g.connect(p);
      p.connect(sound.master);
    } else {
      g.connect(sound.master);
    }
    osc.start(t);
    osc.stop(t + dur);
    return () => { try { osc.stop(); } catch {} };
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, { type: 'triangle', gain: 0.22, delay: i * 0.22 }));
  },
};
