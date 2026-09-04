// The home page's closing wall: two photographs over two panels of type.
//
// What it is for. The page closes on the four places a visitor can go next.
// Two of them, the menu and the builder, are photographed and carry nothing
// but a button; the other two, catering and the store, are type. That split is
// not decorative. Catering has never been shot and neither has the store, so a
// photograph there would be a picture of something else captioned as if it
// were the thing. The menu wall makes the same call for four of its items.
//
// Why the promos are not text panels. A wall of six panels all doing the same
// job reads as busy: nothing in it is more important than anything else. Two
// full-bleed images with a single button each, over a row of type, gives the
// section a top and a bottom.
import type { GalleryRow } from "@/lib/gallery/types";
import { BUSINESS, hoursDisplay } from "@/lib/business";

export interface HomeCta {
  readonly label: string;
  readonly href: string;
}

export interface HomePanel {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  /** A second, quieter line: prices, hours, an address. */
  readonly detail?: string;
  readonly cta: HomeCta;
}

/** A photograph with a button on it, and no type of its own. */
export interface HomePromo {
  readonly id: string;
  readonly src: string;
  readonly alt: string;
  readonly cta: HomeCta;
}

const { street, neighbourhood, city } = BUSINESS.address;

// The band above the wall. Both images are held-in-hand shots, which is the
// only pairing on file that shows the two products at the same distance: a
// counter shot next to a hand shot reads as two different sites.
export const HOME_PROMOS: readonly HomePromo[] = [
  {
    id: "menu",
    src: "/images-web/Smoothies/Hand-Smoothie-5.jpg",
    alt: "A Meros smoothie held in hand",
    cta: { label: "See the menu", href: "/menu" },
  },
  {
    id: "build",
    src: "/images-web/Bowls/Hand-Bowl-5.jpg",
    alt: "A Meros bowl held in hand",
    cta: { label: "Build a bowl", href: "/build" },
  },
] as const;

export const HOME_PANELS: readonly HomePanel[] = [
  {
    id: "catering",
    title: "Catering",
    body: "Yogurt in volume for offices, meetings and events across Vancouver, delivered ready to serve. Tell us the headcount and the date and we will quote it.",
    cta: { label: "Catering", href: "/catering" },
  },
  {
    id: "visit",
    title: `${neighbourhood}, ${city}`,
    body: `${street}, a block off the seawall. Everything is built to order at the counter.`,
    detail: `Open every day, ${hoursDisplay()}`,
    cta: { label: "Find us", href: "/#footer" },
  },
] as const;

export const HOME_PANELS_BY_ID = new Map(HOME_PANELS.map((panel) => [panel.id, panel]));

export function homePanel(id: string): HomePanel {
  const panel = HOME_PANELS_BY_ID.get(id);
  if (!panel) throw new Error(`Home gallery names "${id}", which has no panel`);
  return panel;
}

/** Every route the closing section offers, photographs and type alike. */
export function homeDestinations(): readonly HomeCta[] {
  return [...HOME_PROMOS.map((p) => p.cta), ...HOME_PANELS.map((p) => p.cta)];
}

// One row, split half and half, both cream, each block centred in its own half.
//
// Why not stacked, and why no divider. The photographs above stand in a cream
// frame with a gutter between them; a flush seam under that gutter put a
// hairline down the middle of a band of cream, two dividers at the same x
// doing the same job at different weights. Centring each block inside its half
// solves it without drawing anything: the space around the type is what marks
// the two apart, so there is no second seam to align with the first.
//
// Why neither is midnight. The footer is midnight, so a dark panel last runs
// straight into it with only the footer's half-pixel hairline between them and
// the section appears to end early. Cream throughout gives the footer an edge
// to start at, and the page closes on the ground it opened on.
export const HOME_ROWS: GalleryRow[] = [
  {
    id: "catering-visit",
    panels: [
      // Twelve of the wall's twenty-four columns each. This wall does not
      // follow the menu wall's leading-type-panel rule: it has no photographs
      // to divide, so there is nothing for a fixed first column to line up
      // against. It keeps its own type scale for the same reason (see
      // .gallery-centered in app/globals.css).
      { kind: "text", span: 12, id: "catering", tone: "cream" },
      { kind: "text", span: 12, id: "visit", tone: "cream" },
    ],
  },
];
