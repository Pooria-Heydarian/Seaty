# Seaty

A 3D city built by YouTube commenters: one comment = a house, each different video commented on = +1 floor. Static site in `web/` (three.js from a CDN, no build step), Node scripts in `scripts/`.

## Daily update

The owner comes here once a day and asks for the daily update ("daily", "/daily", "new specials", "update the city"). Follow `.claude/skills/daily/SKILL.md`. There is no Anthropic API key: reading the comments and deciding the special buildings is done in that session, not by a script.

## Weekend show

Every weekend the owner asks for "weekly" / "weekly episode" / "Seaty Weekly". Follow `.claude/skills/weekly/SKILL.md`: a two-host landscape episode (`web/podcast.html` + `web/podcast.js`, script in `web/data/episode.json`, `npm run podcast`) and the weekly challenge (`npm run challenge`, `web/data/challenge.json`: a golden object hidden on the website, the first comment with its secret word wins a trophy upgrade).

## Invite friends & tourists

- **Invites:** a new citizen writes "invited by @name" in their first comment; the daily `today.md` lists these with the command `npm run invite -- add @friend --by @inviter --comment <id>` (`scripts/invite.mjs`, stored in `specials.invites` / `specials.villages`). 3 friends = 🎖️ Ambassador, 5 friends = their own **village** on the ring between the green belt and the outskirts (`web/layout.js`), where the inviter and their friends live, with a gate and name sign. Only new citizens count; never reward subscribes or likes.
- **Tourist counter:** GoatCounter. Put the owner's site code in `web/data/site.json` (`{"goatcounter": "<code>"}`) and turn on "Allow adding visitor counts on your website" in GoatCounter's settings; the header then shows the total visits.

## Where things are

- `web/world.js`: the 3D town (shared by the site, the daily Short and the trailer). `web/houses.js`: custom house kit; `web/house-models.js`: one-off models made for requests; `web/model.html?u=<channelId>`: one house alone, to check a model from every side. `web/catalog.js`: what can be built (keep it in sync with the models). `web/layout.js`: the city plan (downtown, Main Street, style neighbourhoods with pocket parks, green belt, outskirts); `landmarkPlan` / `houseStyle` in `web/catalog.js` decide where each landmark and house goes.
- `web/data/specials.json`: landmarks, upgrades and custom houses. Change it with `npm run special` (it checks the rules).
- `scripts/fetch-comments.mjs` → `web/data/city.json` + `comments/new-comments.json` (since `data/last-update.json`).
- `scripts/latest-video.mjs` (runs after the fetch) → `web/data/latest-video.json` + `.jpg`: the channel's newest video, shown on the airship that circles over the city (click it to open the video).
- `scripts/daily-report.mjs` → report, history snapshot, `web/data/changes.json` (what the video shows).
- `web/video.js`: the Short's timeline; `scripts/render-video.mjs` renders it (Puppeteer + ffmpeg + Kokoro voice).
- `npm run stamp` (`scripts/stamp.mjs`): puts a version tag (`?v=<hash of web/*.js>`) on every page's modules, so after a publish browsers load the new code instead of their cached copy. Run it before pushing any code change (the daily `report` / `finish` run it).
- `npm run serve` → http://localhost:5173 (site), `/video.html` (Short preview with scrubber).

`comments/` and `video/` are private working folders (git-ignored).
