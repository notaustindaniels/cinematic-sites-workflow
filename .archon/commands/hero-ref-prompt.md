---
description: Write the Nano Banana Pro hero reference-image prompt (Step 2A / §7.1) — 9 slots, leads with [16:9].
argument-hint: (no arguments — reads $ARTIFACTS_DIR/brand/brand-system.json and plan.json)
---

# Hero Reference Prompt — Cinematic Site (Step 2A)

**Workflow ID**: $WORKFLOW_ID

You write ONE Nano Banana Pro image prompt for the hero **start/reference** frame. A `[DET]` script feeds it straight to the CLI, so your only job is the prompt text. This node runs with **fresh context** — load from files.

---

## Phase 1: LOAD (read these artifacts from $ARTIFACTS_DIR)

Read, in order:
1. `$ARTIFACTS_DIR/plan.json` — use `hero.reference_prompt` as your basis and the source of truth for hero intent.
2. `$ARTIFACTS_DIR/brand/brand-system.json` — `industry`, `mood`, `theme_direction`, palette (so the image matches the brand's feel).

---

## Phase 2: GENERATE the prompt (§7.1 image-prompt template — all 9 slots)

Compose the prompt by filling ALL of these slots, IN ORDER, leading with the literal `[16:9]`:

`[16:9 context], [camera angle], [specific subject description], [surface/environment], [lighting style], photorealistic, cinematic, 8k, [mood keywords]`

Rules:
- **Lead with `16:9`** — the dimension must match the 16:9 video output.
- Be specific and concrete: exact camera angle, a specific subject (not "a nice scene"), the surface/environment, and a named lighting style.
- This is the **start frame** of a camera journey — favor depth and spatial layers (foreground / midground / background) so the later video has parallax to work with.
- Keep `photorealistic, cinematic, 8k` literally in the prompt.
- End with mood keywords drawn from the brand `mood`.
- Match the brand's industry and theme direction; do not introduce subjects the brief never mentioned.

Example shape: `"16:9, eye-level shot, single bowl of rich shrimp ramen with steam rising and chopsticks resting on the rim, dark wooden counter, warm dramatic side lighting, photorealistic, cinematic, 8k, moody shallow depth of field"`.

---

## Phase 3: REPORT — return JSON and write the prompt file

Return the node's `output_format` JSON with EXACTLY this field:
- `prompt` — string (the full 9-slot prompt above)

**Required:** `prompt`.

**Write the artifact:** write the prompt TEXT (the raw string, not JSON) to `$ARTIFACTS_DIR/scenes/hero/ref-prompt.txt` (create the `scenes/hero/` dirs). The `gen-hero-ref` script reads this `.txt` file and passes it to Nano Banana Pro at 16:9 / 2k. The text in `ref-prompt.txt` must be identical to the `prompt` value you return.

### PHASE_3_CHECKPOINT
- [ ] Prompt leads with `16:9` and fills all 9 slots in order
- [ ] Subject/environment/lighting are concrete and specific; depth for parallax included
- [ ] Contains `photorealistic, cinematic, 8k` and brand mood keywords
- [ ] Returned `prompt` and the contents of `ref-prompt.txt` are identical
- [ ] `$ARTIFACTS_DIR/scenes/hero/ref-prompt.txt` written

## Phase 4: REPORT

Return the JSON `{ "prompt": "…" }`. One-line note: confirm the ref-prompt.txt path was written.
