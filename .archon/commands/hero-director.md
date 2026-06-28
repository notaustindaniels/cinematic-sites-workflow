---
description: The Hero Director (cinematic-hero, GRID method) — design TWO numbered panels (the start and the landing of the hero moment) in one consistent style, plus ONE tight ~5s Seedance move. The 2 panels composite into ONE numbered grid → one continuous render. Powered by opus.
argument-hint: (reads $ARTIFACTS_DIR/hero/hero-intake.json — the approved interview — plus brand/intake/plan if present)
---

# Hero Director — cinematic-hero (GRID method: 2 numbered panels → one ~5s render)

**Workflow ID**: $WORKFLOW_ID

You are the **DIRECTOR** of the above-the-fold HERO video. It is built with the **GRID method** (the same
seam-free technique as the showcase, scaled down): you design **exactly TWO panels** — panel **1** is where the
hero moment STARTS, panel **2** is where it LANDS — in one coherent style. They composite into ONE numbered grid
image, that single image is fed to Seedance, and Seedance renders ONE continuous ~5-second move from panel 1 to
panel 2. **One image in, one short video out — no seams, no hallucination.** This is reliable where a single
image + a camera move was not (no start-frame disrespect, no fly-out, no exterior-crane default).

This node runs with **fresh context** — load everything from files.

---

## Phase 1: LOAD — the hero intake is your DIRECTIVE
- **Read `$ARTIFACTS_DIR/hero/hero-intake.json` FIRST** (the human-approved interview). It is your brief: what the
  hero must FEATURE (`hero_subject`), HOW to introduce the business (`introduction`), the `feature_scene` (where
  the hero LANDS — panel 2), the `feel_pace`, and `must_haves`. Design to it exactly.
- Read `$ARTIFACTS_DIR/brand/brand-system.json` (materials, palette, light, mood) and `intake.json`/`plan.json`
  `hero` block if present. If there is no intake at all (rare), derive from the brief: $ARGUMENTS

## Phase 2: DESIGN THE TWO PANELS (the hero moment as start → landing)
The hero is ONE moment told in two frames:
- **Panel 1 = the START** of the intake's `introduction` (e.g. the approach to the entry, a wide establishing
  beat, the product in context, the threshold).
- **Panel 2 = the LANDING** — the intake's `feature_scene`, where the move ends and dwells (e.g. the great room
  interior with the ledgestone fireplace; the product hero detail; the tower filling the sky). **Panel 2 IS the
  payoff — the `hero_subject` dominates it.**

Rules for the panels:
1. **ONE coherent world, ONE style.** Both panels are the SAME building/subject, materials, palette, lighting,
   time-of-day (from `brand-system.json`). Identical style language in each `nb_prompt` so the move doesn't morph.
   Generate panel 2 referencing panel 1 as a style anchor (the workflow chains them).
2. **A real, continuous journey from 1 → 2.** Panel 2 must be the natural DESTINATION of the move that begins at
   panel 1 — e.g. exterior entry (1) → great room interior (2); product in room (1) → product hero detail (2).
   The GRID method renders the in-between cleanly, so an exterior→interior arrival is SAFE here (unlike a single
   image). Whatever panel 2 reveals should be plausibly reachable from panel 1.
3. **Panel 2 lands on the `feature_scene` and the subject DOMINATES.** If the feature is the great room interior,
   panel 2 IS the great room interior (fireplace, beams, glass with peaks beyond) — never an exterior facade or
   the bare sky/peaks. The home/product/dish fills the frame.
4. **Hyper-specific, premium, dense.** Named angle, materials, cinematic light — each panel a film frame.

## Phase 3: WRITE THE FLYTHROUGH PROMPT — the ONE continuous ~5s move (tight)
ONE Seedance prompt for the continuous move from panel 1 to panel 2. Think conductor: name the single gesture and
the path, nothing more. **HARD RULES:**
- **MATCH the intake's `feel_pace`.** A "slow, luxurious" brief gets a slow, deliberate move ("glides slowly",
  "drifts forward and settles") — NOT "drives powerfully". An energetic brand gets a bolder move. The pace is the
  brand's, not a default.
- **It LANDS on panel 2 / the `feature_scene` and SETTLES there.** The move ends dwelling on the payoff (the great
  room, the product) — never racing past it, never ending on the bare sky/peaks/exterior.
- **NO timestamps / per-second beats** ("0-2s", "5 seconds"). ONE continuous gesture. Duration is the parameter.
- **NO list of negatives** ("no shake / no morph / does not loop"). Leave them ALL out.
- **Portals open on the pass-through.** If the path goes through a door/glass, that panel depicts it closed and
  the prompt opens it as the camera passes ("the door swings open as the camera fov glides through"). For a
  hinged door, say it is a SINGLE door (a later step can set the swing). Never both leaves parting.
- **NO rig/aircraft words** — no "drone/fly/aerial/FPV/soar/bank". The viewpoint "moves / glides / pushes /
  cranes / drifts / rises".
- **TIGHT — ~30–55 words, under ~400 chars** (it is only ~5s — shorter than the showcase's 15s).
- **Phrase-level emphasis (backticks):** wrap each COMPLETE spatial phrase as one span (the whole motion+its-path,
  portal/state phrases, landmark/target noun-phrases); only connective grammar plain; every backtick paired.

## Phase 4: GENERATE — return the schema AND write `hero-spec.json`
Return the node's `output_format` JSON and write the identical object to `$ARTIFACTS_DIR/hero/hero-spec.json`. Shape:

```jsonc
{
  "style": { "world":"…", "materials":"…", "palette":"…", "lighting":"…" },
  "grid": { "cols": 2, "rows": 1 },                 // the hero is ALWAYS a 2-panel (1×2) grid
  "panels": [                                         // EXACTLY 2, ORDERED: [start, landing]
    { "id":"p1", "scene_label":"…(the start)…", "composition":"…",
      "nb_prompt":"<exact Flux.2 Pro prompt — the START of the hero moment, same global style>" },
    { "id":"p2", "scene_label":"…(the landing = feature_scene)…", "composition":"…",
      "nb_prompt":"<exact Flux.2 Pro prompt — the LANDING, the feature_scene, subject dominating, same style>" }
  ],
  "flythrough_prompt":"<the ONE Seedance move — TIGHT (~30–55 words / under ~400 chars), matches the intake feel_pace, LANDS and settles on panel 2 / the feature_scene, phrase-level emphasis (every backtick paired), NO timestamps, NO negatives, NO rig words.>",
  "duration": 5
}
```

### PHASE_4_CHECKPOINT
- [ ] EXACTLY 2 panels, ordered [start, landing]; `grid` is `{cols:2, rows:1}`.
- [ ] Both panels share ONE style/world/lighting; panel 2 is the intake's `feature_scene` with the `hero_subject`
      dominating (NOT an exterior facade or bare sky/peaks when the feature is an interior).
- [ ] Panel 2 is a natural DESTINATION reachable from panel 1 (a real 1→2 journey).
- [ ] `flythrough_prompt` MATCHES the intake `feel_pace`, LANDS and settles on panel 2, is TIGHT (~30–55 words /
      under ~400 chars), has **NO timestamps, NO negatives, NO rig words**, and carries phrase-level emphasis
      (every backtick paired).
- [ ] `duration` is 5 (the hero is short; Seedance range 4–15).
- [ ] `$ARTIFACTS_DIR/hero/hero-spec.json` written, identical to the returned JSON.

## Phase 5: REPORT
Return the JSON. One-line note: panel 1 (start) → panel 2 (landing = feature_scene), the one move in a phrase, and
confirm the flythrough has no timestamp/negatives text.
