# Performance: loading, coordination and asset delivery

Record of the Item 1 work from the post-cutover plan, done 2026-08-28. What was
wrong, what changed, how to measure it again, and what is still open.

## The finding

The day after `merosyogurt.com` went live, the home page transferred 23.2 MB
and reached Largest Contentful Paint at 7.2 s on desktop and 38.8 s on an
iPhone over throttled 4G. First paint was fast in every case; the page then
spent tens of seconds pulling images.

The cause was not tuning. Next's image optimizer is a no-op on Cloudflare
Workers: `/_next/image?url=…&w=640` returned the untouched original, byte for
byte, with no `cache-control` header. Every `next/image` on the site was
serving a full-resolution source, some of them twice at different `w` values,
and nothing was cached in the browser between visits.

## What changed

### Build-time image variants

`scripts/build-images.mjs` renders every source under `public/images-web` and
`public/logos` into WebP at each width `next/image` can request, into
`public/img/` (gitignored). It runs before `next dev` and `next build`, is
incremental, and takes about six seconds cold for the 79 sources.

- `lib/images/variants.cjs` is the contract: the width lists, the file naming,
  and `ENCODER_VERSION`. It is CommonJS because `next.config.ts` is loaded
  with `require()` and the build script is native ESM.
- `lib/images/manifest.json` (committed) records each source's dimensions and
  an 8-character content hash. `lib/imageLoader.ts`, wired in as the custom
  `next/image` loader, maps a `(src, width)` request to the rendered file. All
  23 `<Image>` call sites kept their `src` values.
- The hash is in the file name, so `public/_headers` serves `/img/*` with a
  one-year `immutable` cache. A replaced photo gets a new name. Changing the
  encoding bumps `ENCODER_VERSION`, which changes every hash.
- `tests/unit/imageManifest.test.ts` fails when a referenced image is missing
  from the manifest, when a source has changed since the manifest was written,
  or when a variant the loader can return is not on disk. The fix is always
  `npm run images`, then commit the manifest.
- WebP only. `next/image` emits one format per `<img>`, WebP is universal, and
  it keeps the alpha channel on the transparent product shots. AVIF would need
  a `<picture>` wrapper; see open items.

Encoding: photos at quality 80, quality 70 for the 1440 and 1920 widths that
only 3x phones ever request; cut-outs at 82 with alpha quality 90; logos
lossless, which for these files is smaller than any lossy setting.

### Cache headers

`public/_headers` is honoured by Workers Static Assets. `/img/*` and
`/_next/static/*` are `max-age=31536000, immutable`; the plainly named source
directories get a day. Before this every asset, including Next's hashed
chunks, shipped `max-age=0, must-revalidate`.

### One hero, CSS-driven

`HeroSection` rendered either a mobile or a desktop tree depending on a JS
media query that is `false` during server rendering. Every phone therefore
received desktop HTML, whose `<link rel="preload">` fetched the desktop hero
candidate, then hydrated, flipped to the mobile tree, and fetched the mobile
candidate. It is now one tree at every breakpoint: three panels of
`50svh` each, so the section is 150svh and the first screen holds exactly the
first two. Panel 1 is cream with the lockup and the two calls to action, panel
2 is a full-bleed photograph at `sizes="100vw"`, and panel 3, under the fold,
carries the tagline over a second one. The `.hero-*` rules in `globals.css`
hold all of it, and nothing about the layout differs between breakpoints. The
browser picks the one right variant from the HTML, and the hero no longer
reads `useIsMobile` at all.

`useIsMobile` itself moved to `useSyncExternalStore`, so it is correct on the
first client render rather than in a later effect. Its docblock says what it
cannot fix: the server HTML is still the desktop branch, so layout should be
CSS media queries and the hook reserved for behaviour.

### Critical images by element, not by URL

The Preloader gated on three hard-coded hero URLs, on every route, so `/menu`
and `/build` downloaded a 1.4 MB hero they never showed. The transition
provider held on `ROUTE_CRITICAL_ASSETS`, which listed two routes.

