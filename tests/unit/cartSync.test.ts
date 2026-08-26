// A11 / E8: another tab's write reaches this tab through the storage event.
import { describe, expect, it } from "vitest";
import { loadWithMenu } from "./helpers/menuVariant";
import { CART_KEY, customLine, persisted, signatureLine } from "./helpers/cartFixtures";

const plain = (lineId: string, quantity = 1) =>
  customLine(lineId, "medium", { base: ["plain-greek-yogurt"] }, { unitPrice: 12, quantity });

/** What the browser does in every other tab when one tab writes. */
function otherTabWrites(items: unknown) {
  const oldValue = localStorage.getItem(CART_KEY);
  const newValue = persisted(items, 1);
  localStorage.setItem(CART_KEY, newValue);
  window.dispatchEvent(
    new StorageEvent("storage", { key: CART_KEY, oldValue, newValue, storageArea: localStorage })
  );
}

async function loadSynced() {
  const loaded = await loadWithMenu();
  const { subscribeCartSync } = await import("@/store/cartSync");
  const unsubscribe = subscribeCartSync();
  return { ...loaded, unsubscribe };
}

describe("cross-tab sync", () => {
  it("A11: a line removed in another tab is gone here before the next write", async () => {
    localStorage.setItem(CART_KEY, persisted([plain("x")], 1));
    const { cartStore, unsubscribe } = await loadSynced();
    const store = cartStore.useCartStore;
    expect(store.getState().items).toHaveLength(1);

    otherTabWrites([]);
    await Promise.resolve();

    expect(store.getState().items).toHaveLength(0);
    // The edit that would have resurrected it now reports the line as missing.
    expect(store.getState().updateCustomBowl("x", { sizeId: "large", steps: { base: ["plain-greek-yogurt"] } })).toBe("missing");
    expect(JSON.parse(localStorage.getItem(CART_KEY)!).state.items).toHaveLength(0);
    unsubscribe();
  });

  it("E8: a line added in another tab survives a quantity change here", async () => {
    localStorage.setItem(CART_KEY, persisted([plain("x")], 1));
    const { cartStore, unsubscribe } = await loadSynced();
    const store = cartStore.useCartStore;

    otherTabWrites([plain("x"), signatureLine("m", "moment", "medium", 12)]);
    await Promise.resolve();
    store.getState().incrementItem("x");

    const items = store.getState().items;
    expect(items.map((i) => [i.lineId, i.quantity])).toEqual([
      ["x", 2],
      ["m", 1],
    ]);
    expect(JSON.parse(localStorage.getItem(CART_KEY)!).state.items).toHaveLength(2);
    unsubscribe();
  });

  it("keeps the drawer open flag, ignores other keys, and stops after unsubscribe", async () => {
    const { cartStore, unsubscribe } = await loadSynced();
    const store = cartStore.useCartStore;
    store.getState().openCart();

    window.dispatchEvent(new StorageEvent("storage", { key: "something-else", newValue: "1" }));
    await Promise.resolve();
    expect(store.getState().items).toHaveLength(0);

    otherTabWrites([plain("x")]);
    await Promise.resolve();
    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().isOpen).toBe(true);

    unsubscribe();
    otherTabWrites([]);
    await Promise.resolve();
    expect(store.getState().items).toHaveLength(1);
  });
});
