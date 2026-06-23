# Rubric C.8 — Site Build Critic

The critic reads `site/index.html`, `intake.json`, and `plan.json`, then emits `{verdict, reasons[], fixes[]}`.

This rubric covers the **subjective and qualitative** checks that `build-check.ts` cannot mechanically assert. The mechanical checks (frame count, bidirectional unobserve, CTA-last, brand-logos-track, ba-container, viewport meta, clamp presence) are handled by the deterministic build-check script and should already be PASS before this critic runs.

---

## Checklist

Apply every item. Any FAIL item fails the verdict.

### Legibility

- [ ] **No text is below 0.7 opacity.** Scan all text-carrying elements (headings, paragraphs, labels, nav items, CTA copy) for inline styles or CSS rules that set `opacity` below `0.7`. Any text rendered at opacity < 0.7 is FAIL. Note: this applies to text elements — decorative non-text elements may use lower opacity.
- [ ] **Text is readable against its background.** Spot-check the hero section, each content section, and the CTA. If text would be unreadable due to color contrast (light text on light background, dark text on dark background, or text buried under an image with no scrim), FAIL.

### Module rules

- [ ] **Brands rendered as marquee, not a list.** If `intake.brands` is non-empty, brand names must appear inside a scrolling marquee element (`.brand-logos-track` or equivalent animated track). A static `<ul>`, `<p>`, or comma-separated text list of brand names is FAIL.
- [ ] **Before/after rendered as a draggable slider.** If `plan.before_after_enabled == "true"`, the before/after comparison must use the before-after-slider module (a `.ba-container` with draggable divider). Side-by-side static images are FAIL.

### Scroll animations — bidirectional

- [ ] **All entrance/reveal scroll animations are bidirectional.** Elements that animate in when scrolled into view must also animate out when scrolled back out of view. Any `IntersectionObserver` block that calls `unobserve()` after the first trigger (making the animation fire only once) is FAIL. The exception: `counter-animate` and `typewriter` play once by design and are exempt from this check.

### Mobile

- [ ] **Site is usable at 375px viewport width.** The hero canvas fills the screen, text is readable without horizontal scrolling, and interactive modules (marquee, slider, accordion) function at mobile width. Any element that overflows the viewport horizontally or becomes unusable at 375px is FAIL.

### Page structure

- [ ] **CTA / contact section is the last section.** The final `<section>` in the page body must be the CTA or contact section. Any content section placed after the CTA is FAIL.

### "Go all out" — richness

- [ ] **Every section has something animated or interactive.** This is the "go all out" standard from the skill. The hero plays as a scroll-driven video. Every content section below should have at least one animated or interactive element: a reveal animation, a counter, a marquee, a typewriter, a flip card, a parallax layer, an accordion, or similar. A section that is purely static text with no animation is FAIL.

---

## Output format

```json
{
  "verdict": "PASS | FAIL",
  "reasons": ["One sentence per failed check, referencing the section or element and the specific problem."],
  "fixes": ["One actionable correction per reason — what to add, remove, or change to fix it."]
}
```
