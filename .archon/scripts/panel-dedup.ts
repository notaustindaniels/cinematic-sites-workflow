#!/usr/bin/env bun
// panel-dedup.ts — DETERMINISTIC GUARD: no two panels in the grid sent to Seedance may be the same scene.
// Runs AFTER panel-gen, BEFORE compose-grid. Compares every pair of generated panels; if two are byte-identical
// (md5) or perceptually near-identical (downscaled-grayscale RMSE below a threshold), it REGENERATES the later
// panel from its own pre-written prompt — WITHOUT the style-anchor reference image (passing the duplicate as
// --image is the likely cause: Flux/Higgsfield can echo a strong reference back). Loops until the grid is all
// distinct or it runs out of attempts, in which case it dies so the grid-gate catches it. Section-aware via the
// $A/.cine-section marker (hero|showcase) — works for both the hero and showcase grids.
//
// Why this exists: a real run produced showcase p1.png == p2.png (identical bytes) even though the Director's
// panel specs and prompts were distinct — generation silently duplicated, and nothing downstream noticed. This
// enforces the "no duplicate scenes in the grid" rule mechanically.
import { existsSync, readFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { artifactsDir, sectionPaths, run, magickBin, die } from "./lib/util.ts";
import { hfImage } from "./hf-image.ts";

interface Panel { id: string }
interface GridSpec { panels?: Panel[] }

const NEAR_RMSE = 0.06;       // downscaled-grayscale RMSE below this = "same scene" (distinct rooms are >0.1)
const MAX_ATTEMPTS = 3;       // regenerate a duplicate up to this many times before giving up

function md5(file: string): string {
  return createHash("md5").update(readFileSync(file)).digest("hex");
}

/** Perceptual closeness of two images: downscale both to 32x18 grayscale and take the normalized RMSE.
 *  ~0 = identical/near-identical; distinct scenes are well above NEAR_RMSE. Returns 1 (max distance) on failure
 *  so a comparison error never falsely flags a duplicate. */
function perceptualRmse(magick: string, a: string, b: string): number {
  const r = run(magick, ["compare", "-metric", "RMSE", "-resize", "32x18!", "-colorspace", "Gray", a, b, "null:"],
    { timeoutMs: 30000 });
  const m = (r.stderr + r.stdout).match(/\(([0-9.eE+-]+)\)/);
  const v = m ? Number(m[1]) : NaN;
  return Number.isFinite(v) ? v : 1;
}

async function regenerate(promptFile: string, out: string): Promise<void> {
  // Regenerate from the panel's OWN prompt with NO reference image (the anchor is the likely duplication cause).
  await hfImage({ promptFile, out, aspect: "16:9", resolution: "2k" });
}

async function main(): Promise<void> {
  const A = artifactsDir();
  const { section, work, gridDir } = sectionPaths(A);
  const specPath = `${work}/grid-spec.json`;
  if (!existsSync(specPath)) die(`panel-dedup: grid-spec.json not found at ${specPath}`);

  let spec: GridSpec;
  try { spec = JSON.parse(readFileSync(specPath, "utf8")); }
  catch (e) { die(`panel-dedup: failed to parse grid-spec.json: ${(e as Error).message}`); }

  const panels: Panel[] = Array.isArray(spec.panels) ? spec.panels : [];
  if (panels.length < 2) { process.stdout.write(`panel-dedup: ${panels.length} panel(s) — nothing to compare\n`); process.exit(0); }

  const magick = magickBin();
  if (!magick) die(`panel-dedup: ImageMagick (magick/convert) not found`);

  const imgOf = (id: string) => `${gridDir}/${id}.png`;
  const promptOf = (id: string) => `${work}/${id}.prompt.txt`;
  for (const p of panels) if (!existsSync(imgOf(p.id))) die(`panel-dedup: panel image missing: ${imgOf(p.id)}`);

  let fixed = 0;
  // Walk pairs (i<j). If panel j duplicates an EARLIER panel i, regenerate j (it's the later one). Re-check j
  // against ALL earlier panels after each regen.
  for (let j = 1; j < panels.length; j++) {
    const bj = panels[j];
    if (!existsSync(promptOf(bj.id))) {
      process.stderr.write(`[warn] panel-dedup: no prompt file for ${bj.id}; cannot regenerate if duplicate\n`);
    }
    let attempt = 0;
    // returns the id of an earlier panel this one duplicates, or null
    const dupOf = (): string | null => {
      const hj = md5(imgOf(bj.id));
      for (let i = 0; i < j; i++) {
        const bi = panels[i];
        if (md5(imgOf(bi.id)) === hj) return bi.id;                                   // exact (the observed bug)
        if (perceptualRmse(magick, imgOf(bi.id), imgOf(bj.id)) < NEAR_RMSE) return bi.id; // near-identical
      }
      return null;
    };
    let dup = dupOf();
    while (dup && attempt < MAX_ATTEMPTS) {
      attempt++;
      process.stderr.write(`[info] panel-dedup: panel ${bj.id} is the same scene as ${dup} — regenerating ${bj.id} (attempt ${attempt}/${MAX_ATTEMPTS}, no anchor)\n`);
      if (!existsSync(promptOf(bj.id))) break;
      await regenerate(promptOf(bj.id), imgOf(bj.id));
      dup = dupOf();
    }
    if (dup) die(`panel-dedup: panel ${bj.id} still duplicates ${dup} after ${MAX_ATTEMPTS} regenerations — the Director's prompts for these two panels are too similar; restructure the grid (distinct scenes).`);
    if (attempt > 0) fixed++;
  }

  process.stdout.write(`panel-dedup: [${section}] ${panels.length} panels, all distinct${fixed ? ` (regenerated ${fixed} duplicate${fixed > 1 ? "s" : ""})` : ""}\n`);
  process.exit(0);
}

main().catch((e) => die(`panel-dedup: ${(e as Error).message}`));
