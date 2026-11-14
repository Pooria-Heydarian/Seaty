// Voiceover with Kokoro (open-source text-to-speech, runs offline on CPU; free, no limits).
// The model (~90 MB) downloads once on first use and is cached.
//
// Voices: af_heart (default, warm female), af_bella, am_michael, am_fenrir (male), bf_emma, bm_george (British)
// Pick one with the SEATY_VOICE environment variable / repository variable.

import fs from 'node:fs';
import { KokoroTTS } from 'kokoro-js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
let tts = null;

export const VOICE = process.env.SEATY_VOICE || 'af_heart';

/** Make text safe and natural to read aloud. */
export function speakable(text) {
  return String(text)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/@/g, '')
    .replace(/[_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^\p{L}\p{N}\s.,!?'’:;-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns { samples: Float32Array, rate: number } */
export async function speak(text, voice = VOICE) {
  tts ||= await KokoroTTS.from_pretrained(MODEL, { dtype: 'q8', device: 'cpu' });
  const audio = await tts.generate(speakable(text), { voice });
  // Trim silence at both ends so timing is tight.
  const s = audio.audio;
  let a = 0, b = s.length - 1;
  while (a < b && Math.abs(s[a]) < 0.01) a++;
  while (b > a && Math.abs(s[b]) < 0.01) b--;
  return { samples: s.slice(Math.max(0, a - 240), Math.min(s.length, b + 2400)), rate: audio.sampling_rate };
}

/** Reads a 16-bit mono WAV written by writeWavMono. */
export function readWavMono(file) {
  const buf = fs.readFileSync(file);
  const rate = buf.readUInt32LE(24);
  const n = buf.readUInt32LE(40) / 2;
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) samples[i] = buf.readInt16LE(44 + i * 2) / 32767;
  return { samples, rate };
}

/**
 * Speaks every line in a separate Node process and returns the clips.
 * The speech engine (WebAssembly) can throw on its own during clean-up, which would kill a long
 * video render, so it never lives in the renderer's process.
 * @param {string[]} texts
 * @param {string} dir  working folder for the WAV files
 * @returns {Promise<Array<{samples: Float32Array, rate: number} | null>>}
 */
export async function speakAll(texts, dir) {
  const { spawnSync } = await import('node:child_process');
  const path = await import('node:path');
  fs.mkdirSync(dir, { recursive: true });
  const list = path.join(dir, 'lines.json');
  fs.writeFileSync(list, JSON.stringify(texts));
  const { fileURLToPath } = await import('node:url');
  const res = spawnSync(process.execPath, [fileURLToPath(import.meta.url), list, dir], { stdio: 'inherit', env: process.env });
  const out = texts.map((t, i) => {
    const f = path.join(dir, `${i}.wav`);
    return t && fs.existsSync(f) ? readWavMono(f) : null;
  });
  fs.rmSync(dir, { recursive: true, force: true });
  if (res.status !== 0 && out.every((c) => !c)) throw new Error(`Voiceover failed (exit ${res.status})`);
  return out;
}

// CLI used by speakAll:  node scripts/tts.mjs <lines.json> <outDir>   -> <outDir>/<i>.wav
if (process.argv[1]?.endsWith('tts.mjs') && process.argv[2]) {
  const texts = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  for (const [i, text] of texts.entries()) {
    if (!text) continue;
    const clip = await speak(text);
    writeWavMono(`${process.argv[3]}/${i}.wav`, clip.samples, clip.rate);
  }
  process.exit(0); // exit before the speech engine's clean-up can run
}

export function writeWavMono(file, samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, buf);
}
