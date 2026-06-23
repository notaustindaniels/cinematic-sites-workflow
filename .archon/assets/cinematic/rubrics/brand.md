# Rubric C.2 — Brand System Critic

The critic reads `brand/brand-system.json` and `intake-brief.md`, then emits `{verdict, reasons[], fixes[]}`.

---

## Checklist

Apply every item. Any FAIL item fails the verdict.

- [ ] **Brief traceability — colors.** Every hex in `color_bg`, `color_primary`, `color_secondary`, `color_accent`, and `color_text` must be explainable by the mood keywords, industry, or existing-site palette in `intake-brief.md`. If a color appears with no traceable link to the brief, FAIL.
- [ ] **Brief traceability — fonts.** Both `font_heading` and `font_body` must match the mood and ticket-band established in intake (luxury brief → refined serif or geometric sans; value/approachable brief → clean, friendly sans). If a font choice contradicts the stated mood, FAIL.
- [ ] **Brief traceability — copy.** The `headline`, `tagline`, `hero_line`, and every item in `sections[]` must reflect what the business actually does as described in the intake — specific services, correct location, correct customer language. If the copy describes a business not present in the brief (wrong industry, wrong city, wrong service scope), FAIL.
- [ ] **No invented geography.** The city, service area, or region that appears anywhere in the brand copy must exactly match what `intake-brief.md` records for the `city` and `service_area` fields. If a city or region appears in the output that is not in the brief, FAIL.
- [ ] **No invented brands.** Any brand names mentioned in copy or `sections[]` must appear in the `brands[]` list in `intake-brief.md`. If the brand system copy references a brand not in the intake, FAIL.
- [ ] **Hex validity.** Every hex value must be exactly 6 hex digits in the form `#RRGGBB` (pattern `^#[0-9a-fA-F]{6}$`). Shorthand (`#RGB`) or 8-digit (`#RRGGBBAA`) forms are FAIL.
- [ ] **Real Google Fonts.** Both `font_heading` and `font_body` must be real, currently-listed Google Fonts (not made-up names, not system fonts passed off as Google Fonts). The `google_fonts_url` must be a valid `fonts.googleapis.com` URL that includes both fonts. If a font name cannot be verified as a real Google Font, FAIL.
- [ ] **Mood array length.** `mood[]` must have exactly 4 items. Fewer or more is FAIL.
- [ ] **Required fields present.** All of: `color_bg`, `color_primary`, `color_secondary`, `color_accent`, `color_text`, `font_heading`, `font_body`, `font_heading_name`, `font_body_name`, `google_fonts_url`, `headline`, `tagline`, `hero_line`, `sections[]`, `theme_direction`, `mood[]` must be non-empty strings/arrays. Any missing or empty field is FAIL.

---

## Output format

```json
{
  "verdict": "PASS | FAIL",
  "reasons": ["One sentence per failed check, stating which field and why."],
  "fixes": ["One actionable correction per reason."]
}
```

An empty `reasons[]` and `fixes[]` is expected on PASS. On FAIL, list every failing item — not just the first.
