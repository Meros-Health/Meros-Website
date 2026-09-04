// The menu page's wall, row by row.
//
// Which items show a photograph is an editorial decision, not a data one. Only
// seven of the eleven signatures appear here with images; the other four are
// type only. That is deliberate and it is the Starbucks argument: a menu does not
// owe every item a picture, and the ones without get a bigger name and more
// room to say what is in them. It also means a new bowl can go on the menu the
// week it is invented, before it has been photographed.
//
// Second photographs (`-2.jpg`) are named here rather than in menu.json,
// because they are a property of this layout and not of the item. Every path is
// checked against the filesystem by tests/unit/menuGallery.test.ts, so a
// renamed or deleted photo fails the build rather than rendering a gap.
import type { GalleryRow } from "@/lib/gallery/types";
import { getSignatureItem, type SignatureItem } from "./signatures";

/** Alt text from the item, so the wall never invents a description. */
function alt(id: string, shot: 1 | 2): string {
  const item = getSignatureItem(id);
  const name = item?.name ?? id;
  return shot === 1 ? name : `${name}, second view`;
}

/**
 * Items the /menu wall renders as type only. The Crunch is an editorial cut and
 * has photographs shown elsewhere; The Seasonal, The Glow and The Garden
 * genuinely have none, which is recorded in menu.json rather than here.
 *
 * The Crave and The Recovery were on this list until 2026-09-04. They came off
 * it because the smoothie roster went from five items to six and two of the six
 * arrived unphotographed: keeping the old editorial cut as well would have put
 * four of six smoothies in type and turned that half of the page into a list.
 */
export const MENU_TEXT_ONLY_IDS = ["crunch", "seasonal", "glow", "garden"] as const;

// Column splits, read down the page. Every row that carries photographs opens
// with its type panel at the same 8 of 24, a third of the row, and divides the
// remaining sixteen differently: 10/6, 9/7, 7/9 down the bowls, then 6/10,
// 10/6, 9/7, 7/9 down the smoothies. No two photographed rows running share a
// split, and the four the smoothies use are the four the sixteen has. The
// asymmetry moved rather than left. It used to be in where the type landed and
// how wide it was, which meant the reader had to find the name of each item
// somewhere new in every row; it now lives entirely in the two photographs,
// with the names running down one edge of the page.
//
// The two type-only rows are the exception the rule cannot cover: two items
// sharing a row with no photograph between them has no second and third column
// to divide. They stay half and half. Their type still sets at the same size as
// every other panel's, because the scale is measured against the row rather
// than against the panel (see "Gallery wall" in app/globals.css).
//
// Tone alternates strictly down the leading column: midnight, cream, midnight,
// cream. On a type-only row the leading half takes the row's turn and the other
// half takes the opposite, so the alternation survives a row that holds two.
export const BOWL_ROWS: GalleryRow[] = [
  {
    id: "moment",
    panels: [
      { kind: "text", span: 8, id: "moment", tone: "midnight" },
      { kind: "image", span: 10, src: "/images-web/Bowls/Moment-1.jpg", alt: alt("moment", 1), priority: true },
      // Not priority, though it is above the fold on a desktop. Under 900px the
      // wall shows one photograph per item and this is the one it drops, and a
      // preload is issued from the head before any display rule has run: it
      // would download a full-width photograph on a phone that never shows it.
      // Lazy is what makes a hidden panel free, so this panel stays lazy.
      { kind: "image", span: 6, src: "/images-web/Bowls/Moment-2.jpg", alt: alt("moment", 2) },
    ],
  },
  {
    id: "silk",
    panels: [
      { kind: "text", span: 8, id: "silk", tone: "cream" },
      { kind: "image", span: 9, src: "/images-web/Bowls/Silk-1.jpg", alt: alt("silk", 1) },
      { kind: "image", span: 7, src: "/images-web/Bowls/Silk-2.jpg", alt: alt("silk", 2) },
    ],
  },
  {
    id: "crunch-seasonal",
    panels: [
      { kind: "text", span: 12, id: "crunch", tone: "midnight" },
      { kind: "text", span: 12, id: "seasonal", tone: "cream" },
    ],
  },
  {
    id: "tropic",
    panels: [
      { kind: "text", span: 8, id: "tropic", tone: "cream" },
      { kind: "image", span: 7, src: "/images-web/Bowls/Tropic-1.jpg", alt: alt("tropic", 1) },
      { kind: "image", span: 9, src: "/images-web/Bowls/Tropic-2.jpg", alt: alt("tropic", 2) },
    ],
  },
];

