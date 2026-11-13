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

export function writeWavMono(file, samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, buf);
}
