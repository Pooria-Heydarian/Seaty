import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CITY_FILE = path.join(ROOT, 'web', 'data', 'city.json');
export const CHANGES_FILE = path.join(ROOT, 'web', 'data', 'changes.json');
export const SPECIALS_FILE = path.join(ROOT, 'web', 'data', 'specials.json');
// Comments from the last city day (not committed; private working file for the AI step)
export const NEW_COMMENTS_FILE = path.join(ROOT, 'comments', 'new-comments.json');
export const VIDEO_DIR = path.join(ROOT, 'video');
export const HISTORY_DIR = path.join(ROOT, 'data', 'history');
export const REPORTS_DIR = path.join(ROOT, 'reports');
export const LOTTERY_DIR = path.join(ROOT, 'lottery');

/** Minimal .env loader (no dependency). Existing env vars win. */
export function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

export function readJSON(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJSON(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Turns "who commented on which video" into the city.
 * @param {Map<string,{name:string,avatar:string,videos:Set<string>,firstSeen:string,lastSeen:string}>} people
 */
export function buildCity(people, meta) {
  const residents = [...people.entries()]
    .map(([id, p]) => ({
      id,
      name: p.name,
      avatar: p.avatar || '',
      floors: p.videos.size,
      joined: p.firstSeen,
      lastActive: p.lastSeen,
      comment: p.comment || '',
    }))
    .filter((r) => r.floors > 0)
    // Earliest residents get the plots closest to the city center.
    .sort((a, b) => a.joined.localeCompare(b.joined) || a.id.localeCompare(b.id));

  return {
    generatedAt: new Date().toISOString(),
    ...meta,
    residentCount: residents.length,
    totalFloors: residents.reduce((s, r) => s + r.floors, 0),
    residents,
  };
}