export const SMOOTHIE_ROWS: GalleryRow[] = [
  {
    id: "cabana",
    panels: [
      { kind: "text", span: 8, id: "cabana", tone: "midnight" },
      { kind: "image", span: 6, src: "/images-web/Smoothies/cabana-1.jpg", alt: alt("cabana", 1) },
      { kind: "image", span: 10, src: "/images-web/Smoothies/cabana-2.jpg", alt: alt("cabana", 2) },
    ],
  },
  {
    id: "recovery",
    panels: [
      { kind: "text", span: 8, id: "recovery", tone: "cream" },
      { kind: "image", span: 10, src: "/images-web/Smoothies/recovery-1.jpg", alt: alt("recovery", 1) },
      { kind: "image", span: 6, src: "/images-web/Smoothies/recovery-2.jpg", alt: alt("recovery", 2) },
    ],
  },
  {
    // The two smoothies that have never been photographed, in the position the
    // bowls put crunch-seasonal: third of the half, so neither the page nor
    // this half of it opens or closes on a row with no photograph in it.
    id: "glow-garden",
    panels: [
      { kind: "text", span: 12, id: "glow", tone: "midnight" },
      { kind: "text", span: 12, id: "garden", tone: "cream" },
    ],
  },
  {
    id: "crave",
    panels: [
      { kind: "text", span: 8, id: "crave", tone: "cream" },
      { kind: "image", span: 9, src: "/images-web/Smoothies/crave-1.jpg", alt: alt("crave", 1) },
      { kind: "image", span: 7, src: "/images-web/Smoothies/crave-2.jpg", alt: alt("crave", 2) },
    ],
  },
  {
    id: "focus",
    panels: [
      { kind: "text", span: 8, id: "focus", tone: "midnight" },
      { kind: "image", span: 7, src: "/images-web/Smoothies/focus-1.jpg", alt: alt("focus", 1) },
      { kind: "image", span: 9, src: "/images-web/Smoothies/focus-2.jpg", alt: alt("focus", 2) },
    ],
  },
];

export const MENU_ROWS = [...BOWL_ROWS, ...SMOOTHIE_ROWS];

/** Every item id the wall names, in the order it appears. */
export function galleryItemIds(rows: readonly GalleryRow[] = MENU_ROWS): string[] {
  return rows.flatMap((row) => row.panels.flatMap((p) => (p.kind === "text" ? [p.id] : [])));
}

/** The item behind a text panel. Throws rather than rendering an empty panel. */
export function galleryItem(id: string): SignatureItem {
  const item = getSignatureItem(id);
  if (!item) throw new Error(`Gallery names "${id}", which is not on the menu`);
  return item;
}

// ── The home page's preview ───────────────────────────────────────────────────
//
// The four bestsellers, named by Thomas: The Moment, The Silk, The Cabana, The
// Recovery. Two bowls and two smoothies, all four with photographs, because the
// home page is where someone decides whether they want this at all and the
// /menu editorial cut is not the right call in front of a first-time visitor.
//
// Four items, not ten, so /menu still has a reason to exist. The section says so
// twice, in an accent button above the wall and again in a dark bar under it,
// because four items is exactly enough to be mistaken for the whole menu.
export const HOME_MENU_ROWS: GalleryRow[] = [
  {
    id: "home-moment",
    panels: [
      { kind: "text", span: 8, id: "moment", tone: "midnight" },
      { kind: "image", span: 10, src: "/images-web/Bowls/Moment-1.jpg", alt: alt("moment", 1) },
      { kind: "image", span: 6, src: "/images-web/Bowls/Moment-2.jpg", alt: alt("moment", 2) },
    ],
  },
  {
    id: "home-silk",
    panels: [
      { kind: "text", span: 8, id: "silk", tone: "cream" },
      { kind: "image", span: 9, src: "/images-web/Bowls/Silk-1.jpg", alt: alt("silk", 1) },
      { kind: "image", span: 7, src: "/images-web/Bowls/Silk-2.jpg", alt: alt("silk", 2) },
    ],
  },
  {
    id: "home-cabana",
    panels: [
      { kind: "text", span: 8, id: "cabana", tone: "midnight" },
      { kind: "image", span: 7, src: "/images-web/Smoothies/cabana-1.jpg", alt: alt("cabana", 1) },
      {
        kind: "image",
        span: 9,
        src: "/images-web/Smoothies/cabana-2.jpg",
        alt: alt("cabana", 2),
        // Framed on the garnish and the top of the glass. The base and the
        // table it stands on fall out of the bottom of the panel, which is
        // the whole point: the photograph is of a drink, not of a glass.
        //
        // Focus is pinned to the top edge, which is as high as this crop can
        // travel: the pineapple leaves start 21px down a 684px photograph, so
        // that is all the headroom the source has above them.
        //
        // The panel narrowed from 10 of 24 to 9 when the type panel took its
        // fixed third of the row, so this crop is a touch tighter on the
        // subject than it was. The framing rule is unchanged; the numbers are
        // the ones that were tuned for the wider box and have not been re-cut
        // against the new one.
        crop: { zoom: 1.35, focus: "51% 0%" },
      },
    ],
  },
  {
    id: "home-recovery",
    panels: [
      { kind: "text", span: 8, id: "recovery", tone: "cream" },
      { kind: "image", span: 10, src: "/images-web/Smoothies/recovery-1.jpg", alt: alt("recovery", 1) },
      {
        kind: "image",
        span: 6,
        src: "/images-web/Smoothies/recovery-2.jpg",
        alt: alt("recovery", 2),
        // The same cut, a touch deeper: this glass sits lower in its frame
        // than the Cabana's, so hiding its base costs more zoom. This panel is
        // the same width it has always been, so the crop is untouched.
        crop: { zoom: 1.45, focus: "53% 48%" },
      },
    ],
  },
];
