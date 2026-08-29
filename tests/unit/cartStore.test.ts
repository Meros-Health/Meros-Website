// The cart store against persisted payloads, the way the stress test's Node
// harness drove it. Case ids refer to docs/qa/ordering-stress-test-2026-08-26.md.
import { describe, expect, it, vi } from "vitest";
import { loadWithMenu } from "./helpers/menuVariant";
import {
  CART_KEY,
  EMPTY_NUTRITION,
  customLine,
  readPersistedItems,
  seedCart,
  signatureLine,
} from "./helpers/cartFixtures";

const plain = (lineId = "plain", extra = {}) =>
  customLine(lineId, "medium", { base: ["plain-greek-yogurt"] }, { unitPrice: 12, ...extra });
const vanilla = (lineId = "vanilla", extra = {}) =>
  customLine(lineId, "medium", { base: ["vanilla-greek-yogurt"] }, { unitPrice: 12, ...extra });

function customInput(selection: { sizeId: string; steps: Record<string, string[]> }, quantity = 1) {
  return {
    kind: "custom" as const,
    productId: "custom-bowl",
    name: "Custom Bowl",
    selection,
    nutrition: { ...EMPTY_NUTRITION },
    quantity,
    unitPrice: 0,
  };
}

describe("cart store: smoke", () => {
  it("adds a custom bowl, prices it from the menu, and persists it", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    store.getState().addItem(customInput({ sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } }));
    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().subtotal()).toBe(12);
    expect(readPersistedItems()).toHaveLength(1);
  });
});

describe("quantity edges", () => {
  it("A4: decrementing at 1 removes the line (the UI disables the button; the store floor is removal)", async () => {
    seedCart([plain()]);
    const { cartStore } = await loadWithMenu();
    cartStore.useCartStore.getState().decrementItem("plain");
    expect(cartStore.useCartStore.getState().items).toHaveLength(0);
  });

  it("A6: editing a bowl into a duplicate merges quantities under the 99 cap", async () => {
    seedCart([plain("a", { quantity: 60 }), vanilla("b", { quantity: 60 })]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    const result = store.getState().updateCustomBowl("b", { sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } });
    expect(result).toBe("merged");
    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().items[0].quantity).toBe(99);
  });

  it("A6: 99 + 1 stays at 99 on merge", async () => {
    seedCart([plain("a", { quantity: 99 }), vanilla("b", { quantity: 1 })]);
    const { cartStore } = await loadWithMenu();
    cartStore.useCartStore.getState().updateCustomBowl("b", { sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } });
    expect(cartStore.useCartStore.getState().items[0].quantity).toBe(99);
  });

  it("updateCustomBowl reports a missing line instead of silently doing nothing (A1 root cause)", async () => {
    seedCart([plain("a")]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    expect(store.getState().updateCustomBowl("gone", { sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } })).toBe("missing");
    expect(store.getState().updateCustomBowl("a", { sizeId: "large", steps: { base: ["plain-greek-yogurt"] } })).toBe("updated");
    expect(store.getState().items[0].unitPrice).toBe(15);
  });

  it("E2: updateQuantity ignores NaN and fractions", async () => {
    seedCart([plain("a")]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    store.getState().updateQuantity("a", NaN);
    expect(store.getState().items[0].quantity).toBe(1);
    store.getState().updateQuantity("a", 2.5);
    expect(store.getState().items[0].quantity).toBe(1);
    store.getState().updateQuantity("a", 500);
    expect(store.getState().items[0].quantity).toBe(99);
  });

  it("D1 / B3: adding at 99 stays at 99", async () => {
    seedCart([plain("a", { quantity: 99 })]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    store.getState().addItem(customInput({ sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } }));
    store.getState().incrementItem("a");
    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().items[0].quantity).toBe(99);
  });
});

