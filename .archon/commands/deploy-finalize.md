---
description: Deploy the finished site (Step 4) — vercel+gh → live URL, else finalize locally with exact deploy-later commands; ALWAYS persist deliverables to $ARTIFACTS_DIR.
argument-hint: (no arguments — reads $ARTIFACTS_DIR/plan.json deploy target)
---

# Deploy & Finalize — Cinematic Site (Step 4)

**Workflow ID**: $WORKFLOW_ID

You ship the finished site and guarantee the deliverables survive. The worktree is disposable, so persisting everything to `$ARTIFACTS_DIR` is mandatory regardless of deploy outcome. This node runs with **fresh context** — load from files.

---

## Phase 1: LOAD (read these artifacts from $ARTIFACTS_DIR)

1. Read `$ARTIFACTS_DIR/plan.json` — the `deploy` object: `deploy.target` (`vercel`|`local`) and `deploy.domain`.
2. Confirm the build exists: `$ARTIFACTS_DIR/site/index.html` (plus `site/frames/`, and `site/showcase-frames/` if present). The generated media lives under `$ARTIFACTS_DIR/scenes/`.

---

## Phase 2: CHECK TOOLING (with Bash — check the tools themselves, not preflight.json)

Probe the actual tooling now (it may differ from preflight):
```bash
command -v gh && gh auth status >/dev/null 2>&1 && echo "gh:ok" || echo "gh:no"
command -v vercel && echo "vercel:ok" || echo "vercel:no"
command -v git && echo "git:ok" || echo "git:no"
```

Decide the path:
- **deploy.target == vercel AND vercel present AND gh present (and git present)** → live deploy (Phase 3A).
- **otherwise** (target local, or any required tool missing) → local finalize + deploy-later commands (Phase 3B).

---

## Phase 3A: LIVE DEPLOY (vercel + gh present)

Run from the site directory (the worktree's `site/`). Use a slug derived from the business name.
```bash
git init && git add . && git commit -m "Initial cinematic site"
gh repo create "<slug>" --private --source=. --push
vercel --prod --yes
```
Capture the **live production URL** that `vercel --prod` prints. If `deploy.domain` is set, note the custom-domain follow-up. If a step fails, fall back to Phase 3B and record what failed.

## Phase 3B: LOCAL FINALIZE (no live deploy)

Finalize the site locally and write the EXACT commands the user can run later to deploy, e.g.:
```bash
cd <persisted-site-dir>
git init && git add . && git commit -m "Initial cinematic site"
gh repo create "<slug>" --private --source=. --push
vercel --prod --yes        # or: npm i -g vercel && vercel --prod --yes
```
State precisely which tool was missing (gh / vercel / auth) and how to install/login.

---

## Phase 4: PERSIST DELIVERABLES (ALWAYS — both paths)

The worktree is disposable. Copy the full deliverables into `$ARTIFACTS_DIR/` so they persist:
```bash
mkdir -p "$ARTIFACTS_DIR/site" "$ARTIFACTS_DIR/scenes"
cp -R site/. "$ARTIFACTS_DIR/site/" 2>/dev/null || true
cp -R scenes/. "$ARTIFACTS_DIR/scenes/" 2>/dev/null || true
```
(If `site/` and `scenes/` are already under `$ARTIFACTS_DIR`, ensure they are complete — never leave them only in the worktree.)

---

## Phase 5: REPORT — write the deploy summary

Write `$ARTIFACTS_DIR/deploy-summary.md` covering:
- Outcome: **live** (with the production URL) or **local** (with the durable path to `$ARTIFACTS_DIR/site/index.html`).
- The repo slug / URL if created.
- The exact deploy-later or redeploy commands (3B commands, or the "git push → Vercel auto-deploys" loop for live).
- A short inventory of persisted deliverables (site + scenes) under `$ARTIFACTS_DIR/`.

### PHASE_5_CHECKPOINT
- [ ] Tooling probed with Bash (gh/vercel/git), path chosen accordingly
- [ ] Live path: production URL captured; or local path: exact deploy-later commands written
- [ ] `site/` AND `scenes/` copied into `$ARTIFACTS_DIR/` (deliverables persist)
- [ ] `$ARTIFACTS_DIR/deploy-summary.md` written with outcome, URL/path, commands, inventory

## Phase 6: REPORT

Return a concise summary: live URL or durable local path, what was persisted, and how to (re)deploy. The final workflow node prints `deploy-summary.md`.
