#!/usr/bin/env bun
// gen-hero-end.ts — generate the hero end-frame by editing the reference image.
// Reads $A/scenes/hero/director-brief.json (end_frame_prompt) + reference.png;
// writes $A/scenes/hero/end-frame.png (16:9, 2k). Node is `when` want_end_frame.
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, die, ensureDir } from "./lib/util.ts";
import { hfImage } from "./hf-image.ts";

function main(): void {
  const A = artifactsDir();
  const dir = `${A}/scenes/hero`;
  ensureDir(dir);

  const briefPath = `${dir}/director-brief.json`;
  if (!existsSync(briefPath)) die(`gen-hero-end: director-brief.json not found at ${briefPath}`);

  let brief: any;
  try {
    brief = JSON.parse(readFileSync(briefPath, "utf8"));
  } catch (e) {
    die(`gen-hero-end: failed to parse director-brief.json: ${(e as Error).message}`);
  }
  const prompt = String(brief?.end_frame_prompt ?? "").trim();
  if (!prompt) die(`gen-hero-end: director-brief.json has no end_frame_prompt`);

  const reference = `${dir}/reference.png`;
  const images = existsSync(reference) ? [reference] : [];
  const out = `${dir}/end-frame.png`;

  hfImage({ prompt, out, images, aspect: "16:9", resolution: "2k" });
  process.stdout.write(`gen-hero-end: wrote ${out}\n`);
  process.exit(0);
}

main();