Both now wait on `img[data-critical-image]` elements in the document
(`lib/criticalImages.ts`), via `HTMLImageElement.decode()`. A route's
above-the-fold `priority` images carry `{...CRITICAL_IMAGE}`. The wait covers
exactly the variant the browser chose from `srcset`, is route-aware for free,
and has an 8 s ceiling so a stalled request cannot hold the site.

### Sections reveal when their images have decoded

`lib/useRevealReady.ts` combines an IntersectionObserver with a decode wait on
every `<img>` inside the section, with a 6 s ceiling counted from entering
view. The Signature Menu header, groups and stage, the Our Story composition,
the Build section's bowl row and static layout, the gallery panels and the
footer's Instagram tiles all use it in place of `whileInView`. A section can no
longer animate in around a picture that is still arriving.

### Lazy where hidden or below the fold

The Build section's static bowl, the menu stage and the ledger thumbnails are
`loading="lazy"`. Below 1024px the stage is `display: none`, and a lazy image
that never intersects is never requested; on desktop it sits in or near the
first viewport and loads at once, behind the preloaded hero.

The hero used to carry a marquee of eighteen photographs across its bottom
edge. The three-row layout has no band for it, so it and its images are gone,
which takes the largest block of first-screen work with them.

### Hero timing

Chrome records LCP when the LCP element finishes arriving, so that element's
delay plus duration is paid in full against the 2.5 s threshold, on top of
however long the preloader gate held. The hero fades were 2.25 to 3.0 s; they
are now 1.0 to 1.25 s, the top of the house range, with the delays shortened
to match. The preloader's minimum display dropped from 500 ms to 300 ms.

The four beats live in one table, `HERO_ENTRANCE` in `lib/heroEntrance.ts`:
nav bar, lockup, image band, calls to action, top of the screen down. The
navbar reads its own beat from there too, which is why a global component
imports a hero module.

Both photographs parallax as they cross the screen, `lib/useParallax.ts`. It
runs on `gsap.ticker` rather than on a scroll listener or framer's
`useScroll`, because Lenis virtualises scrolling and is itself stepped by that
ticker: a callback there runs on the same frame as the scroll it reacts to and
reads a rect that is already current. The layer overhangs its panel by exactly
the distance it travels, so no edge is ever briefly empty, and the two rates
differ (12% and 19%) because equal rates read as one background sliding behind
two windows. The rate is also coupled to the crop: the layer overhangs its
panel by exactly the distance it travels and has not spent that travel at
rest, so a pinned edge of the frame is held off screen by a fraction of the
rate, about 0.67x at the top edge and about 1.33x at the bottom. Reduced motion registers no ticker callback at all.

The image band is the LCP element and it is revealed with a clip path rather
than a fade. Chrome refuses to count an element at `opacity: 0`, so a fade
defers the LCP mark to the end of the fade; it does not track a clip path the
same way. The budget still holds if it did: 0.62 s + 1.25 s is 1.87 s.

## Measuring

```
node scripts/web-vitals.mjs https://merosyogurt.com
node scripts/web-vitals.mjs http://localhost:3011 / --top 25 --json out.json
```

Three profiles per route: desktop 1440x900 unthrottled; iPhone 14 on Chrome
DevTools "Fast 4G" (4 Mbps, 20 ms RTT, 2x CPU), roughly a phone on Vancouver
LTE; and iPhone 14 on Lighthouse's mobile profile (1.6 Mbps, 150 ms RTT, 4x
CPU), the industry lab baseline. Each run reports FCP, LCP, CLS, load,
transfer and image bytes, and the largest transfers.

## Results

Before, measured live on 2026-08-28 before this work:

| Route, profile | LCP | Transfer |
|---|---|---|
| `/` desktop | 7,176 ms | 23.2 MB |
| `/` iPhone 14, throttled 4G | 38,788 ms | 17.3 MB |
| `/` iPhone 14, unthrottled | 4,440 ms | 17.2 MB |

