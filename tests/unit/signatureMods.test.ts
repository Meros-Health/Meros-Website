// Additions and removals on signature items: what the menu allows, how a
// payload is sanitized, and what an addition costs. Runs against the real
// menu.json, so the ids below are real recipe and builder ids.
import { describe, expect, it } from "vitest";
import {
  MAX_ADDITIONS,
  MAX_REMOVALS,
  calcSignaturePrice,
  formatSignatureMods,
  getSignatureModsKey,
  hasMods,
  isAddable,
  isRemovable,
  listAddableGroups,
  listRemovableIds,
  sanitizeSignatureMods,
} from "@/lib/menu/signatureMods";
import { getSignatureItem } from "@/lib/menu/signatures";

const moment = () => getSignatureItem("moment")!;
const rise = () => getSignatureItem("rise")!;

describe("what the menu allows", () => {
  it("offers every multi-select builder option the recipe does not already contain", () => {
    const groups = listAddableGroups(moment());
    expect(groups.map((g) => g.step.id)).toEqual(["fruits", "nuts-seeds", "finishes", "enhancers"]);
    const fruitIds = groups[0].ingredients.map((i) => i.id);
    expect(fruitIds).toContain("mangoes");
    // Already in The Moment.
    expect(fruitIds).not.toContain("blueberries");
    expect(fruitIds).not.toContain("strawberries");
    expect(fruitIds).not.toContain("bananas");
  });

  it("never offers the base as an addition", () => {
    expect(isAddable(moment(), "vanilla-greek-yogurt")).toBe(false);
    expect(isAddable(moment(), "plain-greek-yogurt")).toBe(false);
  });

  it("never offers a recipe-only ingredient as an addition (nothing prices it)", () => {
    // Almond butter is in The Rise and The Focus but not in any builder step.
    expect(isAddable(moment(), "almond-butter")).toBe(false);
  });

  it("lets every recipe ingredient be removed, recipe-only ones included; the yogurt is not in the recipe", () => {
    const removable = listRemovableIds(moment());
    expect(removable).toEqual(moment().recipe);
    expect(removable).not.toContain("plain-greek-yogurt");
    expect(removable).toContain("house-granola");
    expect(removable).toContain("toasted-almonds");
    expect(isRemovable(moment(), "mangoes")).toBe(false);
    expect(isRemovable(moment(), "plain-greek-yogurt")).toBe(false);
  });
});

describe("sanitizeSignatureMods", () => {
  it("drops unknown ids, ids the item cannot take, and duplicates", () => {
    const mods = sanitizeSignatureMods(moment(), {
      additions: ["mangoes", "nope", "blueberries", "plain-greek-yogurt", "mangoes", 42],
      removals: ["house-granola", "mangoes", "plain-greek-yogurt", "house-granola"],
    });
    expect(mods).toEqual({ additions: ["mangoes"], removals: ["house-granola"] });
  });

  it("keeps the first picks up to the caps", () => {
    const mods = sanitizeSignatureMods(moment(), {
      additions: ["mangoes", "pineapples", "grapes"],
      removals: ["house-granola", "bananas", "chia-seeds"],
    });
    expect(mods.additions).toHaveLength(MAX_ADDITIONS);
    expect(mods.additions).toEqual(["mangoes", "pineapples"]);
    expect(mods.removals).toHaveLength(MAX_REMOVALS);
    expect(mods.removals).toEqual(["house-granola", "bananas"]);
  });

  it("treats anything that is not an object as nothing", () => {
    for (const raw of [undefined, null, "x", 7, [], { additions: "mangoes" }]) {
      expect(sanitizeSignatureMods(moment(), raw)).toEqual({ additions: [], removals: [] });
    }
  });
});

describe("pricing", () => {
  it("charges the step's extra price per addition, on top of the signature price", () => {
    expect(calcSignaturePrice("moment", "medium")).toBe(12);
    expect(calcSignaturePrice("moment", "medium", { additions: ["mangoes"], removals: [] })).toBe(14);
    expect(calcSignaturePrice("moment", "large", { additions: ["mangoes"], removals: [] })).toBe(17);
    expect(calcSignaturePrice("moment", "medium", { additions: ["mangoes", "maca-powder"], removals: [] })).toBe(17);
    expect(calcSignaturePrice("moment", "medium", { additions: ["maca-powder", "matcha"], removals: [] })).toBe(18);
  });

  it("charges nothing for removals", () => {
    expect(calcSignaturePrice("moment", "medium", { additions: [], removals: ["house-granola", "bananas"] })).toBe(12);
  });

  it("prices a smoothie at its one size", () => {
    expect(calcSignaturePrice("rise", "standard", { additions: ["mangoes"], removals: [] })).toBe(17);
  });

  it("adds the chosen yogurt's surcharge on top, and nothing for a free yogurt or no choice", () => {
    expect(calcSignaturePrice("moment", "medium", undefined, "vegan-coconut-yogurt")).toBe(14);
    expect(calcSignaturePrice("moment", "large", undefined, "vegan-coconut-yogurt")).toBe(17);
    expect(calcSignaturePrice("moment", "medium", undefined, "plain-greek-yogurt")).toBe(12);
    expect(calcSignaturePrice("moment", "medium", undefined, undefined)).toBe(12);
    expect(calcSignaturePrice("rise", "standard", undefined, "vegan-coconut-yogurt")).toBe(17);
    // Yogurt surcharge and additions stack.
    expect(calcSignaturePrice("moment", "medium", { additions: ["mangoes"], removals: [] }, "vegan-coconut-yogurt")).toBe(16);
  });

  it("returns undefined, not 0, for an unknown item, size, addition, or yogurt", () => {
    expect(calcSignaturePrice("nope", "medium")).toBeUndefined();
    expect(calcSignaturePrice("moment", "huge")).toBeUndefined();
    expect(calcSignaturePrice("rise", "large")).toBeUndefined();
    expect(calcSignaturePrice("moment", "medium", { additions: ["nope"], removals: [] })).toBeUndefined();
    expect(calcSignaturePrice("moment", "medium", { additions: ["plain-greek-yogurt"], removals: [] })).toBeUndefined();
    expect(calcSignaturePrice("moment", "medium", undefined, "nope")).toBeUndefined();
    // A topping is not a yogurt, even though the menu offers it.
    expect(calcSignaturePrice("moment", "medium", undefined, "mangoes")).toBeUndefined();
  });
});

describe("key and display", () => {
  it("fingerprints independent of order and is empty when nothing changed", () => {
    const a = getSignatureModsKey({ additions: ["mangoes", "pineapples"], removals: ["bananas"] });
    const b = getSignatureModsKey({ additions: ["pineapples", "mangoes"], removals: ["bananas"] });
    expect(a).toBe(b);
    expect(getSignatureModsKey({ additions: ["mangoes"], removals: [] })).not.toBe(a);
    expect(getSignatureModsKey({ additions: [], removals: [] })).toBe("");
    expect(getSignatureModsKey(undefined)).toBe("");
    expect(hasMods(undefined)).toBe(false);
    expect(hasMods({ additions: [], removals: ["bananas"] })).toBe(true);
  });

  it("describes the change in registry names", () => {
    expect(formatSignatureMods({ additions: ["mangoes", "chia-seeds"], removals: ["house-granola", "bananas"] })).toBe(
      "Add Mangoes, Chia Seeds · No House Granola · No Bananas"
    );
    expect(formatSignatureMods({ additions: [], removals: ["bananas"] })).toBe("No Bananas");
    expect(formatSignatureMods(undefined)).toBe("");
    expect(rise().recipe).toContain("chia-seeds");
  });
});
