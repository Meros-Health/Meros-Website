# Menu data

`menu.json` is the only place the menu is written down. Everything that shows
a menu reads from it:

| Surface | Reader |
|---|---|
| Website signature bowls and smoothies (`/`, `/order`, pairings) | `lib/menu/signatures.ts` |
| Website bowl builder (`/build`), cart, checkout pricing | `lib/menu/buildConfig.ts`, `lib/menu/calcBowlPrice.ts` |
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

  "signatures": {
    "defaultBase": { "smoothies": "vanilla-greek-yogurt" },   // optional per category; absent = customer chooses
    "bowls": [
      { "id": "moment", "name": "The Moment", "tags": ["Energy", "Antioxidants"],
        "base": "plain-greek-yogurt",                          // optional: this item departs from its category default
        "recipe": ["blueberries", ...],                        // toppings only, ingredient ids, printed in this order
        "sizes": { "medium": { "price": 12, "calories": 581, "protein": 17 }, "large": {...} },
        "images": { "photo": "/images-web/...", "transparent": "/images-web/..." },    // optional: an item with no
                                                                                        //   photography (The Seasonal) gets the grapefruit plate on every surface
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

Signature `calories` / `protein` were computed with the yogurt each recipe
named before 2026-08-28 (Moment and Recovery: Plain; the rest: Vanilla). A
different base moves them by roughly 20 kcal / 1 g between the Greek
yogurts and by about 10 g protein for Vegan Coconut; the board's footer
already calls them estimates. The Recovery now defaults to Vanilla like
every smoothie, so its printed figures (computed with Plain) are about 20
kcal low and 1 g protein high for the default base.

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
- Image paths exist under `public/` when `images` is given; `images` may be absent (see The Seasonal).
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

**Add a step.** Append to `build.steps`. The builder, cart, checkout and Menu
TV pick it up. The TV needs a column-count hint for the new step id in
`../menu-tv/sync-menu.sh` (`COLS`), otherwise it defaults to three columns.

**Change a signature's default yogurt.** Edit `signatures.defaultBase`, or set
`base` on the one item that differs. Never put a yogurt in `recipe[]`.

**Add a recipe-only ingredient** (one the builder does not offer, like
toasted almonds). Give it a `group` naming the step it reads as on the Menu
TV, otherwise `sync-menu.sh` refuses to place it.

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
up to `MAX_ADDITIONS` (2) ingredients added, up to `MAX_REMOVALS` (2) recipe
ingredients left out, and a size change. Nothing in this file describes it;
the rules are derived:

- **Addable**: any ingredient offered in a `select: "multi"` build step that
  the recipe does not already contain. Priced as an extra on that step: the
  step's `extraPrice` (bundle included, though it is unreachable at a cap of
  2), or the option's `surcharge` on a surcharge-only step. The recipe never
  counts against a step's `included` allowance; the signature price covers it.
- **Removable**: any recipe ingredient except the base (an ingredient offered
  in a `select: "one"` step). Free. Recipe-only ingredients the builder does
  not offer (toasted almonds, almond butter) are removable but not addable,
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
into the signature figures.

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
