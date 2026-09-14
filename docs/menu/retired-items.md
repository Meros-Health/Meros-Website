# Retired menu items

An item taken off `lib/menu/menu.json` stops existing everywhere at once: the
website, the Menu TV, the cart, checkout. That is the point of one source of
truth, and it is also why the item has to be written down somewhere before it
goes. This file is that place. It is not read by any code.

Photographs are deliberately **not** deleted. Bringing an item back is a paste
from this file; re-shooting it is not.

---

## The Rise

Retired **2026-09-04**, when Kim and Marie rebuilt the smoothie menu around a
stated direction (one superfood, one benefit, one shared vanilla base per item).
The Rise had no superfood and no stated benefit, and the roster that replaced it
is six items, so it was the one that came off rather than a seventh being added.

It was on the menu from launch to 2026-09-04 at $15.

```json
{
  "id": "rise",
  "name": "The Rise",
  "tags": ["Energy", "Antioxidants"],
  "recipe": ["blueberries", "strawberries", "bananas", "almond-butter", "chia-seeds"],
  "sizes": { "standard": { "price": 15, "calories": 493, "protein": 16 } },
  "images": { "photo": "/images-web/Smoothies/rise-1.jpg", "transparent": "/images-web/Transparent/Rise.png" }
}
```

Assets still on disk, none of them referenced by any surface:

| File | Used by, before |
|---|---|
| `public/images-web/Smoothies/rise-1.jpg` | `menu.json` `images.photo`, the /menu wall |
| `public/images-web/Smoothies/rise-2.jpg` | the /menu wall's second panel |
| `public/images-web/Transparent/Rise.png` | the Menu TV's product cutout |
| `public/images-web/Instagram/smoothies/rise.png` | the home page's Instagram tile, removed the same day |
| `menu-tv/product-images/Rise.png` | the Menu TV board |

Macro working, per component, is the `The Rise` block in
`~/Documents/Meros/meros-macros-sheets/Signature_Smoothies.csv`.

**If it comes back:** paste the JSON above into `signatures.smoothies`, give it a
photo under `public/images-web/Signature/` and `menu-tv/product-images/`, and recompute its figures.
The recipe above predates the 2026-09-04 recompute, so 493 / 16 are the old
numbers and should not be republished as they stand.

---

## The Seasonal

Retired **2026-09-10**, when Kim's Uber Eats submission became the store menu.
It was never on that menu, and The Bloom, which it had replaced on 2026-08-28,
came back into its slot. It had also become a source of confusion: one
description of "the seasonal" was the availability note on the builder's Fruits
step ("Based on availability. Ask about our seasonal fruit."), which stays,
and the other was this bowl, which nobody could define the same way twice.

It was on the menu from 2026-08-28 to 2026-09-10 at $12 / $15, with no
photograph by design and no calories or protein (its figures were removed on
2026-09-01 pending a recompute that never happened, because its recipe never
settled). The validator carried a one-item exception for that; the exception
went with it.

```json
{
  "id": "seasonal",
  "name": "The Seasonal",
  "tags": ["Immune Support", "Antioxidants"],
  "recipe": ["seasonal-stone-fruits", "seasonal-berries", "sunflower-seeds", "house-granola", "local-raw-honey", "bee-pollen"],
  "seasonNote": "late summer stone fruit and berries",
  "note": "Ask our staff about our seasonal offerings",
  "sizes": { "medium": { "price": 12 }, "large": { "price": 15 } }
}
```

Its two placeholder ingredients, `seasonal-stone-fruits` and
`seasonal-berries`, left the registry with it; nothing else used them. No
assets: it was never photographed and the Menu TV drew it as type.

**If it comes back:** paste the JSON above into `signatures.bowls`, put the two
placeholder ingredients back with a `group` of `fruits`, and compute its figures before it
ships; the validator no longer lets a signature omit them. The website lists
read the item list directly, so it needs no row anywhere else, only a photo.

---

## Earlier retirements

The Bloom (retired 2026-08-28 for The Seasonal, back on 2026-09-10 with the
same recipe and its photographs restored from git) and The Tropic (renamed The
Tropics on 2026-08-28, The Tropic again on 2026-09-10) predate this file. Their
record is the `$comment` on `signatures` in `menu.json`.
