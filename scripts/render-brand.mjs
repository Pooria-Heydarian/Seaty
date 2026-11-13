// Renders the channel art in brand/ to image files.
//   node scripts/render-brand.mjs  ->  brand/youtube-banner.jpg (2560x1440), brand/youtube-profile.png (800x800)
//   add --guides to draw the YouTube safe areas (for checking only)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { ROOT } from './lib.mjs';

const guides = process.argv.includes('--guides');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.normalize(path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--ignore-gpu-blocklist', '--hide-scrollbars'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page error:', e.message));

async function shoot(htmlPath, width, height, out, type) {
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${base}/${htmlPath}${guides ? '?guides' : ''}`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.brandReady === true, { timeout: 120000 });
  const file = path.join(ROOT, 'brand', guides ? out.replace(/\.(\w+)$/, '-guides.$1') : out);
  await page.screenshot({ path: file, type, ...(type === 'jpeg' ? { quality: 93 } : {}) });
  console.log(`${path.relative(ROOT, file)}  ${(fs.statSync(file).size / 1e6).toFixed(2)} MB`);
}

await shoot('brand/banner.html', 2560, 1440, 'youtube-banner.jpg', 'jpeg');
await shoot('brand/avatar.html', 800, 800, 'youtube-profile.png', 'png');
await browser.close();
server.close();
