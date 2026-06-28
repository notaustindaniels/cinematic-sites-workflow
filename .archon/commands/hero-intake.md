---
description: The Hero Intake interview (cinematic-hero) — interview the client about what the HERO must SHOWCASE, draft a hero brief + open questions for the gate. The Hero Director reads this brief and designs to it.
argument-hint: (reads $ARTIFACTS_DIR/brand/brand-system.json + intake.json if present, else the brief in $ARGUMENTS)
---

# Hero Intake — the interview that decides what the hero SHOWCASES

**Workflow ID**: $WORKFLOW_ID

You are interviewing the client to decide **what the above-the-fold HERO video must SHOWCASE**. The hero is the
first thing every visitor sees, so it must feature THIS business's single most compelling subject, introduced the
way THIS business would want. Get it wrong and the hero is generic. The classic failure: treating the real
subject as a one-second waypoint (e.g. a custom home builder whose hero craned past a rock, showed the house for
a second, and ended on mountains — when the home itself is what sells). This node runs with **fresh context** —
load from files.

## Phase 1: LOAD
- Read `$ARTIFACTS_DIR/brand/brand-system.json` + `$ARTIFACTS_DIR/intake.json` if present (industry, what they
  sell, mood, the spaces/products). Otherwise derive from the brief: $ARGUMENTS

## Phase 2: DECIDE WHAT THE HERO SHOWCASES (the interview)
Reason out the best answers, then ask the client to confirm/correct via `open_questions`:

1. **What does the business sell, and what is the single most compelling SUBJECT the hero must feature?** Name the
   concrete hero subject — and it must **DOMINATE the frame for most of the shot**, not be a brief background
   element. (custom home builder → the home itself, its living spaces + craftsmanship; HVAC → the unit + the
   comfort; restaurant → the signature dish; skyscraper builder → the tower's scale.)
2. **How should the business be INTRODUCED — the most powerful way to present that subject?** Think about what
   actually sells it. A **custom home builder is best introduced by bringing the viewer INTO the home** — a slow,
   luxurious arrival that moves toward/through the entry into the living spaces (e.g. a slow push toward the
   house, the front door opening, gliding into the warm great room), lingering on the interior experience — NOT a
   distant exterior flyover. Name the introduction concretely.
3. **What specific scene/space/moment should the hero feature?** (the great room, the chef's kitchen, the entry +
   door opening, the dish plating, the product hero shot, the tower against the sky…)
4. **What is the desired FEEL and PACE?** (slow + luxurious; warm + intimate; bold + energetic…)
5. **Any must-have elements** the client wants in the hero (a specific room, the door opening, the view, a
   product, people / no people)?

## Phase 3: GENERATE — return the schema AND write the brief
Return the node's `output_format` JSON and write the identical object to `$ARTIFACTS_DIR/hero/hero-intake.json`,
plus a readable `$ARTIFACTS_DIR/hero/hero-intake.md` (the gate shows the human this file). Put anything you truly
need the client to confirm in `open_questions` — keep MUST-HAVES (what the hero features) from being silently
assumed. Shape:

```jsonc
{
  "business": "…",
  "sells": "the specific product/experience this business sells (one sentence)",
  "hero_subject": "the ONE subject the hero features and that DOMINATES the frame",
  "introduction": "how to present it — the move concept (e.g. 'a slow arrival that pushes toward the home, the front door opening, gliding into the warm great room')",
  "feature_scene": "the specific scene/space/moment to feature",
  "feel_pace": "the desired feel + pace (e.g. 'slow, luxurious, warm')",
  "must_haves": ["concrete must-have elements"],
  "open_questions": ["only what genuinely needs client confirmation"]
}
```

### CHECKPOINT
- [ ] `hero_subject` is the business's REAL subject and is framed to DOMINATE (not a background waypoint).
- [ ] `introduction` is the most compelling way to present it for THIS business type (for a space/experience,
      an introducing arrival INTO the space — not a distant establishing shot).
- [ ] `feature_scene`, `feel_pace`, `must_haves` set; `open_questions` lists only real unknowns.
- [ ] `$ARTIFACTS_DIR/hero/hero-intake.json` + `hero-intake.md` written.

## Phase 4: REPORT
Return the JSON. One-line note: the hero subject + the one-sentence introduction, and how many open questions
remain for the gate.
