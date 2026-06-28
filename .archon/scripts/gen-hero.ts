#!/usr/bin/env bun
// gen-hero.ts — the hero render (cinematic-hero, GRID method). Reads $A/hero/hero-spec.json (flythrough_prompt +
// duration) and the composited $A/scenes/hero/hero-grid.png (the 2 numbered panels in one image); renders ONE
// continuous ~5s hero video to $A/scenes/hero/hero-final.mp4 via Seedance. One image in, one short video out — no
// seams (same seam-free discipline as the showcase's gen-flythrough, scaled to 2 panels / ~5s).
//
// HARD GUARDS — the reason this rebuild exists. The flythrough_prompt must contain NO timestamp/per-second beats
// and NO list of negatives (both make Seedance hallucinate); we die BEFORE spending if either leaks in. The
// Director writes phrase-level emphasis; a balanced prompt passes through unchanged (strip backticks only if
// they are unbalanced/malformed, which would otherwise confuse Seedance).
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeText, ensureDir, die, isDryRun } from "./lib/util.ts";
import { hfVideo } from "./hf-video.ts";

interface HeroSpec { flythrough_prompt?: string; duration?: number }

function clampDuration(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.max(4, Math.min(15, n)); // Seedance range 4–15; the hero defaults short (~5s)
}

/** Guard 1 — NO timestamp / per-second beats ("0-2s", "2-5s", "over 5 seconds", "t="). */
function hasTimestamp(p: string): boolean {
  return /\b\d+\s*-\s*\d+\s*s\b/i.test(p)
    || /\b\d+\s*(s|sec|secs|second|seconds)\b/i.test(p)
    || /\bt\s*=/.test(p);
}

/** Guard 2 — NO list of negatives ("no morphing / no shake / does not loop / no new objects"). */
function hasNegativesList(p: string): boolean {
  const negs = (p.match(/\bno\s+[a-z][a-z-]+/gi) || []).length;
  return negs >= 2 || /\bdoes not loop\b/i.test(p) || /\bno (morph|warp|shake|jitter|flicker|new objects)/i.test(p);
}

/** Balanced Director-emphasis → pass through. Unbalanced (malformed) → strip backticks so Seedance isn't confused. */
function safeEmphasis(text: string): string {
  const ticks = (text.match(/`/g) || []).length;
  return ticks > 0 && ticks % 2 !== 0 ? text.replace(/`/g, "") : text;
}

async function main(): Promise<void> {
  const A = artifactsDir();
  const specPath = `${A}/hero/hero-spec.json`;
  if (!existsSync(specPath)) die(`gen-hero: hero-spec.json not found at ${specPath}`);

  let spec: HeroSpec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (e) {
    die(`gen-hero: failed to parse hero-spec.json: ${(e as Error).message}`);
  }

  let prompt = String(spec.flythrough_prompt ?? "").trim();
  if (!prompt) die(`gen-hero: hero-spec.json has no flythrough_prompt`);

  // HARD GUARDS — refuse to spend on a prompt that would hallucinate.
  if (hasTimestamp(prompt)) {
    die(`gen-hero: flythrough_prompt contains a timestamp/per-second beat — remove it (duration is the --duration parameter ONLY).\nPrompt: ${prompt}`);
  }
  if (hasNegativesList(prompt)) {
    die(`gen-hero: flythrough_prompt contains a list of negatives — remove them ALL (they bloat the prompt and don't help).\nPrompt: ${prompt}`);
  }

  prompt = safeEmphasis(prompt);
  const duration = clampDuration(spec.duration);
  const grid = `${A}/scenes/hero/hero-grid.png`;
  if (!existsSync(grid)) die(`gen-hero: composited grid not found at ${grid} (run hero-compose first)`);

  const out = `${A}/scenes/hero/hero-final.mp4`;
  ensureDir(`${A}/scenes/hero`);
  const promptFile = `${A}/hero/flythrough.prompt.txt`;
  writeText(promptFile, prompt);

  process.stderr.write(`[info] gen-hero: one Seedance call from the 2-panel grid -> ${out} (duration=${duration}s, dry=${isDryRun()})\n`);

  // ONE Seedance call: the numbered grid is the only --start-image, no --end-image (no dissimilar-frame
  // interpolation; the journey lives inside the grid). hfVideo honors HF_DRY_RUN.
  await hfVideo({ promptFile, out, startImage: grid, duration, aspect: "16:9", resolution: "720p" });

  process.stdout.write(`gen-hero: rendered ${out} (${duration}s) from the 2-panel hero grid\n`);
  process.exit(0);
}

main().catch((e) => die(`gen-hero: ${(e as Error).message}`));
