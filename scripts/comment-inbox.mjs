// Collects the comments you haven't replied to yet, with each person's Seaty house info,
// into comments/inbox.md (easy to read) and comments/inbox.json (for drafting replies).
//
//   npm run inbox                 -> last 7 days
//   npm run inbox -- --days 30
//
// Needs YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID in .env (same values as your GitHub secrets).
// Read-only: it never posts anything.

import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, readJSON, writeJSON, ROOT, CITY_FILE } from './lib.mjs';

loadEnv();
const KEY = process.env.YOUTUBE_API_KEY;
const CHANNEL = process.env.YOUTUBE_CHANNEL_ID;
if (!KEY || !CHANNEL) {
  console.error('Add YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID to your .env file first (same values as the GitHub secrets).');
  process.exit(1);
}
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const DAYS = Number(args.days || 7);
const since = new Date(Date.now() - DAYS * 86400000).toISOString();

async function api(endpoint, params) {
  const url = new URL(endpoint, 'https://www.googleapis.com/youtube/v3/');
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(`YouTube API ${endpoint}: ${body?.error?.message || res.status}`);
  return body;
}

// Newest comment threads on all of the channel's videos
const threads = [];
let pageToken;
outer: do {
  const page = await api('commentThreads', {
    part: 'snippet,replies',
    allThreadsRelatedToChannelId: CHANNEL,
    order: 'time',
    maxResults: 100,
    textFormat: 'plainText',
    ...(pageToken ? { pageToken } : {}),
  });
  for (const t of page.items || []) {
    if (t.snippet.topLevelComment.snippet.publishedAt < since) break outer;
    threads.push(t);
  }
  pageToken = page.nextPageToken;
} while (pageToken);

// Video titles
const videoIds = [...new Set(threads.map((t) => t.snippet.videoId))];
const titles = new Map();
for (let i = 0; i < videoIds.length; i += 50) {
  const v = await api('videos', { part: 'snippet', id: videoIds.slice(i, i + 50).join(',') });
  for (const item of v.items || []) titles.set(item.id, item.snippet.title);
}

// Seaty info per person
const city = readJSON(CITY_FILE, { residents: [] });
const ranked = [...city.residents].sort((a, b) => b.floors - a.floors || a.joined.localeCompare(b.joined));
const rankOf = new Map(ranked.map((r, i) => [r.id, i + 1]));
const plotOf = new Map(city.residents.map((r, i) => [r.id, { plot: i + 1, floors: r.floors }]));

const items = [];
for (const t of threads) {
  const top = t.snippet.topLevelComment.snippet;
  const authorId = top.authorChannelId?.value;
  if (!authorId || authorId === CHANNEL) continue;
  const replies = t.replies?.comments || [];
  const youReplied = replies.some((r) => r.snippet.authorChannelId?.value === CHANNEL);
  if (youReplied) continue;
  const home = plotOf.get(authorId);
  items.push({
    commentId: t.snippet.topLevelComment.id,
    video: titles.get(t.snippet.videoId) || t.snippet.videoId,
    link: `https://www.youtube.com/watch?v=${t.snippet.videoId}&lc=${t.snippet.topLevelComment.id}`,
    author: top.authorDisplayName,
    text: top.textOriginal,
    likes: top.likeCount,
    at: top.publishedAt,
    resident: home ? { plot: home.plot, floors: home.floors, rank: rankOf.get(authorId), houseLink: `https://pooria-heydarian.github.io/Seaty/?u=${encodeURIComponent(authorId)}` } : null,
  });
}

const dir = path.join(ROOT, 'comments');
fs.mkdirSync(dir, { recursive: true });
writeJSON(path.join(dir, 'inbox.json'), { generatedAt: new Date().toISOString(), days: DAYS, count: items.length, items });
const md = [`# Comments waiting for a reply (${items.length}, last ${DAYS} days)`, ''];
items.forEach((c, i) => {
  md.push(`## ${i + 1}. ${c.author}  ·  ${c.video}`);
  md.push(`> ${c.text.replace(/\n/g, '\n> ')}`);
  md.push('');
  md.push(c.resident
    ? `Seaty: plot ${c.resident.plot}, ${c.resident.floors} floor(s), rank #${c.resident.rank}`
    : 'Seaty: not in the city yet (their house appears after the next daily update)');
  md.push(`Reply here: ${c.link}`, '');
});
fs.writeFileSync(path.join(dir, 'inbox.md'), md.join('\n'));
console.log(`${items.length} comment(s) waiting for a reply -> comments/inbox.md`);
