# Rubric — Showcase Grid-Spec Critic (the full critique applied in the refine loop)

Apply this to `$ARTIFACTS_DIR/showcase/grid-spec.json`. Emit `{verdict:"PASS"|"FAIL", reasons:[...], fixes:[...]}`.
Be strict and concrete — quote the offending clause. Any FAIL item fails the verdict. The deterministic
state-checks are not your job; these are the judgment checks the Director must satisfy before any panel is made.

## A. Panels read as ONE place
- [ ] **Consistent world/materials/palette/lighting.** Every panel's `nb_prompt` anchors the SAME building,
  materials, palette, and time-of-day. A panel that drifts (different mood, materials, or time of day) is FAIL.
- [ ] **Distinct compositions.** Each panel is a genuinely different vantage/space (not near-duplicates).
- [ ] **ZERO REMNANTS — each panel shows ONLY its own space, no element of an ADJACENT scene (prior OR next).**
  Two checks, both must pass:
  - **(a) No NEXT scene's subject** (even small / through glass) — the deck seen through the kitchen glass (with a
    different railing) forced the kitchen→deck morph. The kitchen frames its island/the mountains, not the deck; a
    window that would reveal a later scene is re-angled onto open landscape. (Only pass: the path goes STRAIGHT
    into that next space with no turn between.)
  - **(b) No PRIOR scene's element — above all the DOOR/entry.** A room entered through a door must be framed from
    WITHIN it (its own focal point), NEVER "from the threshold / doorway / just inside the entry" (that frames the
    door into the shot — it rendered as a DOUBLE door in the great room while the exterior was a SINGLE door, and
    Seedance hallucinated the door changing). The entry door appears in the APPROACH panel ONLY; **FAIL any
    interior panel framed from a threshold, or whose `nb_prompt` does not explicitly exclude doors/entry**
    ("no doors, no entry or threshold in frame").
  Quote the panel and the offending element/clause.
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
- [ ] **The route survives a GRID/HEADING read-back, accounting for the WIDE FOV.** Trace the path cell by cell:
  at every step, neither the camera's heading NOR its wide peripheral cone (~45° each side, plus anything sitting
  BESIDE the new space with no wall between) may land on a previously-shown space. A turn whose FINAL heading is
  "new" but whose SWEEP crosses a seen space — or that opens beside a seen space in an open plan — is FAIL; the fix
  is to restructure via a doorway or level change that walls the cone off the seen, not to re-word the turn.

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
- [ ] **Phrase-level emphasis written in (backticks).** Each COMPLETE spatial phrase is wrapped in backticks — the
  whole motion+its-path (`` `passes through into the great room past the fireplace` ``), each bounded turn + each
  straight commit (`` `turns 90 degrees right` ``, `` `continues straight ahead` ``), each portal/state phrase
  (`` `hinged on the right` ``, `` `swings open to the right` ``), and each landmark/target noun-phrase
  (`` `cased opening` ``, `` `pivoting glass wall` ``, `` `past the stone island` ``); ONLY the connective grammar
  ("the camera fov", "as it", "then", "to face the") is left plain. **FAIL** bare-verb-only emphasis (e.g.
  `` `passes` `` through into the great room — verb spotlighted, path/landmarks left plain), a door action merged
  with the camera's through-motion into one span, OR any unpaired/unbalanced backtick.

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
