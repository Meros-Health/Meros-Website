"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe mobile detection. Always returns `false` on the server and on the
 * first client render (so hydration matches), then syncs to the real media
 * query in an effect.
 */
export function useIsMobile(breakpoint = 768) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return matches;
}
