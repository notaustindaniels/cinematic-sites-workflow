#!/usr/bin/env bun
// extract-frames.ts — extract + compress scroll-frame stills from the hero (and showcase) video.
// Reads $A/scenes/hero/hero-final.mp4 and optionally $A/scenes/showcase/showcase-video.mp4.
// Writes $A/site/frames/frame_%04d.jpg (1-indexed), optionally
// $A/site/showcase-frames/frame_%04d.jpg, and $A/site/frames-count.json.
// Prints {"hero_frames":N,"showcase_frames":M}.
import { existsSync, readdirSync } from "node:fs";
import { artifactsDir, ensureDir, run, magickBin, writeJSON, die } from "./lib/util.ts";

/** Extract frames at 30fps scaled to 1920 wide into `dir/frame_%04d.jpg` (1-indexed). */
function extract(mp4: string, dir: string): number {
  ensureDir(dir);
  const r = run("ffmpeg", [
    "-y", "-i", mp4,
    "-vf", "fps=30,scale=1920:-1",
    "-start_number", "1",
    `${dir}/frame_%04d.jpg`,
  ], { timeoutMs: 280000 });
  if (r.code !== 0) {
    die(`extract-frames: ffmpeg failed on ${mp4}\n${r.stderr}`);
  }
  return countFrames(dir);
}

function countFrames(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => /^frame_\d{4}\.jpg$/.test(f)).length;
}

/** Compress every frame in `dir` with magick/convert -quality 80 -strip (best effort). */
function compress(dir: string): void {
  const bin = magickBin();
  if (!bin) {
    process.stderr.write(`[warn] extract-frames: ImageMagick not found; skipping compression\n`);
    return;
  }
  const frames = readdirSync(dir).filter((f) => /^frame_\d{4}\.jpg$/.test(f));
  for (const f of frames) {
    const p = `${dir}/${f}`;
    // `magick IN -quality 80 -strip OUT` (in place). `convert` uses the same arg order.
    const r = run(bin, [p, "-quality", "80", "-strip", p], { timeoutMs: 30000 });
    if (r.code !== 0) {
      process.stderr.write(`[warn] extract-frames: compress failed for ${f}\n`);
    }
  }
}

function main(): void {
  const A = artifactsDir();
  const siteDir = `${A}/site`;
  ensureDir(siteDir);

  const heroMp4 = `${A}/scenes/hero/hero-final.mp4`;
  if (!existsSync(heroMp4)) die(`extract-frames: hero-final.mp4 not found at ${heroMp4}`);

  const heroDir = `${siteDir}/frames`;
  let heroFrames = extract(heroMp4, heroDir);
  compress(heroDir);
  heroFrames = countFrames(heroDir);

  let showcaseFrames = 0;
  const showcaseMp4 = `${A}/scenes/showcase/showcase-video.mp4`;
  if (existsSync(showcaseMp4)) {
    const showcaseDir = `${siteDir}/showcase-frames`;
    extract(showcaseMp4, showcaseDir);
    compress(showcaseDir);
    showcaseFrames = countFrames(showcaseDir);
  }

  const out = { hero_frames: heroFrames, showcase_frames: showcaseFrames };
  writeJSON(`${siteDir}/frames-count.json`, out);
  process.stdout.write(JSON.stringify(out) + "\n");
  process.exit(0);
}

main();
