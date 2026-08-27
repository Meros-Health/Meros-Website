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
      "servingLabel": "1/2 cup",
      "nutrition": { "calories", "protein", "carbs", "fat", "fiber", "calcium", "iron", "potassium" },
      "nutritionStatus": "provisional",   // provisional | needs-label | needs-recipe | verified
      "tags": ["vegan", "gf"],            // optional, freeform, UI badges only
      "description": "..." }              // optional, builder card copy
  ],

  "build": {
    "sizes": [{ "id": "medium", "label": "Medium", "price": 12 }, ...],   // base price per size
    "intro": "...",                                                        // optional board copy
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
    "bowls": [
      { "id": "moment", "name": "The Moment", "tags": ["Energy", "Antioxidants"],
        "recipe": ["plain-greek-yogurt", "blueberries", ...],   // ingredient ids, printed in this order
        "sizes": { "medium": { "price": 12, "calories": 581, "protein": 17 }, "large": {...} },
        "images": { "photo": "/images-web/...", "transparent": "/images-web/..." } }
    ],
    "smoothies": [...]
  }
}
```

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
- Image paths exist under `public/`.
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

**Change a price.** Edit `build.sizes[].price`, `pricing.extraPrice`,
`surcharge` or `bundle.price`. All surfaces regenerate their price strings.

## What the website does with it

- `ingredients.ts`: registry lookups (`getIngredient`, `ingredientName`).
- `buildConfig.ts`: `BUILD_CONFIG`, step and size lookups, `isOffered`.
- `calcBowlPrice.ts`: `calcBowlPrice(selection)`, option price labels, step instructions. Throws `PricingError` on anything the menu does not offer.
- `selectionUtils.ts`: the persisted custom-bowl shape `{ sizeId, steps: { [stepId]: ingredientId[] } }`, migration of older cart payloads, `sanitizeSelection` which drops ids that no longer resolve.
- `signatures.ts`: signature items with `recipe` resolved to a display string.
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
re-prices them server-side. Removing an ingredient from `menu.json` therefore
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
