#!/usr/bin/env bun
// brand-card.ts — substitute brand tokens into the vendored brand-card template.
// Reads $A/brand/brand-system.json + .archon/assets/cinematic/brand-card-template.html,
// writes $A/brand/brand-card.html. Also swaps the template's Google-Fonts <link href>.
import { existsSync, readFileSync } from "node:fs";
import { artifactsDir, writeText, die } from "./lib/util.ts";

const TEMPLATE = ".archon/assets/cinematic/brand-card-template.html";

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function moodAt(mood: unknown, i: number): string {
  if (Array.isArray(mood) && mood[i] != null) return String(mood[i]);
  return "";
}

function main(): void {
  const A = artifactsDir();
  const bsPath = `${A}/brand/brand-system.json`;
  if (!existsSync(bsPath)) die(`brand-card: brand-system.json not found at ${bsPath}`);
  if (!existsSync(TEMPLATE)) die(`brand-card: template not found at ${TEMPLATE}`);

  let bs: any;
  try {
    bs = JSON.parse(readFileSync(bsPath, "utf8"));
  } catch (e) {
    die(`brand-card: failed to parse brand-system.json: ${(e as Error).message}`);
  }

  let html = readFileSync(TEMPLATE, "utf8");

  // Swap the Google-Fonts <link href="..."> for the brand's google_fonts_url.
  const fontsUrl = str(bs.google_fonts_url);
  if (fontsUrl) {
    html = html.replace(
      /(<link\s+href=")https:\/\/fonts\.googleapis\.com\/[^"]*(")/i,
      `$1${fontsUrl}$2`,
    );
  }

  // Token map (exact tokens from the contract).
  const tokens: Record<string, string> = {
    BUSINESS_NAME: str(bs.business_name),
    INDUSTRY: str(bs.industry),
    COLOR_BG: str(bs.color_bg),
    COLOR_PRIMARY: str(bs.color_primary),
    COLOR_SECONDARY: str(bs.color_secondary),
    COLOR_ACCENT: str(bs.color_accent),
    COLOR_TEXT: str(bs.color_text),
    FONT_HEADING: str(bs.font_heading),
    FONT_BODY: str(bs.font_body),
    FONT_HEADING_NAME: str(bs.font_heading_name),
    FONT_BODY_NAME: str(bs.font_body_name),
    HEADLINE: str(bs.headline),
    TAGLINE: str(bs.tagline),
    HERO_LINE: str(bs.hero_line),
    THEME_DIRECTION: str(bs.theme_direction),
    MOOD_1: moodAt(bs.mood, 0),
    MOOD_2: moodAt(bs.mood, 1),
    MOOD_3: moodAt(bs.mood, 2),
    MOOD_4: moodAt(bs.mood, 3),
  };

  // Replace every {TOKEN}. Note: {COLOR_PRIMARY}22 / 44 become #hex22 / #hex44.
  for (const [k, v] of Object.entries(tokens)) {
    html = html.split(`{${k}}`).join(v);
  }

  writeText(`${A}/brand/brand-card.html`, html);
  process.stdout.write(`brand-card: wrote ${A}/brand/brand-card.html\n`);
  process.exit(0);
}

main();
