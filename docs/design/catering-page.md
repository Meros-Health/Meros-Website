# /catering

Built 2026-08-31 on branch `catering-page`.

## Why this page is catering only

An earlier draft of this page was `/partners` and offered two tracks: catering
and wholesale. Kim removed wholesale:

> We are not able to "wholesale" for future consumption, our model has to be
> for immediate consumption. We can provide large wholesale volume of yogurt
> for events, meetings etc. Hence the disposable containers, it's for immediate
> consumption. It's to prevent us from directly competing with a BC dairy
> licensee who manufactures and distributes yogurt.

The constraint is not on volume, it is on what happens to the yogurt after we
hand it over. Volume for an occasion is in scope. Supplying a kitchen with
stock it holds and draws down is not, because that is manufacture-and-
distribute, which the BC dairy licensee we buy from is licensed for and we are
not.

So the page says "catering" and the copy says the yogurt is made for the day it
is served.

**The serving format is deliberately unnamed.** Kim's own reasoning mentions
disposable containers, but he does not know what an order actually goes out in:
the store owns glass jars and glassware, and a given event might be tubs, paper
bowls, or glass. It will likely differ per order. So the page says "delivered,
ready to serve" and settles the format in the quote. A test bans the format
words (disposable, tub, jar, glassware, tray, container), because this page is
what a printed QR code points at and a guess here is a promise nobody made.
"Bowls" is exempt: an individual bowl is a menu item, not serve-ware.

**The scope is carried by framing, not by a warning.** A first draft of the
serve-ware note ended "we cater events, we do not supply yogurt to store."
That reads as a warning to a buyer who has not asked for anything wrong yet,
and a negation is the one shape the house copy rules ban outright. It came out.
Every piece of copy on the page is anchored to an occasion instead: a
headcount, a date, a room, a tray. A reader looking for stock to hold does not
find an offer here, without ever being told off. A test bans the negation
shapes so the next edit does not put one back.
`tests/unit/catering.test.ts` fails the build if the words wholesale, resell,
resale or distribute reappear in the copy, if the disposable-container fact
disappears, or if a `/wholesale` route comes back. That test is the durable
version of this paragraph: the reason is a licensing boundary, not a style
preference, so it is enforced rather than remembered.

## What this page is for

A business card carries a QR code. Someone scans it, lands here, and has to
understand what MERŌS sells to a business before they decide whether to reply.
There are no active catering accounts yet, so the page's job is to be legible
to any business we approach: an office booking lunch, a studio feeding a class,
a launch with a headcount.

**The audience list names no industries we cannot serve.** It ends with an open
entry ("anything else with a headcount and a date") so a reader who is not on
the list still recognises themselves.

## Routing

| URL | Resolves to |
| --- | --- |
| `/catering` | the page |
| `/cater` | `/catering` (temporary redirect) |
| `/wholesale` | **404, deliberately** |

`/cater` is a temporary redirect, not permanent: if the page ever moves, a 308
already cached in a browser would keep sending scanners to the old path, and a
printed card cannot be recalled.

`/wholesale` is absent rather than redirected. A URL that resolves is a claim,
and pointing it at the catering page would tell a buyer we do the thing we just
said we do not. An e2e test asserts the 404.

## Page shape

Hero, then two bands, then the process, then the form.

1. **Hero** (cream). One call to action, "Start a catering order", pointing at
   the form. No secondary link: everything the page has to say is below it in
   reading order, so a second control that only scrolls one screen down would
   compete with the thing that starts an order.
2. **What we serve** (cream, `#what-we-serve`). The four formats: bowls, the
   yogurt bar, smoothies in bulk, staffed service. Numbered, because they are
   options to choose between and a number is the fastest way to refer to one on
   a phone call. Carries the audience list.
3. **The yogurts** (midnight, `#yogurts`). The four bases as a choice within an
   order, not a product line. Three notes underneath: toppings, volume, and
   what delivery looks like.
4. **How it works.** Four steps: tell us, we quote, confirm, delivered and
   invoiced.
5. **Start an order** (midnight, `#inquire`). The form, with the email address
   and phone number beside it.

The cream/midnight flip is the page's only section rhythm. With one track it no
longer signals *which* track you landed on; it just marks where one subject
ends and the next begins.

## No account button, and the paperwork promise

The catering account area does not exist. A "Sign in" button that goes nowhere
is worse than no button on a page people reach by scanning a card, so the page
states plainly that accounts are coming and gives the three routes that work
today: the form, the email address, and the phone number.

That note is also where the paperwork promise sits, because a business buyer's
second question after price is whether their finance team will accept the
invoice. The page promises only what we control: the invoice is **itemised**,
it is **made out to the business** rather than to whoever placed the order
(AP departments reject the latter), and it **stays retrievable** later.

