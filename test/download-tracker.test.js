import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { gunzipSync } from "node:zlib";
import { LIMITATION } from "../src/engine.js";
import { BOT_SCORE_THRESHOLD, classifyRequest } from "../workers/download-tracker/src/classify.js";
import { THEME } from "../workers/download-tracker/src/home.js";
import { TRACKER, handleRequest } from "../workers/download-tracker/src/index.js";
import { RUNTIME_TEXT } from "../workers/download-tracker/src/runtime.js";
import { displayRemainder, invariantHolds } from "../workers/download-tracker/src/stats-shape.js";

const ARCHIVE = new URL("../workers/download-tracker/public/mmconsensus-0.1.0.tar.gz", import.meta.url);
const PACK = new URL("../workers/download-tracker/scripts/pack-archive.mjs", import.meta.url);

function memoryKv() {
  const store = new Map();
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, String(value));
    },
    async list() {
      return {
        keys: [...store.keys()].map((name) => ({ name })),
        list_complete: true,
      };
    },
  };
}

function diskAssets() {
  return {
    async fetch(request) {
      const url = new URL(request.url);
      const name = decodeURIComponent(url.pathname.replace(/^\//, ""));
      const file = new URL("../workers/download-tracker/public/" + name, import.meta.url);
      if (name.includes("..") || !existsSync(file)) {
        return new Response("missing", { status: 404 });
      }
      const buf = readFileSync(file);
      return new Response(buf, {
        status: 200,
        headers: { "content-length": String(buf.byteLength) },
      });
    },
  };
}

function makeEnv(fetchImpl) {
  const env = {
    DOWNLOADS: memoryKv(),
    ASSETS: diskAssets(),
    AZIEL_RUNTIME_ORIGIN: "https://aziel-runtime.example",
  };
  if (fetchImpl) env.AZIEL_RUNTIME = { fetch: fetchImpl };
  return env;
}

async function call(path, init = {}, env = makeEnv()) {
  const headers = new Headers(init.headers);
  if (!headers.has("user-agent")) headers.set("user-agent", "Mozilla/5.0");
  const { cf, ...rest } = init;
  const req = new Request("http://127.0.0.1" + path, { ...rest, headers });
  const sent = cf
    ? new Proxy(req, {
        get(target, prop, receiver) {
          if (prop === "cf") return cf;
          const value = Reflect.get(target, prop, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        },
      })
    : req;
  const previous = globalThis.fetch;
  globalThis.fetch = (async () => new Response("[]", { status: 200 }));
  try {
    return await handleRequest(sent, env);
  } finally {
    globalThis.fetch = previous;
  }
}

function contrast(hexA, hexB) {
  const lum = (hex) => {
    const n = hex.replace("#", "");
    const rgb = [0, 2, 4].map((i) => {
      const c = parseInt(n.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const a = lum(hexA);
  const b = lum(hexB);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

function assertRemainder(body) {
  assert.equal(body.views, body.views_human + body.views_bot);
  assert.equal(body.downloads, body.downloads_human + body.downloads_bot);
  assert.equal(body.total, body.downloads);
  assert.deepEqual(body.human, { views: body.views_human, downloads: body.downloads_human });
  assert.deepEqual(body.bot, { views: body.views_bot, downloads: body.downloads_bot });
  assert.equal(invariantHolds(body), true);
  assert.equal(body.classification.bot_score_threshold, 30);
  assert.equal(BOT_SCORE_THRESHOLD, 30);
}

describe("download tracker routes and archive", () => {
  it("serves the 0.1.0 archive with HTTP 200 and counts each GET once", async () => {
    assert.equal(TRACKER.project, "mmconsensus");
    assert.equal(TRACKER.version, "0.1.0");
    assert.equal(TRACKER.asset, "mmconsensus-0.1.0.tar.gz");
    assert.equal(TRACKER.host, "https://mmconsensus-download-tracker.vibelock.workers.dev");
    assert.ok(statSync(ARCHIVE).size > 500);
    const listing = execFileSync("tar", ["-tzf", ARCHIVE.pathname], { encoding: "utf8" });
    assert.match(listing, /mmconsensus-0\.1\.0\/package\.json/);
    assert.match(listing, /mmconsensus-0\.1\.0\/src\/engine\.js/);
    assert.match(listing, /mmconsensus-0\.1\.0\/src\/cli\.js/);
    const packed = execFileSync("tar", ["-xOzf", ARCHIVE.pathname, "mmconsensus-0.1.0/package.json"], { encoding: "utf8" });
    assert.equal(JSON.parse(packed).version, "0.1.0");
    const engine = execFileSync("tar", ["-xOzf", ARCHIVE.pathname, "mmconsensus-0.1.0/src/engine.js"], { encoding: "utf8" });
    assert.match(engine, /HEURISTIC/);
    assert.match(engine, /NOT live LLM or model API calls/);

    const env = makeEnv();
    const file = readFileSync(ARCHIVE);
    const res = await call("/download", {}, env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("access-control-allow-origin"), "*");
    assert.match(res.headers.get("content-type") || "", /gzip/);
    assert.match(res.headers.get("content-disposition") || "", /mmconsensus-0\.1\.0\.tar\.gz/);
    assert.match(res.headers.get("cache-control") || "", /no-store/);
    const bytes = Buffer.from(await res.arrayBuffer());
    assert.equal(bytes[0], 0x1f);
    assert.equal(bytes[1], 0x8b);
    assert.deepEqual(bytes, file);
    const raw = gunzipSync(bytes);
    assert.ok(raw.byteLength > 100);
    assert.match(raw.toString("utf8"), /"version": "0.1.0"/);

    const byPath = await call("/download/mmconsensus-0.1.0.tar.gz", {}, env);
    assert.equal(byPath.status, 200);
    assert.deepEqual(Buffer.from(await byPath.arrayBuffer()), file);
    const viaGo = await call("/go", {}, env);
    assert.equal(viaGo.status, 200);
    const branch = await call("/download?branch=dev", {}, env);
    assert.equal(branch.status, 200);
    const fork = await call("/download?owner=Other&repo=mmconsensus&branch=main", {}, env);
    assert.equal(fork.status, 200);

    const count = await call("/count", {}, env);
    const body = await count.json();
    assert.equal(body.project, "mmconsensus");
    assert.equal(body.downloads, 5);
    assert.equal(body.total, 5);
    assert.equal(body.views, 0);
    assertRemainder(body);
    assert.equal(body.classification.method, "ua_denylist + healthcheck_ua");

    const statsRes = await call("/stats", {}, env);
    assert.equal(statsRes.headers.get("access-control-allow-origin"), "*");
    const stats = await statsRes.json();
    assert.equal(stats.project, "mmconsensus");
    assert.equal(stats.total, 5);
    assert.equal(stats.downloads, 5);
    assert.equal(stats.views, 0);
    assertRemainder(stats);
    assert.equal(stats.by_branch.main, 4);
    assert.equal(stats.by_branch.dev, 1);
    assert.equal(stats.by_fork["0"], 4);
    assert.equal(stats.by_fork["1"], 1);
    assert.equal(stats.by_repo["AzielEliab/mmconsensus"], 4);
    assert.equal(stats.by_repo["Other/mmconsensus"], 1);
    assert.equal(stats.note, "Forks identified by GitHub owner/repo. Key layout: project|owner|repo|branch|fork");
    assert.equal(typeof stats.github.stars, "number");
    assert.equal(typeof stats.github.forks, "number");
    assert.equal(typeof stats.github.watchers, "number");
    assert.equal(typeof stats.github.release_download_count, "number");
    assert.equal(typeof stats.github.fetched_at, "number");
    assert.ok(stats.breakdown.some((row) => row.owner === "Other" && row.fork === "1" && row.branch === "main" && row.count === 1));
    for (const row of stats.breakdown) {
      assert.equal(row.project, "mmconsensus");
      assert.equal(typeof row.repo, "string");
      assert.equal(typeof row.count, "number");
    }
    assert.equal(Object.hasOwn(stats.by_repo, "mmconsensus|__total__"), false);
  });

  it("does not count a missing asset, a HEAD, or a non-view route", async () => {
    const env = makeEnv();
    const missing = await call("/download?asset=mmconsensus-9.9.9.tar.gz", {}, env);
    assert.equal(missing.status, 404);
    const missingBody = await missing.json();
    assert.equal(missingBody.error, "asset not hosted");
    assert.equal(missingBody.hosted, "mmconsensus-0.1.0.tar.gz");
    assert.equal(missingBody.asset, "mmconsensus-9.9.9.tar.gz");

    const head = await call("/download", { method: "HEAD" }, env);
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert.match(head.headers.get("content-type") || "", /gzip/);

    const unknown = await call("/nope", {}, env);
    assert.equal(unknown.status, 404);
    const count = await call("/count", {}, env);
    const body = await count.json();
    assert.equal(body.downloads, 0);
    assert.equal(body.views, 0);
    assertRemainder(body);
  });

  it("keeps the human/bot remainder for bots, humans, and pre-split history", async () => {
    const env = makeEnv();
    await call("/download", { headers: { "user-agent": "" } }, env);
    await call("/download", { headers: { "user-agent": "curl/8.0" } }, env);
    await call("/", { headers: { "user-agent": "UptimeRobot/2.0" } }, env);
    await call("/download", { headers: { "user-agent": "Mozilla/5.0" } }, env);
    await call("/", { headers: { "user-agent": "Mozilla/5.0" } }, env);

    const mixed = await (await call("/stats", {}, env)).json();
    assert.equal(mixed.downloads, 3);
    assert.equal(mixed.downloads_human, 1);
    assert.equal(mixed.downloads_bot, 2);
    assert.equal(mixed.views, 2);
    assert.equal(mixed.views_human, 1);
    assert.equal(mixed.views_bot, 1);
    assertRemainder(mixed);

    const seeded = makeEnv();
    await seeded.DOWNLOADS.put("mmconsensus|__views__", "7");
    await seeded.DOWNLOADS.put("mmconsensus|__total__", "4");
    const before = await (await call("/stats", {}, seeded)).json();
    assert.equal(before.views, 7);
    assert.equal(before.views_human, 0);
    assert.equal(before.views_bot, 7);
    assert.equal(before.downloads, 4);
    assert.equal(before.downloads_human, 0);
    assert.equal(before.downloads_bot, 4);
    assertRemainder(before);
    const again = await (await call("/stats", {}, seeded)).json();
    assert.equal(again.views, 7);
    assert.equal(again.downloads, 4);
    assert.equal(seeded.DOWNLOADS.store.get("mmconsensus|__views__"), "7");
    assert.equal(seeded.DOWNLOADS.store.get("mmconsensus|__total__"), "4");

    const split = displayRemainder(10, 3);
    assert.deepEqual(split, { human: 3, bot: 7 });
    assert.deepEqual(displayRemainder(2, 9), { human: 2, bot: 0 });
  });

  it("classifies bot-management scores without inventing a zero score", async () => {
    const low = classifyRequest({
      headers: new Headers({ "user-agent": "Mozilla/5.0" }),
      cf: { botManagement: { score: 30, verifiedBot: false } },
    });
    assert.equal(low.bucket, "bot");
    assert.equal(low.reason, "bot_score");
    const high = classifyRequest({
      headers: new Headers({ "user-agent": "Mozilla/5.0" }),
      cf: { botManagement: { score: 31, verifiedBot: false } },
    });
    assert.equal(high.bucket, "human");
    const unscored = classifyRequest({
      headers: new Headers({ "user-agent": "Mozilla/5.0" }),
      cf: { botManagement: { score: 0, verifiedBot: false } },
    });
    assert.equal(unscored.score, null);
    assert.equal(unscored.bucket, "human");
    const verified = classifyRequest({
      headers: new Headers({ "user-agent": "Mozilla/5.0" }),
      cf: { botManagement: { score: 90, verifiedBot: true } },
    });
    assert.equal(verified.bucket, "bot");
    assert.equal(verified.reason, "verified_bot");

    const env = makeEnv();
    await call("/download", {
      headers: { "user-agent": "Mozilla/5.0" },
      cf: { botManagement: { score: 30, verifiedBot: false } },
    }, env);
    await call("/download", {
      headers: { "user-agent": "Mozilla/5.0" },
      cf: { botManagement: { score: 31, verifiedBot: false } },
    }, env);
    const stats = await (await call("/stats", {
      cf: { botManagement: { score: 80, verifiedBot: false } },
    }, env)).json();
    assert.equal(stats.downloads, 2);
    assert.equal(stats.downloads_human, 1);
    assert.equal(stats.downloads_bot, 1);
    assert.equal(stats.classification.method, "cf.botManagement.score + ua_denylist + healthcheck_ua");
    assert.equal(stats.classification.bot_score_threshold, 30);
    assert.match(stats.classification.note, /strategy \(b\)/);
    assert.match(stats.classification.legacy, /views_bot = views - views_human/);
    assertRemainder(stats);
  });

  it("records branch and fork events and renders the landing", async () => {
    const env = makeEnv();
    const bad = await call("/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    }, env);
    assert.equal(bad.status, 400);

    const event = await call("/event", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0" },
      body: JSON.stringify({ owner: "ForkUser", repo: "mmconsensus", branch: "feature", fork: true, asset: "mmconsensus-0.1.0.tar.gz" }),
    }, env);
    assert.equal(event.status, 200);
    const recorded = await event.json();
    assert.equal(recorded.ok, true);
    assert.equal(recorded.key, "mmconsensus|ForkUser|mmconsensus|feature|1");
    assert.equal(recorded.count, 1);
    assert.equal(recorded.fork, "1");

    const named = await call("/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fork: "Ada/mmconsensus", branch: "main" }),
    }, env);
    assert.equal(named.status, 200);
    const namedBody = await named.json();
    assert.equal(namedBody.owner, "Ada");
    assert.equal(namedBody.repo, "mmconsensus");
    assert.equal(namedBody.fork, "1");

    const stats = await (await call("/stats", {}, env)).json();
    assert.equal(stats.downloads, 2);
    assert.equal(stats.by_branch.feature, 1);
    assert.equal(stats.by_fork["1"], 2);
    assert.equal(stats.by_repo["ForkUser/mmconsensus"], 1);
    assert.equal(stats.by_repo["Ada/mmconsensus"], 1);
    assertRemainder(stats);

    const home = await call("/", {}, env);
    assert.equal(home.status, 200);
    assert.equal(home.headers.get("access-control-allow-origin"), "*");
    const html = await home.text();
    assert.match(html, /<h1>MMConsensus<\/h1>/);
    assert.match(html, /HEURISTIC/);
    assert.match(html, /id="download" href="\/download"/);
    assert.match(html, /prefers-color-scheme:\s*light/);
    assert.match(html, /:focus-visible/);
    assert.match(html, /Features/);
    assert.match(html, /0\.1\.0/);
    assert.match(html, /SLOT/);
    assert.doesNotMatch(html, /9\.9\.9|0\.2\.0/);
    assert.doesNotMatch(html, /api\.openai\.com/);
    for (const theme of [THEME.dark, THEME.light]) {
      assert.ok(contrast(theme.ink, theme.bg) >= 4.5);
      assert.ok(contrast(theme.muted, theme.bg) >= 4.5);
      assert.ok(contrast(theme.btnInk, theme.btnBg) >= 4.5);
      assert.ok(contrast(theme.focus, theme.bg) >= 3);
    }
    const afterHome = await (await call("/count", {}, env)).json();
    assert.equal(afterHome.views, 1);
    assert.equal(afterHome.downloads, 2);
  });

  it("serves install, discovery, and CORS without counting", async () => {
    const env = makeEnv();
    const options = await call("/download", { method: "OPTIONS" }, env);
    assert.equal(options.status, 204);
    assert.equal(options.headers.get("access-control-allow-origin"), "*");
    assert.match(options.headers.get("access-control-allow-methods") || "", /GET/);
    assert.match(options.headers.get("access-control-allow-methods") || "", /POST/);
    assert.match(options.headers.get("access-control-allow-headers") || "", /MCP-Protocol-Version/);

    const install = await call("/install.sh", {}, env);
    assert.equal(install.status, 200);
    const script = await install.text();
    assert.match(script, /mmconsensus-0\.1\.0\.tar\.gz/);
    assert.match(script, /\/download\?asset=/);
    assert.match(script, /HEURISTIC/);
    assert.match(script, /NOT a live model call/);
    assert.match(script, /node src\/cli\.js health/);

    for (const path of ["/openapi.json", "/cite.json", "/sitemap.xml", "/robots.txt", "/llms.txt", "/ai.txt"]) {
      const res = await call(path, {}, env);
      assert.equal(res.status, 200, path);
      assert.equal(res.headers.get("access-control-allow-origin"), "*", path);
    }
    const cite = await (await call("/cite.json", {}, env)).json();
    assert.equal(cite.honesty, "HEURISTIC");
    assert.equal(cite.live_model_call, false);
    assert.equal(cite.license, "Apache-2.0");
    assert.equal(cite.forks, "always allowed");
    const llms = await (await call("/llms.txt", {}, env)).text();
    assert.match(llms, /NOT live LLM or model API calls/);

    const count = await (await call("/count", {}, env)).json();
    assert.equal(count.downloads, 0);
    assert.equal(count.views, 0);
  });

  it("does not increment on /v1 or /mcp and does not invent a model call", async () => {
    const seen = [];
    const env = makeEnv(async (input, init) => {
      const url = String(input);
      const method = init?.method || "GET";
      const body = init?.body ? new TextDecoder().decode(init.body) : "";
      seen.push({ url, method, body });
      return new Response(JSON.stringify({ ok: true, proxied: true, enabled: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const root = await call("/v1", {}, env);
    assert.equal(root.status, 200);
    const rootBody = await root.json();
    assert.equal(rootBody.product, "mmconsensus");
    assert.equal(rootBody.version, "0.1.0");
    assert.equal(rootBody.honesty, "HEURISTIC");
    assert.equal(rootBody.live_model_call, false);

    const health = await call("/v1/health", {}, env);
    assert.equal(health.status, 200);
    const healthBody = await health.json();
    assert.equal(healthBody.kv_increment, false);
    assert.equal(healthBody.mesh_enabled_by_get, false);
    assert.equal(healthBody.live_model_call, false);

    assert.equal(RUNTIME_TEXT.LIMITATION, LIMITATION);
    assert.equal(RUNTIME_TEXT.VERSION, "0.1.0");
    const limit = await call("/v1/limitation", {}, env);
    const limitBody = await limit.json();
    assert.equal(limitBody.limitation, LIMITATION);
    assert.match(limitBody.honesty_banner, /NOT live LLM or model API calls/);

    const skill = await call("/v1/skill", {}, env);
    assert.match(await skill.text(), /HEURISTIC/);

    const mesh = await call("/v1/mesh", {}, env);
    assert.equal(mesh.status, 200);
    assert.equal(mesh.headers.get("x-aziel-door"), "proxy");
    const meshBody = await mesh.json();
    assert.equal(meshBody.proxied, true);
    assert.equal(meshBody.enabled, false);
    assert.equal(seen[0].method, "GET");
    assert.equal(seen[0].body, "");
    assert.match(seen[0].url, /\/v1\/mesh$/);

    const tally = await call("/v1/tally", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        opinions: [
          { source: "a", verdict: "yes", text: "ship the patch" },
          { source: "b", verdict: "yes", text: "ship the patch" },
        ],
      }),
    }, env);
    assert.equal(tally.status, 200);
    const tallyBody = await tally.json();
    assert.equal(tallyBody.majority, "YES");
    assert.equal(tallyBody.honesty, "HEURISTIC");
    assert.equal(tallyBody.live_model_call, false);
    assert.equal(tallyBody.completion, undefined);

    const stub = await call("/v1/openai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "write a verdict" }),
    }, env);
    assert.equal(stub.status, 501);
    const stubBody = await stub.json();
    assert.equal(stubBody.code, "FG-STUB");
    assert.equal(stubBody.honesty, "SLOT");
    assert.equal(stubBody.fabricated, false);
    assert.equal(stubBody.completion, undefined);
    assert.equal(seen.length, 1);

    const mcp = await call("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    }, env);
    const rpc = await mcp.json();
    const names = rpc.result.tools.map((tool) => tool.name);
    assert.ok(names.includes("mmconsensus_health"));
    assert.ok(names.includes("mmconsensus_tally"));
    assert.ok(names.includes("mmconsensus_agree"));
    const called = await call("/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "mmconsensus_live_model_call", arguments: {} },
      }),
    }, env);
    const calledBody = await called.json();
    assert.equal(calledBody.result.isError, true);
    assert.match(calledBody.result.content[0].text, /FG-STUB/);
    assert.match(calledBody.result.content[0].text, /fabricated": false/);

    const count = await (await call("/count", {}, env)).json();
    assert.equal(count.downloads, 0);
    assert.equal(count.views, 0);
    assert.equal(seen.length, 1);
  });

  it("rebuilds a byte-identical archive", () => {
    const committed = readFileSync(ARCHIVE);
    const first = join(tmpdir(), "mmconsensus-repack-a.tar.gz");
    const second = join(tmpdir(), "mmconsensus-repack-b.tar.gz");
    for (const dest of [first, second]) {
      const packed = spawnSync(process.execPath, [PACK.pathname], {
        env: { ...process.env, MMCONSENSUS_ARCHIVE: dest },
        encoding: "utf8",
      });
      assert.equal(packed.status, 0, packed.stderr || packed.stdout);
    }
    const digest = (buf) => createHash("sha256").update(buf).digest("hex");
    const freshA = readFileSync(first);
    const freshB = readFileSync(second);
    assert.equal(digest(freshA), digest(freshB));
    assert.equal(digest(freshA), digest(committed));
  });
});
