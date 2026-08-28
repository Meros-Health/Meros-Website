import type { ImageLoaderProps } from "next/image";
import manifest from "./images/manifest.json";
import { variantPath, variantWidthsFor } from "./images/variants.cjs";

type ManifestEntry = { hash: string; width: number; height: number };
const IMAGES: Record<string, ManifestEntry | undefined> = manifest.images;

// next/image loader for the build-time variants rendered by
// scripts/build-images.mjs. Next's own optimizer is a no-op on Cloudflare
// Workers; this maps each srcset candidate to a pre-rendered WebP instead.
// A source the pipeline does not know about is returned untouched, so a new
// photo shows up unoptimized rather than broken until `npm run images` runs
// (tests/unit/imageManifest.test.ts catches that before it ships).
export default function imageLoader({ src, width }: ImageLoaderProps): string {
  const entry = IMAGES[src];
  if (!entry) return src;
  const widths = variantWidthsFor(entry.width);
  const chosen = widths.find((w) => w >= width) ?? widths[widths.length - 1];
  return variantPath(src, entry.hash, chosen);
}
