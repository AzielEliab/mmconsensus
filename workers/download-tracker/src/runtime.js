/**
 * MMConsensus Worker agent surface.
 * Read paths and the local HEURISTIC tally/agree are local.
 * /v1 and /mcp never increment DOWNLOADS. GET never enables mesh.
 * Live model names stay FG-STUB. No model response is fabricated.
 * Author: Aziel Eliab only.
 */
import { classifyV1Path, doorTargetUrl } from "./door.js";
import { HONESTY_BANNER, LIMITATION, STUB_REFUSE, stubRefuse } from "../../../src/engine.js";
import { runMmconsensus } from "../../../src/ops.js";

const PRODUCT = "mmconsensus";
const NAME = "MMConsensus";
const VERSION = "0.1.0";
const SPEC = "MM-CONSENSUS-0.1";
const AUTHOR = "Aziel Eliab";
const HOST = "https://mmconsensus-download-tracker.vibelock.workers.dev";
const GITHUB = "https://github.com/AzielEliab/mmconsensus";
const CATALOG_MCP = "https://aziel-runtime.vibelock.workers.dev/mcp";
const FRAGGATE_CALL = "https://aziel-runtime.vibelock.workers.dev/v1/fraggate/call";
const MOTTO = "Opinions you already have. No live model call.";
const LIVE_OPS = ["health", "skill", "doctor", "tally", "agree", "limitation"];
const READ_OPS = ["health", "skill", "doctor", "limitation", "describe"];
const LOCAL_POST_OPS = ["tally", "agree"];
const DOOR_NOTE =
  "This Worker serves the counted source archive and a local HEURISTIC tally over posted opinions. It does not call models. FragGate on aziel-runtime remains the catalog door. GET never enables mesh. /v1 and /mcp do not increment download counters.";

const SKILL = `---
name: MMConsensus
description: >-
  Deterministic HEURISTIC tally and Jaccard aggregator over posted opinions.
  Not live LLM or model API calls. Author Aziel Eliab.
---

# MMConsensus

${MOTTO}

${HONESTY_BANNER}

Author: **Aziel Eliab**. Identity is Aziel Eliab only.
Version: ${VERSION}
Spec: ${SPEC}
GitHub: ${GITHUB}
Download tracker: ${HOST}/download
Stats: ${HOST}/stats
Archive: mmconsensus-0.1.0.tar.gz (built from this repository; package.json ${VERSION})

${DOOR_NOTE}

Always send \`User-Agent: Mozilla/5.0\`.

## This Worker

| Method | Path | What |
|--------|------|------|
| GET | \`/download\` | Counted gzip of mmconsensus-0.1.0.tar.gz. HTTP 200. No GitHub 302. |
| GET | \`/go\` | Same counted archive. |
| GET | \`/stats\` | Fleet stats JSON. Does not increment. |
| GET | \`/count\` | Compact count JSON. Does not increment. |
| POST | \`/event\` | Record owner, repo, branch, and fork. |
| GET | \`/install.sh\` | One-line installer. Does not increment by itself. |
| GET | \`/v1/health\` | Tracker liveness. Does not increment. |
| GET | \`/v1/skill\` | This markdown. Does not increment. |
| GET | \`/v1/doctor\` | Read-only self-check. Does not increment. |
| GET | \`/v1/limitation\` | Honesty text from this repository. Does not increment. |
| GET | \`/v1/describe\` | Read-only describe. Does not increment. |
| POST | \`/v1/tally\` | Local HEURISTIC majority tally. Does not increment. Does not call a model. |
| POST | \`/v1/agree\` | Local HEURISTIC Jaccard. Does not increment. Does not call a model. |
| GET | \`/v1/fraggate/list\` | PROXY to aziel-runtime. Not a second door. |
| POST | \`/v1/fraggate/call\` | PROXY to aziel-runtime. FragGate remains the executable door. |
| GET | \`/v1/mesh\` | PROXY. Does not enable mesh. |
| GET | \`/mcp\` | MCP docs. Does not increment. |
| POST | \`/mcp\` | JSON-RPC for the tools below. Does not increment. |

Catalog MCP: \`${CATALOG_MCP}\` with FragGate slug \`${PRODUCT}\`.
Catalog call: \`POST ${FRAGGATE_CALL}\` body \`{"slug":"mmconsensus","op":"health"}\`.

## Local package

\`\`\`bash
node src/cli.js health
node src/cli.js tally '{"opinions":[{"source":"a","verdict":"yes","text":"ship the patch"}]}'
\`\`\`

## Live ops

${LIVE_OPS.map((op) => "- `" + op + "`").join("\n")}

SLOT (refused here, no fabricated response): ${STUB_REFUSE.map((op) => "`" + op + "`").join(", ")}.

Read tools on this Worker: ${READ_OPS.map((op) => "`mmconsensus_" + op + "`").join(", ")}.
Heuristic tools on this Worker: \`mmconsensus_tally\`, \`mmconsensus_agree\`.
`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, MCP-Protocol-Version, mcp-session-id, User-Agent, Authorization",
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() },
  });
}

