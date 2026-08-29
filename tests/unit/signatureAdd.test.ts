// What a "+" does per item: bowls (sizes to choose, no default yogurt) go to
// the add modal; smoothies (one size, vanilla) add outright. Runs against the
// real menu.json.
import { describe, expect, it, vi } from "vitest";
import { addSignatureDirect, needsConfiguration, startingPrice } from "@/lib/menu/signatureAdd";
import { getSignatureItem } from "@/lib/menu/signatures";

const moment = () => getSignatureItem("moment")!;
const rise = () => getSignatureItem("rise")!;

describe("needsConfiguration", () => {
  it("is true for a bowl (two sizes, no default yogurt) and false for a smoothie", () => {
    expect(needsConfiguration(moment())).toBe(true);
    expect(needsConfiguration(rise())).toBe(false);
  });
});

describe("addSignatureDirect", () => {
  it("adds a smoothie at its only size with its default yogurt", () => {
    const addItem = vi.fn(() => "added" as const);
    expect(addSignatureDirect(rise(), addItem)).toBe("added");
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "signature",
        productId: "rise",
        size: { id: "standard", label: expect.any(String) },
        base: "vanilla-greek-yogurt",
        quantity: 1,
        unitPrice: 15,
      })
    );
  });

  it("refuses a bowl, which has no default yogurt, without touching the cart", () => {
    const addItem = vi.fn(() => "added" as const);
    expect(addSignatureDirect(moment(), addItem)).toBe("invalid");
    expect(addItem).not.toHaveBeenCalled();
  });
});

describe("startingPrice", () => {
  it("is the lowest size for a bowl, marked From, and the one price for a smoothie", () => {
    expect(startingPrice(moment())).toEqual({ price: 12, from: true });
    expect(startingPrice(rise())).toEqual({ price: 15, from: false });
  });
});
