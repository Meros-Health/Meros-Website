// @vitest-environment node
//
// The wall is layout data, and layout data rots quietly: a row that no longer
// divides the columns leaves a strip of background showing, a photo path that
// outlives its file renders a dark rectangle, and a new bowl added to menu.json
// simply never appears. None of that throws, and none of it is visible without
// opening the page, so all three are assertions instead.
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GALLERY_COLUMNS,
  GALLERY_TEXT_SPAN,
  findBadRows,
  rowSpanTotal,
  type GalleryRow,
} from "@/lib/gallery/types";
import {
  BOWL_ROWS,
  HOME_MENU_ROWS,
  MENU_ROWS,
  SMOOTHIE_ROWS,
  MENU_TEXT_ONLY_IDS,
  galleryItem,
  galleryItemIds,
} from "@/lib/menu/menuGallery";
import { getSignatureItem, listBowls, listSmoothies } from "@/lib/menu/signatures";

const PUBLIC = path.resolve(__dirname, "../../public");

const imagePanels = (rows: readonly GalleryRow[]) =>
  rows.flatMap((row) => row.panels.flatMap((p) => (p.kind === "image" ? [{ row: row.id, ...p }] : [])));

describe("every row divides the twenty-four columns", () => {
  it("leaves no row short or over", () => {
    expect(findBadRows(MENU_ROWS).map((r) => `${r.id}=${rowSpanTotal(r)}`)).toEqual([]);
  });

  it("puts two or three panels in a row, never one and never four", () => {
    const wrong = MENU_ROWS.filter((r) => r.panels.length < 2 || r.panels.length > 3);
    expect(wrong.map((r) => `${r.id} has ${r.panels.length}`)).toEqual([]);
  });

  it("gives no panel fewer than six of the twenty-four columns", () => {
    // A 4/24 panel is 150px at the collapse threshold. Text is unreadable and a
    // photograph is a sliver; both are the reason the wall collapses instead.
    const thin = MENU_ROWS.flatMap((r) => r.panels.filter((p) => p.span < 6).map(() => r.id));
    expect(thin, "rows with a panel under 6/24").toEqual([]);
    expect(GALLERY_COLUMNS).toBe(24);
  });
});

describe("the leading column", () => {
  // The readability rule the wall is built on: the name of every item is in the
  // same place in every row, at the same width, so the page can be read down
  // its leading edge. It is a property of the row data and nothing in CSS
  // enforces it, so a row added with its photograph first would simply be
  // crooked and no other test would notice.
  const photographRows = MENU_ROWS.filter((r) => r.panels.some((p) => p.kind === "image"));

  it("opens every photographed row with its block of type", () => {
    const wrong = photographRows.filter((r) => r.panels[0].kind !== "text");
    expect(wrong.map((r) => r.id), "rows that do not lead with type").toEqual([]);
  });

  it("gives that panel the same width in every row", () => {
    const widths = photographRows.map((r) => `${r.id}=${r.panels[0].span}`);
    expect(widths.filter((w) => !w.endsWith(`=${GALLERY_TEXT_SPAN}`))).toEqual([]);
  });

  it("keeps the two photographs beside it asymmetric", () => {
    // The point of twenty-four columns. Equal halves of the remaining sixteen
    // would make the wall a grid, which is the layout it exists instead of.
    const even = photographRows.filter((r) => r.panels[1].span === r.panels[2].span);
    expect(even.map((r) => r.id), "rows whose photographs are the same width").toEqual([]);
  });

  it("alternates tone down that column", () => {
    // Dark, light, dark, light, read straight down the page. A type-only row
    // has no photographs to divide, so its leading half takes the row's turn
    // and its other half takes the opposite.
    const leading = MENU_ROWS.map((r) => (r.panels[0].kind === "text" ? r.panels[0].tone : null));
    expect(leading, "a row whose first panel is not type").not.toContain(null);
    const repeats = leading.filter((tone, i) => i > 0 && tone === leading[i - 1]);
    expect(repeats, "two rows running with the same leading tone").toEqual([]);
  });
});

describe("the wall against the menu", () => {
  it("names every signature exactly once", () => {
    const onMenu = [...listBowls(), ...listSmoothies()].map((i) => i.id).sort();
    const onWall = galleryItemIds().sort();
    // A new bowl in menu.json with no row here would simply not exist on the
    // page, and nothing else would notice.
    expect(onWall).toEqual(onMenu);
  });

  it("keeps bowls and smoothies in their own halves", () => {
    expect(galleryItemIds(BOWL_ROWS).sort()).toEqual(listBowls().map((i) => i.id).sort());
    expect(galleryItemIds(SMOOTHIE_ROWS).sort()).toEqual(listSmoothies().map((i) => i.id).sort());
  });

  it("resolves every text panel to a real item", () => {
    for (const id of galleryItemIds()) expect(() => galleryItem(id)).not.toThrow();
  });
});