describe("E1 / E1b: hydration never hangs", () => {
  it("E1: invalid JSON hydrates as an empty cart and clears the bad key", async () => {
    localStorage.setItem(CART_KEY, "{{{");
    const { cartStore } = await loadWithMenu();
    expect(cartStore.useCartStore.persist.hasHydrated()).toBe(true);
    expect(cartStore.useCartStore.getState().items).toEqual([]);
    expect(localStorage.getItem(CART_KEY)).toBeNull();
  });

  const envelopes: Array<[string, string]> = [
    ["literal null", "null"],
    ["a string", '"x"'],
    ["state as a string", JSON.stringify({ state: "x", version: 0 })],
    ["state null", JSON.stringify({ state: null, version: 0 })],
    ["items as an object", JSON.stringify({ state: { items: { a: 1 } }, version: 0 })],
    ["an array", "[1,2]"],
  ];
  for (const [label, raw] of envelopes) {
    it(`E1b: ${label} hydrates as an empty cart`, async () => {
      localStorage.setItem(CART_KEY, raw);
      const { cartStore } = await loadWithMenu();
      expect(cartStore.useCartStore.persist.hasHydrated()).toBe(true);
      expect(cartStore.useCartStore.getState().items).toEqual([]);
    });
  }

  it("E7: a storage write that throws does not throw out of addItem", async () => {
    const { cartStore } = await loadWithMenu();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    expect(() =>
      cartStore.useCartStore.getState().addItem(customInput({ sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } }))
    ).not.toThrow();
    expect(cartStore.useCartStore.getState().items).toHaveLength(1);
    spy.mockRestore();
  });
});

describe("E2 / E3 / I2: tampered lines on rehydrate", () => {
  it("E2 / I2: drops lines whose quantity is not an integer and clamps integers above 99", async () => {
    seedCart([
      plain("string", { quantity: "5" }),
      plain("negative", { quantity: -5 }),
      plain("fraction", { quantity: 2.7 }),
      plain("null", { quantity: null }),
      plain("huge", { quantity: 1e9 }),
      plain("abc", { quantity: "abc" }),
      plain("zero", { quantity: 0 }),
      plain("ok", { quantity: 3 }),
    ]);
    const { cartStore } = await loadWithMenu();
    const items = cartStore.useCartStore.getState().items;
    expect(items.map((i) => [i.lineId, i.quantity])).toEqual([
      ["huge", 99],
      ["ok", 3],
    ]);
    expect(cartStore.useCartStore.getState().subtotal()).toBe(12 * 102);
  });

  it("E3: duplicate lineIds are kept but get distinct ids", async () => {
    seedCart([plain("dup"), vanilla("dup")]);
    const { cartStore } = await loadWithMenu();
    const ids = cartStore.useCartStore.getState().items.map((i) => i.lineId);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toBe("dup");
  });

  it("E3: a numeric or missing lineId is replaced with a string id", async () => {
    seedCart([{ ...plain("x"), lineId: 42 }, { ...plain("y"), lineId: undefined }]);
    const { cartStore } = await loadWithMenu();
    for (const item of cartStore.useCartStore.getState().items) {
      expect(typeof item.lineId).toBe("string");
      expect(item.lineId.length).toBeGreaterThan(0);
    }
  });

  it("E4: an unknown kind is dropped", async () => {
    seedCart([{ ...plain("w"), kind: "weird" }, plain("ok")]);
    const { cartStore } = await loadWithMenu();
    expect(cartStore.useCartStore.getState().items.map((i) => i.lineId)).toEqual(["ok"]);
  });

  it("F5-25: unknown fields are not carried through rehydration", async () => {
    seedCart([{ ...plain("p"), pad: "x".repeat(1000), unitPrice: 0.01, name: "Evil" }]);
    const { cartStore } = await loadWithMenu();
    const item = cartStore.useCartStore.getState().items[0] as unknown as Record<string, unknown>;
    expect(item.pad).toBeUndefined();
    expect(item.unitPrice).toBe(12);
    expect(item.name).toBe("Custom Bowl · Plain Greek Yogurt · Medium");
  });

  it("ST-7: junk items, a custom line without a selection, and a missing nutrition block are handled", async () => {
    seedCart([null, "x", 7, { kind: "custom", quantity: 1 }, { ...signatureLine("s", "moment", "medium", 12), nutrition: undefined }]);
    const { cartStore } = await loadWithMenu();
    const items = cartStore.useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].nutrition).toEqual(EMPTY_NUTRITION);
  });
});

