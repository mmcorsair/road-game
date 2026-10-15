// ---------- Background music ----------
// A small generated chiptune (no audio files): bass, arpeggiated lead and drums over a 4-chord loop.
// It plays during a game, speeds up with the level and again when the clock runs low, switches to a
// darker progression on boss levels and a softer lead at night. Notes are scheduled a little ahead
// on the audio clock (so timing stays tight however the frames fall); pausing suspends the audio
// clock, which pauses the music too.
import { G } from './store.js';
import { sound } from './sound.js';

export const MIDI = m => 440 * Math.pow(2, (m - 69) / 12);

export const PROGRESSIONS = {
  // chord tones for the arpeggio (MIDI), and the bass root for each bar
  normal: { chords: [[69, 72, 76], [65, 69, 72], [64, 67, 72], [67, 71, 74]], bass: [45, 41, 48, 43] },   // Am F C G
  boss:   { chords: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [61, 64, 69]], bass: [38, 46, 48, 45] },   // Dm Bb C A
};
export const ARP = [0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1, 2, 1, 0, -1];   // -1 = rest
export const BASS_STEPS = new Set([0, 3, 6, 8, 11, 14]);
export const MUSIC_STATES = ['countdown', 'playing', 'hit', 'levelup'];

export const music = { bus: null, playing: false, nextTime: 0, step: 0 };
export const MUSIC_LEVEL = 0.6;         // music sits under the sound effects (measured: similar loudness at 0.9)

// Beats per minute: a little faster each level; much faster when time is running out.
export function musicTempo() {
  const bpm = Math.min(150, 112 + 2 * G.level);
  return musicUrgent() ? bpm * 1.3 : bpm;
}
export const musicUrgent = () => G.state === 'playing' && G.timeLeft <= 8;
export const musicProgression = () => PROGRESSIONS[G.boss ? 'boss' : 'normal'];

export function musicWanted() {
  return !!sound.ctx && !sound.muted && G.settings.musicOn && MUSIC_STATES.includes(G.state);
}

export function applyMusicVolume() {
  if (music.bus) music.bus.gain.value = MUSIC_LEVEL * G.settings.musicVolume;
}

export function startMusic() {
  const ac = sound.ctx;
  music.bus = ac.createGain();
  music.bus.gain.setValueAtTime(0.0001, ac.currentTime);
  music.bus.gain.exponentialRampToValueAtTime(Math.max(0.0001, MUSIC_LEVEL * G.settings.musicVolume), ac.currentTime + 0.6);
  music.bus.connect(sound.master);
  music.playing = true;
  music.nextTime = ac.currentTime + 0.05;
  music.step = 0;
}

export function stopMusic() {
  const ac = sound.ctx, bus = music.bus;
  music.playing = false;
  music.bus = null;
  if (!bus || !ac) return;
  bus.gain.cancelScheduledValues(ac.currentTime);
  bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), ac.currentTime);
  bus.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4);
  setTimeout(() => bus.disconnect(), 600);
}

// Called every frame from the main loop: start/stop as needed and schedule the next notes.
export function musicTick() {
  if (!musicWanted()) {
    if (music.playing) stopMusic();
    return;
  }
  if (!music.playing) startMusic();
  const ac = sound.ctx;
  if (music.nextTime < ac.currentTime) music.nextTime = ac.currentTime + 0.02;   // fell behind (e.g. a slow frame)
  while (music.nextTime < ac.currentTime + 0.15) {
    scheduleStep(music.step, music.nextTime);
    music.nextTime += 60 / musicTempo() / 4;            // sixteenth notes
    music.step++;
  }
}

export function scheduleStep(step, t) {
  const s = step % 16, bar = Math.floor(step / 16) % 4;
  const prog = musicProgression(), chord = prog.chords[bar];
  const urgent = musicUrgent();

  // Lead: an arpeggio of the chord, an octave up in the second half of every other bar.
  const i = ARP[s];
  if (i >= 0) {
    const up = s >= 8 && Math.floor(step / 16) % 2 ? 12 : 0;
    musicNote(MIDI(chord[i] + up + (urgent ? 12 : 0)), t, 0.09, G.weather.night ? 'triangle' : 'square', 0.045);
  }
  // Bass: a syncopated root, jumping an octave on the half bar.
  if (BASS_STEPS.has(s)) musicNote(MIDI(prog.bass[bar] + (s === 8 ? 12 : 0)), t, 0.16, 'triangle', 0.11);
  // Drums. Boss levels and the last seconds get a driving four-on-the-floor kick.
  if (s % 8 === 0 || ((G.boss || urgent) && s % 4 === 0)) musicKick(t);
  if (s === 4 || s === 12) musicNoise(t, 0.12, 1800, 'bandpass', 0.16);           // snare
  if (urgent || s % 2 === 0) musicNoise(t, 0.03, 7000, 'highpass', 0.05);         // hi-hat
}

export function musicNote(freq, t, dur, type, gain) {
  const ac = sound.ctx, osc = ac.createOscillator(), g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(music.bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function musicKick(t) {
  const ac = sound.ctx, osc = ac.createOscillator(), g = ac.createGain();
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  osc.connect(g);
  g.connect(music.bus);
  osc.start(t);
  osc.stop(t + 0.17);
}

export function musicNoise(t, dur, freq, type, gain) {
  const ac = sound.ctx, src = ac.createBufferSource(), filter = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = sound.noise;
  filter.type = type;
  filter.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(music.bus);
  src.start(t);
  src.stop(t + dur + 0.02);
}
