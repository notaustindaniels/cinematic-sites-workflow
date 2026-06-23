#!/usr/bin/env bun
// preflight.ts — probe tooling, Higgsfield auth, and credit balance.
// Emits a ONE-LINE JSON object (all values quoted strings) to stdout AND writes
// $ARTIFACTS_DIR/preflight.json. Dry-run reports everything present + credits 9999.
import { artifactsDir, hasBin, magickBin, isDryRun, run, writeJSON, printJSONLine } from "./lib/util.ts";

type Pre = {
  higgsfield: string;
  higgsfield_authed: string;
  ffmpeg: string;
  ffprobe: string;
  jq: string;
  gh: string;
  vercel: string;
  git: string;
  imagemagick: string;
  credits: string;
};

/** Discover Higgsfield auth + credits. `account status --json` -> {email, credits, ...}. */
function probeHiggsfield(): { authed: boolean; credits: string } {
  // Run `account status --json`; success + an email implies authed.
  const r = run("higgsfield", ["account", "status", "--json"], { timeoutMs: 40000 });
  if (r.code === 0) {
    try {
      const j = JSON.parse(r.stdout.trim());
      const authed = !!(j && (j.email || j.account || j.user));
      let credits = "9999";
      if (j && j.credits != null && !Number.isNaN(Number(j.credits))) {
        credits = String(Math.trunc(Number(j.credits)));
      }
      return { authed, credits };
    } catch {
      /* fall through */
    }
  }
  // Non-JSON fallback: try to scrape a credit number from plain output.
  const plain = run("higgsfield", ["account", "status"], { timeoutMs: 40000 });
  if (plain.code === 0) {
    const m = plain.stdout.match(/([\d,]+)\s*credits/i);
    const credits = m ? m[1].replace(/,/g, "") : "9999";
    // If we got any sensible output, assume authed.
    const authed = plain.stdout.trim().length > 0;
    return { authed, credits };
  }
  // Couldn't reach the account endpoint -> not authed; don't false-alarm credits.
  return { authed: false, credits: "9999" };
}

function main(): void {
  const A = artifactsDir();
  let result: Pre;

  if (isDryRun()) {
    result = {
      higgsfield: "true",
      higgsfield_authed: "true",
      ffmpeg: "true",
      ffprobe: "true",
      jq: "true",
      gh: "true",
      vercel: "true",
      git: "true",
      imagemagick: "true",
      credits: "9999",
    };
  } else {
    const higgsfield = hasBin("higgsfield");
    let authed = false;
    let credits = "9999";
    if (higgsfield) {
      const p = probeHiggsfield();
      authed = p.authed;
      credits = p.credits;
    }
    result = {
      higgsfield: higgsfield ? "true" : "false",
      higgsfield_authed: authed ? "true" : "false",
      ffmpeg: hasBin("ffmpeg") ? "true" : "false",
      ffprobe: hasBin("ffprobe") ? "true" : "false",
      jq: hasBin("jq") ? "true" : "false",
      gh: hasBin("gh") ? "true" : "false",
      vercel: hasBin("vercel") ? "true" : "false",
      git: hasBin("git") ? "true" : "false",
      imagemagick: magickBin() ? "true" : "false",
      credits,
    };
  }

  writeJSON(`${A}/preflight.json`, result);
  printJSONLine(result as unknown as Record<string, unknown>);
  process.exit(0);
}

main();
