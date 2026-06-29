# Cinematic Hero — Archon Sub-Workflow PLAN (hero video ONLY)

> **⚠ UPDATE — AS BUILT (supersedes everything below): the hero uses the START+END method.** The hero is a single
> A→B arrival (exterior → interior), so it does NOT use a composited grid or a hand-rolled palette. It reuses the
> **showcase Director** and ALL its prompting lessons — the opus Director designs EXACTLY **2 same-style panels**
> (panel 1 = the START frame, panel 2 = the END frame) + one Seedance prompt, self-critiqued against
> `rubrics/grid.md` (grid/heading path read-back, wide-FOV cone, no-glimpse, **zero-remnants**: each panel shows
> only its own space — the entry door lives in panel 1 only, the interior panel carries no door). `door-check`
> observes the rendered handle and `door-swing` rewrites the swing deterministically. Then **`gen-hero-2frame.ts`
> feeds Seedance panel 1 as `--start-image` and panel 2 as `--end-image`** (duration ~5s) and it interpolates the
> journey between them — locking onto both frames and landing softer than the grid. A storyboard grid is still
> composited for `door-check` + human review, but it is NOT the render input. See `cinematic-hero.yaml`,
> `commands/showcase-director.md`, `rubrics/grid.md`, and `scripts/gen-hero-2frame.ts` for the as-built design.
> (History: a single-image palette and then a 2-panel grid were tried first; both are superseded. Everything below
> is retained as design rationale only.)

**A focused spec for ONE thing: the above-the-fold *hero* background video — for ANY business.** The opus Director
picks a **dramatic cinematic TREATMENT** from a palette and renders it with a known-safe Seedance recipe. The
method ports the **showcase grid lesson**: drama is fine — just give Seedance ONE coherent input (and the right
method per treatment), never a transition between dissimilar states on a clock. Flexible and bold, never
hallucinating.

> Precedence: authoritative for the **hero** only. Supersedes the "Director's-Brief → second-by-second timeline →
> exterior→interior transformation with a separate end frame" approach in `hero-director-brief.md` +
> `hero-video-prompt.md` + their rubrics. `SKILL.md` still wins on image/prompt *craft*. Mirrors the architecture
> of `CINEMATIC-SHOWCASE-PLAN.md` (standalone sub-workflow + shared building blocks). Rendering is **Seedance
> (photoreal) only** for now — true 2D/2.5D motion graphics (kinetic type, animated schematics, CGI diagrams) is
> a future engine, designed for via the `treatment` abstraction below but not built here.

---

## 0. Why a rebuild — the hero failure history (grounded in run 6488f3f7)

The hero hallucinates "every time" because the current pipeline does the **opposite of all three rules we proved
in the showcase**, at once:

1. **Timestamped per-second beats.** `hero-video-prompt.md` mandates "0-2s, 2-5s, 5-8s, 8-10s…, ≥4 beats." Real
   output had a beat *past* the clip (`8-10s` on an 8s render). → Seedance stages to the literal clock and hiccups.
2. **A list of negatives.** "Smooth stabilized, no shake, no jitter. No morphing… Does not loop." → bloat.
3. **start + end frames are radically different scenes.** `hero-director-brief.md` mandates a "TRANSFORMATION"
   (literally "exterior→interior") + `want_end_frame:true`, so Seedance got START=exterior-meadow,
   END=interior-room and was told to "breach the glass." → it **invents** the breach/morph.

**The realization:** the bug was never "ambition" — it was the *method*. (1) and (2) are pure anti-patterns; (3)
is asking Seedance to wing a transition between dissimilar images. The showcase already proved a **dramatic**
journey renders clean when you hand Seedance ONE coherent image. So: keep the ambition, fix the method, and make
the hero a **palette** so it fits any business — not one timid push-in.

---

## 1. THE MODEL — Director picks a dramatic TREATMENT; render it the safe way

The hero is ONE moment, but the *kind* of moment varies by business. The opus Director classifies the brand,
**chooses a treatment**, and writes a normalized spec the scripts render uniformly.

### The treatment palette (drama is encouraged — pick what sells THIS business)

