/**
 * Public entry for the standalone MMConsensus package.
 * HEURISTIC tally and Jaccard only. Not a live model client.
 * Author: Aziel Eliab.
 */
export {
  AUTHOR,
  AXES,
  ENGINE_VERSION,
  HONESTY,
  HONESTY_BANNER,
  LIMITATION,
  LIVE_OPS,
  MAX_FIELD_CHARS,
  MAX_OPINIONS,
  MOTTO,
  NAME,
  NEIGHBORS,
  PRODUCT,
  PRODUCT_GITHUB,
  ROLE,
  RUNTIME_NEIGHBOR,
  SCHEMA,
  SPEC,
  STUB_REFUSE,
  VERSION,
  agree,
  jaccard,
  limitationCite,
  parseOpinions,
  stubRefuse,
  tally,
  tokenize,
} from "./engine.js";

export {
  MMCONSENSUS_OPS,
  mmconsensusDoctor,
  mmconsensusHealth,
  mmconsensusSkill,
  runMmconsensus,
} from "./ops.js";
