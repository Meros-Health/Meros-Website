# Morning checklist — 2026-08-27

Written overnight. Everything below is verified against the deployed Worker,
not inferred.

**No DNS was touched.** GoDaddy, the Cloudflare zone, nameservers and the
custom domain are all exactly as they were. That is this morning's work.

---

## Where things stand

`main` is at `98584f9`. It is the only branch that exists, locally and on
GitHub. Four deploys ran, all green, and the last one is live at
`meros-website.merosyogurt.workers.dev`.

| Gate | Result |
|---|---|
| `validate:menu` | ok — 61 ingredients, 5 build steps, 10 signatures |
| `eslint` | clean |
| `tsc --noEmit` | clean |
| `vitest` | 147 passed |
| `playwright` | 85 passed, 2 skipped, across 5 device projects |
| `opennextjs-cloudflare build` | completes |
| Workers Builds on `main` | success |

Live probe: `/`, `/build`, `/order`, `/checkout`, `/privacy`, `/terms`,
`/robots.txt`, `/sitemap.xml` all 200. Unknown paths 404 to the site's own
page. Cart drawer reads "Checkout · Coming Soon", so **ordering is closed**.
The signature Edit button is live in the drawer.

## What went in

Everything that was scattered across three branches and an uncommitted working
tree is now on `main`.

- **Your type-scale work**, committed first before anything else ran.
  Ingredient tile and menu card sizes now come from CSS custom properties; the
  menu grid is one column at every breakpoint.
