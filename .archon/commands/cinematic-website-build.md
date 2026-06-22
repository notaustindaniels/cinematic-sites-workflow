---
description: Step 3 of the cinematic site pipeline — build the scroll-animated single-file HTML site from the approved video + brand system.
argument-hint: (no arguments — reads the scene manifest + brand system from artifacts)
---

# Cinematic Site — Step 3: Website Build

**Workflow ID**: $WORKFLOW_ID

You have the **cinematic-site-kit-higgsfield** skill preloaded. Run its **Step 3 — Website
Build**. This node starts fresh — load everything from artifacts.

---

## Phase 1: LOAD

- Read **`$ARTIFACTS_DIR/scenes/scene-manifest.md`** (asset paths) and
  **`$ARTIFACTS_DIR/brand/brand-system.md`** (colors, fonts, copy).
- Chosen hero variant from the user: **$scene-gate.output** — if they named a variant, use it;
  otherwise use the manifest's recommended hero.

## Phase 2: EXECUTE

Follow the skill's Step 3:

1. **Extract frames** from the chosen hero video with ffmpeg (`fps=30`, scale to 1920 wide),
   compress, into `./frames/`. (If the user explicitly chose Mode B looping background, skip
   extraction and use a `<video>` tag instead.)
2. **Build the scroll-frame hero** — tall section + sticky `<canvas>` + the scroll→frame-index
   engine, wired to the real frame count. Hero text in the bottom gradient zone.
3. **Build the page** — nav, About/Story, Services, Stats, Contact/CTA-last, using brand-system
   copy and CSS-variable colors + Google Fonts.
4. **Integrate 3–5 cinematic modules** from the kit's `cinematic-modules/` (pick by industry).
   Brands → Brand Logo Marquee (never a text list). Before/after → the draggable slider module.
   Showcase video (if present) → its own second scroll-frame section with text overlays.
5. Honor the kit's design-system rules: dark-first, `clamp()` type, legible text (no
   sub-0.7-opacity), mobile at 375px, and **all scroll animations BIDIRECTIONAL** (re-hide on
   exit, re-animate on re-entry — IntersectionObserver both ways, never `unobserve`).

Everything inline in one self-contained `index.html`.

## Phase 3: GENERATE

- Build into the repo working dir at **`./<brand-slug>/index.html`** with its `frames/` (and
  `showcase-frames/`, assets) alongside.
- Copy the finished site to **`$ARTIFACTS_DIR/site/`** so it's durable and easy to open.
- Write **`$ARTIFACTS_DIR/site/build-notes.md`**: the site path, modules used, hero frame count,
  and anything the user might want to tweak.

### PHASE_3_CHECKPOINT (the kit's build checklist — abbreviated)
- [ ] Scroll-frame hero advances on scroll, holds last frame, page continues below
- [ ] 3+ modules integrated; brands as marquee; before/after as slider (if applicable)
- [ ] All scroll animations bidirectional; all text legible; responsive at 375px
- [ ] No placeholder text; Contact/CTA is the last scrollable section

## Phase 4: REPORT

Give the exact path to open (`$ARTIFACTS_DIR/site/index.html`), note the modules used, and tell
the user to reject with tweaks or approve to deploy.
