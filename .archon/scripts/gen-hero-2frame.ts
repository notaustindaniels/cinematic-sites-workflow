#!/usr/bin/env bun
// gen-hero-2frame.ts — the HERO render via START + END frames (cinematic-hero, 2-panel method).
// Unlike the showcase's single composited grid (gen-flythrough.ts), the hero is a simple A→B arrival, so it feeds
// Seedance panel 1 as the --start-image and panel 2 as the --end-image and lets it interpolate the journey under
// the lesson-laden flythrough_prompt (door swing set by door-swing, zero-remnants panels, the path). With an
// unambiguous start frame, an unambiguous end frame, and explicit in-between instructions, Seedance locks onto
// BOTH frames exactly and lands softer than the grid — the approach that hallucinated early on now renders clean
// precisely because the panels carry every lesson.
//
// Reads $A/showcase/grid-spec.json (flythrough_prompt + duration + the 2 panels) and the two panel images at
// $A/scenes/showcase-grid/<id>.png; writes $A/scenes/showcase/showcase-video.mp4 (the same path the showcase-gate
// and report expect). Same hard guards as gen-flythrough/gen-hero: no timestamp/per-second beats, balanced
// Director emphasis passed through (stripped only if malformed).
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, sectionPaths, writeText, ensureDirFor, die, isDryRun } from "./lib/util.ts";
import { hfVideo } from "./hf-video.ts";

interface Panel { id: string }
interface GridSpec { flythrough_prompt?: string; duration?: number; panels?: Panel[] }

function clampDuration(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.max(4, Math.min(15, n)); // Seedance range 4–15; the hero defaults short (~5s)
}

/** Balanced Director emphasis → pass through unchanged. Odd/malformed backtick count → strip so Seedance isn't
 *  confused by a dangling marker. (Matches gen-flythrough's pass-through behaviour for a balanced prompt.) */
function safeEmphasis(text: string): string {
  const ticks = (text.match(/`/g) || []).length;
  return ticks > 0 && ticks % 2 !== 0 ? text.replace(/`/g, "") : text;
}

/** Guard — NO timestamp / per-second beats ("0-2s", "over 5 seconds", "t="): they make Seedance stage to a clock. */
function hasTimestamp(p: string): boolean {
  return /\b\d+\s*-\s*\d+\s*s\b/i.test(p)
    || /\b\d+\s*(s|sec|secs|second|seconds)\b/i.test(p)
    || /\bt\s*=/.test(p);
}

async function main(): Promise<void> {
  const A = artifactsDir();
  const { work, gridDir, videoOut } = sectionPaths(A);   // no marker (standalone) -> showcase paths; cinematic-site hero -> $A/hero + scenes/hero/hero-final.mp4
  const specPath = `${work}/grid-spec.json`;
  if (!existsSync(specPath)) die(`gen-hero-2frame: grid-spec.json not found at ${specPath}`);

  let spec: GridSpec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (e) {
    die(`gen-hero-2frame: failed to parse grid-spec.json: ${(e as Error).message}`);
  }

  const panels: Panel[] = Array.isArray(spec.panels) ? spec.panels : [];
  if (panels.length !== 2) {
    die(`gen-hero-2frame: the start+end hero needs EXACTLY 2 panels (got ${panels.length}) — panel 1 = the start frame, panel 2 = the end frame. The Director must design a 2-panel [start, end] journey for the hero.`);
  }

  let prompt = String(spec.flythrough_prompt ?? "").trim();
  if (!prompt) die(`gen-hero-2frame: grid-spec.json has no flythrough_prompt`);
  if (hasTimestamp(prompt)) {
    die(`gen-hero-2frame: flythrough_prompt contains a duration/timestamp — remove it (duration is the --duration parameter ONLY).\nPrompt: ${prompt}`);
  }
  prompt = safeEmphasis(prompt);

  // The panels are the same images compose-grid/door-check use: $A/scenes/<section>-grid/<id>.png.
  const startImage = `${gridDir}/${panels[0].id}.png`;
  const endImage = `${gridDir}/${panels[1].id}.png`;
  if (!existsSync(startImage)) die(`gen-hero-2frame: START panel image not found at ${startImage} (run panel-gen first)`);
  if (!existsSync(endImage)) die(`gen-hero-2frame: END panel image not found at ${endImage} (run panel-gen first)`);

  const duration = clampDuration(spec.duration);
  const promptFile = `${work}/flythrough.prompt.txt`;
  writeText(promptFile, prompt);

  const out = videoOut;
  ensureDirFor(out);

  process.stderr.write(`[info] gen-hero-2frame: Seedance start(${panels[0].id}) + end(${panels[1].id}) -> ${out} (duration=${duration}s, dry=${isDryRun()})\n`);

  // START + END: panel 1 anchors the opening frame, panel 2 the closing frame; Seedance interpolates the journey
  // under the flythrough_prompt. No grid composite — for a single A→B arrival, two real frames beat one collage.
  await hfVideo({ promptFile, out, startImage, endImage, duration, aspect: "16:9", resolution: "720p" });

  process.stdout.write(`gen-hero-2frame: rendered ${out} (${duration}s) from start(${panels[0].id}) + end(${panels[1].id})\n`);
  process.exit(0);
}

main().catch((e) => die(`gen-hero-2frame: ${(e as Error).message}`));
