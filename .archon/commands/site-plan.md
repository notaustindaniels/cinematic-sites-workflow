---
description: Produce the site plan (Step 3E) — per-section copy, module picks (subset of 18) with filled slots, nav, CTA. Structured content only, NO HTML.
argument-hint: (no arguments — reads brand-system.json, intake.json, plan.json, site/frames-count.json)
---

# Site Plan — Cinematic Site (Step 3E)

**Workflow ID**: $WORKFLOW_ID

You produce the structured content plan for the page. A `[DET]` assembler builds the actual `index.html` from vendored templates + this plan — so you write **structured content ONLY, never HTML**. This node runs with **fresh context** — load from files.

---

## Phase 1: LOAD (read these artifacts from $ARTIFACTS_DIR)

Read, in order:
1. `$ARTIFACTS_DIR/brand/brand-system.json` — `headline`, `tagline`, `hero_line`, `sections[]` copy deck, `industry`, palette/fonts (already applied by the assembler).
2. `$ARTIFACTS_DIR/intake.json` — `services`, `brands`, `customers`, `city`/`service_area`, `want_showcase`, `want_before_after`.
3. `$ARTIFACTS_DIR/plan.json` — the already-approved `modules[]` list, `showcase_enabled`, `before_after_enabled`, `scroll_heights`.
4. `$ARTIFACTS_DIR/site/frames-count.json` — `{ hero_frames, showcase_frames }`; if `showcase_frames > 0`, a showcase scroll section exists.

---

## Phase 2: PLAN THE CONTENT (Step 3E + 3C rules)

- **Sections** (Step 3C #7): Hero, About/Story, Services/Features, Stats, Contact/CTA. Write final per-section `copy` grounded in the brand copy deck and exact geography. No placeholder text.
- **Modules**: choose from the already-approved `plan.json.modules[]` (subset of the 18). MANDATORY rules (Step 3E): if `intake.brands` is non-empty include `brand-logo-marquee` (never a text list); if before/after is enabled include `before-after-slider`. Fill each module's content slots per the catalog:
  - `brand-logo-marquee`: `{ label, items: [{ name, img? }] }` (from intake brands)
  - `counter-animate`: `{ items: [{ target, suffix, label }] }`
  - `typewriter`: `{ phrases: [string] }`
  - `before-after-slider`: `{ title, pairs: [{ after, before, caption }] }` (the assembler auto-fills pairs from before/after assets; still provide a title)
  - `stagger-grid`: `{ items: [{ img, title, desc }] }`
  - `liquid-glass`: `{ items: [{ icon?, heading, text }] }` — provide 2–3 cards of REAL service/value copy (a short symbol per `icon` is optional). Never leave the default cards.
  - `parallax-sections`: `{ heading, text }` — `text` is one or more real body paragraphs (string or array of strings); optional `image` (a real photo URL).
  - all others (flip-cards, accordion-slider, horizontal-scroll, reveal-text, kinetic-text, glitch-text, marquee, image-trail, magnetic-buttons, svg-draw): **always** provide a real `heading` AND a real `text` (short sentence) so no vendored sample copy survives — the assembler overrides the first heading + first paragraph. Omit `slots` only for purely decorative modules with no text (e.g. `scroll-progress`).
- **CTA is the LAST section** (Step 3C #8) — write a compelling `cta.headline` and `cta.button_label`.
- **IMAGERY (NEW — no stock photos, ever):** for every section/module that shows a photo (a `parallax-sections` background, a `stagger-grid` item, an image-bearing content section), write a **business-specific Flux image prompt** so a real image is generated for it — never a stock placeholder. Collect them in an `images[]` array: each entry `{ "id": "<short-slug>", "prompt": "<a vivid, photoreal Flux prompt grounded in THIS business: its subject, materials, palette, light, geography, and the brand mood from brand-system.json>", "usage": "<which section/module + slot it fills, e.g. 'parallax:What We Build' or 'stagger:0'>" }`. Then **reference that id** in the module's image slot as `"image": "img:<id>"` (the assembler swaps `img:<id>` for the generated file). Write a DISTINCT prompt per image (variety — different rooms/vantages/details), all on-brand. Aim for 2–5 images total (the most image-forward sections).
- **use_looping_hero**: `'true'` ONLY if the user explicitly asked for a looping background video; otherwise `'false'` (default scroll-frame hero).
- "GO ALL OUT" (Step 3C #12): every section earns something animated/interactive via its modules. Do not write any HTML/CSS/JS — only structured content.

---

## Phase 3: GENERATE — fill the schema and write the artifact

Return the node's `output_format` JSON with EXACTLY these fields:
- `nav_links` — array of strings
- `sections` — array of `{ key, copy }` objects (about, services, stats/process, contact at minimum)
- `modules` — array of `{ name, slots }` objects (name from the approved list; slots filled per catalog, or omitted where optional). Image slots reference generated images as `"img:<id>"`.
- `images` — array of `{ id, prompt, usage }` objects: the business-specific Flux prompts for every photo the page shows (2–5). NEVER a stock URL anywhere.
- `cta` — object `{ headline, button_label }`
- `use_looping_hero` — `'true'`|`'false'` (string)

**Required:** `sections, modules, cta`. (`nav_links`, `images`, `use_looping_hero` recommended — include `images` whenever any module shows a photo.) Booleans are quoted strings.

**Write the artifact (convention #2):** write the EXACT JSON object you return to `$ARTIFACTS_DIR/site/site-plan.json`. The `assemble-site` script reads it to build `index.html`.

### PHASE_3_CHECKPOINT
- [ ] Every module name is from the approved `plan.json.modules[]`
- [ ] `brand-logo-marquee` present iff `intake.brands` non-empty; `before-after-slider` present iff before/after enabled
- [ ] Module slots filled per the catalog (marquee/counter/stagger items, typewriter phrases, liquid-glass items, parallax heading+text); EVERY text-bearing module has real heading+text — no vendored sample copy survives (no "Feature", "Built to Last" defaults, no placeholder bodies)
- [ ] CTA is the last content beat; `cta.headline` + `cta.button_label` written
- [ ] Every photo-bearing module references a generated image (`"img:<id>"`); `images[]` has a distinct, on-brand Flux prompt per id; ZERO stock/Unsplash/placeholder URLs anywhere
- [ ] No HTML/CSS/JS anywhere — structured content only
- [ ] Copy uses exact geography; no placeholder text
- [ ] `$ARTIFACTS_DIR/site/site-plan.json` written with the exact returned JSON

## Phase 4: REPORT

Return the JSON object (matching `output_format`). One-line note: section count, the module list, and whether the hero is scroll-frame or looping.
