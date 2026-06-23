# Rubric C.4 — Director's Brief Critic

The critic reads `scenes/hero/director-brief.json` and the reference image at `scenes/hero/reference.png`, then emits `{verdict, reasons[], fixes[]}`.

---

## The governing principle (apply this first, before checking fields)

**"The hero moment should make someone say 'I want that.' If your final frame just looks like a closer version of the first frame, you chose wrong."**

This is the primary test. Before checking any field, ask: does `hero_moment` describe something genuinely different from the starting composition in the reference image — something *revealed*, *beyond*, *inside*, or *transformed*, not merely a closer zoom? If `hero_moment` is a tighter crop of what is already visible in the reference, FAIL this rubric immediately and explain why.

---

## Checklist

Apply every item. Any FAIL item fails the verdict.

- [ ] **Hero moment is a transformation, not a zoom.** `hero_moment` must describe a destination state that differs from the reference image in subject matter, location, or scene content — not just in framing distance. "A closer view of the front door" when the reference already shows the front door is FAIL. "The sun-drenched living room interior visible through the opened front door" is PASS.
- [ ] **Camera travels through space.** `camera_path` must describe physical spatial travel — a dolly, push-in, orbital arc, crane, tracking slide, or a combination. A `camera_path` that only describes zoom (focal length change with no spatial movement) or a static/locked-off camera is FAIL.
- [ ] **Camera start is grounded in the reference.** `camera_start` must describe a position consistent with the reference image's framing, angle, and distance. If the brief's start position contradicts what the reference image actually shows, FAIL.
- [ ] **Camera end is the hero moment.** `camera_end` must place the camera at a position from which `hero_moment` is the primary subject in frame. If the two are inconsistent, FAIL.
- [ ] **At least 2 transforms.** `transforms[]` must have at least 2 items — specific physical changes that occur as the camera travels (door opens, lights activate, curtains part, etc.). Zero or one transform is FAIL.
- [ ] **Start and end frame prompts are distinct.** `start_frame_prompt` and `end_frame_prompt` must describe visually different scenes. If they are near-identical (only a subtle lighting shift, no change in location or subject composition), FAIL.
- [ ] **All required fields present and non-empty.** `product`, `hero_moment`, `camera_start`, `camera_path`, `camera_end`, `transforms[]`, `start_frame_prompt`, `end_frame_prompt`, and `needs_new_start_frame` must all be present and non-empty. Missing or empty is FAIL.

---

## Output format

```json
{
  "verdict": "PASS | FAIL",
  "reasons": ["One sentence per failed check, quoting the relevant field value where helpful."],
  "fixes": ["One actionable correction per reason — what to change in the brief to fix it."]
}
```
