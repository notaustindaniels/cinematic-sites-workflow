// Shared helpers for the cinematic-site [DET] scripts. Runtime: bun.
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";

/** The artifacts dir: env first (workflow), then argv[2] (local testing). */
export function artifactsDir(): string {
  const a = process.env.ARTIFACTS_DIR || process.argv[2];
  if (!a) {
    die("ARTIFACTS_DIR not set (and no argv[2] fallback provided).");
  }
  return a;
}

/** The active cinematic SECTION — "hero" or "showcase" — whose paths this script should use.
 *  Source of truth is the marker file $A/.cine-section that a workflow phase writes; env CINE_SECTION
 *  overrides it (for local testing). DEFAULTS to "showcase" when there is no marker, so every existing
 *  standalone/showcase invocation is byte-identical to before this parameterization. */
export function cineSection(a?: string): string {
  const env = (process.env.CINE_SECTION || "").trim().toLowerCase();
  if (env === "hero" || env === "showcase") return env;
  const A = a || process.env.ARTIFACTS_DIR || process.argv[2];
  if (A) {
    try {
      const m = readFileSync(`${A}/.cine-section`, "utf8").trim().toLowerCase();
      if (m === "hero" || m === "showcase") return m;
    } catch { /* no marker → default below */ }
  }
  return "showcase";
}

/** Per-section artifact paths. The work dir ($A/<section>/) holds grid-spec.json / plan.json /
 *  door-obs.json / grid-verdict.json; the grid dir ($A/scenes/<section>-grid/) holds the <id>.png panels
 *  and grid.png. The final video path differs by section: hero -> scenes/hero/hero-final.mp4 (what
 *  extract-frames expects), showcase -> scenes/showcase/showcase-video.mp4. */
export function sectionPaths(A: string, section?: string): {
  section: string; work: string; gridDir: string; videoOut: string;
} {
  const sec = section || cineSection(A);
  return {
    section: sec,
    work: `${A}/${sec}`,
    gridDir: `${A}/scenes/${sec}-grid`,
    videoOut: sec === "hero" ? `${A}/scenes/hero/hero-final.mp4` : `${A}/scenes/${sec}/${sec}-video.mp4`,
  };
}

/** mkdir -p the directory that will contain `file`. */
export function ensureDirFor(file: string): void {
  mkdirSync(dirname(file), { recursive: true });
}

/** mkdir -p a directory. */
export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

/** Write a JSON file (pretty), creating parent dirs. */
export function writeJSON(file: string, obj: unknown): void {
  ensureDirFor(file);
  writeFileSync(file, JSON.stringify(obj, null, 2));
}

/** Write text, creating parent dirs. */
export function writeText(file: string, text: string): void {
  ensureDirFor(file);
  writeFileSync(file, text);
}

export function isDryRun(): boolean {
  return process.env.HF_DRY_RUN === "1";
}

/** Print a one-line JSON object to stdout (all values must already be strings). */
export function printJSONLine(obj: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

/** Fail the node with a message on stderr + non-zero exit. */
export function die(msg: string): never {
  process.stderr.write(`[ERROR] ${msg}\n`);
  process.exit(1);
}

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** Run a command synchronously, capturing stdout/stderr. Never throws. */
export function run(cmd: string, args: string[], opts: { cwd?: string; timeoutMs?: number } = {}): RunResult {
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd,
    encoding: "utf8",
    timeout: opts.timeoutMs,
    maxBuffer: 1024 * 1024 * 64,
  });
  return {
    code: typeof r.status === "number" ? r.status : (r.signal ? 137 : 1),
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

/** True if a binary is resolvable on PATH. */
export function hasBin(bin: string): boolean {
  const r = run("command", ["-v", bin]);
  if (r.code === 0 && r.stdout.trim()) return true;
  // Fallback for non-shell `command` resolution.
  const which = run("which", [bin]);
  return which.code === 0 && which.stdout.trim().length > 0;
}

/** Pick the first available ImageMagick binary, or null. */
export function magickBin(): string | null {
  if (hasBin("magick")) return "magick";
  if (hasBin("convert")) return "convert";
  return null;
}

/**
 * Parse a Higgsfield `--json --wait` result. stdout is a top-level JSON array of
 * job objects; the asset URL is `.result_url` on the last completed element.
 * Fallback: the last `http`-prefixed line in stdout.
 */
function resultUrlFromJson(s: string): string | null {
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) {
      const withUrl = parsed.filter((o: any) => o && o.result_url);
      if (withUrl.length) return withUrl[withUrl.length - 1].result_url as string;
    } else if (parsed && typeof parsed === "object" && (parsed as any).result_url) {
      return (parsed as any).result_url as string;
    }
  } catch {
    /* not valid JSON */
  }
  return null;
}

