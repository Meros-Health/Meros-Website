// The yogurt under a signature: what the menu offers, what an item defaults
// to, how a persisted choice is sanitized, and the caption every surface
// prints. Runs against the real menu.json, so the ids below are real.
import { describe, expect, it } from "vitest";
import { loadWithMenu } from "./helpers/menuVariant";
import {
  formatBaseCaption,
  formatBaseChoice,
  getBaseSurcharge,
  getDefaultBaseId,
  isBaseOffered,
  isBaseRequired,
  listBaseOptions,
  sanitizeBaseId,
} from "@/lib/menu/signatureBase";
import { getSignatureItem, listBowls, listSmoothies } from "@/lib/menu/signatures";

const moment = () => getSignatureItem("moment")!;
const rise = () => getSignatureItem("rise")!;

describe("what the menu offers", () => {
  it("lists the Base step's options with the board's short names, surcharged last", () => {
    expect(listBaseOptions().map((o) => [o.id, o.shortName, o.surcharge])).toEqual([
      ["plain-greek-yogurt", "Plain", 0],
      ["vanilla-greek-yogurt", "Vanilla", 0],
      ["high-protein-yogurt", "High Protein", 0],
      ["vegan-coconut-yogurt", "Vegan Coconut", 2],
    ]);
    expect(isBaseOffered("vegan-coconut-yogurt")).toBe(true);
    expect(isBaseOffered("blueberries")).toBe(false);
    expect(getBaseSurcharge("vegan-coconut-yogurt")).toBe(2);
    expect(getBaseSurcharge("plain-greek-yogurt")).toBe(0);
    expect(getBaseSurcharge("nope")).toBe(0);
  });

  it("keeps every recipe free of a base", () => {
    for (const item of [...listBowls(), ...listSmoothies()]) {
      for (const id of item.recipe) expect(isBaseOffered(id), `${item.id} recipe names ${id}`).toBe(false);
    }
  });
});

describe("defaults", () => {
  it("bowls have no default and require a choice; smoothies default to the category base", () => {
    expect(getDefaultBaseId(moment())).toBeUndefined();
    expect(isBaseRequired(moment())).toBe(true);
    expect(getDefaultBaseId(rise())).toBe("vanilla-greek-yogurt");
    expect(isBaseRequired(rise())).toBe(false);
  });

  it("an item's own base wins over its category default, when the menu offers it", () => {
    expect(getDefaultBaseId({ ...rise(), base: "plain-greek-yogurt" })).toBe("plain-greek-yogurt");
    expect(getDefaultBaseId({ ...moment(), base: "high-protein-yogurt" })).toBe("high-protein-yogurt");
    // A base the step no longer offers falls through to the category default.
    expect(getDefaultBaseId({ ...rise(), base: "gone" })).toBe("vanilla-greek-yogurt");
    expect(getDefaultBaseId({ ...moment(), base: "gone" })).toBeUndefined();
  });
});

describe("sanitizeBaseId", () => {
  it("keeps an offered id, falls back to the default, and leaves a bowl unset otherwise", () => {
    expect(sanitizeBaseId(moment(), "vegan-coconut-yogurt")).toBe("vegan-coconut-yogurt");
    expect(sanitizeBaseId(rise(), "plain-greek-yogurt")).toBe("plain-greek-yogurt");
    for (const raw of [undefined, null, "", "nope", "blueberries", 7, {}, ["plain-greek-yogurt"]]) {
      expect(sanitizeBaseId(moment(), raw)).toBeUndefined();
      expect(sanitizeBaseId(rise(), raw)).toBe("vanilla-greek-yogurt");
    }
  });
});

describe("caption", () => {
  it("matches the board: bowls ask, smoothies say what they are made with, surcharge last", () => {
    expect(formatBaseCaption(moment())).toBe("Choose your yogurt · Plain, Vanilla, High Protein or Vegan Coconut +$2");
    expect(formatBaseCaption(rise())).toBe("Made with Vanilla Greek Yogurt · Swap for Plain, High Protein or Vegan Coconut +$2");
    expect(formatBaseChoice(listBaseOptions().find((o) => o.id === "vegan-coconut-yogurt")!)).toBe("Vegan Coconut +$2");
  });

  it("follows a per-item base override", () => {
    expect(formatBaseCaption({ ...rise(), base: "plain-greek-yogurt" })).toBe(
      "Made with Plain Greek Yogurt · Swap for Vanilla, High Protein or Vegan Coconut +$2"
    );
  });

  it("is derived from the step, so a price or name change in menu.json changes the sentence", async () => {
    const { menu } = await loadWithMenu((m) => {
      const step = m.build.steps.find((s: { id: string }) => s.id === "base");
      step.options.find((o: { ingredientId: string }) => o.ingredientId === "vegan-coconut-yogurt").surcharge = 2.5;
      m.ingredients.find((i: { id: string }) => i.id === "high-protein-yogurt").shortName = "0% Fat";
    });
    expect(menu.build.steps[0].options[2].surcharge).toBe(2.5);
    const base = await import("@/lib/menu/signatureBase");
    const signatures = await import("@/lib/menu/signatures");
    expect(base.formatBaseCaption(signatures.getSignatureItem("moment")!)).toBe(
      "Choose your yogurt · Plain, Vanilla, 0% Fat or Vegan Coconut +$2.50"
    );
  });
});
