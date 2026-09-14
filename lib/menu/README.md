# Menu data

`menu.json` is the only place the menu is written down. Everything that shows
a menu reads from it:

| Surface | Reader |
|---|---|
| Website signature bowls and smoothies (`/`, `/menu`, pairings) | `lib/menu/signatures.ts` |
| Website bowl builder (`/build`), cart, checkout pricing | `lib/menu/buildConfig.ts`, `lib/menu/calcBowlPrice.ts` |
| Home page Stacks section, the Stack named on each menu panel | `lib/menu/stacks.ts`, `lib/menu/featuredEnhancers.ts` |
| The menu reference page (`/source-menu`, unlinked) | every accessor above plus `lib/menu/delivery.ts` |
| In-store Menu TV, both panels | `../menu-tv/sync-menu.sh` writes `menu-data.js` |

There are no other copies. If a name, price or ingredient appears somewhere
that is not derived from this file, that is a bug.

## Edit loop

```bash
$EDITOR lib/menu/menu.json
npm run validate:menu          # fails loudly on any broken reference or rule
git commit -am "menu: ..."     # push redeploys the website
cd ../menu-tv && ./build-4k.sh # regenerates menu-data.js and board.jpg, then deploy-usb.sh
```

`validate:menu` also runs before every website build (`build`, `preview`,
`deploy`, `upload`) and at the start of `sync-menu.sh`, so a bad edit cannot
reach either surface.

## Shape

```jsonc
{
  "version": 2,
  "sizeTiers": { "bowl": [{ "id", "label" }], "smoothie": [...] },   // signature size labels, in display order

  "ingredients": [                                                 // the registry: every ingredient exactly once
    { "id": "blueberries",            // lowercase kebab-case, referenced everywhere else
      "name": "Blueberries",          // the one display name, all surfaces
      "shortName": "Plain",           // optional, bases only: the word the Menu TV's base line uses
      "group": "nuts-seeds",          // optional, a select:"multi" step id: where the Menu TV files this in a
                                      //   recipe (fruits, nuts-seeds, finishes order) when the step that offers it
                                      //   (if any) is not the answer
      "servingLabel": "1/2 cup",
      "nutrition": { "calories", "protein", "carbs", "fat", "fiber", "calcium", "iron", "potassium" },
      "nutritionStatus": "provisional",   // provisional | needs-label | needs-recipe | verified
      "tags": ["vegan", "gf"],            // optional, freeform, UI badges only
      "description": "..." }              // optional, builder card copy
  ],

  "build": {
    "sizes": [{ "id": "medium", "label": "Medium", "price": 12 }, ...],   // base price per size
    "steps": [
      { "id": "base", "label": "Base", "select": "one", "required": true,
        "pricing": { "mode": "surcharge-only" },
        "options": [{ "ingredientId": "plain-greek-yogurt" }, { "ingredientId": "vegan-coconut-yogurt", "surcharge": 2 }] },
      { "id": "fruits", "label": "Fruits", "select": "multi", "required": false,
        "pricing": { "mode": "included-then-extra", "included": 2, "extraPrice": 2 },
        "note": "Based on availability. Ask about our seasonal fruit.",   // optional, shown on every surface
        "options": [...] },
      { "id": "enhancers", ...,
        "pricing": { "mode": "included-then-extra", "included": 0, "extraPrice": 3,
                     "bundle": { "count": 3, "price": 7, "label": "Stack three enhancers for $7" } } }
    ]
  },

  "stacks": {                                                      // the named Stacks: curated sets of
    "items": [                                                     //   exactly bundle.count enhancers, every one
      { "id": "rebuild", "name": "Rebuild Stack",                  //   offered in the enhancers step, priced by
        "enhancers": ["whey-protein-isolate", "creatine-monohydrate", "l-glutamine"],   // the bundle
        "pairsWith": ["recovery", "focus", "sea-greens", "crunch", "bloom"] }         // optional, signature ids
    ]
  },

  "delivery": {                                                    // the third-party menu, as submitted. No
    "platform": "Uber Eats",                                       //   ordering surface reads it; /source-menu
    "prices": { "bowl": 19.99, "smoothie": 19.99 },                //   explains the two channels from it
    "bowlSizes": ["large"],                                        // bowl tier ids the platform sells
    "extraToppingPrice": 2,
    "extras": ["bananas", ...],                                    // the only additions the platform allows
    "stackPrice": 7,
    "singleEnhancer": { "ingredientId": "whey-protein-isolate", "price": 3 },
    "excludes": ["crave"]                                          // sold in store, not on the platform
  },

  "signatures": {
    "defaultBase": { "smoothies": "vanilla-greek-yogurt" },   // optional per category; absent = customer chooses
    "bowls": [
      { "id": "moment", "name": "The Moment", "tags": ["Energy", "Antioxidants"],
        "base": "plain-greek-yogurt",                          // optional: this item departs from its category default
        "suggestedStack": "glow",                              // optional: a stacks.items id, printed as "Pairs with the Glow Stack"
        "recipe": ["blueberries", ...],                        // toppings only, ingredient ids, printed in this order
        "sizes": { "medium": { "price": 12, "calories": 581, "protein": 17 }, "large": {...} },
        "images": { "photo": "/images-web/Signature/moment.jpg",             // optional: an item with no photography is set as type
                    "transparent": "/images-web/Transparent/Moment.png" },   //   photo: the product shot (Uber Eats set, 5:4). transparent: the
                                                                             //   top-down cut-out, optional; the lists use it as a phone thumbnail
        "seasonNote": "late summer stone fruit and berries" }   // optional, and only for an item WITHOUT images. Printed as
                                                               //   "Featuring {seasonNote}", so keep it a lowercase phrase.
    ],
    "smoothies": [...]
  }
}
```

