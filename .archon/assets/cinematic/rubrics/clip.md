# Rubric C.7 — Seedance Clip Prompt Critic

The critic reads the Seedance clip prompt text for the current work-item, then emits `{verdict, reasons[], fixes[]}`.

---

## The five-layer structure (apply in order)

A valid Seedance clip prompt consists of **exactly 5 sentences in this order**. Each sentence has exactly one role. Any missing layer, extra layer, wrong order, or misuse of a layer slot is FAIL.

| Layer | Position | Role |
|---|---|---|
| 1 | First sentence | Event-category label |
| 2 | Second sentence | Geometry + bounded magnitude |
| 3 | Third sentence | Mechanism pacing |
| 4 | Fourth sentence | Physics-reasoned constraint with a *because* clause |
| 5 | Fifth sentence | Camera |

---

## Checklist

Apply every item. Any FAIL item fails the verdict.

### Layer 1 — Event-category label

- [ ] **First sentence names the shot type.** A clip is either a **mechanism** clip or a pure **traversal**
  (camera-advance, no mechanism) — both are valid in the 2-frame chain:
  - Mechanism: "This is a video of a [EVENT CATEGORY]" using product terminology — e.g. "This is a video of an
    awning window opening" / "…of a pivot entry door swinging open."
  - Traversal: "This is a flythrough from [START] to [END COMPOSITION]" — e.g. "This is a flythrough from the
    open pivot door into the great room facing the glass wall."
  A first sentence that does neither — no event category and no flythrough framing — is FAIL.

### Layer 2 — Geometry + bounded magnitude

- [ ] **Second sentence describes where the motion happens and bounds its magnitude.** It must name the moving element and describe the resulting geometry with a bounded qualifier — e.g., "opens a few inches outward from the bottom edge" or "the lower sash slides upward about half its height." Vague magnitude ("opens", "widens", "extends") with no bounding is FAIL.

### Layer 3 — Mechanism pacing

- [ ] **Third sentence specifies the pacing of the mechanism itself.** It must explicitly state the speed of the animated element — e.g., "The window opens at a slow consistent speed." A pacing sentence that describes only the camera speed (not the mechanism) is FAIL. Missing pacing entirely is FAIL.

### Layer 4 — Physics-reasoned constraint with a *because* clause

- [ ] **Fourth sentence includes a *because* clause explaining the constraint.** For a **mechanism** clip it must
  follow "[WHAT STAYS STILL] does not move at all, because [PHYSICS/HINGE REASON] — only [WHAT DOES MOVE]
  moves," naming the physical reason (hinge type, anchor point, fixed connection). For a **traversal** clip it
  must instead assert that nothing actuates, with a reason — e.g. "No mechanism animates in this clip — every
  window, door, and panel stays in its current state — because this shot is a pure traversal." Missing the
  *because* clause, or a bare negative with no reason, is FAIL.

### Layer 5 — Camera

- [ ] **Fifth and final sentence describes the camera.** It must state what the camera does — e.g., "The camera pushes in slowly and steadily" or "The camera barely moves." Camera description appearing in any layer other than last is FAIL. Missing camera layer is FAIL.

### One primary motion only

- [ ] **The prompt animates exactly one thing.** A mechanism clip describes a single atomic mechanical event; a
  traversal clip describes a single continuous camera move with no mechanism. If Layer 1 or Layer 2 reference
  more than one mechanism (e.g. "a bifold opening AND a casement tilting"), or stack a big traversal AND a
  mechanism in the same clip such that two distinct motions occur simultaneously, FAIL. (If a scene genuinely
  needs both, it should have been split into two scenes/clips upstream.)

### Final frame alignment

- [ ] **The described final state approximates the end keyframe.** The geometry/composition described in Layer 2
  must be consistent with the clip's **end keyframe** — the `kf(k)` passed as `--end-image` (the scene's
  `end_state`). If the prompt describes a different open-mode or a different final composition than that end
  keyframe, FAIL.

---

## Output format

```json
{
  "verdict": "PASS | FAIL",
  "reasons": ["One sentence per failed check, identifying the layer number and the specific problem."],
  "fixes": ["One actionable correction per reason — the specific text to change in that layer."]
}
```
