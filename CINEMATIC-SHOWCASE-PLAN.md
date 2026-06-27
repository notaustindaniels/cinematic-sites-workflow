# Cinematic Showcase — Archon Workflow PLAN (showcase section ONLY)

**A focused spec for ONE thing: the multi-scene cinematic *showcase* flythrough.** The chosen method is the
**GRID method**: design N scene panels, composite them into ONE storyboard image, feed that single image to
Seedance, and get back ONE continuous video. **One image in, one video out — no clips, no stitching, no seams.**

> Precedence: authoritative for the **showcase** only. Supersedes the seam-based "keyframes + clips + stitch"
> approach in `CINEMATIC-ARCHON-REBUILD-PLAN.md §1` AND the earlier "storyboard Director with element-state
> checking" in prior revisions of this file. `SKILL.md` still wins on image/prompt *craft*.

---

## 0. Why the grid method (the failure history)

Every prior approach fought **seams** — the boundaries between separately-generated clips:
1. **Invent-a-room** — NB-Pro invented a new space per scene → mismatched rooms.
2. **Edit-of-prior, too timid** — near-identical consecutive keyframes → Seedance had nothing to interpolate →
   slow/lifeless.
3. **Pre-revealed start** — start frames spoiled their own reveal → still slow.
4. **State contradiction at the seam** — a clip's motion contradicted its bounding frame's state (glass
   "opens from closed" while the frame showed it open → close-then-reopen stutter; range "ignites" but the
   shared next-frame showed it off → fire snapped out). We built a whole opus **Director + deterministic
   state-checker** to make these impossible, and it *worked* (state-check PASS, seam-clean renders) — but the
   discrete clips still read as slightly disjoint, and it was a lot of machinery.
5. **The realization:** every one of these is a *seam* problem. **Remove the seams and the entire class is gone.**

**The grid method has no seams.** There is exactly ONE Seedance generation, so there is nothing to be
inconsistent *between*. This is simpler AND more robust than all the seam-management engineering. (Confirmed on
real footage 2026-06-24: a 2×2 grid of 4 scene panels → one 15s Seedance clip → a continuous flythrough through
exterior → great room → kitchen → deck, which the user strongly preferred.)

---

## 1. THE MODEL — one storyboard grid → one Seedance flythrough

```
N panels (same style, distinct, ordered = journey)  ──montage+resize──►  ONE 1920x1080 grid image
        ──[single Seedance call: --start-image grid --duration 15]──►  ONE continuous flythrough video
```

Rules:
1. **Panels are one coherent world, ONE style.** Same building, materials, palette, lighting, time-of-day in
   every panel's NB-Pro prompt — so the flythrough doesn't morph between mismatched spaces. (Generate panels
   chained — each refs the prior as a *style anchor* — but with DISTINCT compositions.)
2. **Each panel is a distinct vantage along the path** (exterior → great room → kitchen → deck), ordered as the
   journey. Grid reading order (left→right, top→bottom) IS the journey order.
3. **The grid image MUST be a standard 16:9 size — exactly 1920×1080.** A non-standard montage size (e.g.
   2776×1572) *silently fails* the Seedance upload. `compose-grid.ts` always resizes/pads to 1920×1080.
4. **The single Seedance prompt is SHORT, tight, and PATH-focused (not camera-focused).** Aim ~50–80 words
   (under ~500 chars, NOT 1500). Name the path through the spaces with SPECIFIC turn directions; one short light
   phrase; **end on the final reveal — no redundant closing meta-sentence.** The viewpoint is only "the camera
   fov" — **NO rig/aircraft words at all** (no "FPV / drone / flight / flythrough / aerial / fly / soar /
   handheld / stabilized"); it "moves / banks / rises / descends", never "flies". (See rules 4–9 + the Director.)
   An over-detailed prompt makes Seedance hit-or-miss; a tight one lands. **Do NOT dump materials/fixtures —
   the panels carry those.** Think director/orchestra conductor, not scene description.
5. **NEVER put a duration/timestamp in the Seedance prompt** — no "over 15 seconds", no "0-3s", no per-second
   beats. It makes Seedance stage to a literal clock and causes hiccups. Duration goes ONLY in `--duration`.
   (`gen-flythrough.ts` hard-guards this and dies before spending if a duration leaks into the prompt.)
6. **NEVER add a list of negatives to the Seedance prompt** — no "no morphing / no warping / no flicker / no
   people / no text…". They bloat the prompt and don't help. Leave them all out.
7. **Portals open as the drone passes through them.** If the flight path goes through a door or window, that
   panel depicts it **closed**, and the flythrough prompt has it **open from closed as the drone flies through**
   (e.g. "the closed pivot door swings open as the drone glides through it"). An FPV drone never passes through
   a shut door or solid glass — the opening actuates as it arrives.
