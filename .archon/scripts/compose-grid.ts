#!/usr/bin/env bun
// compose-grid.ts — composite the generated panels into ONE storyboard-grid image for Seedance.
// Reads $A/showcase/grid-spec.json (panel order + grid layout) and the generated panels at
// $A/scenes/showcase-grid/<id>.png; writes $A/scenes/showcase-grid/grid.png.
//
// CRITICAL (learned the hard way): Seedance's --start-image must be a STANDARD 16:9 size. A non-standard size
// (e.g. 2776x1572 from a raw montage) silently fails the upload. So we always montage then resize/pad to
// EXACTLY 1920x1080. Panels are placed in grid reading order (left→right, top→bottom) = the journey order.
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, ensureDirFor, run, magickBin, ffprobe, die } from "./lib/util.ts";

interface Panel { id: string }
interface GridSpec { panels?: Panel[]; grid?: { cols?: number; rows?: number } }

/**
 * Stamp a 1-based scene-order number into the top-left corner of one panel and return the path to use for the
 * montage. We number panels BEFORE montage (not after) so the badge lands in each panel's own top-left and is
 * sized relative to that panel — it then scales down with everything through the montage+resize-to-1920x1080
 * chain, staying a constant fraction of its cell. The grid reading order (left→right, top→bottom) is the journey
 * order, so panel i gets number i+1. On any failure we fall back to the un-numbered panel (never block the grid).
 */
function stampNumber(magick: string, src: string, dst: string, n: number): string {
  const dim = ffprobe(src);
  const h = dim && dim.height ? dim.height : 1080;
  const pt = Math.max(28, Math.round(h * 0.085));   // legible to Seedance + the human reviewer; scales with panel
  const margin = Math.max(10, Math.round(h * 0.03));
  const r = run(
    magick,
    [
      src,
      "-gravity", "NorthWest",
      "-pointsize", String(pt),
      "-fill", "white",
      "-undercolor", "#000000c0",                   // dark badge box behind the digit for contrast on any panel
      "-annotate", `+${margin}+${margin}`, ` ${n} `,
      dst,
    ],
    { timeoutMs: 60000 },
  );
  if (r.code === 0 && existsSync(dst)) return dst;
  process.stderr.write(`[warn] compose-grid: could not stamp number ${n} on ${src}; using un-numbered panel\n`);
  return src;
}

function main(): void {
  const A = artifactsDir();
  const specPath = `${A}/showcase/grid-spec.json`;
  if (!existsSync(specPath)) die(`compose-grid: grid-spec.json not found at ${specPath}`);

  let spec: GridSpec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (e) {
    die(`compose-grid: failed to parse grid-spec.json: ${(e as Error).message}`);
  }

  const panels: Panel[] = Array.isArray(spec.panels) ? spec.panels : [];
  if (panels.length === 0) die(`compose-grid: no panels in grid-spec.json`);

  const dir = `${A}/scenes/showcase-grid`;
  const paths = panels.map((p) => `${dir}/${p.id}.png`);
  const missing = paths.filter((p) => !existsSync(p));
  if (missing.length) die(`compose-grid: ${missing.length} panel image(s) missing: ${missing.join(", ")}`);

  const cols = Math.max(1, Number(spec.grid?.cols) || Math.ceil(Math.sqrt(panels.length)));
  const rows = Math.max(1, Number(spec.grid?.rows) || Math.ceil(panels.length / cols));

  const magick = magickBin();
  if (!magick) die(`compose-grid: ImageMagick (magick/convert) not found`);

  const out = `${dir}/grid.png`;
  ensureDirFor(out);

  // 0) stamp each panel with its 1-based journey number (top-left badge) so the storyboard — and the Seedance
  //    start-image it becomes — carries the intended scene order. Numbered panels feed the montage below.
  const numbered = panels.map((p, i) => stampNumber(magick, `${dir}/${p.id}.png`, `${dir}/.num-${p.id}.png`, i + 1));

  // 1) montage panels into a cols×rows grid (each cell at the source aspect), thin dark gutters.
  const tmpGrid = `${dir}/grid-raw.png`;
  const montageArgs =
    magick === "magick"
      ? ["montage", ...numbered, "-tile", `${cols}x${rows}`, "-geometry", "1280x720+6+6", "-background", "#0a0a0a", tmpGrid]
      : [...numbered, "-tile", `${cols}x${rows}`, "-geometry", "1280x720+6+6", "-background", "#0a0a0a", tmpGrid]; // `convert` has no montage; fallback below
  let r = run(magick, montageArgs, { timeoutMs: 120000 });
  if (magick !== "magick" || r.code !== 0) {
    // `convert` doesn't support montage; require the `montage` binary explicitly.
    const r2 = run("montage", [...numbered, "-tile", `${cols}x${rows}`, "-geometry", "1280x720+6+6", "-background", "#0a0a0a", tmpGrid], { timeoutMs: 120000 });
    if (r2.code !== 0 || !existsSync(tmpGrid)) die(`compose-grid: montage failed.\n${r.stderr}\n${r2.stderr}`);
  }
  if (!existsSync(tmpGrid)) die(`compose-grid: montage produced no output`);

  // 2) resize+pad to EXACTLY 1920x1080 (standard 16:9 — required for the Seedance upload).
  const r3 = run(magick, [tmpGrid, "-resize", "1920x1080", "-background", "#0a0a0a", "-gravity", "center", "-extent", "1920x1080", out], { timeoutMs: 60000 });
  if (r3.code !== 0 || !existsSync(out)) die(`compose-grid: resize to 1920x1080 failed: ${r3.stderr}`);

  const p = ffprobe(out);
  process.stdout.write(`compose-grid: ${panels.length} panels -> ${out} (${p ? p.width + "x" + p.height : "?"}, grid ${cols}x${rows})\n`);
  process.exit(0);
}

main();
