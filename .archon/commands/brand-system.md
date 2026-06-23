---
description: Produce the brand system (Step 1) — 6-digit hex palette, real Google Fonts + URL, copy deck — from the approved intake.
argument-hint: (no arguments — reads $ARTIFACTS_DIR/intake.json and intake-brief.md)
---

# Brand System — Cinematic Site (Step 1)

**Workflow ID**: $WORKFLOW_ID

You are running **Step 1 (Brand Analysis)** of the `cinematic-site-kit-higgsfield` skill. You produce ONE machine-readable brand system that every downstream node (brand card, generation plan, site assembler) consumes. This node runs with **fresh context** — load everything from files.

---

## Phase 1: LOAD (read these artifacts from $ARTIFACTS_DIR)

Read, in order:
1. `$ARTIFACTS_DIR/intake-brief.md` — the approved human-readable brief.
2. `$ARTIFACTS_DIR/intake.json` — the structured intake (`mode`, `business_name`, `services`, `city`, `service_area`, `customers`, `ideal_customer`, `ticket_band`, `mood`, `references`, `brands`, `existing_assets`, `donots`).

Use the Step-0 answers to drive EVERY decision: mood keywords → palette + dark/light + font pairing; ticket band → luxury/refined (high ticket) vs clean/approachable/trustworthy (low ticket); customers → tone of copy; city/service_area → exact geography in copy (no wrong cities).

---

## Phase 2: EXECUTE

**If `mode` is `existing-site`** (a URL is in `existing_assets`): use the **WebFetch** tool on that URL FIRST and extract the REAL brand:
- dominant background, primary accent, secondary accent, accent, and text colors — as actual 6-digit hex values;
- the real heading and body font families;
- real copy: headline, tagline, about/services/process/contact text, address/hours if present.
If the site exposes too few/too generic colors, enhance into a richer 5-color palette with complementary/analogous shades — but anchor on the real ones. Do NOT invent a city, brand, or service that is not in the brief or on the fetched site.

**If `mode` is `business-concept`:** invent a palette + fonts + copy that fit the industry, mood, and ticket band from intake. Stay strictly within the brief — never introduce a city/brand/service that intake did not provide.

Hard rules (the skill + contract):
- Every hex is **exactly 6 digits**, `#` + 6 hex chars (the brand card concatenates `{COLOR_PRIMARY}22`/`44` for alpha, so 3-digit or 8-digit hex breaks it).
- Fonts must be **REAL Google Fonts** (e.g. "Playfair Display", "Inter", "Cormorant Garamond", "Space Grotesk"). Provide a working `google_fonts_url` that loads BOTH families (e.g. `https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;600&display=swap`).
- `font_heading`/`font_body` are CSS font-family stack strings (e.g. `'Playfair Display', serif`); `font_heading_name`/`font_body_name` are the plain display names.
- Geography in copy must match `city`/`service_area` exactly.
- Default to a dark-first cinematic palette (video pops on dark) unless the brief/donots say otherwise.

---

## Phase 3: GENERATE — fill the schema and write the artifact

Produce a JSON object with EXACTLY these fields (this is the node's `output_format`; fill every one):

- `business_name` — string
- `industry` — string (classify: restaurant, retail, SaaS, beauty, architecture, automotive, home-services, etc.)
- `color_bg` — 6-digit hex (`^#[0-9a-fA-F]{6}$`)
- `color_primary` — 6-digit hex
- `color_secondary` — 6-digit hex
- `color_accent` — 6-digit hex
- `color_text` — 6-digit hex (near-white on dark — must be legible)
- `font_heading` — CSS font-family stack string
- `font_body` — CSS font-family stack string
- `font_heading_name` — plain display name
- `font_body_name` — plain display name
- `google_fonts_url` — a real Google Fonts `<link href>` URL loading both families
- `headline` — string (the hero H1)
- `tagline` — string (hero subline)
- `hero_line` — string (a short bottom-of-hero line)
- `sections` — array of `{ key, title, body }` objects (the copy deck: about, services, process, contact at minimum)
- `theme_direction` — string (2-3 sentence creative brief)
- `mood` — array of EXACTLY 4 strings (mood keyword pills)

**Required:** all of the above. `mood` must have exactly 4 entries. Every hex must satisfy the 6-digit pattern.

**Write the artifact (convention #2):** write the EXACT JSON object you return to `$ARTIFACTS_DIR/brand/brand-system.json` (create the `brand/` dir). A downstream `[DET]` script substitutes these into the brand card and the site CSS, so field names and hex format must be exact.

### PHASE_3_CHECKPOINT
- [ ] existing-site mode: WebFetched the URL and extracted REAL hex/fonts/copy (not invented)
- [ ] Every color is a valid 6-digit hex (`#` + 6 chars)
- [ ] Both fonts are real Google Fonts and `google_fonts_url` loads BOTH families
- [ ] `mood` has exactly 4 entries
- [ ] Copy uses the exact city/service area; no invented city/brand/service
- [ ] `sections[]` cover at least about / services / process / contact
- [ ] `$ARTIFACTS_DIR/brand/brand-system.json` written with the exact returned JSON

## Phase 4: REPORT

Return the JSON object (matching `output_format`). One-line note: the palette in hex, the two font names, and whether brand was extracted (existing-site) or invented (business-concept).
