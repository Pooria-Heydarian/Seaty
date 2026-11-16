// Saves the channel's newest public video for the billboard downtown:
//   web/data/latest-video.json  { id, title, published, thumb }
//   web/data/latest-video.jpg   its thumbnail (saved here so the site and the video renders load it locally)
//
// Runs after the comment fetch (npm run fetch / npm run daily). Uses 2 API units.
// It never stops the daily run: on any error the billboard just keeps the last video.

import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, writeJSON, ROOT } from './lib.mjs';

loadEnv();
const KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL = process.env.YOUTUBE_CHANNEL_ID;
const DATA = path.join(ROOT, 'web', 'data');

async function api(endpoint, params) {
  const url = new URL(endpoint, 'https://www.googleapis.com/youtube/v3/');
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(`YouTube API ${endpoint}: ${body?.error?.message || res.status}`);
  return body;
}

try {
  if (!KEY || !CHANNEL) throw new Error('missing YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID');
  const channel = (await api('channels', { part: 'contentDetails', id: CHANNEL })).items?.[0];
  const uploads = channel?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error('no uploads playlist yet');
  const items = (await api('playlistItems', { part: 'contentDetails,snippet', playlistId: uploads, maxResults: 10 })).items || [];
  const newest = items
    .filter((i) => i.contentDetails?.videoPublishedAt) // public videos only
    .sort((a, b) => b.contentDetails.videoPublishedAt.localeCompare(a.contentDetails.videoPublishedAt))[0];
  if (!newest) throw new Error('no public video yet');

  const id = newest.contentDetails.videoId;
  const t = newest.snippet.thumbnails || {};
  const thumbUrl = (t.maxres || t.standard || t.high || t.medium || t.default)?.url;
  let thumb = '';
  if (thumbUrl) {
    const res = await fetch(thumbUrl);
    if (res.ok) {
      fs.writeFileSync(path.join(DATA, 'latest-video.jpg'), Buffer.from(await res.arrayBuffer()));
      thumb = 'data/latest-video.jpg';
    }
  }
  writeJSON(path.join(DATA, 'latest-video.json'), {
    id,
    title: newest.snippet.title,
    published: newest.contentDetails.videoPublishedAt,
    thumb,
  });
  console.log(`Billboard: "${newest.snippet.title}" (${id})`);
} catch (e) {
  console.warn(`Billboard not updated: ${e.message}`);
}