describe("E5 / E6: selection sanitizing on rehydrate (confirmed-correct, locked)", () => {
  it("E5: legacy catalog-object payloads migrate to v2", async () => {
    seedCart([
      {
        lineId: "legacy",
        kind: "custom",
        productId: "custom-bowl",
        name: "old",
        selection: { base: { id: "plain-greek-yogurt" }, toppings: [{ id: "strawberries" }, { id: "almonds" }] },
        nutrition: EMPTY_NUTRITION,
        quantity: 2,
        unitPrice: 99,
      },
    ]);
    const { cartStore } = await loadWithMenu();
    const item = cartStore.useCartStore.getState().items[0];
    expect(item.selection).toEqual({
      sizeId: "medium",
      steps: { base: ["plain-greek-yogurt"], fruits: ["strawberries"], "nuts-seeds": ["almonds"] },
    });
    expect(item.unitPrice).toBe(12);
    expect(item.quantity).toBe(2);
  });

  it("E5: prototype keys in steps are dropped harmlessly", async () => {
    localStorage.setItem(
      CART_KEY,
      '{"state":{"items":[{"lineId":"p","kind":"custom","productId":"custom-bowl","quantity":1,"unitPrice":12,"nutrition":{},"selection":{"sizeId":"medium","steps":{"base":["plain-greek-yogurt"],"__proto__":["x"],"constructor":["y"],"toString":["z"]}}}]},"version":0}'
    );
    const { cartStore } = await loadWithMenu();
    const item = cartStore.useCartStore.getState().items[0];
    expect(item.selection?.steps).toEqual({ base: ["plain-greek-yogurt"] });
  });

  it("E6: unknown ingredient dropped, unknown size falls back, over-selection truncated, duplicates deduped", async () => {
    seedCart([
      customLine("e6", "huge", {
        base: ["plain-greek-yogurt", "vanilla-greek-yogurt"],
        fruits: ["strawberries", "strawberries", "nope"],
      }),
    ]);
    const { cartStore } = await loadWithMenu();
    const item = cartStore.useCartStore.getState().items[0];
    expect(item.selection).toEqual({ sizeId: "medium", steps: { base: ["plain-greek-yogurt"], fruits: ["strawberries"] } });
    expect(item.unitPrice).toBe(12);
  });

  it("ST-12 (client): addItem dedupes ingredient ids before pricing", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    store.getState().addItem(
      customInput({ sizeId: "medium", steps: { base: ["plain-greek-yogurt"], fruits: Array(4).fill("strawberries") } })
    );
    expect(store.getState().items[0].selection?.steps.fruits).toEqual(["strawberries"]);
    expect(store.getState().items[0].unitPrice).toBe(12);
  });
});

describe("E9 / ST-11: persist envelope and migration timing", () => {
  it("E9: a version 0 envelope (today's carts) still loads", async () => {
    seedCart([plain("a")], 0);
    const { cartStore } = await loadWithMenu();
    expect(cartStore.useCartStore.getState().items).toHaveLength(1);
  });

  it("E9: an unknown future version still loads instead of hiding the cart", async () => {
    seedCart([plain("a")], 7);
    const { cartStore } = await loadWithMenu();
    expect(cartStore.useCartStore.getState().items).toHaveLength(1);
  });

  it("writes the current version and migrated items back on the first write", async () => {
    seedCart([plain("a", { unitPrice: 1 })], 0);
    const { cartStore } = await loadWithMenu();
    cartStore.useCartStore.getState().incrementItem("a");
    const raw = JSON.parse(localStorage.getItem(CART_KEY)!);
    expect(raw.version).toBe(1);
    expect(raw.state.items[0].unitPrice).toBe(12);
  });

  it("ST-11: subscribers never see unmigrated items", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    const seen: unknown[][] = [];
    store.subscribe((state) => seen.push(state.items));
    seedCart([plain("a", { quantity: 1e9, unitPrice: 1 }), plain("junk", { quantity: "x" })]);
    await store.persist.rehydrate();
    expect(seen.length).toBeGreaterThan(0);
    for (const items of seen) {
      expect(items).toHaveLength(1);
      expect((items[0] as { quantity: number; unitPrice: number }).quantity).toBe(99);
      expect((items[0] as { quantity: number; unitPrice: number }).unitPrice).toBe(12);
    }
  });
});

describe("B2: add feedback is visible synchronously to a same-tick second click", () => {
  it("showAddedFeedback is readable from getState before React re-renders", async () => {
    const { useBowlBuilderStore } = await import("@/store/bowlBuilderStore");
    useBowlBuilderStore.getState().reset();
    expect(useBowlBuilderStore.getState().addedFeedback).toBe(false);
    useBowlBuilderStore.getState().showAddedFeedback();
    expect(useBowlBuilderStore.getState().addedFeedback).toBe(true);
    useBowlBuilderStore.getState().clearAddedFeedback();
  });
});

