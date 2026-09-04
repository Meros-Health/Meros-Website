// The landing page's entrance timeline, in one table.
//
// Four beats, top of the screen down, so the eye is led through the layout in
// the order the layout is built: the nav chrome, the lockup under it, the
// image band, then the two actions at the foot. Every beat's delay is measured
// from the moment the page is ready (the preloader lifting on first load, the
// transition cover lifting on a return to "/"), never from mount, so the
// sequence is never half-spent behind a cover.
//
// Why the navbar's beat lives here rather than in Navbar.tsx: the navbar is
// global chrome, but on first load it is beat one of this sequence, and a
// delay that has to line up with three others belongs beside them. On a route
// that is not the landing page it is simply the only beat that plays.
//
// The one constraint on these numbers: the image is the Largest Contentful
// Paint element, and Chrome stops the LCP clock when it finishes revealing.
// image.delay + image.duration is therefore paid in full against the 2.5s
// budget, on top of however long the preloader gate held. Keep their sum under
// ~1.9s unless you have measured the gate and know the headroom.
import { ENTRANCE_EASE } from "@/lib/motion";

/** Quint-out: responds immediately, settles gently. Shared with page transitions. */
export const HERO_EASE = ENTRANCE_EASE;

export interface EntranceBeat {
  /** Seconds after the page-ready gate lifts. */
  readonly delay: number;
  /** Seconds the beat takes to finish. */
  readonly duration: number;
}

export const HERO_ENTRANCE = {
  /** Beat 1: the nav band, menu toggle, mark and cart. Fade only. */
  navbar: { delay: 0.15, duration: 1.0 },
  /** Beat 2: the "MERŌS House of Yogurt" lockup. Fade and a short rise. */
  logo: { delay: 0.4, duration: 1.2 },
  /** Beat 3: the image band, uncovered top edge downward. */
  image: { delay: 0.62, duration: 1.25 },
  /** Beat 4: Visit MERŌS and Order Now. Fade and a short rise. */
  ctas: { delay: 1.15, duration: 1.1 },
} as const satisfies Record<string, EntranceBeat>;
