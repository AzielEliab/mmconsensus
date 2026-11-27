# MMConsensus download tracker

Worker name: `mmconsensus-download-tracker`.

This source is the landing and counted download. It is not deployed by tests or by a pull request. Deploy stays held (Remain-OFF, Cap-7 ≠ ICANN, paid sat HELD) until an explicit deploy.

Expected route after that deploy: `https://mmconsensus-download-tracker.vibelock.workers.dev/`

`GET /download` and `GET /go` return `public/mmconsensus-0.1.0.tar.gz` with HTTP 200 (`Content-Type: application/gzip`, `Content-Disposition: attachment`). The archive is the repository tree at package.json version **0.1.0**. GitHub Releases has no asset. Do not invent another version. The response is not a 302 to GitHub.

The archive is the HEURISTIC tally package. This Worker does not call a model.

## Count

KV binding `DOWNLOADS`. Create a new namespace titled `MMCONSENSUS_DOWNLOADS` and replace the placeholder id in `wrangler.toml` before deploy. Do not reuse another product's namespace id.

Key layout: `mmconsensus|owner|repo|branch|fork`.

`GET /` counts a page view. `GET /download` counts a download. Totals on `GET /count` and `GET /stats` sum every branch and fork. `POST /event` records a fork or branch when the caller sends `{owner,repo,branch,fork}`.

Display strategy (b): `views_bot = views - views_human` and `downloads_bot = downloads - downloads_human`. Classification threshold is 30. `/v1` and `/mcp` do not increment. GET never enables mesh. FragGate stays the executable door: `/v1/fraggate/*` and `/v1/mesh/*` proxy to aziel-runtime.

CORS: `Access-Control-Allow-Origin: *`.

## Local

```bash
cd workers/download-tracker
npm install
npx wrangler dev
```

Open the printed local URL. `GET /download` serves the archive from `public/`.

Rebuild the archive from the repository root:

```bash
node workers/download-tracker/scripts/pack-archive.mjs
```

Author: Aziel Eliab. Apache-2.0. Forks always allowed.
