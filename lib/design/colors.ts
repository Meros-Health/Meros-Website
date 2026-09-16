// The palette, in one place.
//
// Before this file the same five colours were written four ways: a hex in
// tailwind.config.ts, a hex in globals.css, an rgb tuple in Navbar.tsx, and 56
// hand-written rgba() literals across 25 components. Nothing was wrong, but a
// colour had no owner, so the only thing keeping the copies together was a
// comment in each file saying the other one was the copy.
//
// tailwind.config.ts reads BRAND for its colour tokens. globals.css declares
// the same values as --color-* custom properties, and tests/unit/tokens.test.ts
// binds the two together so they cannot drift apart silently.

export const BRAND = {
  juniper: "#818A83",
  cream: "#FFF7F0",
  midnight: "#292D2A",
  grapefruit: "#D78E77",
  // Copy-only grapefruit: 4.55:1 on cream (AA for small text). Fills, borders
  // and the nav accent keep the brand grapefruit.
  "grapefruit-text": "#AD5B44",
  // Macro charts and the Stacks section. Lived only in globals.css until now,
  // which also meant the contrast test could not see it.
  blue: "#A4BFE1",
  // Staff inventory statuses (/staff). One meaning per colour, selected-state
  // only: the chip's text, its border, and a /veil wash of the same hue. All
  // three clear AA on cream (asserted in tokens.test.ts). Juniper stays
  // decorative and grapefruit stays the interactive accent, so status red and
  // brand grapefruit never compete for a meaning.
  "status-in": "#2B6339",
  "status-low": "#845A0F",
  "status-out": "#A43C33",
} as const;

export type BrandColor = keyof typeof BRAND;

// ── Alpha scale ───────────────────────────────────────────────────────────────
// Four jobs, not eighteen values. The 56 literals this replaces used 0.06, 0.07,
// 0.08 and 0.10 for a faint wash; 0.12, 0.15 and 0.18 for a hairline rule; 0.20,
// 0.25 and 0.28 for a stronger one; and 0.35 and 0.42 for an overlay. Those are
// the same four decisions made repeatedly by hand, so they are named here and
// retuned in one place.
//
// Values above this range are deliberately absent. --gallery-ink-quiet is 0.62
// on cream and 0.66 on midnight because the same perceived quietness needs a
// different alpha dark-on-light than light-on-dark, and IngredientCard's
// selected-state subtext is an ink level, not an overlay. Those keep their own
// values and use withAlpha() so they still derive from BRAND.
export const ALPHA = {
  veil: 0.08,          // faint wash behind a dimmed or muted element
  rule: 0.15,          // hairline divider
  "rule-strong": 0.28, // emphasised border, active states
  scrim: 0.4,          // overlay laid over a photograph or the page
} as const;

/** `#RRGGBB` to its three channels. For anything that has to interpolate. */
export function toRgb(hex: string): [number, number, number] {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  return [r, g, b];
}

/** `#RRGGBB` plus an alpha, as a modern space-separated rgb() string. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}
