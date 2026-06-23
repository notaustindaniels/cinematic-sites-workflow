---
description: Write the Seedance hero video prompt (Step 2C / §7.2) — ≥4 timeline beats, camera moving through space every beat + layered subject motion, not a loop, with stability/no-morph negatives.
argument-hint: (no arguments — reads $ARTIFACTS_DIR/scenes/hero/director-brief.json and brand/brand-system.json)
---

# Hero Video Prompt — Cinematic Site (Step 2C)

**Workflow ID**: $WORKFLOW_ID

THE CRITICAL PART. A vague prompt = a garbage Ken Burns zoom. You translate the Director's Brief into a second-by-second timeline where the camera is **always moving through space** and subject motion is layered on top. This node runs with **fresh context** — load from files.

---

## Phase 1: LOAD (read these artifacts from $ARTIFACTS_DIR)

Read, in order:
1. `$ARTIFACTS_DIR/scenes/hero/director-brief.json` — `product`, `hero_moment`, `camera_start`, `camera_path`, `camera_end`, `transforms[]`. This is your script. The video goes A → B and does NOT return to A.
2. `$ARTIFACTS_DIR/brand/brand-system.json` — mood/tone to match the look.

---

## Phase 2: WRITE THE TIMELINE (Step 2C rules — read carefully)

This is the Step 2C hero shot architecture (one long ~8-10s shot with multiple simultaneous motions). Do NOT use the showcase 5-layer clip formula here.

1. **Second-by-second timeline.** Break the shot into beats (0-2s, 2-5s, 5-8s, 8-10s …) — at least **4 beats**.
2. **THE CAMERA MUST ALWAYS BE MOVING THROUGH SPACE — every beat.** Dolly push-in, orbital arc, crane, tracking slide, pull-back, or a combination. Never static, never a mere zoom. Each beat states the camera's spatial movement (direction, speed, magnitude).
3. **Layer subject motion ON TOP of camera motion — every beat.** The camera travels AND things in the scene move (steam rising, broth pouring, panels folding, light shifting). Camera alone = boring parallax; subject alone = animated photo; both = cinematic.
4. **Progress A → B, do NOT loop.** The shot ends at the hero-moment destination — it must NOT cycle back to the start frame. The final beat **decelerates but keeps moving**: it is the *slowest* spatial travel of the shot (a slow continuing drift, settle, or easing arc through space), NOT a stop. Describe it as continuing motion — e.g. "eases into a slow forward drift" / "settles into a gentle continuing rise." Do NOT use "near-still", "holds still", "comes to rest", "motionless", or "a breath, not a move" — every beat, including the last, must describe actual spatial travel (the skill's rule: *decelerates but does NOT stop abruptly; slight drift continues*).
5. **State what does NOT move** and include **negatives**: smooth stabilized, no shake, no jitter, no morphing, no shape-shifting, no new objects, does not loop.
6. **Keep it tight — the flattened `.txt` MUST be ≤ ~1000 characters total** (Seedance degrades past that; the critic FAILS a significantly longer prompt). Budget it: `opening_scene` ≤ ~160 chars; each beat's `camera_motion` + `subject_motion` ≤ ~110 chars *combined* (one tight clause each); `camera_path_summary` ≤ ~150; `negatives` ≤ ~110. Write specific-but-terse — no decorative adjectives stacked three-deep. With 4 beats that lands ≈ 850 chars.

---

## Phase 3: GENERATE — fill the schema, write BOTH artifacts

**(a) Return the node's `output_format` JSON with EXACTLY these fields:**
- `opening_scene` — string (the starting scene + where the camera begins)
- `beats` — array, **minItems 4**, each `{ t, camera_motion, subject_motion }`:
  - `t` — the time window (e.g. `"0-2s"`)
  - `camera_motion` — the camera's spatial travel this beat (non-empty, never static)
  - `subject_motion` — what physically moves/transforms this beat (non-empty)
- `camera_path_summary` — string (full one-line camera path summary)
- `negatives` — string (stability + no-morph + no-loop: e.g. "Smooth stabilized, no shake, no jitter. No morphing, no shape-shifting, no new objects. Does not loop.")

**Required:** `opening_scene, beats (≥4), camera_path_summary, negatives`. Every beat's `camera_motion` and `subject_motion` must be non-empty (the critic FAILS any static/empty camera beat, anything that reads as a loop, or missing negatives).

**(b) Write the structured JSON** to `$ARTIFACTS_DIR/scenes/hero/video-prompt.json` — the EXACT object you return (convention #2).

**(c) Write the flattened final prompt** to `$ARTIFACTS_DIR/scenes/hero/video-prompt.txt` — a single Seedance-ready prompt STRING that `gen-hero-video.ts` feeds to the CLI. Flatten like this:
- start with `opening_scene`;
- then each beat as a line `"<t>: <camera_motion>. <subject_motion>."`;
- then `"Camera path: <camera_path_summary>."`;
- then the `negatives` string.
The `.txt` must read as one coherent prompt and **include the negatives** at the end.

### PHASE_3_CHECKPOINT
- [ ] `beats` has ≥4 entries; EVERY beat has non-empty `camera_motion` AND `subject_motion`
- [ ] Camera moves through space in every beat (no static, no plain zoom) — INCLUDING the final beat, which is a slow *continuing* drift/settle, never "near-still"/"holds still"/"comes to rest"
- [ ] Shot progresses A→B and does NOT loop (final beat is a different state from opening, no return to start)
- [ ] `negatives` includes stability (no shake/jitter) + no-morph/no-new-objects + does-not-loop
- [ ] **Flattened `.txt` is ≤ ~1000 characters total** (check it — trim if over)
- [ ] `$ARTIFACTS_DIR/scenes/hero/video-prompt.json` written (exact returned JSON)
- [ ] `$ARTIFACTS_DIR/scenes/hero/video-prompt.txt` written (flattened prompt INCLUDING negatives)

## Phase 4: REPORT

Return the JSON object (matching `output_format`). One-line note: number of beats and the camera_path_summary; confirm both video-prompt.json and video-prompt.txt were written.
