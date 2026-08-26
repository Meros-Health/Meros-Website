import { describe, expect, it } from "vitest";
import { loadWithMenu } from "./helpers/menuVariant";
import { EMPTY_NUTRITION, readPersistedItems } from "./helpers/cartFixtures";

describe("cart store: smoke", () => {
  it("adds a custom bowl, prices it from the menu, and persists it", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;

    store.getState().addItem({
      kind: "custom",
      productId: "custom-bowl",
      name: "Custom Bowl",
      selection: { sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } },
      nutrition: { ...EMPTY_NUTRITION },
      quantity: 1,
      unitPrice: 0,
    });

    expect(store.getState().items).toHaveLength(1);
    expect(store.getState().subtotal()).toBe(12);
    expect(readPersistedItems()).toHaveLength(1);
  });
});
