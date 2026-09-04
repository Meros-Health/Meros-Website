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
// Built from Aetheria.otf, which stays on disk as the source (see the README
// in public/fonts). woff2 took this from 41.5 kB to 19 kB, and it is no longer
// on the preloader's critical path either way.
export const aetheria = localFont({
  src: [
    {
      path: "../public/fonts/Aetheria.woff2",
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
  // The dominant face on the site (115 font-body-caps + 70 font-body-mixed
  // uses). It is on the critical path whether or not it is declared to be, and
  // the preloader gates on it, so let the browser discover it from the document
  // head rather than after the CSS has parsed.
  preload: true,
});

// ── The preloader gate ────────────────────────────────────────────────────────
// components/ui/Preloader.tsx holds the whole document until these have loaded.
// Aetheria is deliberately absent: it is the largest file of the three, it is
// used four times, none of them above the fold, and document.fonts.ready waits
// on every font the document renders, so gating on it held the page for an
// accent face nobody sees until they scroll. It still loads, just not in front
// of the hero.
//
// Full CSS font shorthands, because that is what document.fonts.load() parses.
// next/font hashes the family names at build time, so they have to be read off
// the font objects rather than typed.
export const GATING_FONTS = [
  `400 1em ${montageSerif.style.fontFamily}`,
  `300 1em ${dmSans.style.fontFamily}`,
  `400 1em ${dmSans.style.fontFamily}`,
];
