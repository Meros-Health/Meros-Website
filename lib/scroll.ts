import type Lenis from "lenis";

// Height reserved for the fixed header when scrolling to an anchor, so the
// target's top isn't hidden underneath the navbar.
export const NAV_OFFSET = 96;

/** Jump/glide to the very top of the page. */
export function scrollToTop(lenis: Lenis | null, immediate = true) {
  if (lenis) {
    lenis.scrollTo(0, { immediate, force: true });
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: immediate ? "auto" : "smooth" });
  }
}

/** Scroll to the element matching `#id`, accounting for the fixed navbar. */
export function scrollToHash(lenis: Lenis | null, hash: string, immediate = true) {
  const id = hash.replace(/^#/, "");
  if (!id) return scrollToTop(lenis, immediate);

  const el = document.getElementById(id);
  if (!el) return scrollToTop(lenis, immediate);

  if (lenis) {
    lenis.scrollTo(el, { offset: -NAV_OFFSET, immediate, force: true });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top: y, left: 0, behavior: immediate ? "auto" : "smooth" });
  }
}

/**
 * Resolve a scroll target from a raw hash string. Any hash → its anchor;
 * empty/absent hash → the top of the page. Used on route load so a fresh
 * navigation lands deterministically.
 */
export function scrollToTarget(lenis: Lenis | null, hash: string | null | undefined, immediate = true) {
  if (hash && hash !== "#") scrollToHash(lenis, hash, immediate);
  else scrollToTop(lenis, immediate);
}

// Quint-out, the house entrance curve (see lib/motion.ts ENTRANCE_EASE).
const GLIDE_EASING = (t: number) => 1 - Math.pow(1 - t, 5);
const GLIDE_DURATION_S = 1.4;

/**
 * Glide to an in-page anchor from a user click (e.g. the "Visit" CTA). Unlike
 * scrollToHash, this always animates, on a fixed slow duration rather than
 * Lenis's lerp, so the travel reads as one deliberate move.
 */
export function glideToHash(lenis: Lenis | null, hash: string) {
  const id = hash.replace(/^#/, "");
  const el = id ? document.getElementById(id) : null;
  if (!el) return scrollToTop(lenis, false);

  if (lenis) {
    lenis.scrollTo(el, {
      offset: -NAV_OFFSET,
      duration: GLIDE_DURATION_S,
      easing: GLIDE_EASING,
      force: true,
    });
  } else {
    const y = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    window.scrollTo({ top: y, left: 0, behavior: "smooth" });
  }
}