describe("B3 / C2 / D1: nothing added at the cap is reported, not celebrated", () => {
  it("addItem and incrementItem return at-max on a line holding 99", async () => {
    seedCart([plain("a", { quantity: 99 }), signatureLine("m", "moment", "medium", 12, { quantity: 99 })]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore.getState();
    expect(store.addItem(customInput({ sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } }))).toBe("at-max");
    expect(store.addItem({ ...signatureLine("z", "moment", "medium", 12), lineId: undefined } as never)).toBe("at-max");
    expect(store.incrementItem("a")).toBe("at-max");
    expect(store.incrementItem("m")).toBe("at-max");
    expect(cartStore.useCartStore.getState().items.map((i) => i.quantity)).toEqual([99, 99]);
  });

  it("returns added below the cap", async () => {
    seedCart([plain("a", { quantity: 98 })]);
    const { cartStore } = await loadWithMenu();
    expect(cartStore.useCartStore.getState().incrementItem("a")).toBe("added");
    expect(cartStore.useCartStore.getState().addItem(customInput({ sizeId: "large", steps: { base: ["plain-greek-yogurt"] } }))).toBe("added");
    expect(cartStore.useCartStore.getState().items).toHaveLength(2);
  });
});

describe("AddResult: invalid is distinct from at-max", () => {
  it("returns invalid for a selection the menu cannot describe", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore.getState();
    expect(store.addItem(customInput({ sizeId: "medium", steps: { fruits: ["strawberries"] } }))).toBe("invalid");
    expect(cartStore.useCartStore.getState().items).toHaveLength(0);
  });
});


