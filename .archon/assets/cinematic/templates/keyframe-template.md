# Flux.2 Pro Keyframe Prompt Template — the 2-frame showcase chain

Use this template to write the **Flux.2 Pro prompt for one showcase keyframe**. The showcase is a
chain of keyframes: `kf0 → kf1 → … → kfN`. Every keyframe except `kf0` is an **EDIT of the one before it**
(passed as the reference image `refs[0]`). Seedance then animates between each adjacent pair.

The work-item tells you which kind of keyframe you're writing:

- **`prompt_role: "establish"`** (only `kf0`, `refs: []`) — a fresh from-scratch generation. No reference image.
- **`prompt_role: "reveal"`** (every later keyframe, `refs: [prior kf]`) — an edit of the prior frame.

This template is the **opposite** of the Seedance clip template: Flux.2 Pro needs *geometry, not action labels*.
Describe the resulting physical state, never the verb.

---

## THE TWO HARD RULES (every reveal keyframe must obey both — this is what prevents AI slop)

1. **Reveal, don't invent.** Everything new in this frame must already be **visible or clearly implied in the
   reference** — through a doorway, window, opening, or in the distance. The edit *expands what is already on
   screen*. It must NEVER conjure a space that wasn't visible yet. If you cannot point to where the new content
   was already seeded in the reference, the model will hallucinate it — and that is the exact failure that
   botched every previous run. A bold camera move is fine; an *unseeded* one is slop.
2. **Preserve the rest, inherit the light.** Keep the same world, building, materials, architecture, sky, and
   **lighting** exactly matching the reference. Because this frame is an *edit*, it inherits the reference's
   time-of-day and palette for free — so do NOT re-specify a different mood, and never use the word **"dark"**
   for an opening (Flux.2 Pro renders a pitch-black void and erases the interior you wanted to reveal).

The work-item carries everything you need: `depicts` (what this frame should show), `evolves_from` (what the
reference currently shows), `seeds_next` (what must stay visible for the next scene), and `lighting` (the
optional global mood). Use them.

---

## A. Establishing keyframe (`prompt_role: "establish"`, kf0 only)

A fresh, hyper-specific composition — no reference image. This single frame sets the world and the light that
the entire chain inherits, so make it dense and concrete.

```
[16:9.] [SUBJECT + ENVIRONMENT in detail — the building/space, framed precisely: camera angle, height, what's
in the foreground / midground / background, what's on which side of the frame.] [MATERIALS + TEXTURES —
siding/stone/glass/wood, reflections, shadows.] [LIGHTING — the time of day and direction; use the global
`lighting` mood if one is set.] [SEED — make sure the thing the first scene will move toward is already
visible or implied here: warm glow through the door seams, a glass wall beyond, a vista through a window.]
```

Keep it photorealistic and visually dense — the more detail Flux.2 Pro bakes in now, the less every later frame
(and Seedance) has to invent.

---

## B. Reveal keyframe (`prompt_role: "reveal"`, every kf after kf0) — an EDIT of the reference

Always lead with **"Edit the reference image so that …"** so the model knows it is *modifying* `refs[0]`, not
re-imagining a scene. A reveal is one of two kinds (or a blend) — the work-item's `depicts` vs `evolves_from`
tells you which:

### B1 — Mechanism reveal (something opens/moves: a door, sash, glass, panel)

```
Edit the reference image so that [SPECIFIC ELEMENT BY POSITION — e.g. "the monumental walnut pivot door,
centered"] now [GEOMETRY OF THE OPEN STATE — the resulting shape, NOT the action: e.g. "stands open about 80
degrees, pivoted on its central vertical axis — a wide clear opening where the door face was"].

Through the opening, [CONCRETE CONTENT ALREADY IMPLIED IN THE REFERENCE — name 3+ specific things, all of
which were seeded in the reference: e.g. "the foyer and, beyond it, the great-room glass wall and the
mountains that were already glowing through the door seams"]. [Keep visible the `seeds_next` element so the
next scene can move into it.]

[ORIENTATION LOCK — REQUIRED for every mechanism; this is what stops a door opening from the WRONG SIDE.
LOOK AT THE REFERENCE IMAGE and read off, concretely: which edge/axis the part hinges or pivots on (where is
the pull handle, the hinge stile, the track?), and which way the moving part travels. State both, then negate
the mirror image. e.g. "The door pivots on its vertical axis set about one-third in from the LEFT jamb — the
hinge side shown in the reference — and its RIGHT leading edge (the one carrying the pull handle in the
reference) swings toward the viewer and to the left. It does NOT pivot from the right edge; the leading edge
does NOT swing to the right; and it is not side-hinged, it does not slide, it does not fold."]

Keep the [siding, stone, glass, trim, landscaping, sky, and lighting] exactly matching the reference image —
same world, same time of day. Every other element remains exactly as in the reference.
```

### B2 — Camera-advance reveal (the camera has moved forward into a space already visible)

The reference already shows where we're going (through the open door, down the hall, toward the glass wall).
This frame is the *destination composition* — described as a continuation of the reference, never a new place.

