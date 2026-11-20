# MM-CONSENSUS-0.1

Standalone extract of the `mmconsensus` engine in [AzielEliab/aziel-runtime](https://github.com/AzielEliab/aziel-runtime) (`src/engines/mmconsensus/`). Same tally and Jaccard rules. Same SLOT refusals. Version `0.1.0`.

| Field | Value |
| --- | --- |
| Product | `mmconsensus` |
| Spec | `MM-CONSENSUS-0.1` |
| Schema | `mmconsensus.receipt.v0.1` |
| Role | Structured consensus over caller-supplied opinions. Adjacent to DecisionGATE. Does not replace it. |
| Honesty | `tally` / `agree` = **HEURISTIC**. Live model calls = **SLOT**. |
| Motto | Opinions you already have. No live model call. |
| Caps | 32 opinions. 16 KiB per field. |
| Neighbors | `decisiongate`, `azcoherence`, `azclce` |
| Author | Aziel Eliab |

## Honesty

This spec is a deterministic heuristic over opinions the caller already posted. It is not a live LLM or model API. The implementation must not fabricate a model response and must not mark `live_model_call`, `openai`, `anthropic`, `grok`, `blend_models`, `remote_infer`, `truth_score`, or `court` as live.

## `tally`

Parse `opinions[]`. Each row accepts `source`, `verdict` (or `vote` or `decision`, uppercased, default `HOLD`), `confidence` clipped to [0, 1], and `text` (or `rationale`). Count verdicts. `majority` is the unique top count, or `null` when the top count is tied. `agreement_ratio = majority_n / n`. `unanimous` is true only when the ratio is 1. No model is called. The result is not a truth score.

## `agree`

Requires at least two opinions. Token Jaccard over `text`, otherwise over `verdict`. Tokens are lowercase splits on `[^a-z0-9]+`. Returns pairwise `jaccard` and `mean_agreement`.

## Receipt

Successful tally and agree results use `schema: "mmconsensus.receipt.v0.1"` and `honesty: "HEURISTIC"`.

## LIVE_OPS

`health`, `skill`, `doctor`, `tally`, `agree`, `limitation`.

## SLOT / FG-STUB

`live_model_call`, `openai`, `anthropic`, `grok`, `blend_models`, `remote_infer`, `truth_score`, `court`.
