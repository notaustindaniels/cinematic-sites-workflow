# Rubric — Hero Spec Critic (cinematic-hero, GRID method — applied in the refine loop)

Apply this to `$ARTIFACTS_DIR/hero/hero-spec.json`, cross-checked against the approved intake at
`$ARTIFACTS_DIR/hero/hero-intake.json`. Emit `{verdict:"PASS"|"FAIL", reasons:[...], fixes:[...]}`. Be strict and
concrete — quote the offending clause. Any FAIL item fails the verdict. (The deterministic timestamp/negatives
guards also run in `gen-hero.ts` before the render — a clean spec never hits them.)

## A. Two panels: start → landing
- [ ] **EXACTLY 2 panels, ordered [start, landing]**, and `grid` is `{cols:2, rows:1}`.
- [ ] **Panel 2 IS the intake's `feature_scene`, with the `hero_subject` dominating.** If the feature is an
  interior (e.g. the great room), panel 2 depicts that interior (fireplace, beams, glass with peaks beyond) — NOT
  an exterior facade and NOT the bare sky/peaks. The home/product/dish fills panel 2. (This is the exact failure
  that produced a home builder's hero ending on the bare mountains — FAIL it.)
- [ ] **Panel 1 is the START of the intake's `introduction`** (the approach / establishing beat / threshold).
- [ ] **One coherent world, ONE style.** Both panels share the SAME building/subject, materials, palette,
  lighting, time-of-day. A panel that drifts in style is FAIL.

## B. The 1→2 journey is coherent
- [ ] **Panel 2 is a natural DESTINATION reachable from panel 1** (a real continuous move — e.g. exterior entry →
  great room interior; product in room → product hero detail). The grid renders the in-between, so an
  exterior→interior arrival is fine here — but the two panels must read as one journey, not two unrelated scenes.

## C. The flythrough_prompt is clean and on-brand
- [ ] **Matches the intake `feel_pace`.** A "slow / luxurious" brief is a slow, deliberate move ("glides slowly",
  "drifts forward and settles") — **"drives powerfully" / aggressive verbs on a slow-luxurious brand is FAIL** (it
  also makes Seedance disrespect the start frame). An energetic brand gets a bolder move. Cross-check `feel_pace`.
- [ ] **LANDS and settles on panel 2 / the `feature_scene`.** The move ends dwelling on the payoff — never racing
  past it, never ending on bare sky/peaks/exterior. A move that ends anywhere but panel 2 is FAIL.
- [ ] **NO timestamp / per-second beats** ("0-2s", "5 seconds", "t="). ONE continuous gesture. FAIL any timestamp.
- [ ] **NO list of negatives** ("no shake / no morph / does not loop / no new objects"). Two or more "no …"
  clauses (or any of those phrases) is FAIL.
- [ ] **No rig/aircraft words:** no "drone / fly / flythrough / aerial / FPV / soar" and **no "bank/banks/
  banking"** (over-rotates). The viewpoint "moves / glides / pushes / cranes / drifts / rises". FAIL any.
- [ ] **Tight:** ~30–55 words / **under ~400 characters** (the hero is only ~5s — shorter than the showcase). A
  long, over-detailed prompt is FAIL.
- [ ] **Phrase-level emphasis (backticks).** Each COMPLETE spatial phrase is wrapped as one span — the whole
  motion+its-path, portal/state phrases, landmark/target noun-phrases; ONLY connective grammar plain. **FAIL**
  bare-verb-only emphasis, or any unpaired/unbalanced backtick.

## D. The entry portal (if the path enters through one)
- [ ] If the 1→2 path passes through a door/glass, panel 1 depicts it **closed** and the flythrough opens it as
  the camera passes ("the single door swings open as the camera fov glides through"). For a hinged door, it is a
  **single** door — never both leaves parting.

## Output
```json
{ "verdict": "PASS | FAIL",
  "reasons": ["one sentence per failed check, quoting the clause and (for panel-2 errors) the intake feature_scene"],
  "fixes": ["one concrete correction per reason — the specific rewrite or panel change"] }
```
