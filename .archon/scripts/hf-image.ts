#!/usr/bin/env bun
// hf-image.ts — pinned Nano Banana Pro (nano_banana_2) image generation.
// Exports hfImage() and provides a CLI guarded by import.meta.main.
import { existsSync, readFileSync } from "node:fs";
import {
  run, isDryRun, die, parseHiggsfieldUrl, curlDownload, imageMaxDim,
  synthImage, fakeCloudfrontUrl, ensureDirFor,
} from "./lib/util.ts";

export interface HfImageOpts {
  promptFile?: string;
  prompt?: string;
  out: string;
  images?: string[]; // reference images (repeatable --image)
  aspect?: string; // default 16:9
  resolution?: string; // default 2k
}

function resolvePrompt(o: { promptFile?: string; prompt?: string }): string {
  if (o.promptFile) {
    if (!existsSync(o.promptFile)) die(`prompt-file not found: ${o.promptFile}`);
    return readFileSync(o.promptFile, "utf8").trim();
  }
  if (o.prompt != null) return o.prompt;
  die("hf-image: need --prompt or --prompt-file");
}

/**
 * Generate an image with Nano Banana Pro. Returns the result URL (or a fake
 * cloudfront URL in dry-run). Downloads the asset to `out` and verifies it.
 */
export function hfImage(opts: HfImageOpts): string {
  const aspect = opts.aspect || "16:9";
  const resolution = opts.resolution || "2k";
  const out = opts.out;
  if (!out) die("hf-image: --out is required");
  ensureDirFor(out);
  const prompt = resolvePrompt(opts);
  const images = (opts.images || []).filter(Boolean);

  // ---- DRY RUN: synthesize a gray placeholder, no CLI, no credits. ----
  if (isDryRun()) {
    if (!synthImage(out, 1920, 1080)) die(`dry-run: failed to synthesize placeholder image at ${out}`);
    const url = fakeCloudfrontUrl(out, "png");
    process.stdout.write(url + "\n");
    return url;
  }

  // ---- REAL: build the pinned higgsfield command. ----
  const args = [
    "generate", "create", "nano_banana_2",
    "--prompt", prompt,
    "--aspect_ratio", aspect,
    "--resolution", resolution,
  ];
  for (const ref of images) {
    if (!existsSync(ref)) die(`hf-image: reference image not found: ${ref}`);
    args.push("--image", ref);
  }
  args.push("--json", "--wait", "--wait-timeout", "8m", "--wait-interval", "5s");

  const r = run("higgsfield", args, { timeoutMs: 560000 });
  const url = parseHiggsfieldUrl(r.stdout) || parseHiggsfieldUrl(r.stderr);
  if (!url) {
    die(`hf-image: could not parse result_url from higgsfield output (exit ${r.code}).\n--- stdout ---\n${r.stdout}\n--- stderr ---\n${r.stderr}`);
  }
  if (!curlDownload(url, out)) die(`hf-image: failed to download ${url} -> ${out}`);

  // Verify it's a real image of reasonable size (>= 1280px on the long edge).
  const dim = imageMaxDim(out);
  if (dim > 0 && dim < 1280) {
    die(`hf-image: result image too small (${dim}px long edge, expected >=1280) at ${out}`);
  }
  process.stdout.write(url + "\n");
  return url;
}

// ───────────────────────── CLI ─────────────────────────
function parseArgs(argv: string[]): HfImageOpts {
  const o: HfImageOpts = { out: "", images: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--prompt-file": o.promptFile = next(); break;
      case "--prompt": o.prompt = next(); break;
      case "--out": o.out = next(); break;
      case "--image": (o.images ||= []).push(next()); break;
      case "--aspect": o.aspect = next(); break;
      case "--resolution": o.resolution = next(); break;
      default:
        process.stderr.write(`[warn] hf-image: ignoring unknown arg ${a}\n`);
    }
  }
  return o;
}

if (import.meta.main) {
  const opts = parseArgs(process.argv.slice(2));
  hfImage(opts);
  process.exit(0);
}
