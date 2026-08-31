import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { DEVICE_SIZES, IMAGE_SIZES } from "./lib/images/variants.cjs";

// The agency site that held merosyogurt.com until now had six indexed URLs,
// taken from its sitemap before it was archived. Every one of them has an
// equivalent here, so they redirect permanently rather than 404 and drop the
// ranking the domain already has. These live in the app rather than in
// Cloudflare Redirect Rules so they are reviewable, version controlled, and
// deploy with the code. They are inert until the domain points at this Worker.
const LEGACY_PATHS: Array<[from: string, to: string]> = [
  ["/about-us", "/#about"],
  ["/build-a-bowl", "/build"],
  ["/our-menu", "/order"],
  ["/privacy-policy", "/privacy"],
  ["/contact", "/#footer"],
];

// The short URL on the catering business card. /catering is the real page, so
// this is the only alias it needs. Temporary, not permanent: if the page ever
// moves, a 308 already cached in a browser would keep sending scanners to the
// old path, and a printed card cannot be recalled.
//
// There is deliberately no /wholesale. We cater for immediate consumption and
// do not supply yogurt as stock, so a URL that resolves would be a claim we
// cannot honour (see lib/catering/content.ts).
const CATERING_ALIASES: Array<[from: string, to: string]> = [["/cater", "/catering"]];

const nextConfig: NextConfig = {
  // The built-in optimizer does nothing on Cloudflare Workers (it returned the
  // untouched originals, 1.6 MB PNGs at 64px). Variants are rendered ahead of
  // time by scripts/build-images.mjs and resolved by lib/imageLoader.ts; the
  // width lists come from the same module the script renders from.
  images: {
    loader: "custom",
    loaderFile: "./lib/imageLoader.ts",
    deviceSizes: DEVICE_SIZES,
    imageSizes: IMAGE_SIZES,
  },
  async redirects() {
    // WordPress served these with a trailing slash. Next normalises the
    // trailing slash before matching, so one entry covers both forms.
    return [
      ...LEGACY_PATHS.map(([source, destination]) => ({
        source,
        destination,
        permanent: true,
      })),
      ...CATERING_ALIASES.map(([source, destination]) => ({
        source,
        destination,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;

// Enables Cloudflare bindings (env, caches) during `next dev`.
initOpenNextCloudflareForDev();
