// Renders web/video.html into a vertical 1080x1920 MP4 Short, frame by frame.
//
//   npm run video                       -> video/<date>.mp4 (+ <date>.json with title/description)
//   npm run video -- --seconds 6        -> quick test: only the first 6 seconds
//   SITE_URL=https://you.github.io/Seaty/ npm run video
//
// Needs: npm install (puppeteer + ffmpeg-static). Run `npm run report` first so
// web/data/changes.json describes today's changes.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer';
import ffmpegPath from 'ffmpeg-static';
import { ROOT, VIDEO_DIR, CHANGES_FILE, CITY_FILE, readJSON, writeJSON, today } from './lib.mjs';
import { writeMusic } from './music.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const limitSeconds = args.seconds ? Number(args.seconds) : null;
// The link shown at the end of the video and in the description (default: "homepage" in package.json).
const site = process.env.SITE_URL || args.site || readJSON(path.join(ROOT, 'package.json'))?.homepage || '';
const date = readJSON(CHANGES_FILE)?.date || today();
// --page trailer.html --name trailer  renders another timeline page (same frame API)
const pageName = args.page || 'video.html';
const isDaily = pageName === 'video.html';
const baseName = args.name || date;
fs.mkdirSync(VIDEO_DIR, { recursive: true });
const outFile = path.join(VIDEO_DIR, `${baseName}${limitSeconds ? '-test' : ''}.mp4`);

// ---- tiny static server for web/ ----
const WEB = path.join(ROOT, 'web');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.normalize(path.join(WEB, p === '/' ? 'index.html' : p));
  if (!file.startsWith(WEB) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// ---- browser ----
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--ignore-gpu-blocklist',
    '--hide-scrollbars',
    // GitHub's servers have no GPU: render WebGL on the CPU.
    ...(process.env.CI ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
  ],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));
page.on('console', (m) => m.type() === 'error' && console.error('page console:', m.text()));
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
const url = `http://127.0.0.1:${port}/${pageName}?render=1${site ? `&site=${encodeURIComponent(site)}` : ''}`;
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
let info = await page.evaluate(() => window.seaty.ready);

// ---- voiceover: speak each scene's line, then reload so scenes stretch to fit ----
const useVoice = !('no-voice' in args) && !process.env.SEATY_NO_VOICE && info.scenes.some((s) => s.vo);
const clips = new Map();
if (useVoice) {
  const { speakAll, VOICE } = await import('./tts.mjs');
  console.log(`Voiceover (${VOICE})…`);
  const spoken = await speakAll(info.scenes.map((s) => s.vo?.text || ''), path.join(VIDEO_DIR, `voice-${baseName}`));
  for (const [i, s] of info.scenes.entries()) {
    const clip = spoken[i];
    if (!clip) continue;
    clips.set(i, clip);
    console.log(`  ${s.type.padEnd(10)} ${(clip.samples.length / clip.rate).toFixed(1)}s  "${s.vo.text}"`);
  }
  const lengths = Object.fromEntries([...clips].map(([i, c]) => [i, c.samples.length / c.rate]));
  await page.evaluateOnNewDocument((d) => { window.SEATY_VO = d; }, lengths);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
  info = await page.evaluate(() => window.seaty.ready);
}
const duration = limitSeconds ? Math.min(limitSeconds, info.duration) : info.duration;
const frames = Math.round(duration * info.fps);
console.log(`Rendering ${duration.toFixed(1)}s (${frames} frames) -> ${path.relative(ROOT, outFile)}`);
console.log(`Scenes: ${info.scenes.map((s) => s.type).join(' → ')}`);

// ---- music ----
const changes = readJSON(CHANGES_FILE) || { day: 1 };
const musicFile = path.join(VIDEO_DIR, `music-${baseName}.wav`);
writeMusic(musicFile, duration, isDaily ? changes.day : 5);

