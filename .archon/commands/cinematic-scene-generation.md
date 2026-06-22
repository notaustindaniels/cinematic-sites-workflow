---
description: Step 2 of the cinematic site pipeline — scene generation via Higgsfield (Nano Banana Pro images + Seedance 2.0 Fast video). The most important step; a bad video = a bad site.
argument-hint: (no arguments — reads the approved brand system + intake brief from artifacts)
---

# Cinematic Site — Step 2: Scene Generation

**Workflow ID**: $WORKFLOW_ID

You have **cinematic-site-kit-higgsfield**, **higgsfield-generate**, **higgsfield-soul-id**,
and **higgsfield-product-photoshoot** preloaded. Run the kit's **Step 2 — Scene Generation**.
This is the highest-stakes step — follow it precisely. Models are fixed: **Nano Banana Pro
(`nano_banana_2`)** for images, **Seedance 2.0 Fast (`seedance_2_0 --mode fast`)** for video.

---

## Phase 1: LOAD & PREFLIGHT

- Read **`$ARTIFACTS_DIR/brand/brand-system.md`** and **`$ARTIFACTS_DIR/intake-brief.md`**.
- From the brief, note: showcase video wanted? before/after pairs wanted? subject matter.
- Confirm Higgsfield is usable: `higgsfield account status`. If not signed in, stop and tell
  the user to run `higgsfield auth login` (it is interactive) — do not burn attempts blindly.
- Always pass **`--wait`** so each generate call blocks and prints the result URL, then
  download it with `curl -s -o <file> "<url>"`.

## Phase 2: EXECUTE

Work into **`$ARTIFACTS_DIR/scenes/`**. Self-gate like the skill's human gates: inspect each
image/clip yourself before building on it; archive bad attempts under
`$ARTIFACTS_DIR/scenes/bad_attempts/` with their prompts so you can iterate the prompt.

1. **Hero (always):** reference image (Nano Banana Pro, 16:9) → write the **Director's Brief**
   (the 5 questions: product, hero moment, camera journey, what transforms, start/end frames)
   → write a **second-by-second video prompt** where THE CAMERA IS ALWAYS MOVING THROUGH SPACE
   with subject motion layered on top → generate **2–3 hero variants** with Seedance 2.0 Fast
   (start-image, optional end-image, 1080p, 16:9, `--generate_audio false`).
2. **Showcase (only if the brief asks):** apply Step 2E — three-phase keyframe chains (wide →
   setting → motion), one mechanism per clip, the 5-layer Seedance formula for the atomic
   clips; stitch with ffmpeg. Self-verify every keyframe before animating it.
3. **Before/after (only if the brief asks):** Step 2F — generate the "after" first, then derive
   the matching "before" via `--image`, so the slider comparison lines up.

## Phase 3: GENERATE

Write **`$ARTIFACTS_DIR/scenes/scene-manifest.md`** — the spec Step 3 builds from:

- **Hero variants** — file paths, the prompt used, one-line note on each; mark a recommended one
- **Director's Brief** — the final brief text
- **Showcase** (if built) — final stitched path, per-scene overlay labels, the keyframe chain
- **Before/after** (if built) — each pair's before+after paths and a caption
- Source video files kept in `$ARTIFACTS_DIR/scenes/` (Step 3 extracts frames from the chosen one)

### PHASE_3_CHECKPOINT
- [ ] Every asset path in the manifest exists on disk
- [ ] Hero shows real spatial camera travel start→end (not a Ken Burns zoom, not a loop)
- [ ] Only the assets the brief asked for were generated (no unrequested showcase/before-after)

## Phase 4: REPORT

List the hero variants (with your recommendation) and any showcase/before-after assets, and
tell the user how to view them. Ask them to approve + name the hero variant to use, or reject
with specifics so you regenerate only the affected assets.
