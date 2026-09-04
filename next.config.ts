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
  ["/our-menu", "/menu"],
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

// The menu page lived at /order from the cutover (2026-08-28) until 2026-09-03,
// long enough to be crawled and linked. The path was renamed because "order"
// named two different things on this site: a page you cannot order from, and
// the act of ordering. Permanent, because the page is not coming back to the
// old path.
const RENAMED_PATHS: Array<[from: string, to: string]> = [["/order", "/menu"]];

// Security headers. The site had none: no Referrer-Policy, no nosniff, no frame
// protection, no HSTS, on a site that takes names, emails and phone numbers
// through two server actions. They live here rather than in public/_headers
// because under @opennextjs/cloudflare the HTML is rendered by the Worker and
// _headers only governs responses served straight from the assets binding.
//
// Content-Security-Policy is deliberately not here. A real policy has to
// account for 248 inline style objects and Next's inline bootstrap scripts,
// which means either nonce middleware or 'unsafe-inline' on scripts, and that
// tradeoff deserves its own decision rather than being smuggled in with five
// headers that carry no risk.
const SECURITY_HEADERS = [
  // Never let a browser second-guess a Content-Type. Closes the class of
  // attack where an uploaded or user-named file is sniffed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the full URL only to ourselves; cross-origin gets the origin alone.
  // Checkout and cart paths can carry state that has no business in a
  // third-party's referrer log.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No framing at all. Nothing here is meant to be embedded, and clickjacking
  // a checkout is the reason this header exists.
  { key: "X-Frame-Options", value: "DENY" },
  // The modern spelling of the same rule, which X-Frame-Options predates.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // A year of HTTPS-only. No `preload` directive: that is a submission to a
  // browser-vendor list, it is slow to undo, and it should be a deliberate
  // decision rather than a side effect of adding four safe headers.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // The site asks for none of these, so nothing on it can.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

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
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
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
      ...RENAMED_PATHS.map(([source, destination]) => ({
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
