import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // No default max-width container — sections are full-bleed by default.
    // Opt into a constrained width per-section by composing max-w-* + mx-auto.
    container: {
      center: false,
      padding: "0",
    },
    extend: {
      // ── Brand colors ──────────────────────────────────────────────────
      colors: {
        juniper: "#818A83",
        cream: "#FFF7F0",
        midnight: "#292D2A",
        grapefruit: "#D78E77",
      },

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
      letterSpacing: {
        headline: "0.10em",
        "body-caps": "0.15em",   // DM Sans all-caps contexts
        "body-mixed": "0.02em",  // DM Sans mixed-case contexts
        aetheria: "0.04em",      // Aetheria default tracking
      },
      fontWeight: {
        "headline-normal": "400",
        "body-light": "300",
        "body-normal": "400",
      },

      // ── Border radius (squared brand — no rounded corners) ───────────
      // Brand rule: zero rounding anywhere. These semantic tokens are kept
      // so existing `rounded-*` utilities resolve, but they all collapse to
      // 0. The global reset in globals.css is the hard enforcement layer.
      borderRadius: {
        none: "0",
        tag: "0",
        btn: "0",
        card: "0",
        panel: "0",
        hero: "0",
      },

      // ── Border width ─────────────────────────────────────────────────
      borderWidth: {
        hairline: "0.5px", // dividers, subtle separators
        emphasis: "1.5px", // highlighted borders
      },

      // ── Spacing additions (full-bleed helpers) ───────────────────────
      // Sections use w-full + these for edge-to-edge breathing room.
      padding: {
        section: "clamp(3rem, 8vw, 7rem)",    // standard section y-padding
        "section-x": "clamp(1.5rem, 7vw, 8rem)", // standard section x-padding
      },
    },
  },
  plugins: [],
};

export default config;
