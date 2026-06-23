# Rubric C.6 — NB-Pro Keyframe Prompt Critic (2-frame showcase chain)

The critic reads the keyframe **prompt text** for the current work-item, then emits `{verdict, reasons[], fixes[]}`.

In the 2-frame model every keyframe except the first (`kf0`) is an **EDIT of the prior keyframe** that REVEALS
an evolved composition. A reveal may be a **mechanism** (a door/sash/glass moves), a **camera-advance** (the
camera moves forward into a space that was already visible), or a blend. This rubric's job is to catch the one
failure that botched every previous run — **inventing a space that wasn't on screen** — plus world/lighting
breaks. It does **not** police how bold the camera move is.

The work-item gives you context: `prompt_role` (`establish` | `reveal`), `evolves_from` (what the reference
shows), `depicts` (the target), and `seeds_next`.

---

## Checklist

Apply every applicable item. Any FAIL item fails the verdict.

### Reveal, don't invent (THE load-bearing check — applies to every `reveal` keyframe)

- [ ] **Every new element is grounded in the reference.** The prompt's new content must be described as already
  visible or clearly implied in the reference — "through the open door", "the glass wall already seen through
  the doorway", "the vista already visible in the distance". If the prompt introduces a room, space, or vista
  with NO such grounding — i.e. it reads as conjuring a brand-new place the reference never showed — that is an
  INVENTED space and is **FAIL**. (This is the single most important check.)
- [ ] **Leads as an edit.** A `reveal` keyframe prompt should lead with "Edit the reference image so that …"
  (or equivalent) so NB-Pro modifies the reference rather than re-imagining the scene. A reveal prompt that
  reads as a fresh from-scratch composition is FAIL.

### Preserve the world, inherit the light (applies to every `reveal` keyframe)

- [ ] **Has an everything-else-identical clause.** The prompt must explicitly instruct that the unchanged
  elements stay — materials, architecture, landscaping, sky, and lighting "exactly matching the reference".
  Missing this clause is FAIL (without it NB-Pro re-randomizes elements that should be constant).
- [ ] **Does not reset the time-of-day / mood.** The prompt must NOT re-specify a different lighting mood or
  time of day than the reference (the edit inherits it for free). Introducing a new/contradicting mood
  mid-chain — e.g. the reference is dusk and the prompt asks for bright afternoon — is FAIL. (Restating the
  *same* light as "matching the reference" is correct, not a violation.)

### Mechanism-reveal checks (apply ONLY when the reveal is a mechanism — a door/sash/glass/panel moving)

Skip this whole section for a pure camera-advance reveal (no mechanism) and for the establishing frame.

- [ ] **Geometry, not labels.** Describes the resulting physical geometry of the open state, NOT an action verb.
  "the bottom half of the window's frame is now an open rectangular gap — no glass" is PASS; "open the left
  window" / "the door is open" is FAIL.
- [ ] **Never uses "dark" for the opening.** The word "dark" applied to a gap/opening makes NB-Pro render a
  pitch-black void that erases the interior. Any use of "dark" to characterize the opening is FAIL.
- [ ] **Names the concrete content visible through the opening.** 3+ specific named items (materials,
  furniture, an architectural feature), the last of which seeds the next scene. "the warm interior" with no
  named elements is FAIL.
- [ ] **Negates the wrong open-mode explicitly.** A sentence that names, by physical description, the wrong mode
  that must NOT happen (pivot → "not side-hinged, does not slide"; single-hung → "does not tilt, is not a
  casement"). Missing this negation is FAIL.

### Establishing-frame check (apply ONLY when `prompt_role == "establish"`)

- [ ] **Specific and dense.** `kf0` must be a hyper-specific composition: 16:9, a named camera angle, concrete
  materials/lighting, and at least one element that SEEDS what the first scene moves toward (a glow through a
  seam, a glass wall beyond, a vista through a window). A generic "a nice house" with no angle/seed is FAIL.
  (For `establish`, setting the lighting mood is correct — it is the frame that defines the chain's light.)

### What this rubric does NOT fail

- [ ] **Camera ambition is NOT a failure.** Do not FAIL a prompt for a bold, fast, dramatic, or unusual camera
  move or transition. The director has full latitude here. Only invention, a missing/contradicted preserve
  clause, a reset time-of-day, or (for mechanisms) the geometry/mode/content failures above fail the verdict.

---

## Output format

```json
{
  "verdict": "PASS | FAIL",
  "reasons": ["One sentence per failed check, quoting the relevant prompt fragment."],
  "fixes": ["One actionable correction — the specific text to add or change in the prompt."]
}
```
