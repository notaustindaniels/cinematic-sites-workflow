#!/usr/bin/env bun
// stall-watch.ts — detect Archon workflow runs that have silently stalled.
//
// WHY THIS EXISTS: a run paused at a human-approval gate is indistinguishable from
// a healthy paused run — it emits no further signal. If nobody answers the gate, the
// run sits idle indefinitely (we lost ~7h to exactly this). A paused workflow cannot
// watch itself (it is suspended), so detection MUST be external. This script reads the
// Archon SQLite DB directly (no server required) and flags any non-terminal run whose
// last activity is older than a per-status threshold:
//   - paused  : a human-approval gate nobody has answered  -> needs approve/reject
//   - running : executing but no node activity              -> possible hang/zombie
//   - pending : queued but never started
//
// Exit code is 1 when any stall is found, 0 when all healthy — so a cron/monitor can
// alert on non-zero. Run it on an interval (see the recipe printed by `--help`).
import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

interface Row {
  id: string;
  workflow_name: string;
  status: string;
  last_activity_at: string;
  idle_min: number;
  metadata: string | null;
}

function dbPath(): string {
  const home = process.env.ARCHON_HOME || `${homedir()}/.archon`;
  return `${home}/archon.db`;
}

function intArg(name: string, fallback: number): number {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1] != null) {
    const n = parseInt(process.argv[i + 1], 10);
    if (!Number.isNaN(n)) return n;
  }
  const env = process.env[`STALL_${name.replace(/^--/, "").replace(/-/g, "_").toUpperCase()}`];
  if (env != null) {
    const n = parseInt(env, 10);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function gateNode(metadata: string | null): string {
  if (!metadata) return "";
  try {
    const m = JSON.parse(metadata);
    return String(m?.approval?.nodeId ?? "");
  } catch {
    return "";
  }
}

function fmtIdle(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

function main(): void {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(
      `stall-watch.ts — flag Archon runs idle past a threshold (paused gate / hung / pending).\n\n` +
        `Usage:  bun .archon/scripts/stall-watch.ts [--paused-min N] [--running-min N] [--pending-min N] [--quiet]\n` +
        `Defaults: paused=30  running=20  pending=10 (minutes). Also via env STALL_PAUSED_MIN, etc.\n` +
        `Exit: 1 if any stall found, 0 if all healthy.\n\n` +
        `Run it on an interval so a forgotten gate can never sit silently:\n` +
        `  • cron:  */10 * * * * cd <repo> && bun .archon/scripts/stall-watch.ts --quiet || osascript -e 'display notification "Archon run stalled"'\n` +
        `  • loop:  /loop 10m bun .archon/scripts/stall-watch.ts\n`,
    );
    process.exit(0);
  }

  const pausedMin = intArg("--paused-min", 30);
  const runningMin = intArg("--running-min", 20);
  const pendingMin = intArg("--pending-min", 10);
  const quiet = process.argv.includes("--quiet");

  const path = dbPath();
  if (!existsSync(path)) {
    process.stderr.write(`stall-watch: Archon DB not found at ${path}\n`);
    process.exit(0); // no DB = nothing to watch; don't false-alarm
  }

  const db = new Database(path, { readonly: true });
  // Compute idle minutes in SQL via julianday — both sides are UTC, so no TZ math in JS.
  const rows = db
    .query(
      `SELECT id, workflow_name, status, last_activity_at,
              CAST((julianday('now') - julianday(last_activity_at)) * 24 * 60 AS INTEGER) AS idle_min,
              metadata
       FROM remote_agent_workflow_runs
       WHERE status IN ('running','paused','pending')
       ORDER BY idle_min DESC`,
    )
    .all() as Row[];

  const threshold: Record<string, number> = { paused: pausedMin, running: runningMin, pending: pendingMin };
  const stalls: { row: Row; why: string }[] = [];
  for (const r of rows) {
    const limit = threshold[r.status];
    if (limit != null && r.idle_min >= limit) {
      const why =
        r.status === "paused"
          ? `FORGOTTEN GATE — paused at "${gateNode(r.metadata) || "approval"}" awaiting human approve/reject`
          : r.status === "running"
            ? `POSSIBLE HANG — running but no node activity`
            : `NEVER STARTED — queued but not running`;
      stalls.push({ row: r, why });
    }
  }

  if (stalls.length === 0) {
    if (!quiet) {
      const active = rows.length;
      process.stdout.write(
        `✅ stall-watch: no stalled runs (${active} active run${active === 1 ? "" : "s"} within thresholds: paused<${pausedMin}m running<${runningMin}m pending<${pendingMin}m)\n`,
      );
    }
    db.close();
    process.exit(0);
  }

  process.stdout.write(`⚠ stall-watch: ${stalls.length} STALLED run(s) detected:\n`);
  for (const { row, why } of stalls) {
    process.stdout.write(`\n  • ${row.workflow_name} [${row.id.slice(0, 12)}]  status=${row.status}  idle=${fmtIdle(row.idle_min)}\n`);
    process.stdout.write(`    ${why}\n`);
    if (row.status === "paused") {
      process.stdout.write(`    → resolve:  archon workflow approve ${row.id} "<comment>"   (or reject)\n`);
    } else if (row.status === "running") {
      process.stdout.write(`    → inspect:  no live process? then  archon workflow abandon ${row.id}  and re-run/--resume\n`);
    }
  }
  process.stdout.write(`\n`);
  db.close();
  process.exit(1);
}

main();
