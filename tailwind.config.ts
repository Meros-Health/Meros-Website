import type { Config } from "tailwindcss";
import { ALPHA, BRAND } from "./lib/design/colors";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // No default max-width container; sections are full-bleed by default.
    // Opt into a constrained width per-section by composing max-w-* + mx-auto.
    container: {
      center: false,
      padding: "0",
    },
    extend: {
      // ── Brand colors ──────────────────────────────────────────────────
      // Owned by lib/design/colors.ts, which globals.css mirrors as
      // --color-* and tests/unit/tokens.test.ts binds the two together.
      colors: BRAND,

      // ── Alpha scale ───────────────────────────────────────────────────
      // Usable as an opacity modifier on any colour utility, so a hairline
      // divider is `border-midnight/rule` rather than a hand-written rgba().
      opacity: Object.fromEntries(
        Object.entries(ALPHA).map(([name, value]) => [name, String(value)]),
      ),

      // ── Typography ────────────────────────────────────────────────────
      // Three-font palette:
      //   headline  → Montage Serif  (primary display, "MEROS" always all-caps)
      //   aetheria  → Aetheria       (secondary accent, pull quotes, callouts)
      //   body      → DM Sans        (tertiary, subtext, labels, UI copy)
      fontFamily: {
        headline: ["var(--font-montage-serif)", "Georgia", "serif"],
        aetheria: ["var(--font-aetheria)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      // ── Type scale ────────────────────────────────────────────────────
      // The micro band is the site's label type: 104 of the 116 hand-written
      // sizes were one of these four. Named after the same roles globals.css
      // already models correctly for ingredient tiles (--ingredient-*-size).
      // 12px and 14px are not here on purpose: stock text-xs and text-sm are
      // exactly those, and a second name for a size that already has one is
      // how the drift started.
      fontSize: {
        badge: "8px",    // protein / vegan pills
        meta: "9px",     // price and serving labels
        label: "10px",   // the default micro label
        note: "11px",    // the roomiest micro label
        caption: "13px", // smallest running copy
        body: "15px",    // running copy
      },

      // ── Letter spacing ────────────────────────────────────────────────
      // One ladder. There were three: four semantic tokens with 8 uses
      // between them, 50 stock tracking-widest, and 36 arbitrary values
      // across 10 numbers, two of which (0.20em and 0.2em) produced identical
      // CSS from different class strings.
      letterSpacing: {
        "body-mixed": "0.02em",  // DM Sans mixed-case contexts
        aetheria: "0.04em",      // Aetheria default tracking
        // The site's default wide tracking, on display type and all-caps
        // labels alike. Not headlines only, despite the name.
        headline: "0.10em",
        "body-caps": "0.15em",   // DM Sans all-caps contexts
        label: "0.20em",         // wide caps: section labels, buttons
        micro: "0.25em",         // wider still, at the micro sizes above
        "micro-wide": "0.30em",  // the widest the brand goes
      },

      // ── Border width ─────────────────────────────────────────────────
      borderWidth: {
        hairline: "0.5px", // dividers, subtle separators
        emphasis: "1.5px", // highlighted borders
      },

      // ── Spacing additions (full-bleed helpers) ───────────────────────
      // Sections use w-full + these for edge-to-edge breathing room.
      padding: {
        section: "clamp(4rem, 9vw, 9rem)",    // standard section y-padding
        "section-x": "clamp(1.5rem, 7vw, 8rem)", // standard section x-padding
      },
    },
  },
  plugins: [],
};

export default config;
