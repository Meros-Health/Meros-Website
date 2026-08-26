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
