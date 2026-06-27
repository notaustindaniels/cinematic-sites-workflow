#!/usr/bin/env bun
// plan-flatten.ts — flatten the rich plan.json into ordered work-item lists.
// Reads $A/plan.json; writes $A/showcase/plan.json and $A/beforeafter/plan.json,
// each shaped {"items":[...]} with status:"pending". Empty/disabled -> {"items":[]}.
//
// SHOWCASE MODEL — 2 keyframes per scene (REBUILD-PLAN §1), NOT the skill's 3-phase
// wide/setting/motion triplet. N scenes ⇒ N+1 keyframes + N clips:
//
//   kf0 ──clip1──► kf1 ──clip2──► kf2 ──clip3──► kf3      (example: 3 scenes)
//  (fresh)        (edit of kf0)  (edit of kf1)  (edit of kf2)
//
//   • kf0 is the ONLY fresh Flux.2 Pro generation (refs []). Every later kf is an Flux.2 Pro
//     EDIT of the one before it (refs [kf(k-1)]) — same world, for free.
//   • Scene k's clip animates kf(k-1) → kf(k): hf-video --start-image kf(k-1) --end-image kf(k).
//   • Scene k's END frame (kf(k)) IS scene k+1's START frame — the SAME FILE path, reused
//     as clip(k).end AND clip(k+1).start. Never regenerated. That shared file is the seam.
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeJSON, die } from "./lib/util.ts";

interface ShowcaseItem {
  id: string;
  type: "keyframe" | "clip";
  prompt_role: "establish" | "reveal" | "clip";
  refs: string[];
  out: string;
  scene_label: string;
  // keyframe fields
  depicts?: string;        // the composition this frame should show
  evolves_from?: string;   // what refs[0] currently shows (edits only)
  // clip fields
  camera?: string;         // the director's intended camera move & feel
  from_state?: string;     // start keyframe content
  to_state?: string;       // end keyframe content
  duration?: number;       // clip seconds (>=4)
  // shared
  seeds_next: string;      // what must stay visible that the NEXT scene moves into
  lighting: string;        // optional global mood, "" if unset
  context_notes: string;
  status: "pending";
}

interface BeforeAfterItem {
  id: string;
  caption: string;
  after_prompt: string;
  after_out: string;
  before_out: string;
  status: "pending";
}

function enabled(v: unknown): boolean {
  return v === true || v === "true";
}

/** Seedance floor is 4s (integer). Default 5; clamp to [4,12]. */
function clampDuration(v: unknown): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 5;
  return Math.max(4, Math.min(12, n));
}

