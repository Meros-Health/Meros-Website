# Stacks: home page section

Built 2026-08-29. Canvas: the design lives as artboards on a Claude Design canvas
(desktop, mobile, placement, the deep-link builder state).

## 1. What it is

The enhancers step in `lib/menu/menu.json` has carried the whole offer for months:

```json
"pricing": { "mode": "included-then-extra", "included": 0, "extraPrice": 3,
             "bundle": { "count": 3, "price": 7, "label": "Stack three enhancers for $7" } }
```

Sixteen functional add-ons, priced correctly by `calcBowlPrice` and by
`calcSignaturePrice` (which groups additions by step before pricing, so three
enhancers on a signature bowl hit the same bundle), and gated by
`scripts/validate-menu.mjs`. Nothing on the site mentioned it.

The section sells the nutrition, not the discount. No price appears anywhere in
it. The bundle is still what the rings are counting, and the customer meets the
price in the builder, where prices belong.

## 2. What is on screen

Four things and nothing else: eyebrow, tagline, rings, four enhancers.

- Eyebrow: `ENHANCERS`
- Tagline: `FOOD THAT MOVES WITH YOU`, two lines by preference, "YOU" in grapefruit
- One line of body: `Stack with 3 enhancers. Get more for less.`
- Four enhancers, each a photograph, a name and one number

`3` in the body line is `STACK_SIZE`, read from the step's `bundle.count`. It is
not typed.

### The four

| Enhancer | Stat shown | Photo subject |
|---|---|---|
| Whey Protein Isolate | 24 g protein | Customers training |
| Creatine Monohydrate | 0 cal | Customers, in store |
| Matcha | 6 cal | Meros plants |
| Collagen Peptides | 9 g protein | Customers |

Every number is `Math.round(ingredient.nutrition[key])` off the record, never
typed. There are no effect words anywhere in the section: "24 g protein" is a
fact off the label, "supports recovery" is a regulated claim we cannot
substantiate. That is why this shipped without a health-claim review.

The tagline and the body line each prefer to stay whole: the tagline is authored
as two lines and the body line has no width cap, so each wraps further only when
the column genuinely leaves no room.

Photography is pending. Until a `photo.src` exists, the slot renders as an
empty 4:3 frame with its subject named, which is also what appears if a photo
is ever removed. Three subjects cover four cards, so Collagen currently reuses
Customers.

## 3. The rings

Three rings, one per pick in the enhancers bundle, closing as the section
passes through the viewport. No numerals and no labels: the rings carry the
motion, the cards carry the words.

The ring is the right-hand half of the composition, running 72% of the
section's height and bleeding off the right edge. The section carries a taller
vertical padding than the site standard (`clamp(4.5rem, 12vw, 11rem)` rather
than `py-section`), which is what gives both the band and the ring their room. It is **sized by the section's
height, not the viewport width**: the section clips horizontally only, so a
width-driven ring taller than the section spills into Build above and Our Story
below. Type and cards are held in a `max-w-[57%]` column on the left so nothing
ever sits underneath it.

They are **not** goal rings. Closing means the stack is complete, never that a
daily requirement has been met, which is why nothing labels them with a
percentage or a target.

Mechanism: a single GSAP timeline scrubbed against the section, `top 78%` to
`center 52%`, `scrub: 1`. **No pin.** Scrolling back up reopens them. Ring caps
are `butt`, not round, because the brand is squared everywhere (the global
reset in `globals.css`).

## 4. Motion

House motion: quint-out, ~1.1 to 1.3s, 16px of travel, staggered by visual
hierarchy.

| Order | Element | Property | Duration | At |
|---|---|---|---|---|
| 1 | Eyebrow | opacity, y 16 to 0 | 1.10s | 0.00s |
| 2 | Tagline, per line | clip-path wipe | 1.30s | 0.12s, +0.16s each |
| 3 | Payoff line | opacity, y 16 to 0 | 1.15s | 0.60s |
| 4 | Four cards | opacity, y 16 to 0 | 1.15s | 0.78s, +0.14s each |

The tagline uses the clip-path wipe the site already uses in `SectionBand`, not
a fade. The rings are independent and driven by scroll. Under
`prefers-reduced-motion` everything is set to its end state and no timeline is
built.

