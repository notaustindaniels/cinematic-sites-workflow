#!/usr/bin/env bun
// build-check.ts — assert the decidable parts of the cinematic site build (skill §3F /
// BUILD-CONTRACT "BUILD-CHECK"). Reads the assembled site + the inputs that fix its
// invariants, emits {"verdict":"PASS|FAIL","failures":[...]} to stdout AND writes
// $A/site/build-check.json. NEVER exits non-zero — the verdict is the only signal.
//
// Runtime: bun. ARTIFACTS_DIR from env, argv[2] fallback.

import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeJSON } from "./lib/util.ts";

function readJSON(path: string): any | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readFile(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function asArray<T = any>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function enabledFlag(v: unknown): boolean {
  return v === true || v === "true";
}

/** Extract every <script>…</script> block as {module, body}. `module` is the
 *  data-module attribute when present (the assembler tags each module's script). */
function scriptBlocks(html: string): { module: string | null; body: string }[] {
  const out: { module: string | null; body: string }[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1] || "";
    const dm = attrs.match(/data-module=["']([\w-]+)["']/);
    out.push({ module: dm ? dm[1] : null, body: m[2] });
  }
  return out;
}

/** Extract the bodies of every <style>…</style> block. */
function styleBlocks(html: string): string[] {
  const out: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out;
}

/** Last top-level <section …> tag's identity (class/id), for the CTA-last check. */
function lastSectionTag(html: string): string | null {
  const re = /<section\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  let last: string | null = null;
  while ((m = re.exec(html)) !== null) last = m[0];
  return last;
}

function main(): void {
  const A = artifactsDir();
  const siteDir = `${A}/site`;
  const indexPath = `${siteDir}/index.html`;

  const failures: string[] = [];

  const html = readFile(indexPath);
  const framesCount = readJSON(`${siteDir}/frames-count.json`) ?? {};
  const intake = readJSON(`${A}/intake.json`) ?? {};
  const plan = readJSON(`${A}/plan.json`) ?? {};

  const heroFrames = Number(framesCount?.hero_frames) || 0;

  if (!html) {
    failures.push(`index.html missing or empty at ${indexPath}`);
    // Without HTML, every other check is meaningless; emit FAIL now.
    return finish(A, failures);
  }

  const scripts = scriptBlocks(html);
  const styles = styleBlocks(html);
  const css = styles.join("\n");
  const allScripts = scripts.map((s) => s.body).join("\n");

  // ── 1. Hero: sticky canvas present ──
  // The hero canvas (#hero-canvas) inside a sticky container.
  const hasHeroCanvas = /id=["']hero-canvas["']/.test(html);
  const hasSticky = /position\s*:\s*sticky/i.test(css) || /class=["'][^"']*hero-sticky[^"']*["']/.test(html);
  if (!hasHeroCanvas) failures.push("hero section is missing the sticky scroll-frame <canvas id=\"hero-canvas\">");
  if (!hasSticky) failures.push("hero canvas is not in a sticky container (no position:sticky / .hero-sticky)");

  // ── 2. Scroll-frame engine present ──
  // The engine references frames/frame_<padded>.jpg and drives the canvas via rAF.
  const hasEngine =
    /frames\/frame_/.test(allScripts) &&
    /getElementById\(\s*['"]hero-canvas['"]\s*\)/.test(allScripts);
  if (!hasEngine) failures.push("scroll-frame engine not found in page scripts (no frames/frame_ load against #hero-canvas)");

  // ── 3. __FRAME_COUNT__ replaced with a number == hero_frames ──
  if (/__FRAME_COUNT__/.test(html)) {
    failures.push("literal token __FRAME_COUNT__ was not replaced in the assembled page");
  } else {
    // The engine line should read `const frameCount = <N>;`
    const m = allScripts.match(/frameCount\s*=\s*(\d+)/);
    if (!m) {
      failures.push("could not find a numeric frameCount in the scroll-frame engine");
    } else if (Number(m[1]) !== heroFrames) {
      failures.push(`hero frameCount (${m[1]}) does not equal frames-count.hero_frames (${heroFrames})`);
    }
  }

  // ── 4. :root defines --color-primary ──
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootMatch || !/--color-primary\s*:/.test(rootMatch[1])) {
    // Allow the var to be defined in any :root block (the brand block precedes design-system).
    if (!/:root\s*\{[\s\S]*?--color-primary\s*:/.test(css)) {
      failures.push(":root does not define --color-primary");
    }
  }

  // ── 5. ≥3 modules present ──
  const moduleCount = (html.match(/<!--\s*module:\s*[\w-]+\s*-->/g) || []).length;
  if (moduleCount < 3) {
    failures.push(`fewer than 3 modules present (found ${moduleCount})`);
  }

  // ── 6. No unobserve(/disconnect( inside stagger-grid/reveal entrance blocks ──
  // Scoped: only inspect scripts that are entrance-reveal blocks (toggle a reveal-style
  // class). Counter-animate and typewriter play once by design, so they are exempt —
  // identified by the assembler's data-module tag, or by content markers as a fallback.
  const ONCE_MODULES = new Set(["counter-animate", "typewriter"]);
  for (const { module, body: s } of scripts) {
    if (module && ONCE_MODULES.has(module)) continue;
    if (!module) {
      // Untagged block (core or legacy concat): skip if it's a counter/typewriter body.
      const isCounter = /data-counter/.test(s) || /\banimC\b/.test(s);
      const isTypewriter = /data-typewriter/.test(s);
      if (isCounter || isTypewriter) continue;
    }
    const isRevealBlock =
      /classList\.(add|toggle|remove)\(\s*['"](revealed|in-view)['"]/.test(s) ||
      /data-stagger/.test(s) ||
      /data-reveal/.test(s) ||
      /stagger-item/.test(s);
    if (!isRevealBlock) continue;
    if (/\bunobserve\s*\(/.test(s)) {
      const where = module ? `the ${module} module` : "a stagger-grid/reveal entrance block";
      failures.push(`${where} still calls unobserve( (must be bidirectional)`);
      break;
    }
    if (/\bdisconnect\s*\(/.test(s)) {
      const where = module ? `the ${module} module` : "a stagger-grid/reveal entrance block";
      failures.push(`${where} still calls disconnect( (must be bidirectional)`);
      break;
    }
  }

  // ── 7. No inline opacity:0 / opacity:0.[0-6] on text (in markup style="" attrs) ──
  // Inspect inline style attributes only (CSS classes legitimately use opacity:0 as the
  // pre-reveal base state, toggled by the bidirectional observer). A hardcoded faint
  // inline opacity on text would defeat legibility.
  const inlineStyles = html.match(/style=["'][^"']*["']/gi) || [];
  for (const st of inlineStyles) {
    if (/opacity\s*:\s*0(?:\.[0-6]\d*)?\s*(?:;|["'])/.test(st)) {
      failures.push(`an inline style hardcodes a faint/zero text opacity: ${st}`);
      break;
    }
  }

  // ── 8. brands → .brand-logos-track present iff intake.brands non-empty ──
  const brandNames = asArray(intake?.brands).map((b) => String(b ?? "")).filter(Boolean);
  const hasMarqueeTrack = /class=["'][^"']*brand-logos-track[^"']*["']/.test(html);
  if (brandNames.length && !hasMarqueeTrack) {
    failures.push("intake.brands is non-empty but the page has no .brand-logos-track (brand-logo-marquee missing)");
  }

  // ── 9. before/after → .ba-container present iff before_after enabled ──
  const baEnabled = enabledFlag(plan?.before_after_enabled) || enabledFlag(plan?.before_after?.enabled);
  const hasBaContainer = /class=["'][^"']*ba-container[^"']*["']/.test(html);
  if (baEnabled && !hasBaContainer) {
    failures.push("before_after is enabled but the page has no .ba-container (before-after-slider missing)");
  }

  // ── 10. Last <section> is the CTA/contact ──
  const lastSec = lastSectionTag(html);
  if (!lastSec) {
    failures.push("no <section> elements found in the page");
  } else if (!/cta-section/.test(lastSec) && !/id=["']contact["']/.test(lastSec)) {
    failures.push(`the last <section> is not the CTA/contact section: ${lastSec}`);
  }

  // ── 11. <meta name="viewport"> present ──
  if (!/<meta\s+name=["']viewport["']/i.test(html)) {
    failures.push('<meta name="viewport"> is missing');
  }

  // ── 12. ≥1 clamp( in CSS ──
  if (!/clamp\s*\(/.test(css)) {
    failures.push("no clamp() found in the page CSS (fluid type scale missing)");
  }

  return finish(A, failures);
}

function finish(A: string, failures: string[]): void {
  const verdict = failures.length === 0 ? "PASS" : "FAIL";
  const result = { verdict, failures };
  writeJSON(`${A}/site/build-check.json`, result);
  process.stdout.write(JSON.stringify(result) + "\n");
  process.exit(0);
}

main();