### The yogurt is the customer's choice

A signature is its toppings. `recipe[]` never names a base (an ingredient
offered in the `select: "one"` step); the validator rejects one. Bowls carry
no default: the Menu TV prints "Choose your yogurt · Plain, Vanilla, High
Protein or Vegan Coconut +$2", built from the Base step's options and
surcharges. Smoothies default to `defaultBase.smoothies`; no item currently
departs from it. An item that did would set `base` (for example, The
Recovery: `"base": "plain-greek-yogurt"`), which the board would print as a
note on that row.

Bowl `calories` / `protein` were computed with the yogurt each recipe named
before 2026-08-28 (The Moment: Plain; the rest: Vanilla). A different base
moves them by roughly 20 kcal / 1 g between the Greek yogurts and by about
10 g protein for Vegan Coconut; the board's footer already calls them
estimates. Every smoothie was recomputed on 2026-09-04 against the 200 g
Vanilla base it actually defaults to, so the smoothie half no longer
carries that offset.

### Pricing modes

| `pricing.mode` | Meaning | Extra fields |
|---|---|---|
| `surcharge-only` | No per-count charge. Individual options may carry `surcharge`. Required for `select: "one"` steps. | none |
| `included-then-extra` | The first `included` picks are free; each further pick costs `extraPrice`. `bundle` prices the extras in groups (greedy: `floor(n / count) * price + (n % count) * extraPrice`). | `included`, `extraPrice`, `bundle?` |
| `hard-cap` | Up to `max` picks, never charged. | `max` |

A custom bowl costs `sizes[sizeId].price + option surcharges + per-step extras`.

### Rules the validator enforces

