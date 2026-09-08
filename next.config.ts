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

// Content-Security-Policy.
//
// Enforced. It was report-only from 2026-09-04 until 2026-09-07, when it was
// watched in a real browser for the first time: every route and every
// interactive state, against the Workers runtime rather than `next start`. What
// follows is what that run measured. The first pass derived the policy by
// reading the rendered HTML of / and /checkout, and got two things wrong that
// are worth recording so nobody repeats them.
//
// Every script is self-hosted, there are no third-party script hosts, there is
// no client-side fetch anywhere in the codebase, and the Instagram tiles are
// local files. Most of the external URLs in the markup (instagram.com,
// maps.apple.com, the social links, schema.org) really are link targets and
// JSON-LD values, which CSP does not govern.
//
// One of them is not. components/ui/Footer.tsx embeds a Google Maps iframe, so
// every route that renders the footer loads a cross-origin frame. The first
// pass filed google.com alongside maps.apple.com as a link target, which is
// true of an <a href> and false of an <iframe src>, and frame-src 'none' would
// have blanked the map sitewide the moment this header was enforced. It carries
// loading="lazy" at the bottom of the page, so it stays invisible to any check
// that does not scroll to the footer as well.
//
// ── The nonce decision ───────────────────────────────────────────────────────
// script-src carries 'unsafe-inline' rather than a nonce, deliberately.
//
// Next renders 12 inline <script> blocks on the home page (the bootstrap and
// the flight data), and their content changes per page and per build, so
// hashes are not workable. A nonce is the only alternative, and in the App
// Router a nonce means middleware plus reading a header in the root layout,
// which makes every page dynamic. This site's performance rests on being
// prerendered and served as static assets from Cloudflare; trading that away
// is a large, permanent cost.
//
// What it buys is small here, because the XSS surface is unusually small:
// zero third-party scripts, zero client-side fetch, and no user-generated
// content rendered as HTML anywhere. The catering form and checkout write to
// D1 and are read back by nobody on the site.
//
// What the policy does buy, and what 'unsafe-inline' does not weaken: an
// injected <script src> pointing anywhere off-origin is blocked, as is an
// object, a frame ancestor, a rewritten <base>, and a form posting off-site.
//
// The map iframe is a third-party embed, which is the documented trigger to
// reopen the nonce question. It does not reopen it. An iframe is a separate
// browsing context and cannot reach into this document, so it adds no path from
// attacker input to rendered output here. A page that renders a catering
// inquiry back as HTML still would, and that is the thing to watch for.
//
// style-src takes 'unsafe-inline' for the 214 style attributes the pages
// render. style-src-attr would be the precise directive and would leave
// style-src clean, but Firefox only implemented it in 132, and in an older one
// it is ignored and style-src applies, which would strip every inline style on
// the site. Not worth the correctness for the breakage.
//
// There is no report-uri or report-to. Adding one means an unauthenticated
// POST endpoint that anything on the internet can write to, which is a new
// abuse surface to protect a header that is already telling us what we need in
// devtools. Read the violations in the browser console instead.
//
// ── The development carve-out ────────────────────────────────────────────────
// `next dev` compiles every module through webpack's eval devtool, so the dev
// bundle is a chain of eval() calls: 171 of them in main-app.js alone. The
// production bundle has none, and neither do GSAP, ScrollTrigger, Lenis or
// framer-motion. 'unsafe-inline' does not permit eval, only 'unsafe-eval' does,
// so shipping this policy unchanged to the dev server renders a blank page with
// every module blocked. Development gets 'unsafe-eval' and loses
// upgrade-insecure-requests, which has nothing to upgrade over plain localhost.
// Production gets neither relaxation.
const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // No blob: here. Nothing on this site calls createObjectURL and there is no
  // upload or canvas path toward one. data: stays: it is narrow, and one
  // <Image placeholder="blur"> would need it.
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  // The footer's Google Maps embed, and nothing else. See above.
  "frame-src https://www.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  // An injected <base> would silently repoint every relative URL on the page.
  "base-uri 'none'",
  // Neither form actually uses a form action: checkout and the catering inquiry
  // both preventDefault and call the server action as a function, which makes
  // them RSC POSTs governed by connect-src. This directive governs nothing the
  // site does today. It is here so that an injected <form> cannot post off-site.
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

// Security headers. The site had none: no Referrer-Policy, no nosniff, no frame
// protection, no HSTS, on a site that takes names, emails and phone numbers
// through two server actions. They live here rather than in public/_headers
// because under @opennextjs/cloudflare the HTML is rendered by the Worker and
// _headers only governs responses served straight from the assets binding.
//
// The Content-Security-Policy above rides along, enforced.
const SECURITY_HEADERS = [
  // Never let a browser second-guess a Content-Type. Closes the class of
  // attack where an uploaded or user-named file is sniffed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the full URL only to ourselves; cross-origin gets the origin alone.
  // Checkout and cart paths can carry state that has no business in a
  // third-party's referrer log.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No framing at all. Nothing here is meant to be embedded, and clickjacking
  // a checkout is the reason this header exists. The modern spelling of the
  // same rule is frame-ancestors, which the enforced policy below carries; this
  // one stays for browsers that predate it. There is deliberately no second
  // Content-Security-Policy header repeating frame-ancestors: it was here while
  // the full policy was report-only and had to be enforced by something, and
  // two CSP headers on one response intersect rather than merge, which is a
  // sharp edge to leave lying around for no gain.
  { key: "X-Frame-Options", value: "DENY" },
  // A year of HTTPS-only. No `preload` directive: that is a submission to a
  // browser-vendor list, it is slow to undo, and it should be a deliberate
  // decision rather than a side effect of adding four safe headers.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // The site asks for none of these, so nothing on it can.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: CSP },
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