describe("photographs", () => {
  it("ships every image the wall asks for", () => {
    const missing = imagePanels(MENU_ROWS).filter((p) => !existsSync(path.join(PUBLIC, p.src)));
    expect(missing.map((p) => `${p.row}: ${p.src}`), "panels pointing at a file that is not in public/").toEqual([]);
  });

  it("never gives an image panel to an item that has never been photographed", () => {
    // The hard rule, on every wall: a photo panel for The Seasonal would be a
    // picture of a different bowl. This is read from menu.json, not from an
    // editorial list, so a new unshot item is covered the day it is added.
    const unshot = [...listBowls(), ...listSmoothies()].filter((i) => !i.images).map((i) => i.id);
    expect(unshot, "expected The Seasonal to be the unphotographed one").toContain("seasonal");
    for (const id of unshot) {
      const named = [...imagePanels(MENU_ROWS), ...imagePanels(HOME_MENU_ROWS)].filter((p) =>
        p.src.toLowerCase().includes(id)
      );
      expect(named.map((p) => p.src), `${id} has no photographs to show`).toEqual([]);
    }
  });

  it("keeps the /menu wall's four type-only items free of photographs there", () => {
    // The soft rule, and only on /menu: an editorial cut for pacing. Three of
    // the four do have photographs, and the home page uses two of them.
    for (const id of MENU_TEXT_ONLY_IDS) {
      const named = imagePanels(MENU_ROWS).filter((p) => p.src.toLowerCase().includes(id));
      expect(named.map((p) => p.src), `${id} should be type only on /menu`).toEqual([]);
    }
  });

  it("marks one photograph as the LCP candidate", () => {
    const priority = imagePanels(MENU_ROWS).filter((p) => p.priority);
    // Marking more than one image high-priority makes them compete with each
    // other and moves LCP later, not earlier. It is the first row's first
    // photograph, which is also the only one of that row's two the phone
    // layout shows: a preload runs before any display rule, so marking the
    // second would download a photograph no phone ever renders.
    expect(priority.map((p) => `${p.row}:${p.src}`)).toEqual([
      `${BOWL_ROWS[0].id}:/images-web/Bowls/Moment-1.jpg`,
    ]);
  });

  it("writes alt text from the item's own name", () => {
    for (const panel of imagePanels(MENU_ROWS)) {
      expect(panel.alt.length, `${panel.src} has no alt`).toBeGreaterThan(0);
      expect(panel.alt.startsWith("The "), `${panel.src} alt should name the item`).toBe(true);
    }
  });
});

describe("the home page's preview wall", () => {
  it("divides the twenty-four columns in every row", () => {
    expect(findBadRows(HOME_MENU_ROWS).map((r) => `${r.id}=${rowSpanTotal(r)}`)).toEqual([]);
  });

  it("follows the same leading-type-panel rule as /menu", () => {
    for (const row of HOME_MENU_ROWS) {
      const first = row.panels[0];
      expect(first.kind, `${row.id} does not lead with type`).toBe("text");
      expect(first.span, `${row.id} leads with the wrong width`).toBe(GALLERY_TEXT_SPAN);
    }
  });

  it("previews rather than reprints the menu", () => {
    // A preview that shows everything makes /menu a page with nothing on it the
    // home page has not already shown.
    const previewed = galleryItemIds(HOME_MENU_ROWS);
    expect(previewed.length).toBeLessThan(galleryItemIds(MENU_ROWS).length);
    expect(new Set(previewed).size, "an item previewed twice").toBe(previewed.length);
  });

  it("shows both bowls and smoothies", () => {
    const categories = new Set(galleryItemIds(HOME_MENU_ROWS).map((id) => galleryItem(id).category));
    expect([...categories].sort()).toEqual(["bowl", "smoothie"]);
  });

  it("names only items that are on the menu, with photographs that exist", () => {
    for (const id of galleryItemIds(HOME_MENU_ROWS)) expect(() => galleryItem(id)).not.toThrow();
    const missing = imagePanels(HOME_MENU_ROWS).filter((p) => !existsSync(path.join(PUBLIC, p.src)));
    expect(missing.map((p) => `${p.row}: ${p.src}`)).toEqual([]);
  });

  it("shows all four bestsellers with photographs", () => {
    // The /menu wall cuts four items to type for pacing. The home page does not
    // inherit that: this is where a first-time visitor decides whether they want
    // any of it, and two of the four bestsellers are on that cut list.
    for (const row of HOME_MENU_ROWS) {
      const images = row.panels.filter((p) => p.kind === "image");
      expect(images.length, `${row.id} shows no photograph`).toBe(2);
    }
  });
});
