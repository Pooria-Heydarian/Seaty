// Reads every comment on your channel's videos with the YouTube Data API v3
// and writes web/data/city.json.
//
//   floors of a resident = number of DIFFERENT videos they commented on
//
// Quota: ~1 unit per API page. A channel with 100 videos and a few thousand
// comments uses well under the free 10,000 units/day.

import { loadEnv, buildCity, writeJSON, CITY_FILE } from './lib.mjs';

// Make failures readable: on GitHub Actions they show up as a red annotation on the run page.
function fail(message) {
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Fetch comments failed::${message.replace(/\r?\n/g, ' ')}`);
  console.error(`\nFetch failed: ${message}`);
  process.exit(1);
}
process.on('unhandledRejection', (e) => fail(e?.message || String(e)));
process.on('uncaughtException', (e) => fail(e?.message || String(e)));

loadEnv();
const KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL = process.env.YOUTUBE_CHANNEL_ID;
const MIN_LEN = Number(process.env.MIN_COMMENT_LENGTH || 3);
const START = process.env.CITY_START_DATE || '';

if (!KEY || !CHANNEL) {
  console.error('Missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID. Copy .env.example to .env and fill it in.');
  console.error('To try the city without a key, run:  npm run demo');
  process.exit(1);
}

const API = 'https://www.googleapis.com/youtube/v3/';

async function api(endpoint, params) {
  const url = new URL(endpoint, API);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason || res.status;
    const err = new Error(`YouTube API ${endpoint} [${reason}]: ${body?.error?.message || res.statusText}`);
    err.reason = reason;
    throw err;
  }
  return body;
}

async function* paginate(endpoint, params) {
  let pageToken;
  do {
    const page = await api(endpoint, { ...params, ...(pageToken ? { pageToken } : {}) });
    yield* page.items || [];
    pageToken = page.nextPageToken;
  } while (pageToken);
}

// 1. Channel info + its "uploads" playlist
const channelRes = await api('channels', { part: 'snippet,contentDetails', id: CHANNEL });
const channel = channelRes.items?.[0];
if (!channel) fail(`Channel "${CHANNEL}" not found. Check YOUTUBE_CHANNEL_ID: it should start with UC and have 24 characters (got ${CHANNEL.length}).`);
const uploads = channel.contentDetails.relatedPlaylists.uploads;
console.log(`Channel: ${channel.snippet.title}`);

// 2. All videos
const videos = [];
try {
  for await (const item of paginate('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: 50 })) {
    const published = item.contentDetails.videoPublishedAt || '';
    if (START && published && published.slice(0, 10) < START) continue;
    videos.push({ id: item.contentDetails.videoId, published });
  }
} catch (e) {
  // YouTube only creates the "uploads" list after the first public video.
  if (e.reason !== 'playlistNotFound') throw e;
  const msg = 'This channel has no public videos yet, so the city is empty. It will fill up after your first upload.';
  if (process.env.GITHUB_ACTIONS) console.log(`::warning title=No videos yet::${msg}`);
  console.warn(msg);
}
console.log(`Videos counted: ${videos.length}`);

// 3. All comments (top-level + replies) per video
const people = new Map();
let commentCount = 0;
let skipped = 0;

function record(snippet, videoId) {
  const authorId = snippet.authorChannelId?.value;
  if (!authorId || authorId === CHANNEL) return; // ignore the channel owner
  const text = (snippet.textOriginal ?? snippet.textDisplay ?? '').trim();
  if (text.length < MIN_LEN) {
    skipped++;
    return;
  }
  commentCount++;
  const at = snippet.publishedAt;
  let p = people.get(authorId);
  if (!p) {
    p = { name: snippet.authorDisplayName, avatar: snippet.authorProfileImageUrl, videos: new Set(), firstSeen: at, lastSeen: at };
    people.set(authorId, p);
  }
  p.videos.add(videoId);
  if (at < p.firstSeen) p.firstSeen = at;
  if (at >= p.lastSeen) {
    p.lastSeen = at;
    p.name = snippet.authorDisplayName; // keep the newest display name
    p.avatar = snippet.authorProfileImageUrl;
    p.comment = text.length > 160 ? text.slice(0, 157) + '…' : text; // shown in the daily video
  }
}

for (const [i, video] of videos.entries()) {
  process.stdout.write(`\r  reading comments ${i + 1}/${videos.length}`);
  try {
    for await (const thread of paginate('commentThreads', {
      part: 'snippet,replies',
      videoId: video.id,
      maxResults: 100,
      textFormat: 'plainText',
    })) {
      record(thread.snippet.topLevelComment.snippet, video.id);
      const inline = thread.replies?.comments || [];
      if (thread.snippet.totalReplyCount > inline.length) {
        // The thread only includes up to 5 replies; fetch the rest.
        for await (const reply of paginate('comments', {
          part: 'snippet',
          parentId: thread.id,
          maxResults: 100,
          textFormat: 'plainText',
        })) record(reply.snippet, video.id);
      } else {
        for (const reply of inline) record(reply.snippet, video.id);
      }
    }
  } catch (e) {
    if (e.reason === 'commentsDisabled') continue;
    throw e;
  }
}
process.stdout.write('\n');

const city = buildCity(people, {
  mode: 'live',
  channel: { id: CHANNEL, title: channel.snippet.title },
  videoCount: videos.length,
});
writeJSON(CITY_FILE, city);
console.log(`Comments counted: ${commentCount} (ignored ${skipped} too-short)`);
console.log(`City: ${city.residentCount} residents, ${city.totalFloors} floors -> ${CITY_FILE}`);
