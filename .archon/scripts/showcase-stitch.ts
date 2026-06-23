#!/usr/bin/env bun
// showcase-stitch.ts — concatenate the done showcase clips (in order) into one video.
// Reads $A/showcase/plan.json (done clips, in plan order); writes
// $A/scenes/showcase/showcase-video.mp4. No clips -> no-op (do not fail).
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artifactsDir, ensureDir, ensureDirFor, run, ffprobe, die } from "./lib/util.ts";

// NO CROSSFADE. REBUILD-PLAN §1 acceptance is explicit: "No crossfade band-aids —
// continuity must come from the generation, not ffmpeg xfade." In the 2-frame chain
// every clip k ENDS on keyframe kf(k) and clip k+1 STARTS on that SAME kf(k) file, so
// the last frame of one clip is byte-for-byte the first frame of the next — the seam
// is frame-identical by construction and a HARD CONCAT is already seamless. A dissolve
// would only smear two matching frames and, worse, hide any real morph we need to see.
// So we hard-concat (re-encoded for robustness against mixed params), never xfade.

function concatDemux(clips: string[], out: string): boolean {
  // Build a concat-demuxer list file.
  const listDir = mkdtempSync(join(tmpdir(), "showcase-"));
  const listFile = join(listDir, "concat.txt");
  const body = clips.map((c) => `file '${c.replace(/'/g, "'\\''")}'`).join("\n") + "\n";
  writeFileSync(listFile, body);
  // Re-encode for safety (mixed params concat cleanly when re-encoded).
  const r = run("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", listFile,
    "-vf", "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an",
    out,
  ], { timeoutMs: 290000 });
  return r.code === 0 && existsSync(out);
}

function copySingle(clip: string, out: string): boolean {
  const r = run("ffmpeg", ["-y", "-i", clip, "-c", "copy", out], { timeoutMs: 120000 });
  if (r.code === 0 && existsSync(out)) return true;
  // Fallback: re-encode.
  const r2 = run("ffmpeg", ["-y", "-i", clip, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", out], { timeoutMs: 290000 });
  return r2.code === 0 && existsSync(out);
}

function main(): void {
  const A = artifactsDir();
  const planPath = `${A}/showcase/plan.json`;
  const out = `${A}/scenes/showcase/showcase-video.mp4`;
  ensureDirFor(out);

  if (!existsSync(planPath)) {
    process.stdout.write(`showcase-stitch: no showcase plan; nothing to stitch (no-op)\n`);
    process.exit(0);
  }

  let plan: any;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (e) {
    die(`showcase-stitch: failed to parse ${planPath}: ${(e as Error).message}`);
  }

  const items: any[] = Array.isArray(plan?.items) ? plan.items : [];
  // Done clips, in plan order, whose output file exists.
  const clips = items
    .filter((it) => it && it.type === "clip" && it.status === "done" && typeof it.out === "string")
    .map((it) => it.out as string)
    .filter((p) => existsSync(p));

  if (clips.length === 0) {
    process.stdout.write(`showcase-stitch: no completed clips; nothing to stitch (no-op)\n`);
    process.exit(0);
  }

  ensureDir(`${A}/scenes/showcase`);

  let ok: boolean;
  let mode: string;
  if (clips.length === 1) {
    ok = copySingle(clips[0], out);
    mode = "single";
  } else {
    // Hard concat only — the shared-keyframe seams are frame-identical (see header note).
    ok = concatDemux(clips, out);
    mode = "concat";
  }
  if (!ok) die(`showcase-stitch: failed to stitch ${clips.length} clips into ${out}`);
  process.stderr.write(`[info] showcase-stitch: mode=${mode}\n`);

  const probe = ffprobe(out);
  if (!probe || !probe.hasVideo) die(`showcase-stitch: stitched output has no video stream at ${out}`);

  process.stdout.write(`showcase-stitch: stitched ${clips.length} clips -> ${out} (${probe.durationSec.toFixed(2)}s)\n`);
  process.exit(0);
}

main();
