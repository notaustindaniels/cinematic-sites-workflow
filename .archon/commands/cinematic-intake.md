---
description: Step 0 of the cinematic site pipeline — client intake. Draft the business brief and surface the open questions that must be answered before any copy is written.
argument-hint: a business name + description, or an existing site URL (whatever the user provided)
---

# Cinematic Site — Step 0: Client Intake

**Workflow ID**: $WORKFLOW_ID

You have the **cinematic-site-kit-higgsfield** skill preloaded. This command runs its
**Step 0 — Client Intake**. Follow that step's rules exactly; this file only orchestrates.

---

## Phase 1: LOAD

- User's initial request: **$ARGUMENTS**
- Tooling preflight (JSON): `$preflight.output`
  - If `higgsfield_authed` is `false`, note in your report that the user must run
    `higgsfield auth login` before Step 2 (generation) — but do NOT block intake.
- Read the skill's Step 0 question framework before drafting anything.

## Phase 2: EXECUTE — draft, don't interrogate

You cannot have a live back-and-forth inside this node, so instead:

1. Extract everything the user already told you in `$ARGUMENTS`.
2. If a URL was provided, fetch it (WebFetch/curl) and note brand signals (this flips the
   build into "existing site" mode for Step 1).
3. Apply the skill's **CRITICAL RULE: DO NOT ASSUME. DO NOT OFFER MULTIPLE CHOICE.** Where a
   fact is missing or ambiguous, write an explicit open question instead of guessing — these
   get answered at the approval gate. Pay special attention to the three the skill says you
   MUST get right: (2) what the company actually does, (3) exact city + service area,
   (4) who the customers are. Also capture mood/aesthetic, before/after + showcase-video
   wishes, brand logos, and deployment preference (Vercel vs local).

## Phase 3: GENERATE

Write **`$ARTIFACTS_DIR/intake-brief.md`** with these sections (use "❓ OPEN:" for anything
unconfirmed — never fill a gap with an assumption):

- **Mode**: `existing-site` (URL given) or `business-concept`
- **Business** — name, what they do (specific services/products), what they're known for
- **Location & service area** — exact city + coverage
- **Customers** — typical + ideal, rough ticket size (for aesthetic, not the site)
- **Mood / aesthetic** — keywords, references, hard "do-nots"
- **Content wishes** — before/after pairs? longer showcase video? brand logos to feature?
- **Deployment** — `vercel` or `local`; custom domain or preview link
- **Existing assets** — palette/logo/fonts/photos or URL findings
- **OPEN QUESTIONS** — the numbered list the user needs to answer at the gate

## Phase 4: REPORT

Output a tight summary: your current understanding in 3–5 sentences, then the numbered
**OPEN QUESTIONS**. Tell the user: *reject the upcoming gate with your answers to refine, or
approve once it's accurate.* Do not proceed to brand analysis — the gate handles that.
