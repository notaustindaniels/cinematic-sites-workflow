#!/usr/bin/env bun
// plan-step.ts — work-item state machine for showcase / beforeafter loops.
// CLI:
//   --next <list>            print first pending item JSON (or NONE), exit 0
//   --all-done <list>        exit 0 iff no pending items remain, else exit 1
//   --mark-done <list> <id>  set that item's status to "done", exit 0
// <list> ∈ {showcase, beforeafter}; file at $A/<list>/plan.json shaped {"items":[...]}.
import { existsSync, readFileSync } from "node:fs";
import { writeJSON, die } from "./lib/util.ts";

type ListName = "showcase" | "beforeafter" | "hero";

function isList(s: string): s is ListName {
  return s === "showcase" || s === "beforeafter" || s === "hero";
}

function planPath(A: string, list: ListName): string {
  return `${A}/${list}/plan.json`;
}

function loadItems(A: string, list: ListName): { path: string; data: any; items: any[] } {
  const path = planPath(A, list);
  if (!existsSync(path)) {
    // Missing list file = nothing to do (treat as empty).
    return { path, data: { items: [] }, items: [] };
  }
  let data: any;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    die(`plan-step: failed to parse ${path}: ${(e as Error).message}`);
  }
  const items = Array.isArray(data?.items) ? data.items : [];
  return { path, data, items };
}

function firstPending(items: any[]): any | null {
  return items.find((it) => it && it.status !== "done") ?? null;
}

function main(): void {
  // Read ARTIFACTS_DIR strictly from the environment. We intentionally do NOT
  // fall back to argv[2] here: this script's argv[2] is a flag value (e.g. the
  // list name), and a silent wrong-path read would make a loop see "NONE" and
  // exit having generated nothing. Fail loudly instead. The loop prompt invokes
  // plan-step with `ARTIFACTS_DIR="$ARTIFACTS_DIR"` so this is always present.
  const A = process.env.ARTIFACTS_DIR;
  if (!A) {
    die('plan-step: ARTIFACTS_DIR not set. Loops must call this as `ARTIFACTS_DIR="$ARTIFACTS_DIR" bun .archon/scripts/plan-step.ts ...`');
  }
  const argv = process.argv.slice(2);
  const flag = argv[0];

  if (flag === "--next") {
    const list = argv[1];
    if (!list || !isList(list)) die(`plan-step --next: <list> must be showcase|beforeafter|hero`);
    const { items } = loadItems(A, list);
    const item = firstPending(items);
    if (!item) {
      process.stdout.write("NONE\n");
    } else {
      process.stdout.write(JSON.stringify(item) + "\n");
    }
    process.exit(0);
  }

  if (flag === "--all-done") {
    const list = argv[1];
    if (!list || !isList(list)) die(`plan-step --all-done: <list> must be showcase|beforeafter|hero`);
    const { items } = loadItems(A, list);
    const pending = items.some((it) => it && it.status !== "done");
    // exit 0 iff no pending remain.
    process.exit(pending ? 1 : 0);
  }

  if (flag === "--mark-done") {
    const list = argv[1];
    const id = argv[2];
    if (!list || !isList(list)) die(`plan-step --mark-done: <list> must be showcase|beforeafter|hero`);
    if (!id) die(`plan-step --mark-done: <id> is required`);
    const { path, data, items } = loadItems(A, list);
    let found = false;
    for (const it of items) {
      if (it && it.id === id) {
        it.status = "done";
        found = true;
      }
    }
    if (!found) {
      process.stderr.write(`[warn] plan-step --mark-done: no item with id "${id}" in ${path}\n`);
    }
    data.items = items;
    writeJSON(path, data);
    process.stdout.write(`plan-step: marked ${id} done in ${list}\n`);
    process.exit(0);
  }

  die(`plan-step: unknown command "${flag ?? ""}". Use --next | --all-done | --mark-done.`);
}

main();