After, local production build (`docs/qa/web-vitals-local-2026-08-28.json`):

| Route, profile | FCP | LCP | CLS | Transfer | Images |
|---|---|---|---|---|---|
| `/` desktop | 40 ms | 2,180 ms | 0 | 1.36 MB | 1.0 MB in 32 |
| `/` iPhone, Fast 4G | 180 ms | 3,344 ms | 0 | 665 KB | 318 KB in 15 |
| `/` iPhone, Lighthouse mobile | 592 ms | 5,520 ms | 0 | 665 KB | 318 KB in 15 |
| `/menu` desktop | 28 ms | 28 ms | 0 | 490 KB | 171 KB in 9 |
| `/menu` iPhone, Fast 4G | 180 ms | 528 ms | 0 | 539 KB | 219 KB in 7 |
| `/build` desktop | 28 ms | 1,640 ms | 0.0077 | 327 KB | 6 KB in 2 |
| `/build` iPhone, Fast 4G | 168 ms | 2,300 ms | 0 | 333 KB | 12 KB in 2 |

Live, the same afternoon, after the deploy (`docs/qa/web-vitals-live-2026-08-28.json`):
desktop `/` LCP 2,476 ms at 1.37 MB; iPhone Fast 4G 3,352 ms at 676 KB; iPhone
Lighthouse mobile 5,528 ms. `/menu` and `/build` within a few hundred
milliseconds of the local figures. `cutover-verify.sh` 31 of 31, and the
variants, static chunks and icons carry the intended cache headers at the edge.

Against the plan's targets:

| Metric | Target | Result |
|---|---|---|
| LCP, desktop `/` | under 2,500 ms | 2,180 ms |
| LCP, iPhone on 4G `/` | under 4,000 ms | 3,344 ms on Fast 4G; 5,520 ms on Lighthouse mobile |
| Home page transfer | under 2 MB | 1.36 MB desktop, 665 KB phone |
| CLS, all routes | 0 | 0, with one intermittent 0.0077 on `/build` |
| Sections revealing before images decode | none | none |

The Lighthouse-mobile figure decomposes as roughly 3.3 s of network to the
preloader gate (665 KB at 1.6 Mbps, of which 250 KB is JavaScript) plus the
lockup's 1.6 s fade. Getting under 4 s on that profile means either a smaller
first-load bundle or a shorter mobile reveal; both are design decisions, not
bugs, and are listed below.

## Open items

- **First-load JavaScript is 234 KB** (framer-motion, GSAP, Lenis, Zustand).
  It is now the largest single cost on a phone. Nothing in this pass touched
  it.
- **Lighthouse-mobile LCP is 5.5 s** for the reasons above. The mobile lockup
  could lead the choreography instead of following the portrait, which Chrome
  ignores as a full-viewport background anyway; that alone would take about a
  second off.
- **`/build` shows an intermittent 0.0077 CLS** on desktop that a
  layout-shift trace did not reproduce. Probably a font swap.
- **`BuildSection` still swaps layout after hydration** (`pending` to `static`
  or `scroll` in an effect). It is below the fold, so it does not register as
  CLS, but it is the same class of problem the hero had.
- **30 MB of `public/` is unreferenced**: `Hero/Gallery-8-hero.jpg` (13.6 MB),
  `Hero/Underlay.png` (10 MB), `Hero/Overlay.png` (4.3 MB), the two uncropped
  hero masters and both videos. They ship as Worker assets and are rendered
  into variants nobody requests. Moving them out of `public/` is a separate,
  deliberate cleanup.
- **AVIF** would take another 30 to 40 percent off image bytes but needs a
  `<picture>` wrapper around `next/image`. Not worth it until the bundle is
  addressed.
- **`sharp` is a transitive dependency** of Next today. It should be declared
  in `devDependencies` so the build script does not depend on Next's
  optional-dependency choices.
