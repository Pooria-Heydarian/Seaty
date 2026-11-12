// Uploads today's rendered Short to your channel.
//
//   npm run upload                    -> uploads video/<date>.mp4 with the title from video/<date>.json
//   npm run upload -- --file video/2026-11-12.mp4
//
// Needs (in .env or as GitHub secrets): YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
// (get the last one with `npm run youtube-auth`).
// Optional: YT_PRIVACY = public (default) | unlisted | private
//
// data/uploads.json remembers what was uploaded, so the same day is never uploaded twice.

import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, readJSON, writeJSON, ROOT, VIDEO_DIR, CHANGES_FILE, today } from './lib.mjs';

loadEnv();
const { YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN } = process.env;
const PRIVACY = process.env.YT_PRIVACY || 'public';

function fail(message) {
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=YouTube upload failed::${message.replace(/\r?\n/g, ' ')}`);
  console.error(`Upload failed: ${message}`);
  process.exit(1);
}

if (!YT_CLIENT_ID || !YT_CLIENT_SECRET || !YT_REFRESH_TOKEN) {
  fail('Missing YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN. Run `npm run youtube-auth` first.');
}

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const date = readJSON(CHANGES_FILE)?.date || today();
const videoFile = path.resolve(args.file || path.join(VIDEO_DIR, `${date}.mp4`));
if (!fs.existsSync(videoFile)) fail(`${videoFile} not found. Run \`npm run video\` first.`);
const meta = readJSON(videoFile.replace(/\.mp4$/, '.json')) || { title: `Day ${date} #shorts`, description: '', tags: [] };

const LOG = path.join(ROOT, 'data', 'uploads.json');
const log = readJSON(LOG, {});
const key = path.basename(videoFile, '.mp4');
if (log[key] && !args.force) {
  console.log(`Already uploaded ${key}: https://youtube.com/shorts/${log[key].id} (use --force to upload again)`);
  process.exit(0);
}

// 1. Access token from the refresh token
const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, refresh_token: YT_REFRESH_TOKEN, grant_type: 'refresh_token' }),
});
const token = await tokenRes.json();
if (!token.access_token) {
  fail(`Could not sign in (${token.error}: ${token.error_description || ''}). If it says "invalid_grant", run \`npm run youtube-auth\` again and update the YT_REFRESH_TOKEN secret.`);
}

// 2. Start a resumable upload with the metadata
const size = fs.statSync(videoFile).size;
const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token.access_token}`,
    'Content-Type': 'application/json; charset=UTF-8',
    'X-Upload-Content-Type': 'video/mp4',
    'X-Upload-Content-Length': String(size),
  },
  body: JSON.stringify({
    snippet: {
      title: meta.title.slice(0, 100),
      description: meta.description.slice(0, 4900),
      tags: meta.tags,
      categoryId: process.env.YT_CATEGORY || '24', // Entertainment
    },
    status: { privacyStatus: PRIVACY, selfDeclaredMadeForKids: false },
  }),
});
if (!init.ok) {
  const body = await init.json().catch(() => ({}));
  fail(`${init.status} ${body?.error?.errors?.[0]?.reason || ''}: ${body?.error?.message || init.statusText}`);
}
const uploadUrl = init.headers.get('location');

// 3. Send the file
console.log(`Uploading ${path.relative(ROOT, videoFile)} (${(size / 1e6).toFixed(1)} MB)…`);
const put = await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
  body: fs.readFileSync(videoFile),
});
const video = await put.json();
if (!put.ok || !video.id) fail(`${put.status}: ${video?.error?.message || JSON.stringify(video)}`);

log[key] = { id: video.id, title: meta.title, privacy: video.status?.privacyStatus, uploadedAt: new Date().toISOString() };
writeJSON(LOG, log);
console.log(`✅ Uploaded: https://youtube.com/shorts/${video.id}  (privacy: ${video.status?.privacyStatus})`);
if (video.status?.privacyStatus !== PRIVACY) {
  const msg = `YouTube set this video to "${video.status?.privacyStatus}" instead of "${PRIVACY}". Google locks uploads from unaudited API projects to private; see README (YouTube API audit).`;
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Video is ${video.status?.privacyStatus}::${msg}`);
  console.warn(msg);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### 🎬 Uploaded: [${meta.title}](https://youtube.com/shorts/${video.id}) (${video.status?.privacyStatus})\n`);
}
