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
