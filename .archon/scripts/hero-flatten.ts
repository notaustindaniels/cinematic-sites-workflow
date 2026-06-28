#!/usr/bin/env bun
// hero-flatten.ts — turn hero-spec.json.panels[] into an ordered image work-item list (cinematic-hero, GRID method).
// Reads $A/hero/hero-spec.json; writes $A/hero/plan.json shaped {"items":[...]} with status:"pending".
// The hero is exactly TWO panels [start, landing]; panel 2 refs panel 1 as a STYLE anchor so the grid reads as one
// world. Prompts are pre-written by the Director. Compatible with plan-step.ts (--next/--mark-done/--all-done hero).
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeJSON, die } from "./lib/util.ts";

interface Panel { id: string; scene_label?: string; composition?: string; nb_prompt?: string }
interface HeroSpec { panels?: Panel[]; grid?: { cols?: number; rows?: number } }

function main(): void {
  const A = artifactsDir();
  const specPath = `${A}/hero/hero-spec.json`;
  if (!existsSync(specPath)) die(`hero-flatten: hero-spec.json not found at ${specPath}`);

  let spec: HeroSpec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (e) {
    die(`hero-flatten: failed to parse hero-spec.json: ${(e as Error).message}`);
  }

  const panels: Panel[] = Array.isArray(spec.panels) ? spec.panels : [];
  if (panels.length === 0) die(`hero-flatten: hero-spec.json has no panels[]`);

  const dir = `${A}/scenes/hero`;
  const outOf = (id: string) => `${dir}/${id}.png`;

  const items = panels.map((p, i) => {
    if (!p || typeof p.id !== "string" || !p.id) die(`hero-flatten: panel ${i} is missing a string id`);
    const prior = i > 0 ? panels[i - 1] : null;
    return {
      id: p.id,
      type: "panel",
      index: i,
      refs: prior ? [outOf(prior.id)] : [], // style anchor only; first panel is fresh
      out: outOf(p.id),
      prompt: String(p.nb_prompt ?? ""),
      scene_label: String(p.scene_label ?? `Panel ${i + 1}`),
      status: "pending",
    };
  });

  writeJSON(`${A}/hero/plan.json`, { items });
  process.stdout.write(`hero-flatten: ${items.length} panel work-item(s) (grid ${spec.grid?.cols ?? 2}x${spec.grid?.rows ?? 1})\n`);
  process.exit(0);
}

main();