Two things about the wipe that are easy to get wrong, and were wrong first time:

- **`useRevealReady` watches the type column, not the section.** The section
  carries about 176px of top padding, so a section-level observer fired while
  the tagline was still most of a screen below the fold, and the whole reveal
  played before anyone could see it. The column starts at the eyebrow, with a
  `-12%` root margin. The photography lives in the same column, so the decode
  gate still covers it.
- **Nothing around the line may clip it.** The wipe is a clip-path on the line
  itself, so the usual `overflow-hidden` wrapper adds nothing and shaves the
  serif's ascenders. `clip-path` also masks to the border box, and at
  `leading-none` that box is shorter than the glyphs, so the resting state
  clipped the caps too. The line carries vertical padding with matching
  negative margins: the box is tall enough to mask cleanly, the layout does not
  move.

## 5. Files

| File | What |
|---|---|
| `lib/menu/featuredEnhancers.ts` | New. The four ids, their stat keys and photo slots, plus `STACK_SIZE` read off the bundle. |
| `tests/unit/featuredEnhancers.test.ts` | New. 11 tests: ids are offered, none repeats, stats match the records, no `$` in a stat line. |
| `scripts/validate-menu.mjs` | Reads the featured ids as text (it stays dependency-free) and fails the build if one is no longer offered. |
| `components/sections/StacksSection.tsx` | New. The section. |
| `app/page.tsx` | `<div id="stacks">` between `#build` and `#about`. |
| `components/build/PrefillNotice.tsx` | New. Reads `?add=`, applies it, shows the receipt strip. |
| `components/build/BuildLayout.tsx` | Passes the notice inside a `<Suspense>`. |
| `components/build/BowlConfigurator.tsx` | Optional `notice` slot under the header. |

Presentation stays out of `menu.json` on purpose: that file is the ingredient
and pricing contract shared with the in-store Menu TV, and which four a
marketing section features is not part of it. What the featured list may not do
is drift from it, hence the test and the build gate. Verified by breaking an id
on purpose: the validator exits 1.

## 6. The deep link

Each card links to `/build?add=<ingredientId>`. The whole card is the target;
the section has no room for a separate link and needs none.

`PrefillNotice` treats the parameter as untrusted:

- the id must be offered in the enhancers step, or it is ignored in silence
- it is applied through the store's `toggleIngredient`, which validates against
  the step, never by writing `selection.steps` directly
- an unrecognised value produces no error state, because it is a URL somebody
  edited
- it applies once on arrival, guarded by a ref, so removing the enhancer does
  not put it straight back

`useSearchParams` forces a client-side bail-out unless it sits under a Suspense
boundary, so the notice is wrapped with `fallback={null}`. `/build` still
prerenders as static (confirmed in the build output).

The active step stays on Base, because the customer still has to choose one and
it is the first thing the builder asks for. That is exactly why the notice
exists: without it the pick sits four steps away on a panel nobody is looking
at, and the link reads as broken. The notice disappears the moment the enhancer
leaves the selection, so it can never disagree with the bowl.

## 7. Placement

```
Hero → SectionBand → Signature Menu → Build a Bowl → [ STACKS ] → Our Story → Gallery
```

After Build, before Our Story. Stacks is an upsell on something the reader has
to understand first. The Build a Bowl carousel windows directly above it were
repainted from `--color-blue` to `--color-grapefruit` on 2026-08-29, so the warm
panels lead into the dark band rather than a second cool colour sitting above it.
`--color-blue` survives in the palette and is still used by the nutrition ring's
fibre segment and by the inner Stacks ring. An anchor, not a route, so the sitemap and
`tests/unit/routeMap.test.ts` are untouched. No nav entry: a nav item would make
it a destination and push readers past Build, which is the section that converts.

## 8. Open

1. **A fourth photo subject**, or Collagen keeps reusing Customers.
2. **Photography weight.** Four photos in a dark band is real LCP cost. They go
   through `npm run images` like everything else, and the reveal gate starts
   waiting on decode the moment a `src` exists.
3. **Playwright.** Not run. The deep link and the notice are the parts worth an
   e2e case (`?add=` applies, an unknown id is inert, Remove clears it).
