---
description: Produce the machine-executable generation plan (Step 2 planning) — hero + showcase chain + before/after + modules + deploy. Plan ONLY requested assets.
argument-hint: (no arguments — reads $ARTIFACTS_DIR/intake.json and brand/brand-system.json)
---

# Generation Plan — Cinematic Site (the keystone)

**Workflow ID**: $WORKFLOW_ID

You are the **director**. You convert the approved brand + intake into ONE machine-executable plan that downstream loops execute mechanically, BEFORE any paid generation. This node runs with **fresh context** — load everything from files. Get this right: a bad plan wastes credits on every node after it.

---

## Phase 1: LOAD (read these artifacts from $ARTIFACTS_DIR)

Read, in order:
1. `$ARTIFACTS_DIR/intake.json` — especially `want_showcase`, `want_before_after`, `brands`, `services`, `deploy_target`, `domain`.
2. `$ARTIFACTS_DIR/brand/brand-system.json` — palette, fonts, industry, headline, theme_direction, mood.

---

## Phase 2: PLAN (the skill's Step 2E structural laws)

**LAW 1 — Plan ONLY what was requested.** `showcase.enabled` and `showcase_enabled` are `'true'` ONLY if `intake.want_showcase == 'true'`. `before_after.enabled` and `before_after_enabled` are `'true'` ONLY if `intake.want_before_after == 'true'`. Never plan an unrequested showcase or before/after — it wastes credits.

**LAW 2 — Module gates (mandatory, encoded for the assembler):**
- Include `brand-logo-marquee` in `modules[]` **iff** `intake.brands` is non-empty (never a text list of brands).
- Include `before-after-slider` in `modules[]` **iff** before/after is enabled.
- Also pick 3-5 total modules that fit the industry (Home Services → brand-logo-marquee + before-after-slider + counter-animate + reveal-text + liquid-glass; Luxury → reveal-text + image-trail + kinetic-text + magnetic-buttons; Tech → glitch-text + stagger-grid + counter-animate + scroll-progress; etc.). Module names come from the 18: `before-after-slider, brand-logo-marquee, counter-animate, accordion-slider, flip-cards, glitch-text, horizontal-scroll, image-trail, kinetic-text, liquid-glass, magnetic-buttons, marquee, parallax-sections, reveal-text, scroll-progress, stagger-grid, svg-draw, typewriter`.

**LAW 3 — Hero.** Write a strong Flux.2 Pro `reference_prompt` for the hero start image: 16:9, specific (camera angle, subject, environment, lighting, mood) — see §7.1. Set `want_end_frame` to `'true'` when the hero transformation is dramatic enough that a distinct end frame helps the video (e.g. exterior→interior, blueprint→building); `'false'` for fluid single-frame motion (steam, pouring, petals). Pick `variants` (2-3) and `duration` (4-12s; 5-6 punchy, 8-10 dramatic).

**LAW 4 — Showcase = ONE continuous journey through ONE space, built from a 2-keyframe-per-scene chain.** The scenes are NOT disconnected vignettes — they are a single uninterrupted camera flythrough through one cohesive space, like an FPV drone. Design them as a spatial path where each step physically leads into the next — e.g. *exterior detail → push through an opening → interior reveal → glide to the next opening* — and **order the scenes as that path**. Never a jump from, say, a kitchen interior to an unrelated rooftop.

**The 2-frame model (this is how the pipeline executes it — plan to it exactly):** `N` scenes ⇒ `N+1` keyframes + `N` clips. Only the very FIRST keyframe is a fresh Flux.2 Pro generation; **every later keyframe is an EDIT of the one before it**, and each scene's Seedance clip animates between its two bounding keyframes (start keyframe → end keyframe). Seedance only ever interpolates between two crystal-clear known frames — *that is the one job video models excel at and the one place they do NOT hallucinate* (skill line 575). **The end frame of each scene IS the start frame of the next — the same file, reused, never regenerated** (skill Step 2E, line 540). So you describe, per scene, a `start_state` and an `end_state`; for every scene after the first, write its `start_state` to **match the prior scene's `end_state` verbatim** (it is literally the same frame).

Each scene is therefore ONE transition. A scene may be a mechanism (a door opens, glass slides), a pure camera move (carry forward to the next wall), or both — **the director's call** (you). You have full creative latitude over how bold, fast, or dramatic the camera move is. Only two rules are HARD, because they are what actually prevents AI slop:

1. **Reveal, don't invent.** Whatever is new in `end_state` must already be **visible or clearly implied in `start_state`** — through the doorway, window, opening, or in the distance. The transition *expands what is already on screen*; it must NEVER conjure a space that wasn't visible yet. (This is the single thing the old build got wrong: it asked the image model to invent a brand-new room per scene, which it cannot do — it reinvents, and the reinvention never matches.) A dramatic camera move is fine; an *unseeded* one is slop.
2. **Same world throughout.** Same building, same materials, same time of day across ALL scenes. Each keyframe is an edit of the prior, so it inherits the light for free — just don't describe a different mood mid-chain.

