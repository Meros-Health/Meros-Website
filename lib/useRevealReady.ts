"use client";

import { useEffect, useState, type RefObject } from "react";
import { decodeQuietly } from "@/lib/criticalImages";

// Reveal gate for below-the-fold sections: true once the element is in view
// AND every <img> inside it has decoded, so a section never animates in
// around a picture that is still arriving. Lazy images only start loading as
// they near the viewport, which is why the decode wait begins at in-view
// rather than at mount. A plain IntersectionObserver, not framer's
// whileInView: Lenis confuses framer's offset maths (see SectionBand).

// Safety valve, counted from entering view: a picture that never arrives
// still cannot keep a section hidden. Only on-screen images are waited on
// (see revealImages), so a stall here is a genuinely slow decode, and holding
// a section's text for longer than this reads as a broken page.
const DECODE_TIMEOUT_MS = 3000;

// How far past the viewport an image still counts as part of the reveal.
const REVEAL_IMAGE_MARGIN_PX = 200;

// The images a reveal is about: rendered (a display:none layout branch has
// no box) and on or near the screen. A hidden lazy image may never start
// loading (Chrome at DPR 2 leaves lg:hidden thumbnails unrequested) and
// decode() on it never settles, which once held the Signature Menu ledger
// hidden until the safety valve fired. An image far below the viewport is
// off screen for the whole animation and may be outside the browser's
// lazy-load threshold too.
export function revealImages(root: Element): HTMLImageElement[] {
  const top = -REVEAL_IMAGE_MARGIN_PX;
  const left = -REVEAL_IMAGE_MARGIN_PX;
  const bottom = window.innerHeight + REVEAL_IMAGE_MARGIN_PX;
  const right = window.innerWidth + REVEAL_IMAGE_MARGIN_PX;
  return Array.from(root.querySelectorAll("img")).filter((img) => {
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    return rect.bottom > top && rect.top < bottom && rect.right > left && rect.left < right;
  });
}

// `active` re-arms the observer when the observed element mounts after the
// hook's first run (a component that swaps layout branches after hydration).
export function useRevealReady(
  ref: RefObject<Element | null>,
  rootMargin = "-100px",
  active = true
): boolean {
  const [inView, setInView] = useState(false);
  const [decoded, setDecoded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, active]);

  useEffect(() => {
    if (!inView) return;
    const el = ref.current;
    if (!el) {
      setDecoded(true);
      return;
    }
    let cancelled = false;
    const settle = () => {
      if (!cancelled) setDecoded(true);
    };
    const timer = window.setTimeout(settle, DECODE_TIMEOUT_MS);
    Promise.all(revealImages(el).map(decodeQuietly)).then(settle);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ref, inView]);

  return inView && decoded;
}