function describeBody() {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    author: AUTHOR,
    identity: "Aziel Eliab only",
    license: "Apache-2.0",
    forks: "always allowed",
    github: GITHUB,
    motto: MOTTO,
    honesty: "HEURISTIC",
    honesty_banner: HONESTY_BANNER,
    live_model_call: false,
    surface: "download-tracker",
    asset: "mmconsensus-0.1.0.tar.gz",
    door: "fraggate",
    slug: PRODUCT,
    live_ops: LIVE_OPS,
    read_ops_here: READ_OPS,
    local_post_ops: LOCAL_POST_OPS,
    stub_ops: STUB_REFUSE.slice(),
    agent_path: FRAGGATE_CALL,
    note: DOOR_NOTE,
  };
}

function healthBody() {
  return {
    ok: true,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    author: AUTHOR,
    honesty: "HEURISTIC",
    live_model_call: false,
    surface: "download-tracker",
    door: "fraggate",
    slug: PRODUCT,
    kv_increment: false,
    mesh_enabled_by_get: false,
    note: DOOR_NOTE,
  };
}

function doctorBody() {
  return {
    ok: true,
    product: PRODUCT,
    version: VERSION,
    spec: SPEC,
    author: AUTHOR,
    identity: "Aziel Eliab only",
    honesty: "HEURISTIC",
    live_model_call: false,
    worker_local: true,
    fraggate_live: false,
    asset: "mmconsensus-0.1.0.tar.gz",
    models_called_here: false,
    note: "Read-only self-check. tally and agree on this Worker are the local HEURISTIC. No model is called. This response does not enable mesh and does not increment counters.",
  };
}

function doorRefusal(op) {
  return {
    ok: false,
    code: "MMCONSENSUS-DOOR",
    op,
    honesty: "HEURISTIC",
    live_model_call: false,
    fabricated: false,
    door: "fraggate",
    slug: PRODUCT,
    agent_path: FRAGGATE_CALL,
    local: "node src/cli.js " + op,
    note: `This Worker does not run \`${op}\` as a live model call. Use the local CLI for tally and agree, or POST FragGate with slug mmconsensus. Nothing was enabled. No response was invented.`,
  };
}

