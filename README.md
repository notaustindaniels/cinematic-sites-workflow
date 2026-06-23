# cinematic-site — Archon workflow

An Archon workflow that reproduces the **`cinematic-site-kit-higgsfield`** Claude skill — turning a
website or business idea into a cinematic, scroll-animated landing page with an AI-generated hero video
(Higgsfield: Nano Banana Pro images + Seedance 2.0 Fast video), then building and deploying it.

It is a **decomposed, schema-constrained, critic-verified** pipeline: every point where the original
skill relied on deep model judgment is externalized into a deterministic script, a fill-in-the-blanks
template, a rigid `output_format` schema, a verbatim-checklist critic, or a human gate — so a *weak*
model can match Opus-grade output. See `CINEMATIC-ARCHON-WORKFLOW-PLAN.md` for the full design spec and
`.archon/BUILD-CONTRACT.md` for the file/interface contract.

## Layout

```
.archon/
├── config.yaml                     # repo-scoped Archon config
├── workflows/cinematic-site.yaml   # the 38-node DAG
├── commands/        (8)            # AI command files (intake, brand, plan, hero prompts, site, deploy)
├── scripts/        (14 + lib)      # deterministic bun scripts (preflight, hf-image/video, assemble-site, …)
└── assets/cinematic/
    ├── scroll-frame-engine.js, design-system.css, showcase-overlay.{css,js}, brand-card-template.html
    ├── modules/    (18)            # vendored cinematic modules (assembler patches stagger-grid → bidirectional)
    ├── rubrics/    (8)             # verbatim critic checklists
    └── templates/  (3)            # NB-Pro keyframe / Seedance 5-layer clip / before-after templates
```

## Prerequisites

`higgsfield` (authenticated: `higgsfield auth login`), `ffmpeg`/`ffprobe`, `bun`, `jq`, ImageMagick
(`magick`/`convert`); `gh` + `vercel` only if deploying to Vercel. `preflight` checks all of these and
the workflow cancels cleanly with instructions if a required tool is missing.

## Running it

> **Run from a normal shell, not inside Claude Code.** Archon warns that workflows can hang when launched
> from a nested `CLAUDECODE=1` session. Use `archon serve` or a plain terminal. Suppress the warning with
> `ARCHON_SUPPRESS_NESTED_CLAUDE_WARNING=1`.

```bash
# Validate (should be clean):
archon validate workflows cinematic-site
archon validate commands

# Full run (isolated worktree). It is INTERACTIVE — it pauses at 7 approval gates
# (intake, brand, plan, hero, showcase, before/after, site). Approve/reject in chat or via:
#   archon workflow approve <run-id> [--comment "..."]
#   archon workflow reject  <run-id>  --reason "use variant 2; door looks morphed"
archon workflow run cinematic-site --branch cinematic/acme "Cinematic site for Acme Windows in Boulder, CO"
```

### Dry-run (no credits) — full-engine smoke test

Set `HF_DRY_RUN=1` so `hf-image`/`hf-video` synthesize placeholder assets (via ffmpeg) instead of
calling the paid API. Add it to the launching shell's env (or temporarily to `.archon/config.yaml`'s
`env:` block):

```bash
HF_DRY_RUN=1 archon workflow run cinematic-site --branch cinematic/dryrun "test brief"
```

This exercises every node, gate, loop, branch, the assembler, and `build-check` end-to-end without
spending a credit. (The deterministic backbone has already been validated this way — see "Status".)

## Status (what's been verified)

- **L1 — static validation: PASS.** `archon validate workflows cinematic-site` → ok; `archon validate
  commands` → 61 valid, 0 errors.
- **L2 — silent-failure audit: PASS.** No AI fields on non-AI nodes; no `retry` on loops; `interactive:
  true` at workflow level; `none_failed_min_one_success` joins after conditional branches; script
  timeouts (not idle_timeout); `when:` reads quoted-string enums.
- **L3 — deterministic dry-run: PASS.** The full DET backbone (preflight → intake-check → brand-card →
  plan-flatten → hero chain → showcase loop → before/after loop → extract-frames → assemble-site →
  build-check) runs green with `HF_DRY_RUN=1`, producing a valid 28 KB `index.html` that passes
  `build-check`.
- **L4 — live single-asset smoke:** executed during planning (32 credits; verified the `.result_url`
  parse and fast-mode 720p). See plan §12 L4.
- **L5 — weak-model parity eval:** the acceptance test — run the full workflow (above) on your weakest
  target model and score the result against the skill's own checklists. Iterate schema bounds / rubrics /
  templates until parity. See plan §12 L5.

## Tuning surface (every knob, one place)

| Aspect | Where |
|---|---|
| Model per node (cheap glue vs strong planner/critic) | workflow `model:` + per-node `model:` in the YAML |
| Director's-brief / camera / prompt strictness | the `output_format` schemas in the YAML + the rubrics in `assets/cinematic/rubrics/` |
| NB-Pro vs Seedance prompt rules | `assets/cinematic/templates/keyframe-template.md` / `clip-template.md` |
| Hero length / variants / resolution | `plan.json` (via `generation-plan`) + `hf-video.ts` / `hf-image.ts` flags |
| Modules & industry pairings | `generation-plan` + `site-plan` + `assemble-site.ts` |
| Brand tokens (color/font/copy) | `brand-system.json` (single source; every module + card reads it) |
| Scroll heights / design system | `plan.json.scroll_heights` + `assets/cinematic/design-system.css` |
| Per-item vs per-scene human review | `showcase-loop.interactive` + `gate_message` |
| Regeneration headroom | `loop.max_iterations`, gate `on_reject.max_attempts` |
| Deploy target | intake / `plan.json.deploy` |
| Dry-run (no credits) | `HF_DRY_RUN=1` |

Full catalog: plan §10.
