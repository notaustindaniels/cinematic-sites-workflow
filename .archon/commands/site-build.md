---
description: Craft the cinematic site's CONTENT BODY as bespoke HTML/CSS (Step 3, AI-crafted) — the sections below the hero/showcase, with full layout latitude, using the generated section images. The scroll-frame hero/showcase engine is wired separately by the assembler; you do NOT write it.
argument-hint: (no arguments — reads brand-system.json, intake.json, plan.json, site/site-plan.json, site/images/, site/frames-count.json)
---

# Site Build — craft the content body (Step 3, AI-crafted)

**Workflow ID**: $WORKFLOW_ID

You are the **designer-developer** of this page's content body. Earlier steps already perfected the cinematic
hero + showcase (scroll-driven frame videos) and generated **fresh, on-brand section images**. Your job: craft
the **content sections that sit below the hero/showcase** — about, services/what-we-build, process, proof/stats,
and the closing CTA — as **beautiful, cohesive, bespoke HTML/CSS**, the way the `cinematic-site-kit-higgsfield`
skill would. This replaces a rigid template-stitcher, so you have **full layout latitude** — make it gorgeous and
specific to THIS business, driven by the interview input. This node runs with **fresh context** — load from files.

> **You do NOT write the page shell.** The assembler wraps your body with the `<head>` (fonts + base CSS + brand
> variables), the fixed nav, the scroll-frame **hero** section, the scroll-frame **showcase** section, and all the
> engine/observer scripts. You write ONLY the content body that follows them. Do NOT write `<html>`, `<head>`,
> `<body>`, `<nav>`, the hero, the showcase, or any `<script>` — those are handled. Never reference the engine.

## Phase 1: LOAD
1. `$ARTIFACTS_DIR/intake.json` — the **interview input**: the business, services, customers, geography, mood, and
   what the client wants. This is your brief — design to it.
2. `$ARTIFACTS_DIR/brand/brand-system.json` — `headline`, `tagline`, `sections[]` (the per-section copy deck:
   `{key,title,body}`), `mood`, and the palette/fonts (already applied as CSS variables — see Phase 3).
3. `$ARTIFACTS_DIR/site/site-plan.json` — the planned `sections`, `modules`, `cta`, **`images[]`** (the
   generated section images: each has an `id`; the file is at `images/<id>.png` relative to the page), and
   **`testimonials[]`** (`{quote, author, role}` — social proof to render as its own section).
4. `$ARTIFACTS_DIR/plan.json` — `before_after_enabled`, `showcase_enabled` (context only; the assembler handles
   the marquee/before-after modules if enabled).
5. List `$ARTIFACTS_DIR/site/images/` — the actual generated `<id>.png` files you may place (reference each as
   `images/<id>.png`). **Use ONLY these images. NEVER a stock/Unsplash/Pexels/placeholder URL — that is the exact
   failure this rebuild fixes.**

## Phase 2: DESIGN (craft, don't stitch)
Design a cohesive scroll experience for the content below the hero, tuned to the mood in `intake.json`:
- **A clear narrative**: an opening statement → what they do (with the generated imagery) → how/process or proof
  → a strong closing CTA. Use the brand copy deck for substance; tighten and elevate it.
- **Real, varied layouts** — full-bleed image sections, two-column splits, an offset editorial block, a stat row,
  a quiet centered manifesto. Vary rhythm; avoid five identical stacked text blocks. Place the generated images
  where they carry weight (a wide architectural shot behind a statement; a detail beside copy).
- **Cinematic restraint** befitting the brand (for an understated-luxury builder: generous whitespace, large
  serif headings, slow fades — not flashy). Match the brand's register.
- **Testimonials section (REQUIRED when `site-plan.json` has `testimonials[]`):** build a dedicated social-proof
  section from those `{quote, author, role}` entries — as on-brand cards (a balanced row/grid, or a simple
  centered quote rotation), with the quote prominent and the author/role beneath. Place it as "proof" in the
  narrative (after services/process, before the CTA). Style with the brand variables; never skip it when the data
  exists.
