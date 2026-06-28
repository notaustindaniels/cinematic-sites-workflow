#!/usr/bin/env bun
// hero-compose.ts — composite the 2 generated hero panels into ONE numbered storyboard grid for Seedance.
// Reads $A/hero/hero-spec.json (panel order + grid) and the panels at $A/scenes/hero/<id>.png; writes
// $A/scenes/hero/hero-grid.png. Mirrors compose-grid.ts (showcase): number each panel top-left BEFORE montage,
// montage in reading order (= journey order 1→2), then resize/pad to EXACTLY 1920x1080 (a non-standard size
// silently fails the Seedance upload). The hero grid is 1×2 (two panels side by side: start | landing).
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, ensureDirFor, run, magickBin, ffprobe, die } from "./lib/util.ts";

interface Panel { id: string }
interface HeroSpec { panels?: Panel[]; grid?: { cols?: number; rows?: number } }

/** Stamp a 1-based panel number into the top-left of one panel (white on a dark badge); fall back to the
 *  un-numbered panel on any failure. Numbered BEFORE montage so the badge scales with the cell. */
function stampNumber(magick: string, src: string, dst: string, n: number): string {
  const dim = ffprobe(src);
  const h = dim && dim.height ? dim.height : 1080;
  const pt = Math.max(28, Math.round(h * 0.085));
  const margin = Math.max(10, Math.round(h * 0.03));
  const r = run(
    magick,
    [src, "-gravity", "NorthWest", "-pointsize", String(pt), "-fill", "white",
     "-undercolor", "#000000c0", "-annotate", `+${margin}+${margin}`, ` ${n} `, dst],
    { timeoutMs: 60000 },
  );
  if (r.code === 0 && existsSync(dst)) return dst;
  process.stderr.write(`[warn] hero-compose: could not stamp number ${n} on ${src}; using un-numbered panel\n`);
  return src;
}

function main(): void {
  const A = artifactsDir();
  const specPath = `${A}/hero/hero-spec.json`;
  if (!existsSync(specPath)) die(`hero-compose: hero-spec.json not found at ${specPath}`);

  let spec: HeroSpec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (e) {
    die(`hero-compose: failed to parse hero-spec.json: ${(e as Error).message}`);
  }

  const panels: Panel[] = Array.isArray(spec.panels) ? spec.panels : [];
  if (panels.length === 0) die(`hero-compose: no panels in hero-spec.json`);

  const dir = `${A}/scenes/hero`;
  const paths = panels.map((p) => `${dir}/${p.id}.png`);
  const missing = paths.filter((p) => !existsSync(p));
  if (missing.length) die(`hero-compose: ${missing.length} panel image(s) missing: ${missing.join(", ")}`);

  // Hero is a 1-row grid (panels side by side, reading order = journey order).
  const cols = Math.max(1, Number(spec.grid?.cols) || panels.length);
  const rows = Math.max(1, Number(spec.grid?.rows) || 1);

  const magick = magickBin();
  if (!magick) die(`hero-compose: ImageMagick (magick/convert) not found`);

  const out = `${dir}/hero-grid.png`;
  ensureDirFor(out);

  // 0) number each panel (1-based journey order), top-left badge.
  const numbered = panels.map((p, i) => stampNumber(magick, `${dir}/${p.id}.png`, `${dir}/.num-${p.id}.png`, i + 1));

  // 1) montage panels into a cols×rows grid (each cell at source aspect), thin dark gutters.
  const tmp = `${dir}/hero-grid-raw.png`;
  const montageArgs =
    magick === "magick"
      ? ["montage", ...numbered, "-tile", `${cols}x${rows}`, "-geometry", "1280x720+6+6", "-background", "#0a0a0a", tmp]
      : [...numbered, "-tile", `${cols}x${rows}`, "-geometry", "1280x720+6+6", "-background", "#0a0a0a", tmp];
  let r = run(magick, montageArgs, { timeoutMs: 120000 });
  if (magick !== "magick" || r.code !== 0) {
    const r2 = run("montage", [...numbered, "-tile", `${cols}x${rows}`, "-geometry", "1280x720+6+6", "-background", "#0a0a0a", tmp], { timeoutMs: 120000 });
    if (r2.code !== 0 || !existsSync(tmp)) die(`hero-compose: montage failed.\n${r.stderr}\n${r2.stderr}`);
  }
  if (!existsSync(tmp)) die(`hero-compose: montage produced no output`);

  // 2) resize+pad to EXACTLY 1920x1080 (required for the Seedance upload).
  const r3 = run(magick, [tmp, "-resize", "1920x1080", "-background", "#0a0a0a", "-gravity", "center", "-extent", "1920x1080", out], { timeoutMs: 60000 });
  if (r3.code !== 0 || !existsSync(out)) die(`hero-compose: resize to 1920x1080 failed: ${r3.stderr}`);

  const p = ffprobe(out);
  process.stdout.write(`hero-compose: ${panels.length} panels -> ${out} (${p ? p.width + "x" + p.height : "?"}, grid ${cols}x${rows})\n`);
  process.exit(0);
}

main();
