// Reference-counted body scroll lock. Two overlays (nav menu, cart drawer)
// can be open at once; each capturing and restoring body.style.overflow on
// its own leaks "hidden" when the second one restores the value the first
// one set. One counter, one captured value, restored by the last release.

let locks = 0;
let capturedOverflow = "";

export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (locks === 0) {
    capturedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  locks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) document.body.style.overflow = capturedOverflow;
  };
}
