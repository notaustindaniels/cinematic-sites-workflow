---
description: Vision OBSERVATION of the rendered entry door — report ONLY which side the handle is on (single/double, handle left/right). A deterministic script then computes the swing. Keeps the error-prone geometry out of the model.
argument-hint: (no arguments — reads grid-spec.json + the rendered panels)
---

# Door Observation — just report what you SEE (the geometry is computed in code)

**Workflow ID**: $WORKFLOW_ID

Seedance hallucinates a double door, or swings a door the wrong way, when the prompt doesn't pin the door's
geometry. Your ONLY job here is to **look at the rendered door and report two simple facts** — is it a single
or double door, and **which edge is the handle on**. You do NOT compute the hinge or the swing direction — a
downstream script does that deterministically (hinge = opposite the handle; swing = toward the hinge). Past
attempts failed because the model was asked to do that "opposite" geometry in its head and got it backwards. So
just OBSERVE; don't reason about hinges or swings.

This node runs AFTER the panels are generated and the grid is composed.

## Phase 1: LOAD
0. **SECTION:** read `$ARTIFACTS_DIR/.cine-section` (trimmed contents `hero` or `showcase`); if the file is
   absent, SECTION=`showcase`. Use `$ARTIFACTS_DIR/<SECTION>/` and `$ARTIFACTS_DIR/scenes/<SECTION>-grid/` below
   (e.g. SECTION=`hero` → `$ARTIFACTS_DIR/hero/...` and `$ARTIFACTS_DIR/scenes/hero-grid/...`).
1. Read `$ARTIFACTS_DIR/<SECTION>/grid-spec.json` — note `panels[]` and the `flythrough_prompt`.
2. Does the flight path pass through a hinged DOOR (the prompt mentions a door swinging/opening — a pivot door,
   entry door)? If it mentions ONLY sliding glass or no portal, set `hinged_door:"no"` and stop.
3. If there is a hinged door, find the panel that depicts it (usually the first/entry panel). **Read (view) that
   panel image** at `$ARTIFACTS_DIR/scenes/<SECTION>-grid/<panel-id>.png`.

## Phase 2: OBSERVE (look carefully — report only what you see)
- **Single or double?** One door leaf, or a double/paired door?
- **WHICH EDGE IS THE HANDLE / PULL / LEVER ON?** Look at the door leaf and find the handle (often a long
  vertical pull bar on a pivot door). Is it on the **LEFT** edge or the **RIGHT** edge of the leaf? Pick the
  one it is closest to. If you genuinely cannot tell, say `"unclear"`.
- That's it. Do NOT state a hinge side or a swing direction — those are computed from the handle side in code.

## Phase 3: REPORT — return the schema AND write the file
Return the node's `output_format` JSON and ALSO write the identical object to
`$ARTIFACTS_DIR/<SECTION>/door-obs.json` (SECTION from Phase 1.0):
```json
{ "hinged_door": "yes" | "no",
  "door_panel": "<panel id, or ''>",
  "single_or_double": "single" | "double" | "n/a",
  "handle_side": "left" | "right" | "unclear" | "n/a" }
```
One-line note: what you observed (e.g. "single pivot door, handle on the right edge"). Do NOT edit grid-spec.json
— the `door-swing` script does that next, using `handle_side` to set hinge = opposite and swing = hinge side.
