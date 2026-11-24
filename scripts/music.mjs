// Generates a short, upbeat, copyright-free background track as a WAV file.
// The key and chord progression change with the day number, so every video sounds a bit different.
//
//   import { writeMusic } from './music.mjs'; writeMusic('out.wav', 36, 7);
//   node scripts/music.mjs out.wav 36 7

import fs from 'node:fs';

const SR = 44100;

export function writeMusic(file, seconds, day = 1, style = 'pop') {
  if (style === 'synthwave') return writeSynthwave(file, seconds, day);
  const keys = [0, 2, 5, 7, -3]; // C, D, F, G, A (semitones from C4)
  const progressions = [
    [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], // I  V  vi IV
    [[9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14]], // vi IV I  V
    [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]], // I  vi IV V
  ];
  const key = keys[day % keys.length];
  const prog = progressions[Math.floor(day / keys.length) % progressions.length];
  const bpm = 100 + (day % 3) * 6;
  const beat = 60 / bpm;
  const chordLen = beat * 4;

  const n = Math.ceil(seconds * SR);
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const freq = (semi) => 261.63 * Math.pow(2, (semi + key) / 12);
  let noiseSeed = 1234 + day;
  const noise = () => ((noiseSeed = (noiseSeed * 1664525 + 1013904223) >>> 0) / 2 ** 31) - 1;

  const addTone = (start, dur, f, vol, { attack = 0.005, decay = 4, type = 'sine', pan = 0 } = {}) => {
    const s0 = Math.floor(start * SR);
    const len = Math.floor(dur * SR);
    for (let i = 0; i < len && s0 + i < n; i++) {
      const t = i / SR;
      const env = Math.min(1, t / attack) * Math.exp(-decay * t) * Math.min(1, (len - i) / (0.01 * SR));
      const ph = 2 * Math.PI * f * t;
      let v;
      if (type === 'tri') v = (2 / Math.PI) * Math.asin(Math.sin(ph));
      else if (type === 'kick') v = Math.sin(2 * Math.PI * (50 * t + (70 / 18) * (1 - Math.exp(-18 * t))));
      else if (type === 'noise') v = noise();
      else v = Math.sin(ph) + 0.25 * Math.sin(2 * ph);
      v *= env * vol;
      L[s0 + i] += v * (1 - Math.max(0, pan));
      R[s0 + i] += v * (1 + Math.min(0, pan));
    }
  };

  for (let c = 0; c * chordLen < seconds; c++) {
    const chord = prog[c % prog.length];
    const t0 = c * chordLen;
    // Pad
    chord.forEach((semi, i) => addTone(t0, chordLen + 0.3, freq(semi - 12), 0.06, { attack: 0.4, decay: 0.25, pan: (i - 1) * 0.4 }));
    // Bass on every beat
    for (let b = 0; b < 4; b++) addTone(t0 + b * beat, beat * 0.9, freq(chord[0] - 24), 0.16, { decay: 3 });
    // Pluck arpeggio in eighth notes
    const pattern = [0, 1, 2, 1, 2, 0, 1, 2];
    for (let k = 0; k < 8; k++) {
      const semi = chord[pattern[k]] + (k >= 4 ? 12 : 0);
      addTone(t0 + k * beat * 0.5, beat * 0.5, freq(semi), 0.09, { type: 'tri', decay: 7, pan: k % 2 ? 0.35 : -0.35 });
    }
    // Drums (they come in after the first chord)
    if (c > 0) {
      for (let b = 0; b < 4; b++) {
        if (b % 2 === 0) addTone(t0 + b * beat, 0.25, 0, 0.45, { type: 'kick', decay: 14 });
        addTone(t0 + b * beat + beat / 2, 0.06, 0, 0.05, { type: 'noise', decay: 60, pan: 0.2 });
      }
    }
  }

  // Little stereo echo, fades, normalize
  const d = Math.floor(0.19 * SR);
  for (let i = n - 1; i >= d; i--) { L[i] += R[i - d] * 0.22; R[i] += L[i - d] * 0.22; }
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const g = Math.min(1, t / 0.3) * Math.min(1, (seconds - t) / 1.8);
    L[i] *= g; R[i] *= g;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = peak > 0 ? 0.85 / peak : 1;

  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
  return file;
}

/** Normalizes the two channels and writes a 16-bit stereo WAV. */
function saveWav(file, L, R, seconds) {
  const n = L.length;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const g = Math.min(1, t / 0.3) * Math.min(1, (seconds - t) / 1.8);
    L[i] *= g; R[i] *= g;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = peak > 0 ? 0.85 / peak : 1;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
  return file;
}

