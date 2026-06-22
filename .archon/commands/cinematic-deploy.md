---
description: Step 4 of the cinematic site pipeline — deploy the approved site to Vercel via GitHub, or finalize a local-only build.
argument-hint: (no arguments — reads the deployment preference from the intake brief)
---

# Cinematic Site — Step 4: Deploy

**Workflow ID**: $WORKFLOW_ID

You have the **cinematic-site-kit-higgsfield** skill preloaded. Run its **Step 4 — Deploy**.

---

## Phase 1: LOAD

- Read the deployment preference (`vercel` or `local`, custom domain vs preview) from
  **`$ARTIFACTS_DIR/intake-brief.md`**.
- Read **`$ARTIFACTS_DIR/site/build-notes.md`** for the built site path. The site lives in the
  repo working dir at `./<brand-slug>/` (mirrored in `$ARTIFACTS_DIR/site/`).
- Preflight tooling (JSON): `$preflight.output` — note whether `gh` / `vercel` are available.

## Phase 2: EXECUTE

- **`vercel`** (and tooling present): from the site dir, `git init && git add . && git commit`,
  then `gh repo create "<slug>" --private --source=. --push`, then guide the Vercel import
  (or `vercel --prod --yes` if the CLI is available). Capture the resulting live URL.
- **`local`**, or required tooling missing: do NOT attempt a remote push. Finalize the local
  build and write the exact commands the user can run later to deploy.

This workflow runs in an isolated worktree — the built site is also copied to
`$ARTIFACTS_DIR/site/`, which persists after the run. Make that clear so the deliverable isn't
lost with the worktree.

## Phase 3: GENERATE

Write **`$ARTIFACTS_DIR/deploy-summary.md`**:
- Live URL (if deployed) or the durable local path to the site
- The GitHub repo created (if any)
- Exact follow-up commands for redeploys, or for deploying later if local-only

### PHASE_3_CHECKPOINT
- [ ] Live URL captured, OR local path + deploy-later instructions written
- [ ] Durable location of the site stated (so nothing is lost with the worktree)

## Phase 4: REPORT

Give the user the live URL or local path, the repo (if created), and how to update the site
later. This is the final step.