- **Motion**: give elements the `reveal` class (the page already runs a bidirectional IntersectionObserver that
  toggles `.revealed` on enter/exit — so just add `class="reveal"` to anything that should fade/slide in; you do
  NOT write the observer). Optionally a subtle parallax/transform via a tiny inline style is fine, but keep JS out.

## Phase 3: WRITE `$ARTIFACTS_DIR/site/content.html`
Write the body as a single fragment: an optional leading `<style>` block of **bespoke section CSS**, then the
content `<section>`s in order, ending with the CTA section. **HARD RULES:**
- **Use the brand CSS variables** (already defined on `:root` by the assembler): `var(--color-bg)`,
  `var(--color-primary)`, `var(--color-secondary)`, `var(--color-accent)`, `var(--color-text)`,
  `var(--font-heading)`, `var(--font-body)`. Do not hardcode brand colors/fonts — read them from the variables so
  the page stays cohesive with the hero.
- **Generous, responsive spacing** — use `clamp()` for section padding and type (e.g.
  `padding: clamp(4rem,10vh,9rem) clamp(1.5rem,6vw,6rem)`). Every section needs comfortable horizontal padding
  on BOTH sides (no flush-left text — that was a bug). At least one `clamp()` must appear in your CSS.
- **NEVER cramp text into a narrow column** (this is the #1 layout failure). Every text/copy column must be a
  COMFORTABLE reading width — target a line length of ~45–75 characters (about `min(92vw, 34–48rem)`). A column
  where words wrap one-per-line, or text squeezed into a sliver beside a large empty area, is BROKEN. Concretely:
  - In a two-column section (copy + image), the copy column must be SUBSTANTIAL (≈ a `1fr 1fr` split or copy
    even wider — never `0.4fr` text + a giant image, and never text confined to ~1/4 of the width with dead
    space). Both columns earn real width.
  - Do NOT nest grids/flex/columns in a way that collapses a child to near-zero width (e.g. a `grid` inside an
    already-narrow cell, or a fixed tiny track). Process "steps" / numbered lists belong in a row or a wide
    column, not a thin stack of one-word lines.
  - Use the FULL content width on purpose — fill it or center it; never leave a huge dead zone beside cramped
    text. A section that's all bunched on the left with empty right half is a FAIL.
- **Legibility**: never set text opacity below `0.7`. Ensure contrast against the dark background.
- **Images**: every photo is `<img src="images/<id>.png" ...>` (or a CSS `background-image:url('images/<id>.png')`)
  using ONLY the generated ids. Add descriptive `alt`. No external URLs anywhere.
- **Animation**: add `class="reveal"` to elements that should animate in (headings, image blocks, cards). Combine
  with your own classes freely (`class="reveal stat-card"`).
- **The LAST `<section>` is the CTA** — give it `class="cta-section"` (or `id="contact"`), the `cta.headline`, the
  `cta.button_label` as a button/link, and the contact geography from intake. Nothing after it.
- **Self-contained body fragment** — NO `<html>/<head>/<body>/<nav>`, NO hero/showcase, NO `<script>`. Just
  `<style>…</style>` + the `<section>`s.
- Aim for **4–6 sections**, each earning its place; cohesive, specific, beautiful.

### CHECKPOINT
- [ ] Wrote `$ARTIFACTS_DIR/site/content.html`: a `<style>` block + ordered `<section>`s ending in the CTA.
- [ ] Brand CSS variables used throughout (no hardcoded brand colors/fonts); ≥1 `clamp()`; both-side section padding.
- [ ] Every image is `images/<id>.png` from the generated set; ZERO stock/external image URLs.
- [ ] Animated elements use `class="reveal"`; no inline `opacity` below 0.7; no `<script>`/hero/showcase/nav.
- [ ] Last section is the CTA (`cta-section`/`#contact`).

## Phase 4: REPORT
Return a short JSON `{ "sections": <n>, "images_used": [<ids>], "notes": "<one line on the layout you crafted>" }`
and confirm `content.html` was written.