function flattenShowcase(A: string, plan: any): ShowcaseItem[] {
  const items: ShowcaseItem[] = [];
  const showcase = plan?.showcase;
  if (!enabled(plan?.showcase_enabled) && !enabled(showcase?.enabled)) return items;

  const scenes: any[] = Array.isArray(showcase?.scenes) ? showcase.scenes : [];
  const N = scenes.length;
  if (N === 0) return items;

  const lighting = String(showcase?.lighting ?? "").trim();
  const dir = `${A}/scenes/showcase`;
  const kfOut = (k: number) => `${dir}/kf${k}.png`;

  // Content per keyframe. kf0 = scene 1's start_state (the fresh establishing frame);
  // kf(k) = scene k's end_state. Because scene k's clip ends on kf(k) and scene k+1's
  // clip starts on kf(k), scene k+1's "start_state" IS kf(k) — we do NOT generate a
  // separate frame for it. end_state is the canonical text for every kf>=1.
  const kfContent: string[] = [];
  kfContent[0] = String(scenes[0]?.start_state ?? scenes[0]?.label ?? "Establishing wide shot").trim();
  for (let k = 1; k <= N; k++) {
    kfContent[k] = String(scenes[k - 1]?.end_state ?? `End state of scene ${k}`).trim();
  }

  // ── Keyframes kf0..kfN (generated strictly in order; each kf>=1 edits the prior) ──
  for (let k = 0; k <= N; k++) {
    const first = k === 0;
    const refs = first ? [] : [kfOut(k - 1)];
    // seeds_next on kf(k>=1) is what scene k's end_state keeps visible for scene k+1.
    const seeds = first ? "" : String(scenes[k - 1]?.seeds_next ?? "").trim();
    // kf0 belongs to scene 1; kf(k>=1) is the END of scene k.
    const label = first
      ? String(scenes[0]?.label ?? "Scene 1")
      : String(scenes[k - 1]?.label ?? `Scene ${k}`);
    const evolvesFrom = first ? "" : kfContent[k - 1];
    const depicts = kfContent[k];

    const notes = first
      ? `Establishing frame of the showcase — the single fresh Flux.2 Pro generation (no reference image). Compose: ${depicts}.${lighting ? ` Lighting (global mood for the whole showcase): ${lighting}.` : ""}`
      : `EDIT of the previous keyframe (refs[0]), which shows: ${evolvesFrom}. Evolve it so it now shows: ${depicts}. THE HARD RULE: everything new here must already be visible or clearly implied in the reference (through the doorway, window, opening, or in the distance) — REVEAL it, never invent a space that was not on screen. Keep the same world, building, materials, architecture, sky and light as the reference${lighting ? ` (global mood stays: ${lighting})` : ""}; do not re-specify a different time of day.${seeds ? ` Keep visible, for the NEXT scene to move into: ${seeds}.` : ""}`;

    items.push({
      id: `kf${k}`,
      type: "keyframe",
      prompt_role: first ? "establish" : "reveal",
      refs,
      out: kfOut(k),
      scene_label: label,
      depicts,
      evolves_from: evolvesFrom,
      seeds_next: seeds,
      lighting,
      context_notes: notes,
      status: "pending",
    });
  }

  // ── Clips clip1..clipN (after all keyframes). clip k = kf(k-1) → kf(k), from scene[k-1] ──
  for (let k = 1; k <= N; k++) {
    const scene = scenes[k - 1];
    const camera = String(scene?.camera ?? "Slow continuous push forward through the space.").trim();
    const label = String(scene?.label ?? `Scene ${k}`);
    const dur = clampDuration(scene?.duration);
    items.push({
      id: `clip${k}`,
      type: "clip",
      prompt_role: "clip",
      refs: [kfOut(k - 1), kfOut(k)],
      out: `${dir}/clip${k}.mp4`,
      scene_label: label,
      camera,
      from_state: kfContent[k - 1],
      to_state: kfContent[k],
      duration: dur,
      seeds_next: String(scene?.seeds_next ?? "").trim(),
      lighting,
      context_notes: `Seedance clip for "${label}": animate from the START keyframe (refs[0], showing: ${kfContent[k - 1]}) to the END keyframe (refs[1], showing: ${kfContent[k]}). Director's camera intent & feel: ${camera}. ALWAYS pass BOTH --start-image and --end-image so Seedance only interpolates between two known frames (that is where it does NOT hallucinate).`,
      status: "pending",
    });
  }

  return items;
}

function flattenBeforeAfter(A: string, plan: any): BeforeAfterItem[] {
  const items: BeforeAfterItem[] = [];
  const ba = plan?.before_after;
  if (!enabled(plan?.before_after_enabled) && !enabled(ba?.enabled)) return items;

  const pairs: any[] = Array.isArray(ba?.pairs) ? ba.pairs : [];
  const dir = `${A}/scenes/beforeafter`;
  pairs.forEach((pair, pi) => {
    const n = pi + 1;
    items.push({
      id: `pair-${n}`,
      caption: String(pair?.caption ?? `Before / after ${n}`),
      after_prompt: String(pair?.after_prompt ?? ""),
      after_out: `${dir}/pair-${n}-after.png`,
      before_out: `${dir}/pair-${n}-before.png`,
      status: "pending",
    });
  });
  return items;
}

function main(): void {
  const A = artifactsDir();
  const planPath = `${A}/plan.json`;
  if (!existsSync(planPath)) die(`plan-flatten: plan.json not found at ${planPath}`);

  let plan: any;
  try {
    plan = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (e) {
    die(`plan-flatten: failed to parse plan.json: ${(e as Error).message}`);
  }

  const showcaseItems = flattenShowcase(A, plan);
  const beforeAfterItems = flattenBeforeAfter(A, plan);

  writeJSON(`${A}/showcase/plan.json`, { items: showcaseItems });
  writeJSON(`${A}/beforeafter/plan.json`, { items: beforeAfterItems });

  const kf = showcaseItems.filter((i) => i.type === "keyframe").length;
  const clips = showcaseItems.filter((i) => i.type === "clip").length;
  process.stdout.write(
    `plan-flatten: showcase=${showcaseItems.length} items (${kf} keyframes + ${clips} clips), beforeafter=${beforeAfterItems.length} items\n`,
  );
  process.exit(0);
}

main();