function openapiSpec() {
  return {
    openapi: "3.0.3",
    info: {
      title: "MMConsensus download tracker",
      version: VERSION,
      description: DOOR_NOTE + " " + HONESTY_BANNER,
      license: { name: "Apache-2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    },
    servers: [{ url: HOST }],
    paths: {
      "/download": {
        get: {
          operationId: "downloadArchive",
          summary: "Counted download of mmconsensus-0.1.0.tar.gz (HTTP 200)",
          responses: { "200": { description: "gzip archive" } },
        },
      },
      "/stats": {
        get: {
          operationId: "stats",
          summary: "Fleet stats JSON. Does not increment.",
          responses: { "200": { description: "stats JSON" } },
        },
      },
      "/count": {
        get: {
          operationId: "downloadCount",
          summary: "Views and downloads. total equals downloads. Does not increment.",
          responses: { "200": { description: "count JSON" } },
        },
      },
      "/event": {
        post: {
          operationId: "recordEvent",
          summary: "Record a branch or fork download.",
          responses: { "200": { description: "event JSON" } },
        },
      },
      "/v1/health": { get: { operationId: "health", summary: "Tracker liveness", responses: { "200": { description: "health" } } } },
      "/v1/skill": { get: { operationId: "skill", summary: "Skill markdown", responses: { "200": { description: "markdown" } } } },
      "/v1/doctor": { get: { operationId: "doctor", summary: "Read-only self-check", responses: { "200": { description: "doctor" } } } },
      "/v1/limitation": { get: { operationId: "limitation", summary: "Honesty text", responses: { "200": { description: "limitation" } } } },
      "/v1/describe": { get: { operationId: "describe", summary: "Read-only describe", responses: { "200": { description: "describe" } } } },
      "/v1/tally": {
        post: {
          operationId: "tally",
          summary: "Local HEURISTIC majority tally. Does not call a model. Does not increment.",
          responses: { "200": { description: "tally JSON" } },
        },
      },
      "/v1/agree": {
        post: {
          operationId: "agree",
          summary: "Local HEURISTIC Jaccard. Does not call a model. Does not increment.",
          responses: { "200": { description: "agree JSON" } },
        },
      },
      "/v1/fraggate/call": {
        post: {
          operationId: "fraggateCall",
          summary: "Proxy to aziel-runtime FragGate. This Worker does not execute the op itself.",
          responses: { "200": { description: "upstream response" } },
        },
      },
      "/mcp": {
        post: {
          operationId: "mcp",
          summary: "MCP JSON-RPC. Does not increment counters.",
          responses: { "200": { description: "JSON-RPC" } },
        },
      },
    },
  };
}

function mcpTools() {
  return [
    { name: "mmconsensus_health", description: "Tracker liveness. Does not call a model or enable mesh.", inputSchema: { type: "object", properties: {} } },
    { name: "mmconsensus_skill", description: "Skill markdown for MMConsensus 0.1.0. HEURISTIC scope.", inputSchema: { type: "object", properties: {} } },
    { name: "mmconsensus_doctor", description: "Read-only self-check of this download tracker.", inputSchema: { type: "object", properties: {} } },
    { name: "mmconsensus_limitation", description: "Honesty text. HEURISTIC tally. Live model calls are SLOT.", inputSchema: { type: "object", properties: {} } },
    { name: "mmconsensus_describe", description: "Read-only describe of the heuristic package and this tracker.", inputSchema: { type: "object", properties: {} } },
    {
      name: "mmconsensus_tally",
      description: "HEURISTIC majority tally over posted opinions. Does not call a model.",
      inputSchema: {
        type: "object",
        properties: {
          statement: { type: "string" },
          opinions: { type: "array" },
        },
      },
    },
    {
      name: "mmconsensus_agree",
      description: "HEURISTIC token Jaccard over posted opinions. Does not call a model.",
      inputSchema: {
        type: "object",
        properties: {
          opinions: { type: "array" },
        },
      },
    },
  ];
}

function mcpInitialize() {
  return {
    protocolVersion: "2025-03-26",
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: "mmconsensus-download-tracker", version: VERSION },
    instructions: DOOR_NOTE + " " + HONESTY_BANNER + " Catalog MCP remains " + CATALOG_MCP + ".",
  };
}

async function toolPayload(name, args) {
  if (name === "mmconsensus_health" || name === "health") return healthBody();
  if (name === "mmconsensus_skill" || name === "skill") return { skill: SKILL };
  if (name === "mmconsensus_doctor" || name === "doctor") return doctorBody();
  if (name === "mmconsensus_limitation" || name === "limitation") {
    return { ok: true, limitation: LIMITATION, honesty_banner: HONESTY_BANNER, version: VERSION };
  }
  if (name === "mmconsensus_describe" || name === "describe") return describeBody();
  if (name === "mmconsensus_tally" || name === "tally") return runMmconsensus("tally", args || {});
  if (name === "mmconsensus_agree" || name === "agree") return runMmconsensus("agree", args || {});
  const bare = String(name || "").replace(/^mmconsensus_/, "");
  if (STUB_REFUSE.includes(bare)) return stubRefuse(bare);
  return null;
}

async function handleMcp(request) {
  if (request.method === "GET" || request.method === "HEAD") {
    const docs = {
      product: PRODUCT,
      version: VERSION,
      spec: SPEC,
      author: AUTHOR,
      protocol: "mcp",
      honesty: "HEURISTIC",
      live_model_call: false,
      door: "fraggate",
      slug: PRODUCT,
      catalog_mcp: CATALOG_MCP,
      tools: mcpTools().map((t) => t.name),
      note: DOOR_NOTE,
    };
    if (request.method === "HEAD") return new Response(null, { status: 200, headers: corsHeaders() });
    return json(docs);
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }
  const id = body && Object.prototype.hasOwnProperty.call(body, "id") ? body.id : null;
  const method = body && body.method;
  const params = (body && body.params) || {};
  if (method === "initialize") return json({ jsonrpc: "2.0", id, result: mcpInitialize() });
  if (method === "notifications/initialized" || method === "initialized") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (method === "ping") return json({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list") return json({ jsonrpc: "2.0", id, result: { tools: mcpTools() } });
  if (method === "tools/call") {
    const name = params.name;
    const data = await toolPayload(name, params.arguments || {});
    if (!data) {
      return json({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{
            type: "text",
            text: JSON.stringify({
              ok: false,
              code: "MMCONSENSUS-DOOR",
              honesty: "HEURISTIC",
              live_model_call: false,
              fabricated: false,
              error: "Unknown tool. Catalog ops go through FragGate slug mmconsensus. This Worker did not call a model.",
              agent_path: FRAGGATE_CALL,
              catalog_mcp: CATALOG_MCP,
            }, null, 2),
          }],
        },
      });
    }
    if (data.code === "FG-STUB") {
      return json({
        jsonrpc: "2.0",
        id,
        result: {
          isError: true,
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        },
      });
    }
    if (name === "mmconsensus_skill" || name === "skill") {
      return json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: SKILL }] } });
    }
    return json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] } });
  }
  return json({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found. Use initialize, tools/list, tools/call." },
  });
}

