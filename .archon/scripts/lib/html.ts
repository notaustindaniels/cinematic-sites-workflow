// HTML/assembly helpers shared by assemble-site.ts (and reusable by build-check.ts).
// Runtime: bun. Pure string utilities — no I/O side effects beyond what callers do.

/** Escape text for safe insertion into HTML element content / attribute values. */
export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Coerce to a plain string (no escaping) with a fallback. */
export function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

/** A JSON literal safe to embed inside an HTML <script> or a single-quoted attribute.
 *  Closes-tag and quote characters are neutralized so it can't break out of context. */
export function jsonAttr(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/** Strip leading HTML comment blocks (the module docs) from a vendored fragment.
 *  Only removes comments that appear before the first real tag, preserving inline
 *  comments inside the markup (some fragments use them as structure hints). */
export function stripLeadingComments(html: string): string {
  let out = html;
  // Repeatedly remove a leading (whitespace + <!-- ... -->) prefix.
  for (;;) {
    const m = out.match(/^\s*<!--[\s\S]*?-->\s*/);
    if (!m) break;
    out = out.slice(m[0].length);
  }
  return out;
}

/** Split a vendored module fragment into its <style>, <script>, and remaining markup.
 *  Returns the three pieces (style/script WITHOUT their wrapping tags). Multiple
 *  blocks of each are concatenated. Commented-out sample blocks are dropped. */
export function splitFragment(htmlIn: string): { markup: string; styles: string[]; scripts: string[] } {
  let html = stripLeadingComments(htmlIn);
  // Drop big HTML-comment sample blocks (e.g. the marquee's commented text-only variant)
  // so we never emit two copies of a section. Inline single-line hint comments are tiny
  // and harmless, but multi-line comment blocks that contain a <section ...> are samples.
  html = html.replace(/<!--[\s\S]*?-->/g, (m) => (/<\w/.test(m) ? "" : m));

  const styles: string[] = [];
  const scripts: string[] = [];

  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_m, body) => {
    styles.push(body);
    return "";
  });
  html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_m, body) => {
    scripts.push(body);
    return "";
  });

  return { markup: html.trim(), styles, scripts };
}
