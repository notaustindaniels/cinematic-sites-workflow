---
description: Step 1 of the cinematic site pipeline — brand analysis. Extract or invent the brand identity and produce a reviewable Brand Card HTML.
argument-hint: (no arguments — reads the approved intake brief from artifacts)
---

# Cinematic Site — Step 1: Brand Analysis

**Workflow ID**: $WORKFLOW_ID

You have the **cinematic-site-kit-higgsfield** skill preloaded. Run its **Step 1 — Brand
Analysis**. This node starts fresh — load all context from artifacts.

---

## Phase 1: LOAD

- Read **`$ARTIFACTS_DIR/intake-brief.md`** — the source of truth for the business.
- Read the user's final approval note (extra details): **$intake-gate.output**
- Every decision here (palette, type, tone, copy) must trace back to the brief — mood
  keywords, customer profile, and ticket size drive luxury-vs-value, dark-vs-light, formality.

## Phase 2: EXECUTE

Follow the skill's Step 1 branch that matches the brief's **Mode**:

- **existing-site** → fetch the URL, extract real hex colors, fonts, logo, copy, imagery,
  industry; enhance a thin palette into a richer 5-color set. Save grabbed assets to
  `./brand-assets/`.
- **business-concept** → invent a 5-color palette + Google Font pairing + headline, tagline,
  hero line, and 3–4 section copy blocks that fit the industry and mood.

Use the kit's **`brand-card-template.html`** (in the skill directory) as the base for the card.

## Phase 3: GENERATE

- **`$ARTIFACTS_DIR/brand/brand-card.html`** — the styled, reviewable card: name + industry
  badge, 5 color swatches with hex labels, type samples, headline/tagline/hero line, a 2–3
  sentence creative brief, mood pills.
- **`$ARTIFACTS_DIR/brand/brand-system.md`** — machine-usable spec for later steps: exact hex
  values (as CSS-var names), font families + weights + Google Fonts URL, the full copy deck,
  and the creative/theme direction. Step 2 and Step 3 both read this file.

### PHASE_3_CHECKPOINT
- [ ] brand-card.html opens standalone and shows all sections
- [ ] brand-system.md has concrete hex + fonts + copy (no placeholders)
- [ ] Geography/services/customers match intake-brief.md exactly (no invented cities/brands)

## Phase 4: REPORT

Point the user to `$ARTIFACTS_DIR/brand/brand-card.html`, summarize the direction in 2–3
sentences, and remind them: reject the gate with adjustments, or approve to generate scenes.
