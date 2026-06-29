#!/usr/bin/env bun
// gen-grid-panels.ts — THE QUADRIPTYCH METHOD: generate the grid panels so they are inherently DISTINCT and
// maximally COHESIVE, deterministically.
//
//   1. COMPOSE one CONTACT SHEET (rows×cols) of ALL N scenes in a SINGLE Flux call. Because the scenes are drawn
//      TOGETHER in one image, they cannot be duplicates (Flux won't draw the same room twice in a labeled grid)
//      and they share one palette / one light / one architecture by construction.
//   2. CROP the sheet into cells, then ISOLATE + UPSCALE each cell via a Flux image→image call into a clean,
//      full-resolution standalone still `p<i>.png` (AI-recreated from the cell, sharpened to 2k).
//
// This replaces the old per-panel anchored generation, where panel N was generated with panel N-1 as an --image
// style anchor and Flux/Higgsfield could echo that anchor back byte-for-byte (the p1==p2 duplicate bug). Here a
// duplicate is structurally impossible. panel-dedup still runs after this as a cheap backstop. Section-aware via
// the $A/.cine-section marker (hero|showcase).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { artifactsDir, sectionPaths, run, magickBin, ensureDir, die } from "./lib/util.ts";
import { hfImage } from "./hf-image.ts";

interface Panel { id: string; scene_label?: string; composition?: string; nb_prompt?: string }
interface GridSpec { style?: unknown; grid?: { rows?: number; cols?: number }; panels?: Panel[] }

/** The Director's `style` may be a string or a structured object ({world, materials, light, ...}); flatten it to
 *  one cohesion sentence for the contact-sheet header. */
function styleText(style: unknown): string {
  if (typeof style === "string") return style;
  if (style && typeof style === "object") {
    return Object.values(style as Record<string, unknown>).filter((v) => typeof v === "string").join(". ");
  }
  return "one cohesive cinematic world";
}

// Flux-supported aspect ratios, widest→tallest, with their numeric value — we snap the contact sheet's natural
// rows×cols aspect to the nearest one.
const ASPECTS: [string, number][] = [
  ["21:9", 2.333], ["16:9", 1.778], ["3:2", 1.5], ["4:3", 1.333],
  ["1:1", 1.0], ["3:4", 0.75], ["2:3", 0.667], ["9:16", 0.5625],
];
function nearestAspect(ratio: number): string {
  let best = ASPECTS[0];
  for (const a of ASPECTS) if (Math.abs(a[1] - ratio) < Math.abs(best[1] - ratio)) best = a;
  return best[0];
}

function positionName(row: number, rows: number, col: number, cols: number): string {
  const v = rows === 1 ? "" : row === 0 ? "top " : row === rows - 1 ? "bottom " : "middle ";
  const h = cols === 1 ? "" : col === 0 ? "left" : col === cols - 1 ? "right" : "center";
  return (v + h).trim() || "single";
}

