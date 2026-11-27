# Contributing

MMConsensus is Apache-2.0. Forks are always allowed. No extra permission is required to fork, modify, or redistribute under that license.

Author identity on this repository is Aziel Eliab.

## Honesty

`tally` and `agree` stay a deterministic HEURISTIC over opinions the caller already posted. Do not add a live model client and label it live. `live_model_call`, `openai`, `anthropic`, `grok`, `blend_models`, `remote_infer`, `truth_score`, and `court` stay SLOT (`FG-STUB`) until a real implementation exists. Do not fabricate model responses.

## Tests

```bash
node --test test/*.test.js
```

After source changes that belong in the download archive, rebuild it:

```bash
node workers/download-tracker/scripts/pack-archive.mjs
```

The archive path is `workers/download-tracker/public/mmconsensus-0.1.0.tar.gz`.
