# Cutover checklist

Written overnight 2026-08-27, revised 22:45 the same day when the decision was
made to cut over that night rather than in the morning. Everything below is
verified against the deployed Worker and live DNS, not inferred.

> **Superseded 2026-08-31.** The cutover ran and succeeded: the zone is active,
> the apex serves the Worker, and mail still reaches Microsoft 365. Items 1 and
> 2 below are closed by that. See [mail-estate.md](mail-estate.md).

**No DNS has been touched.** GoDaddy, the Cloudflare zone, nameservers and the
custom domain are all exactly as they were.

**Hard deadline: the store opens at 08:00.** Go / no-go at 02:00. If the apex is
not clean by 04:00, roll back and sleep on it.

---

## Where things stand

`main` is at `5f24438`. It is the only branch that exists, locally and on
GitHub. Four deploys ran, all green, and the last one is live at
`meros-website.merosyogurt.workers.dev`.

| Gate | Result |
|---|---|
| `validate:menu` | ok: 61 ingredients, 5 build steps, 10 signatures |
| `eslint` | clean |
| `tsc --noEmit` | clean |
| `vitest` | 147 passed |
| `playwright` | 85 passed, 2 skipped, across 5 device projects |
| `opennextjs-cloudflare build` | completes |
| Workers Builds on `main` | success |

Live probe: `/`, `/build`, `/order`, `/checkout`, `/privacy`, `/terms`,
`/robots.txt`, `/sitemap.xml` all 200, and all five legacy URLs 308 to the right
place. Unknown paths 404 to the site's own page. Cart drawer reads
"Checkout · Coming Soon", so **ordering is closed**. The signature Edit button
is live in the drawer.

**Ordering stays closed for the cutover. Decided.** The agency site has no
online ordering either, so shipping with checkout gated regresses nothing. The
flag is inlined at build time, so opening it later is a rebuild, not a toggle.

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
   account, so this is a hard prerequisite, not a preference. **The entire
   cutover is dashboard work. Wrangler cannot help with any of it.**
2. **No mailbox to test with, and the `info@` password is still being
   requested.** Runbook step 11 wanted a send-and-receive test. Substituted:
   step 8a's preflight diff is the real guard, since a mistyped record is the
   actual failure mode and the diff catches it while GoDaddy is still
   authoritative. Back it with `dig MX` and a non-bouncing send to
   `info@merosyogurt.com` from an outside address. Run the real test the moment
   the password lands.
3. **`hello@meros.ca` was pointed at a dead address.** The privacy policy and
   terms had six contact links to it: PIPEDA and PIPA access, correction,
   deletion and consent-withdrawal requests, plus the Terms refund contact.
   That domain is not in the GoDaddy account and no such mailbox exists. All
   six now go to `info@merosyogurt.com`. **Confirm that is the mailbox someone
   actually reads.**
4. **The footer contact form is gone; it is a mailto now.** Rather than a form
   that validated and discarded, the footer offers `info@merosyogurt.com` (with
   a "Website inquiry" subject prefilled) and the phone number. Nothing is
   collected by the site, so nothing can be lost. This makes step 2's mailbox
   cutover the thing that matters: if that address does not deliver, the
   footer's only contact path does not either.
5. **`house-compote` was removed from `menu.json` and `evoo` renamed to
   "EV Olive Oil".** Menu removals are global. `validate:menu` clears the repo,
   but the Menu TV static board and any printed or CSV surfaces live outside it
   and need the same edit.
6. ~~**The Instagram section is fabricated.**~~ **Decided: ship it static.**
   I overstated this. The nine posts are Meros's own editorial photography,
   linking to `instagram.com/merosyogurt`, and that account exists and returns
   200. It is a static section, not fabricated content. Wiring a real feed via
   Behold.so is delegable work for later; `lib/instagramFeed.ts` is already
   shaped so only the data source changes.
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

**Before any DNS**

