// Reference-counted scroll lock. Two overlays (nav menu, cart drawer, and the
// edit modal above the drawer) can be open at once; each capturing and
// restoring body.style.overflow on its own leaks "hidden" when the second one
// restores the value the first one set. One counter, one captured value,
// restored by the last release.
//
// Native overflow alone is not enough here: Lenis drives the page from wheel
// events and ignores body overflow, so the first lock also stops Lenis and the
// last release starts it again. While Lenis is stopped it cancels every wheel
// event outside an element marked `data-lenis-prevent`, so an overlay that
// scrolls internally (the drawer's list, the modal body) carries that attribute.

/** The part of a Lenis instance the lock needs. */
export type ScrollController = { stop: () => void; start: () => void };

let locks = 0;
let capturedOverflow = "";
let controller: ScrollController | null = null;

/** Called by LenisProvider when the instance exists, and with null when it is destroyed. */
export function setScrollController(next: ScrollController | null): void {
  controller = next;
  // An overlay may already be open when Lenis mounts a beat later.
  if (next && locks > 0) next.stop();
}

export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (locks === 0) {
    capturedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    controller?.stop();
  }
  locks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) {
      document.body.style.overflow = capturedOverflow;
      controller?.start();
    }
  };
}
