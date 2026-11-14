# Seaty

A 3D city built by YouTube commenters: one comment = a house, each different video commented on = +1 floor. Static site in `web/` (three.js from a CDN, no build step), Node scripts in `scripts/`.

## Daily update

The owner comes here once a day and asks for the daily update ("daily", "/daily", "new specials", "update the city"). Follow `.claude/skills/daily/SKILL.md`. There is no Anthropic API key: reading the comments and deciding the special buildings is done in that session, not by a script.

## Where things are

- `web/world.js`: the 3D town (shared by the site, the daily Short and the trailer). `web/houses.js`: custom house kit. `web/catalog.js`: what can be built (keep it in sync with the models). `web/layout.js`: plot / block layout (houses never move).
- `web/data/specials.json`: landmarks, upgrades and custom houses. Change it with `npm run special` (it checks the rules).
- `scripts/fetch-comments.mjs` → `web/data/city.json` + `comments/new-comments.json` (since `data/last-update.json`).
- `scripts/daily-report.mjs` → report, history snapshot, `web/data/changes.json` (what the video shows).
- `web/video.js`: the Short's timeline; `scripts/render-video.mjs` renders it (Puppeteer + ffmpeg + Kokoro voice).
- `npm run serve` → http://localhost:5173 (site), `/video.html` (Short preview with scrubber).

`comments/` and `video/` are private working folders (git-ignored).
