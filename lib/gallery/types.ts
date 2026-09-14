// The asymmetric gallery wall, as data.
//
// A wall is rows; a row is two or three panels; a panel is either a photograph
// or a block of type. Panels sit flush against each other, no border, no
// gutter, no rounded corner. Every row spans the full viewport and every row is
// the same height, so the only thing that varies between them is how the
// columns are divided. That is what makes the page read as a wall rather than a
// grid of cards.
//
// Twenty-four columns, not twelve. The wall's readability rule is that the
// first panel of every row is the type, always a third of the row wide, so the
// eye finds the name of each item in the same place all the way down the page.
// A third of twelve leaves eight columns for the two photographs, which divides
// only as 5/3 or 3/5: two arrangements is an alternation, not an asymmetry.
// A third of twenty-four leaves sixteen, which divides as 10/6, 9/7, 7/9 and
// 6/10 while the type panel keeps exactly the width it had before.
//
// This module is deliberately content-free: it knows about columns and tones,
// not about bowls. The home page's closing wall supplies its own rows
// (lib/home/homeGallery.ts) and any other page can supply different ones,
// which is the point. The menu itself left the wall on 2026-09-10 for
// components/menu/SignatureList.tsx, which needs one photograph per item
// rather than the two or three a row asks for.

export const GALLERY_COLUMNS = 24;

/**
 * The type panel's width, on every row of every wall that follows the rule.
 * A third of the row: the same proportion The Moment's panel has always had,
 * and the reason every block of type on the wall sets at one size (the type
 * scale is measured against the row, so equal panels resolve equal type).
 */
export const GALLERY_TEXT_SPAN = 8;

export type GalleryTone = "cream" | "midnight";

export type GalleryPanel =
  | {
      kind: "image";
      /** Columns out of GALLERY_COLUMNS. */
      span: number;
      src: string;
      alt: string;
      /** Above the fold: marks the image as an LCP candidate. */
      priority?: boolean;
      /**
       * Reframes the photograph inside its panel. `zoom` scales the covered
       * image and `focus` is the point it grows around, in object-position
       * syntax; the same value anchors the cover crop, so the subject holds
       * still instead of drifting as the zoom rises.
       *
       * A row's panel is already the exact height of the photograph under
       * `object-fit: cover`, so there is no spare image to pan into: moving
       * the framing up costs a little zoom. That is what this is for.
       */
      crop?: { zoom: number; focus: string };
    }
  | {
      kind: "text";
      span: number;
      /**
       * What this panel is about. The wall does not know how to draw it; the
       * caller passes a renderer keyed by this id, so the layout stays pure
       * data and the content stays in the component layer.
       */
      id: string;
      tone: GalleryTone;
    };

export type GalleryRow = {
  /** Stable key. Usually the item, or the pair, the row is about. */
  id: string;
  panels: GalleryPanel[];
};

/**
 * Every row must divide GALLERY_COLUMNS exactly. A row that sums to less
 * leaves a strip of background showing through the wall; one that sums to more
 * silently pushes a panel onto a second grid line and breaks the row height.
 * Neither is visible in a unit test unless it is asserted, so callers assert it
 * (see tests/unit/homeGallery.test.ts).
 */
export function rowSpanTotal(row: GalleryRow): number {
  return row.panels.reduce((total, panel) => total + panel.span, 0);
}

export function findBadRows(rows: readonly GalleryRow[]): GalleryRow[] {
  return rows.filter((row) => rowSpanTotal(row) !== GALLERY_COLUMNS);
}
