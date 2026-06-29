#!/usr/bin/env bun
// assemble-site.ts — build one self-contained $A/site/index.html from the site plan,
// brand system, frame counts, the vendored cinematic assets, and (if present) the
// before/after plan. See .archon/BUILD-CONTRACT.md "ASSEMBLER" + "module slot catalog".
//
// Runtime: bun. cwd = repo/worktree root, so vendored assets live at
// .archon/assets/cinematic/… (relative paths OK). Reads ARTIFACTS_DIR from env,
// falling back to argv[2] for local testing. Robust to missing optional inputs.

import { existsSync, readFileSync, copyFileSync } from "node:fs";
import { basename } from "node:path";
import { artifactsDir, ensureDir, ensureDirFor, writeText } from "./lib/util.ts";
import { esc, str, jsonAttr, splitFragment } from "./lib/html.ts";

const ASSETS = ".archon/assets/cinematic";
const MODULES_DIR = `${ASSETS}/modules`;

// Single-instance modules: only one copy may appear in the page (deduped).
const SINGLE_INSTANCE = new Set(["scroll-progress", "horizontal-scroll"]);

// ──────────────────────────────────────────────────────────────────────────────
// small utils
// ──────────────────────────────────────────────────────────────────────────────
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

function titleCase(key: string): string {
  return String(key || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ──────────────────────────────────────────────────────────────────────────────
// IntersectionObserver bidirectional patch
//   The vendored entrance-reveal modules add a reveal class on enter only and (some)
//   call unobserve/disconnect so they fire once. The contract requires these to be
//   BIDIRECTIONAL: toggle the class on isIntersecting true AND false, and drop the
//   unobserve/disconnect call. We DO NOT touch counter-animate / typewriter — those
//   play once by design (they animate a number / type a string, not a reveal class).
// ──────────────────────────────────────────────────────────────────────────────
function patchBidirectional(scriptBody: string): string {
  let s = scriptBody;

  // 1) Remove obvious fire-once teardown calls on IntersectionObservers. These appear
  //    as `<obs>.unobserve(<arg>);` or `<obs>.disconnect();` inside the reveal handler.
  s = s.replace(/\b[A-Za-z_$][\w$]*\.unobserve\s*\([^)]*\)\s*;?/g, "");
  s = s.replace(/\b[A-Za-z_$][\w$]*\.disconnect\s*\(\s*\)\s*;?/g, "");

  // 2) Convert single-direction "add class on intersect" handlers to toggles.
  //    Pattern A (non-block): `if(x.isIntersecting)x.target.classList.add('cls')`
  s = s.replace(
    /if\s*\(\s*([A-Za-z_$][\w$]*)\.isIntersecting\s*\)\s*\1\.target\.classList\.add\(\s*(['"][\w-]+['"])\s*\)\s*;?/g,
    (_m, v, cls) => `${v}.target.classList.toggle(${cls}, ${v}.isIntersecting);`,
  );

  // 3) Block form: `if(x.isIntersecting){ … classList.add('cls') … }` (no else).
  //    Regex can't balance braces, so walk them: find each `if(<v>.isIntersecting){`,
  //    scan to the matching close brace, and if it isn't already followed by `else`,
  //    append an `else{ … remove cls … }` so the reveal undoes on exit. The body
  //    itself is left intact (its own add(s) replay on every re-enter).
  s = patchBlockGuards(s);

  return s;
}

/** Brace-aware rewrite of `if(<v>.isIntersecting){ BODY }` (no trailing else) blocks
 *  into bidirectional ones. Adds `else{ <v>.target...remove(cls) }`. */
function patchBlockGuards(s: string): string {
  const guard = /if\s*\(\s*([A-Za-z_$][\w$]*)\.isIntersecting\s*\)\s*\{/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = guard.exec(s)) !== null) {
    const v = m[1];
    const openIdx = m.index + m[0].length - 1; // index of the `{`
    const closeIdx = matchBrace(s, openIdx);
    if (closeIdx < 0) continue; // unbalanced — leave untouched
    // Already has an else right after? then it's bidirectional already.
    const after = s.slice(closeIdx + 1).match(/^\s*else\b/);
    const body = s.slice(openIdx + 1, closeIdx);
    if (after || !/\.classList\.add\(/.test(body)) {
      // copy through unchanged up to and including the close brace
      out += s.slice(last, closeIdx + 1);
      last = closeIdx + 1;
      guard.lastIndex = closeIdx + 1;
      continue;
    }
    // Determine class + clear-selector to build the else branch.
    const clsM = body.match(/\.classList\.add\(\s*(['"][\w-]+['"])\s*\)/);
    const cls = clsM ? clsM[1] : "'revealed'";
    const selM = body.match(/querySelectorAll\(\s*(['"][^'"]+['"])\s*\)/);
    const elseBody = selM
      ? `${v}.target.querySelectorAll(${selM[1]}).forEach(function(i){i.classList.remove(${cls});});`
      : `${v}.target.classList.remove(${cls});`;
    out += s.slice(last, closeIdx + 1) + `else{${elseBody}}`;
    last = closeIdx + 1;
    guard.lastIndex = closeIdx + 1;
  }
  out += s.slice(last);
  return out;
}

/** Given the index of an opening `{`, return the index of its matching `}` (or -1).
 *  Skips over string/template literals so braces inside strings don't miscount. */
function matchBrace(s: string, openIdx: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") { quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// Modules whose IntersectionObserver should be patched bidirectional.
// (Everything that toggles a reveal-style class; explicitly NOT counter/typewriter.)
const BIDIRECTIONAL_MODULES = new Set([
  "stagger-grid",
  "reveal-text",
  "parallax-sections",
  "kinetic-text",
  "liquid-glass",
  "svg-draw",
]);

// ──────────────────────────────────────────────────────────────────────────────
// Module slot fillers — return markup (string) given the vendored fragment markup
//   and the plan-provided slots. Each filler falls back to the vendored sample
//   content when a slot is absent. Style/script come from the fragment unchanged
//   (script possibly bidirectional-patched), so fillers only rewrite the MARKUP.
// ──────────────────────────────────────────────────────────────────────────────

function fillBrandLogoMarquee(markup: string, slots: any, brandNames: string[]): string {
  const label = str(slots?.label) || "Brands We Work With";
  let items: any[] = asArray(slots?.items);
  if (!items.length && brandNames.length) {
    items = brandNames.map((n) => ({ name: n }));
  }
  if (!items.length) return markup; // keep vendored sample

  const renderItem = (it: any) => {
    const name = esc(str(it?.name));
    const img = str(it?.img);
    if (img) {
      return `<div class="brand-logo-item"><img src="${esc(img)}" alt="${name}"><span class="logo-name">${name}</span></div>`;
    }
    return `<div class="brand-logo-item"><span class="logo-text">${name}</span></div>`;
  };
  // Duplicate the set for the seamless -50% loop.
  const oneSet = items.map(renderItem).join("\n      ");
  return `<section class="brand-logos-section">
  <div class="brand-logos-label">${esc(label)}</div>
  <div class="brand-logos-track-wrapper">
    <div class="brand-logos-track">
      ${oneSet}
      ${oneSet}
    </div>
  </div>
</section>`;
}

function fillCounterAnimate(markup: string, slots: any): string {
  const items = asArray(slots?.items);
  if (!items.length) return markup;
  const cells = items
    .map((it) => {
      const target = esc(str(it?.target, "0"));
      const suffix = esc(str(it?.suffix, ""));
      const label = esc(str(it?.label, ""));
      return `  <div class="counter-item"><div class="counter-number" data-counter data-target="${target}" data-suffix="${suffix}">0</div><div class="counter-label">${label}</div><div class="counter-divider"></div></div>`;
    })
    .join("\n");
  return `<div class="counters-row">\n${cells}\n</div>`;
}

function fillTypewriter(markup: string, slots: any): string {
  const phrases = asArray<string>(slots?.phrases).map((p) => str(p)).filter(Boolean);
  if (!phrases.length) return markup;
  return `<h2 class="typewriter" data-typewriter data-phrases='${jsonAttr(phrases)}'><span class="cursor"></span></h2>`;
}

function fillStaggerGrid(markup: string, slots: any): string {
  const items = asArray(slots?.items);
  if (!items.length) return markup;
  const cells = items
    .map((it) => {
      const img = esc(resolveImg(it?.img));
      const title = esc(str(it?.title, ""));
      const desc = esc(str(it?.desc, ""));
      const imgTag = img ? `<img class="item-img" src="${img}" alt="${title}">` : "";
      return `  <div class="stagger-item">${imgTag}<div class="item-title">${title}</div><div class="item-desc">${desc}</div></div>`;
    })
    .join("\n");
  return `<div class="stagger-grid" data-stagger>\n${cells}\n</div>`;
}

interface BaPair {
  after: string;
  before: string;
  caption: string;
}

function fillBeforeAfter(markup: string, slots: any, pairs: BaPair[]): string {
  const title = str(slots?.title) || "See the Difference";
  const use = pairs.length ? pairs : [];
  if (!use.length) return markup; // keep vendored sample
  const cards = use
    .map((p) => {
      const after = esc(p.after);
      const before = esc(p.before);
      const caption = esc(p.caption);
      return `    <div>
      <div class="ba-container" data-before-after>
        <img class="ba-after" src="${after}" alt="After">
        <img class="ba-before" src="${before}" alt="Before">
        <div class="ba-handle"></div>
        <span class="ba-label ba-label-before">Before</span>
        <span class="ba-label ba-label-after">After</span>
      </div>
      <p class="ba-caption">${caption}</p>
    </div>`;
    })
    .join("\n");
  return `<section class="ba-section">
  <h2 class="ba-section-title">${esc(title)}</h2>
  <div class="ba-grid">
${cards}
  </div>
</section>`;
}

/** Resolve a site-plan image reference. "img:<id>" -> the generated image at images/<id>.png (relative to
 *  site/index.html — the site-images loop wrote $A/site/images/<id>.png). Anything else is returned as-is. This
 *  is how generated business imagery replaces the modules' vendored stock placeholders. */
function resolveImg(v: unknown): string {
  const s = str(v).trim();
  const m = /^img:(.+)$/i.exec(s);
  return m ? `images/${m[1].trim()}.png` : s;
}

/** Parallax Sections: fill the heading (slots.heading) and body copy
 *  (slots.text — string OR array of paragraphs), and optionally swap the background
 *  image (slots.image -> resolveImg). Preserves the bg/overlay/divider markup + parallax JS hooks.
 *  Function replacers are used so copy containing "$" (e.g. "$8,000") is safe. */
function fillParallaxSections(markup: string, slots: any): string {
  if (!slots || typeof slots !== "object") return markup;
  const heading = str(slots.heading);
  const arr = asArray<string>(slots.text).map((p) => str(p)).filter(Boolean);
  const bodyParas = arr.length ? arr : (str(slots.text) ? [str(slots.text)] : []);
  const image = resolveImg(slots.image);
  let out = markup;
  if (heading) {
    out = out.replace(/(<h2[^>]*>)[\s\S]*?(<\/h2>)/i, (_m, open, close) => `${open}${esc(heading)}${close}`);
  }
  if (bodyParas.length) {
    const html = bodyParas.map((p) => `<p>${esc(p)}</p>`).join("");
    out = out.replace(/<p[^>]*>[\s\S]*?<\/p>/i, () => html);
  }
  if (image) {
    out = out.replace(/(<img\s+[^>]*src=")[^"]*(")/i, (_m, pre, post) => `${pre}${esc(image)}${post}`);
  }
  return out;
}

/** Liquid Glass: rebuild the frosted-card grid from slots.items
 *  ([{icon?, heading, text}]); falls back to a single card from heading/text.
 *  Keeps the .liquid-glass / .glass-icon / data-glass hooks so CSS + reveal JS bind. */
function fillLiquidGlass(markup: string, slots: any): string {
  if (!slots || typeof slots !== "object") return markup;
  let items = asArray<any>(slots.items);
  if (!items.length) {
    const h = str(slots.heading);
    const t = str(slots.text);
    if (h || t) items = [{ heading: h, text: t }];
  }
  if (!items.length) return markup;
  const icons = ["◆", "◇", "○", "◈", "△", "▢"];
  const cards = items
    .map((it: any, i: number) => {
      const icon = esc(str(it?.icon, icons[i % icons.length]));
      const heading = esc(str(it?.heading, ""));
      const text = esc(str(it?.text, ""));
      return `  <div class="liquid-glass" data-glass><span class="glass-icon">${icon}</span><h3>${heading}</h3><p>${text}</p></div>`;
    })
    .join("\n");
  return `<div class="glass-grid">\n${cards}\n</div>`;
}

/** Generic light slot override for "all other" modules: override the first heading
 *  (slots.heading/label/title) AND, when provided, the first paragraph (slots.text).
 *  Otherwise keep the vendored sample verbatim. Function replacers keep "$" copy safe. */
function fillGeneric(markup: string, slots: any): string {
  if (!slots || typeof slots !== "object") return markup;
  let out = markup;
  const heading = str(slots.heading) || str(slots.label) || str(slots.title);
  if (heading) {
    out = out.replace(
      /(<h[1-3][^>]*>)[\s\S]*?(<\/h[1-3]>)/i,
      (_m, open, close) => `${open}${esc(heading)}${close}`,
    );
  }
  const text = str(slots.text);
  if (text) {
    out = out.replace(/(<p[^>]*>)[\s\S]*?(<\/p>)/i, (_m, open, close) => `${open}${esc(text)}${close}`);
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// before/after pair sourcing (from beforeafter/plan.json), copying images into
// site/assets/ so the page is self-contained. Paths returned are relative to site/.
// ──────────────────────────────────────────────────────────────────────────────
function collectBaPairs(A: string, siteDir: string): BaPair[] {
  const plan = readJSON(`${A}/beforeafter/plan.json`);
  const items = asArray(plan?.items);
  if (!items.length) return [];
  const assetsDir = `${siteDir}/assets`;
  ensureDir(assetsDir);
  const out: BaPair[] = [];
  for (const it of items) {
    const afterSrc = str(it?.after_out);
    const beforeSrc = str(it?.before_out);
    const caption = str(it?.caption, "");
    const afterRel = copyIntoAssets(afterSrc, assetsDir);
    const beforeRel = copyIntoAssets(beforeSrc, assetsDir);
    if (afterRel && beforeRel) {
      out.push({ after: afterRel, before: beforeRel, caption });
    }
  }
  return out;
}

/** Copy a source image into site/assets/ if it exists; return the path relative to
 *  site/ (e.g. "assets/pair-1-after.png"), or "" if the source is missing. */
function copyIntoAssets(src: string, assetsDir: string): string {
  if (!src) return "";
  const name = basename(src);
  const dest = `${assetsDir}/${name}`;
  if (existsSync(src)) {
    try {
      copyFileSync(src, dest);
    } catch {
      /* ignore copy failures — fall through to existence check */
    }
  }
  if (existsSync(dest)) return `assets/${name}`;
  return "";
}

// ──────────────────────────────────────────────────────────────────────────────
// Module rendering
// ──────────────────────────────────────────────────────────────────────────────
interface RenderedModule {
  name: string;
  markup: string;
  styles: string[];
  scripts: string[];
}

function renderModule(
  name: string,
  slots: any,
  ctx: { brandNames: string[]; baPairs: BaPair[] },
): RenderedModule | null {
  const file = `${MODULES_DIR}/${name}.html`;
  if (!existsSync(file)) return null;
  const raw = readFile(file);
  const { markup, styles, scripts } = splitFragment(raw);

  let filled = markup;
  switch (name) {
    case "brand-logo-marquee":
      filled = fillBrandLogoMarquee(markup, slots, ctx.brandNames);
      break;
    case "counter-animate":
      filled = fillCounterAnimate(markup, slots);
      break;
    case "typewriter":
      filled = fillTypewriter(markup, slots);
      break;
    case "stagger-grid":
      filled = fillStaggerGrid(markup, slots);
      break;
    case "before-after-slider":
      filled = fillBeforeAfter(markup, slots, ctx.baPairs);
      break;
    case "parallax-sections":
      filled = fillParallaxSections(markup, slots);
      break;
    case "liquid-glass":
      filled = fillLiquidGlass(markup, slots);
      break;
    default:
      filled = fillGeneric(markup, slots);
      break;
  }

  // Patch entrance-reveal scripts to bidirectional where required.
  const patchedScripts = BIDIRECTIONAL_MODULES.has(name)
    ? scripts.map(patchBidirectional)
    : scripts;

  return { name, markup: filled, styles, scripts: patchedScripts };
}

// ──────────────────────────────────────────────────────────────────────────────
// :root brand vars + design system + fonts
// ──────────────────────────────────────────────────────────────────────────────
function buildRootCss(brand: any): string {
  const v = (k: string, fb: string) => str(brand?.[k]) || fb;
  return `:root{
  --color-bg:${v("color_bg", "#0a0a0a")};
  --color-primary:${v("color_primary", "#ffffff")};
  --color-secondary:${v("color_secondary", "#cccccc")};
  --color-accent:${v("color_accent", "#e0b15e")};
  --color-text:${v("color_text", "#f2f2f2")};
  --font-heading:${v("font_heading", "Georgia, 'Times New Roman', serif")};
  --font-body:${v("font_body", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif")};
}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hero + showcase scroll-frame sections
// ──────────────────────────────────────────────────────────────────────────────
function buildHeroSection(heroHeight: string, headline: string, heroLine: string): string {
  return `<section id="hero-section" style="height:${esc(heroHeight)}">
  <div class="hero-sticky">
    <canvas id="hero-canvas"></canvas>
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <h1 class="hero-headline">${esc(headline)}</h1>
      ${heroLine ? `<p class="hero-tagline">${esc(heroLine)}</p>` : ""}
    </div>
  </div>
</section>`;
}

interface ShowcaseOverlay {
  text: string;
  start: number;
  end: number;
}

/** Derive showcase caption overlays from the plan's showcase scene labels, evenly
 *  spaced across scroll progress; fall back to sensible defaults if none. */
function deriveShowcaseOverlays(plan: any): ShowcaseOverlay[] {
  const scenes = asArray(plan?.showcase?.scenes);
  let labels = scenes.map((s) => str(s?.label)).filter(Boolean);
  if (!labels.length) {
    labels = ["See it in motion", "Every detail considered", "Built to last"];
  }
  const n = labels.length;
  return labels.map((text, i) => {
    const start = i / n;
    const end = (i + 1) / n;
    // Tighten each window slightly so captions cross-fade rather than abut.
    return { text, start: Math.max(0, start - 0.02), end: Math.min(1, end - 0.02) };
  });
}

function buildShowcaseSection(overlays: ShowcaseOverlay[]): string {
  const overlayEls = overlays
    .map(
      (o, i) =>
        `    <div class="showcase-overlay" id="overlay-${i}">${esc(o.text)}</div>`,
    )
    .join("\n");
  return `<section id="showcase-section" style="height:400vh">
  <div class="showcase-sticky">
    <canvas id="showcase-canvas"></canvas>
    <div class="showcase-scrim"></div>
${overlayEls}
  </div>
</section>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Content sections + nav + CTA
// ──────────────────────────────────────────────────────────────────────────────
function buildNav(brandName: string, navLinks: string[]): string {
  const links = navLinks
    .map((l) => {
      const label = str(l);
      const anchor = "#" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      return `<li><a href="${esc(anchor)}">${esc(label)}</a></li>`;
    })
    .join("");
  return `<nav class="site-nav" id="siteNav">
  <div class="nav-logo">${esc(brandName)}</div>
  <button class="nav-hamburger" id="navToggle" aria-label="Menu" aria-expanded="false">&#9776;</button>
  <ul class="nav-links">${links}</ul>
</nav>`;
}

function buildContentSection(key: string, copy: string): string {
  const id = String(key || "section").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const title = titleCase(key);
  return `<section id="${esc(id)}" class="content-section reveal">
  <div class="section-inner">
    <span class="section-eyebrow">${esc(title)}</span>
    <p class="section-lead">${esc(copy)}</p>
  </div>
</section>`;
}

// Contact / CTA section — a centered full-width band (no form, low-friction direct contact), modeled on the
// windowsanddoorsbymartintoro.com pattern: headline + a short transparency sub-line + a primary CTA with an arrow,
// then a labeled direct-contact row (Call / Email / Studio / Serving) with phone+email as tap-to-contact links.
// Contact data comes from intake.json (contact + service_area); the sub-line reuses the brand hero_line/tagline.
function buildCtaSection(cta: any, contact: any, serviceArea: string, subcopy: string): string {
  const headline = str(cta?.headline) || "Ready to begin?";
  const button = str(cta?.button_label) || "Get in touch";
  const phone = str(contact?.phone);
  const email = str(contact?.email);
  const location = str(contact?.location);
  const sub = str(subcopy);
  const telHref = phone.replace(/[^0-9+]/g, "");
  const primaryHref = email
    ? `mailto:${email}?subject=${encodeURIComponent("Consultation request")}`
    : telHref ? `tel:${telHref}` : "#contact";

  const items: string[] = [];
  if (phone) items.push(`<a class="cta-contact-item" href="tel:${esc(telHref)}"><span class="cta-c-label">Call</span><span class="cta-c-value">${esc(phone)}</span></a>`);
  if (email) items.push(`<a class="cta-contact-item" href="mailto:${esc(email)}"><span class="cta-c-label">Email</span><span class="cta-c-value">${esc(email)}</span></a>`);
  if (location) items.push(`<div class="cta-contact-item"><span class="cta-c-label">Studio</span><span class="cta-c-value">${esc(location)}</span></div>`);
  if (serviceArea) items.push(`<div class="cta-contact-item"><span class="cta-c-label">Serving</span><span class="cta-c-value">${esc(serviceArea)}</span></div>`);

  return `<section id="contact" class="cta-section reveal">
  <style>
    .cta-section{padding:clamp(4rem,12vw,9rem) clamp(1.25rem,5vw,2rem);text-align:center;border-top:1px solid rgba(255,255,255,0.08);}
    .cta-inner{max-width:760px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:1.5rem;}
    .cta-section .cta-headline{font-family:var(--font-heading,serif);font-size:clamp(2rem,5vw,3.4rem);line-height:1.08;letter-spacing:-0.01em;margin:0;}
    .cta-section .cta-sub{font-family:var(--font-body,sans-serif);font-size:clamp(1rem,2.2vw,1.2rem);line-height:1.6;max-width:54ch;margin:0;opacity:0.72;}
    .cta-actions{margin-top:0.5rem;}
    .cta-btn{display:inline-flex;align-items:center;gap:0.6rem;}
    .cta-arrow{display:inline-block;transition:transform 0.3s cubic-bezier(0.22,1,0.36,1);}
    .cta-btn:hover .cta-arrow{transform:translateX(5px);}
    .cta-contact{margin-top:2.5rem;padding-top:2.25rem;border-top:1px solid rgba(255,255,255,0.08);display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(1.5rem,5vw,3.5rem);width:100%;}
    .cta-contact-item{display:flex;flex-direction:column;gap:0.4rem;text-decoration:none;color:inherit;}
    .cta-c-label{font-family:var(--font-body,sans-serif);font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;opacity:0.72;}
    .cta-c-value{font-family:var(--font-heading,serif);font-size:clamp(1.05rem,2.4vw,1.35rem);transition:color 0.25s ease;}
    a.cta-contact-item:hover .cta-c-value{color:var(--color-primary,#c8b89a);}
    @media (max-width:560px){.cta-contact{gap:1.5rem 2rem;}}
  </style>
  <div class="cta-inner">
    <h2 class="cta-headline">${esc(headline)}</h2>
    ${sub ? `<p class="cta-sub">${esc(sub)}</p>` : ""}
    <div class="cta-actions">
      <a class="btn btn-primary cta-btn" href="${esc(primaryHref)}">${esc(button)} <span class="cta-arrow">&rarr;</span></a>
    </div>
    ${items.length ? `<div class="cta-contact">${items.join("")}</div>` : ""}
  </div>
</section>`;
}

// The reveal IntersectionObserver for content sections (.reveal) — bidirectional by
// construction (toggles .revealed on enter AND exit; no unobserve).
const REVEAL_OBSERVER = `(function(){
  var revealEls = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){revealEls.forEach(function(el){el.classList.add('revealed');});return;}
  var ro = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ e.target.classList.toggle('revealed', e.isIntersecting); });
  }, {threshold:0.15});
  revealEls.forEach(function(el){ ro.observe(el); });
})();`;

// Nav solid-on-scroll + hamburger toggle behavior.
const NAV_SCROLL = `(function(){
  var nav = document.getElementById('siteNav');
  if(!nav) return;
  function upd(){ nav.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', upd, {passive:true}); upd();
  var toggle = document.getElementById('navToggle');
  if(toggle){
    toggle.addEventListener('click',function(){
      var open = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav-links a').forEach(function(a){
      a.addEventListener('click',function(){ nav.classList.remove('nav-open'); toggle.setAttribute('aria-expanded','false'); });
    });
  }
})();`;

// ──────────────────────────────────────────────────────────────────────────────
// main
// ──────────────────────────────────────────────────────────────────────────────
function main(): void {
  const A = artifactsDir();
  const siteDir = `${A}/site`;
  ensureDir(siteDir);

  const sitePlan = readJSON(`${siteDir}/site-plan.json`) ?? {};
  const brand = readJSON(`${A}/brand/brand-system.json`) ?? {};
  const framesCount = readJSON(`${siteDir}/frames-count.json`) ?? {};
  const plan = readJSON(`${A}/plan.json`) ?? {};
  const intake = readJSON(`${A}/intake.json`) ?? {};

  const heroFrames = Number(framesCount?.hero_frames) || 0;
  const showcaseFrames = Number(framesCount?.showcase_frames) || 0;

  const brandNames = asArray<string>(intake?.brands).map((b) => str(b)).filter(Boolean);
  const baEnabled = enabledFlag(plan?.before_after_enabled) || enabledFlag(plan?.before_after?.enabled);
  const baPairs = baEnabled ? collectBaPairs(A, siteDir) : [];

  // ── Assets ──
  const designCss = readFile(`${ASSETS}/design-system.css`);
  let engineJs = readFile(`${ASSETS}/scroll-frame-engine.js`);
  engineJs = engineJs.split("__FRAME_COUNT__").join(String(heroFrames));

  const rootCss = buildRootCss(brand);
  const fontsUrl = str(brand?.google_fonts_url);

  // ── Hero ──
  const heroHeight = str(plan?.scroll_heights?.hero) || "300vh";
  const headline = str(brand?.headline) || str(sitePlan?.cta?.headline) || str(brand?.business_name) || "";
  const heroLine = str(brand?.hero_line) || str(brand?.tagline) || "";
  const heroSection = buildHeroSection(heroHeight, headline, heroLine);

  // ── Showcase (only if frames present) ──
  let showcaseSection = "";
  let showcaseJs = "";
  let showcaseCss = "";
  if (showcaseFrames > 0) {
    showcaseCss = readFile(`${ASSETS}/showcase-overlay.css`);
    const overlays = deriveShowcaseOverlays(plan);
    showcaseSection = buildShowcaseSection(overlays);
    showcaseJs = readFile(`${ASSETS}/showcase-overlay.js`)
      .split("__SHOWCASE_FRAME_COUNT__").join(String(showcaseFrames))
      .split("__SHOWCASE_OVERLAYS__").join(jsonAttr(overlays));
  }

  // ── Modules: ONLY the mandatory, JS-heavy ones stay deterministic (brand-logo-marquee if brands exist,
  //    before-after-slider if enabled — their drag/marquee JS is fiddly). EVERYTHING else — the content
  //    sections, their imagery, the layout, spacing, and the CTA — is now AI-CRAFTED in $A/site/content.html
  //    (the opus site-build command), so the page reads like the skill's hand-built sites, not a template stitch. ──
  const planModules: { name: string; slots: any }[] = [];
  if (brandNames.length) planModules.push({ name: "brand-logo-marquee", slots: { items: brandNames.map((n) => ({ name: n })) } });
  if (baEnabled) planModules.push({ name: "before-after-slider", slots: {} });

  const rendered: RenderedModule[] = [];
  for (const m of planModules) {
    const r = renderModule(m.name, m.slots, { brandNames, baPairs });
    if (r) rendered.push(r);
  }

  // ── nav (deterministic) + the AI-crafted content body ──
  const navLinks = asArray<string>(sitePlan?.nav_links).map((l) => str(l)).filter(Boolean);
  const navHtml = buildNav(str(brand?.business_name) || "", navLinks);

  const contentPath = `${siteDir}/content.html`;
  if (!existsSync(contentPath)) die(`assemble-site: AI-crafted content body not found at ${contentPath} — run the site-build command first (it writes the content sections + CTA).`);
  const aiBody = readFile(contentPath);

  // ── Assemble <head> styles + <body> scripts ──
  const moduleStyles = rendered.flatMap((r) => r.styles).join("\n");
  const moduleMarkup = rendered.map((r) => `<!-- module: ${r.name} -->\n${r.markup}`).join("\n\n");

  const styleBlocks = [rootCss, designCss, showcaseCss, moduleStyles].filter(Boolean).join("\n\n");

  // Core (non-module) scripts each get their own <script>. Each MODULE'S scripts are
  // wrapped in their OWN <script data-module="name"> so build-check can scope the
  // bidirectional/unobserve checks per module (counters/typewriter allowed to fire once).
  const coreScripts = [NAV_SCROLL, REVEAL_OBSERVER, engineJs, showcaseJs]
    .filter(Boolean)
    .map((s) => `<script>\n${s}\n</script>`);
  const moduleScriptTags = rendered
    .filter((r) => r.scripts.length)
    .map((r) => `<script data-module="${esc(r.name)}">\n${r.scripts.join("\n")}\n</script>`);
  const scriptBlocks = [...coreScripts, ...moduleScriptTags].join("\n");

  const fontLink = fontsUrl
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n  <link href="${esc(fontsUrl)}" rel="stylesheet">`
    : "";

  const pageTitle = str(brand?.business_name) || "Cinematic Site";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(pageTitle)}</title>
  ${fontLink}
  <style>
${styleBlocks}
  </style>
</head>
<body>
${navHtml}

${heroSection}

${showcaseSection}

${moduleMarkup}

${aiBody}

${scriptBlocks}
</body>
</html>
`;

  const outPath = `${siteDir}/index.html`;
  ensureDirFor(outPath);
  writeText(outPath, html);
  process.stdout.write(
    `assemble-site: wrote ${outPath} (hero_frames=${heroFrames}, showcase_frames=${showcaseFrames}, modules=${rendered.length}, ba_pairs=${baPairs.length})\n`,
  );
  process.exit(0);
}

main();