**It gives no tax or accounting advice, and a test enforces that.** What a
business can deduct, reclaim or expense depends on its own tax position. Saying
"write it off" or "claim it back" is advice we are not qualified to give, and
it is the class of claim that costs trust precisely with the buyers this page
is for. `tests/unit/catering.test.ts` bans the vocabulary (write off, tax
deductible, deduct, claim back, rebate, reimburse, tax credit, save money,
expense it).

**Open:** whether Meros is GST/HST registered, and therefore whether the
invoice shows tax broken out as a separate line. If it does, that is worth
naming explicitly, because a registered buyer needs the supplier's GST number
on the invoice to claim the input tax credit and will ask for it. Confirm
before adding the claim.

## No symbols in the display face

Montage Serif has no percent glyph. "High Protein 0% Fat" rendered as
"0     FAT" in the heading, so that entry is "Non-Fat High Protein" and a unit
test rejects `% & @ # * + = < >` in any heading on this page. Body copy is
DM Sans and unaffected, which is why the same name still renders correctly on
`/build` and in the cart.

## Claim discipline

The page is read by buyers. Nothing on it promises a price, a lead time, a
minimum order, or a serving format, because none of those are decided. Anything
unresolved is "confirmed in the quote". `tests/unit/catering.test.ts` fails the
build if a price or a lead time appears in the copy, and if the four yogurts
stop matching ids in `lib/menu/menu.json`.

Nutrition figures are deliberately absent. Every base in `menu.json` is marked
`nutritionStatus: "provisional"`, and a caterer who plans a menu around a
provisional protein number has been misled.

## The inquiry form

Writes one row to D1 (`migrations/0002_catering_inquiries.sql`) through
`app/actions/catering.ts`. There is no email delivery on this site yet, so:

- If the D1 binding is absent or the write fails, the form does **not** confirm.
  It returns the email address and the phone number instead. A lead nobody can
  read must never look like a lead that was received.
- A honeypot field absorbs the obvious bots. There is no rate limit and no
  Turnstile; see "Open items".
- Every field is free text. Headcount and date are not parsed: an event gets
  described in a sentence more often than it fits a picker.

Read the inbox with:

```bash
wrangler d1 execute meros-orders --remote \
  --command "SELECT created_at, business, contact_name, email, phone, headcount FROM catering_inquiries ORDER BY created_at DESC LIMIT 50"
```

## Where things live

| Path | What |
| --- | --- |
| `lib/catering/content.ts` | every string on the page, plus the service schema |
| `app/catering/page.tsx` | composition only, no copy |
| `components/catering/` | hero, the shared section, how it works, the form |
| `app/actions/catering.ts` | the inquiry action |
| `lib/catering/inquiryStore.ts`, `runtime.ts` | the D1 write, server only |
| `components/ui/ScrollReveal.tsx` | the shared below-the-fold reveal item |

Correcting copy means editing `content.ts` and nothing else.

## Nav

`NAV_LINKS` in `components/ui/Navbar.tsx` gains one **Catering** entry. The bar
is three controls (menu toggle, wordmark, cart), so that list is the only way
into a route and has to stay complete. A unit test asserts the entry exists and
that neither the nav nor `next.config.ts` mentions wholesale.

## Before this merges

1. This branch stacks on `online-ordering`, which carries the D1 binding and
   `migrations/0001`. That merges first.
2. `wrangler d1 migrations apply meros-orders --remote` for `0002`, in the
   merosyogurt account. Until it runs, every inquiry fails closed with the
   phone number, which is safe but useless.
3. The `database_id` placeholder in `wrangler.jsonc` still needs the real id
   (tracked by the online-ordering work).

## Open items

- **Pricing.** No numbers anywhere. If a starting per-head price is ever set,
  it belongs on this page: B2B buyers screen on it.
- **Lead time and minimums.** Same. Currently "confirmed in the quote".
- **Email delivery.** Done, on Resend. A stored inquiry is emailed to
  `info@merosyogurt.com` from `catering@mail.merosyogurt.com`, with `Reply-To`
  set to the business that asked, so the notification carries the whole lead
  and the inbox becomes the working copy. Cloudflare Email Sending was the
  natural fit for this stack and is gated behind Workers Paid; the provider is
  behind one interface in `lib/catering/notify.ts` so swapping back later is
  that file and nothing else. The apex stays on Microsoft 365: sending from a
  subdomain the tenant does not know about is what keeps Exchange's anti-spoof
  heuristics off our own notification.
- **Bot protection.** Honeypot, plus a throttle on the notification: above
  twenty inquiries in an hour the row is still stored but stops earning an
  email, so a bot that gets past the honeypot cannot drain the inbox or the
  daily send quota. Turnstile is still the next step if the form attracts real
  spam, since neither of those stops the write.
- **Photography.** The page uses existing bowl and gallery shots. A picture of
  a real catering drop or a staffed bar would carry it better than a retail
  bowl does.
- **QR codes.** Not generated. `merosyogurt.com` still has a DNS cutover
  pending (`docs/dns-cutover.md`), and a printed QR that resolves to the old
  site cannot be recalled.
