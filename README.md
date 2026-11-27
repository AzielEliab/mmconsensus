# MMConsensus

Deterministic **HEURISTIC** tally and Jaccard opinion aggregator (`MM-CONSENSUS-0.1`).

**Honesty.** `MM-CONSENSUS-0.1` is a deterministic HEURISTIC tally and Jaccard aggregator over posted opinions — NOT live LLM or model API calls. `tally` counts verdicts. `agree` scores posted text with token Jaccard. `live_model_call`, `openai`, `anthropic`, `grok`, `blend_models`, `remote_infer`, `truth_score`, and `court` are **SLOT**. This package never fabricates a model response and never marks an unbuilt live model call as live.

Motto: opinions you already have. No live model call.

Adjacent to DecisionGATE. It does not replace that hop. Catalog neighbor: FragGate slug `mmconsensus` in [aziel-runtime](https://github.com/AzielEliab/aziel-runtime). This repository is not a second door.

Author: Aziel Eliab. Version `0.1.0`.

## License

[Apache-2.0](LICENSE). **Forks are always allowed.** No additional permission is required to fork, modify, or redistribute this work under that license.

## Install

Node.js 20 or newer. No runtime dependencies.

```bash
git clone https://github.com/AzielEliab/mmconsensus.git
cd mmconsensus
node src/cli.js health
```

Counted archive, HTTP 200, no GitHub redirect (active upon Cloudflare deploy):

https://mmconsensus-download-tracker.vibelock.workers.dev/download

Stats for that Worker (same deploy note; the route is not live until the Worker is deployed):

https://mmconsensus-download-tracker.vibelock.workers.dev/stats

```bash
curl -fsSL -A 'Mozilla/5.0' https://mmconsensus-download-tracker.vibelock.workers.dev/install.sh | bash
```

The installer above starts working when `mmconsensus-download-tracker` is deployed. This repository does not deploy it.

## CLI

Every invocation prints the HEURISTIC banner on stderr. JSON goes to stdout.

```bash
node src/cli.js health

node src/cli.js tally '{"statement":"ship it","opinions":[{"source":"a","verdict":"yes","confidence":0.8,"text":"ship the patch"},{"source":"b","verdict":"yes","text":"ship the patch"},{"source":"c","verdict":"no","text":"hold the patch"}]}'

node src/cli.js agree --statement "ship it" --file opinions.json

node src/cli.js live_model_call
```

`live_model_call` exits 2 with `code: "FG-STUB"`, `honesty: "SLOT"`, and `fabricated: false`.

`opinions.json` is a JSON object:

```json
{
  "statement": "ship it",
  "opinions": [
    { "source": "a", "verdict": "yes", "text": "ship the patch" },
    { "source": "b", "vote": "no", "rationale": "hold the patch" }
  ]
}
```

`verdict`, `vote`, and `decision` are aliases. A missing verdict is `HOLD`. Confidence is clipped to [0, 1]. At most 32 opinions. Each field is at most 16 KiB.

## Library

```js
import { tally, agree } from "./src/index.js";

const counted = tally({
  statement: "ship it",
  opinions: [
    { source: "a", verdict: "yes", text: "ship the patch" },
    { source: "b", verdict: "yes", text: "ship the patch" },
  ],
});
// counted.honesty === "HEURISTIC"
// counted.live_model_call === false
// counted.majority === "YES"

const scored = agree({
  opinions: [
    { source: "a", text: "ship the patch" },
    { source: "b", text: "hold the patch" },
  ],
});
// scored.mean_agreement === 0.5
```

## What the heuristic does

| Op | Behavior |
| --- | --- |
| `tally` | Count posted verdicts. `majority` is the unique top count, or `null` on a tie. `agreement_ratio` is that top count divided by `n`. `unanimous` is true only when the ratio is 1. |
| `agree` | Needs two or more opinions. Token Jaccard (`[^a-z0-9]+`, lowercase) over `text`, otherwise over the verdict. Returns each pair and the mean. |
| `health`, `skill`, `doctor`, `limitation` | Describe this package. They do not contact a model. |
| SLOT names | Refuse with `FG-STUB`. No completion text is invented. |

Receipt schema: `mmconsensus.receipt.v0.1`. Full rules: [docs/MM-CONSENSUS-SPEC.md](docs/MM-CONSENSUS-SPEC.md).

## Download tracker

Source: `workers/download-tracker/`. Worker name: `mmconsensus-download-tracker`.

| Route | Effect |
| --- | --- |
| `GET /` | Landing. Counts a view. |
| `GET /download`, `GET /download/mmconsensus-0.1.0.tar.gz`, `GET /go` | Counted archive, HTTP 200. |
| `HEAD /download` | Archive headers. Does not count. |
| `GET /stats` | Fleet stats JSON. Does not count. |
| `GET /count` | Compact counts. Does not count. |
| `POST /event` | `{owner,repo,branch,fork}` branch and fork count. |
| `GET /install.sh` | Install script. The script request itself does not count. |
| `GET /v1`, `GET /v1/*`, `GET /mcp`, `POST /mcp` | Do not increment counters. |

`/stats` uses display strategy (b): `views_bot = views - views_human` and the same for downloads. Classification method is `ua_denylist + healthcheck_ua` (plus `cf.botManagement.score` when Bot Management is present). Bot score threshold is 30. Human and bot counts start at 0. A pre-split remainder displays as bot. Counters are not reset, sampled, or inflated.

KV binding name: `DOWNLOADS`. Namespace title to create at deploy time: `MMCONSENSUS_DOWNLOADS`. The id in `wrangler.toml` is a placeholder. Do not reuse another product's namespace.

CORS on tracker responses: `Access-Control-Allow-Origin: *`.

Rebuild the archive:

```bash
node workers/download-tracker/scripts/pack-archive.mjs
```

That writes `workers/download-tracker/public/mmconsensus-0.1.0.tar.gz`.

## Tests

```bash
node --test test/*.test.js
```
