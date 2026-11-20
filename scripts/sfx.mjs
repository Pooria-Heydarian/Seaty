// Sound effects for the daily Short, synthesized (copyright-free), placed on one stereo track.
// The page lists them in window.seaty.ready.sfx as [{ t, kind }]:
//   whoosh  camera flight / quick cut          pop     something pops into place
//   thud    a building lands (low boom + dust)  ding    a floor is added / a number goes up
//   sparkle a reveal finishes (little chime run)
//
//   import { writeSfx } from './sfx.mjs'; writeSfx('sfx.wav', 40, [{ t: 1.2, kind: 'thud' }]);

import fs from 'node:fs';

const SR = 44100;

export function writeSfx(file, seconds, events = []) {
  const n = Math.ceil(seconds * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  let seed = 99;
  const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 31) - 1;
  const put = (i, v, pan = 0) => { if (i >= 0 && i < n) { L[i] += v * (1 - Math.max(0, pan)); R[i] += v * (1 + Math.min(0, pan)); } };

  const sounds = {
    // band-passed noise that sweeps up then down, panned across
    whoosh(s0, vol = 0.32) {
      const len = Math.floor(0.55 * SR);
      let lp = 0, bp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        const env = Math.sin(Math.PI * k) ** 2;
        const f = 300 + 2200 * Math.sin(Math.PI * k); // cutoff sweep
        const a = Math.min(1, (2 * Math.PI * f) / SR);
        const x = noise();
        lp += a * (x - lp);
        bp += a * (lp - bp);
        put(s0 + i, (lp - bp) * env * vol * 3, -0.6 + 1.2 * k);
      }
    },
    pop(s0, vol = 0.35) {
      const len = Math.floor(0.16 * SR);
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        const f = 900 * Math.exp(-t * 18) + 220;
        put(s0 + i, Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 28) * vol);
      }
    },
    thud(s0, vol = 0.6) {
      const len = Math.floor(0.7 * SR);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        const boom = Math.sin(2 * Math.PI * (45 * t + (60 / 12) * (1 - Math.exp(-12 * t)))) * Math.exp(-t * 6);
        lp += 0.05 * (noise() - lp); // rumble of dust
        put(s0 + i, (boom * 0.9 + lp * 2.2 * Math.exp(-t * 5)) * vol);
      }
    },
    ding(s0, vol = 0.22, semi = 0) {
      const len = Math.floor(0.9 * SR);
      const f = 1046.5 * Math.pow(2, semi / 12);
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        const v = (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(2 * Math.PI * f * 2.76 * t) * Math.exp(-t * 6)) * Math.exp(-t * 4.5);
        put(s0 + i, v * vol * Math.min(1, t / 0.002), 0.2);
      }
    },
    sparkle(s0, vol = 0.12) {
      [0, 4, 7, 12, 16].forEach((semi, j) => {
        const st = s0 + Math.floor(j * 0.06 * SR);
        const f = 1318.5 * Math.pow(2, semi / 12);
        for (let i = 0; i < 0.5 * SR; i++) {
          const t = i / SR;
          put(st + i, Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 8) * vol, j % 2 ? 0.5 : -0.5);
        }
      });
    },
  };

  let dings = 0;
  for (const e of events) {
    const s0 = Math.round(e.t * SR);
    if (e.kind === 'ding') sounds.ding(s0, 0.22, (dings++ % 5) * 2); // each ding a step higher
    else sounds[e.kind]?.(s0);
  }

  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = peak > 0.95 ? 0.95 / peak : 1;
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
