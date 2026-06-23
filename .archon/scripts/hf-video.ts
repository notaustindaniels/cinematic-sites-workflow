#!/usr/bin/env bun
// hf-video.ts — pinned Seedance 2.0 Fast (seedance_2_0 --mode fast) video generation.
// Exports hfVideo() and provides a CLI guarded by import.meta.main.
import { existsSync, readFileSync } from "node:fs";
import {
  run, isDryRun, die, parseHiggsfieldUrl, curlDownload, ffprobe,
  synthVideo, fakeCloudfrontUrl, ensureDirFor,
} from "./lib/util.ts";

export interface HfVideoOpts {
  promptFile?: string;
  prompt?: string;
  out: string;
  startImage: string;
  endImage?: string;
  duration?: number; // default 8
  aspect?: string; // default 16:9
  resolution?: string; // default 720p (fast-mode reality)
}

function resolvePrompt(o: { promptFile?: string; prompt?: string }): string {
  if (o.promptFile) {
    if (!existsSync(o.promptFile)) die(`prompt-file not found: ${o.promptFile}`);
    return readFileSync(o.promptFile, "utf8").trim();
  }
  if (o.prompt != null) return o.prompt;
  die("hf-video: need --prompt or --prompt-file");
}

/**
 * Generate a video with Seedance 2.0 Fast. Returns the result URL (or a fake
 * cloudfront URL in dry-run). Downloads the asset to `out` and verifies it.
 */
export function hfVideo(opts: HfVideoOpts): string {
  const aspect = opts.aspect || "16:9";
  const resolution = opts.resolution || "720p";
  const duration = opts.duration && opts.duration >= 4 ? Math.round(opts.duration) : 8;
  const out = opts.out;
  if (!out) die("hf-video: --out is required");
  ensureDirFor(out);
  const prompt = resolvePrompt(opts);
  const startImage = opts.startImage;
  if (!startImage) die("hf-video: --start-image is required");

  // ---- DRY RUN: synthesize a black placeholder clip, no CLI, no credits. ----
  if (isDryRun()) {
    if (!synthVideo(out, duration, 1280, 720)) die(`dry-run: failed to synthesize placeholder video at ${out}`);
    const url = fakeCloudfrontUrl(out, "mp4");
    process.stdout.write(url + "\n");
    return url;
  }

  if (!existsSync(startImage)) die(`hf-video: start-image not found: ${startImage}`);
  if (opts.endImage && !existsSync(opts.endImage)) die(`hf-video: end-image not found: ${opts.endImage}`);

  // ---- REAL: build the pinned higgsfield command. ----
  const args = [
    "generate", "create", "seedance_2_0",
    "--mode", "fast",
    "--prompt", prompt,
    "--start-image", startImage,
  ];
  if (opts.endImage) args.push("--end-image", opts.endImage);
  args.push(
    "--duration", String(duration),
    "--aspect_ratio", aspect,
    "--resolution", resolution,
    "--generate_audio", "false",
    "--json", "--wait", "--wait-timeout", "20m", "--wait-interval", "5s",
  );

  const r = run("higgsfield", args, { timeoutMs: 1300000 });
  const url = parseHiggsfieldUrl(r.stdout) || parseHiggsfieldUrl(r.stderr);
  // Runtime/network failures THROW (not die/exit) so multi-variant callers like
  // gen-hero-video can catch one bad variant and still ship the good ones. The
  // CLI entry below catches and exits 1, preserving subprocess semantics.
  if (!url) {
    throw new Error(`hf-video: could not parse result_url from higgsfield output (exit ${r.code}).\n--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}`);
  }
  if (!curlDownload(url, out)) throw new Error(`hf-video: failed to download ${url} -> ${out}`);

  // Verify duration (±1s) and a video stream exist.
  const probe = ffprobe(out);
  if (!probe || !probe.hasVideo) throw new Error(`hf-video: result has no video stream at ${out}`);
  if (Math.abs(probe.durationSec - duration) > 1.5) {
    process.stderr.write(`[warn] hf-video: duration ${probe.durationSec.toFixed(2)}s differs from requested ${duration}s at ${out}\n`);
  }
  process.stdout.write(url + "\n");
  return url;
}

// ───────────────────────── CLI ─────────────────────────
function parseArgs(argv: string[]): HfVideoOpts {
  const o: HfVideoOpts = { out: "", startImage: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--prompt-file": o.promptFile = next(); break;
      case "--prompt": o.prompt = next(); break;
      case "--out": o.out = next(); break;
      case "--start-image": o.startImage = next(); break;
      case "--end-image": o.endImage = next(); break;
      case "--duration": o.duration = parseInt(next(), 10); break;
      case "--aspect": o.aspect = next(); break;
      case "--resolution": o.resolution = next(); break;
      default:
        process.stderr.write(`[warn] hf-video: ignoring unknown arg ${a}\n`);
    }
  }
  return o;
}

if (import.meta.main) {
  const opts = parseArgs(process.argv.slice(2));
  try {
    hfVideo(opts);
  } catch (e) {
    process.stderr.write(`[ERROR] ${(e as Error).message}\n`);
    process.exit(1);
  }
  process.exit(0);
}