- [x] **0a.** ~~Check whether the registrar lock blocks the nameserver edit.~~
      **Resolved, nothing to do.** All four `client*Prohibited` EPP codes are
      set at the registry, which is standard for a GoDaddy domain carrying
      Domains By Proxy privacy. They are registry status codes, not account
      settings, so there is no toggle and none is needed: they reject changes
      arriving from outside GoDaddy, and GoDaddy lifts them internally for its
      own dashboard. Only `clientTransferProhibited` would ever matter, and
      only for moving the registration to another registrar. That is not
      happening; the registration stays at GoDaddy and only DNS hosting moves.

**Stage the zone. Zero user impact, fully reversible.**

- [x] **5.** Add merosyogurt.com as a Free zone in the **merosyogurt**
      Cloudflare account. **Done 23:21.**
- [x] **6.** Diff the scan against the 15-record table. **Done. The scan found
      everything**, including the two SRV records and `litesrv._domainkey` that
      were invisible to external enumeration during the August 26 survey.
      Nothing had to be added by hand. `_domainconnect` deleted rather than
      migrated, leaving 15 records.
- [x] **7.** Grey-cloud everything. **Done, and this one nearly went wrong.**
      Cloudflare's add-site flow has a "connect automatically" option checked by
      default in advanced settings, which proxied all nine proxiable records on
      import: the apex A, `www`, and every Microsoft and mail CNAME including
      `litesrv._domainkey`. Proxying a DKIM CNAME makes it answer with
      Cloudflare's IPs instead of resolving to the signing target, so every
      MailerLite send would have failed its signature check and been
      quarantined by our own `p=quarantine` DMARC policy. Silent, and it
      presents as a deliverability problem rather than a DNS one. All nine
      turned off before activation. **If this zone is ever rebuilt, uncheck
      that option.**
- [x] **8.** Assigned nameservers: `eric.ns.cloudflare.com` and
      `marissa.ns.cloudflare.com`.
- [x] **8a. Gate. Passed**, against both `eric` and `marissa` independently.
      All 13 record sets identical, and the six that carry mail were dumped and
      compared byte for byte: MX, SPF, the M365 tenant TXT, the MailerLite
      verification TXT, DMARC, and the DKIM CNAME.

**Delegation. Still nothing user-visible, because the zone is a mirror.**

- [x] **9.** GoDaddy → DNS → Nameservers → the Cloudflare pair. **Done 23:41.**
      No lock had to be cleared, per step 0a.
- [x] **10.** Registry delegation confirmed straight from a `.com` TLD server,
      bypassing resolver caches: `eric` and `marissa`. Resolver propagation
      tracked by a background monitor rather than by hand.

      Worth writing down: single-shot `dig` against a public resolver **flaps**
      between the old and new delegation for hours, and it is not a regression.
      These are anycast clusters whose cache nodes refresh independently, so
      each query lands on whichever node is nearest at that moment. Sample
      20 times and read the proportion; do not read one answer.
- [x] **11. Checkpoint. Passed 23:47.** REX still serving 200, `www` still
      301ing to the apex, apex still on `72.167.53.201`. Every mail record
      re-verified **through a resolver that had already moved to Cloudflare**,
      so this was Cloudflare actually answering in the live resolution path
      rather than a prediction: MX, SPF, DMARC, DKIM and `autodiscover` all
      identical.

      The `info@merosyogurt.com` mailbox came online during the cutover, and a
      Gmail round trip in both directions was confirmed before the nameserver
      change as a baseline. That also settles the open question about the six
      PIPEDA and BC PIPA contact links in the privacy policy and terms: the
      address is real and someone can read it.

**The switch. This is the first user-visible change.**