// Place every spoken line at its scene's time on one voice track.
const voiceFile = path.join(VIDEO_DIR, `voice-${baseName}.wav`);
if (clips.size) {
  const { writeWavMono } = await import('./tts.mjs');
  const rate = [...clips.values()][0].rate;
  const track = new Float32Array(Math.ceil(duration * rate));
  for (const [i, clip] of clips) {
    const s = info.scenes[i];
    const at = Math.round((s.start + s.vo.at) * rate);
    for (let k = 0; k < clip.samples.length && at + k < track.length; k++) track[at + k] += clip.samples[k];
  }
  writeWavMono(voiceFile, track, rate);
}

// ---- encoder ----
// With a voice: the music ducks (gets quieter) whenever someone is speaking.
const audioArgs = clips.size
  ? ['-i', musicFile, '-i', voiceFile,
     '-filter_complex',
     '[2:a]aresample=44100,pan=stereo|c0=c0|c1=c0,volume=1.6,asplit=2[vk][vm];' +
     '[1:a]volume=0.6[m];[m][vk]sidechaincompress=threshold=0.02:ratio=12:attack=20:release=400[duck];' +
     '[duck][vm]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]',
     '-map', '0:v', '-map', '[aout]']
  : ['-i', musicFile, '-map', '0:v', '-map', '1:a'];
const ff = spawn(ffmpegPath, [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'mjpeg', '-i', '-',
  ...audioArgs,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(info.fps),
  '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart',
  outFile,
], { stdio: ['pipe', 'inherit', 'inherit'] });
const ffDone = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))));

const t0 = Date.now();
for (let f = 0; f < frames; f++) {
  await page.evaluate((t) => window.seaty.frame(t), f / info.fps);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 92, optimizeForSpeed: true });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % 30 === 29 || f === frames - 1) {
    const per = (Date.now() - t0) / (f + 1);
    process.stdout.write(`\r  frame ${f + 1}/${frames}  ${(1000 / per).toFixed(1)} fps  ETA ${Math.round(((frames - f - 1) * per) / 1000)}s   `);
  }
}
ff.stdin.end();
await ffDone;
process.stdout.write('\n');
await browser.close();
server.close();
fs.rmSync(musicFile, { force: true });
fs.rmSync(voiceFile, { force: true });

if (!isDaily) {
  console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s: ${outFile}`);
  process.exit(0);
}

// ---- title / description for the upload ----
const city = readJSON(CITY_FILE);
const lines = [];
if (changes.firstReport) lines.push(`Day ${changes.day} of Seaty: a city built by the comments.`);
else lines.push(`Day ${changes.day}: +${changes.newResidents.length} new residents and +${changes.floorsAdded} floors.`);
if (changes.newResidents?.length) lines.push(`Welcome ${changes.newResidents.slice(0, 10).map((r) => r.name).join(', ')}${changes.newResidents.length > 10 ? ' and more' : ''}!`);
lines.push('', '🏠 Comment on this video and I’ll build you a house.', '🏗️ Every new video you comment on adds +1 floor.');
if (site) lines.push('', `Find your house: ${site}`);
lines.push('', '#shorts #citybuilder #seaty');
const meta = {
  file: path.basename(outFile),
  date,
  day: changes.day,
  title: `Day ${changes.day} of adding every commenter to my city 🏙️ #shorts`,
  description: lines.join('\n'),
  tags: ['city builder', 'shorts', 'seaty', 'adding every commenter', 'my city'],
  residents: city?.residentCount ?? 0,
};
writeJSON(outFile.replace(/\.mp4$/, '.json'), meta);
fs.writeFileSync(outFile.replace(/\.mp4$/, '.txt'), `TITLE:\n${meta.title}\n\nDESCRIPTION:\n${meta.description}\n`);
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `\n## 🎬 Today's Short\nDownload it below under **Artifacts → seaty-video**.\n\n**Title** (copy):\n\`\`\`\n${meta.title}\n\`\`\`\n**Description** (copy):\n\`\`\`\n${meta.description}\n\`\`\`\n`,
  );
}
console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s: ${outFile}`);
console.log(`Title: ${meta.title}`);