`seeds_next` is the mechanism that makes rule 1 hold across the seam: it names **what is visible in this scene's `end_state` that the NEXT scene moves into** (e.g. *"the great-room glass wall and deck, already visible through the now-open pivot door"*). The next scene's `start_state` then echoes exactly that, and its `end_state` expands on it. For the LAST scene, `seeds_next` may be `""` (nothing comes after).

`camera` is the director's intended move & feel for that scene's clip (e.g. *"slow dolly forward as the pivot door swings open, easing to a hover"*). Be cinematic; you are NOT limited to a fixed camera style.

Plan **1–3 scenes** only if showcase is enabled. Optionally set a global `lighting` mood string that pins the time-of-day/palette for the whole showcase (e.g. *"warm late-afternoon golden light"*); it is a knob, not a mandate — omit with `""` to let the establishing frame set the mood. Keep each scene's transition clean enough that Seedance can interpolate it; if two endpoints are wildly dissimilar, prefer splitting into two scenes over cramming a huge traversal AND a mechanism into one clip.

**LAW 5 — Before/After.** Only if enabled, 2-3 pairs, each `{ caption, after_prompt }` (after = the ideal result; the before is derived later from the after to share composition).

**Scroll heights:** `hero` typically `"300vh"`, `showcase` typically `"400vh"` (longer for multi-scene).

**Deploy:** `deploy.target` = `intake.deploy_target`; `deploy.domain` = `intake.domain` if any.

---

## Phase 3: GENERATE — fill the node schema AND write the RICH plan.json

**(a) Return the node's `output_format` JSON with EXACTLY these fields:**
- `showcase_enabled` — `'true'`|`'false'` (string)
- `before_after_enabled` — `'true'`|`'false'` (string)
- `hero` — object `{ reference_prompt, want_end_frame ('true'|'false'), variants (int 1-4), duration (int 4-12) }`
- `modules` — array of module-name strings (subset of the 18)
- `scroll_heights` — object `{ hero, showcase }`
- `deploy` — object `{ target ('vercel'|'local'), domain }`

**Required:** `showcase_enabled, before_after_enabled, hero, modules, scroll_heights, deploy`. All booleans are quoted strings.

**(b) Write the RICH `$ARTIFACTS_DIR/plan.json`** (convention #2). This file is richer than the returned JSON — it ALSO carries the showcase scenes and before/after pairs that the flatten script and loops read. Write EXACTLY this shape:

```jsonc
{
  "showcase_enabled": "true|false",
  "before_after_enabled": "true|false",
  "hero": { "reference_prompt": "…", "want_end_frame": "true|false", "variants": 2, "duration": 8 },
  "showcase": { "enabled": "true|false", "lighting": "optional global mood, e.g. 'warm late-afternoon golden light' (or \"\")",
    "scenes": [
      { "label": "Scene 1 — …",
        "start_state": "the composition this scene begins on (for scene 1, the fresh establishing frame)",
        "end_state": "the composition this scene ends on — a coherent evolution of start_state whose new content is already visible/implied in start_state",
        "seeds_next": "what is visible in end_state that the NEXT scene moves into (\"\" for the last scene)",
        "camera": "the director's intended camera move & feel for this scene's clip",
        "duration": 5 } ] },
  "before_after": { "enabled": "true|false", "pairs": [ { "caption": "…", "after_prompt": "…" } ] },
  "modules": ["hero-video", "brand-logo-marquee", "…"],
  "scroll_heights": { "hero": "300vh", "showcase": "400vh" },
  "deploy": { "target": "vercel|local", "domain": "…" }
}
```

The top-level `hero`, `modules`, `scroll_heights`, `deploy`, `showcase_enabled`, `before_after_enabled` in plan.json must match what you return. When showcase is disabled, write `"showcase": { "enabled": "false", "lighting": "", "scenes": [] }`; when before/after is disabled, write `"before_after": { "enabled": "false", "pairs": [] }`.

### PHASE_3_CHECKPOINT
- [ ] showcase/before_after enabled ONLY because intake requested them (no unrequested optionals)
- [ ] `brand-logo-marquee` in modules iff `intake.brands` non-empty
- [ ] `before-after-slider` in modules iff before/after enabled
- [ ] Showcase scenes form ONE continuous journey through one space, ordered as a spatial path (1–3 scenes); each scene is ONE clean transition (mechanism, camera move, or both)
- [ ] **Reveal-don't-invent:** every `end_state` is a coherent evolution of its `start_state` whose new content is already visible/implied in `start_state` — no scene conjures an unseen space
- [ ] **Seam reuse:** every scene after the first has `start_state` matching the prior scene's `end_state`; each `seeds_next` names what the next scene moves into (last scene `seeds_next` may be `""`)
- [ ] Same world / materials / time-of-day across all scenes; optional global `lighting` set (or `""`)
- [ ] hero `reference_prompt` is 16:9 and specific; `want_end_frame` set deliberately
- [ ] All booleans quoted strings; returned JSON and plan.json top-level fields agree
- [ ] `$ARTIFACTS_DIR/plan.json` written with the RICH schema (showcase.scenes[] with start_state/end_state/seeds_next/camera + before_after.pairs[])

## Phase 4: REPORT

Return the node `output_format` JSON. One-line note: showcase on/off, before/after on/off, #scenes, #mechanisms, #before/after pairs, module count — i.e. the implied generation scope the human approves at the plan gate.