function runtimeFetcher(env) {
  if (env && env.AZIEL_RUNTIME && typeof env.AZIEL_RUNTIME.fetch === "function") return env.AZIEL_RUNTIME;
  return null;
}

async function proxyDoor(request, url, env) {
  const dest = doorTargetUrl(url.pathname, request.url, env);
  if (!dest) return json({ ok: false, error: "not a door path", path: url.pathname, door: "fraggate" }, 404);
  const headers = new Headers();
  const pass = ["content-type", "accept", "authorization", "user-agent", "mcp-protocol-version", "mcp-session-id"];
  for (const name of pass) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }
  if (!headers.has("user-agent") && !headers.has("User-Agent")) headers.set("User-Agent", "Mozilla/5.0 MMConsensus/0.1.0");
  const init = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }
  try {
    const fetcher = runtimeFetcher(env);
    const res = fetcher ? await fetcher.fetch(dest, init) : await fetch(dest, init);
    const outHeaders = new Headers();
    const ctype = res.headers.get("content-type");
    if (ctype) outHeaders.set("content-type", ctype);
    for (const [k, v] of Object.entries(corsHeaders())) outHeaders.set(k, v);
    outHeaders.set("X-Aziel-Door", "proxy");
    outHeaders.set("X-Aziel-Door-Origin", dest);
    outHeaders.set("Cache-Control", "private, no-store");
    return new Response(res.body, { status: res.status, headers: outHeaders });
  } catch (exc) {
    console.error(JSON.stringify({
      message: "fraggate proxy failed",
      error: exc instanceof Error ? exc.message : String(exc),
    }));
    return json({
      ok: false,
      error: "fraggate_proxy_failed",
      detail: String(exc && exc.message ? exc.message : exc).slice(0, 240),
      origin: dest,
      agent_path: FRAGGATE_CALL,
      door: "fraggate",
      slug: PRODUCT,
      note: "The proxy failed. Nothing was enabled on this Worker. No model was called.",
    }, 502);
  }
}

