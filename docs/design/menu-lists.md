# Menu lists: the home section and /menu

Built 2026-09-10. Replaced the gallery wall on both menu surfaces.

## Why the wall went

The wall (`components/gallery/GalleryWall.tsx`, rows in the deleted
`lib/menu/menuGallery.ts`) needed two or three photographs per item to fill its
rows. The 2026-09-10 menu change (ADR-027 in the vault) left only The Moment and
The Silk looking like their photographs; every other item is built differently
now. The Uber Eats shoot of 2026-09-09 supplies one product photo per item, not
three, so the layout had to be built around one picture per item.

The wall itself stays for the home page's closing section
(`HomeGallerySection`, rows in `lib/home/homeGallery.ts`); it no longer shows
menu items.

## What replaced it

`components/menu/SignatureList.tsx`, one component, two variants:

- **cards** (`/menu`): two columns from tablet width up, every item with its
  5:4 photo above its type. On a phone the photo becomes a 4.5rem square
  beside the text so the page reads as a list.
- **list** (home): the type in one column, the chosen photos in a second
  column beside it with the item's name as a caption. Two bowls (The Moment,
  The Silk) and two smoothies (The Glow, The Cabana), set in
  `SignatureMenuSection.HOME_PHOTOS`. On a phone the column of photos goes
  and only the two bowls with a matching top-down cut-out
  (`images.transparent`) get a small thumbnail.

Every signature is listed on the home page, not four. `/menu` still earns its
link: it carries a photograph of every item.

What an entry says is the `/source-menu` shape: name, tags, the recipe, the
yogurt it is made on, the Stack it pairs with, then the add button. No price on
the entry; the category heading states it once (`categoryPriceLine`).

## Photography rules (tested in `tests/unit/signatureList.test.ts`)

- `images.photo` on every signature, under `public/images-web/Signature/<id>.jpg`,
  1600x1280 from the 2880x2304 originals in `~/Documents/Meros/Uber-Eats-Images`.
- `images.transparent` is optional and only on items whose cut-out still matches
  the item as built (The Moment, The Silk). The other cut-outs stay on disk and
  are not referenced.
- The Menu TV uses its own 900px square crops (`menu-tv/product-images/<Key>.jpg`).

## Motion

The site's opacity-and-travel reveal per entry (`Reveal`, index by item
order), gated on the list being in view and its visible images decoded
(`useRevealReady`). The photo column on the home page reveals on the same gate
with a 0.2s offset. No curtain wipe; that was the wall's.
