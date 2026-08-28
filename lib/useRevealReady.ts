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
// still cannot keep a section hidden.
const DECODE_TIMEOUT_MS = 6000;

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
    Promise.all(Array.from(el.querySelectorAll("img")).map(decodeQuietly)).then(settle);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ref, inView]);

  return inView && decoded;
}
