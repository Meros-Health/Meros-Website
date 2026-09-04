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
row in `SMOOTHIE_ROWS` (`lib/menu/menuGallery.ts`), and recompute its figures.
The recipe above predates the 2026-09-04 recompute, so 493 / 16 are the old
numbers and should not be republished as they stand.

---

## Earlier retirements

The Bloom (retired 2026-08-28 for The Seasonal) and The Tropic (renamed The
Tropics the same day) predate this file. Their record is the `$comment` on
`signatures` in `menu.json`, and `menu-tv/product-images/Bloom.png` and
`Tropic.png` are still on disk.
