"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Mobile detection that is right from the first client render. The server has
 * no viewport, so it answers `false`; React then re-renders with the real
 * media query synchronously during hydration, before the hydrated tree
 * paints, so nothing flips in a later effect.
 *
 * The server HTML is still the desktop branch, so anything whose *layout*
 * depends on this shifts once JS arrives. Use CSS media queries for layout
 * and keep this for behaviour: timing, which handlers to attach, which menu
 * component to mount.
 */
export function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;

  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
