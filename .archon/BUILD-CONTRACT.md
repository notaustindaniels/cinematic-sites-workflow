# BUILD CONTRACT — cinematic-site Archon workflow

This is the **interface source of truth** for every file in `.archon/`. The workflow YAML
(`.archon/workflows/cinematic-site.yaml`) is authoritative for node wiring; this doc pins the
file/JSON contracts that connect nodes. The plan (`CINEMATIC-ARCHON-WORKFLOW-PLAN.md` at repo root)
is authoritative for **content** (templates §7, rubrics Appendix C, schemas Appendix B, the live-pinned
Higgsfield CLI §8). Where the plan and this contract disagree on an **interface**, follow this contract.

## Universal conventions (every file MUST obey)

1. **State is file-based.** Archon `command:` nodes CANNOT read `$node.output` (only inline
   `prompt:`/`bash:`/`script:` bodies can). So: every producer writes its result to a fixed artifact
   file under `$ARTIFACTS_DIR/…`, and every consumer reads that file. `when:` conditions read
   `$node.output.field` from structured output — that still works and is already wired in the YAML.
2. **AI command nodes persist their JSON.** Every `command` node whose YAML has `output_format` MUST
   *also* write the exact same JSON object to its pinned artifact file (listed below), in addition to
   returning it. Downstream scripts/commands read the file.
3. **Gate-reading scripts dual-output.** Scripts whose output a `when:` reads (`preflight`,
   `intake-check`) print their JSON to **stdout** (single line) AND write it to the pinned artifact
   file. All JSON boolean-ish values are the **quoted strings** `"true"`/`"false"` (never bare
   booleans) and numbers are quoted strings too (e.g. `"credits":"3000"`).
4. **Named scripts read env, not substitutions.** Named scripts (`.archon/scripts/*.ts`) get workflow
   vars from `process.env` (`process.env.ARTIFACTS_DIR`, `process.env.WORKFLOW_ID`, …). For local
   testing, fall back: `const A = process.env.ARTIFACTS_DIR || process.argv[2]`. cwd = repo/worktree root,
   so vendored assets are at `.archon/assets/cinematic/…` (relative paths OK).
5. **Dry-run is mandatory.** When `process.env.HF_DRY_RUN === '1'`, `hf-image.ts`/`hf-video.ts` MUST
   NOT call the paid CLI — they synthesize a placeholder asset at `--out` (use ffmpeg lavfi:
   image = `ffmpeg -f lavfi -i color=c=gray:s=1920x1080 -frames:v 1 OUT`; video =
   `ffmpeg -f lavfi -i color=c=black:s=1280x720:d=DUR -pix_fmt yuv420p OUT`) and print a fake
   `https://dXXXX.cloudfront.net/…` URL. `preflight.ts` in dry-run reports everything present + `credits:"9999"`.
   Every other [DET] script must run unchanged in dry-run so the full DAG (L3) works with zero credits.
6. **Runtime is `bun` for every script** (`.ts`). Scripts must `process.exit(0)` on success; only exit
   non-zero on a genuine failure that should fail the node (a non-zero exit auto-resumes the run).
   `intake-check` must NOT exit non-zero (the gate handles incompleteness).
7. **Idempotent + dir-safe.** Every script `mkdir -p`s its output dirs (`fs.mkdirSync(dir,{recursive:true})`).

## Higgsfield CLI (pinned — see plan §8; do not change flags)

- Image (Nano Banana Pro): `higgsfield generate create nano_banana_2 --prompt "P" --aspect_ratio 16:9
  --resolution 2k|4k [--image REF ...] --json --wait --wait-timeout 8m --wait-interval 5s`
- Video (Seedance 2.0 Fast): `higgsfield generate create seedance_2_0 --mode fast --prompt "P"
  --start-image S [--end-image E] --duration N --aspect_ratio 16:9 --resolution 720p
  --generate_audio false --json --wait --wait-timeout 20m --wait-interval 5s`
- Result parse: stdout is a **top-level JSON array**; asset URL = **`.result_url`** (host `*.cloudfront.net`).
  Extract `JSON.parse(stdout).filter(o=>o.result_url).pop().result_url`, fallback = last `http`-prefixed line.
  Download with `curl -fsSL "$URL" -o OUT`.
- Defaults: image aspect ALWAYS `16:9`; video resolution ALWAYS `720p` (fast-mode reality), audio false.
- `preflight.ts` should discover the auth/credit subcommand from `higgsfield --help` (e.g. account/credits);
  if it can't parse a credit number, emit `credits:"9999"` (don't false-alarm).

