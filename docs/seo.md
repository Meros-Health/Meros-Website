# SEO: what the site declares about itself

Record of the Item 2 work from the post-cutover plan, 2026-08-28. The
metadata layer built for the cutover (per-route canonicals, titles, Open
Graph, robots and sitemap in agreement) was sound; this adds what was missing.
`tests/e2e/seo.spec.ts` locks all of it.

## Structured data

- `lib/business.ts` is the store as data: name, address, geo, phone, email,
  hours, price range, cuisine, Instagram. The footer renders its address,
  hours and contact lines from it, and the home page's `Restaurant` JSON-LD
  is built from it, so what Google surfaces and what a visitor reads cannot
  drift.
- Hours are stored as `{ opens: "08:00", closes: "22:00" }`, seven days,
  confirmed by Thomas on 2026-08-28. `hoursDisplay()` formats the footer line.
- The geo coordinates are OpenStreetMap's for 1207 Hamilton Street. The
  postal code is V6B 6K5, confirmed by Thomas against the lease on 2026-08-28;
  OSM's V6B 2X6 for the street address is wrong for the unit.
- `/order`, `/build`, `/privacy` and `/terms` carry a `BreadcrumbList` back to
  the home page. `components/seo/JsonLd.tsx` renders the blocks server-side.

## Icons and preview image

`scripts/build-icons.mjs` generates, from `logos/logo-terracotta.png` and the
hero photo, and the outputs are committed:

| File | Role |
|---|---|
| `app/favicon.ico` | 16, 32 and 48px PNG frames in one ICO, served at `/favicon.ico` |
| `app/icon.png` | 512px, the modern `<link rel="icon">` |
| `app/apple-icon.png`, `public/apple-touch-icon.png` | 180px on a cream ground; the second is the path old iOS requests without a link tag |
| `public/icons/icon-192.png`, `icon-512.png` | referenced by `app/manifest.ts` (`/manifest.webmanifest`) |
| `public/og/meros.jpg` | 1200x630 centre crop of the hero shot; `OG_IMAGE` in `lib/seo.ts` |

The root layout no longer sets `icons`; Next's file conventions emit the tags.

## Metadata gaps closed

- `/checkout` and `/cart/edit/[lineId]` now go through `pageMetadata()` with
  `noindex: true`, so they have a description and Open Graph like every other
  route while staying out of the index (robots.txt is the first lock).
- `not-found.tsx` has its own title. A 404 previously inherited the home
  page's.

## Route map enforcement

`tests/unit/routeMap.test.ts` enumerates `app/**/page.tsx` and fails when a
public static route is missing from `app/sitemap.ts`, a sitemap entry has no
page, a disallowed route is advertised, or a dynamic route is neither listed
nor disallowed.

## Still to do

- Submit `https://merosyogurt.com/sitemap.xml` in Search Console and watch
  Coverage for the five legacy URLs folding into their targets. Each takes
  two 308 hops (trailing slash strip, then the redirect rule); see
  `docs/dns-cutover.md` section 9.
- Claim or update the Google Business Profile so the knowledge panel and the
  schema agree on hours and address.
