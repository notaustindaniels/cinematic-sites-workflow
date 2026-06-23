#!/usr/bin/env bun
// gen-hero-video.ts — generate the hero video variant(s).
// Reads $A/scenes/hero/video-prompt.txt + $A/plan.json (hero.variants, hero.duration);
// writes $A/scenes/hero/hero-v{n}.mp4 for n=1..variants and copies hero-v1.mp4 -> hero-final.mp4.
// startImage = reference.png; endImage = end-frame.png IF it exists.
import { existsSync, readFileSync, copyFileSync } from "node:fs";
import { artifactsDir, die, ensureDir, ffprobe } from "./lib/util.ts";
import { hfVideo } from "./hf-video.ts";

function main(): void {
  const A = artifactsDir();
  const dir = `${A}/scenes/hero`;
  ensureDir(dir);

  const promptFile = `${dir}/video-prompt.txt`;
  if (!existsSync(promptFile)) die(`gen-hero-video: video-prompt.txt not found at ${promptFile}`);

  // Defaults; refine from plan.json if present.
  let variants = 2;
  let duration = 8;
  const planPath = `${A}/plan.json`;
  if (existsSync(planPath)) {
    try {
      const plan = JSON.parse(readFileSync(planPath, "utf8"));
      const hero = plan?.hero ?? {};
      if (hero.variants != null && Number(hero.variants) >= 1) variants = Math.trunc(Number(hero.variants));
      if (hero.duration != null && Number(hero.duration) >= 4) duration = Math.trunc(Number(hero.duration));
    } catch {
      process.stderr.write(`[warn] gen-hero-video: could not parse plan.json; using defaults\n`);
    }
  }
  if (variants < 1) variants = 1;

  const startImage = `${dir}/reference.png`;
  if (!existsSync(startImage)) die(`gen-hero-video: reference.png not found at ${startImage}`);
  const endFrame = `${dir}/end-frame.png`;
  const endImage = existsSync(endFrame) ? endFrame : undefined;

  // Generate each variant independently. A transient Higgsfield network/upload
  // failure on ONE variant must NOT lose the others (we once hard-failed the whole
  // hero node because variant 2's image upload couldn't reach the API while variant 1
  // was already valid). So we catch per-variant, keep going, and only fail the node if
  // EVERY variant failed.
  const ok: string[] = [];
  for (let n = 1; n <= variants; n++) {
    const out = `${dir}/hero-v${n}.mp4`;
    // Idempotent: skip a variant that already exists as a valid clip. Makes the node's
    // retry and `archon ... --resume` safe — never re-spends credits on an already-generated video.
    if (existsSync(out)) {
      const probe = ffprobe(out);
      if (probe && probe.hasVideo && probe.durationSec > 0) {
        process.stdout.write(`gen-hero-video: ${out} already present and valid — skipping\n`);
        ok.push(out);
        continue;
      }
    }
    try {
      hfVideo({ promptFile, out, startImage, endImage, duration, aspect: "16:9", resolution: "720p" });
      process.stdout.write(`gen-hero-video: wrote ${out}\n`);
      ok.push(out);
    } catch (e) {
      process.stderr.write(`[warn] gen-hero-video: variant ${n} failed (${(e as Error).message.split("\n")[0]}); continuing\n`);
    }
  }

  if (ok.length === 0) {
    die(`gen-hero-video: all ${variants} hero variant(s) failed to generate (transient Higgsfield error?). Re-run to retry — valid variants are cached and skipped.`);
  }
  if (ok.length < variants) {
    process.stderr.write(`[warn] gen-hero-video: only ${ok.length}/${variants} variants succeeded — proceeding with what we have\n`);
  }

  // Point hero-final at the first SUCCESSFUL variant (not necessarily v1).
  const final = `${dir}/hero-final.mp4`;
  copyFileSync(ok[0], final);
  process.stdout.write(`gen-hero-video: ${ok[0].split("/").pop()} -> hero-final.mp4 (${ok.length}/${variants} variants ok)\n`);
  process.exit(0);
}

main();
