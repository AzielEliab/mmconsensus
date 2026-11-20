/**
 * MMConsensus ops for the standalone package.
 * tally / agree stay HEURISTIC. Live model names stay FG-STUB.
 * This package is not a second FragGate door and does not enable mesh.
 * Author: Aziel Eliab.
 */
import {
  AXES,
  AUTHOR,
  HONESTY_BANNER,
  LIMITATION,
  LIVE_OPS,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  PRODUCT_GITHUB,
  ROLE,
  RUNTIME_NEIGHBOR,
  SPEC,
  STUB_REFUSE,
  VERSION,
  agree,
  limitationCite,
  stubRefuse,
  tally,
} from "./engine.js";

export const MMCONSENSUS_OPS = LIVE_OPS.slice();

function envelope() {
  return {
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    role: ROLE,
    motto: MOTTO,
    axes: AXES,
    neighbors: NEIGHBORS,
    live_ops: LIVE_OPS,
    stub_ops: STUB_REFUSE,
    limitation: LIMITATION,
    extra: {
      github: PRODUCT_GITHUB,
      runtime_neighbor: RUNTIME_NEIGHBOR,
      live_model_call: false,
      honesty: "HEURISTIC",
      honesty_banner: HONESTY_BANNER,
      adjacent_to: "decisiongate",
      replaces_decisiongate: false,
      worker_home: null,
      in_runtime: false,
      standalone: true,
      domain: null,
      placement: "consensus-review",
      fabricated_model_output: false,
    },
  };
}

function r2Envelope() {
  return {
    r2: { bound: false, bucket: null, cdn: false },
    isolate_hash_store: false,
    object_store: null,
    cdn: false,
  };
}

export function mmconsensusHealth() {
  const spec = envelope();
  const extra = spec.extra;
  return {
    ok: true,
    op: "health",
    status: "ok",
    product: spec.product,
    name: spec.name,
    version: spec.version,
    spec: spec.spec,
    role: spec.role,
    motto: spec.motto,
    axes: spec.axes.slice(),
    neighbors: spec.neighbors.slice(),
    live_ops: spec.live_ops.slice(),
    stub_ops: spec.stub_ops.slice(),
    true_engine_runtime: true,
    kv_increment: false,
    door: "fraggate",
    mesh_enabled_default: false,
    mesh_enabled_by_this_package: false,
    limitation: spec.limitation,
    author: AUTHOR,
    ...r2Envelope(),
    ...extra,
  };
}

export function mmconsensusDoctor() {
  const health = mmconsensusHealth();
  return {
    ...health,
    op: "doctor",
    doctor: true,
    note: "MMConsensus doctor: posted-opinion tally. HEURISTIC. Never calls models. Never invents a truth score. Never fabricates a model response. FragGate on aziel-runtime remains the catalog door. This package does not enable mesh.",
  };
}

export function mmconsensusSkill() {
  const spec = envelope();
  const markdown = `# ${NAME} (${SPEC})

Structured consensus over caller-supplied opinions. ${MOTTO} Adjacent to DecisionGATE (not a replacement hop). tally / agree are HEURISTIC. live_model_call / openai / anthropic / grok stay FG-STUB.

${HONESTY_BANNER}

- Standalone CLI: \`mmconsensus tally\` / \`mmconsensus agree\` with posted opinions JSON
- Catalog neighbor (not a second door): \`fraggate_call\` with \`{ slug: "${PRODUCT}", op: "..." }\` on aziel-runtime
- HTTP catalog: \`POST /v1/fraggate/call\` on aziel-runtime with the same envelope
- GitHub: ${PRODUCT_GITHUB}
- Runtime neighbor: ${RUNTIME_NEIGHBOR}

LIVE_OPS: ${LIVE_OPS.join(", ")}.

Stubs (refuse, SLOT, no fabricated response): ${STUB_REFUSE.join(", ")}.

Axes / order: ${AXES.join(", ")}.
Neighbors: ${NEIGHBORS.join(", ")}.

Author: Aziel Eliab only.
Limitation: ${LIMITATION}
`;
  return {
    op: "skill",
    markdown,
    skill: markdown,
    kv_increment: false,
    limitation: LIMITATION,
    honesty_banner: HONESTY_BANNER,
    live_ops: LIVE_OPS.slice(),
    stub_ops: STUB_REFUSE.slice(),
    neighbors: NEIGHBORS.slice(),
    axes: AXES.slice(),
    door: "fraggate",
    mesh_enabled_default: false,
    author: AUTHOR,
    product: PRODUCT,
    name: NAME,
    version: VERSION,
    spec: SPEC,
    true_engine_runtime: true,
    live_model_call: false,
  };
}

export async function runMmconsensus(op, payload) {
  const name = String(op || "").trim().toLowerCase();
  if (STUB_REFUSE.includes(name)) return stubRefuse(name);
  if (name === "health") return mmconsensusHealth();
  if (name === "skill") return mmconsensusSkill();
  if (name === "doctor") return mmconsensusDoctor();
  if (name === "limitation") return limitationCite();
  if (name === "tally") return tally(payload);
  if (name === "agree") return agree(payload);
  return {
    ok: false,
    unsupported: true,
    op: name,
    error: "unsupported op",
    honesty: "HEURISTIC",
    live_model_call: false,
    fabricated: false,
    live_ops: LIVE_OPS.slice(),
    stub_ops: STUB_REFUSE.slice(),
  };
}

export { LIMITATION, VERSION };