```
Edit the reference image so that the camera has [MOVED — e.g. "carried forward through the open pivot door
that was visible in the reference, and now stands inside the foyer facing the great-room glass wall"]. The
view is now [NEW FRAMING — what fills the frame: e.g. "the floor-to-ceiling lift-and-slide glass wall,
straight ahead, with the deck and mountains beyond it"].

Everything in this frame was already visible in the reference — [name the throughline: "the glass wall and
mountains seen through the open door are now what we face"]. No new room or space has appeared that wasn't on
screen before.

Keep the same [materials, architecture, palette, and lighting] as the reference — same world, same time of
day. [Keep visible the `seeds_next` element — e.g. "the closed glass panels and the deck beyond them, which
the next scene will open onto."]
```

A reveal may blend B1 and B2 (the camera advances *and* a mechanism actuates). That's allowed — just keep both
grounded in what the reference already showed.

---

## Slot guide

| Slot | What to write | Common mistakes |
|---|---|---|
| `SPECIFIC ELEMENT BY POSITION` | Identify the target by spatial relationship — center, left/right of door, inner/outer of a pair. | "the door" / "a window" (Flux.2 Pro changes all similar elements) |
| `GEOMETRY OF THE OPEN STATE` | The resulting physical shape: "open ~80° on its central pivot axis", "lower sash slid up — bottom half an open rectangular gap, no glass". Never the verb. | "open the door" / "the door is open" / "a dark opening" |
| `CONCRETE CONTENT` | 3+ specific named items, **all already implied in the reference**, the last of which is the `seeds_next` element. | "the warm interior" (a void) / naming a room not on screen in the reference (invention) |
| `ORIENTATION LOCK` | **Read the reference** for which edge/axis the part moves on and which way it travels, state it ("pivots on the left-third axis; right leading edge swings toward viewer-left"), AND negate the mirror ("not from the right edge; leading edge does not swing right"). Then also negate the wrong *mode* (pivot→not side-hinged; single-hung→not a casement; bifold→not a slider). | Locking only the *mode* but not the *side/direction* → the model flips it and the door opens from the wrong side. Omitting it entirely. |
| `MOVED` (B2) | Describe the camera as *continuing through an opening that was already visible* in the reference. | Describing arrival at a place not seen in the reference (invention) |
| preserve clause | Enumerate what stays: materials, architecture, landscaping, sky, lighting. | "keep everything else the same" (too vague for Flux.2 Pro) |

---

## Worked example — mechanism reveal (single-hung lower sash, geometry-not-labels)

*Reference (prior kf) shows a craftsman facade close-up, all windows closed. This reveal opens the inner-left
window's lower sash. Note: zero use of "open" as a verb, zero "dark", explicit wrong-mode negation, named
interior that seeds the next scene, full preserve clause.*

```
Edit the reference image so that the single-hung window immediately to the left of the front door — the inner
window of the left pair — has its lower sash slid vertically upward by about half its height. The upper sash
remains fixed in place with its divided-light glass fully intact and reflective. The bottom half of that
window's frame is now an open rectangular gap — no glass — directly revealing the warm craftsman interior:
oak hardwood floors, a cream linen sofa, and a bank of tall casement windows on the back wall.

Through the open gap, the interior is warmly lit with the same afternoon quality as the exterior — no dark void.

The window frame stays flat against the wall; it does not tilt outward, it is not hinged, it does not swing.
Every other window and the front door remain exactly as in the reference image.

Keep the siding, trim, porch, columns, palms, lighting, and sky exactly matching the reference.
```

## Worked example — camera-advance reveal (no mechanism)

*Reference (prior kf) shows an open pivot door with the great-room glass wall visible beyond it. This reveal
carries the camera inside. Nothing new is invented — the glass wall was already on screen.*

```
Edit the reference image so that the camera has carried forward through the open pivot door that was visible in
the reference, and now stands just inside the foyer facing the great room. Straight ahead is the floor-to-
ceiling lift-and-slide glass wall — the same glass wall that was already visible through the open door in the
reference — with the deck and the mountains beyond it.

Everything in this frame was already on screen in the reference: the glass wall and the mountains we now face
are the ones seen through the doorway. No new room has appeared.

Keep the same walnut, stone, and glass materials, the same architecture, and the same warm late-afternoon light
as the reference — same world, same time of day. The closed glass panels and the deck beyond them stay clearly
visible, since the next scene opens onto them.
```

---

## Rules summary (do not deviate)

1. **Reveal, don't invent.** Every new element must already be visible/implied in the reference. If you can't
   point to where it was seeded, don't add it.
2. **Lead with "Edit the reference image so that …"** for every reveal keyframe — it's an edit, not a re-imagining.
3. **Geometry, not labels** for mechanisms. Never "open the door"; describe the resulting physical state.
4. **Never the word "dark"** for an opening — write "open gap — no glass" and separately name the lit interior.
5. **Name the concrete content** (3+ items); the last seeds the next scene. Never leave a void.
6. **Lock the orientation, then negate the wrong mode** for mechanisms. Read the reference for which edge/axis
   the part hinges or pivots on and which way it travels, state it explicitly, and negate the mirror image —
   THEN negate the wrong mode. A door that opens from the wrong side passed mode-negation but failed the
   orientation lock; this rule exists to catch exactly that.
7. **Preserve the rest, inherit the light.** Same world, materials, sky, and time of day as the reference; do
   not re-specify a different mood mid-chain.
