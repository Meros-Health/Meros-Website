// Every easing curve and shared duration on the site.
//
// This file used to say "section components keep their own local timing
// constants; only transition-scoped values live here", and that decision is
// what produced 14 hand-written beziers across 11 files, in two spellings
// (a [a,b,c,d] array for framer-motion, a cubic-bezier() string for CSS) with
// no shared name between them. Retuning the house curve meant editing eleven
// files and hoping you had found them all.

type Bezier = readonly [number, number, number, number];

/** framer-motion takes the array; CSS takes the string. Same numbers. */
const toCss = (e: Bezier) => `cubic-bezier(${e.join(", ")})`;

// ── Easing ────────────────────────────────────────────────────────────────────

/**
 * Quint-out. Responds immediately, settles gently, distributes the motion
 * evenly across the duration. The house curve for anything that enters on its
 * own: scroll reveals, page entrances, clip-path wipes.
 */
export const ENTRANCE_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Expo-out. Front-loaded: about 90 percent of the motion lands in the first
 * third. That reads as too abrupt for an entrance, which is why it is not the
 * house curve, but it is exactly right for a response to a click, where the
 * point is that the interface reacted instantly. Cart drawer, signature modal,
 * the nav overlay and everything that opens with it, hover states.
 */
export const PANEL_EASE = [0.16, 1, 0.3, 1] as const;

/** In-and-out. The nav frame's own panels, which move rather than enter. */
export const NAV_FRAME_EASE = [0.76, 0, 0.24, 1] as const;

export const ENTRANCE_EASE_CSS = toCss(ENTRANCE_EASE);
export const PANEL_EASE_CSS = toCss(PANEL_EASE);
export const NAV_FRAME_EASE_CSS = toCss(NAV_FRAME_EASE);

// ── Reveal timing ─────────────────────────────────────────────────────────────

/** Opacity-and-travel reveals. Slow settle, short travel, staggered. */
export const REVEAL_S = 1.15;
export const REVEAL_STAGGER_S = 0.14;
export const REVEAL_TRAVEL_PX = 16;
/** Reduced motion: appear, do not travel, do not linger. */
export const REVEAL_REDUCED_S = 0.15;

/**
 * Clip-path and opacity wipes, which cover more distance than a 16px travel
 * and need longer to read as one movement. Ready-made because it is always
 * spent the same way: `transition: \`opacity ${CLIP_REVEAL_TIMING}\``.
 */
export const CLIP_REVEAL_S = 1.2;
export const CLIP_REVEAL_TIMING = `${CLIP_REVEAL_S}s ${ENTRANCE_EASE_CSS}`;

// ── Page transitions ──────────────────────────────────────────────────────────

export const EXIT_MS = 420; // cover fade-in over the outgoing page
export const ENTRANCE_MS = 480; // cover fade-out revealing the new page
export const HOLD_MS = 500; // minimum covered hold on the new page
// Desktop nav menu: the four panels take MENU_PANEL_MS to open, and the same
// to close inward to full coverage when a link is chosen. The transition
// cover (same colour as the panels) snaps opaque MENU_EXIT_COVER_MS after
// the click; it has to land at or after the panels meet, or the page shows
// through the seam for a frame. Keep the margin if the panel timing changes.
export const MENU_PANEL_MS = 700;
export const MENU_EXIT_COVER_MS = MENU_PANEL_MS + 60;
export const REDUCED_MOTION_MS = 120;
export const NAV_WATCHDOG_MS = 4000; // release the cover if a navigation never lands
