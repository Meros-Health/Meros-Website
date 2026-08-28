// Above-the-fold images a route must have decoded before its cover lifts.
//
// Spread CRITICAL_IMAGE onto a `priority` <Image>. Preloader waits on every
// marked image in the document at first load; TransitionProvider waits on
// every one the new route rendered before releasing the page cover. Waiting on
// the elements themselves rather than on a list of URLs means the wait covers
// exactly the variant the browser chose from srcset, and a route with no
// marked images (nothing above the fold worth holding for) waits on nothing.
export const CRITICAL_IMAGE_ATTR = "data-critical-image";
export const CRITICAL_IMAGE = { [CRITICAL_IMAGE_ATTR]: "" } as const;

// A stalled request must never hold the site hostage.
export const CRITICAL_IMAGE_TIMEOUT_MS = 8000;

// decode() rejects on a broken image; a missing file is not a reason to wait.
export function decodeQuietly(img: HTMLImageElement): Promise<void> {
  return img.decode().catch(() => undefined);
}

export function waitForCriticalImages(
  root: ParentNode = document,
  timeoutMs = CRITICAL_IMAGE_TIMEOUT_MS
): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>(`img[${CRITICAL_IMAGE_ATTR}]`));
  const decoded = Promise.all(images.map(decodeQuietly)).then(() => undefined);
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs));
  return Promise.race([decoded, timeout]);
}
