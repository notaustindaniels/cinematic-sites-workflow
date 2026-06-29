#!/usr/bin/env bun
// site-images-flatten.ts — turn site-plan.json.images[] into a work-item list for the site-images loop.
// Reads $A/site/site-plan.json; writes $A/site/images/plan.json shaped {"items":[...]} (plan-step compatible,
// list "site-images"). Each image is a business-specific Flux prompt (written by site-plan), generated to
// $A/site/images/<id>.png and referenced in the page as images/<id>.png (the assembler swaps "img:<id>").
// Zero images requested -> empty list -> the loop completes immediately (no stock fallbacks anywhere).
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeJSON, ensureDir, die } from "./lib/util.ts";

interface ImgSpec { id?: string; prompt?: string; usage?: string }
interface SitePlan { images?: ImgSpec[] }

function main(): void {
  const A = artifactsDir();
  const specPath = `${A}/site/site-plan.json`;
  if (!existsSync(specPath)) die(`site-images-flatten: site-plan.json not found at ${specPath}`);

  let spec: SitePlan;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf8"));
  } catch (e) {
    die(`site-images-flatten: failed to parse site-plan.json: ${(e as Error).message}`);
  }

  const imgs: ImgSpec[] = Array.isArray(spec.images) ? spec.images : [];
  const dir = `${A}/site/images`;
  ensureDir(dir);

  const seen = new Set<string>();
  const items = imgs
    .filter((im) => im && typeof im.id === "string" && im.id.trim() && typeof im.prompt === "string" && im.prompt.trim())
    .filter((im) => { const id = (im.id as string).trim(); if (seen.has(id)) return false; seen.add(id); return true; })
    .map((im) => ({
      id: (im.id as string).trim(),
      type: "site-image",
      out: `${dir}/${(im.id as string).trim()}.png`,
      prompt: String(im.prompt),
      usage: String(im.usage ?? ""),
      status: "pending",
    }));

  writeJSON(`${dir}/plan.json`, { items });
  process.stdout.write(`site-images-flatten: ${items.length} site image(s) to generate${items.length ? "" : " (none requested)"}\n`);
  process.exit(0);
}

main();