- [x] **12.** Apex bound to the Worker at 23:52. **Three things the runbook did
      not warn about, all now folded into `docs/dns-cutover.md`:**

      **Cloudflare does not replace the old records for you.** It refuses with
      "Hostname already has externally managed DNS records. Delete them first."
      So the apex A record had to be deleted by hand immediately before adding
      the custom domain. That gap is not free: **this zone's SOA negative TTL
      is 1800 seconds**, so any resolver querying while the record is absent
      caches the empty answer for up to 30 minutes and keeps serving a dead
      domain long after the binding succeeds. Two tabs, one motion, about three
      seconds of exposure.

      **Binding the apex breaks www a few seconds later.** `www` was a CNAME to
      the apex, so it followed the apex to Cloudflare's anycast IPs, but while
      grey-clouded Cloudflare is told not to handle that hostname and returned
      **522**. Silent, and visible only to the resolvers that had already
      migrated. Plan www in the same motion as the apex, not as a follow-up.

      **The Add Domain dialog has a trap.** Typing the full
      `www.merosyogurt.com` into the domain box searches for a matching *zone*,
      finds none, and offers to onboard it as a **separate Cloudflare zone**,
      which would need its own delegation that will never exist. Select the
      existing `merosyogurt.com` zone first; the resulting "Connect to
      merosyogurt.com" dialog has a **Subdomain** field, and that is where
      `www` goes. Zone picker takes the apex, subdomain box takes the label.
- [x] **13.** Certificate issued 05:52 UTC by Google Trust Services,
      `CN=merosyogurt.com`, valid to Nov 26.
- [x] **14.** Redirect Rule `www` → apex, 301. **Done a better way than
      planned**, which also removed the need to bind www to the Worker at all:
      create the rule first while www has no DNS record and the rule is inert,
      then let Cloudflare add `A www → 192.0.2.1` **proxied**. That address is
      RFC 5737 documentation space and never routable; it exists only so www
      resolves to Cloudflare's edge, where the rule fires ahead of any origin
      lookup. Also better for search than a www custom domain, which would have
      served a full second copy of the site until the redirect existed.

      Two edits to Cloudflare's "Redirect from WWW to root" template were
      needed: the request URL, tightened from `https://www.*` to
      `https://www.merosyogurt.com/*` with target
      `https://merosyogurt.com/${1}`, and **Preserve query string, which the
      template ships with off**. Without it every query string is stripped,
      silently breaking MailerLite campaign attribution and any `utm_`
      parameter landing on www.

      Verified: `/` → apex, `/order` → `/order`, `?utm_source=test` preserved.
      That one www record is the **only** orange cloud in the zone.
- [ ] **16.** SSL/TLS Full (strict), Always Use HTTPS. **Hold HSTS.**

**Verify**

- [ ] **18.** Apex over https, `/order`, `/build`, `/privacy`, `/terms`, all
      five legacy redirects, cart persistence, no mixed content.
- [ ] **19.** Confirm MailerLite still reports the domain verified.
- [ ] **20.** Search Console: add the property, submit
      `https://merosyogurt.com/sitemap.xml`.

**Deliberately held**

- [ ] **21. Wait 48 hours minimum**, then tell REX so they can decommission.
      This is the highest-severity remaining risk. The `.com` delegation is
      cached for 172800 seconds, so until it has fully propagated some
      resolvers still send visitors to REX's box. Tearing it down early turns a
      harmless split-brain into a real outage for that share. Nothing to cancel
      on our side.
- [ ] **17.** Disable the `workers.dev` production route. Hold a few days: it is
      both the rollback escape hatch and the pre-domain deploy check.
- [ ] **22.** Delete the duplicate Worker in the personal Cloudflare account.
- [ ] **23.** Optional: add merosyogurt.ca and 301 it to the .com.

## Why the delegation TTL shapes the night

The `.com` registry serves this delegation with a **48 hour TTL**, so resolvers
move to Cloudflare gradually, not at once. Step 9 is therefore free: the
Cloudflare zone is a byte-identical mirror, so both nameserver sets answer the
same. Step 12 is where split-brain begins, since Cloudflare's apex points at the
Worker while GoDaddy's still points at REX. For up to 48 hours some visitors get
the new site and some get the old one. No outage, no broken state, and mail is
untouched because the MX records are identical in both zones. With ordering
closed, nothing transactional rides on which one a visitor lands on.

Rollback before step 12 is a nameserver revert. After step 12 it is deleting
the custom domain and re-adding `A @ → 72.167.53.201`, which is one 600s TTL.
That is the whole reason the zone gets mirrored before the nameservers move.