export function parseHiggsfieldUrl(stdout: string): string | null {
  const trimmed = stdout.trim();
  // 1) Whole output is JSON (the `--json --wait` happy path).
  const whole = resultUrlFromJson(trimmed);
  if (whole) return whole;
  // 2) JSON embedded among progress lines — pull the last array/object block and parse it.
  const blocks = trimmed.match(/\[[\s\S]*\]|\{[\s\S]*\}/g) || [];
  for (let i = blocks.length - 1; i >= 0; i--) {
    const u = resultUrlFromJson(blocks[i]);
    if (u) return u;
  }
  // 3) Fallback URL scan — CRITICAL: prefer real asset URLs and NEVER return a
  //    higgsfield API/polling endpoint (e.g. https://fnf.higgsfield.ai/agents/jobs),
  //    which is not downloadable and caused intermittent hero-gen download failures.
  const urls = trimmed.match(/https?:\/\/[^\s"'<>)\]]+/g) || [];
  const isApi = (u: string) => /\/(agents|api|jobs|graphql)(\/|$)/i.test(u);
  const isAsset = (u: string) => /cloudfront\.net/i.test(u) || /\.(mp4|mov|webm|png|jpe?g|webp)(\?|#|$)/i.test(u);
  for (let i = urls.length - 1; i >= 0; i--) if (isAsset(urls[i]) && !isApi(urls[i])) return urls[i];
  for (let i = urls.length - 1; i >= 0; i--) if (!isApi(urls[i])) return urls[i];
  return null;
}

/** Download a URL to a file with curl -fsSL. Returns true on success. */
export function curlDownload(url: string, out: string): boolean {
  ensureDirFor(out);
  const r = run("curl", ["-fsSL", url, "-o", out], { timeoutMs: 300000 });
  return r.code === 0 && existsSync(out);
}

/** ffprobe a media file. Returns {durationSec, width, height, hasVideo} or null. */
export function ffprobe(file: string): { durationSec: number; width: number; height: number; hasVideo: boolean } | null {
  if (!existsSync(file)) return null;
  const r = run("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    file,
  ], { timeoutMs: 60000 });
  if (r.code !== 0) return null;
  try {
    const j = JSON.parse(r.stdout);
    const streams: any[] = j.streams || [];
    const v = streams.find((s) => s.codec_type === "video");
    const durationSec = parseFloat(j.format?.duration ?? v?.duration ?? "0") || 0;
    return {
      durationSec,
      width: v ? Number(v.width) || 0 : 0,
      height: v ? Number(v.height) || 0 : 0,
      hasVideo: !!v,
    };
  } catch {
    return null;
  }
}

/** Largest pixel dimension of an image (via ffprobe). 0 if unknown. */
export function imageMaxDim(file: string): number {
  const p = ffprobe(file);
  if (!p) return 0;
  return Math.max(p.width, p.height);
}

/** Synthesize a placeholder image with ffmpeg lavfi (dry-run). */
export function synthImage(out: string, w = 1920, h = 1080): boolean {
  ensureDirFor(out);
  const r = run("ffmpeg", [
    "-y", "-f", "lavfi", "-i", `color=c=gray:s=${w}x${h}`,
    "-frames:v", "1", out,
  ], { timeoutMs: 60000 });
  return r.code === 0 && existsSync(out);
}

/** Synthesize a placeholder video with ffmpeg lavfi (dry-run). */
export function synthVideo(out: string, durationSec = 8, w = 1280, h = 720): boolean {
  ensureDirFor(out);
  const r = run("ffmpeg", [
    "-y", "-f", "lavfi", "-i", `color=c=black:s=${w}x${h}:d=${durationSec}`,
    "-pix_fmt", "yuv420p", out,
  ], { timeoutMs: 120000 });
  return r.code === 0 && existsSync(out);
}

/** A deterministic fake cloudfront-shaped URL for dry-run output. */
export function fakeCloudfrontUrl(out: string, ext: string): string {
  const base = out.split("/").pop() || "asset";
  const stamp = Date.now().toString(36);
  return `https://d${stamp}xyz.cloudfront.net/user_dryrun/hf_${base}_${stamp}.${ext}`;
}
