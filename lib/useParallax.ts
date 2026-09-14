"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import gsap from "gsap";

// Parallax for a full-bleed image inside a fixed panel, on either axis.
//
// Driven off gsap.ticker rather than a scroll listener or framer's useScroll,
// for the same reason BuildSection's bowl lag is: Lenis virtualises scrolling
// and is itself stepped by this ticker (see LenisProvider), so a callback here
// runs on the same frame as the scroll it is reacting to and reads a rect that
// is already current. A scroll listener would trail it by a frame, and
// framer's own offset maths does not survive Lenis at all.
//
// Both axes are driven by the same progress: how far the panel has travelled
// across the viewport, top edge on the bottom of the screen to bottom edge on
// the top. Scrolling is the only input either one has. A horizontal drift is
// not a different effect, it is the same effect pointed sideways.
//
// The contract with CSS: the moving layer must overhang the panel by
// `strength` of the panel's size along that axis, at both ends, because that is
// exactly how far this moves it. Anything less and an edge of the panel is
// briefly empty at the extremes. See --promo-parallax and --gallery-parallax
// in globals.css.

/**
 * @param travel Signed fraction of the panel's size along `axis`. The layer
 *   sits at `-travel` when the panel enters the viewport and at `+travel` when
 *   it leaves, so the sign is the direction the layer ends up displaced. Zero
 *   means no motion and no ticker.
 */
function useAxisParallax<P extends HTMLElement, L extends HTMLElement>(axis: "x" | "y", travel: number) {
  const panelRef = useRef<P>(null);
  const layerRef = useRef<L>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const panel = panelRef.current;
    const layer = layerRef.current;
    if (!panel || !layer) return;

    // Reduced motion, or a caller that asked for none, gets the resting frame
    // and no ticker at all.
    if (reduced || travel === 0) {
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
      const offset = (progress - 0.5) * 2 * travel * (axis === "x" ? rect.width : rect.height);
      layer.style.transform =
        axis === "x" ? `translate3d(${offset}px, 0, 0)` : `translate3d(0, ${offset}px, 0)`;
    };

    tick();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [axis, travel, reduced]);

  return { panelRef, layerRef };
}

/**
 * Vertical parallax: the image climbs while the page it sits in falls, which
 * is the direction that reads as depth rather than as drag.
 *
 * @param strength Fraction of the panel's height the layer travels in each
 *   direction. Around 0.10 to 0.20 is felt without being announced; much past
 *   that it reads as a mistake before it reads as depth, and it also costs the
 *   crop, since the layer has to overhang the panel by this much at both ends.
 */
export function useParallax<P extends HTMLElement, L extends HTMLElement>(strength: number) {
  return useAxisParallax<P, L>("y", -strength);
}

/**
 * Horizontal parallax: the image drifts across its panel as the panel crosses
 * the screen, left to right on a positive strength.
 *
 * Tolerances are tighter than the vertical hook's. A panel crosses the viewport
 * over more than its own height of scrolling, so a vertical drift has room to
 * be large and still read as slow; the same fraction sideways is the same
 * distance in a fraction of the time the eye spends on it, and it stops looking
 * like depth and starts looking like the photograph sliding out of its frame.
 *
 * @param strength Fraction of the panel's width, in each direction. Negative
 *   runs it right to left; zero is how a caller opts out, and costs no ticker.
 */
export function useParallaxX<P extends HTMLElement, L extends HTMLElement>(strength: number) {
  return useAxisParallax<P, L>("x", strength);
}

/**
 * Drift for a photograph inside a held panel: the curtain hero (.hero-curtain
 * in app/globals.css). That panel never crosses the viewport. It is sticky at
 * the top of the screen while the next section is pulled up over it, so the
 * progress the two hooks above share, the panel's own journey across the
 * screen, would read as nothing happening for the whole hold. The input here
 * is the hold itself: how far the panel's track, the element it is sticky
 * inside, has scrolled past the top of the viewport, out of the distance
 * sticky allows it, which is the track's height less the panel's own.
 *
 * The layer climbs by `travel` of the panel's height over that hold, and only
 * climbs; the panel is covered, never uncovered from the other side, so the
 * overhang is at the bottom alone. See --hero-parallax in globals.css.
 *
 * @param travel Fraction of the panel's height the layer has climbed by the
 *   time the panel is fully covered. Zero means no motion and no ticker.
 */
export function useCurtainParallax<P extends HTMLElement, L extends HTMLElement>(travel: number) {
  const panelRef = useRef<P>(null);
  const layerRef = useRef<L>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const panel = panelRef.current;
    const layer = layerRef.current;
    const track = panel?.parentElement;
    if (!panel || !layer || !track) return;

    if (reduced || travel === 0) {
      layer.style.transform = "";
      return;
    }

    const tick = () => {
      const rect = track.getBoundingClientRect();
      // The track has left the screen entirely: the panel is under the next
      // section, and nobody can see it move.
      if (rect.bottom < 0) return;

      const height = panel.getBoundingClientRect().height;
      const hold = rect.height - height;
      // No hold is no curtain: the panel scrolls like any other block.
      if (hold <= 0) return;

      // 0 at the top of the page, 1 the moment sticky releases, which is the
      // moment the next section's edge reaches the nav.
      const progress = Math.min(Math.max(-rect.top / hold, 0), 1);
      layer.style.transform = `translate3d(0, ${-progress * travel * height}px, 0)`;
    };

    tick();
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [travel, reduced]);

  return { panelRef, layerRef };
}
