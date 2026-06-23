# Seedance Clip Prompt Template (§7.4) — The 5-Layer Formula

Use this template for **every Seedance showcase clip** — both mechanism clips and traversal clips. Do NOT use this for the hero video (the hero uses the timeline-style prompt from Step 2C; the two formats are intentionally different and must not be mixed).

Each Seedance clip prompt = **exactly 5 sentences in this exact order.** Each sentence has exactly one role. Writing in this order is nearly mechanical — fill one labeled blank per layer.

---

## The 5 layers

| Layer | Sentence | Role |
|---|---|---|
| 1 | First | Event-category label — name the motion using product terminology |
| 2 | Second | Geometry + bounded magnitude — where the motion happens and how far |
| 3 | Third | Mechanism pacing — the speed of the animated element itself |
| 4 | Fourth | Physics-reasoned constraint — what stays still and *because* of what physical reason |
| 5 | Fifth | Camera — what the camera does |

---

## Fill-in-the-blanks template

Replace every `[SLOT]` with the specific value for this clip. Do not leave any slot empty.

**Layer 1 — Event-category label:**
```
This is a video of a [EVENT CATEGORY — product terminology, e.g., "awning window opening", "bifold patio door folding open accordion-style", "single-hung sash sliding upward", "pivot entry door swinging open"].
```

**Layer 2 — Geometry + bounded magnitude:**
```
The [ELEMENT — e.g., "window", "sash", "bottom panel"] [GEOMETRY + MAGNITUDE — bounded, e.g., "opens a few inches outward from the bottom edge", "slides upward about halfway", "folds in three panels to the left side"].
```

**Layer 3 — Mechanism pacing:**
```
The [ELEMENT] moves at a [PACING — e.g., "slow consistent speed", "slow and steady pace", "gradual consistent rate"].
```

**Layer 4 — Physics-reasoned constraint with a *because* clause:**
```
[WHAT STAYS STILL — e.g., "The top of the window", "The fixed upper panel", "The frame and surrounding wall"] does not move at all, because [PHYSICS REASON — e.g., "it's hinged from the top", "it's a fixed lite", "the panels are anchored at the header track"] — only [WHAT DOES MOVE — e.g., "the bottom part of the window", "the lower sash", "the three leaf panels"] moves.
```

**Layer 5 — Camera:**
```
The camera [CAMERA MOTION — e.g., "pushes in slowly and steadily", "barely moves", "drifts forward a few inches", "holds still"].
```

---

## Slot guide

| Slot | What to write | Common mistakes |
|---|---|---|
| `EVENT CATEGORY` | Product terminology that primes Seedance's motion prior — the **opposite** of NB-Pro rules. Use the label. | "a window opening" (too vague — add the mechanism type: "awning window") |
| `GEOMETRY + MAGNITUDE` | Where the motion occurs on the element and how far, bounded by a qualifier ("a few inches", "about halfway", "40 degrees"). | "opens wider" / "extends" (no magnitude bound → chaotic output) |
| `PACING` | Speed of the animated mechanism element (not the camera). "slow consistent speed" is the most reliable phrase. | Describing camera pacing here instead of mechanism pacing |
| `PHYSICS REASON` | The physical constraint that makes this motion possible: hinge location, track type, anchor point. Must be a *because* clause, not a bare prohibition. | "the top does not move" (no *because* → the model can override a bare command) |
| `CAMERA MOTION` | For mechanism-only clips: "barely moves" or "drifts forward a few inches." For traversal clips: describe the actual movement. Camera is always last. | Putting camera first, or describing camera motion in multiple layers |

---

## Worked examples

### Mechanism clip — awning window opening (canonical v3c prompt)

```
This is a video of an awning window opening.
The window opens a few inches outward from the bottom edge.
The window opens at a slow consistent speed.
The top of the window does not move at all, because it's hinged from the top — only the bottom part of the window moves.
The camera pushes in slowly and steadily.
```

### Mechanism clip — single-hung sash sliding up

```
This is a video of a single-hung sash window opening.
The lower sash slides vertically upward about halfway, leaving the upper sash and its divided-light glass fully intact and in place.
The lower sash moves at a slow consistent speed.
The upper sash does not move at all, because it is the fixed sash in a single-hung configuration — only the lower sash slides.
The camera barely moves.
```

### Traversal clip — pure camera flythrough, no mechanism

```
This is a flythrough from the pool deck through the bifold opening into the craftsman entryway.
The camera pushes forward steadily, crossing the pool deck between palms on both sides and passing through the widened bifold opening.
The camera moves at a slow consistent speed.
No mechanism animates in this clip — every window, door, and panel stays in its current state throughout — because this shot is a pure traversal with no mechanical event.
The camera eases to a gentle hover with the craftsman front facade filling the frame.
```

---

## Rules summary (do not deviate)

1. **Exactly 5 sentences, in this order.** Any missing, extra, or reordered layer fails the clip critic.
2. **Layer 1 uses product-category terminology.** This is the opposite of the NB-Pro keyframe rule. Seedance NEEDS the label; NB-Pro hides from it.
3. **Layer 2 bounds the magnitude.** Vague magnitude ("opens", "widens") produces chaotic output.
4. **Layer 4 must include a *because* clause.** A bare constraint without a physical reason can be overridden by the model.
5. **Camera is always Layer 5 — never first.** For mechanism clips, the camera "barely moves" or "drifts." For traversal clips, describe the actual movement — but always as the final layer.
6. **One mechanism only.** If the brief has more than one thing happening, it is two clips.
7. **No second-by-second timelines.** Do not add `t=0s`, `t=2s` style beats to Seedance clip prompts. That format is for the hero video only and causes Seedance to hallucinate staged sequences.
