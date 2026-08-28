import localFont from "next/font/local";
import { DM_Sans } from "next/font/google";

// ── Primary: Montage Serif ────────────────────────────────────────────────────
// Headlines, "MERŌS" wordmark (always all-caps). Only Regular weight supplied.
export const montageSerif = localFont({
  src: [
    {
      path: "../public/fonts/Montage Serif Font Regular.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-montage-serif",
  display: "swap",
  preload: true,
});

// ── Secondary: Aetheria ───────────────────────────────────────────────────────
// Accent / editorial text. Use sparingly: pull quotes, product callouts.
// .woff is the highest-quality web format available for this family.
export const aetheria = localFont({
  src: [
    {
      path: "../public/fonts/Aetheria.woff",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-aetheria",
  display: "swap",
  preload: false,
});

// ── Tertiary: DM Sans Light ───────────────────────────────────────────────────
// Subtext, labels, UI copy. Self-hosted via next/font/google (no CDN call at runtime).
// Chosen over Satoshi for its slightly squarer geometric construction, which reads
// more "Nike/athletic brand" in light weight alongside a display serif.
// To swap in real Satoshi: replace this with a localFont() pointing to Satoshi-Light.woff2.
export const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});
