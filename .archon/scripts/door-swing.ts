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
import { artifactsDir, sectionPaths, writeJSON, die } from "./lib/util.ts";

function main(): void {
  const A = artifactsDir();
  const { work } = sectionPaths(A);   // hero -> $A/hero; default showcase
  const obsPath = `${work}/door-obs.json`;
  const specPath = `${work}/grid-spec.json`;

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

  // PREFERRED — SURGICAL, emphasis-preserving. The Director already wrote the door with a hinge/swing direction
  // and wrapped its phrases in backticks (phrase-level emphasis). We only CORRECT the direction words in place
  // from the observed handle, leaving the Director's wording + backtick spans intact. (Replacing the whole clause
  // would clobber the emphasis and risk orphaning an adjacent backtick.)
  let updated = prompt;
  let fixed = false;
  updated = updated.replace(/(swings?\s+open\s+to\s+the\s+)(left|right)/i, (_m, pre) => { fixed = true; return pre + swing; });
  updated = updated.replace(/(hinged\s+on\s+the\s+)(left|right)/i, (_m, pre) => { fixed = true; return pre + hinge; });
  if (fixed) {
    spec.flythrough_prompt = updated;
    writeJSON(specPath, spec);
    process.stdout.write(`door-swing: handle ${handle} ⇒ hinge ${hinge}, swing ${swing}. Corrected the door direction in place (emphasis preserved).\n`);
    process.exit(0);
  }

  // FALLBACK — the Director wrote no explicit door direction. Operate on a backtick-STRIPPED copy (so the clause
  // replace can't orphan an adjacent span), insert a plain direction-correct clause, and leave the prompt plain —
  // gen-flythrough's regex fallback then re-applies emphasis to the whole thing.
  const plain = prompt.replace(/`/g, "");
  const newClause = `the single door, hinged on the ${hinge}, swings open to the ${swing} as the camera fov passes through`;
  let updated2 = plain;
  const patterns: RegExp[] = [
    /the\s+[^.,;]*\bdoor\b[^.;]*?\bpasses through\b/i,            // "...door ... passes through"
    /the\s+[^.,;]*\bdoor\b[^.;]*?\bswings? open[^.;]*/i,          // "...door ... swings open ..."
    /the\s+[^.,;]*\bpivot door\b[^.;]*/i,                          // "...pivot door ..."
  ];
  let replaced = false;
  for (const re of patterns) {
    if (re.test(updated2)) { updated2 = updated2.replace(re, newClause); replaced = true; break; }
  }
  if (!replaced) {
    process.stdout.write(`door-swing: no explicit door direction and no door clause matched; leaving prompt unchanged (handle=${handle} ⇒ should swing ${swing})\n`);
    process.exit(0);
  }

  spec.flythrough_prompt = updated2;
  writeJSON(specPath, spec);
  process.stdout.write(`door-swing: handle ${handle} ⇒ hinge ${hinge} ⇒ swings open to the ${swing}. Door clause rewritten (plain; gen-flythrough re-emphasizes).\n`);
  process.exit(0);
}

main();