/**
 * An original 80s "sunset drive" synthwave groove (for special episodes): minor key, i-VI-III-VII, a pulsing
 * octave bass in sixteenths, warm detuned saw pads, a gated snare on 2 and 4, a simple lead hook. Copyright-free.
 */
function writeSynthwave(file, seconds, day = 1) {
  const n = Math.ceil(seconds * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  const bpm = 96, beat = 60 / bpm, bar = beat * 4;
  const root = -3 + (day % 2) * 2; // A minor or B minor
  const prog = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]]; // i VI III VII
  const freq = (semi) => 261.63 * Math.pow(2, (semi + root) / 12);
  let seed = 777 + day;
  const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 31) - 1;
  const saw = (ph) => 2 * ((ph / (2 * Math.PI)) % 1) - 1;
  const add = (start, dur, f, vol, { attack = 0.01, release = 0.1, decay = 0, kind = 'saw', pan = 0, detune = 0 } = {}) => {
    const s0 = Math.floor(start * SR), len = Math.floor(dur * SR);
    let lp = 0; // a gentle one-pole low-pass makes the saws warm
    for (let i = 0; i < len && s0 + i < n; i++) {
      const t = i / SR;
      const env = Math.min(1, t / attack) * Math.min(1, (len - i) / (release * SR)) * (decay ? Math.exp(-decay * t) : 1);
      let v;
      if (kind === 'saw') v = (saw(2 * Math.PI * f * t) + saw(2 * Math.PI * f * (1 + detune) * t)) * 0.5;
      else if (kind === 'square') v = Math.sign(Math.sin(2 * Math.PI * f * t)) * 0.6;
      else if (kind === 'kick') v = Math.sin(2 * Math.PI * (45 * t + (90 / 16) * (1 - Math.exp(-16 * t))));
      else v = noise();
      lp += (v - lp) * (kind === 'noise' ? 0.6 : 0.18);
      const out = lp * env * vol;
      L[s0 + i] += out * (1 - Math.max(0, pan));
      R[s0 + i] += out * (1 + Math.min(0, pan));
    }
  };
  const hook = [7, 10, 12, 10, 7, 5, 3, 5]; // the lead melody, eighth notes over two bars
  for (let c = 0; c * bar < seconds; c++) {
    const ch = prog[c % 4], t0 = c * bar;
    ch.forEach((s, i) => add(t0, bar + 0.2, freq(s - 12), 0.05, { attack: 0.5, release: 0.5, pan: (i - 1) * 0.5, detune: 0.006 })); // pad
    for (let k = 0; k < 16; k++) add(t0 + k * beat / 4, beat / 4 * 0.9, freq(ch[0] - 24 + (k % 2 ? 12 : 0)), 0.11, { release: 0.02, decay: 6 }); // octave bass
    if (c > 0) {
      for (let b = 0; b < 4; b++) add(t0 + b * beat, 0.3, 0, 0.5, { kind: 'kick', release: 0.05, decay: 9 });
      for (const b of [1, 3]) add(t0 + b * beat, 0.32, 0, 0.22, { kind: 'noise', attack: 0.002, release: 0.01, decay: 3, pan: 0.1 }); // gated snare
      for (let k = 0; k < 8; k++) add(t0 + k * beat / 2 + beat / 4, 0.04, 0, 0.035, { kind: 'noise', release: 0.01, decay: 40, pan: -0.3 }); // hats
    }
    if (c >= 2) { // the lead comes in on the third bar
      const half = c % 2;
      for (let k = 0; k < 4; k++) add(t0 + k * beat, beat * 0.95, freq(hook[half * 4 + k]), 0.06, { kind: 'square', attack: 0.02, release: 0.15, pan: 0.15 });
    }
  }
  // a long echo for that big 80s room
  for (const [dl, g] of [[0.31, 0.3], [0.62, 0.15]]) {
    const d = Math.floor(dl * SR);
    for (let i = n - 1; i >= d; i--) { L[i] += R[i - d] * g; R[i] += L[i - d] * g; }
  }
  return saveWav(file, L, R, seconds);
}

if (process.argv[1]?.endsWith('music.mjs')) {
  const [file = 'music.wav', secs = '36', day = '1', style = 'pop'] = process.argv.slice(2);
  writeMusic(file, Number(secs), Number(day), style);
  console.log(`Wrote ${file}`);
}
