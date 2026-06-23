# Plan: Convert `cinematic-site-kit-higgsfield` into a Fully-Tunable Archon Workflow

> ⚠️ **PARTIALLY SUPERSEDED — read `CINEMATIC-ARCHON-REBUILD-PLAN.md` first.**
> This document's **showcase keyframe model is WRONG** and caused repeated generation failures: the
> "three-phase chain" (`wide → setting → motion`, 2 clips/mechanism) in §6, §7.3, §13, and Appendix B
> asks Nano Banana Pro to invent a new space per scene, which it botches every time. **Use the 2-frame
> model in `CINEMATIC-ARCHON-REBUILD-PLAN.md §1` instead.** Everything else here (the determinism layer,
> the pinned Higgsfield CLI §8, the artifact contract §9, the node-graph skeleton) is still valid.
> Precedence: SKILL.md > REBUILD-PLAN.md > this document.

**Goal (verbatim intent):** turn the `cinematic-site-kit-higgsfield` Claude *skill* into an Archon
*workflow* with such fine-grained tuning of **every** aspect that **a model far weaker than Claude
Opus** can produce **output of equivalent quality** to Opus running the original skill — purely by
executing the workflow.

This document is the build specification. It is deliberately exhaustive. It is validated against:

- the live skill at `~/.claude/skills/cinematic-site-kit-higgsfield/SKILL.md` (1154 lines) and its
  18 `cinematic-modules/` + `brand-card-template.html`;
- the **source-of-truth Archon schema** (the Zod schemas in `archon-1/packages/workflows/src/`),
  the `archon` skill references, and 8 real production workflow YAMLs;
- the **live Higgsfield CLI** (`higgsfield model get …` run against an authenticated account);
- the **prior attempt** committed to this repo (`HEAD:.archon/…`, since deleted from the tree),
  whose weaknesses this plan exists to fix.

> Status legend used throughout: **[DET]** = deterministic node (bash/script, no AI). **[AI]** =
> AI node constrained by schema/template. **[CRITIC]** = AI verifier node. **[GATE]** = human
> approval node. **[LOOP]** = loop node.

---

## ▶ For the implementer (read this first)

**This document is a self‑contained build spec — it is the deliverable, not the build.** To
execute it, open a **fresh Claude Code conversation** and **use the Archon skill** to author the
workflow, following this spec. You do not need the conversation that produced this document;
everything required is here:

- **Node graph & wiring:** §4, §6, and the validated YAML excerpt in **Appendix A**.
- **Schemas** (the externalized checklists the AI nodes fill): **Appendix B**.
- **Critic rubrics** (verbatim from the skill): **Appendix C**.
- **Pinned, live‑verified Higgsfield commands** (exact flags, the real `--json`→`.result_url`
  parse, the fast‑mode‑720p reality): **§8**.
- **The build order:** §15.

