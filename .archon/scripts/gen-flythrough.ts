#!/usr/bin/env bun
// gen-flythrough.ts — the ONE Seedance call (GRID method). Reads $A/showcase/grid-spec.json (flythrough_prompt
// + duration) and the composited $A/scenes/showcase-grid/grid.png; renders a single continuous flythrough to
// $A/scenes/showcase/showcase-video.mp4. No clips, no stitching — one image in, one video out.
//
// DISCIPLINE: the flythrough_prompt must NOT contain a duration/timestamp (the Director is instructed not to
// write one) — duration is passed ONLY as the --duration parameter. We assert it here as a guard.
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeText, ensureDirFor, die, isDryRun } from "./lib/util.ts";
import { hfVideo } from "./hf-video.ts";

interface GridSpec { flythrough_prompt?: string; duration?: number }

// ── Motion-PHRASE emphasis ────────────────────────────────────────────────────────────────────────────────
// Seedance attends to back-ticked words. We wrap the COMPLETE motion as ONE span — the verb together with the
// bare modifiers that DEFINE that motion (a result particle like "open"; a turn's "90 degrees left") — instead of
// spotlighting the lone verb and orphaning the words that say HOW it moves. So: `swings open`, `turns 90 degrees
// left` — NOT `swings` `open`, `turns` 90 degrees left. Prepositional paths ("up the flagstone path", "out onto
// the deck", "to the left") are left OUT of the span: they say WHERE, not how, so the verb stays the focus there.
// Applied at render time from the clean spec; we first strip any stray backticks so it's fully idempotent. To try
// a different marker (a wrapping pair), change EMPH here.
const EMPH = "`"; // backtick / grave accent

// Single motion/actuation verbs — the fallback when there's no defining modifier to absorb (e.g. "glides", "parts").
const MOTION_VERBS = [
  "glide", "glides", "gliding", "move", "moves", "moving", "push", "pushes", "pushing",
  "rise", "rises", "rising", "descend", "descends", "descending", "sweep", "sweeps", "sweeping",
  "pass", "passes", "passing", "continue", "continues", "continuing", "drift", "drifts", "drifting",
  "advance", "advances", "advancing", "climb", "climbs", "climbing",
  "sink", "sinks", "sinking", "enter", "enters", "entering", "exit", "exits", "exiting",
  "approach", "approaches", "approaching", "swing", "swings", "swinging", "open", "opens", "opening",
  "part", "parts", "parting", "slide", "slides", "sliding", "fold", "folds", "folding",
  "retract", "retracts", "retracting", "lift", "lifts", "lifting",
  "emerge", "emerges", "emerging",
  // NOTE: deliberately excluded — float/floats/floating ("floating stair/shelf") and roll/rolls/rolling
  // ("rolling hills") are far more common as architecture/landscape adjectives here than as camera verbs, and
  // neither is a motion the Director uses; "bank" is excluded too (it's a forbidden rig word, over-rotates).
];
// Turn-class verbs absorb an optional "<n> degrees" and an optional bare direction — the magnitude/heading that
// makes a turn correct (bank/rotate/pivot/crane/arc share the same "how far / which way" need).
const TURN_VERBS = [
  "turn", "turns", "turning", "bank", "banks", "banking", "rotate", "rotates", "rotating",
  "pivot", "pivots", "pivoting", "crane", "cranes", "craning", "arc", "arcs", "arcing",
];
// Result/aspect particles that complete a verb's motion ("swings open", "slides shut", "folds back").
const RESULT_PARTICLES = ["open", "shut", "closed", "wide", "apart", "back", "aside", "upright", "flush"];

