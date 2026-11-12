# Seaty: a 3D city built by YouTube commenters

- **Comment on a video** and you get a house.
- **Comment on each new video** and your building gets one more floor (floors = number of different videos you commented on).
- **Every day:** a generated town report for the daily video.
- **Every month:** a lottery that anyone can verify.

No packages to install. You only need Node.js 18 or newer.

## Try it now (fake data)

```bash
npm run demo
npm run serve
```

Open http://localhost:5173

Controls: drag to rotate, scroll to zoom, click a building for its info.
Keys: **N** night, **R** auto-orbit, **G** replay the growth, **H** hide the interface (for screen recording).
Link to one house: `http://localhost:5173/?u=<channelId>`. Add `&night=1` to open it at night.

## Use your real channel

1. Get a YouTube Data API v3 key: Google Cloud Console → enable *YouTube Data API v3* → Credentials → API key.
2. Copy `.env.example` to `.env`, then fill in `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID`.
3. Fetch the comments and write the daily report:

```bash
npm run daily
```

This writes `web/data/city.json` and `reports/YYYY-MM-DD.md`.

## Hosting (free, automatic): GitHub Pages + Actions

The included workflow (`.github/workflows/daily.yml`) runs every day at 06:00 UTC:
- fetches the comments
- writes the report (also shown on the run's summary page)
- commits the data
- publishes `web/` to `https://<your-username>.github.io/<repo>/`

One-time setup:
1. Push this folder to a GitHub repository (public repos get free Pages).
2. **Settings → Secrets and variables → Actions**: add the secrets `YOUTUBE_API_KEY` and `YOUTUBE_CHANNEL_ID`.
3. **Settings → Pages → Source**: choose **GitHub Actions**.
4. **Actions → Daily city update → Run workflow** to publish right away.

To change the time, edit the `cron` line. GitHub runs scheduled jobs a few minutes late, and pauses them if the repo has had no activity for 60 days. Daily commits keep it active.

## Monthly lottery

```bash
npm run lottery -- --seed "<public value>" --tickets equal
```

- Before the draw, **announce the seed source**: something nobody can know in advance, such as the Bitcoin block hash at a block height you name ahead of time.
- `--tickets equal`: one chance per resident. `--tickets floors`: one chance per floor.
- Publish `lottery/<month>-entrants.json` and `lottery/<month>-result.json`. Anyone can re-run the script with the same seed and get the same winner.

⚠️ Before running a cash lottery, check YouTube's contest policies and your local laws. You need published official rules, and YouTube can't be named as a sponsor. A share of income can count as gambling in some countries.

## Files

| Path | What it does |
|---|---|
| `scripts/fetch-comments.mjs` | YouTube API → `web/data/city.json` (includes replies, skips your own comments and too-short spam) |
| `scripts/demo-data.mjs` | Fake city (`npm run demo -- 1000 120` = 1000 residents, 120 videos) |
| `scripts/daily-report.mjs` | Compares with yesterday's snapshot → markdown report |
| `scripts/lottery.mjs` | Verifiable monthly draw |
| `web/` | The 3D city site (Three.js, no build step) |
