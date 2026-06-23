#!/usr/bin/env bun
// hero-validate.ts — validate hero video variants and extract previews.
// Reads $A/scenes/hero/hero-v*.mp4; writes $A/scenes/hero/preview/*.jpg and
// $A/scenes/hero/hero-validate.json. Ensures hero-final.mp4 exists (else copy v1).
import { readdirSync, existsSync, copyFileSync } from "node:fs";
import { artifactsDir, ensureDir, ffprobe, run, writeJSON } from "./lib/util.ts";

function extractPreviews(mp4: string, outPattern: string, durationSec: number): number {
  // Extract 5 evenly-spaced preview frames. fps so that ~5 frames span the clip.
  const dur = durationSec > 0 ? durationSec : 8;
  const fps = Math.max(0.1, 5 / dur);
  const r = run("ffmpeg", [
    "-y", "-i", mp4,
    "-vf", `fps=${fps.toFixed(4)}`,
    "-frames:v", "5",
    "-q:v", "3",
    outPattern,
  ], { timeoutMs: 60000 });
  if (r.code !== 0) {
    process.stderr.write(`[warn] hero-validate: preview extraction failed for ${mp4}\n`);
    return 0;
  }
  return 5;
}

function main(): void {
  const A = artifactsDir();
  const dir = `${A}/scenes/hero`;
  const previewDir = `${dir}/preview`;
  ensureDir(dir);
  ensureDir(previewDir);

  let variants: string[] = [];
  if (existsSync(dir)) {
    variants = readdirSync(dir)
      .filter((f) => /^hero-v\d+\.mp4$/.test(f))
      .sort();
  }

  const report: any = { variants: [], hero_final: "false" };

  for (const f of variants) {
    const mp4 = `${dir}/${f}`;
    const probe = ffprobe(mp4);
    const stem = f.replace(/\.mp4$/, "");
    const previews = probe ? extractPreviews(mp4, `${previewDir}/${stem}_%02d.jpg`, probe.durationSec) : 0;
    report.variants.push({
      file: f,
      duration: probe ? Number(probe.durationSec.toFixed(2)) : 0,
      width: probe ? probe.width : 0,
      height: probe ? probe.height : 0,
      has_video: probe ? (probe.hasVideo ? "true" : "false") : "false",
      previews,
    });
  }

  // Ensure hero-final.mp4 exists; default to the first variant if missing.
  const final = `${dir}/hero-final.mp4`;
  if (!existsSync(final) && variants.length > 0) {
    copyFileSync(`${dir}/${variants[0]}`, final);
    process.stdout.write(`hero-validate: hero-final.mp4 missing -> copied ${variants[0]}\n`);
  }
  report.hero_final = existsSync(final) ? "true" : "false";

  writeJSON(`${dir}/hero-validate.json`, report);
  process.stdout.write(JSON.stringify(report) + "\n");
  process.exit(0);
}

main();
