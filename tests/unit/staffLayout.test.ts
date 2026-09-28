// @vitest-environment node
//
// The staff portal's layout rule, set by Thomas 2026-09-27 after the ordering
// log started feeding order history onto the inventory board: nothing in the
// portal may be sized by the length of the text in it. A name three characters
// longer must not move the price, and a field nobody filled in has to leave a
// gap exactly where its value would have been, because staff read these pages
// by position rather than by reading them.
//
// What that comes down to in code is the column template in
// lib/design/staffLayout.ts, and this test holds it to the rule: every
// track it declares from md up is an absolute length, and the only flexible
// one is the name. A track that sizes itself to its contents (`auto`,
// `min-content`, `max-content`, `fit-content`) is exactly the drift the rule
// exists to stop, and it is one word to reintroduce.
//
// Phones are the documented exception. A phone shows the name, the status chips
// and the "-": no second column to stay aligned with, and the name is worth the
// space that rigid tracks would take from it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";
import { BOARD_GRID, CARD_FIELDS, STAFF_PAGE } from "../../lib/design/staffLayout";

/** The three `grid-cols-[...]` templates in BOARD_GRID, by breakpoint. */
function templates(): Record<"base" | "md" | "xl", string[]> {
  const found: Partial<Record<"base" | "md" | "xl", string[]>> = {};
  for (const token of BOARD_GRID.split(/\s+/)) {
    const match = /^(?:(md|xl):)?grid-cols-\[(.+)\]$/.exec(token);
    if (!match) continue;
    const tier = (match[1] ?? "base") as "base" | "md" | "xl";
    // Underscores separate tracks; minmax() carries its own comma.
    found[tier] = match[2].split("_");
  }
  expect(Object.keys(found).sort()).toEqual(["base", "md", "xl"]);
  return found as Record<"base" | "md" | "xl", string[]>;
}

const CONTENT_SIZED = /^(auto|min-content|max-content|fit-content\(.*\))$/;

describe("the staff board's columns", () => {
  it("drops columns between tiers rather than sharing them out", () => {
    const tiers = templates();
    // name, status, remove | + ordered, delivered | + pack, price, supplier
    expect(tiers.base).toHaveLength(3);
    expect(tiers.md).toHaveLength(5);
    expect(tiers.xl).toHaveLength(8);
  });

  it("gives the name the only elastic track, at every tier", () => {
    for (const tracks of Object.values(templates())) {
      // minmax(0, ...) so a long name truncates instead of widening the column.
      expect(tracks[0]).toMatch(/^minmax\(0,(1fr|\d+(\.\d+)?rem)\)$/);
      expect(tracks.slice(1).filter((track) => track.includes("fr"))).toEqual([]);
    }
  });

  it("sizes no column from md up by what is in it", () => {
    const tiers = templates();
    for (const tier of ["md", "xl"] as const) {
      const offenders = tiers[tier].slice(1).filter((track) => CONTENT_SIZED.test(track));
      expect(
        offenders,
        `${tier}: a content-sized track moves every field beside it. Give it a length.`
      ).toEqual([]);
    }
  });

  it("keeps the phone exception to the two tracks that need it", () => {
    // Documented in lib/design/staffLayout.ts: a phone has no second column to align with.
    expect(templates().base.slice(1)).toEqual(["auto", "auto"]);
  });

  it("is the only column template the board lays rows out on", () => {
    // A hand-rolled copy in the component is how the header row and the item
    // rows stop agreeing, which is the one failure nobody notices in review.
    const source = readFileSync("components/staff/InventoryBoard.tsx", "utf8");
    const declared = new Set([...source.matchAll(/grid-cols-\[[^\]]+\]/g)].map((m) => m[0]));
    // The band's own header is the one other template: a fixed title slot, the
    // add button beside it, then the count. Rows come from BOARD_GRID.
    expect([...declared].sort()).toEqual([
      "grid-cols-[11rem_auto_minmax(0,1fr)]",
      "grid-cols-[minmax(0,1fr)_auto]",
    ]);
  });
});

describe("the templates' classes", () => {
  it("are somewhere tailwind actually scans", () => {
    // The one failure mode of keeping class strings in lib/: Tailwind generated
    // nothing for them, the build passed, the page rendered, and every row
    // collapsed into a single column. Caught once (2026-09-27) by diffing the
    // compiled CSS. This is cheaper than remembering to.
    const content = config.content as string[];
    expect(content).toContain("./lib/**/*.{js,ts,jsx,tsx,mdx}");
    // And the strings themselves have to be literal, since the scanner reads
    // source text: a template assembled at runtime is invisible to it.
    for (const literal of [...BOARD_GRID.split(/\s+/), ...CARD_FIELDS.split(/\s+/)]) {
      expect(literal).not.toMatch(/[${}`]/);
    }
  });
});

describe("the staff pages", () => {
  it("run edge to edge", () => {
    expect(STAFF_PAGE).toContain("w-full");
    expect(STAFF_PAGE).not.toMatch(/max-w-|mx-auto/);
  });

  it("carry no column of their own to undo it", () => {
    // The shell is the width. A max-w- inside either surface would be a second
    // opinion about it, which is how /staff/ordering ended up narrower than
    // /staff in the first place.
    for (const file of ["components/staff/InventoryBoard.tsx", "components/staff/OrderLog.tsx"]) {
      const source = readFileSync(file, "utf8");
      const offenders = [...source.matchAll(/max-w-(?!prose|md\b)[\w[\]().-]+/g)].map((m) => m[0]);
      expect(offenders, `${file}: the page shell owns the width`).toEqual([]);
    }
  });
});
