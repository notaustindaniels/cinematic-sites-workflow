#!/usr/bin/env bun
// gen-hero-ref.ts — generate the hero reference image.
// Reads $A/scenes/hero/ref-prompt.txt; writes $A/scenes/hero/reference.png (16:9, 2k).
import { existsSync } from "node:fs";
import { artifactsDir, die, ensureDir } from "./lib/util.ts";
import { hfImage } from "./hf-image.ts";

function main(): void {
  const A = artifactsDir();
  const dir = `${A}/scenes/hero`;
  ensureDir(dir);
  const promptFile = `${dir}/ref-prompt.txt`;
  if (!existsSync(promptFile)) die(`gen-hero-ref: prompt file not found at ${promptFile}`);

  const out = `${dir}/reference.png`;
  hfImage({ promptFile, out, aspect: "16:9", resolution: "2k" });
  process.stdout.write(`gen-hero-ref: wrote ${out}\n`);
  process.exit(0);
}

main();
