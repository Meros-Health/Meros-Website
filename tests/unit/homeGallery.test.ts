// @vitest-environment node
//
// The home wall's failure modes are the menu wall's, plus one of its own: it is
// the only index of where the home page sends a visitor, so a panel pointing at
// a route that no longer exists is a dead end on the busiest page on the site.
//
// The section is two kinds of thing now: HOME_PROMOS, the photographs that
// carry a button and no type, and HOME_PANELS, the blocks of type in the wall
// under them. Route coverage has to span both, because /menu and /build are
// reachable from this page only through a promo.
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findBadRows, rowSpanTotal } from "@/lib/gallery/types";
import { HOME_PANELS, HOME_PROMOS, HOME_ROWS, homeDestinations, homePanel } from "@/lib/home/homeGallery";
import { NAV_LINKS } from "@/lib/nav";

const PUBLIC = path.resolve(__dirname, "../../public");

const panels = HOME_ROWS.flatMap((row) => row.panels.map((panel) => ({ row: row.id, ...panel })));
const textPanels = panels.flatMap((p) => (p.kind === "text" ? [p] : []));
const imagePanels = panels.flatMap((p) => (p.kind === "image" ? [p] : []));

// Every photograph the section renders, wall panels and promos alike.
const photographs = [
  ...imagePanels.map((p) => ({ where: p.row, src: p.src, alt: p.alt })),
  ...HOME_PROMOS.map((p) => ({ where: `promo:${p.id}`, src: p.src, alt: p.alt })),
];

describe("layout", () => {
  it("divides the twenty-four columns in every row", () => {
    expect(findBadRows(HOME_ROWS).map((r) => `${r.id}=${rowSpanTotal(r)}`)).toEqual([]);
  });

  it("uses each panel exactly once and defines every one it uses", () => {
    const used = textPanels.map((p) => p.id).sort();
    expect(used).toEqual(HOME_PANELS.map((p) => p.id).sort());
    for (const id of used) expect(() => homePanel(id)).not.toThrow();
  });

  it("puts two promos in the band, because the band is one row of two halves", () => {
    // The band is a flex pair in CSS, not row data, so nothing else asserts it.
    expect(HOME_PROMOS).toHaveLength(2);
  });

  it("ships every photograph the section asks for", () => {
    const missing = photographs.filter((p) => !existsSync(path.join(PUBLIC, p.src)));
    expect(missing.map((p) => `${p.where}: ${p.src}`)).toEqual([]);
  });

  it("gives every photograph alt text", () => {
    expect(photographs.filter((p) => !p.alt.trim()).map((p) => p.src)).toEqual([]);
  });
});

describe("where the section sends people", () => {
  it("points every destination at a route this site actually has", () => {
    // "/#footer" is the home page's own contact block, not a route.
    const routes = new Set([...NAV_LINKS.map((l) => l.href), "/#footer"]);
    const dead = homeDestinations().filter((cta) => !routes.has(cta.href));
    expect(dead.map((cta) => `${cta.label} -> ${cta.href}`), "destinations off the route map").toEqual([]);
  });

  it("names every nav destination except home", () => {
    // The section is the home page's index of where to go next. A route in the
    // nav and nowhere on the home page is a page only the menu button can reach.
    const offered = new Set(homeDestinations().map((cta) => cta.href));
    const missing = NAV_LINKS.filter((l) => l.href !== "/" && !offered.has(l.href));
    expect(missing.map((l) => l.href), "nav routes the home section never mentions").toEqual([]);
  });
});

describe("house style", () => {
  it("makes no comparative or superlative claim", () => {
    const copy = [
      ...HOME_PANELS.flatMap((p) => [p.title, p.body, p.detail ?? "", p.cta.label]),
      ...HOME_PROMOS.map((p) => p.cta.label),
    ];
    const banned = /\bbest\b|\bcheapest\b|\bseamless\b|\beffortless\b|\bendless\b|\bunlike\b|\brevolutionary\b/i;
    expect(copy.filter((line) => banned.test(line))).toEqual([]);
  });
});