**Two things were done at planning time to de‑risk the build (you inherit the *results*, captured
in this document — the build artifacts themselves were removed so this handoff is just the spec):**
1. A complete **37‑node skeleton** was instantiated and passed `archon validate` cleanly (0
   errors), proving every construct in this spec is schema‑legal. The validated **YAML excerpt in
   Appendix A** shows the exact, proven syntax for every construct. **Build a fresh `.archon/` via
   the Archon skill** following this spec — Appendices B/C and §7 hold the real content each node
   must contain (the skeleton's node *bodies* were deliberately concise placeholders).
2. The hero pipeline was **live‑tested end‑to‑end** against the real API with the two pinned
   models. The verified results — the real `--json`→`.result_url` shape, the fast‑mode‑720p
   behavior, and exact credit costs — are baked into **§8** and **§12 L4**. This is why §8's CLI
   reference is verified, not guessed.

**Models are fixed and verified:** images → `nano_banana_2` (Nano Banana Pro); video →
`seedance_2_0 --mode fast` (Seedance 2.0 Fast, delivers 720p in fast mode). Do not substitute.

---

## Table of Contents

1. [Why the prior attempt cannot hit the goal](#1-why-the-prior-attempt-cannot-hit-the-goal)
2. [The core thesis: move judgment out of the model and into the workflow](#2-the-core-thesis)
3. [The five levers (and the granularity principle)](#3-the-five-levers)
4. [Target architecture (full DAG)](#4-target-architecture-full-dag)
5. [Repository layout & self-containment](#5-repository-layout--self-containment)
6. [Node-by-node specification](#6-node-by-node-specification)
7. [Externalizing the creative judgment (schemas, templates, rubrics)](#7-externalizing-the-creative-judgment)
8. [Pinned Higgsfield command reference (gap-closed)](#8-pinned-higgsfield-command-reference)
9. [The artifact & variable contract](#9-the-artifact--variable-contract)
10. [The complete tuning surface (every knob, where it lives)](#10-the-complete-tuning-surface)
11. [Gap-closure table (skill bugs this plan fixes)](#11-gap-closure-table)
12. [Validation plan — how we prove it is bulletproof](#12-validation-plan)
13. [Coverage matrix — every skill element → mechanism](#13-coverage-matrix)
14. [Risks & mitigations](#14-risks--mitigations)
15. [Implementation sequence (checklist)](#15-implementation-sequence)
16. [Appendix A — representative validated workflow YAML](#appendix-a)
17. [Appendix B — key `output_format` schemas (verbatim)](#appendix-b)
18. [Appendix C — critic rubrics (verbatim from the skill checklists)](#appendix-c)

---

## 1. Why the prior attempt cannot hit the goal

The prior attempt (`HEAD:.archon/workflows/cinematic-site-higgsfield.yaml` + 5 command files) is a
**competent thin wrapper**: 5 big AI command nodes (intake → brand → scenes → build → deploy), each
with `skills: [cinematic-site-kit-higgsfield]` injected, separated by human approval gates with
`on_reject` rework. It correctly uses `interactive: true`, `worktree.enabled: true`, model tiering
(`opus` on scene-gen/build), and persists artifacts to `$ARTIFACTS_DIR`.

**But it delegates 100% of the quality to the model.** Every command file literally says some
variant of *"You have the skill preloaded. Run its Step N. Follow that step's rules exactly; this
file only orchestrates."* That means a weak model still has to:

- read 1154 lines of nuanced guidance and *hold all of it in working memory*;
- make ~30 implicit creative judgments unaided (the Director's Brief, "camera always moving",
  the 3‑phase keyframe chain, the NB‑Pro‑hides‑labels / Seedance‑needs‑labels inversion, the
  5‑layer Seedance formula, geometry‑not‑labels, bidirectional animations, module selection);
- self‑verify its own work with no external check;
- hand‑run the Higgsfield CLI (correct flags, parse the result URL, download, validate);
- write a ~1000‑line single‑file scroll‑animated site from scratch.

A weaker model fails at all five. Injecting the skill into a node changes *nothing* about the
cognitive load — it is the same "read the skill and apply it well" task that the model already
fails at when it runs the skill directly. **The wrapper adds gating and isolation; it does not add
quality.** Three concrete latent bugs also exist (see §11): the preflight emits **unquoted JSON
booleans** that make `when:` string comparisons fragile; generation runs *inside* AI nodes so flag
spelling and URL parsing are at the mercy of the model; and the command files inherit the skill's
references to a `nbpro-edit.sh` helper and a "14‑ref limit" that **do not exist on disk**.

> The fix is not a better prompt. The fix is **architectural**: decompose, determinize, schematize,
> verify, and gate so that the model's residual job at each step is small enough that a weak model
> cannot get it meaningfully wrong.

---

## 2. The core thesis

**Quality in the original skill = (deep model judgment) × (1154 lines of guidance).** Remove the
deep model and quality collapses — unless the *workflow structure* supplies what the model can no
longer supply. So the entire design principle is:

> **For every point where Opus would "just know," the workflow must instead compute the answer,
> hand the model a fill‑in‑the‑blanks template, force the output through a rigid schema, run a
> critic loop against the skill's own checklist, or ask the human — so the weak model never has to
> remember a rule, invent a structure, judge its own output unaided, or do mechanical work.**

Concretely, the original skill's quality comes from ~6 "load‑bearing" cognitive acts. The table
below is the spine of the whole plan — each act and how the workflow externalizes it:

| Load-bearing act in the skill | What Opus does implicitly | How the workflow externalizes it so a weak model can't fail |
|---|---|---|
| **Get the business right** (Step 0) | Asks open questions, refuses to assume, pesters for specifics | Structured intake schema with required fields + a **[DET]** completeness check that *refuses to advance* while any MUST‑HAVE field is `OPEN`; gate folds in answers via `on_reject` |
| **Director's Brief** (Step 2B) | Answers 5 questions, picks the hero moment & camera journey | A `director_brief` **schema** with required fields (product, hero_moment, camera_start/path/end, transforms[], start/end frame prompts) + a **[CRITIC]** that fails it if the final frame ≈ first frame, or no spatial travel |
| **Video prompt craft** (Step 2C) | Writes a second‑by‑second timeline, camera always moving, subject motion layered | A `video_prompt` schema (≥4 timeline beats, each with `camera_motion` AND `subject_motion`) + **[CRITIC]** enforcing the camera‑moving rule, then a **[DET]** node runs the pinned CLI |
| **Keyframe chaining** (Step 2E) | 3‑phase chain, one mechanism/clip, NB‑Pro geometry vs Seedance labels | A `plan.json` state machine produced once and **[CRITIC]**‑verified, then a **[LOOP]** executes it one keyframe/clip at a time with per‑item critics; NB‑Pro vs Seedance prompt rules are two **separate inline templates** |
| **Build the site** (Step 3) | Writes the scroll engine, design system, picks/wires modules | The scroll engine, design‑system CSS, and all 18 modules are **vendored assets**; a **[DET]** assembler concatenates them; the model only emits a `site_plan` (copy + module picks) through a schema |
| **Self‑review** (every PAUSE) | Judges its own output against mental checklists | Each checklist becomes a **[CRITIC]** rubric (verbatim, Appendix C) + a **[GATE]** where the human sees a fully‑assembled, pre‑validated artifact |

If all six are externalized, the model's per‑node residual is: *fill these schema fields*, *write a
prompt to this template*, *pick from this list*, *write this copy*. A weak model does those
reliably. Everything mechanical (CLI calls, URL parsing, ffmpeg, HTML assembly, file checks, git,
deploy) is **[DET]** and has no model variance at all.

---

## 3. The five levers

Every node in this workflow is justified by one of these five levers. When designing a node, pick
the **lowest‑numbered** lever that can do the job (1 is most reliable, 5 is the backstop).

1. **DETERMINIZE.** Anything with a computable right answer is a `bash:`/`script:` node — no model.
   Frame extraction, JPEG compression, `ffprobe` duration/dimension checks, JSON
   validation/parsing, result‑URL parsing, HTML assembly from templates, module concatenation,
   file‑existence assertions, credit checks, git/deploy. *No model = no variance.*
2. **TEMPLATIZE.** Anything that is "fill in the blanks" ships as a complete, inline,
   copy‑paste‑ready artifact, **vendored into the repo** (`.archon/assets/cinematic/`): the
   scroll‑frame engine, the design‑system CSS, the 18 modules, the brand card, the Director's‑Brief
   template, the 5‑layer Seedance template, the NB‑Pro geometry template. The model fills slots; it
   never invents structure.
3. **SCHEMATIZE.** Every creative artifact the model *does* produce is forced through a rigid
   `output_format` JSON schema — required fields, enums, array minimums. The schema is the
   externalized checklist; a weak model literally cannot omit a step the schema demands.
4. **VERIFY‑AND‑LOOP.** Every schematized artifact and every generated asset is checked by (a) a
   **[DET]** validator where one exists, and (b) an **[AI CRITIC]** whose rubric is the skill's own
   quality checklist verbatim (Appendix C). The critic emits `PASS|FAIL` + reasons via
   `output_format`; a `loop:` regenerates until `PASS` or `max_iterations`.
5. **GATE.** At each of the skill's explicit `PAUSE` points, a human `approval:` node with
   `on_reject` rework is the final backstop. The human reviews a fully‑assembled, pre‑validated
   artifact and only says approve / reject‑with‑tweaks.

### The granularity principle (the most important structural change vs. the prior attempt)

The prior attempt has **1 AI node per skill step** (5 monoliths). This plan explodes each step into
**many micro‑nodes, each with exactly one narrow responsibility.** Example — Step 2 *hero* path
becomes ~10 nodes:

```
ref-prompt[AI/schema] → ref-gen[DET] → ref-critic[CRITIC]⟲ →
director-brief[AI/schema] → brief-critic[CRITIC]⟲ →
video-prompt[AI/schema] → prompt-critic[CRITIC]⟲ →
hero-gen[DET] → hero-validate[DET] → hero-variants[DET fan] → hero-gate[GATE]
```

Granularity is what lets levers 1–4 actually bite: a monolith can only be judged as a whole by a
human at the end (lever 5 only); a chain of micro‑nodes can be determinized, schematized, and
critic‑looped at every link.

---

## 4. Target architecture (full DAG)

The workflow name is **`cinematic-site`**. Workflow‑level config:

```yaml
name: cinematic-site
interactive: true            # REQUIRED — has approval gates + interactive loops (web UI delivery)
provider: claude
model: sonnet                # default tier; per-node overrides below (see §10 model map)
thinking: adaptive
worktree:
  enabled: true              # generates assets + a site + runs git/deploy → always isolate
```

> **Design note on the "weak model" target.** The premise is that *all* generative nodes can run on
> a weak model and still pass. Model tiering (§10) is therefore an **optional margin**, not a
> requirement: if a stronger model is available, point it only at the **critic** and
> **prompt‑author** nodes. With everything on the weak tier, the schemas + critics + determinism +
> gates still hold the line — that is the acceptance bar (§12).

### Phase map

```
A. PREFLIGHT & GUARDS            [DET] tooling/auth/credit probe → cancel-if-missing guards
        │
B. INTAKE                        [AI schema] draft brief → [DET] completeness check ⟲ → [GATE]
        │
C. BRAND                         [AI schema] brand-system.json → [DET] assemble brand-card.html
        │                        → [CRITIC] geo/brand consistency → [GATE]
        │
D. GENERATION PLAN               [AI schema] plan.json (hero + showcase chain + B/A pairs +
        │                        module picks + deploy) → [CRITIC] → [GATE]  (the "director plan")
        │
   ┌────┴───────────────┬────────────────────────┐
E. HERO (always)   F. SHOWCASE (when: want)   G. BEFORE/AFTER (when: want)
   static nodes    [LOOP] over keyframes &     [LOOP] over pairs
   + critic loops  clips driven by plan.json   (after → derive before)
   + [GATE]        + per-item critics + [GATE] + [GATE]
   └────┬───────────────┴────────────────────────┘
        │ (join: trigger_rule none_failed_min_one_success)
H. BUILD                         [DET] extract frames + [DET] assemble site from vendored
        │                        templates+modules ← [AI schema] site_plan (copy+modules)
        │                        → [DET] build-checklist asserts → [CRITIC] → [GATE]
        │
I. DEPLOY                        [DET] vercel/gh OR local finalize → copy deliverables to
                                 $ARTIFACTS_DIR → [report]
```

### Why loops for F and G, static nodes for E

A static DAG cannot have a runtime‑variable number of nodes. The **hero** path has fixed cardinality
(1 reference, 1 brief, 1 prompt, N variants) → static nodes. The **showcase** path has
`scenes × mechanisms × (3 keyframes + 2 clips)` — unknown until intake — so it is a **state‑machine
loop** driven by `$ARTIFACTS_DIR/showcase/plan.json` with `until_bash` checking a status field,
exactly like the production `archon-adversarial-dev.yaml` pattern. **Before/after** is a loop over
the pair list. Both F and G are gated by `when:` on the plan's booleans so they are skipped cleanly
when not requested (join uses `trigger_rule: none_failed_min_one_success` per the skill's own
good‑practices doc).

---

## 5. Repository layout & self-containment

The single biggest enabler of "weak model parity" is **not depending on the model to correctly read
and apply the skill.** We therefore **vendor** every reusable asset into the workflow repo so
**[DET]** nodes can assemble them mechanically. `skills:` injection is *retained as a secondary
knowledge aid* on the AI nodes (cheap, and it helps), but it is **never the source of truth** for
structure or code.

```
.archon/
├── config.yaml                         # repo-scoped config (assistant, worktree.baseBranch)
├── workflows/
│   └── cinematic-site.yaml             # the DAG (Appendix A)
├── commands/                           # one .md per AI node (phase-structured, schema-anchored)
│   ├── intake-draft.md
│   ├── brand-system.md
│   ├── generation-plan.md
│   ├── hero-ref-prompt.md
│   ├── hero-director-brief.md
│   ├── hero-video-prompt.md
│   ├── critic-generic.md               # parameterized critic (rubric passed via artifact)
│   ├── showcase-keyframe-prompt.md
│   ├── showcase-clip-prompt.md
│   ├── beforeafter-prompt.md
│   ├── site-plan.md
│   └── deploy-finalize.md
├── scripts/                            # [DET] logic (bun/uv) — the determinism layer
│   ├── preflight.ts                    # tooling+auth+credit probe → strict JSON
│   ├── hf-image.ts                     # pinned NB-Pro call: build cmd, run, parse URL, download, ffprobe-ish verify
│   ├── hf-video.ts                     # pinned Seedance call: same contract
│   ├── extract-frames.ts              # ffmpeg fps/scale + convert compress → frames/ + count
│   ├── assemble-site.ts                # build index.html from engine+CSS+modules+site_plan.json
│   ├── build-check.ts                  # asserts the skill's Step-3F checklist mechanically
│   ├── plan-step.ts                    # showcase state-machine advance/inspect helper
│   └── validate-json.ts                # generic schema/required-field asserts for gates
└── assets/
    └── cinematic/
        ├── scroll-frame-engine.js      # vendored from SKILL.md §3B (verbatim, FRAME_COUNT slot)
        ├── design-system.css           # vendored §3C rules as real CSS (vars + clamp scale)
        ├── brand-card-template.html    # vendored from the skill (18 {TOKENS})
        ├── showcase-overlay.css/.js    # vendored §2E overlay system
        └── modules/                    # all 18 vendored module fragments (catalog in §7.6)
            ├── before-after-slider.html
            ├── brand-logo-marquee.html
            └── … (16 more)
```

`config.yaml`:

```yaml
assistant: claude
worktree:
  baseBranch: main
defaults:
  loadDefaultCommands: true
  loadDefaultWorkflows: true
```

> **Vendoring is a one‑time [DET] setup step** (Phase 0 of implementation, §15): copy the engine JS,
> the §3C rules rendered as real CSS, the brand card, and the 18 modules out of the installed skill
> into `.archon/assets/cinematic/`. After that, the workflow is self‑contained and reproducible — a
> weak model never re‑derives any of this.

---

## 6. Node-by-node specification

Notation: each node lists **id**, **lever**, **type**, and the essential fields. Full legal YAML is
in [Appendix A]; schemas in [Appendix B]; rubrics in [Appendix C]. Every `output_format` field and
`when:` comparison uses **string** enums (`'true'`/`'false'`/`'PASS'`) so equality is reliable
(Archon's `when:` is string/number comparison only — good‑practices §2).

### Phase A — Preflight & guards

| id | lever | type | spec |
|---|---|---|---|
| `preflight` | 1 | `script:` (bun) `scripts/preflight.ts` | Probes `higgsfield/ffmpeg/ffprobe/jq/gh/vercel/git/convert` presence, `higgsfield account status` (auth), and credit balance. **Emits strict JSON with QUOTED string values**: `{"higgsfield":"true","higgsfield_authed":"true","ffmpeg":"true","vercel":"true","gh":"true","credits":"3000",…}`. `timeout: 60000`. |
| `require-higgsfield` | 5 | `cancel:` | `when: "$preflight.output.higgsfield == 'false'"` — clean cancel with install+login instructions. |
| `require-ffmpeg` | 5 | `cancel:` | `when: "$preflight.output.ffmpeg == 'false'"` — frame extraction is mandatory for scroll‑frame mode. |
| `warn-credits` | 1 | `bash:` | non‑blocking; `when: "$preflight.output.credits < '120'"` → echoes a low‑balance warning (a full hero+showcase run can exceed ~100–300 credits — see §8 cost table). Optional hard gate variant available. |

> **Fix vs prior attempt:** preflight is a **`script:` (bun)** emitting **quoted** strings, not a
> `bash:` printf of bare booleans. Bare `true`/`false` are JSON booleans; Archon's `.field` access
> returns the boolean and the `when:` string compare `== 'false'` is unreliable. Quoted strings make
> it deterministic (good‑practices: "model enums as the strings 'true'/'false'").

### Phase B — Intake

| id | lever | type | spec |
|---|---|---|---|
| `intake-draft` | 3 | `command: intake-draft` **[AI]** | `skills: [cinematic-site-kit-higgsfield]`. `depends_on:[preflight]`, `when: "$preflight.output.higgsfield=='true'"`. `output_format` = **intake schema** (Appendix B.1): required `mode`, `business_name`, `services[]`, `city`, `service_area`, `customers`, `mood[]`, `want_showcase`, `want_before_after`, `brands[]`, `deploy_target`, and an `open_questions[]` array for anything it could not confirm. **Rule baked into the prompt:** never fill a MUST‑HAVE (services/city/customers) with an assumption — put it in `open_questions` instead. Writes `$ARTIFACTS_DIR/intake-brief.md` (human‑readable) + the JSON is the node output. |
| `intake-check` | 1 | `script:` (bun) `validate-json` | Reads the intake JSON; asserts MUST‑HAVE fields are non‑empty and **not** present in `open_questions`. Emits `{"complete":"true|false","missing":[…]}`. |
| `intake-gate` | 5 | `approval:` **[GATE]** | `capture_response: true`. `message` shows the draft brief + open questions. `on_reject.prompt` folds `$REJECTION_REASON` into `intake-brief.md`, resolves answered questions, re‑asks vague ones (pleasantly persistent), `max_attempts: 6`. The human's final note → `$intake-gate.output` flows downstream. |

> The skill's intake is a live Q&A; a node can't converse mid‑run. The **draft‑then‑reject‑loop**
> pattern (kept from the prior attempt, strengthened with a schema + completeness check) reproduces
> the "do not assume / pester for specifics" behavior deterministically: the loop literally cannot
> reach Phase C with a MUST‑HAVE still open (combine `intake-check` with the human gate; optionally
> add a `cancel` if the human approves while `complete=='false'`, or simply rely on the gate copy +
> the brand‑phase critic that re‑checks geography/brands).

### Phase C — Brand

| id | lever | type | spec |
|---|---|---|---|
| `brand-system` | 3 | `command: brand-system` **[AI]** | `context: fresh`, `skills:[…]`. Reads `intake-brief.md` + `$intake-gate.output`. `output_format` = **brand‑system schema** (Appendix B.2): `color_bg/primary/secondary/accent/text` (6‑digit hex, regex‑enforced), `font_heading/body` (+ Google Fonts URL + display names), `headline/tagline/hero_line`, `sections[]` (about/services/process/contact copy), `theme_direction`, `mood[]` (exactly 4). Writes `brand/brand-system.json`. Existing‑site mode: fetch URL, extract real hex/fonts/copy first. |
| `brand-card` | 1 | `script:` (bun) `assemble-site`(card mode) | **[DET]** token‑substitutes `brand-system.json` into the vendored `brand-card-template.html` (18 `{TOKENS}`, incl. `{COLOR_PRIMARY}` concatenated with alpha `22`/`44` in CSS — so hex must be 6‑digit). Writes `brand/brand-card.html`. No model. |
| `brand-critic` | 4 | `command: critic-generic` **[CRITIC]** | Rubric (Appendix C.2): every color/font/copy decision traces to the brief; **no invented city or brand** appears that isn't in `intake-brief.md`; hex are valid 6‑digit; fonts are real Google Fonts. `output_format: {verdict: PASS|FAIL, reasons[]}`. |
| `brand-fix` | 4 | `command: brand-system` (rework) | `when: "$brand-critic.output.verdict=='FAIL'"`, regenerates from `$brand-critic.output.reasons`. (Implemented as a small 2‑node critic→fix or as a `loop:`; see Appendix A for the loop form.) |
| `brand-gate` | 5 | `approval:` **[GATE]** | shows `brand/brand-card.html`; `on_reject` revises card+system; `max_attempts: 5`. |

### Phase D — Generation plan (the externalized "director plan")

This is the keystone node and has no equivalent in the prior attempt. It converts the approved brand
+ intake into a **single machine‑executable plan** that the downstream loops execute *mechanically*.

| id | lever | type | spec |
|---|---|---|---|
| `generation-plan` | 3 | `command: generation-plan` **[AI]** | `context: fresh`, `model: <strong-tier>` (this is pure planning — worth the best available). Reads brand+intake. `output_format` = **plan schema** (Appendix B.3): `hero{ reference_prompt, want_end_frame, variants:int }`, `showcase{ enabled, scenes:[{ label, mechanisms:[{ event_category, wide/setting/motion keyframe specs, clip prompts }] }] }`, `before_after{ enabled, pairs:[{caption, after_prompt}] }`, `modules:[…from the 18…]`, `scroll_heights{hero,showcase}`, `deploy{target,domain}`. Writes `plan.json` (+ `showcase/plan.json` and `beforeafter/plan.json` slices with per‑item `status:"pending"`). |
| `plan-critic` | 4 | `command: critic-generic` **[CRITIC]** | Rubric (Appendix C.3): hero `reference_prompt` is 16:9 & specific; each showcase mechanism is **exactly one** mechanism with a 3‑phase chain; module picks include **Brand Logo Marquee iff brands exist** and **Before/After Slider iff before_after.enabled**; only requested optional assets are planned (no unrequested showcase/B‑A). `PASS|FAIL`+reasons → loop until pass. |
| `plan-gate` | 5 | `approval:` **[GATE]** | optional but recommended: human signs off on *what will be generated* (and the implied credit spend) **before** any paid generation. `capture_response:true`. |

### Phase E — Hero scene (always; static micro-nodes)

All depend forward in a chain. Each generation is **[DET]**; each creative artifact is
**[AI schema]** then **[CRITIC]⟲**.

| id | lever | type | spec |
|---|---|---|---|
| `hero-ref-prompt` | 3 | `command: hero-ref-prompt` **[AI]** | Emits NB‑Pro image prompt via the **image‑prompt template** (§7.1): `[16:9], [angle], [subject], [environment], [lighting], photorealistic, cinematic, 8k, [mood]`. `output_format:{prompt}`. |
| `hero-ref-gen` | 1 | `script: hf-image` **[DET]** | Pinned `nano_banana_2 --aspect_ratio 16:9 --resolution 2k --wait …`; parses cloudfront URL via `--json`/`jq`; downloads to `scenes/hero/reference.png`; verifies it's a valid 16:9 image (≥1280px). `timeout: 600000`. |
| `hero-ref-critic` | 4 | `command: critic-generic` **[CRITIC]** | Rubric: 16:9, on‑subject, depth for parallax, matches brand. Loop regen if FAIL. |
| `hero-director-brief` | 3 | `command: hero-director-brief` **[AI]** | The 5 questions → **director_brief schema** (Appendix B.4): `product`, `hero_moment`, `camera_start`, `camera_path`, `camera_end`, `transforms[]`, `start_frame_prompt`, `end_frame_prompt`. |
| `brief-critic` | 4 | `command: critic-generic` **[CRITIC]** | Rubric (Appendix C.4, verbatim from §2B): **FAIL if `hero_moment` ≈ a closer crop of the reference** ("if your final frame just looks like a closer version of the first frame, you chose wrong"), FAIL if `camera_path` lacks spatial travel. Loop. |
| `hero-end-frame-gen` | 1 | `script: hf-image` **[DET]** | `when: "$generation-plan.output.hero.want_end_frame=='true'"`; edits reference via `--image reference.png` to the `end_frame_prompt`; → `scenes/hero/end-frame.png`. |
| `hero-video-prompt` | 3 | `command: hero-video-prompt` **[AI]** | The **scroll‑driven hero template** (§7.2): ≥4 timeline beats `[{t, camera_motion, subject_motion}]` + a `camera_path` summary + negatives. `output_format` = **video_prompt schema** (Appendix B.5). |
| `prompt-critic` | 4 | `command: critic-generic` **[CRITIC]** | Rubric (Appendix C.5, verbatim from §2C): every beat has camera motion **through space** AND subject motion; not a loop; ≤~1000 chars; includes "no morphing/no shake". Loop. |
| `hero-gen` | 1 | `script: hf-video` **[DET]** | Pinned `seedance_2_0 --mode fast --start-image reference.png [--end-image end-frame.png] --duration <plan> --aspect_ratio 16:9 --resolution 1080p --generate_audio false --wait`. Generates `variants` takes (loop in‑script) → `scenes/hero/hero-v{n}.mp4`; ffprobe‑verifies duration/▶stream. `timeout: 1320000` (22 min > `--wait-timeout 20m`). |
| `hero-validate` | 1 | `script:` (bun) | ffprobe each variant: correct duration (±1s), 16:9, has video stream; extract 5 preview frames per variant to `scenes/hero/preview/`. |
| `hero-gate` | 5 | `approval:` **[GATE]** | `capture_response:true`; shows variants + previews; on_reject applies the skill's Step‑2D diagnosis table (Ken‑Burns→add subject motion; flat→camera must travel; morph→add physics negative) and regenerates only the called‑out variant; `max_attempts:5`. The human names the chosen variant → `$hero-gate.output`. |

### Phase F — Showcase (conditional; state-machine loop)

Gated by `when: "$generation-plan.output.showcase.enabled=='true'"`. Driven by
`$ARTIFACTS_DIR/showcase/plan.json` (a flat ordered list of work‑items: each keyframe and each clip,
with `status`, `type`, `prompt_role`, `refs[]`, `out`). The loop processes **one work‑item per
iteration** with the correct prompt template, generates it **[DET]**, runs a per‑item **[CRITIC]**,
and on PASS marks the item `done` and seeds the next item's refs.

| id | lever | type | spec |
|---|---|---|---|
| `showcase-loop` | 4+1 | `loop:` **[LOOP]** | `fresh_context: true` (role differs per item). Each iteration runs `plan-step.ts` to find the next `pending` item, then: if `type==keyframe` use the **NB‑Pro geometry template** (§7.3) — *geometry not labels, no "dark", negate wrong mode*; if `type==clip` use the **5‑layer Seedance template** (§7.4) — *event‑category label, geometry+magnitude, mechanism pacing, physics‑reasoned constraint, camera last*. Calls `hf-image`/`hf-video` with the correct `--image`/`--start-image`/`--end-image` refs from the chain. A per‑item critic (rubric C.6/C.7) gates marking it `done`. `until_bash: scripts/plan-step.ts --all-done showcase` (exit 0 when no `pending` remain). `max_iterations:` = `3 × (keyframes+clips)` (headroom for regen). `idle_timeout: 1800000`. |
| `showcase-stitch` | 1 | `script:` (bun)/`bash:` | `ffmpeg -f concat` the per‑scene clips (xfade fallback) → `scenes/showcase/showcase-video.mp4`; ffprobe‑verify. |
| `showcase-gate` | 5 | `approval:` **[GATE]** | shows the stitched video + per‑scene previews; `on_reject` re‑opens specific items by resetting their `status` to `pending` and re‑running the loop; `max_attempts:4`. |

> **The NB‑Pro ⇄ Seedance label inversion** — the subtlest thing in the whole skill — is encoded as
> **two physically different templates** the loop selects by `item.type`. A weak model cannot mix
> them up because it never *chooses*: keyframe items get the geometry template, clip items get the
> 5‑layer template. (See §7.3/§7.4.)

> **Default vs thorough approval.** Default = AI‑critic self‑gating per item + one human gate per
> showcase (autonomy for the weak‑model goal). Thorough = set `interactive: true` on the loop with a
> `gate_message` to pause for **human approval per keyframe/clip** (the skill's literal contract);
> `$LOOP_USER_INPUT` carries the feedback. This is a single config flip (§10).

### Phase G — Before/after (conditional; loop)

Gated by `when: "$generation-plan.output.before_after.enabled=='true'"`. Loop over pairs: generate
the **after** first (`hf-image`), then derive the **before** via `--image after.png` with the
"same composition/angle/lighting, but [old/worn]" prompt (§7.5). Per‑pair critic verifies the two
share composition (so the slider lines up). Writes `scenes/beforeafter/pair-{n}-{before,after}.png`.
`beforeafter-gate` [GATE].

### Phase H — Build (mostly deterministic)

This is where the prior attempt asks a weak model to write ~1000 lines of HTML/CSS/JS from scratch —
the single biggest quality cliff. We replace that with **deterministic assembly from vendored
templates**, leaving the model only copy + module selection (already decided in `plan.json`).

| id | lever | type | spec |
|---|---|---|---|
| `extract-frames` | 1 | `script: extract-frames` **[DET]** | Reads chosen hero variant (`$hero-gate.output` or plan default); `ffmpeg -vf "fps=30,scale=1920:-1"` → `site/frames/`; `convert -quality 80 -strip`; counts frames. If showcase exists, also extract `site/showcase-frames/`. Emits `{"hero_frames":N,"showcase_frames":M}`. |
| `site-plan` | 3 | `command: site-plan` **[AI]** | Reads brand‑system + intake + plan. `output_format` = **site_plan schema** (Appendix B.6): final per‑section `copy`, the ordered `modules[]` (subset of the 18, with each module's content slots filled — marquee logos/names, counter `data-target/-suffix`, typewriter `data-phrases`, etc.), nav links, CTA. **No HTML** — only structured content. |
| `assemble-site` | 1 | `script: assemble-site` **[DET]** | Builds `site/index.html` by: injecting `:root` CSS vars from brand‑system into `design-system.css`; embedding `scroll-frame-engine.js` with `FRAME_COUNT` = real count; building hero + content sections from `site_plan`; concatenating the **vendored** module fragments for `site_plan.modules[]` (inline `<style>`/`<script>`), filling each module's slots; wiring the showcase second scroll‑frame section + overlays if present. Patches the known `stagger-grid` `unobserve` bug to bidirectional. Single self‑contained file. |
| `build-check` | 1 | `script: build-check` **[DET]** | Mechanically asserts the skill's §3F checklist that *can* be checked: hero section present with sticky canvas + engine + correct frame count; CSS vars applied; ≥3 modules; **no IntersectionObserver `unobserve`** in output (bidirectional rule); no `opacity:0.x` <0.7 on text; brands rendered as marquee (not a `<ul>`); contact/CTA is last section; responsive meta + clamp present. Emits `{verdict, failures[]}`; non‑PASS loops back to `site-plan`/`assemble-site`. |
| `site-critic` | 4 | `command: critic-generic` **[CRITIC]** | The subjective remainder (legibility, "go all out", copy quality, module fit) the script can't judge. Rubric C.8. |
| `site-gate` | 5 | `approval:` **[GATE]** | shows `site/index.html`; `on_reject` edits via `site-plan`/`assemble-site` (never freehand HTML); `max_attempts:5`. |

> Because the engine, CSS, and modules are **vendored verbatim**, the site's *structural* quality is
> Opus‑grade by construction regardless of model. The model only chooses modules (constrained to the
> 18) and writes copy (schema‑bounded). `build-check` then mechanically enforces the parts of the
> skill's checklist that are decidable, and the critic + human handle the rest.

### Phase I — Deploy

| id | lever | type | spec |
|---|---|---|---|
| `deploy` | 1 | `command: deploy-finalize` **[AI‑thin]** or `script:`/`bash:` | Reads `deploy.target`. `vercel` + tooling present → `git init/add/commit`, `gh repo create … --push`, `vercel --prod --yes`; capture live URL. `local` or tooling missing → finalize local build + write exact deploy‑later commands. **Always** copy the full site + all `scenes/` deliverables to `$ARTIFACTS_DIR/` (the worktree is disposable). Writes `deploy-summary.md`. `when:` branches on `$preflight.output.vercel`/`gh`. |
| `report` | — | final node | `trigger_rule: all_done`; prints live URL or durable local path + how to update. |

---

## 7. Externalizing the creative judgment

This section gives the actual templates/rubrics that carry the quality. They are vendored as command
bodies and `output_format` schemas so the weak model's job is reduced to slot‑filling. (Schemas in
Appendix B; rubrics verbatim in Appendix C.)

### 7.1 Image‑prompt template (NB‑Pro reference/start frames)
`[16:9 context], [camera angle], [specific subject], [surface/environment], [lighting style],
photorealistic, cinematic, 8k, [mood keywords]` — schema requires all 9 slots filled; the [16:9]
slot is fixed and the **[DET]** generator also passes `--aspect_ratio 16:9` regardless, so a
forgotten ratio cannot reach the model output.

### 7.2 Scroll‑driven hero video template (Step 2C)
Schema `video_prompt`: `opening_scene`, `beats: [{t, camera_motion, subject_motion}]` (**min 4**),
`camera_path_summary`, `negatives` (defaulted to "smooth stabilized, no shake, no morphing, no new
objects, does not loop"). The **camera‑always‑moving** law is enforced three ways: (1) `camera_motion`
is a **required** field on every beat; (2) the prompt‑critic fails any beat whose `camera_motion` is
static/empty; (3) the critic fails if start≈end (loop).

### 7.3 NB‑Pro **keyframe** template (Step 2E §3a/§3b — geometry, NOT labels)
For motion keyframes the template *forbids* category labels and *requires* geometry: "the bottom
half of that window's frame is now an open rectangular gap — no glass", names the concrete interior
visible through the gap, **bans the word "dark"**, and negates the wrong mode ("stays flat against
the wall; does not tilt, is not hinged, does not swing"). Includes the architectural‑continuity
anchor clause and the tight‑crop exclude clause. (This is the *opposite* of 7.4 — by design.)

### 7.4 Seedance **clip** template (Step 2E §4b — the 5‑layer formula)
Exactly 5 sentences in order: (1) **event‑category label** ("This is a video of an awning window
opening"), (2) geometry + bounded magnitude, (3) **mechanism pacing** ("at a slow consistent
speed"), (4) **physics‑reasoned constraint with a *because* clause** ("the top does not move at all,
because it's hinged from the top — only the bottom moves"), (5) camera last. Schema has one field per
layer (`event_category`, `geometry_magnitude`, `pacing`, `constraint_because`, `camera`), so a weak
model fills five labeled blanks instead of "writing a Seedance prompt".

### 7.5 Before/after derivation (Step 2F)
After‑first, then before via `--image after.png` + "exactly like this reference, but [old/worn];
same composition, angle, lighting, environment." Critic verifies shared composition.

### 7.6 The 18 vendored modules (assembled by `assemble-site.ts`, never hand‑written)
`before-after-slider`, `brand-logo-marquee`, `counter-animate`, `accordion-slider`, `flip-cards`,
`glitch-text`(CSS‑only), `horizontal-scroll`(IDs), `image-trail`, `kinetic-text`, `liquid-glass`,
`magnetic-buttons`, `marquee`(CSS‑only), `parallax-sections`, `reveal-text`, `scroll-progress`(ID),
`stagger-grid`(patch `unobserve`→bidirectional), `svg-draw`, `typewriter`. Theming = three CSS vars
(`--color-primary` default `#c8a97e`, `--font-heading`, `--font-body`) set once on `:root`; per‑module
content slots (logos, `data-target`, `data-phrases`, etc.) come from `site_plan`. **Mandatory rules
encoded in the assembler:** brands ⇒ `brand-logo-marquee` (never a text list); before/after ⇒
`before-after-slider` (never static side‑by‑side). Single‑instance‑by‑ID modules
(`scroll-progress`, `horizontal-scroll`) are deduped by the assembler.

### 7.7 Design‑system rules (Step 3C) → real CSS + `build-check`
The 12 design rules become (a) concrete values in `design-system.css` (dark‑first `#0a0a0a`,
`clamp()` type scale, generous spacing, bottom‑anchored hero text + gradient) and (b) machine checks
in `build-check.ts` (legibility threshold, bidirectional‑animation rule, CTA‑last, 375px responsive
markers). Subjective "GO ALL OUT" is a critic line + the human gate.

---

## 8. Pinned Higgsfield command reference

All generation is **[DET]** (`hf-image.ts` / `hf-video.ts`), with **every flag hardcoded** so model
variance is removed. Verified against the live CLI (authenticated, `higgsfield model get …`).

**Image — Nano Banana Pro (`nano_banana_2`)** — default aspect is `1:1`, default res `2k`, so we
**always** pass `--aspect_ratio 16:9` and an explicit `--resolution` (`2k` heroes, `4k` close‑up
mechanism keyframes):
```bash
higgsfield generate create nano_banana_2 \
  --prompt "$PROMPT" --aspect_ratio 16:9 --resolution 2k \
  [--image ./ref1.png --image ./ref2.png ...] \
  --json --wait --wait-timeout 8m --wait-interval 5s
# parse: result URL via `jq` from --json (host is *.cloudfront.net, NOT cdn.higgsfield.ai);
# download: curl -fsSL "$URL" -o out.png
```

**Video — Seedance 2.0 Fast** — `--mode fast` mandatory; `--duration` integer **≥4**; resolutions
`480p|720p|1080p`; audio flag is **underscore** `--generate_audio` (hyphen form errors); frame flags
are **hyphen** `--start-image/--end-image/--image`:
```bash
higgsfield generate create seedance_2_0 --mode fast \
  --prompt "$PROMPT" --start-image ./start.png [--end-image ./end.png] \
  --duration 8 --aspect_ratio 16:9 --resolution 1080p --generate_audio false \
  --json --wait --wait-timeout 20m --wait-interval 5s
```

**Result parsing — VERIFIED LIVE 2026‑06‑22 (do not guess this).** `--json --wait` prints a
**top‑level JSON array of job objects**; the asset URL is **`.result_url`** on each element (the
host is `*.cloudfront.net`). It is **NOT** `.results[0].url`. Real captured shape (image *and*
video are identical in structure):
```json
[ { "id": "029cc175-…", "status": "completed", "job_set_type": "seedance_2_0",
    "result_url": "https://d8j0ntlcm91z4.cloudfront.net/user_…/hf_…_029cc175-….mp4",
    "params": { "width": 1280, "height": 720, "duration": 8, "resolution": "720p",
                "medias": [ {"role":"start_image",…}, {"role":"end_image",…} ], … } } ]
```
So `hf-image.ts`/`hf-video.ts` extract with `JSON.parse(stdout).filter(o=>o.result_url).pop().result_url`
(last completed job), with a "last `http`‑prefixed stdout line" fallback. **This bug was caught by the
live smoke test (L4 below): the originally‑scaffolded parser guessed `.results[0].url` and would have
failed on every generation node.**

**Resolution gotcha — VERIFIED LIVE (important).** In **`--mode fast`**, Seedance renders **720p even
when `--resolution 1080p` is requested** — the result came back `1280×720`, and the cost is **identical**
(28 credits @8s for *both* 720p and 1080p in fast mode), whereas **`--mode std`** charges **72** for
genuine 1080p (2× the 720p price). The flat fast‑mode cost is the tell: fast isn't doing 1080p work.
Since the kit **mandates `--mode fast`**, the skill's "use 1080p for hero/showcase" instruction is
effectively unachievable; the correct pin is **`--resolution 720p`** (what you actually get) — and
`extract-frames.ts` upscales to 1920‑wide for the scroll canvas anyway, so web quality is unaffected.
`hf-video.ts` now defaults to `720p`.

**Timeout coupling:** the node `timeout:` must exceed `--wait-timeout` (e.g. node `1320000` ms =
22 min for a 20‑min video wait). An 8s/720p fast hero took **~3 min** end‑to‑end in the live test.
**Optional Soul presenter:** train once
(`higgsfield soul-id create --name … --soul-2 --image … (5–20)`), then drive a **Soul model**
(`text2image_soul_v2`/`soul_cinematic`) with `--soul-id <id>` for a consistent brand presenter — note
`--soul-id` is **not** a flag on `nano_banana_2`/`seedance_2_0`; feed the Soul still into Seedance as
`--start-image`. This is an optional sub‑path gated on intake.

**Cost (live `generate cost` + a real run, fast mode):** NB‑Pro 2k = **2 credits**, 4k = 4; Seedance
fast 8s = **28** (720p *and* 1080p — identical), 5s = 17.5, 4s@720p = 14, 10s = 35. A hero
(2–3×28) + a 3‑mechanism showcase (7 keyframes×2 + 6 clips×~14–28) can run **~150–300 credits**; hence
the `warn-credits`/budget guard. *(Measured: the L4 smoke test — 1 reference image + 1 end‑frame edit
+ 1 eight‑second hero video — cost exactly **32 credits**, matching the previews to the credit.)*

**Replacement for the skill's nonexistent `nbpro-edit.sh` / "14‑ref limit":** there is **no** such
script or documented cap on disk. The "targeted multi‑ref fix" (§2E 3d) is implemented as a normal
`hf-image` call with **repeated `--image`** (documented soft guidance ≈ up to 8 refs; verify
empirically — do **not** hardcode 14). `hf-image.ts` accepts an array of refs and emits one `--image`
per ref.

---

## 9. The artifact & variable contract

Every fresh node reloads state from files (the only thing that survives `context: fresh` /
loop‑iteration boundaries). Loop‑node `$node.output` is **last iteration only**, so loops accumulate
into artifacts, never into `.output`.

| Artifact | Producer | Consumers | Shape |
|---|---|---|---|
| `intake-brief.md` + intake JSON | `intake-draft` | brand, plan, deploy | Appendix B.1 |
| `brand/brand-system.json` | `brand-system` | brand-card, plan, site-plan, assemble | Appendix B.2 |
| `brand/brand-card.html` | `brand-card` | brand-gate (human) | tokenized template |
| `plan.json` (+ `showcase/plan.json`, `beforeafter/plan.json`) | `generation-plan` | all of E/F/G/H | Appendix B.3 |
| `scenes/hero/{reference,end-frame}.png`, `hero-v*.mp4`, `preview/*` | E nodes | build | media |
| `scenes/showcase/*` (keyframes, clips, `showcase-video.mp4`) | F loop | build | media + status in plan |
| `scenes/beforeafter/pair-*-{before,after}.png` | G loop | build (slider) | media |
| `site/index.html`, `site/frames/*`, `site/showcase-frames/*` | extract+assemble | site-gate, deploy | the deliverable |
| `deploy-summary.md` | deploy | report (human) | URL/path + redeploy cmds |

**Built‑in variables used:** `$ARGUMENTS` (initial request), `$ARTIFACTS_DIR` (persists outside the
worktree — deliverables copied here), `$WORKFLOW_ID`, `$REJECTION_REASON` (only inside `on_reject`),
`$LOOP_USER_INPUT`/`$LOOP_PREV_OUTPUT` (interactive loops), `$<id>.output[.field]`. **In bash/script
bodies**, user‑controlled vars arrive as **env vars** (not substituted) — so `hf-*.ts` reads
`process.env`/argv, and `$ARTIFACTS_DIR` is substituted directly.

---

## 10. The complete tuning surface

"Fine detailed tuning of every single possible aspect" — here is the catalog of knobs and exactly
where each one lives. Anyone (including a weak model or a non‑expert operator) can tune the workflow
by editing one place.

| Aspect to tune | Where | Example |
|---|---|---|
| **Model per node** (cheap glue vs strong prompt‑author/critic) | workflow `model:` + per‑node `model:` | `generation-plan`, `*-critic` → strong; gen/validate scripts → none |
| **Reasoning depth** | `effort:` / `thinking:` (workflow or node) | `thinking: adaptive` on brief/prompt nodes |
| **Director's‑Brief strictness** | `director_brief` schema bounds + rubric C.4 | require ≥3 `transforms[]`; fail start≈end |
| **Camera‑motion enforcement** | `video_prompt` schema (`camera_motion` required per beat) + rubric C.5 | min beats = 4; ban static camera |
| **Hero pacing/length** | `plan.json.hero` + `hf-video` flags | `--duration 6` punchy vs `10` dramatic |
| **Resolution / quality** | `hf-image`/`hf-video` flags | `2k`/`4k`, `720p`/`1080p` |
| **# hero variants** | `plan.json.hero.variants` | 2–3 |
| **Showcase scene/mechanism count** | `plan.json.showcase.scenes[]` | drives loop cardinality |
| **NB‑Pro vs Seedance prompt rules** | templates §7.3/§7.4 (vendored command bodies) | edit once, every item follows |
| **Per‑item vs per‑scene human review** | `showcase-loop.interactive` + `gate_message` | thorough vs autonomous |
| **Critic pass/fail thresholds** | rubric files in `assets/cinematic/rubrics/*` (Appendix C) | tighten/loosen any check |
| **Regeneration headroom** | `loop.max_iterations`, gate `on_reject.max_attempts` | showcase `3×N`; gates 4–6 |
| **Module palette & industry pairings** | `plan.json.modules[]` + `site-plan` + `assemble-site` | per §3E industry table |
| **Brand tokens (color/font/copy)** | `brand-system.json` (single source) | every module + card reads it |
| **Scroll heights (playback speed)** | `plan.json.scroll_heights` → `assemble-site` | hero `300vh`, showcase `400vh` |
| **Design system (dark/light, type scale, spacing)** | `assets/cinematic/design-system.css` | one CSS file |
| **Deploy target** | `plan.json.deploy` / intake | `vercel` vs `local` |
| **Cost guard** | `warn-credits` threshold / optional budget `cancel` | block under N credits |
| **Dry‑run (no credits)** | `HF_DRY_RUN=1` env honored by `hf-*.ts` | exercise DAG w/o spend (see §12) |
| **Soul presenter** | optional intake flag → soul sub‑path | consistent face across shots |
| **Isolation** | workflow `worktree.enabled` + `--branch` | always isolate (default) |

---

## 11. Gap-closure table

Issues found in the skill / prior attempt and exactly how this plan fixes each (so the workflow
doesn't inherit them):

| # | Problem (where) | Fix in this plan |
|---|---|---|
| 1 | Prior `preflight` emits **unquoted JSON booleans** → `when:` string compares unreliable | `preflight.ts` emits **quoted** `"true"/"false"` strings (§6 Phase A) |
| 2 | Skill cites `gen/nbpro-edit.sh` and a **"14‑ref NB‑Pro limit"** — neither exists on disk | Drop both; implement multi‑ref fix as repeated `--image` (≈≤8, verify) in `hf-image.ts` (§8) |
| 3 | `--generate-audio` (hyphen) errors on live CLI | Pin **underscore** `--generate_audio false`; frame flags stay hyphen (§8) |
| 4 | Skill's example CDN host `cdn.higgsfield.ai` ≠ real `*.cloudfront.net` | Parse via `--json`/`jq`, not a hardcoded host (§8) |
| 5 | Generation run **inside AI nodes** → flag/URL/parse variance on weak models | Move all generation to **[DET]** `hf-*.ts` scripts with pinned flags (§6 E/F/G) |
| 6 | NB‑Pro default aspect `1:1` silently yields square images | Always pass `--aspect_ratio 16:9` in `hf-image.ts` (§8) |
| 7 | `--wait` blocks with no stream → node could idle‑timeout | bash/script `timeout:` set **above** `--wait-timeout`; coupling rule (§8) |
| 8 | Worktree is disposable → deliverables could vanish | Deploy node **always** copies site+scenes to `$ARTIFACTS_DIR` (§6 I) |
| 9 | `stagger-grid` module uses `unobserve` (fire‑once) vs §3D rule #11 (bidirectional) | `assemble-site.ts` patches it; `build-check.ts` fails any `unobserve` (§6 H, §7.6) |
| 10 | Skill says "16 modules"; there are **18** (`brand-logo-marquee`, `before-after-slider`) | Vendor all 18; assembler enforces the two mandatory ones (§7.6) |
| 11 | `archon` run inside Claude Code warns about `CLAUDECODE=1` nesting (can hang) | Operator runs via `archon serve` from a normal shell, or set `ARCHON_SUPPRESS_NESTED_CLAUDE_WARNING=1` (§12) |
| 12 | `output_format` is **ignored on bash/script** nodes (silent) | Deterministic nodes emit JSON to stdout and downstream uses `.field` JSON‑parse (legal); never rely on `output_format` on a script node (§6, §12) |
| 13 | **Scaffolded URL parser guessed `.results[0].url`** — wrong; would fail every generation node | **Caught by the live L4 run**: real shape is a top‑level array with **`.result_url`**; both `hf-*.ts` corrected + line‑parse fallback (§8) |
| 14 | Skill says "use **1080p** for hero/showcase" but the kit **mandates `--mode fast`**, which only delivers **720p** | **Verified live**: fast renders 720p at the same cost as a 1080p request; pin `720p` in `hf-video.ts`; extract upscales to 1920‑wide anyway (§8). True 1080p would need `--mode std` (2× cost), which the kit forbids |
| 15 | ImageMagick v7 deprecates `convert` (warns) | `extract-frames.ts` prefers `magick`, falls back to `convert` (best‑effort) |

---

## 12. Validation plan

How we prove the workflow is bulletproof **before** trusting it with a weak model and real credits.
Five layers, in order:

**L1 — Static validation (must be clean).**
```bash
ARCHON_SUPPRESS_NESTED_CLAUDE_WARNING=1 archon validate workflows cinematic-site
ARCHON_SUPPRESS_NESTED_CLAUDE_WARNING=1 archon validate commands              # all command + script files
```
Checks YAML, node‑ID uniqueness, **no cycles**, all `depends_on` resolve, all `$node.output` refs
point to known nodes, all `command:` files exist, all named `script:` files exist with a matching
runtime, all `skills:` dirs exist, runtime availability, provider/model compat. Fix until clean.

> **✅ Already executed during planning (real evidence, not hand‑checking).** A full 37‑node
> skeleton (config + `workflows/cinematic-site.yaml` — 14 command, 11 script, 7 approval, 2 loop,
> 2 cancel, 1 prompt — + 9 command files + 11 named scripts + 7 rubric stubs) was instantiated and
> run through Archon's own validator, then removed for a clean handoff. Rebuild it via the Archon
> skill and run `archon validate workflows cinematic-site` to reproduce this result:
>
> ```
> $ archon validate workflows cinematic-site   →  cinematic-site  ok      (1 valid, 0 errors)
> $ archon validate commands                   →  56 valid, 0 with errors (incl. all 9 commands + 11 scripts)
> $ archon workflow list                       →  cinematic-site is discoverable
> ```
>
> Every construct the plan relies on is therefore proven schema‑legal by the real validator: the 7
> node types, approval gates with `on_reject`, the two conditional state‑machine loops with
> `until_bash`, `when:` string conditionals, `trigger_rule: none_failed_min_one_success` joins,
> `retry:` on script nodes, `output_format` enum blocks, named‑script resolution (`script: hf-image`
> → `scripts/hf-image.ts`), and `skills:` injection. The deterministic layer was also **executed**
> (not just parsed): `preflight.ts` emits the gap‑fixed **quoted** `"true"/"false"` strings and read
> the live Higgsfield auth + credit balance; `validate-json.ts` returns string completeness verdicts;
> `build-check.ts` emits a `FAIL` + specific reasons on an unbuilt site; `plan-step.ts --all-done`
> returns the correct loop exit code. The contracts `when:`/`until_bash`/critic‑gates depend on all
> hold at runtime.

**L2 — Schema‑legality self‑audit (no silent‑failure traps).** Cross‑check every field × node type
against the parameter matrix:
- `output_format`/`skills`/`allowed_tools`/`hooks` only on `command`/`prompt` nodes — **never** on
  `bash`/`script`/`loop`/`approval` (silently ignored). ✔ all our schemas live on command nodes.
- **No `retry:` on any `loop:`** (hard parse error). ✔
- `interactive: true` at **workflow level** (gates/interactive loops need it for delivery). ✔
- After every `when:`‑gated branch, the join uses `trigger_rule: none_failed_min_one_success`/
  `one_success` (default `all_success` would deadlock on skipped deps). ✔ (E/F/G → H join)
- `model:` on a `loop:` is ignored → set model in the loop **prompt body**/workflow level. ✔
- `script:` nodes never wrap `$node.output` in `` String.raw`…` `` (backtick corruption); assign
  directly. ✔
- bash/script use `timeout:` (not `idle_timeout`). ✔

**L3 — Dry‑run (no credits, full DAG).** `hf-image.ts`/`hf-video.ts` honor `HF_DRY_RUN=1`: they copy
a placeholder PNG/MP4 to the expected `out` path and emit a fake cloudfront‑shaped URL. Run the whole
workflow end‑to‑end on a trivial brief to exercise **every** node, gate, loop, branch, the assembler,
`build-check`, and deploy — proving control flow, artifact wiring, and the HTML build are correct
*before* spending a credit. Confirm `site/index.html` opens and scrolls with placeholder frames.

**L4 — Single‑asset live smoke. ✅ EXECUTED 2026‑06‑22 (real credits, real assets).** The hero
path was run against the live API for the skill's canonical window/door brief, using **only the two
authorized models** (`nano_banana_2`, `seedance_2_0 --mode fast`). Evidence (assets were generated
then removed for a clean handoff; the verified facts below are what you inherit):

| Step | Call | Result | Verified |
|---|---|---|---|
| Reference frame | `nano_banana_2` text→image, `--aspect_ratio 16:9 --resolution 2k` | `reference.jpeg` **2752×1536** | photorealistic craftsman exterior (curb shot) |
| End frame | `nano_banana_2` image→image via **`--image reference.jpeg`** | `end-frame.jpeg` **2752×1536** | interior hero moment; **craftsman style preserved** through the edit |
| Hero video | `seedance_2_0 --mode fast --start-image … --end-image … --duration 8 --generate_audio false` | `hero-v1.mp4` **h264 1280×720 8.04s 24fps, 0 audio** | `medias[]` shows both `start_image`+`end_image` used |
| Frame extract | `extract-frames.ts` (the real `[DET]` node) on the live mp4 | **241 frames @ 1920×1080** | the actual build‑pipeline step, on a real asset |

The extracted frames prove the video is a **genuine spatial camera journey, not a Ken Burns zoom**:
frame 1 = exterior at the curb (start frame) → frame 120 = front door swung open, camera crossing the
threshold, interior revealed → frame 241 = sun‑drenched interior window wall (end frame). That is the
exact A→B journey the prompt scripted, with the camera moving through space the whole time — the
signature effect the skill exists to produce. **Total spend: 32 credits**, matching previews exactly.
This run is what surfaced gap‑closures #13 (`.result_url` parser) and #14 (fast‑mode 720p), which are
now fixed in `hf-image.ts`/`hf-video.ts` and re‑validated (`archon validate commands` → 56 ok).

**L5 — The dumb‑model parity eval (the real acceptance test).** Run the *entire* workflow on the
**weakest target model** (every AI node on, e.g., `haiku`) for the canonical brief, with **no human
edits** beyond approving gates. Score the result with the **skill's own checklists** as the rubric:
- Step‑2D table (hero is not Ken‑Burns; camera travels; no morph; not a loop),
- Step‑2E checks (each clip does ONE thing; correct mechanism mode; chain continuity),
- Step‑3F build checklist (bidirectional animations; brands as marquee; before/after slider; legible;
  responsive; CTA last).
**Pass bar:** the weak‑model run scores on these checklists **at parity with a reference Opus‑runs‑
the‑skill** baseline. If any checklist item fails, the fix is *not* a better model — it is a tighter
schema bound, a sharper critic rubric, or a more complete template/assembler. Iterate L5 until parity
holds. This loop is what makes the claim true rather than aspirational.

> Validation is itself mostly **[DET]** (L1–L4 are scripted/CLI), so re‑validation after any tuning
> is cheap and repeatable.

---

## 13. Coverage matrix — every skill element → mechanism

Proof of completeness: every meaningful element of the 1154‑line skill maps to a concrete workflow
mechanism. (If a row had no mechanism, the plan would have a hole.)

| Skill element | Mechanism in the workflow |
|---|---|
| Step 0: open questions, "DO NOT ASSUME", pester for specifics | `intake-draft` schema with `open_questions[]` + `intake-check` [DET] completeness + `intake-gate` reject‑loop |
| Step 0: must‑get city/services/customers right | MUST‑HAVE required fields + completeness gate + brand‑critic geo check |
| Step 0: showcase/before‑after/brands/deploy wishes | intake booleans → drive `when:` on F/G and module rules |
| Step 1: existing‑site vs concept | `mode` enum → branch in `brand-system` command |
| Step 1: 5‑color palette, fonts, copy | `brand-system` schema (hex regex, Google Font URL, copy deck) |
| Step 1: Brand Card HTML | `brand-card` [DET] token substitution into vendored template |
| Step 1: every decision traces to brief | `brand-critic` rubric C.2 |
| Step 2A: reference image, 16:9, specific | `hero-ref-prompt` template §7.1 + `hf-image` pins 16:9 + `hero-ref-critic` |
| Step 2B: Director's Brief (5 Qs), hero moment ≠ closer crop | `director_brief` schema B.4 + `brief-critic` rubric C.4 (verbatim) |
| Step 2C: second‑by‑second, camera always moving, subject layered | `video_prompt` schema B.5 (≥4 beats, camera_motion required) + `prompt-critic` C.5 |
| Step 2C: start→end frame strategy | `plan.hero.want_end_frame` + `hero-end-frame-gen` (`--image` edit) |
| Step 2D: Seedance flags, variants, diagnosis table | `hf-video` pinned flags + variant fan + `hero-gate.on_reject` diagnosis |
| Step 2E: 3‑phase keyframe chain, one mechanism/clip | `plan.json` work‑item list + showcase loop (one item/iter) |
| Step 2E: NB‑Pro geometry‑not‑labels, no "dark", negate wrong mode | keyframe template §7.3 + critic C.6 |
| Step 2E: Seedance 5‑layer formula | clip template §7.4 (5 schema fields) + critic C.7 |
| Step 2E: seed next scene, architectural continuity | plan refs chain + keyframe template anchor/seed clauses |
| Step 2E: targeted multi‑ref fix (no nbpro‑edit.sh) | repeated `--image` in `hf-image.ts` (§8) |
| Step 2E: stitch + xfade | `showcase-stitch` [DET] ffmpeg |
| Step 2E: text overlays on showcase | vendored `showcase-overlay.js/.css` + `assemble-site` |
| Step 2F: before/after, after‑first then derive before | G loop §7.5 + per‑pair critic |
| Step 3A: frame extraction 30fps + compress | `extract-frames` [DET] |
| Step 3B: scroll‑frame engine (sticky canvas) | vendored `scroll-frame-engine.js` + `assemble-site` (FRAME_COUNT) |
| Step 3B Mode B: looping `<video>` | assembler alt branch on intake flag |
| Step 3C: 12 design rules (dark, clamp, legible, etc.) | `design-system.css` + `build-check` [DET] |
| Step 3C #11: bidirectional animations | assembler patches `unobserve`; `build-check` fails any `unobserve` |
| Step 3D: design reference workflow | optional intake screenshot → `site-plan` reads it |
| Step 3E: modules + industry pairings + mandatory marquee/slider | 18 vendored modules + `plan.modules[]` + assembler mandatory rules |
| Step 3F: build checklist | `build-check` [DET] + `site-critic` C.8 |
| Step 4: GitHub→Vercel or local | `deploy` [DET] branch on `deploy.target`+tooling |
| "PAUSE — wait for approval" (×5) | five `approval:` gates with `on_reject` |
| Setup/credits | `preflight` + `warn-credits` + cost table §8 |
| Troubleshooting tables | encoded as critic rubrics + `*-gate.on_reject` fix prompts |

### Decision: where the human still matters
Five gates remain (intake, brand, plan, each generated‑asset family, site) — they are the skill's own
PAUSE points and the lever‑5 backstop. Everything *between* gates is determinized/schematized/critic‑
looped, so the human's job shrinks from "co‑author with the AI" to "approve a finished, pre‑checked
artifact or send it back with a sentence." That is the same human burden as the skill, with far less
reliance on model brilliance in between.

---

## 14. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Weak critic misses a quality defect | med | Rubrics are *checklists*, not judgment calls (Appendix C); critics may run a stronger model (cheap, text‑only); human gate is the final catch |
| Showcase loop burns credits regenerating | med | `max_iterations` cap; per‑item critic before any *clip* (clips are the expensive items); `warn-credits`; dry‑run first; thorough mode pauses per item |
| `generation-plan` produces an infeasible plan | low | `plan-critic` + `plan-gate` *before* any paid generation; schema bounds cardinality |
| Higgsfield API/auth/429 mid‑run | med | `retry:` on the generation **script** nodes (transient class); auth checked in `preflight`; resumable via `archon … --resume` |
| Assembler produces broken HTML on an exotic module combo | low | `build-check` [DET] + dry‑run renders it; modules are vendored & individually valid |
| `when:` numeric/string edge cases | low | all enums are strings; L2 audit; numeric guards fail‑closed |
| Nested `CLAUDECODE=1` hang | med | run via `archon serve`/normal shell; documented (§11 #11) |
| Worktree cleanup loses deliverables | low | deploy copies everything to `$ARTIFACTS_DIR` (persists) |
| Vendored assets drift from upstream skill | low | vendoring is a pinned [DET] step; re‑vendor on skill update; `build-check` guards regressions |

---

## 15. Implementation sequence

A concrete, ordered checklist. Each step is small and independently verifiable.

0. **Vendor assets** [DET]: copy `scroll-frame-engine.js` (from §3B), `brand-card-template.html`, the
   18 modules, and the §3C rules‑as‑CSS into `.archon/assets/cinematic/`. Patch `stagger-grid`.
1. **Write `config.yaml`** and the workflow **YAML** (Appendix A); `archon validate workflows` → clean.
2. **Write the [DET] scripts** (`preflight`, `hf-image`, `hf-video`, `extract-frames`,
   `assemble-site`, `build-check`, `plan-step`, `validate-json`) with `HF_DRY_RUN` support.
3. **Write the command files** (each anchored to its `output_format` schema; phase‑structured per
   `authoring-commands.md`; lead every fresh node with "read artifacts from `$ARTIFACTS_DIR/…`").
4. **Write the schemas** (Appendix B) into the `output_format` blocks; **write the rubric files**
   (Appendix C) into `assets/cinematic/rubrics/`.
5. **L1/L2** validate + self‑audit. Fix.
6. **L3 dry‑run** the full DAG. Fix wiring/assembly.
7. **L4 single‑asset live smoke**. Fix CLI/parse.
8. **L5 dumb‑model parity eval**; iterate schemas/rubrics/templates until parity. **Then** declare done.

> **Schedulable follow‑up:** none is implied by this plan. If, during L5, you intentionally leave a
> rubric threshold loosened "for now," that is the only thing worth a dated follow‑up — record it
> inline in the rubric file, not as a vague TODO.

---

## Appendix A
### Representative validated workflow YAML (abridged to the load-bearing nodes)

> The full file wires all phases; this excerpt shows every *construct* the plan relies on so its
> legality is auditable. The complete 37‑node file passed `archon validate` during planning (see
> §12 L1); author your build fresh via the Archon skill, using this excerpt for exact syntax and
> §6–§7 + Appendices B/C for the node content.

```yaml
name: cinematic-site
description: |
  Turn a website or business idea into a cinematic, scroll-animated landing page with an
  AI hero video (Higgsfield: Nano Banana Pro + Seedance 2.0 Fast), then build and deploy it.
  Decomposed, schema-constrained, critic-verified pipeline tuned so weak models match the
  cinematic-site-kit-higgsfield skill's quality. Gated at each PAUSE point. NOT for generic
  product photos or Remotion videos.
interactive: true
provider: claude
model: sonnet
thinking: adaptive
worktree:
  enabled: true

nodes:
  # ── A. PREFLIGHT ──
  - id: preflight
    script: preflight
    runtime: bun
    timeout: 60000
  - id: require-higgsfield
    cancel: "Higgsfield CLI not found/auth. Install + `higgsfield auth login`, then re-run."
    depends_on: [preflight]
    when: "$preflight.output.higgsfield == 'false'"
  - id: require-ffmpeg
    cancel: "ffmpeg required for scroll-frame extraction. Install ffmpeg and re-run."
    depends_on: [preflight]
    when: "$preflight.output.ffmpeg == 'false'"

  # ── B. INTAKE ──
  - id: intake-draft
    command: intake-draft
    depends_on: [preflight]
    when: "$preflight.output.higgsfield == 'true'"
    skills: [cinematic-site-kit-higgsfield]
    output_format: { type: object, properties: { mode: { type: string, enum: [existing-site, business-concept] }, want_showcase: { type: string, enum: ['true','false'] }, want_before_after: { type: string, enum: ['true','false'] } }, required: [mode, want_showcase, want_before_after] }
  - id: intake-check
    script: validate-json
    runtime: bun
    depends_on: [intake-draft]
    timeout: 20000
  - id: intake-gate
    approval:
      message: "Step 0 — review the brief + open questions. Reject with answers to refine; approve when accurate."
      capture_response: true
      on_reject:
        prompt: "Fold these answers into $ARTIFACTS_DIR/intake-brief.md and re-ask anything still vague: $REJECTION_REASON"
        max_attempts: 6
    depends_on: [intake-draft, intake-check]

  # ── D. GENERATION PLAN (keystone) ──
  - id: generation-plan
    command: generation-plan
    depends_on: [brand-gate]
    context: fresh
    model: opus
    output_format: { type: object, properties: { showcase_enabled: { type: string, enum: ['true','false'] }, before_after_enabled: { type: string, enum: ['true','false'] } }, required: [showcase_enabled, before_after_enabled] }
  - id: plan-critic
    command: critic-generic
    depends_on: [generation-plan]
    output_format: { type: object, properties: { verdict: { type: string, enum: [PASS, FAIL] } }, required: [verdict] }
  - id: plan-gate
    approval: { message: "Review the generation plan (and implied credit spend) before any paid generation." , capture_response: true }
    depends_on: [plan-critic]

  # ── F. SHOWCASE (conditional state-machine loop) ──
  - id: showcase-loop
    depends_on: [plan-gate]
    when: "$generation-plan.output.showcase_enabled == 'true'"
    idle_timeout: 1800000
    loop:
      prompt: |
        FRESH iteration. Run the next pending showcase work-item from
        $ARTIFACTS_DIR/showcase/plan.json. If it is a keyframe, use the NB-Pro geometry
        template; if a clip, use the 5-layer Seedance template. Generate via the pinned
        script, run the per-item critic, mark it done on PASS, seed the next item's refs.
        When no pending items remain: <promise>SHOWCASE_DONE</promise>
      until: SHOWCASE_DONE
      max_iterations: 60
      fresh_context: true
      until_bash: "bun .archon/scripts/plan-step.ts --all-done showcase"

  # ── E→H JOIN, BUILD ──
  - id: extract-frames
    script: extract-frames
    runtime: bun
    depends_on: [hero-gate, showcase-gate, beforeafter-gate]
    trigger_rule: none_failed_min_one_success
    timeout: 300000
  - id: site-plan
    command: site-plan
    depends_on: [extract-frames]
    context: fresh
  - id: assemble-site
    script: assemble-site
    runtime: bun
    depends_on: [site-plan]
    timeout: 120000
  - id: build-check
    script: build-check
    runtime: bun
    depends_on: [assemble-site]
    timeout: 60000
  - id: site-gate
    approval:
      message: "Open $ARTIFACTS_DIR/site/index.html and scroll. Reject with tweaks or approve to deploy."
      on_reject: { prompt: "Edit via site-plan/assemble-site (never freehand HTML). Keep single-file, bidirectional, legible: $REJECTION_REASON", max_attempts: 5 }
    depends_on: [build-check]

  # ── I. DEPLOY ──
  - id: deploy
    command: deploy-finalize
    depends_on: [site-gate]
    skills: [cinematic-site-kit-higgsfield]
    idle_timeout: 600000
```

*(Hero static nodes, brand nodes, before/after loop, and showcase gate are elided here for length but
specified in §6 and present in the validated skeleton.)*

## Appendix B
### Key `output_format` schemas (the externalized checklists)

**B.1 intake** — `mode`, `business_name`, `services[]`, `city`, `service_area`, `customers`,
`ideal_customer`, `ticket_band`, `mood[]` (≥1), `references[]`, `donots[]`, `want_showcase`,
`want_before_after`, `brands[]`, `deploy_target` (enum `vercel|local`), `domain`, `existing_assets`,
`open_questions[]`. Required: `mode, services, city, service_area, customers, want_showcase,
want_before_after, deploy_target`. (Enums all string.)

**B.2 brand-system** — `color_bg/primary/secondary/accent/text` (`^#[0-9a-fA-F]{6}$`),
`font_heading/body`, `font_heading_name/body_name`, `google_fonts_url`, `headline`, `tagline`,
`hero_line`, `sections[]:{key,title,body}`, `theme_direction`, `mood[4]`. All required.

**B.3 plan** — `hero:{reference_prompt, want_end_frame:'true'|'false', variants:int, duration:int}`,
`showcase:{enabled, scenes:[{label, mechanisms:[{event_category, wide_kf, setting_kf, motion_kf,
traversal_clip, mechanism_clip}]}]}`, `before_after:{enabled, pairs:[{caption, after_prompt}]}`,
`modules:[enum of 18]`, `scroll_heights:{hero, showcase}`, `deploy:{target, domain}`. The script
`plan-step.ts` flattens showcase into an ordered work‑item list with `status:'pending'`.

**B.4 director_brief** — `product`, `hero_moment`, `camera_start`, `camera_path`, `camera_end`,
`transforms[]` (≥2), `start_frame_prompt`, `end_frame_prompt`, `needs_new_start_frame:'true'|'false'`.
All required.

**B.5 video_prompt** — `opening_scene`, `beats:[{t, camera_motion, subject_motion}]` (**minItems 4**),
`camera_path_summary`, `negatives`. All required; `camera_motion`/`subject_motion` non‑empty per beat.

**B.6 site_plan** — `nav_links[]`, `sections:[{key, copy}]`, `modules:[{name, slots:{…}}]` (subset of
18; slots filled), `cta:{headline, button_label}`, `use_looping_hero:'true'|'false'`. Required:
`sections, modules, cta`.

**Critic verdict (shared)** — `{verdict: 'PASS'|'FAIL', reasons:[string], fixes:[string]}`.

## Appendix C
### Critic rubrics (verbatim from the skill's own checklists)

Each rubric is a vendored file; `critic-generic.md` receives the rubric path + the artifact to judge
and emits the shared verdict schema. The rubrics are lifted **verbatim** from the skill so the critic
applies the *same* bar Opus would:

- **C.2 brand** — every color/font/copy choice traces to the brief; **no city/brand appears that
  isn't in `intake-brief.md`**; hex valid; fonts real.
- **C.3 plan** — hero ref is 16:9 & specific; each mechanism is exactly one mechanism w/ 3‑phase
  chain; marquee iff brands; slider iff before/after; only requested optionals planned.
- **C.4 director's brief** — *"The hero moment should make someone say 'I want that.' If your final
  frame just looks like a closer version of the first frame, you chose wrong."* + camera must travel
  through space.
- **C.5 hero video prompt** — camera moving through space in **every** beat; subject motion layered;
  not a loop; ≤~1000 chars; includes stability + no‑morph negatives.
- **C.6 NB‑Pro keyframe** — describes **geometry not labels**; avoids the word "dark"; names the
  concrete interior through any gap; negates the wrong open‑mode; architectural‑continuity anchor
  present; tight crops exclude wide‑shot elements.
- **C.7 Seedance clip** — the 5 layers present & ordered; **one** mechanism only; physics *because*
  clause present; final frame ≈ destination keyframe.
- **C.8 site** — legible (no <0.7 opacity text); brands as marquee; before/after as slider; all
  scroll animations **bidirectional**; mobile 375px; CTA last; "go all out" (every section has
  something animated/interactive).

---

### One-line summary

**Decompose each skill step into many small nodes; make everything computable deterministic; force
every creative artifact through a rigid schema + a verbatim‑checklist critic loop; assemble the site
from vendored templates; and keep the skill's five human gates as the backstop — so the model's
residual job at every point is small enough that a weak model cannot meaningfully fail, and every
aspect is tunable in exactly one place.**