- Every id is unique and kebab-case. Ingredient names are unique.
- Every `options[].ingredientId` and every `recipe[]` id exists in `ingredients`.
- An ingredient is offered in at most one step, and at most once per step.
- `included` and `max` never exceed the step's option count.
- `surcharge` only on `surcharge-only` steps; `included` / `extraPrice` / `bundle` only on `included-then-extra`; `max` only on `hard-cap`.
- `bundle.price < bundle.count * extraPrice`, otherwise greedy bundling is wrong.
- Signature `sizes` keys match `sizeTiers` for that category, and every item in a category shares the same price per size (the TV prints one price per panel).
- No `recipe[]` contains a base (an ingredient offered in a `select: "one"` step). `defaultBase` values and item `base` values must be such an ingredient; an item `base` equal to its category default only warns.
- `ingredients[].group`, when set, is the id of a `select: "multi"` step.
- Every signature carries `calories` and `protein` at every size. (The Seasonal was allowed to omit them from 2026-09-01 until it was retired on 2026-09-10.)
- `stacks.items`: ids and names unique; each holds exactly `bundle.count` enhancers, each offered in the `enhancers` step; `pairsWith` names real signatures. `suggestedStack` on a signature names a real stack.
- `delivery`: prices are numbers, `bowlSizes` are bowl tier ids, `extras` are real non-base ingredients, `singleEnhancer.ingredientId` is offered in the enhancers step, `excludes` names real signatures.
- When `images` is given, `photo` is required and `transparent` optional; every path given exists under `public/`. `images` may be absent.
- `seasonNote`, when given, is a non-empty string on an item that has no `images` (it is only ever rendered in a photograph's place, so on a photographed item it would silently go stale).
- Warns (does not fail) on ingredients that are neither offered nor used in a recipe.

## Common edits

**Remove an ingredient from the menu.** Delete its `ingredients` entry. The
validator then lists every step option and every recipe that still references
it; delete those references. Nothing else needs to change.

**Take an ingredient off the builder but keep it in a recipe.** Delete its
`options` entry only. It stays in the registry and in the recipe.

**Rename an ingredient.** Change `name`. Keep `id` so persisted carts and
recipes keep resolving. Only change `id` if you also update every reference;
the validator will point at each one.

**Retire a signature item.** Copy its entry into `docs/menu/retired-items.md`
first, then delete it here. The website lists (`components/menu/SignatureList.tsx`)
and the Menu TV read the item list, so nothing else names it. Leave the
photographs on disk. There is no legacy remap for
signature ids the way `legacyIdMap.ts` remaps ingredient ids, so a cart
holding the retired item drops that line with a notice on its next load and
checkout refuses it server-side; that is intended, not a bug. Grep the tests
before you commit: they use a real item as a fixture, and `instagramFeed.ts`
names item photographs by id.

**Put a recipe-only enhancer in a recipe.** An ingredient offered in the
`enhancers` step needs an explicit `"group": "finishes"` before a recipe can
name it. The Menu TV files recipes under fruits, nuts-seeds and finishes only,
and `sync-menu.sh` throws rather than guess. The website does not care, so this
one fails at the board and nowhere earlier.

**Add a step.** Append to `build.steps`. The builder, cart, checkout and Menu
TV pick it up. The TV needs a column-count hint for the new step id in
`../menu-tv/sync-menu.sh` (`COLS`), otherwise it defaults to three columns.

**Change a signature's default yogurt.** Edit `signatures.defaultBase`, or set
`base` on the one item that differs. Never put a yogurt in `recipe[]`.

**Add a recipe-only ingredient** (one the builder does not offer, like camu
camu). Give it a `group` naming the step it reads as on the Menu TV, otherwise
`sync-menu.sh` refuses to place it.

**Change a Stack.** Edit `stacks.items`. The home page columns, the Stack
named on each menu panel, the Compose panel on the Menu TV and /source-menu all
regenerate. An enhancer a Stack names has to be offered in the enhancers step,
so a new one goes into `options` first; the validator says so otherwise.

**One name per ingredient.** Almonds are "Almonds" and coconut is "Coconut"
(since 2026-09-10; toasted and shredded were the same shelf item). How it is
prepared is the kitchen's business, not the registry's. Do not add a second
entry for a preparation of something already listed.

## Known gaps

None open. The website's base picker for signatures (the gap opened on
2026-08-28 when the yogurt left `recipe[]`) closed the same day: see
`signatureBase.ts` below.

**Change a price.** Edit `build.sizes[].price`, `pricing.extraPrice`,
`surcharge` or `bundle.price`. All surfaces regenerate their price strings.

## What the website does with it