const _V = [...MOTION_VERBS, ...TURN_VERBS].join("|"); // turn verbs share the same phrase shape; union them
const _RP = RESULT_PARTICLES.join("|");
const _DIR = "left|right|around|clockwise|counterclockwise|upward|downward";
// ONE motion phrase = verb + (optional result particle) + (optional "<n> degrees") + (optional direction, stated
// either bare "left" or as a short prepositional "to the left"). The optional tail absorbs the words that DEFINE
// the motion — its result, magnitude, and heading — so we get `swings open to the left` and `turns 90 degrees
// left` as single spans. A direction IS part of the motion and is absorbed (incl. the "to the left/right" form);
// a longer prepositional PATH that ends in a place ("up the flagstone path", "out onto the deck") says WHERE, not
// how, so it stays OUTSIDE the span — note bare "up"/"down"/"out" are deliberately NOT directions here, only
// "upward"/"downward", so "up the flagstone path" is never absorbed. The trailing \b prevents prefix matches (so
// "arc" never bites "archway", and the full inflection "glides"/"turns" wins over "glide"/"turn").
const MOTION_RE = new RegExp(
  `\\b(?:${_V})` +
  `(?:\\s+(?:${_RP}))?` +                                          // result particle: "open", "shut", "wide"…
  `(?:\\s+\\d+\\s+degrees?)?` +                                    // magnitude: "90 degrees"
  `(?:\\s+(?:(?:to|toward|towards)\\s+the\\s+)?(?:${_DIR}))?` +    // direction: "left" or "to the left"
  `(?:\\s+straight(?:\\s+ahead|\\s+forward)?|\\s+(?:forward|onward|ahead))?` + // straight-line commit: "straight ahead"
  `\\b`,
  "gi",
);

/** Wrap each complete motion phrase in EMPH. Strips existing backticks first (idempotent). Returns the decorated
 *  prompt + the phrases hit (for logging). */
function emphasizeMotion(text: string): { out: string; hits: string[] } {
  const clean = text.replace(/`/g, ""); // normalize so re-applying never double-wraps
  const hits: string[] = [];
  const out = clean.replace(MOTION_RE, (m) => { const s = m.trim(); hits.push(s); return EMPH + s + EMPH; });
  return { out, hits };
}

function clampDuration(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 15;
  return Math.max(4, Math.min(15, n)); // Seedance range 4–15
}

async function main(): Promise<void> {
  const A = artifactsDir();
  const specPath = `${A}/showcase/grid-spec.json`;
  if (!existsSync(specPath)) die(`gen-flythrough: grid-spec.json not found at ${specPath}`);

  let spec: GridSpec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (e) {
    die(`gen-flythrough: failed to parse grid-spec.json: ${(e as Error).message}`);
  }

  const prompt = String(spec.flythrough_prompt ?? "").trim();
  if (!prompt) die(`gen-flythrough: grid-spec.json has no flythrough_prompt`);

  // Guard: the prompt must not encode a duration/timestamp (causes Seedance to stage to a literal clock).
  if (/\b\d+\s*(s|sec|secs|second|seconds)\b/i.test(prompt) || /\bt\s*=/.test(prompt) || /\b\d+\s*-\s*\d+\s*s\b/i.test(prompt)) {
    die(`gen-flythrough: flythrough_prompt appears to contain a duration/timestamp — remove it; duration is the --duration parameter only.\nPrompt: ${prompt}`);
  }

  const duration = clampDuration(spec.duration);
  const grid = `${A}/scenes/showcase-grid/grid.png`;
  if (!existsSync(grid)) die(`gen-flythrough: composited grid not found at ${grid} (run compose-grid first)`);

  // Emphasize motion verbs (backticks) so Seedance respects the intended motion (e.g. the door swings, not slides).
  const { out: emphasizedPrompt, hits } = emphasizeMotion(prompt);
  process.stderr.write(`[info] gen-flythrough: emphasized ${hits.length} motion verb(s): ${hits.join(", ") || "(none matched)"}\n`);

  const promptFile = `${A}/showcase/flythrough.prompt.txt`;
  writeText(promptFile, emphasizedPrompt);

  const out = `${A}/scenes/showcase/showcase-video.mp4`;
  ensureDirFor(out);

  process.stderr.write(`[info] gen-flythrough: one Seedance call from grid -> ${out} (duration=${duration}s, dry=${isDryRun()})\n`);

  // ONE Seedance call: the grid is the only --start-image, no --end-image. hfVideo honors HF_DRY_RUN.
  await hfVideo({
    promptFile,
    out,
    startImage: grid,
    duration,
    aspect: "16:9",
    resolution: "720p",
  });

  process.stdout.write(`gen-flythrough: rendered ${out} (${duration}s) from the storyboard grid\n`);
  process.exit(0);
}

main().catch((e) => die(`gen-flythrough: ${(e as Error).message}`));
