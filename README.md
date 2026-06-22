# Cinematic Sites — Archon Workflow

An [Archon](https://archon.diy) workflow that runs the **`cinematic-site-kit-higgsfield`**
Claude skill's 5-step pipeline as a gated, isolated, resumable workflow: turn an existing
website or a business idea into a cinematic, scroll-animated landing page with an AI-generated
hero video (Higgsfield — Nano Banana Pro images + Seedance 2.0 Fast video), then build and
deploy it.

## How it maps the skill

Each creative step is an AI node with the relevant skill(s) **injected** (so the skill stays the
source of truth — the command files just orchestrate and pass artifacts), followed by an
**approval gate** with `on_reject` rework that stands in for the skill's "PAUSE — wait for
approval" moments.

```
preflight (bash)  →  require-higgsfield (cancel if CLI missing)
  → intake            → ✋ intake-gate     (Step 0 — client intake)
  → brand-analysis    → ✋ brand-gate      (Step 1 — brand card)
  → scene-generation  → ✋ scene-gate      (Step 2 — hero/showcase/before-after video)
  → website-build     → ✋ site-gate       (Step 3 — scroll-animated single-file site)
  → deploy                                 (Step 4 — Vercel/GitHub or local)
```

State flows between fresh nodes via `$ARTIFACTS_DIR/` artifacts:
`intake-brief.md` → `brand/brand-system.md` → `scenes/scene-manifest.md` → `site/` → `deploy-summary.md`.

## Requirements

- `archon` CLI, run from inside this git repo
- Higgsfield CLI installed **and** signed in (`higgsfield auth login`) — the preflight cancels
  the run if it's missing; generation needs you authenticated
- `ffmpeg` (frame extraction / stitching); `gh` + Vercel for deploy (optional — local mode works without)
- The skills injected by the workflow must be installed under `~/.claude/skills/`:
  `cinematic-site-kit-higgsfield`, `higgsfield-generate`, `higgsfield-soul-id`,
  `higgsfield-product-photoshoot`

## Run it

It's an **interactive** workflow (approval gates), so run it in the foreground and approve/reject
each gate:

```bash
archon workflow run cinematic-site-higgsfield \
  --branch cinematic/acme \
  "Build a cinematic site for Acme Windows & Doors — https://acme.example"

# at each ✋ gate:
archon workflow approve <run-id> --comment "use hero variant 2"
archon workflow reject  <run-id> --reason  "warmer palette, name the brands as a logo marquee"
```

## Layout

```
.archon/
├── config.yaml                              # repo-scoped config
├── workflows/cinematic-site-higgsfield.yaml # the DAG
└── commands/
    ├── cinematic-intake.md
    ├── cinematic-brand-analysis.md
    ├── cinematic-scene-generation.md
    ├── cinematic-website-build.md
    └── cinematic-deploy.md
```
