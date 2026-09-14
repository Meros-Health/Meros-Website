import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listBowls, listSmoothies } from "@/lib/menu/signatures";

// The menu lists (components/menu/SignatureList.tsx) draw one product photo
// per item and, on phones, a top-down cut-out where one still matches the
// item as built. These rules are data rules on menu.json, so they are
// asserted here rather than discovered on the page.

const PUBLIC = path.join(process.cwd(), "public");
const items = [...listBowls(), ...listSmoothies()];

// The two bowls whose cut-out still matches the bowl as built. Every other
// cut-out predates the 2026-09-10 recipe changes and must not be shown.
const CUT_OUTS = ["moment", "silk"];

// The items whose product photo the home page hangs beside its lists
// (SignatureMenuSection.HOME_PHOTOS).
const HOME_PHOTOS = { bowl: ["moment", "silk"], smoothie: ["glow", "cabana"] };

describe("signature photography", () => {
  it("gives every signature a product photo that exists", () => {
    for (const item of items) {
      expect(item.images?.photo, item.id).toMatch(/^\/images-web\/Signature\/[a-z-]+\.jpg$/);
      expect(existsSync(path.join(PUBLIC, item.images!.photo)), item.images!.photo).toBe(true);
    }
  });

  it("keeps a cut-out only on the bowls it still matches", () => {
    const withCutOut = items.filter((item) => item.images?.transparent).map((item) => item.id);
    expect(withCutOut.sort()).toEqual([...CUT_OUTS].sort());
    for (const item of items) {
      if (item.images?.transparent) expect(existsSync(path.join(PUBLIC, item.images.transparent))).toBe(true);
    }
  });

  it("names real items, two of each category, for the home page's photos", () => {
    const bowls = new Set(listBowls().map((b) => b.id));
    const smoothies = new Set(listSmoothies().map((s) => s.id));
    expect(HOME_PHOTOS.bowl).toHaveLength(2);
    expect(HOME_PHOTOS.smoothie).toHaveLength(2);
    for (const id of HOME_PHOTOS.bowl) expect(bowls.has(id), id).toBe(true);
    for (const id of HOME_PHOTOS.smoothie) expect(smoothies.has(id), id).toBe(true);
  });
});
