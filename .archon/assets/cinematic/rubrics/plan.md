# Rubric C.3 — Generation Plan Critic

The critic reads `plan.json`, `intake-brief.md`, and `brand/brand-system.json`, then emits `{verdict, reasons[], fixes[]}`.

---

## Checklist

Apply every item. Any FAIL item fails the verdict.

### Hero

- [ ] **Reference prompt is 16:9 and specific.** `hero.reference_prompt` must explicitly contain the aspect ratio (e.g., "16:9", "16:9 context") and must describe a specific camera angle, subject, environment, and lighting. A generic description like "a nice house" with no angle or lighting detail is FAIL.
- [ ] **Hero duration is an integer ≥ 4.** `hero.duration` must be an integer between 4 and 15 inclusive. Any value outside this range or a non-integer is FAIL.
- [ ] **Variants ≥ 1.** `hero.variants` must be at least 1. Zero or absent is FAIL.

### Showcase (when `showcase.enabled == "true"`) — the 2-keyframe-per-scene model

The showcase is `N` scenes ⇒ `N+1` keyframes + `N` clips. Only the first keyframe is fresh; every later keyframe is an EDIT of the prior, and each scene's clip interpolates between its two bounding keyframes. The critic's job is to verify the CHAIN is sound, **not** to police camera ambition.

- [ ] **1–3 scenes, each with the four fields.** `showcase.scenes` has 1–3 entries; each has a non-empty `start_state`, `end_state`, and `camera`, plus a `seeds_next` (which may be `""` only for the LAST scene). Missing any required field is FAIL.
- [ ] **Reveal, don't invent (THE load-bearing check).** Each `end_state` must be reachable from its own `start_state` by REVEALING or expanding what is already visible or clearly implied there — through a doorway, window, opening, or in the distance. If an `end_state` introduces a room, space, or vista that is NOT visible or implied in its `start_state`, that is an INVENTED space and is FAIL. (This is the exact error the previous build made and the single most important thing to catch.)
- [ ] **Seam reuse.** For every scene after the first, its `start_state` must describe the SAME composition as the previous scene's `end_state` — it is literally the same reused frame. A `start_state` that does not continue from the prior `end_state` is FAIL.
- [ ] **Each non-final scene seeds the next.** Every non-final scene's `seeds_next` must name a concrete element visible in its `end_state` that the next scene's `start_state` then moves into. An empty `seeds_next` on a non-final scene, or a seed the next scene doesn't pick up, is FAIL.
- [ ] **One continuous world.** All scenes share the same building/space, materials, and time of day, ordered as one spatial path. A scene that cuts to an unrelated, unconnected location is FAIL. (If a global `showcase.lighting` is set, no scene may contradict it.)
- [ ] **Do NOT police camera drama.** Do not FAIL a scene for an ambitious, fast, bold, or unusual camera move — the director has full latitude over camera and transition style. Only *invention*, *broken seams*, *unseeded next scenes*, and *world/lighting breaks* fail the showcase.

### Module selection — mandatory rules

- [ ] **Brand Logo Marquee iff brands exist.** If `intake-brief.md` has a non-empty `brands[]` list, `modules[]` must include `brand-logo-marquee`. If `brands[]` is empty or absent, `modules[]` must NOT include `brand-logo-marquee`. Either violation is FAIL.
- [ ] **Before/After Slider iff before_after enabled.** If `before_after.enabled == "true"`, `modules[]` must include `before-after-slider`. If `before_after.enabled == "false"`, `modules[]` must NOT include `before-after-slider`. Either violation is FAIL.

### Requested optionals only

- [ ] **Showcase planned only if requested.** If `intake-brief.md` has `want_showcase == "false"`, then `showcase.enabled` must be `"false"`. Planning unrequested showcase is FAIL.
- [ ] **Before/after planned only if requested.** If `intake-brief.md` has `want_before_after == "false"`, then `before_after.enabled` must be `"false"`. Planning unrequested before/after is FAIL.

### Required fields

- [ ] **All top-level fields present.** `hero`, `showcase`, `before_after`, `modules`, `scroll_heights`, and `deploy` must all be present and non-empty. Missing any field is FAIL.

---

## Output format

```json
{
  "verdict": "PASS | FAIL",
  "reasons": ["One sentence per failed check, identifying which field or mechanism and why."],
  "fixes": ["One actionable correction per reason."]
}
```
