#!/usr/bin/env bun
// grid-verdict-passed.ts — exit 0 iff $A/showcase/grid-verdict.json has verdict === "PASS".
// Used as the refine-loop's until_bash: the loop ends as soon as the self-critique passes.
import { existsSync, readFileSync } from "node:fs";

const A = process.env.ARTIFACTS_DIR || process.argv[2];
if (!A) process.exit(1);
const p = `${A}/showcase/grid-verdict.json`;
if (!existsSync(p)) process.exit(1);
try {
  const v = JSON.parse(readFileSync(p, "utf8"));
  process.exit(v && v.verdict === "PASS" ? 0 : 1);
} catch {
  process.exit(1);
}
