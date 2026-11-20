---
name: MMConsensus
description: >-
  Deterministic HEURISTIC tally and Jaccard aggregator over posted opinions
  (MM-CONSENSUS-0.1). Not live LLM or model API calls. Author Aziel Eliab.
---

# MMConsensus

Opinions you already have. No live model call.

`MM-CONSENSUS-0.1` counts posted verdicts and scores posted texts with token Jaccard. It does not call OpenAI, Anthropic, Grok, or any other model. Unbuilt live model ops are SLOT and must not be marked live.

Author: Aziel Eliab. Apache-2.0. Forks always allowed.

## Commands

```bash
node src/cli.js health
node src/cli.js tally '{"statement":"ship it","opinions":[{"source":"a","verdict":"yes","text":"ship the patch"},{"source":"b","verdict":"yes","text":"ship the patch"}]}'
node src/cli.js agree --file opinions.json
```

Library: `import { tally, agree } from "mmconsensus"`.

## Ops

LIVE: `health`, `skill`, `doctor`, `tally`, `agree`, `limitation`.

SLOT: `live_model_call`, `openai`, `anthropic`, `grok`, `blend_models`, `remote_infer`, `truth_score`, `court`.

Catalog neighbor, not a second door: FragGate slug `mmconsensus` on [aziel-runtime](https://github.com/AzielEliab/aziel-runtime).

Download archive (HTTP 200 once the Worker is deployed): https://mmconsensus-download-tracker.vibelock.workers.dev/download

Stats (same deploy note): https://mmconsensus-download-tracker.vibelock.workers.dev/stats