8. **The Director is a Hollywood-level director who plots the 3D path FIRST.** Before designing panels or writing
   the prompt, it builds a 3D model of the home and plots the camera fov's flight, **tracking the camera's
   heading at every moment** — because the one thing Seedance cannot survive is the camera turning to face a
   space it already revealed (it re-paints it as a wrong room). Concretely:
   - **Move toward the UNSEEN — turn to REVEAL, never to look back.** A straight push-in is safe but boring;
     turns that reveal new unseen spaces create anticipation. A turn onto the UNSEEN = encouraged; a turn toward
     the SEEN = forbidden.
   - **Turns must be SPECIFIC and heading-aware.** Name each turn's direction (left/right/up/down) and what it
     reveals — never "a corner, then another corner". Beware **two same-direction turns** (left→left ≈ 180°): in
     an OPEN floor plan that swings the camera back to face a seen space = paradox.
   - **Use walls and LEVELS as paradox-blockers + creativity.** A turn through a doorway into a separate room is
     safe (wall hides the back-view). For large properties, move UP/DOWN a level (loft up a stair, lower-level
     media/game room, balcony) — the floor/ceiling separates spaces so the camera can't see back, and it adds
     cinematic variety. Keep placements real (kitchen never upstairs; cellar/theater below; suite/balcony above).
   - Despite all this, the OUTPUT prompt stays TIGHT (~50–80 words) — the 3D reasoning is internal.
9. **Door swing — verify the image, then tell Seedance which way ONE door opens.** Seedance hallucinates a
   DOUBLE door (both halves parting) when the swing direction isn't given — even for a clearly single door. So
   the entry-door panel depicts a **single door with a discernible handle/hinge side**, and a vision node
   (`door-check`, opus) LOOKS at the rendered door after the grid is composed, works out the swing (handle on
   the right ⇒ hinged on the left ⇒ opens from the right), and rewrites the flythrough prompt's door clause with
   that exact single-door swing — before the Seedance render. Never describe a door "parting" or both leaves
   opening.

---

## 2. Node graph (`cinematic-showcase.yaml`)

1. **`preflight`** + guards (higgsfield authed, imagemagick present).
2. **`showcase-director`** (command, opus) → `grid-spec.json`: `{style, grid:{cols,rows}, panels:[{id,
   scene_label, composition, nb_prompt}], flythrough_prompt (NO duration), duration}`. Writes every panel's
   NB-Pro prompt + the one Seedance prompt, in one pass.
3. **`refine-loop`** (loop) → the Director critiques its OWN spec against `rubrics/grid.md` (incl. the hard
   spatial checks: turn-direction-vs-panel-layout consistency, U-turn risk, every-turn-has-a-horizontal-
   direction) and **revises until it self-PASSes** — converging the spec to clean BEFORE any panel is generated.
   `until_bash` = `grid-verdict-passed.ts` (exits 0 when grid-verdict.json is PASS). This is the reliability fix:
   the model isn't reliably one-shot on hard multi-level briefs, so the loop feeds the critic's specific feedback
   back into a revision until it converges (max 5 iterations).
4. **`panel-flatten`** (script) → `grid-spec.json` → panel work-items (prompts embedded; refs chained for style).
5. **`panel-gen`** (loop, execute-only) → generate each panel (NB-Pro 2k), one per iteration. No prompt-writing.
6. **`compose-grid`** (script) → montage panels in order → **resize to 1920×1080** → `grid.png`.
7. **`door-check`** (command, opus, VISION — observe only) + **`door-swing`** (script, deterministic). The model
   kept getting the hinge/swing GEOMETRY backwards, so it now ONLY reports which side the **handle** is on (the
   easy observation it gets right); `door-swing.ts` then computes it as arithmetic — **hinge = opposite the
   handle, swing = the hinge side** (handle-right ⇒ swings LEFT; handle-left ⇒ swings RIGHT) — and rewrites the
   door clause. This split keeps the error-prone geometry out of the model. No-op if there's no hinged door.
8. **`grid-gate`** (approval) → human reviews the composited GRID image + the (door-corrected) flythrough prompt
   BEFORE the paid render. Reject → regenerate named panel(s) + re-compose.
8. **`gen-flythrough`** (script) → the ONE Seedance call (`--start-image grid.png --duration N`). Guards against
   duration-in-prompt. → `showcase-video.mp4`.
9. **`showcase-gate`** (approval) → human watches the single continuous video. Reject → tweak the duration-free
   flythrough prompt and re-render, or regenerate a panel + re-compose + re-render.
10. **`report`**.

Two human checkpoints (the composited grid before spend, the video after). Retired (no longer used): the
seam-based `storyboard-check.ts`, `storyboard-flatten.ts`, and the clip/stitch nodes — kept on disk for
reference but unreferenced.

---

## 3. Files
- `commands/showcase-director.md` — opus Director (grid method).
- `scripts/panel-flatten.ts` — grid-spec → panel work-items.
- `scripts/compose-grid.ts` — montage + resize to 1920×1080 (the standard-size discipline).
- `scripts/gen-flythrough.ts` — the one Seedance call; duration-in-prompt guard.
- `rubrics/storyboard.md` — (legacy, seam-method) superseded by the inline `grid-critic`.
- Reused as-is: `preflight.ts`, `plan-step.ts`, `hf-image.ts`, `hf-video.ts`, `lib/util.ts`.

## 4. Verification protocol
- At **`grid-gate`**: open `grid.png` — panels read as one house, distinct vantages, journey order; the
  flythrough prompt has NO duration text. This is the cheap pre-Seedance checkpoint.
- At **`showcase-gate`**: watch the single video — one continuous cinematic move through the spaces in order, no
  morph. (No seams to check — there's only one generation.)
- Run `stall-watch.ts` on a loop while driving.

## 5. Meta-principle
The win was **architectural, not creative**: every seam bug came from generating the journey in pieces. Generate
it as ONE Seedance video from ONE storyboard image and the entire class disappears. Keep the Seedance prompt
duration-free; keep the panels one-style/distinct; keep the grid at 1920×1080. That's the whole method.
