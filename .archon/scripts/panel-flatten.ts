#!/usr/bin/env bun
// panel-flatten.ts — turn grid-spec.json into an ordered panel work-item list (GRID method).
// Reads $A/showcase/grid-spec.json; writes $A/showcase/plan.json shaped {"items":[...]}.
// Panels are independent (no chain, no seams) — but we still ref the prior panel as a STYLE anchor so the grid
// reads as one house. Prompts are pre-written by the Director; flatten does not compose any prompt.
// Compatible with plan-step.ts (--next/--mark-done/--all-done).
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeJSON, die } from "./lib/util.ts";

interface Panel { id: string; scene_label?: string; composition?: string; nb_prompt?: string }
interface GridSpec { panels?: Panel[]; grid?: { cols?: number; rows?: number } }

function main(): void {
  const A = artifactsDir();
  const specPath = `${A}/showcase/grid-spec.json`;
  if (!existsSync(specPath)) die(`panel-flatten: grid-spec.json not found at ${specPath}`);

  let spec: GridSpec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (e) {
    die(`panel-flatten: failed to parse grid-spec.json: ${(e as Error).message}`);
  }

  const panels: Panel[] = Array.isArray(spec.panels) ? spec.panels : [];
  if (panels.length === 0) die(`panel-flatten: grid-spec.json has no panels[]`);

  const dir = `${A}/scenes/showcase-grid`;
  const outOf = (id: string) => `${dir}/${id}.png`;

  const items = panels.map((p, i) => {
    if (!p || typeof p.id !== "string" || !p.id) die(`panel-flatten: panel ${i} is missing a string id`);
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

  writeJSON(`${A}/showcase/plan.json`, { items });
  process.stdout.write(`panel-flatten: ${items.length} panel work-items (grid ${spec.grid?.cols ?? "?"}x${spec.grid?.rows ?? "?"})\n`);
  process.exit(0);
}

main();
