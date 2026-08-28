// Shared motion tokens for the page-transition system. Section components keep
// their own local timing constants; only transition-scoped values live here.

// Quint-out: responds immediately, settles gently. The house entrance curve.
export const ENTRANCE_EASE = [0.22, 1, 0.36, 1] as const;

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
