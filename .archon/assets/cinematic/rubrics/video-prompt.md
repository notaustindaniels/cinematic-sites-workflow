# Rubric C.5 — Hero Video Prompt Critic

The critic reads `scenes/hero/video-prompt.json` (the structured prompt object), then emits `{verdict, reasons[], fixes[]}`.

---

## Checklist

Apply every item. Any FAIL item fails the verdict.

### Camera motion — every beat

- [ ] **Camera moving through space in EVERY beat.** Every item in `beats[]` must have a non-empty `camera_motion` field that describes physical spatial movement — dolly, push-in, orbital arc, crane, tracking slide, or a combination. A beat whose `camera_motion` is empty, "static", "locked-off", "motionless", "holds still", or "comes to rest" is FAIL.
- [ ] **The final beat may DECELERATE but must still move.** The skill's prescribed ending is a *decelerating* final beat that retains a slow continuing drift/settle/easing arc through space (SKILL.md: "decelerates but does NOT stop abruptly; slight drift continues"). A final beat that describes a slow continuing spatial drift (e.g. "eases into a slow forward drift", "settles into a gentle continuing rise") is **PASS** — do NOT fail it for being the slowest beat. Only fail the final beat if it describes the camera fully stopping / coming to rest / "near-still" / "a breath, not a move" (zero continuing travel).
- [ ] **No beat is a zoom-only.** A beat that only describes a focal-length zoom (no physical camera displacement) is not acceptable as camera motion. FAIL if any beat relies solely on zoom language with no mention of physical travel.

### Subject motion

- [ ] **Subject motion is layered on top of camera motion in every beat.** Every item in `beats[]` must have a non-empty `subject_motion` field describing what physically moves in the scene — steam rising, a door opening, light shifting, objects assembling, etc. A beat with only camera motion and no subject motion is FAIL.

### Non-looping

- [ ] **The video does not return to the start.** The `opening_scene` and the final beat must describe visually different states — different location, framing, or subject composition. If the final beat's description matches or closely echoes the `opening_scene` (suggesting the video cycles back), FAIL.

### Length

- [ ] **At least 4 beats.** `beats[]` must have at least 4 items. Fewer is FAIL.
- [ ] **Total prompt is ≤ ~1000 characters.** The flattened text representation of the prompt (all beats concatenated with `opening_scene`, `camera_path_summary`, and `negatives`) must be concise — approximately 1000 characters or fewer. A significantly longer prompt is FAIL; note the approximate character count in `reasons[]`.

### Negatives

- [ ] **Stability negatives present.** The `negatives` field must include language rejecting camera shake or jitter (e.g., "no shake", "no jitter", "smooth stabilized", or equivalent). Missing is FAIL.
- [ ] **No-morph negatives present.** The `negatives` field must include language rejecting morphing, shape-shifting, or hallucinated new objects (e.g., "no morphing", "no new objects", "no shape-shifting", or equivalent). Missing is FAIL.

### Required fields

- [ ] **All required fields present and non-empty.** `opening_scene`, `beats[]`, `camera_path_summary`, and `negatives` must all be present and non-empty. Missing or empty is FAIL.

---

## Output format

```json
{
  "verdict": "PASS | FAIL",
  "reasons": ["One sentence per failed check, quoting the beat index or field where relevant."],
  "fixes": ["One actionable correction per reason."]
}
```