---

## SCRIPTS (`.archon/scripts/*.ts`, runtime bun)

`hf-image.ts` / `hf-video.ts` each export a function AND have a CLI entry guarded by `if (import.meta.main)`.
Other scripts read/write files only. Shared helpers may live in `.archon/scripts/lib/`.

| script | reads | writes | stdout | notes |
|---|---|---|---|---|
| `preflight.ts` | system PATH, `higgsfield` auth/credits | `$A/preflight.json` | same JSON (1 line) | keys: `higgsfield, higgsfield_authed, ffmpeg, ffprobe, jq, gh, vercel, git, imagemagick, credits` (all quoted strings) |
| `intake-check.ts` | `$A/intake.json` | `$A/intake-check.json` | `{"complete":"true|false","missing":[...]}` | MUST-HAVEs: business_name, services[≥1], city, service_area, customers; FAIL if any empty or still echoed in open_questions. Never exit non-zero. |
| `brand-card.ts` | `$A/brand/brand-system.json`, `.archon/assets/cinematic/brand-card-template.html` | `$A/brand/brand-card.html` | — | substitute every `{TOKEN}` (see token list below); swap the template's Google-Fonts `<link href>` for brand `google_fonts_url`. |
| `plan-flatten.ts` | `$A/plan.json` | `$A/showcase/plan.json`, `$A/beforeafter/plan.json` | — | flatten to ordered work-item lists (item schema below); each `status:"pending"`. Empty/disabled → `{"items":[]}`. |
| `plan-step.ts` | `$A/<list>/plan.json` | (mutates on --mark-done) | per-mode | CLI: `--next <list>` prints first pending item JSON or `NONE`; `--all-done <list>` exit 0 iff no pending; `--mark-done <list> <id>` sets status=done. `<list>`∈{showcase,beforeafter}. |
| `hf-image.ts` | `--prompt-file`/`--prompt`, refs | `--out` PNG | result URL | export `hfImage({promptFile?,prompt?,out,images?:string[],aspect?='16:9',resolution?='2k'})`; CLI flags `--prompt-file --prompt --out --image(repeatable) --aspect --resolution`. Verify result ≥1280px (ffprobe/sips). Honor HF_DRY_RUN. |
| `hf-video.ts` | `--prompt-file`/`--prompt`, frames | `--out` MP4 | result URL | export `hfVideo({promptFile?,prompt?,out,startImage,endImage?,duration=8,aspect?='16:9',resolution?='720p'})`; CLI `--prompt-file --prompt --out --start-image --end-image --duration --aspect --resolution`. ffprobe-verify duration±1s + video stream. Honor HF_DRY_RUN. |
| `gen-hero-ref.ts` | `$A/scenes/hero/ref-prompt.txt` | `$A/scenes/hero/reference.png` | — | import hfImage; aspect 16:9, resolution 2k. |
| `gen-hero-end.ts` | `$A/scenes/hero/director-brief.json` (`end_frame_prompt`) | `$A/scenes/hero/end-frame.png` | — | hfImage with `images:[reference.png]`, resolution 2k. (node is `when` want_end_frame.) |
| `gen-hero-video.ts` | `$A/scenes/hero/video-prompt.txt`, `$A/plan.json` (hero.variants, hero.duration) | `$A/scenes/hero/hero-v{n}.mp4` + `hero-final.mp4` | — | loop n=1..variants; startImage reference.png; endImage end-frame.png IF it exists; copy hero-v1.mp4 → hero-final.mp4. |
| `hero-validate.ts` | `$A/scenes/hero/hero-v*.mp4` | `$A/scenes/hero/preview/*.jpg`, `$A/scenes/hero/hero-validate.json` | — | ffprobe each (duration,w,h,hasVideo); extract 5 preview jpgs each; ensure hero-final.mp4 exists (else copy v1). |
| `extract-frames.ts` | `$A/scenes/hero/hero-final.mp4`, opt `$A/scenes/showcase/showcase-video.mp4` | `$A/site/frames/frame_%04d.jpg` (1-indexed), opt `$A/site/showcase-frames/frame_%04d.jpg`, `$A/site/frames-count.json` | `{"hero_frames":N,"showcase_frames":M}` | `ffmpeg -vf "fps=30,scale=1920:-1"`; then compress with `magick`(fallback `convert`) `-quality 80 -strip`. |
| `showcase-stitch.ts` | `$A/showcase/plan.json` (done clips, in order) | `$A/scenes/showcase/showcase-video.mp4` | — | `ffmpeg -f concat` (xfade fallback); ffprobe-verify. No clips → no-op (don't fail). |
| `assemble-site.ts` | `$A/site/site-plan.json`, `$A/brand/brand-system.json`, `$A/site/frames-count.json`, vendored assets, opt `$A/beforeafter/plan.json` | `$A/site/index.html` | — | see ASSEMBLER below. |
| `build-check.ts` | `$A/site/index.html`, `$A/site/frames-count.json`, `$A/intake.json`, `$A/plan.json` | `$A/site/build-check.json` | `{"verdict":"PASS|FAIL","failures":[...]}` | see BUILD-CHECK below. |

`$A` = `process.env.ARTIFACTS_DIR`.

### plan.json (rich file written by `generation-plan` command; read by `plan-flatten`)
```jsonc
{
  "showcase_enabled":"true|false", "before_after_enabled":"true|false",
  "hero":{"reference_prompt":"…","want_end_frame":"true|false","variants":2,"duration":8},
  "showcase":{"enabled":"true|false","lighting":"optional global mood or \"\"","scenes":[
    {"label":"…","start_state":"…","end_state":"…","seeds_next":"…","camera":"…","duration":5}]},
  "before_after":{"enabled":"true|false","pairs":[{"caption":"…","after_prompt":"…"}]},
  "modules":["hero-video","brand-logo-marquee",…], "scroll_heights":{"hero":"300vh","showcase":"400vh"},
  "deploy":{"target":"vercel|local","domain":"…"}
}
```
### work-item schema (in `$A/showcase/plan.json` → `{"items":[…]}`; produced by plan-flatten)
```jsonc
// keyframe item (kf0 is fresh: refs []; every later kf is an EDIT of the prior: refs [kf(k-1)])
{"id":"kf1","type":"keyframe","prompt_role":"establish|reveal","refs":["$A/scenes/showcase/kf0.png"],
 "out":"$A/scenes/showcase/kf1.png","scene_label":"…","depicts":"…","evolves_from":"…",
 "seeds_next":"…","lighting":"…","context_notes":"…","status":"pending"}
// clip item (animates kf(k-1)→kf(k); ALWAYS two refs = [start kf, end kf])
{"id":"clip1","type":"clip","prompt_role":"clip","refs":["$A/…/kf0.png","$A/…/kf1.png"],
 "out":"$A/scenes/showcase/clip1.mp4","scene_label":"…","camera":"…","from_state":"…","to_state":"…",
 "duration":5,"seeds_next":"…","lighting":"…","context_notes":"…","status":"pending"}
```
Chain (REBUILD-PLAN §1, 2-frame model): `N` scenes ⇒ `N+1` keyframes + `N` clips. kf0 is the only fresh
NB-Pro generation; kf(k) is an EDIT of kf(k-1). clip(k) uses kf(k-1) as `--start-image` and kf(k) as
`--end-image`; kf(k) is reused as both clip(k).end and clip(k+1).start (same file = the seam, never
regenerated). Items are ordered kf0..kfN then clip1..clipN. before/after
`{"id","caption","after_prompt","after_out","before_out","status"}`.

### brand-card tokens (exact)
`{BUSINESS_NAME} {INDUSTRY} {COLOR_BG} {COLOR_PRIMARY} {COLOR_SECONDARY} {COLOR_ACCENT} {COLOR_TEXT}`
`{FONT_HEADING} {FONT_BODY} {FONT_HEADING_NAME} {FONT_BODY_NAME} {HEADLINE} {TAGLINE} {HERO_LINE}`
`{THEME_DIRECTION} {MOOD_1} {MOOD_2} {MOOD_3} {MOOD_4}`. (Hex must stay 6-digit — the template
concatenates `{COLOR_PRIMARY}22`/`44` for alpha.)

### ASSEMBLER (`assemble-site.ts`) — build one self-contained `site/index.html`
- Inject `:root{}` CSS vars from brand-system: `--color-bg/-primary/-secondary/-accent/-text`,
  `--font-heading`, `--font-body`; add the brand `google_fonts_url` `<link>`. Embed
  `design-system.css` inline (`<style>`).
- Hero = sticky-canvas scroll-frame section: embed `scroll-frame-engine.js`, replacing the literal
  token `__FRAME_COUNT__` with `frames-count.json.hero_frames`; frames referenced as `frames/frame_%04d.jpg`.
  Hero height = `scroll_heights.hero`. Bottom-anchored hero copy from brand `headline`/`hero_line`.
- If `frames-count.showcase_frames>0`: a second scroll-frame section using `showcase-frames/` + the
  vendored `showcase-overlay.(css|js)`.
- Content sections from `site_plan.sections[]` (key+copy) styled with design-system classes; nav from
  `site_plan.nav_links`; CTA section LAST from `site_plan.cta`.
- Modules: for each `site_plan.modules[].name`, inline that vendored `modules/<name>.html` fragment and
  fill its slots from `.slots` (catalog below). Dedup single-instance modules (`scroll-progress`,
  `horizontal-scroll`). MANDATORY: if brands exist → include `brand-logo-marquee` (never a text list);
  if before/after enabled → include `before-after-slider` (wire pairs from `beforeafter/plan.json`).
- Patch entrance-reveal modules (`stagger-grid`, `reveal-text`, and any IntersectionObserver that adds a
  `.revealed`/reveal class) to **bidirectional**: toggle the class on `isIntersecting` true/false and
  REMOVE the `unobserve(...)` call. (Do NOT touch `counter-animate`/`typewriter` — those play once by design.)

### module slot catalog (site_plan.modules[].slots — what `assemble-site` fills)
- `brand-logo-marquee`: `{label, items:[{name, img?}]}` (duplicate items for seamless loop)
- `counter-animate`: `{items:[{target, suffix, label}]}`
- `typewriter`: `{phrases:[string]}` (→ `data-phrases` JSON)
- `before-after-slider`: `{title, pairs:[{after,before,caption}]}` (auto-filled from beforeafter assets if present)
- `stagger-grid`: `{items:[{img,title,desc}]}`
- all others (`flip-cards accordion-slider parallax-sections horizontal-scroll reveal-text kinetic-text
  glitch-text marquee image-trail liquid-glass magnetic-buttons svg-draw scroll-progress`): slots
  optional — render the vendored sample with theme vars applied + override a `heading`/`label`/`text`
  slot if provided; otherwise keep the sample content.

### BUILD-CHECK (`build-check.ts`) — assert the decidable parts of skill §3F → `{verdict,failures[]}`
Hard checks (any failure ⇒ FAIL): hero section has a sticky canvas + the engine + `__FRAME_COUNT__`
replaced with a number equal to `frames-count.hero_frames`; `:root` defines `--color-primary`; ≥3
modules present; NO `unobserve(`/`disconnect(` inside the stagger-grid/reveal entrance blocks (scoped,
not global); no inline `opacity:0` or `opacity:0.[0-6]` left on text classes; brands → `.brand-logos-track`
present iff `intake.brands` non-empty; before/after → `.ba-container` present iff `before_after_enabled`;
last `<section>` is the CTA/contact; `<meta name="viewport">` present and ≥1 `clamp(` in CSS.

---

## COMMANDS (`.archon/commands/*.md`)

Phase-structured per `authoring-commands.md`. Each fresh node leads with "read artifacts from
`$ARTIFACTS_DIR/…`". Each MUST write its pinned artifact file (convention #2). `output_format` is
already declared on the node in the YAML — match those field names EXACTLY.

| command | reads | writes (besides returning JSON) | content source |
|---|---|---|---|
| `intake-draft` | `$ARGUMENTS` | `$A/intake.json` (exact output JSON) + `$A/intake-brief.md` (human-readable) | skill Step 0; never assume MUST-HAVEs → `open_questions`. |
| `brand-system` | `$A/intake-brief.md`, `$A/intake.json` | `$A/brand/brand-system.json` | skill Step 1; existing-site mode → WebFetch the URL, extract real hex/fonts/copy. 6-digit hex; real Google Fonts (+ url). |
| `generation-plan` | `$A/intake.json`, `$A/brand/brand-system.json` | `$A/plan.json` (the RICH schema above) | skill Step 2 planning; plan ONLY requested optionals; showcase = 2-keyframe-per-scene chain (each scene's end_state reveals what its start_state already showed; reuse prior end_state as next start_state; seed the next scene); marquee iff brands, slider iff before/after. |
| `hero-ref-prompt` | `$A/brand/brand-system.json`, `$A/plan.json` | `$A/scenes/hero/ref-prompt.txt` | plan §7.1 image template — 9 slots, leads with `[16:9]`. |
| `hero-director-brief` | `$A/scenes/hero/ref-prompt.txt`, `$A/brand/brand-system.json` | `$A/scenes/hero/director-brief.json` | plan §2B 5 questions → director_brief; hero_moment must be a transformation, not a closer crop; set `want_end_frame`. |
| `hero-video-prompt` | `$A/scenes/hero/director-brief.json`, `$A/brand/brand-system.json` | `$A/scenes/hero/video-prompt.json` + `$A/scenes/hero/video-prompt.txt` (flattened Seedance prompt incl. negatives) | plan §7.2 — ≥4 beats, camera moving through space every beat, subject motion layered, not a loop. |
| `site-plan` | `$A/brand/brand-system.json`, `$A/intake.json`, `$A/plan.json`, `$A/site/frames-count.json` | `$A/site/site-plan.json` | skill Step 3E; pick modules (subset of the 18) + fill slots per the catalog; per-section copy; CTA; NO HTML. |
| `deploy-finalize` | `$A/plan.json` (deploy), tooling | `$A/deploy-summary.md`; copy `site/`+`scenes/` into `$A/` | skill Step 4; vercel+gh present → git init/add/commit, `gh repo create … --push`, `vercel --prod --yes`, capture URL; else finalize local + write exact deploy-later cmds. ALWAYS persist deliverables to `$A/`. |

## RUBRICS (`.archon/assets/cinematic/rubrics/*.md`) — verbatim from plan Appendix C
`brand.md`(C.2) `plan.md`(C.3) `director-brief.md`(C.4) `video-prompt.md`(C.5) `keyframe.md`(C.6)
`clip.md`(C.7) `site.md`(C.8) `beforeafter.md`(from §2F/§7.5: the two images share composition, angle,
lighting, environment so the slider lines up). Each rubric is a short checklist the critic applies to
emit `{verdict:PASS|FAIL, reasons[], fixes[]}`.

## TEMPLATES (`.archon/assets/cinematic/templates/*.md`) — from plan §7
`keyframe-template.md`(§7.3 NB-Pro geometry-not-labels) `clip-template.md`(§7.4 Seedance 5-layer)
`beforeafter-template.md`(§7.5). These are read by the showcase/before-after loop prompts.

## VENDORED ASSETS (`.archon/assets/cinematic/`)
- `scroll-frame-engine.js` — from SKILL.md §3B (sticky-canvas scroll→frame engine). Adapt it so the
  frame count is the literal token `__FRAME_COUNT__` and frames load from `frames/frame_%04d.jpg`
  (zero-padded 4). Keep its scroll math verbatim otherwise.
- `design-system.css` — render SKILL.md §3C's 12 design rules as real CSS: dark-first (`#0a0a0a`),
  `clamp()` type scale, generous spacing, bottom-anchored hero copy + gradient scrim, legible defaults,
  `:root` reads the brand vars. Mobile rules at 375px.
- `showcase-overlay.css` + `showcase-overlay.js` — SKILL.md §2E text-overlay system for the showcase
  scroll section (if §2E has no standalone code, author a minimal scroll-synced caption overlay).
- `brand-card-template.html` — copy from `~/.claude/skills/cinematic-site-kit-higgsfield/brand-card-template.html` UNCHANGED.
- `modules/` — copy all 18 from `~/.claude/skills/cinematic-site-kit-higgsfield/cinematic-modules/` UNCHANGED
  (the assembler patches stagger-grid at build time; keep originals here).

---

## SAFETY — stall detection (`.archon/scripts/stall-watch.ts`)

This workflow has many human-approval gates. A run paused at a gate emits no further signal,
so an unanswered gate is indistinguishable from a healthy pause and can sit idle indefinitely
(we lost ~7h to a forgotten `showcase-gate`). A paused workflow CANNOT watch itself — detection
must be **external**. `stall-watch.ts` reads the Archon SQLite DB directly (no server needed) and
exits non-zero when any non-terminal run is idle past a per-status threshold:
`paused` (forgotten gate), `running` (possible hang), `pending` (never started). For each it prints
the run id, idle time, the stuck gate node, and the exact `archon workflow approve/reject` fix.

Run it on an interval so this can never recur silently:
- cron: `*/10 * * * * cd <repo> && bun .archon/scripts/stall-watch.ts --quiet || <notify>`
- loop: `/loop 10m bun .archon/scripts/stall-watch.ts`
- one-off: `bun .archon/scripts/stall-watch.ts`   (`--help` for thresholds; defaults paused=30m running=20m pending=10m)
