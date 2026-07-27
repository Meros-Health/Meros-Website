// Shared motion tokens for the page-transition system. Section components keep
// their own local timing constants; only transition-scoped values live here.

// Quint-out: responds immediately, settles gently. The house entrance curve.
export const ENTRANCE_EASE = [0.22, 1, 0.36, 1] as const;

export const EXIT_MS = 420; // cover fade-in over the outgoing page
export const ENTRANCE_MS = 480; // cover fade-out revealing the new page
export const HOLD_MS = 500; // minimum covered hold on the new page
export const MENU_EXIT_COVER_MS = 480; // tuned handoff window for the nav menu close (was hardcoded in Navbar)
export const REDUCED_MOTION_MS = 120;
export const NAV_WATCHDOG_MS = 4000; // release the cover if a navigation never lands

export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // a failed asset shouldn't hold navigation hostage
    img.src = src;
  });
}
