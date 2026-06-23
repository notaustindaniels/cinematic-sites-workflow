# Before/After Derivation Template (§7.5)

Use this template for every before/after image pair in the G loop. The derivation order is mandatory: **generate the AFTER image first, then derive the BEFORE from it.**

Generating in this order ensures the two images share composition, camera angle, lighting, and environment — which is the only thing that makes the comparison slider convincing. Generating both independently almost always produces mismatched framing that breaks the slider.

---

## Step 1 — Generate the AFTER image (the ideal state)

Generate the after image using a standard NB-Pro prompt for the desired final state. Use the after prompt from `plan.json` (`before_after.pairs[n].after_prompt`).

**NB-Pro call:**
```bash
# The after_prompt from plan.json
higgsfield generate create nano_banana_2 \
  --prompt "[AFTER_PROMPT from plan.json]" \
  --aspect_ratio 16:9 \
  --resolution 2k \
  --json --wait --wait-timeout 8m --wait-interval 5s
```

Save the result as `$ARTIFACTS_DIR/scenes/beforeafter/pair-{n}-after.png`.

---

## Step 2 — Derive the BEFORE image from the AFTER

Pass the after image as the reference (`--image ./pair-{n}-after.png`) and prompt NB-Pro to derive the before state from it, keeping everything else identical.

**Before-derivation prompt template:**

```
Create an image exactly like this reference, but [BEFORE STATE DESCRIPTION — e.g., "with the windows visibly aged and weathered: peeling paint on the frames, fogged glass, and water stains on the sill — the kind of windows due for replacement"]. Same composition, same camera angle, same lighting setup, same room and environment. Every element except the state of the [SUBJECT — e.g., "windows"] must be identical to the reference.
```

**NB-Pro call:**
```bash
higgsfield generate create nano_banana_2 \
  --prompt "[FILLED BEFORE-DERIVATION PROMPT]" \
  --image ./pair-{n}-after.png \
  --aspect_ratio 16:9 \
  --resolution 2k \
  --json --wait --wait-timeout 8m --wait-interval 5s
```

Save the result as `$ARTIFACTS_DIR/scenes/beforeafter/pair-{n}-before.png`.

---

## Slot guide

| Slot | What to write |
|---|---|
| `BEFORE STATE DESCRIPTION` | The worn, old, damaged, or uninstalled state — contrasted with the after. Be specific: name what is visually different (paint condition, material age, missing element, damage type). |
| `SUBJECT` | The element that differs between before and after (e.g., "windows", "roof", "deck surface", "door"). Everything else must stay identical. |

---

## Worked example — window replacement pair

**After prompt (from plan.json):**
```
16:9, exterior view of a modern craftsman home facade, front-on at eye level from the walkway. New floor-to-ceiling white-framed double-hung windows flank the front door, freshly installed, clean glass, crisp trim. Afternoon light, manicured landscaping, photorealistic, 8k.
```

**After image generated:** `pair-1-after.png` — modern craftsman with gleaming new windows.

**Before-derivation prompt:**
```
Create an image exactly like this reference, but with the windows visibly aged and in need of replacement: peeling white paint on the frames, fogged glass with seal failure, water stains on the sills, and gaps in the caulking visible at the frame edges. Same composition, same camera angle, same lighting setup, same house and landscaping. Every element except the state of the windows must be identical to the reference.
```

**Before image generated:** `pair-1-before.png` — same house, same framing, same light, deteriorated windows.

---

## Rules summary

1. **After first, before second.** Never generate both independently.
2. **Always pass the after image as `--image`** when generating the before. This anchors composition, angle, lighting, and environment.
3. **The before-derivation prompt must include:** (a) "exactly like this reference, but [before state]", (b) "same composition, same camera angle, same lighting setup, same room/environment", (c) "every element except [subject] must be identical to the reference."
4. **Only the transformation state differs.** The before and after must be distinguishable only by the state of the product or surface being compared — not by lighting, framing, background, or angle.
5. **The per-pair critic verifies shared composition** before the pair is marked done — if the before was clearly not derived from the after (mismatched framing or angle), the critic will FAIL and the before must be regenerated.