- **Our Story card fan.**
- **Ordering remediation** (PR #2): Toast gate, cart rehydration, cross-tab
  convergence, drift notice, test harness.
- **Signature edit modal.** I verified the server side rather than trusting the
  commit message: `priceLine` re-prices additions from the menu itself, caps
  them, and rejects unknown ids and base removal via `sanitizeSignatureMods`;
  `readCartItem` re-validates persisted mods on every rehydrate. A tampered
  payload does not survive either path.
- **Deploy pipeline fix.** This was the blocker. Detail below.
- **Cross-device test coverage**: desktop Safari, iPad, iPhone, Pixel.
- **SEO**: robots.txt, sitemap.xml, Open Graph and Twitter cards, and 308
  redirects for the agency site's five moved URLs.
- **Per-route canonicals.** The first pass set `alternates.canonical` once in
  the root layout. Metadata inherits down the tree, so every route claimed the
  home page as its canonical, which folds /order, /build, /privacy and /terms
  out of the index. Each route now declares its own through `pageMetadata()` in
  `lib/seo.ts`, with real titles. `tests/e2e/seo.spec.ts` locks it.
- **The nav bar is a flat cream panel at every breakpoint.** The scroll-driven
  runway fade is gone, along with the hero-height observer and scroll
  subscriptions that only existed to drive it.
- **The hero image is cropped 12.5% off the bottom** (2880x1919 → 2880x1680).
  The frame is taller than it is wide, so `object-cover` scaled by height and a
  quarter of it was empty countertop. Removing the dead space lets it scale up
  14% and the bowls fill the frame. A crop, not a resample; the uncropped
  master stays beside it.

### Why the build was failing

`@opennextjs/cloudflare` imports `esbuild` in `dist/cli/build/bundle-server.js`
and fifteen other places, but declares it in neither `dependencies` nor
`peerDependencies`. It relied on npm hoisting `@opennextjs/aws`'s pinned
`esbuild@0.25.4` into the root of `node_modules`. Adding vitest brought vite 8,
which took that slot with `0.28.2`, and the undeclared import picked it up.
0.28 dropped the implicit `.map` handling the bundle step needs. 29 errors.

Fixed by declaring `esbuild@0.25.4` as an exact devDependency, which makes the
root slot deterministic. Vite keeps its own nested `0.28.2`.

Worth knowing: upgrading `@opennextjs/cloudflare` to 1.20.4 would **not** have
fixed this. It depends on `@opennextjs/aws@4.1.2`, which still pins
`esbuild@0.25.4`, so the collision is identical.

---

## Decide before the domain flips

Ordered by how much they cost if missed.

1. **Cloudflare account access.** The zone has to be created in the merosyogurt
   account (`dc18109d…`), the one that owns the Worker. Your CLI is
   authenticated as `thomas.2l@icloud.com` and only sees your personal account
   (`4372c46b…`). A Worker custom domain can only bind a zone in its own
   account, so this is a hard prerequisite, not a preference.
2. **A mailbox to test with.** Runbook step 11 is a checkpoint: mail must send
   and receive before you proceed. You have no `@merosyogurt.com` mailbox.
   Either get Kim on call for ten minutes or get into GoDaddy's Email & Office
   dashboard first.
3. **`hello@meros.ca` was pointed at a dead address.** The privacy policy and
   terms had six contact links to it: PIPEDA and PIPA access, correction,
   deletion and consent-withdrawal requests, plus the Terms refund contact.
   That domain is not in the GoDaddy account and no such mailbox exists. All
   six now go to `info@merosyogurt.com`. **Confirm that is the mailbox someone
   actually reads.**
4. **The contact form still delivers nothing.** It validates, logs, and
   returns. It no longer claims "Message Sent" or promises a reply; it says the
   inbox is not wired and gives the address that works. Wiring Cloudflare Email
   Sending is the first job after the cutover, since it needs the domain in
   Cloudflare anyway.
5. **`house-compote` was removed from `menu.json` and `evoo` renamed to
   "EV Olive Oil".** Menu removals are global. `validate:menu` clears the repo,
   but the Menu TV static board and any printed or CSV surfaces live outside it
   and need the same edit.
6. **The Instagram section is fabricated.** `lib/instagramFeed.ts` ships nine
   hand-written posts, each linking to `instagram.com/merosyogurt`. On a public
   brand domain that reads as a live feed. Decide: wire a real feed, relabel
   the section, or confirm the account exists.
7. **The Open Graph image is a stand-in.** It is the hero shot at 3:2, so
   platforms crop the top and bottom. A purpose-made 1200x630 would be better.
   Every share of the link uses it.
8. **Size toggle tap targets are 32px.** Under the 44px floor Apple's HIG and
   WCAG 2.2 both use. I fixed Add to Cart, which was 42-43px and only needed a
   min-height. Raising Medium/Large by 12px would visibly change the cards you
   had just retuned, so I left it as your call.
9. **Microsoft 365 DKIM is not enabled** on merosyogurt.com. Pre-existing, and
   awkward to fix on a GoDaddy-managed tenant. Not a cutover blocker.
10. **`docs/qa/` is still untracked.** You had decided the remediation findings
    live in the PR body, not the repo. I did not reverse that.

## Not problems, so you can stop wondering

- **Dependabot shows 6 alerts on `main`.** All six are `scope=development`
  (`js-yaml`, `undici`, `brace-expansion`). `npm audit --omit=dev` returns
  zero. Nothing vulnerable ships to the Worker.
- **`next lint` prints a deprecation notice.** Cosmetic, Next 16 removes it.
- **The mobile menu keeps `visibility: visible` if you close it before the open
  animation finishes.** I chased this down: the panel is fully clipped,
  `aria-hidden`, out of the tab order, and hit testing passes through it to the
  page beneath. Nothing a user or a screen reader can observe. Framer's
  `transitionEnd` just does not fire on an interrupted close.

## Deliberately not done

- **No dependency upgrades.** `@opennextjs/cloudflare` 1.20.4, `next` 15.5.24,
  `wrangler` 4.125 are all available and none of them fix anything that is
  broken. Bumping Next the night before a cutover is risk without benefit. Do
  it in the quiet week after.
- **Fonts untouched.** `lib/fonts.ts` documents DM Sans as a deliberate choice
  over Satoshi. The rescued `Satoshi-Light.otf` and `Satoshi-Regular.otf` are
  sitting in the REX archive if you ever want them.
- **The duplicate `meros-website` Worker in your personal Cloudflare account.**
  Delete it after the cutover, not before.

---

## The cutover

Picks up at step 5 of `docs/dns-cutover.md`. Steps 1 through 4 are done: the
zone is exported, ownership is resolved, the REX site is archived (10 MB at
`~/Documents/Meros/rex-site-archive-2026-08-26/`), and the fonts are salvaged.

**One change from the runbook: step 15 is done.** The five moved URLs
(`/about-us`, `/build-a-bowl`, `/our-menu`, `/privacy-policy`, `/contact`)
redirect in `next.config.ts` and are covered by `tests/e2e/redirects.spec.ts`.
They are 308s, which Google treats the same as 301s. No Cloudflare Redirect
Rules needed for them. You still want one for `www`.

- [ ] **5.** Add merosyogurt.com as a Free zone in the **merosyogurt**
      Cloudflare account.
- [ ] **6.** Diff the scan against the 15-record table in `docs/dns-cutover.md`.
      Add the two SRV records and `litesrv._domainkey` by hand if the scan
      misses them, as it did last time. Skip `_domainconnect`.
- [ ] **7.** Grey-cloud everything. Mail and Microsoft records must be DNS-only.
- [ ] **8.** Note the two assigned Cloudflare nameservers.
- [ ] **9.** GoDaddy → DNS → Nameservers → the Cloudflare pair.
- [ ] **10.** Wait for `dig NS merosyogurt.com` to return Cloudflare.
- [ ] **11. Checkpoint.** REX site still loads, mail sends and receives. **Do
      not continue until both are verified.**
- [ ] **12.** Workers & Pages → meros-website → Domains → add `merosyogurt.com`
      and `www.merosyogurt.com`.
- [ ] **13.** Wait for the certificate.
- [ ] **14.** Redirect Rule: `www` → apex, 301.
- [ ] **16.** SSL/TLS Full (strict), Always Use HTTPS. Hold HSTS.
- [ ] **17.** Disable the `workers.dev` production route. Leave preview on.
- [ ] **18.** Verify the apex over https, `/build`, `/order`, cart persistence,
      and the five legacy redirects on the real domain.
- [ ] **19.** Test mail. Confirm MailerLite still reports the domain verified.
- [ ] **20.** Search Console: add the property, submit
      `https://merosyogurt.com/sitemap.xml`.
- [ ] **21.** Tell REX so they can decommission. Nothing to cancel on our side.
- [ ] **22.** Delete the duplicate Worker in the personal Cloudflare account.
- [ ] **23.** Optional: add merosyogurt.ca and 301 it to the .com.

Rollback before step 12 is a nameserver revert. After step 12 it is deleting
the custom domain and re-adding `A @ → 72.167.53.201`, which is one 600s TTL.
That is the whole reason the zone gets mirrored before the nameservers move.
