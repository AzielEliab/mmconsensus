import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { HONESTY_BANNER } from "../src/engine.js";

const CLI = new URL("../src/cli.js", import.meta.url).pathname;

function run(args, input) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    input,
  });
}

describe("mmconsensus CLI", () => {
  it("prints the HEURISTIC banner and tallies posted opinions", () => {
    const payload = JSON.stringify({
      statement: "ship it",
      opinions: [
        { source: "a", verdict: "yes", text: "ship the patch" },
        { source: "b", verdict: "yes", text: "ship the patch" },
      ],
    });
    const result = run(["tally", payload]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /HEURISTIC/);
    assert.match(result.stderr, /NOT live LLM or model API calls/);
    assert.equal(result.stderr.split("\n")[0], HONESTY_BANNER);
    const body = JSON.parse(result.stdout);
    assert.equal(body.majority, "YES");
    assert.equal(body.honesty, "HEURISTIC");
    assert.equal(body.live_model_call, false);
    assert.equal(body.honesty_banner, HONESTY_BANNER);
    assert.equal(body.completion, undefined);
  });

  it("agrees from a file and refuses a live model call", () => {
    const dir = mkdtempSync(join(tmpdir(), "mmconsensus-"));
    const file = join(dir, "opinions.json");
    writeFileSync(file, JSON.stringify({
      opinions: [
        { source: "a", text: "ship the patch" },
        { source: "b", text: "hold the patch" },
      ],
    }));
    const agreed = run(["agree", "--statement", "ship it", "--file", file]);
    assert.equal(agreed.status, 0, agreed.stderr);
    const body = JSON.parse(agreed.stdout);
    assert.equal(body.mean_agreement, 0.5);
    assert.equal(body.statement, undefined);
    assert.equal(body.honesty, "HEURISTIC");
    assert.match(agreed.stderr, /NOT live/);

    const refused = run(["live_model_call"]);
    assert.equal(refused.status, 2);
    const stub = JSON.parse(refused.stdout);
    assert.equal(stub.code, "FG-STUB");
    assert.equal(stub.honesty, "SLOT");
    assert.equal(stub.fabricated, false);
    assert.equal(stub.live_model_call, false);
    assert.equal(stub.completion, undefined);
    assert.match(refused.stderr, /HEURISTIC/);
  });

  it("exits 0 on help and 1 on a missing tally payload", () => {
    const help = run(["--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stderr, /HEURISTIC/);
    assert.match(help.stderr, /tally/);
    const missing = run(["tally"]);
    assert.equal(missing.status, 1);
    const body = JSON.parse(missing.stdout);
    assert.equal(body.ok, false);
    assert.equal(body.live_model_call, false);
  });
});