- `ingredients.ts`: registry lookups (`getIngredient`, `ingredientName`).
- `buildConfig.ts`: `BUILD_CONFIG`, step and size lookups, `isOffered`.
- `calcBowlPrice.ts`: `calcBowlPrice(selection)`, option price labels, step instructions. Throws `PricingError` on anything the menu does not offer.
- `selectionUtils.ts`: the persisted custom-bowl shape `{ sizeId, steps: { [stepId]: ingredientId[] } }`, migration of older cart payloads, `sanitizeSelection` which drops ids that no longer resolve.
- `signatures.ts`: signature items with `recipe` resolved to a display string.
- `signatureBase.ts`: the yogurt under a signature. Options and the vegan
  surcharge from the Base step, the item's default (`base`, else
  `defaultBase`, else the customer chooses), `sanitizeBaseId` for persisted
  lines, and `formatBaseCaption`, which prints the board's base line word for
  word ("Choose your yogurt · Plain, Vanilla, High Protein or Vegan Coconut
  +$2") the way the Menu TV does.
- `signatureAdd.ts`: what a "+" does. An item with a choice to make (more
  than one size, or no default yogurt: every bowl) is configured in the add
  modal (`components/cart/SignatureModal.tsx`, the same dialog that edits a
  cart line) before it is in the cart; size and yogurt are required there,
  additions and removals optional within the caps. An item with nothing to
  choose (every smoothie) adds in one press at its size with its default.
- `signatureMods.ts`: additions and removals on a signature line (see below).
- `legacyIdMap.ts`: old builder ids to registry ids, used only when rehydrating carts saved before v2.

### Signature additions and removals

A signature bowl or smoothie in the cart can be edited from the cart drawer:
up to `MAX_ADDITIONS` (3, the bundle count, so a whole Stack fits) ingredients
added, up to `MAX_REMOVALS` (2) recipe
ingredients left out, and a size change. Nothing in this file describes it;
the rules are derived:

- **Addable**: any ingredient offered in a `select: "multi"` build step that
  the recipe does not already contain. Priced as an extra on that step: the
  step's `extraPrice` (bundle included: three enhancers on a signature price
  as a Stack), or the option's `surcharge` on a surcharge-only step. The recipe never
  counts against a step's `included` allowance; the signature price covers it.
- **Removable**: any recipe ingredient except the base (an ingredient offered
  in a `select: "one"` step). Free. Recipe-only ingredients the builder does
  not offer (camu camu, almond butter) are removable but not addable,
  because nothing prices them.

The cart persists `mods: { additions, removals }` as ingredient ids on the
line, re-validates them on every load like a custom selection, and checkout
re-prices them server-side. The yogurt is persisted beside them as `base`
(a Base step ingredient id) and sanitized the same way: an id the step no
longer offers falls back to the item's default, or on a bowl to "not
chosen", which the drawer flags and checkout refuses with a per-line message
until the customer picks one. The chosen yogurt's `surcharge` is added on
top of the signature price on every surface and again server-side. Removing an ingredient from `menu.json` therefore
also removes it from any persisted addition, with a notice. The caps are
constants in `signatureMods.ts`, not menu data.

Signature `calories` / `protein` per size are hand-entered from the macro
sheets. Recipes are references for integrity and display; they are not summed
into the signature figures. **Nothing enforces that they agree**, which is the
one real gap in this file: a recipe can be rewritten and the figures left
behind, and only a reader notices. The method for recomputing them is
per-100 g from `~/Documents/Meros/meros-macros-sheets/Ingredient_Master.csv`
and `Enhancers.csv` times the recipe's gram weights, summed; the 2026-09-04
smoothie recompute is written out component by component in that folder's
`2026-09-04_Smoothies_v2.csv` and is the worked example to copy.

## Notes for Trellum

What generalizes: the registry + references + validator pattern, the
data-driven step model, pricing as a small discriminated union, generated
outputs per surface with presentation hints kept out of the data (the TV's
column counts live in the TV's script, not here).

What is Meros-specific: the two signature categories and their size tiers,
the eight nutrition fields, the image path convention. A product version would
replace `sizeTiers` and `signatures.{bowls,smoothies}` with a generic product
list carrying its own size axis, and would move `nutritionStatus` and image
existence checks to per-tenant policy.
