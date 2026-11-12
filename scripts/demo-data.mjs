// Generates a fake city so you can try everything without an API key.
//   npm run demo                 -> 250 residents, 60 videos
//   npm run demo -- 1000 120     -> 1000 residents, 120 videos

import { buildCity, writeJSON, CITY_FILE } from './lib.mjs';

const RESIDENTS = Number(process.argv[2] || 250);
const VIDEOS = Number(process.argv[3] || 60);

// Seeded random so the demo city looks the same every run.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

const first = ['Alex', 'Sara', 'Omid', 'Lina', 'Kai', 'Maya', 'Reza', 'Nora', 'Leo', 'Zara', 'Amir', 'Yuki', 'Ivan', 'Elif', 'Sam', 'Tara', 'Noah', 'Mina', 'Ali', 'Jade'];
const tail = ['Builder', 'Gamer', 'TV', '_99', 'Official', 'Studio', '2007', 'Plays', 'Art', 'Vlogs', 'xd', 'Fan', 'Cat', 'Pro', '', '_'];

const start = Date.parse('2026-08-01T12:00:00Z');
const DAY = 86400000;
const people = new Map();

for (let i = 0; i < RESIDENTS; i++) {
  const name = `${first[Math.floor(rand() * first.length)]}${tail[Math.floor(rand() * tail.length)]}${rand() < 0.4 ? Math.floor(rand() * 900 + 100) : ''}`;
  const joinVideo = Math.floor(rand() ** 1.6 * VIDEOS); // more early adopters
  const loyalty = rand() ** 2.2; // a few super-fans, many casual viewers
  const videos = new Set([joinVideo]);
  for (let v = joinVideo + 1; v < VIDEOS; v++) if (rand() < loyalty) videos.add(v);
  const days = [...videos].sort((a, b) => a - b);
  people.set(`UCdemo${String(i).padStart(5, '0')}`, {
    name,
    avatar: '',
    videos,
    firstSeen: new Date(start + days[0] * DAY + rand() * DAY).toISOString(),
    lastSeen: new Date(start + days.at(-1) * DAY + rand() * DAY).toISOString(),
  });
}

const city = buildCity(people, {
  mode: 'demo',
  channel: { id: 'demo', title: 'Seaty (demo)' },
  videoCount: VIDEOS,
});
writeJSON(CITY_FILE, city);
console.log(`Demo city: ${city.residentCount} residents, ${city.totalFloors} floors -> ${CITY_FILE}`);
