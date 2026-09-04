"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";

// Vertical parallax for a full-bleed image inside a fixed-height panel.
//
// Driven off gsap.ticker rather than a scroll listener or framer's useScroll,
// for the same reason BuildSection's bowl lag is: Lenis virtualises scrolling
// and is itself stepped by this ticker (see LenisProvider), so a callback here
// runs on the same frame as the scroll it is reacting to and reads a rect that
// is already current. A scroll listener would trail it by a frame, and
// framer's own offset maths does not survive Lenis at all.
//
// The contract with CSS: the moving layer must overhang the panel by
// `strength` of the panel's height on the top and bottom both, because that is
// exactly how far this moves it. Anything less and an edge of the panel is
// briefly empty at the extremes. See --hero-parallax in globals.css.

/**
 * @param strength Fraction of the panel's height the layer travels in each
 *   direction. Around 0.10 to 0.20 is felt without being announced; much past
 *   that it reads as a mistake before it reads as depth, and it also costs the
 *   crop, since the layer has to overhang the panel by this much at both ends.
 */
export function useParallax<P extends HTMLElement, L extends HTMLElement>(strength: number) {
  const panelRef = useRef<P>(null);
  const layerRef = useRef<L>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const panel = panelRef.current;
    const layer = layerRef.current;
    if (!panel || !layer) return;

    // Reduced motion gets the resting frame and no ticker at all.
    if (reduced) {
      layer.style.transform = "";
      return;
    }

    const tick = () => {
      const rect = panel.getBoundingClientRect();
      const viewport = window.innerHeight;
      // Off screen: nothing to move, and nobody to see it move.
      if (rect.bottom < 0 || rect.top > viewport) return;

      // 0 when the panel's top edge sits on the bottom of the viewport, 1 when
      // its bottom edge sits on the top: the panel's whole journey across the
      // screen, independent of where the document has been scrolled to.
      const progress = (viewport - rect.top) / (viewport + rect.height);
      const travel = strength * rect.height;
      // +travel at the start, -travel at the end. Negative is upward, so the
      // image climbs faster than the page it sits in.
      layer.style.transform = `translate3d(0, ${(0.5 - progress) * 2 * travel}px, 0)`;
    };

    tick();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [strength, reduced]);

  return { panelRef, layerRef };
}
