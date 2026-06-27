#!/usr/bin/env bun
// door-swing.ts — DETERMINISTIC door geometry. Reads $A/showcase/door-obs.json (the handle side that the
// door-check vision node OBSERVED) and computes the swing in code, then rewrites the door clause in
// $A/showcase/grid-spec.json's flythrough_prompt. The model only reported which side the handle is on; the
// error-prone "opposite" geometry is done here as arithmetic, not model judgment.
//
// PHYSICS (fixed): a door hinges on the OPPOSITE edge from its handle, and it swings open TOWARD its hinge
// side (the leaf folds back to the hinge; the handle edge is what travels). So:
//   handle RIGHT  ⇒ hinge LEFT  ⇒ swings open to the LEFT
//   handle LEFT   ⇒ hinge RIGHT ⇒ swings open to the RIGHT
// (This is exactly the case the vision model kept getting backwards.)
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeJSON, die } from "./lib/util.ts";

function main(): void {
  const A = artifactsDir();
  const obsPath = `${A}/showcase/door-obs.json`;
  const specPath = `${A}/showcase/grid-spec.json`;

  if (!existsSync(specPath)) die(`door-swing: grid-spec.json not found at ${specPath}`);
  if (!existsSync(obsPath)) {
    process.stdout.write(`door-swing: no door-obs.json — door-check reported no hinged door; no change\n`);
    process.exit(0);
  }

  let obs: any, spec: any;
  try { obs = JSON.parse(readFileSync(obsPath, "utf8")); } catch (e) { die(`door-swing: bad door-obs.json: ${(e as Error).message}`); }
  try { spec = JSON.parse(readFileSync(specPath, "utf8")); } catch (e) { die(`door-swing: bad grid-spec.json: ${(e as Error).message}`); }

  const hinged = String(obs?.hinged_door ?? "").toLowerCase();
  const handle = String(obs?.handle_side ?? "").toLowerCase();

  if (hinged !== "yes") {
    process.stdout.write(`door-swing: hinged_door="${hinged}" — no hinged door to fix; no change\n`);
    process.exit(0);
  }
  if (handle !== "left" && handle !== "right") {
    process.stdout.write(`door-swing: handle_side="${handle}" (unclear) — leaving the door clause as the Director wrote it\n`);
    process.exit(0);
  }

  // The deterministic geometry the model kept getting wrong:
  const hinge = handle === "right" ? "left" : "right";
  const swing = hinge; // swings toward the hinge side

  const prompt: string = String(spec?.flythrough_prompt ?? "");
  if (!prompt) die(`door-swing: grid-spec.json has no flythrough_prompt`);

  // Replace the existing door clause's swing wording with the computed swing. We target the sentence/clause that
  // mentions the door swinging/opening and normalize it to the correct single-door swing, keeping it tight.
  const newClause = `the single door, hinged on the ${hinge}, swings open to the ${swing} as the camera fov passes through`;

  // Find a door clause: from "the ... door" up to "passes through" (greedy within one sentence), else a looser
  // door-swing phrase. Replace it; if nothing matches, prepend a corrected clause before the first comma.
  let updated = prompt;
  const patterns: RegExp[] = [
    /the\s+[^.,;]*\bdoor\b[^.;]*?\bpasses through\b/i,            // "...door ... passes through"
    /the\s+[^.,;]*\bdoor\b[^.;]*?\bswings? open[^.;]*/i,          // "...door ... swings open ..."
    /the\s+[^.,;]*\bpivot door\b[^.;]*/i,                          // "...pivot door ..."
  ];
  let replaced = false;
  for (const re of patterns) {
    if (re.test(updated)) { updated = updated.replace(re, newClause); replaced = true; break; }
  }
  if (!replaced) {
    process.stdout.write(`door-swing: could not locate the door clause to rewrite; leaving prompt unchanged (handle=${handle} ⇒ should swing ${swing})\n`);
    process.exit(0);
  }

  spec.flythrough_prompt = updated;
  writeJSON(specPath, spec);
  process.stdout.write(`door-swing: handle ${handle} ⇒ hinge ${hinge} ⇒ swings open to the ${swing}. Door clause rewritten.\n`);
  process.exit(0);
}

main();