| Treatment | Best for | Render method | The bold-but-safe recipe |
| --- | --- | --- | --- |
| **`camera_move`** | homes, restaurants, retail, spaces | `single` (or `grid` if multi-space) | one coherent image + a BOLD continuous camera move — fast push-in, crane-up, orbit, tracking sweep |
| **`product_reveal`** | HVAC units, fixtures, equipment, gadgets | `single` | one hero-product image + a dramatic orbit / rack-focus / parallax around the product |
| **`scale_awe`** | skyscrapers, infrastructure, architecture | `single` | one image that already CONTAINS the structure + a sweeping crane-up / pull-to-reveal-its-scale |
| **`animated_element`** | electrical/energy, tech, "flow", anything kinetic | `single` | one still that depicts it + animate the energy / light / particles / steam / water IN PLACE |
| **`build_sequence`** | construction, remodels, "it rises / assembles" | `sequence` or `grid` | a CONTROLLED chain of small coherent advances (grid or keyframe-chain — like the trade-timelapse skill), never a wild 2-frame interpolation |

Most businesses (incl. skyscraper / HVAC / electrical) land on a **`single`-method** treatment: one striking
image + one bold move. `grid`/`sequence` are reserved for genuine multi-space tours or true build transformations
— and they reuse machinery we've already proven.

### Universal rules (EVERY treatment, no exceptions)

1. **ONE coherent input per render.** A `single` treatment animates ONE image; `grid` composes panels into ONE
   image first; `sequence` advances in SMALL coherent steps. Seedance is never asked to interpolate between two
   dissimilar scenes. **No exterior→interior "breach."**
2. **NO timestamps / per-second beats.** A tight prompt naming the move as ONE continuous gesture. Duration is the
   `--duration` param ONLY. `gen-hero-video` hard-guards this (dies before spending if a timestamp leaks in).
3. **NO list of negatives.** Leave them ALL out. (Guarded too.)
4. **Drama lives in the MOVE and the IMAGE, not in a scene change.** A fast crane-up revealing a tower's scale is
   bold AND safe — the tower is already in the frame; the camera move is the drama. Push hard on motion energy,
   framing, and image quality; never on morphing one scene into another.
5. **Phrase-level emphasis, reused from the showcase.** Wrap each complete spatial phrase of the move in
   backticks; only connective grammar plain. Director writes it; `gen-hero-video` passes a balanced prompt through.
6. **Tight.** ~40–70 words, ≤ ~500 chars. No rig/aircraft words ("drone/fly/aerial/bank"); the viewpoint
   "moves / pushes / cranes / orbits / drifts / rises".
7. **Bounded turns if any** (reuse showcase): a turn names a bounded angle + a straight-ahead commit. Most hero
   moves are a single gesture (push/crane/orbit) and need no turn.

### The normalized spec (`hero-spec.json`) — what the Director writes

```jsonc
{
  "treatment": "camera_move | product_reveal | scale_awe | animated_element | build_sequence",
  "render_method": "single | grid | sequence",       // derived from treatment; scripts branch on this
  "inputs": [                                          // 1 image for `single`; N for grid/sequence
    { "id":"img0", "role":"hero", "prompt":"<Flux.2 Pro prompt — one coherent, striking scene/subject>",
      "refs":[] }
  ],
  "motion_prompt":"<the ONE Seedance prompt — tight, bold, treatment-appropriate, phrase-emphasized, NO
                    timestamps, NO negatives, NO rig words>",
  "duration": 8
}
```

`render_method=single` → `inputs` has one image, Seedance animates it. `grid` → N panels composed to one image
(reuse `compose-grid`/`gen-flythrough`). `sequence` → N keyframes advanced in small steps, clips stitched (reuse
the keyframe-chain). The Director chooses; the scripts execute uniformly off `render_method`.

---

## 2. Node graph (`cinematic-hero.yaml`)

Mirrors the showcase shape (Director → refine → generate → gate → render → gate), with a `render_method` branch:

1. **`preflight`** + guards (higgsfield authed; ffmpeg; imagemagick if a `grid` treatment is used).
2. **`hero-director`** (command, opus) → classify business → pick `treatment` → write `hero-spec.json`
   (normalized: `treatment`, `render_method`, `inputs[]`, `motion_prompt`, `duration`). Collapses the old
   `hero-director-brief` + `hero-video-prompt` two-step into one coherent director (like `showcase-director`), so
   the "timeline/transformation" framing is gone at the source. Honors a planned `hero` brief from `plan.json`
   when present (inside cinematic-site); designs freely when standalone.
3. **`refine-loop`** (loop) → Director critiques its OWN `motion_prompt` against `rubrics/hero.md` (HARD: no
   timestamp/duration text; no negatives list; ONE coherent input (no dissimilar-frame interpolation); drama
   appropriate to the treatment; tight; phrase-emphasis balanced) and revises until self-PASS.
   `until_bash` = `hero-verdict-passed.ts`.
