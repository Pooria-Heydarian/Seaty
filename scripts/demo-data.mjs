// Generates a fake city so you can try everything without an API key.
//   npm run demo                 -> 250 residents, 60 videos
//   npm run demo -- 40 6         -> a young town: 40 residents, 6 videos (mostly houses)
//
// It also writes a fake "yesterday" snapshot, so `npm run report` and
// `npm run video` have some new residents and new floors to show.

import path from 'node:path';
import { buildCity, writeJSON, CITY_FILE, HISTORY_DIR } from './lib.mjs';

const RESIDENTS = Number(process.argv[2] || 250);
const VIDEOS = Number(process.argv[3] || 60);

let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pick = (a) => a[Math.floor(rand() * a.length)];

const first = ['Alex', 'Sara', 'Omid', 'Lina', 'Kai', 'Maya', 'Reza', 'Nora', 'Leo', 'Zara', 'Amir', 'Yuki', 'Ivan', 'Elif', 'Sam', 'Tara', 'Noah', 'Mina', 'Ali', 'Jade'];
const tail = ['Builder', 'Gamer', 'TV', '_99', 'Official', 'Studio', '2007', 'Plays', 'Art', 'Vlogs', 'xd', 'Fan', 'Cat', 'Pro', '', '_'];
const comments = [
  'Can I get a house near the river please? 🏡',
  'Day 1 resident checking in!',
  'Make my building the tallest one 😤',
  'I want a red roof!',
  'This city is getting huge, love it',
  'Commenting every day until I have a skyscraper',
  'Hi from Germany 👋',
  'Put me next to my best friend pls',
  'How many floors do I have now?',
  'Best channel idea ever',
  'Add a park next to my house 🌳',
  'Mayor of Seaty reporting for duty',
];

const start = Date.parse('2026-08-01T12:00:00Z');
const DAY = 86400000;
const people = new Map();
const yesterday = new Map();

for (let i = 0; i < RESIDENTS; i++) {
  const name = `${pick(first)}${pick(tail)}${rand() < 0.4 ? Math.floor(rand() * 900 + 100) : ''}`;
  const joinVideo = Math.floor(rand() ** 1.6 * VIDEOS);
  const loyalty = rand() ** 2.2;
  const videos = new Set([joinVideo]);
  for (let v = joinVideo + 1; v < VIDEOS; v++) if (rand() < loyalty) videos.add(v);
  const days = [...videos].sort((a, b) => a - b);
  const id = `UCdemo${String(i).padStart(5, '0')}`;
  const person = {
    name,
    avatar: '',
    videos,
    comment: pick(comments),
    firstSeen: new Date(start + days[0] * DAY + rand() * DAY).toISOString(),
    lastSeen: new Date(start + days.at(-1) * DAY + rand() * DAY).toISOString(),
  };
  people.set(id, person);
  // Yesterday: people who joined on the latest video weren't there yet,
  // and people active on the latest video had one floor less.
  if (joinVideo < VIDEOS - 1) {
    const v = new Set(videos);
    v.delete(VIDEOS - 1);
    yesterday.set(id, { ...person, videos: v });
  }
}

const meta = { mode: 'demo', channel: { id: 'demo', title: 'Seaty (demo)' } };
const city = buildCity(people, { ...meta, videoCount: VIDEOS });
writeJSON(CITY_FILE, city);
const prevDate = new Date(Date.now() - DAY).toISOString().slice(0, 10);
writeJSON(path.join(HISTORY_DIR, `${prevDate}.json`), buildCity(yesterday, { ...meta, videoCount: VIDEOS - 1 }));
console.log(`Demo city: ${city.residentCount} residents, ${city.totalFloors} floors -> ${CITY_FILE}`);
console.log(`Fake snapshot for ${prevDate} written, so the report/video have changes to show.`);
