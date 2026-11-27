/**
 * Reproducible source archive for the download tracker.
 * Output: workers/download-tracker/public/mmconsensus-0.1.0.tar.gz
 * (fleet public/ asset path). GNU tar, sorted names, fixed mtime, gzip mtime pinned.
 * The archive is excluded so it is not nested inside itself.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const out = process.env.MMCONSENSUS_ARCHIVE
  ? resolve(process.env.MMCONSENSUS_ARCHIVE)
  : resolve(root, "workers/download-tracker/public/mmconsensus-0.1.0.tar.gz");

const tar = execFileSync(
  "tar",
  [
    "--sort=name",
    "--mtime=@1767225600",
    "--owner=0",
    "--group=0",
    "--numeric-owner",
    "--format=gnu",
    "--exclude=.git",
    "--exclude=node_modules",
    "--exclude=dist",
    "--exclude=.wrangler",
    "--exclude=coverage",
    "--exclude=*.log",
    "--exclude=mmconsensus-0.1.0.tar.gz",
    "--transform",
    "s,^\\./,mmconsensus-0.1.0/,",
    "-C",
    root,
    "-cf",
    "-",
    ".",
  ],
  { maxBuffer: 64 * 1024 * 1024 },
);

writeFileSync(out, gzipSync(tar, { level: 9, mtime: 1767225600 }));
console.log(out);
