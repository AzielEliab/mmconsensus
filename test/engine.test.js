import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  HONESTY_BANNER,
  LIMITATION,
  LIVE_OPS,
  MAX_FIELD_CHARS,
  MAX_OPINIONS,
  SPEC,
  STUB_REFUSE,
  VERSION,
  agree,
  jaccard,
  tally,
  tokenize,
} from "../src/engine.js";
import { mmconsensusDoctor, mmconsensusHealth, mmconsensusSkill, runMmconsensus } from "../src/ops.js";

describe("MM-CONSENSUS-0.1 tally", () => {
  it("counts a unique majority and clips confidence", () => {
    const result = tally({
      statement: "ship it",
      opinions: [
        { source: "a", verdict: " yes ", confidence: 1.4, text: "ship the patch" },
        { source: "b", vote: "yes", confidence: -0.2, rationale: "ship the patch" },
        { source: "c", decision: "no", confidence: "nope", text: "hold the patch" },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.spec, SPEC);
    assert.equal(result.schema, "mmconsensus.receipt.v0.1");
    assert.equal(result.version, VERSION);
    assert.equal(result.honesty, "HEURISTIC");
    assert.equal(result.live_model_call, false);
    assert.equal(result.truth_score, false);
    assert.equal(result.majority, "YES");
    assert.equal(result.tied, false);
    assert.equal(result.unanimous, false);
    assert.equal(result.agreement_ratio, 2 / 3);
    assert.equal(result.n, 3);
    assert.deepEqual(result.counts, { YES: 2, NO: 1 });
    assert.equal(result.opinions[0].confidence, 1);
    assert.equal(result.opinions[1].confidence, 0);
    assert.equal(result.opinions[2].confidence, null);
    assert.equal(result.opinions[1].text, "ship the patch");
    assert.equal(result.completion, undefined);
    assert.equal(result.choices, undefined);
  });

  it("returns null majority on a tie and HOLD when the verdict is empty", () => {
    const tied = tally({
      opinions: [{ source: "a", verdict: "yes" }, { source: "b", verdict: "no" }],
    });
    assert.equal(tied.majority, null);
    assert.equal(tied.tied, true);
    assert.equal(tied.agreement_ratio, 0.5);
    assert.equal(tied.unanimous, false);

    const held = tally({ opinions: [{ text: "no verdict field" }] });
    assert.equal(held.majority, "HOLD");
    assert.equal(held.unanimous, true);
    assert.equal(held.agreement_ratio, 1);
    assert.equal(held.opinions[0].source, "opinion-1");
  });

  it("requires opinions and caps the list at 32", () => {
    const missing = tally({ statement: "alone" });
    assert.equal(missing.ok, false);
    assert.equal(missing.status, 400);
    assert.equal(missing.honesty, "HEURISTIC");
    assert.equal(missing.live_model_call, false);

    const rows = [];
    for (let i = 0; i < MAX_OPINIONS + 1; i += 1) {
      rows.push({ source: "s" + i, verdict: i === MAX_OPINIONS ? "no" : "yes" });
    }
    const capped = tally({ opinions: rows });
    assert.equal(capped.n, MAX_OPINIONS);
    assert.equal(capped.counts.NO, undefined);
    assert.equal(capped.unanimous, true);
  });

  it("refuses an oversized field", () => {
    assert.throws(
      () => tally({ opinions: [{ verdict: "yes", text: "x".repeat(MAX_FIELD_CHARS + 1) }] }),
      (err) => err.code === "SIZE_LIMIT" && err.status === 400,
    );
  });

  it("is deterministic", () => {
    const payload = {
      statement: "ship it",
      opinions: [
        { source: "a", verdict: "yes", text: "Ship, the patch!" },
        { source: "b", verdict: "no", text: "hold" },
      ],
    };
    assert.equal(JSON.stringify(tally(payload)), JSON.stringify(tally(payload)));
  });
});

describe("MM-CONSENSUS-0.1 Jaccard agree", () => {
  it("scores posted text and falls back to the verdict", () => {
    assert.deepEqual([...tokenize("Hello, World!")], ["hello", "world"]);
    assert.equal(jaccard("", ""), 1);
    assert.equal(jaccard("ship the patch", "ship the patch"), 1);
    assert.equal(jaccard("ship the patch", "hold the patch"), 0.5);
    assert.equal(jaccard("yes", "no"), 0);

    const scored = agree({
      opinions: [
        { source: "a", text: "ship the patch" },
        { source: "b", text: "hold the patch" },
        { source: "c", verdict: "YES" },
      ],
    });
    assert.equal(scored.ok, true);
    assert.equal(scored.honesty, "HEURISTIC");
    assert.equal(scored.live_model_call, false);
    assert.equal(scored.n, 3);
    assert.equal(scored.pairs.length, 3);
    assert.equal(scored.pairs[0].jaccard, 0.5);
    assert.equal(scored.mean_agreement, scored.pairs.reduce((s, p) => s + p.jaccard, 0) / 3);

    const fromVerdict = agree({
      opinions: [
        { source: "a", verdict: "yes" },
        { source: "b", verdict: "no" },
      ],
    });
    assert.equal(fromVerdict.pairs[0].jaccard, 0);
    assert.equal(fromVerdict.mean_agreement, 0);
  });

  it("needs two opinions", () => {
    const one = agree({ opinions: [{ verdict: "yes", text: "only" }] });
    assert.equal(one.ok, false);
    assert.equal(one.status, 400);
    assert.match(one.error, /at least two/);
    assert.equal(one.live_model_call, false);
  });
});

describe("honesty and SLOT refusals", () => {
  it("flags HEURISTIC scope in the banner, limitation, and health", () => {
    assert.match(HONESTY_BANNER, /HEURISTIC/);
    assert.match(HONESTY_BANNER, /NOT live LLM or model API calls/);
    assert.match(LIMITATION, /HEURISTIC/);
    assert.match(LIMITATION, /THIS IS NOT: live multi-model API calls/);
    const health = mmconsensusHealth();
    assert.equal(health.honesty, "HEURISTIC");
    assert.equal(health.live_model_call, false);
    assert.equal(health.mesh_enabled_by_this_package, false);
    assert.equal(health.in_runtime, false);
    assert.equal(health.standalone, true);
    assert.deepEqual(health.live_ops, [...LIVE_OPS]);
    const doctor = mmconsensusDoctor();
    assert.equal(doctor.op, "doctor");
    assert.match(doctor.note, /HEURISTIC/);
    assert.match(doctor.note, /Never calls models/);
    const skill = mmconsensusSkill();
    assert.match(skill.markdown, /HEURISTIC/);
    assert.match(skill.markdown, /NOT live LLM or model API calls/);
    assert.equal(skill.live_model_call, false);
  });

  it("refuses every stub op without fabricating a completion", async () => {
    for (const op of STUB_REFUSE) {
      const refused = await runMmconsensus(op, { prompt: "invent a verdict" });
      assert.equal(refused.ok, false);
      assert.equal(refused.code, "FG-STUB");
      assert.equal(refused.honesty, "SLOT");
      assert.equal(refused.live_model_call, false);
      assert.equal(refused.fabricated, false);
      assert.equal(refused.completion, undefined);
      assert.equal(refused.choices, undefined);
      assert.equal(refused.truth_score, false);
    }
    const unknown = await runMmconsensus("blend", {});
    assert.equal(unknown.unsupported, true);
    assert.equal(unknown.live_model_call, false);
  });

  it("documents the honesty invariant in the README and engine source", () => {
    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const engine = readFileSync(new URL("../src/engine.js", import.meta.url), "utf8");
    const cli = readFileSync(new URL("../src/cli.js", import.meta.url), "utf8");
    for (const text of [readme, engine, cli]) {
      assert.match(text, /HEURISTIC/);
      assert.match(text, /NOT live/);
    }
    assert.match(readme, /Apache-2\.0/);
    assert.match(readme, /Forks are always allowed/);
    assert.match(readme, /https:\/\/mmconsensus-download-tracker\.vibelock\.workers\.dev\/download/);
    assert.match(readme, /https:\/\/mmconsensus-download-tracker\.vibelock\.workers\.dev\/stats/);
    assert.match(readme, /active upon Cloudflare deploy|upon Cloudflare deploy/);
    assert.doesNotMatch(engine, /api\.openai\.com|api\.anthropic\.com|api\.x\.ai/);
    assert.doesNotMatch(engine, /Math\.random|fetch\(/);
  });
});