describe("signature additions and removals", () => {
  const mango = { additions: ["mangoes"], removals: [] };
  const withMango = (lineId = "with-mango", extra = {}) =>
    signatureLine(lineId, "moment", "medium", 14, { mods: mango, ...extra });

  it("the same bowl with different mods is a separate line; the same mods merge", async () => {
    seedCart([signatureLine("plain", "moment", "medium", 12), withMango()]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    expect(store.getState().items).toHaveLength(2);
    store.getState().addItem({ ...withMango("x"), lineId: undefined } as never);
    expect(store.getState().items).toHaveLength(2);
    expect(store.getState().items[1].quantity).toBe(2);
    store.getState().addItem({ ...signatureLine("y", "moment", "medium", 12), lineId: undefined } as never);
    expect(store.getState().items[0].quantity).toBe(2);
  });

  it("prices and sanitizes mods on add, and omits the field when nothing changed", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    store.getState().addItem({
      ...signatureLine("z", "moment", "medium", 1, { mods: { additions: ["mangoes", "nope"], removals: ["mangoes"] } }),
      lineId: undefined,
    } as never);
    expect(store.getState().items[0].unitPrice).toBe(14);
    expect(store.getState().items[0].mods).toEqual({ additions: ["mangoes"], removals: [] });
    store.getState().addItem({ ...signatureLine("w", "moment", "large", 1, { mods: { additions: [], removals: [] } }), lineId: undefined } as never);
    expect(store.getState().items[1].unitPrice).toBe(15);
    expect("mods" in store.getState().items[1]).toBe(false);
  });

  it("updateSignatureLine re-prices in place and clears mods when everything is undone", async () => {
    seedCart([withMango("a")]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    expect(store.getState().updateSignatureLine("a", { sizeId: "large", mods: { additions: ["mangoes"], removals: ["house-granola"] } })).toBe("updated");
    let item = store.getState().items[0];
    expect(item.unitPrice).toBe(17);
    expect(item.name).toBe("The Moment · Large");
    expect(item.mods).toEqual({ additions: ["mangoes"], removals: ["house-granola"] });
    expect(store.getState().updateSignatureLine("a", { sizeId: "medium", mods: { additions: [], removals: [] } })).toBe("updated");
    item = store.getState().items[0];
    expect(item.unitPrice).toBe(12);
    expect("mods" in item).toBe(false);
    expect((readPersistedItems()[0] as { mods?: unknown }).mods).toBeUndefined();
  });

  it("updateSignatureLine merges into a duplicate under the 99 cap and reports missing lines", async () => {
    seedCart([signatureLine("plain", "moment", "medium", 12, { quantity: 60 }), withMango("b", { quantity: 60 }), plain("custom")]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    expect(store.getState().updateSignatureLine("b", { sizeId: "medium", mods: { additions: [], removals: [] } })).toBe("merged");
    expect(store.getState().items.map((i) => [i.lineId, i.quantity])).toEqual([["plain", 99], ["custom", 1]]);
    expect(store.getState().updateSignatureLine("custom", { sizeId: "medium", mods: mango })).toBe("missing");
    expect(store.getState().updateSignatureLine("gone", { sizeId: "medium", mods: mango })).toBe("missing");
    expect(store.getState().updateSignatureLine("plain", { sizeId: "huge", mods: mango })).toBe("missing");
  });

  it("persisted mods survive rehydrate; the modal's line id does not persist", async () => {
    seedCart([withMango("a")]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    expect(store.getState().items[0].mods).toEqual(mango);
    expect(store.getState().items[0].unitPrice).toBe(14);
    store.getState().openEdit("a");
    expect(store.getState().editingLineId).toBe("a");
    store.getState().incrementItem("a");
    expect(JSON.parse(localStorage.getItem(CART_KEY)!).state.editingLineId).toBeUndefined();
    store.getState().closeEdit();
    expect(store.getState().editingLineId).toBeNull();
  });
});

describe("signature yogurt", () => {
  const noBase = (lineId: string, extra = {}) => signatureLine(lineId, "moment", "medium", 12, { base: undefined, ...extra });
  const vegan = (lineId: string, extra = {}) =>
    signatureLine(lineId, "moment", "medium", 14, { base: "vegan-coconut-yogurt", ...extra });

  it("persists the chosen yogurt, prices its surcharge, and keeps yogurts apart as lines", async () => {
    seedCart([signatureLine("plain", "moment", "medium", 12), vegan("vegan")]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    expect(store.getState().items.map((i) => [i.base, i.unitPrice])).toEqual([
      ["plain-greek-yogurt", 12],
      ["vegan-coconut-yogurt", 14],
    ]);
    expect(store.getState().addItem({ ...vegan("x", { unitPrice: 1 }), lineId: undefined } as never)).toBe("added");
    expect(store.getState().items).toHaveLength(2);
    expect(store.getState().items[1].quantity).toBe(2);
    expect(store.getState().items[1].unitPrice).toBe(14);
    expect((readPersistedItems()[1] as { base?: string }).base).toBe("vegan-coconut-yogurt");
  });

  it("refuses to add a bowl with no yogurt, and adds a smoothie on its default", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    expect(store.getState().addItem({ ...noBase("a"), lineId: undefined } as never)).toBe("invalid");
    expect(store.getState().addItem({ ...signatureLine("b", "moment", "medium", 12, { base: "nope" }), lineId: undefined } as never)).toBe("invalid");
    expect(store.getState().items).toHaveLength(0);
    expect(store.getState().addItem({ ...signatureLine("c", "rise", "standard", 15, { base: undefined }), lineId: undefined } as never)).toBe("added");
    expect(store.getState().items[0].base).toBe("vanilla-greek-yogurt");
    expect(store.getState().items[0].unitPrice).toBe(15);
  });

  it("rehydrates a bowl persisted without a yogurt as unset, and a smoothie on its default", async () => {
    seedCart([noBase("bowl"), signatureLine("smoothie", "rise", "standard", 15, { base: undefined })]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    const [bowl, smoothie] = store.getState().items;
    expect("base" in bowl).toBe(false);
    expect(bowl.unitPrice).toBe(12);
    expect(smoothie.base).toBe("vanilla-greek-yogurt");
    // C3-03: the bowl never had one and the drawer prompts for it, so no
    // notice for it; the smoothie came back on a default the customer never
    // chose, and is told once.
    const messages = store.getState().notice!.map((c) => c.message);
    expect(messages).toEqual(["The Rise · 24 oz is now on Vanilla Greek Yogurt. Edit it to choose another yogurt."]);
  });

  it("C3-03: the legacy-line notice shows once; the next load, with the yogurt persisted, is silent", async () => {
    seedCart([signatureLine("smoothie", "rise", "standard", 15, { base: undefined })]);
    const first = await loadWithMenu();
    expect(first.cartStore.useCartStore.getState().notice).toHaveLength(1);
    // The store writes the migrated line back on its next change; simulate
    // that write and reload.
    first.cartStore.useCartStore.getState().dismissNotice();
    first.cartStore.useCartStore.getState().updateQuantity("smoothie", 2);
    const second = await loadWithMenu();
    expect(second.cartStore.useCartStore.getState().items[0].base).toBe("vanilla-greek-yogurt");
    expect(second.cartStore.useCartStore.getState().notice).toBeNull();
  });

  it("C3-08: a tampered base is described, never printed, and an empty one is not reported", async () => {
    seedCart([
      { ...noBase("empty"), base: "" },
      { ...noBase("topping"), base: "strawberries" },
      { ...signatureLine("smoothie", "rise", "standard", 15), base: "mangoes" },
    ]);
    const { cartStore } = await loadWithMenu();
    const state = cartStore.useCartStore.getState();
    expect(state.items.map((i) => i.base)).toEqual([undefined, undefined, "vanilla-greek-yogurt"]);
    const messages = (state.notice ?? []).map((c) => c.message);
    expect(messages).toEqual([
      "Your previous yogurt is no longer available. Choose a yogurt for The Moment · Medium.",
      "Your previous yogurt is no longer available; The Rise · 24 oz is now on Vanilla Greek Yogurt.",
    ]);
  });

  it("S2-06: an edit naming a yogurt the Base step does not offer is refused on a smoothie as on a bowl", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    store.getState().addItem({ ...signatureLine("s", "rise", "standard", 15), lineId: undefined, base: "vanilla-greek-yogurt" } as never);
    const [smoothie] = store.getState().items;
    expect(store.getState().updateSignatureLine(smoothie.lineId, { sizeId: "standard", base: "nope", mods: { additions: [], removals: [] } })).toBe("invalid");
    expect(store.getState().items[0].base).toBe("vanilla-greek-yogurt");
    expect(store.getState().updateSignatureLine("gone", { sizeId: "standard", mods: { additions: [], removals: [] } })).toBe("missing");
  });

  it("S1-06: addFromModal at the cap reports at-max and leaves the dialog open; raiseNotice shows in the drawer", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    const line = { ...signatureLine("m", "moment", "medium", 12), lineId: undefined, quantity: 99 } as never;
    expect(store.getState().addItem(line)).toBe("added");
    store.getState().openAdd("moment");
    expect(store.getState().addFromModal({ ...signatureLine("m", "moment", "medium", 12), lineId: undefined } as never)).toBe("at-max");
    expect(store.getState().addingProductId).toBe("moment");
    expect(store.getState().lastModalAdd).toBeNull();
    store.getState().raiseNotice([{ kind: "dropped", message: "The Moment · Medium was removed from your cart before your changes could be saved." }]);
    expect(store.getState().notice).toHaveLength(1);
    store.getState().closeAdd();
    expect(store.getState().addingProductId).toBeNull();
  });

  it("drops a yogurt the Base step no longer offers and says so", async () => {
    seedCart([vegan("bowl"), signatureLine("smoothie", "rise", "standard", 17, { base: "vegan-coconut-yogurt" })]);
    const { cartStore } = await loadWithMenu((menu) => {
      const step = menu.build.steps.find((s: { id: string }) => s.id === "base");
      step.options = step.options.filter((o: { ingredientId: string }) => o.ingredientId !== "vegan-coconut-yogurt");
    });
    const store = cartStore.useCartStore;
    const [bowl, smoothie] = store.getState().items;
    expect("base" in bowl).toBe(false);
    expect(bowl.unitPrice).toBe(12);
    expect(smoothie.base).toBe("vanilla-greek-yogurt");
    expect(smoothie.unitPrice).toBe(15);
    const messages = store.getState().notice!.map((c) => c.message);
    expect(messages).toContain("Vegan Coconut Yogurt is no longer available. Choose a yogurt for The Moment · Medium.");
    expect(messages).toContain("Vegan Coconut Yogurt is no longer available; The Rise · 24 oz is now on Vanilla Greek Yogurt.");
  });

  it("updateSignatureLine changes the yogurt, re-prices, keeps it when unmentioned, and refuses an unknown one on a bowl", async () => {
    seedCart([signatureLine("a", "moment", "medium", 12)]);
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    const mods = { additions: [], removals: [] };
    expect(store.getState().updateSignatureLine("a", { sizeId: "medium", base: "vegan-coconut-yogurt", mods })).toBe("updated");
    expect(store.getState().items[0].base).toBe("vegan-coconut-yogurt");
    expect(store.getState().items[0].unitPrice).toBe(14);
    // Saying nothing about the yogurt keeps it; naming one the menu does not
    // offer leaves a bowl with nothing, which cannot be saved.
    expect(store.getState().updateSignatureLine("a", { sizeId: "large", mods })).toBe("updated");
    expect(store.getState().items[0].base).toBe("vegan-coconut-yogurt");
    expect(store.getState().items[0].unitPrice).toBe(17);
    expect(store.getState().updateSignatureLine("a", { sizeId: "medium", base: "nope", mods })).toBe("invalid");
    expect(store.getState().items[0].base).toBe("vegan-coconut-yogurt");
  });
});
