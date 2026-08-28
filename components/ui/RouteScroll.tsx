"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "@/components/animation/LenisProvider";
import { scrollToTarget } from "@/lib/scroll";

/**
 * Centralises scroll behaviour on navigation:
 *   - Disables the browser's scroll restoration so refreshes never land
 *     mid-page.
 *   - On every route load: honour a `#hash` if present, otherwise snap to the
 *     top of the page.
 *   - On in-page hash changes (e.g. the cart link): scroll to the anchor.
 */
export function RouteScroll() {
  const pathname = usePathname();
  const lenis = useLenis();

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  // Route load: wait one frame for the new route's DOM to mount, then resolve
  // the scroll target from the current hash. Re-runs once `lenis` is ready so
  // the very first load uses the smooth-scroll instance rather than a fallback.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollToTarget(lenis, window.location.hash, true);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, lenis]);

  useEffect(() => {
    const onHashChange = () => scrollToTarget(lenis, window.location.hash, false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [lenis]);

  return null;
}