async function readJsonObject(request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "JSON object required" };
    return { body };
  } catch {
    return { error: "JSON body required" };
  }
}

export async function handleRuntimeApi(request, url, env) {
  const stripped = url.pathname.replace(/\/+$/, "") || "/";
  if (stripped === "/mcp") return handleMcp(request);

  const classified = classifyV1Path(url.pathname);
  if (classified.kind === "door") return proxyDoor(request, url, env);

  const path = stripped;
  const isApi = path === "/v1" || path.startsWith("/v1/") || path === "/openapi.json";
  if (!isApi) return null;

  if (classified.kind === "multi") {
    return json({
      ok: false,
      error: "not a local op",
      code: "NOT_LOCAL_OP",
      path: classified.path,
      note: "Local reads are a single /v1/{op} segment. FragGate and mesh paths proxy to aziel-runtime and do not increment downloads.",
    }, 404);
  }

  if (path === "/openapi.json" && request.method === "GET") return json(openapiSpec());
  if (path === "/v1" && request.method === "GET") {
    return json({
      ok: true,
      product: PRODUCT,
      version: VERSION,
      spec: SPEC,
      honesty: "HEURISTIC",
      live_model_call: false,
      read_ops: READ_OPS,
      door: "fraggate",
      note: DOOR_NOTE,
    });
  }
  if (request.method === "GET" && path === "/v1/health") return json(healthBody());
  if (request.method === "GET" && path === "/v1/skill") {
    return new Response(SKILL, {
      status: 200,
      headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "private, no-store", ...corsHeaders() },
    });
  }
  if (request.method === "GET" && path === "/v1/doctor") return json(doctorBody());
  if (request.method === "GET" && path === "/v1/limitation") {
    return json({
      ok: true,
      product: PRODUCT,
      version: VERSION,
      author: AUTHOR,
      honesty: "HEURISTIC",
      limitation: LIMITATION,
      honesty_banner: HONESTY_BANNER,
    });
  }
  if (request.method === "GET" && path === "/v1/describe") return json(describeBody());

  if (classified.kind === "local" && classified.op) {
    const op = classified.op.toLowerCase();
    if (STUB_REFUSE.includes(op)) return json(stubRefuse(op), 501);
    if (LOCAL_POST_OPS.includes(op)) {
      if (request.method !== "POST") {
        return json({
          ok: false,
          error: "POST JSON opinions",
          honesty: "HEURISTIC",
          live_model_call: false,
          op,
        }, 405);
      }
      const parsed = await readJsonObject(request);
      if (parsed.error) {
        return json({ ok: false, error: parsed.error, honesty: "HEURISTIC", live_model_call: false }, 400);
      }
      try {
        const result = await runMmconsensus(op, parsed.body);
        const status = result && result.ok === false ? (result.status || 400) : 200;
        return json(result, status);
      } catch (err) {
        console.error(JSON.stringify({
          message: "local heuristic op failed",
          op,
          error: err instanceof Error ? err.message : String(err),
        }));
        return json({
          ok: false,
          error: String(err.message || err),
          code: err.code || "ERROR",
          honesty: "HEURISTIC",
          live_model_call: false,
          fabricated: false,
        }, err.status || 400);
      }
    }
    if (request.method === "GET" && !READ_OPS.includes(op)) {
      return json({ ...doorRefusal(op), hint: "Use POST on the local CLI or FragGate. GET does not enable this op." }, 405);
    }
    if (request.method === "POST") return json(doorRefusal(op), 400);
    if (request.method !== "GET") return json({ ok: false, code: "MMCONSENSUS-METHOD", note: "Method not allowed." }, 405);
  }

  return json({ error: "not found", product: PRODUCT, note: DOOR_NOTE }, 404);
}

export const RUNTIME_TEXT = { LIMITATION, MOTTO, VERSION, DOOR_NOTE, HONESTY_BANNER };
