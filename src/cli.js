#!/usr/bin/env node
/**
 * MMConsensus CLI.
 * Every invocation flags HEURISTIC scope on stderr.
 * NOT live LLM or model API calls. Live model ops refuse with FG-STUB and invent no completion.
 * Author: Aziel Eliab.
 */
import { readFileSync } from "node:fs";
import { stdin, stderr, exit } from "node:process";
import { pathToFileURL } from "node:url";
import { HONESTY_BANNER, SPEC, STUB_REFUSE } from "./engine.js";
import { runMmconsensus } from "./ops.js";

function printBanner() {
  stderr.write(HONESTY_BANNER + "\n");
}

function usage() {
  return `mmconsensus <op> [json] [--file path] [--statement text]

Ops: health, skill, doctor, tally, agree, limitation
SLOT (refused, no fabricated model output): ${STUB_REFUSE.join(", ")}

${HONESTY_BANNER}

Examples:
  node src/cli.js health
  node src/cli.js tally '{"statement":"ship it","opinions":[{"source":"a","verdict":"yes","text":"ship the patch"},{"source":"b","verdict":"yes","text":"ship the patch"}]}'
  node src/cli.js agree --file opinions.json
  node src/cli.js live_model_call
`;
}

function takeFlag(argv, name) {
  const idx = argv.indexOf(name);
  if (idx === -1) return { argv, value: null };
  const value = argv[idx + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(name + " requires a value");
  }
  const next = argv.slice();
  next.splice(idx, 2);
  return { argv: next, value };
}

async function readStdin() {
  if (stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

function parsePayload(text) {
  if (!text) return {};
  const value = JSON.parse(text);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("payload must be a JSON object");
  }
  return value;
}

export async function main(argv) {
  printBanner();
  const args = argv.slice(2);
  if (!args.length || args.includes("--help") || args.includes("-h")) {
    stderr.write(usage());
    return args.includes("--help") || args.includes("-h") ? 0 : 1;
  }

  let rest = args.slice();
  let file = null;
  let statement = null;
  try {
    const fileFlag = takeFlag(rest, "--file");
    rest = fileFlag.argv;
    file = fileFlag.value;
    const statementFlag = takeFlag(rest, "--statement");
    rest = statementFlag.argv;
    statement = statementFlag.value;
  } catch (err) {
    stderr.write(String(err.message || err) + "\n");
    return 1;
  }

  const op = rest[0];
  const positional = rest.slice(1).join(" ").trim();
  let raw = positional;
  if (!raw && file) raw = readFileSync(file, "utf8");
  if (!raw) raw = await readStdin();

  let payload = {};
  if (raw) {
    try {
      payload = parsePayload(raw);
    } catch (err) {
      stderr.write("invalid JSON payload: " + String(err.message || err) + "\n");
      return 1;
    }
  }
  if (statement != null) payload = { ...payload, statement };

  let result;
  try {
    result = await runMmconsensus(op, payload);
  } catch (err) {
    const body = {
      ok: false,
      error: String(err.message || err),
      code: err.code || "ERROR",
      honesty: "HEURISTIC",
      live_model_call: false,
      fabricated: false,
      spec: SPEC,
      honesty_banner: HONESTY_BANNER,
    };
    process.stdout.write(JSON.stringify(body, null, 2) + "\n");
    return 1;
  }

  const out = { ...result, honesty_banner: HONESTY_BANNER };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
  if (result && result.code === "FG-STUB") return 2;
  if (result && result.ok === false) return 1;
  return 0;
}

const invoked = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invoked) {
  main(process.argv).then(
    (code) => exit(code),
    (err) => {
      stderr.write(String(err && err.stack ? err.stack : err) + "\n");
      exit(1);
    },
  );
}