/** Condense to ~n chars on a sentence/word boundary (keeps the contact-sheet prompt readable per cell). */
function condense(s: string, n: number): string {
  s = String(s ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const dot = cut.lastIndexOf(". ");
  if (dot > n * 0.5) return cut.slice(0, dot + 1).trim();
  const sp = cut.lastIndexOf(" ");
  return (sp > 0 ? cut.slice(0, sp) : cut).trim();
}

function main(): void {
  const A = artifactsDir();
  const { section, work, gridDir } = sectionPaths(A);
  const specPath = `${work}/grid-spec.json`;
  if (!existsSync(specPath)) die(`gen-grid-panels: grid-spec.json not found at ${specPath}`);

  let spec: GridSpec;
  try { spec = JSON.parse(readFileSync(specPath, "utf8")); }
  catch (e) { die(`gen-grid-panels: failed to parse grid-spec.json: ${(e as Error).message}`); }

  const panels = Array.isArray(spec.panels) ? spec.panels : [];
  const N = panels.length;
  if (N < 1) die(`gen-grid-panels: grid-spec has no panels`);

  const magick = magickBin();
  if (!magick) die(`gen-grid-panels: ImageMagick (magick/convert) not found`);
  ensureDir(gridDir);

  const promptFileOf = (id: string) => `${work}/${id}.prompt.txt`; // the panel's own prompt (used by panel-dedup)
  const outOf = (id: string) => `${gridDir}/${id}.png`;

  // Single panel (rare): no contact sheet — generate it directly.
  if (N === 1) {
    const p = panels[0];
    writeFileSync(promptFileOf(p.id), p.nb_prompt || p.composition || "");
    hfImage({ promptFile: promptFileOf(p.id), out: outOf(p.id), aspect: "16:9", resolution: "2k" });
    if (!existsSync(outOf(p.id))) die(`gen-grid-panels: generation failed for ${p.id}`);
    process.stdout.write(`gen-grid-panels: [${section}] 1 panel generated directly\n`);
    process.exit(0);
  }

  // Grid layout: honor the Director's grid; default to a near-square pack (4 → 2x2).
  let cols = spec.grid?.cols || (N === 4 ? 2 : Math.ceil(Math.sqrt(N)));
  let rows = spec.grid?.rows || Math.ceil(N / cols);
  if (rows * cols < N) { cols = Math.ceil(Math.sqrt(N)); rows = Math.ceil(N / cols); }

  // ---- 1) compose the contact sheet (one Flux call) ----
  const positions = panels.map((_, i) => positionName(Math.floor(i / cols), rows, i % cols, cols));
  const style = styleText(spec.style);
  const header =
    `A ${rows}-row by ${cols}-column photographic CONTACT SHEET — ${N} DISTINCT scenes that all belong to ONE ` +
    `world: ${condense(style, 420)}. Each scene fills exactly ONE cell; ${rows * cols} equal-size cells separated ` +
    `by thin clean dark gutters, no overlap, NO text or numbers. The SAME palette, materials, architecture and ` +
    `lighting across EVERY cell — one place, one time of day. Photoreal architectural photography, cinematic, ` +
    `wide-angle framing inside each cell.`;
  const cellLines = panels
    .map((p, i) => `• ${positions[i].toUpperCase()} cell — ${p.scene_label || "scene " + (i + 1)}: ${condense(p.composition || p.nb_prompt || "", 260)}`)
    .join("\n");
  const csPromptFile = `${work}/contact-sheet.prompt.txt`;
  writeFileSync(csPromptFile, `${header}\n\n${cellLines}\n`);
  const csOut = `${gridDir}/contact-sheet.png`;
  const csAspect = nearestAspect((cols * 16) / (rows * 9));
  process.stderr.write(`[info] gen-grid-panels: [${section}] composing ${rows}x${cols} contact sheet of ${N} scenes (aspect ${csAspect})\n`);
  hfImage({ promptFile: csPromptFile, out: csOut, aspect: csAspect, resolution: "2k" });
  if (!existsSync(csOut)) die(`gen-grid-panels: contact sheet was not generated`);

  // ---- 2) crop into cells, isolate + upscale each via Flux (image→image) ----
  const dimOut = run(magick, ["identify", "-format", "%w %h", csOut], { timeoutMs: 20000 }).stdout.trim().split(/\s+/).map(Number);
  const W = dimOut[0], H = dimOut[1];
  if (!W || !H) die(`gen-grid-panels: could not read contact-sheet dimensions`);
  const cw = Math.floor(W / cols), ch = Math.floor(H / rows);

  for (let i = 0; i < N; i++) {
    const p = panels[i];
    const row = Math.floor(i / cols), col = i % cols;
    const cell = `${gridDir}/.cell-${p.id}.png`;
    run(magick, [csOut, "-crop", `${cw}x${ch}+${col * cw}+${row * ch}`, "+repage", cell], { timeoutMs: 30000 });
    if (!existsSync(cell)) die(`gen-grid-panels: failed to crop cell ${i + 1}/${N}`);

    // panel-dedup regenerates from this file if it ever needs to; keep it the panel's natural prompt.
    writeFileSync(promptFileOf(p.id), p.nb_prompt || p.composition || "");
    const isoPrompt =
      `Recreate THIS exact photoreal scene as ONE single clean full-frame image, upscaled to full resolution and ` +
      `sharpened. Preserve the exact composition, materials, furniture, architecture and lighting shown in the ` +
      `reference. ONE scene only — NO grid, NO borders, NO split panels, NO text. ${p.nb_prompt || p.composition || p.scene_label || ""}`;
    const isoFile = `${work}/${p.id}.iso.txt`;
    writeFileSync(isoFile, isoPrompt);
    process.stderr.write(`[info] gen-grid-panels: isolating cell ${i + 1}/${N} (${p.id}) → ${p.id}.png\n`);
    hfImage({ promptFile: isoFile, out: outOf(p.id), images: [cell], aspect: "16:9", resolution: "2k" });
    if (!existsSync(outOf(p.id))) die(`gen-grid-panels: isolation failed for ${p.id}`);
  }

  process.stdout.write(`gen-grid-panels: [${section}] ${N} panels via ${rows}x${cols} contact sheet + isolate — distinct + cohesive\n`);
  process.exit(0);
}

main();