4. **`hero-image-gen`** (loop) → generate every `inputs[]` image (Flux.2 Pro 2k), one per iteration. 1 image for
   `single`; N for `grid`/`sequence`. Execute-only (prompts pre-written by the Director).
5. **`hero-compose`** (script) → `when render_method=='grid'` compose panels → one image; `when=='sequence'`
   nothing yet (clips stitch at render); `when=='single'` no-op. Branch on `render_method`.
6. **`hero-gate`** (approval) → human reviews the hero image(s) + the `motion_prompt` BEFORE the paid render.
7. **`gen-hero-video`** (script) → the Seedance render, branching on `render_method`: `single` = one call
   (`--start-image img0 --duration N`); `grid` = one call from the composed grid; `sequence` = keyframe clips +
   stitch. **Guards: dies if `motion_prompt` contains any timestamp OR a negatives list.** → `hero-final.mp4`.
8. **`hero-video-gate`** (approval) → human watches: bold but clean single gesture, no breach/morph/Ken-Burns.
9. **`report`**.

---

## 3. Files

- `workflows/cinematic-hero.yaml` — the standalone sub-workflow.
- `commands/hero-director.md` — the new single-step opus Director (classify → pick treatment → normalized spec).
  **Retires** `hero-director-brief.md` + `hero-video-prompt.md` for the hero (kept on disk, unreferenced).
- `rubrics/hero.md` — the hero critic rubric (no timestamps / no negatives / one coherent input / drama fits the
  treatment / tight / phrase-emphasis). **Retires** `director-brief.md` + `video-prompt.md` for the hero.
- `scripts/gen-hero-video.ts` — UPDATED: reads `hero-spec.json`; branches on `render_method`; **guards timestamps
  + negatives**; passes the Director's phrase-emphasis through (balanced) or shared fallback.
- `scripts/hero-verdict-passed.ts` — refine-loop exit guard (mirrors `grid-verdict-passed.ts`).
- Reused as-is: `preflight.ts`, `hf-image.ts` (Flux), `hf-video.ts` (Seedance), `compose-grid.ts` (grid
  treatment), the keyframe-chain scripts (sequence treatment), `plan-step.ts`, `lib/util.ts`, phrase-emphasis.

---

## 4. Integration into `cinematic-site` (mirror, don't absorb)

Same pattern as the grid showcase: `cinematic-hero` stays standalone + reusable; `cinematic-site`'s **Section E
(HERO)** MIRRORS its nodes referencing the SAME shared command/scripts/rubric. Replace
`hero-director-brief → brief-critic → hero-end-frame-gen → hero-video-prompt → prompt-critic → hero-gen` with
`hero-director → refine-loop → hero-image-gen → (hero-compose) → gen-hero-video`, keeping the terminal node named
**`hero-gate`** and the outputs at `scenes/hero/reference.png` (hero image) + `scenes/hero/hero-final.mp4`, so
`extract-frames` + `assemble-site` need ZERO changes. "SHARED MODULE" comment in both; keep them in sync.

---

## 5. Verification protocol

- At **`hero-gate`**: the hero image(s) read as ONE coherent scene/subject; the `motion_prompt` has **NO
  timestamps, NO negatives**, names ONE bold continuous move appropriate to the treatment, phrase-emphasis
  balanced. Cheap pre-Seedance checkpoint.
- At **`hero-video-gate`**: watch — one bold, smooth continuous move; **no breach / morph / scene-change**, not a
  Ken-Burns zoom, no snap/loop. Confirm the treatment landed (a crane *reveals scale*, an orbit *circles the
  product*, energy *flows*).
- Run a few business types through the standalone (a home, an HVAC co, a skyscraper builder, an electrician) and
  confirm the Director picks *different* treatments and each renders clean.

---

## 6. Meta-principle

The win is **architectural, not a retreat from ambition**: the old hero chased a *transformation* (scene change
A→B) via a *second-by-second timeline* and *two dissimilar frames* — three hallucination triggers at once. The
new hero keeps the drama but moves it into the **treatment, the framing, and the camera move on ONE coherent
input** — exactly how the grid method made a dramatic flythrough render clean. Don't ask Seedance to invent a
transition between dissimilar states; hand it one striking image (or one composed grid) and one bold move, and
let treatment + image quality + motion energy carry the wow.
