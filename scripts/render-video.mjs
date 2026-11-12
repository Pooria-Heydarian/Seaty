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
const site = process.env.SITE_URL || args.site || '';
const date = readJSON(CHANGES_FILE)?.date || today();
fs.mkdirSync(VIDEO_DIR, { recursive: true });
const outFile = path.join(VIDEO_DIR, `${date}${limitSeconds ? '-test' : ''}.mp4`);

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
const url = `http://127.0.0.1:${port}/video.html?render=1${site ? `&site=${encodeURIComponent(site)}` : ''}`;
await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
const info = await page.evaluate(() => window.seaty.ready);
const duration = limitSeconds ? Math.min(limitSeconds, info.duration) : info.duration;
const frames = Math.round(duration * info.fps);
console.log(`Rendering ${duration.toFixed(1)}s (${frames} frames) -> ${path.relative(ROOT, outFile)}`);
console.log(`Scenes: ${info.scenes.map((s) => s.type).join(' → ')}`);

// ---- music ----
const changes = readJSON(CHANGES_FILE) || { day: 1 };
const musicFile = path.join(VIDEO_DIR, `music-${date}.wav`);
writeMusic(musicFile, duration, changes.day);

// ---- encoder ----
const ff = spawn(ffmpegPath, [
  '-y', '-loglevel', 'error',
  '-f', 'image2pipe', '-framerate', String(info.fps), '-c:v', 'mjpeg', '-i', '-',
  '-i', musicFile,
  '-map', '0:v', '-map', '1:a',
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
console.log(`Done in ${Math.round((Date.now() - t0) / 1000)}s: ${outFile}`);
console.log(`Title: ${meta.title}`);
