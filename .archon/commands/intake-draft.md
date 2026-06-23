---
description: Draft a structured client intake brief (Step 0) from the user's request; never assume MUST-HAVEs — open questions instead.
argument-hint: (no arguments — reads the user's request from $ARGUMENTS)
---

# Intake Draft — Cinematic Site (Step 0)

**Workflow ID**: $WORKFLOW_ID

You are running **Step 0 (Client Intake)** of the `cinematic-site-kit-higgsfield` skill. Your ONLY job is to turn the user's request into one rigid intake record. You are NOT designing anything yet.

This node runs with **fresh context** — you have no memory of any prior turn. Everything you know comes from `$ARGUMENTS` below.

---

## Phase 1: LOAD

The user's original request is:

> $ARGUMENTS

Read it carefully. Decide the **mode**:
- `existing-site` — the user gave a URL to an existing website to rebuild / reference.
- `business-concept` — no existing site; you are building from a business idea.

If a URL is present, capture it in `existing_assets` and set `mode: existing-site`.

---

## Phase 2: EXTRACT (the skill's hard intake rules)

The skill's Step 0 is built on ONE law: **DO NOT ASSUME. DO NOT GUESS. DO NOT OFFER MULTIPLE CHOICE.**
A "window and door company" could manufacture, install, or repair — each is a different business with different copy. You will get the entire site wrong if you invent the answer.

**THE THREE MUST-HAVES — never fabricate these. If the user did not state them explicitly, you MUST leave the field empty/placeholder AND add a precise open question:**
1. **services** — what the company actually does, in their words (manufacture vs install vs repair vs showroom). Each distinct service is one array entry.
2. **city** + **service_area** — the EXACT city, not a region. "Central Florida" is NOT a city — if that is all you have, it goes in `open_questions` ("You said Central Florida — what city are you actually based in?").
3. **customers** — who actually buys from them, in their words. Never substitute "homeowners" or "high-end clients" as a guess.

Be a **pleasantly persistent colleague**: for anything vague, incomplete, or ambiguous (regional location, vague service scope, unnamed brands, generic customer, vague differentiator, unclear ticket band), write a specific follow-up into `open_questions[]` rather than filling the field with an assumption. Better one too many questions than wrong copy.

For mood/aesthetic, a light guess is acceptable as a starting point but still ask for a one-word vibe if absent. For services / city / customers, a guess is NEVER acceptable.

Capture the optional intent signals when the user mentioned them (otherwise default conservatively and ask):
- `want_showcase` — multi-scene showcase video requested? (default `'false'` unless requested)
- `want_before_after` — before/after comparison pairs requested? (default `'false'` unless requested)
- `brands` — specific partner/vendor brands they named (drives the logo marquee). Empty array if none named.
- `deploy_target` — `vercel` or `local` (default `local` if not stated, and ask).

---

## Phase 3: GENERATE — fill the schema and write artifacts

Produce a JSON object with EXACTLY these fields (this is the node's `output_format`; fill every one):

- `mode` — enum: `existing-site` | `business-concept`
- `business_name` — string (if unknown, your best placeholder AND an open question)
- `services` — array of strings (≥1; MUST-HAVE — empty + open question if unknown)
- `city` — string (MUST-HAVE)
- `service_area` — string (MUST-HAVE)
- `customers` — string (MUST-HAVE)
- `ideal_customer` — string (the customer they want more of)
- `ticket_band` — string (rough average spend band, e.g. "$2k jobs" vs "$40k projects" — informs luxury vs value aesthetic; never shown on site)
- `mood` — array of strings (≥1 vibe word)
- `references` — array of strings (admired sites/brands)
- `donots` — array of strings (things they explicitly do NOT want)
- `want_showcase` — enum: `'true'` | `'false'` (string, quoted)
- `want_before_after` — enum: `'true'` | `'false'` (string, quoted)
- `brands` — array of strings (named partner/vendor brands)
- `deploy_target` — enum: `vercel` | `local`
- `domain` — string (custom domain or "" for preview link)
- `existing_assets` — string (URL of existing site, logo/photo notes, or "")
- `open_questions` — array of strings (every unconfirmed item, phrased as a direct question)

**Required (must be present):** `mode, business_name, services, city, service_area, customers, mood, want_showcase, want_before_after, deploy_target, open_questions`.

Booleans are the **quoted strings** `'true'`/`'false'`, never bare booleans.

**Write both artifacts (convention #2 — persist the exact JSON):**
1. `$ARTIFACTS_DIR/intake.json` — the EXACT JSON object above, byte-for-byte the same object you return.
2. `$ARTIFACTS_DIR/intake-brief.md` — a short human-readable brief: business name, mode, services (bulleted), city/service area, customers + ideal customer, ticket band, mood, brands, want_showcase/want_before_after, deploy target — and a clearly headed **"Open Questions"** section listing every entry of `open_questions[]`.

Keep `intake.json` and `intake-brief.md` consistent (same facts, same open questions).

### PHASE_3_CHECKPOINT
- [ ] `mode` chosen correctly (URL present ⇒ existing-site)
- [ ] No MUST-HAVE (services / city / customers) was fabricated — anything unconfirmed is empty AND mirrored in `open_questions`
- [ ] A region-only location (e.g. "Central Florida") was pushed into `open_questions`, not written into `city`
- [ ] `want_showcase`, `want_before_after` are quoted `'true'`/`'false'`
- [ ] All required fields present; every schema field filled
- [ ] `$ARTIFACTS_DIR/intake.json` written with the exact returned JSON
- [ ] `$ARTIFACTS_DIR/intake-brief.md` written and consistent with the JSON

## Phase 4: REPORT

Return the JSON object (matching `output_format`). In a one-line note, state the mode and how many open questions remain for the human to resolve at the intake gate.
