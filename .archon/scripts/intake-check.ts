#!/usr/bin/env bun
// intake-check.ts — completeness gate for the intake JSON.
// Emits {"complete":"true|false","missing":[...]} to stdout AND writes
// $ARTIFACTS_DIR/intake-check.json. MUST NEVER exit non-zero.
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeJSON, printJSONLine } from "./lib/util.ts";

// MUST-HAVE fields per the contract.
const MUST_HAVE = ["business_name", "services", "city", "service_area", "customers"] as const;

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0 || v.every((x) => typeof x === "string" && x.trim() === "");
  return false;
}

/** True if a must-have key is still echoed (case-insensitive) in any open_questions entry. */
function stillOpen(openQuestions: unknown, key: string): boolean {
  if (!Array.isArray(openQuestions)) return false;
  const needle = key.replace(/_/g, " ").toLowerCase();
  const bare = key.toLowerCase();
  return openQuestions.some((q) => {
    if (typeof q !== "string") return false;
    const s = q.toLowerCase();
    return s.includes(needle) || s.includes(bare);
  });
}

function main(): void {
  const A = artifactsDir();
  const intakePath = `${A}/intake.json`;
  const missing: string[] = [];

  let intake: any = null;
  if (!existsSync(intakePath)) {
    // No intake yet -> incomplete, but DO NOT fail the node.
    for (const k of MUST_HAVE) missing.push(k);
    const out = { complete: "false", missing };
    writeJSON(`${A}/intake-check.json`, out);
    printJSONLine(out as unknown as Record<string, unknown>);
    process.exit(0);
  }

  try {
    intake = JSON.parse(readFileSync(intakePath, "utf8"));
  } catch {
    for (const k of MUST_HAVE) missing.push(k);
    const out = { complete: "false", missing };
    writeJSON(`${A}/intake-check.json`, out);
    printJSONLine(out as unknown as Record<string, unknown>);
    process.exit(0);
  }

  const openQuestions = intake?.open_questions;
  for (const key of MUST_HAVE) {
    if (isEmpty(intake?.[key]) || stillOpen(openQuestions, key)) {
      missing.push(key);
    }
  }

  const out = { complete: missing.length === 0 ? "true" : "false", missing };
  writeJSON(`${A}/intake-check.json`, out);
  printJSONLine(out as unknown as Record<string, unknown>);
  process.exit(0);
}

main();
