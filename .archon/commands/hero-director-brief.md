---
description: Write the hero Director's Brief (Step 2B) — the 5 questions → schema; hero_moment must be a TRANSFORMATION, camera must travel through space.
argument-hint: (no arguments — reads $ARTIFACTS_DIR/scenes/hero/ref-prompt.txt and brand/brand-system.json)
---

# Hero Director's Brief — Cinematic Site (Step 2B)

**Workflow ID**: $WORKFLOW_ID

THINK BEFORE YOU PROMPT. This step is what separates a cinematic hero from a generic zoom. You are a director planning a ~10-second shot. The reference image is where the camera **begins**, not where it stays. This node runs with **fresh context** — load from files.

---

## Phase 1: LOAD (read these artifacts from $ARTIFACTS_DIR)

Read, in order:
1. `$ARTIFACTS_DIR/scenes/hero/ref-prompt.txt` — the reference/start frame that was generated (this defines where the camera STARTS: its framing, angle, distance).
2. `$ARTIFACTS_DIR/brand/brand-system.json` — `industry`, `theme_direction`, what the business sells, mood.

You may also glance at `$ARTIFACTS_DIR/plan.json` `hero.want_end_frame` as a prior, but you make the final call below.

---

## Phase 2: ANSWER THE 5 QUESTIONS (Step 2B, in order)

1. **What does this business actually sell?** Not the industry — the specific product/experience (a window company sells light and the threshold between inside and outside; a ramen shop sells the moment the steaming bowl arrives).
2. **What is the HERO MOMENT — the single most powerful visual?** This is the shot the camera travels TOWARD. It is usually NOT what's in the reference — it's what is *beyond it, inside it, or revealed by it*. **The hero moment must make someone say "I want that."**
3. **What is the camera's JOURNEY** from the reference frame to the hero moment? Name where it STARTS (the reference), what it TRAVELS THROUGH (a doorway, past a counter, over a surface, around a corner), and where it ENDS UP (the hero composition).
4. **What physically TRANSFORMS** during the journey? Things open, build, assemble, ignite, bloom, settle, reveal. Name at least two concrete changes.
5. **Does the reference work as a start frame, or do you need a new one?** If too tight/wide, missing depth for parallax, or wrong angle → set `needs_new_start_frame: 'true'`. Generate a distinct **end frame** when the transformation is dramatic (exterior→interior, blueprint→building) → set `want_end_frame: 'true'`.

**THE NON-NEGOTIABLE RULE (the critic will FAIL you otherwise):**
- The `hero_moment` must be a **TRANSFORMATION**, not a closer crop of the reference. *If your final frame just looks like a closer version of the first frame, you chose wrong.*
- The `camera_path` must describe **real travel THROUGH space** (push-in through a doorway, orbital arc, crane, tracking slide) — never a static camera or a mere zoom.

---

## Phase 3: GENERATE — fill the schema and write the artifact

Return the node's `output_format` JSON with EXACTLY these fields:
- `product` — string (what the business sells, one sentence)
- `hero_moment` — string (the transformed final composition — NOT a closer crop)
- `camera_start` — string (where the camera begins, from the reference)
- `camera_path` — string (the travel THROUGH space, with direction/distance/motion type)
- `camera_end` — string (the final framing at the hero moment)
- `transforms` — array of strings, **≥2** (the concrete physical changes during the journey)
- `start_frame_prompt` — string (NB-Pro prompt for the start frame: reuse/refine the reference; if `needs_new_start_frame` is true, a full new 16:9 prompt)
- `end_frame_prompt` — string (NB-Pro edit prompt: "Create an image exactly like this reference, but [the hero-moment change]. Same style, same composition, same lighting." — used only if `want_end_frame` is true)
- `want_end_frame` — `'true'`|`'false'` (string)
- `needs_new_start_frame` — `'true'`|`'false'` (string)

**Required:** all of the above; `transforms` must have ≥2 entries; booleans are quoted strings.

**Write the artifact (convention #2):** write the EXACT JSON object you return to `$ARTIFACTS_DIR/scenes/hero/director-brief.json`. The `gen-hero-end` script reads `end_frame_prompt` from this file (gated on `want_end_frame`), and the hero-video-prompt node reads this brief.

### PHASE_3_CHECKPOINT
- [ ] `hero_moment` is a transformation, NOT a closer crop of the reference
- [ ] `camera_path` describes real travel through space (not static, not a plain zoom)
- [ ] `transforms` has ≥2 concrete physical changes
- [ ] `want_end_frame` set deliberately; `end_frame_prompt` is a valid "exactly like this reference, but…" edit
- [ ] `needs_new_start_frame` set; `start_frame_prompt` matches that decision
- [ ] All booleans quoted strings
- [ ] `$ARTIFACTS_DIR/scenes/hero/director-brief.json` written with the exact returned JSON

## Phase 4: REPORT

Return the JSON object (matching `output_format`). One-line note: the hero moment and the one-sentence camera journey (start → through → end), plus whether an end frame will be generated.
