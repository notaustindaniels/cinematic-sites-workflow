# Rubric — Showcase Grid-Spec Critic (the full critique applied in the refine loop)

Apply this to `$ARTIFACTS_DIR/showcase/grid-spec.json`. Emit `{verdict:"PASS"|"FAIL", reasons:[...], fixes:[...]}`.
Be strict and concrete — quote the offending clause. Any FAIL item fails the verdict. The deterministic
state-checks are not your job; these are the judgment checks the Director must satisfy before any panel is made.

## A. Panels read as ONE place
- [ ] **Consistent world/materials/palette/lighting.** Every panel's `nb_prompt` anchors the SAME building,
  materials, palette, and time-of-day. A panel that drifts (different mood, materials, or time of day) is FAIL.
- [ ] **Distinct compositions.** Each panel is a genuinely different vantage/space (not near-duplicates).
- [ ] **panels.length == grid.cols × grid.rows.**

## B. The path is a coherent, paradox-free journey (the hard part)
- [ ] **Journey order is a real spatial progression** through one home (any levels), each space new/unseen.
- [ ] **Every turn is a TWO-BEAT move: a BOUNDED ANGLE + direction to FACE the next space, THEN a straight-ahead
  commit** ("turns 90 degrees left to face the archway, then continues straight ahead through it"), including the
  turn that precedes a vertical move ("turns 90 degrees right to face the stair, then rises up"). A bare unbounded
  "turns left/right" is FAIL — Seedance over-rotates it ~180° and invents a scene behind. **A bounded turn with NO
  straight-ahead commit after it is ALSO FAIL** — the angle in words alone does not stop Seedance over-rotating
  past it into a U-turn; the forward-commit beat is what terminates the rotation. A direction-less/angle-less turn
  ("pivots to the stair", "turns a corner") is also FAIL.
- [ ] **Turn directions MATCH the panel layouts.** Cross-check each turn against the panel it reveals: if a
  panel's `composition` places the next space to the right, the prompt must "turn 90 degrees RIGHT" into it, not
  left. A
  turn whose named direction contradicts where that space sits in its panel is FAIL — quote both.
- [ ] **No same-direction double-turn that reverses into a seen space.** Track the cumulative heading: two
  consecutive turns the same way (left→left or right→right) ≈ a 180° U-turn; in an open plan that faces a space
  already shown — Seedance re-renders it as a wrong room. FAIL such a sequence (and FAIL a "fix" that would
  create one — flag that the path itself must be restructured, e.g. via a doorway or a level change).
- [ ] **Never faces/re-enters a seen space.** "turns back / looks back / returns to / re-enters" = FAIL.

## C. The prompt is tight and clean
- [ ] **Short:** ~50–80 words / **under ~500 characters**. A long, over-detailed prompt is FAIL.
- [ ] **Ends on the final reveal** — no redundant closing meta-sentence ("one continuous flight through the
  home…"). That padding is FAIL.
- [ ] **No rig/aircraft words anywhere:** no "flight / flythrough / aerial / drone / fly / soar / FPV /
  handheld / stabilized / cinematic camera" — and **no "bank / banks / banking"** (aircraft term, and it makes
  Seedance over-rotate ~180°). The viewpoint is only "the camera fov" and it turns/moves/rises/descends. FAIL
  any of these words.
- [ ] **No duration/timestamp** in the prompt text (no "15 seconds", "0-3s").
- [ ] **No list of negatives** ("no morphing / no warping / no people…").
- [ ] **No exhaustive material/fixture dump** (that detail lives in the panels).

## D. The entry door
- [ ] If the path passes through a hinged door, the entry panel shows a **single, closed** door, and the prompt
  opens **one** door (the exact swing direction is set later by the door-check vision step) — never "both halves
  part".

## Output
```json
{ "verdict": "PASS | FAIL",
  "reasons": ["one sentence per failed check, quoting the clause and (for turn errors) the panel it contradicts"],
  "fixes": ["one concrete correction per reason — the specific rewrite or path restructure"] }
```
