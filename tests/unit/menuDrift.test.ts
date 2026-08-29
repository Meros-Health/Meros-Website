// H1 / H2 / H3: a persisted cart against a redeployed menu. Each variant is
// applied to the real menu.json, the seven-line cart from the report is
// rehydrated through it, and both the resulting cart and the notice the
// drawer will show are asserted.
import { describe, expect, it } from "vitest";
import { findSignature, loadWithMenu } from "./helpers/menuVariant";
import { CART_KEY, persisted, readPersistedItems, seedCart, sevenLineCart } from "./helpers/cartFixtures";
import {
  fruitsIncludedLowered,
  fruitsRequired,
  largeSizeRemoved,
  optionalIngredientRemoved,
  pricesRaised,
  requiredIngredientRemoved,
  signatureRemovedAndSilkLargeRemoved,
} from "./fixtures/menuVariants";

type Line = { lineId: string; unitPrice: number; size?: { id: string }; selection?: { steps: Record<string, string[]> } };

async function rehydrateSevenLines(variant?: Parameters<typeof loadWithMenu>[0]) {
  seedCart(sevenLineCart());
  const { cartStore } = await loadWithMenu(variant);
  const state = cartStore.useCartStore.getState();
  const byId = Object.fromEntries(state.items.map((i) => [i.lineId, i as Line]));
  const messages = (state.notice ?? []).map((c) => c.message);
  return { store: cartStore.useCartStore, items: state.items as Line[], byId, messages };
}

describe("menu drift on rehydrate", () => {
  it("baseline: the real menu keeps all seven lines and shows no notice", async () => {
    const { items, messages, byId } = await rehydrateSevenLines();
    expect(items).toHaveLength(7);
    expect(messages).toEqual([]);
    expect(byId["vanilla-three-fruits"].unitPrice).toBe(14);
  });

  it("H1: a required-step ingredient removed drops both plain bowls, unsets the plain signatures, and says so", async () => {
    const { items, byId, messages } = await rehydrateSevenLines(requiredIngredientRemoved);
    expect(items.map((i) => i.lineId)).toEqual(["vanilla-three-fruits", "vanilla-nuts", "moment-medium", "silk-large", "crunch-medium"]);
    expect(messages).toHaveLength(5);
    expect(messages.filter((m) => /no longer available and was removed/.test(m))).toHaveLength(2);
    // The three signatures were on Plain: they stay, with no yogurt, and each says so.
    expect(messages.filter((m) => m.startsWith("Plain Greek Yogurt is no longer available. Choose a yogurt for"))).toHaveLength(3);
    expect("base" in byId["moment-medium"]).toBe(false);
  });

  it("H1: an optional ingredient removed keeps the bowl, drops the topping, re-prices, and says so", async () => {
    const { byId, messages } = await rehydrateSevenLines(optionalIngredientRemoved);
    expect(byId["vanilla-three-fruits"].selection?.steps.fruits).toEqual(["blueberries", "mangoes"]);
    expect(byId["vanilla-three-fruits"].unitPrice).toBe(12);
    expect(byId["plain-large"].selection?.steps.fruits).toEqual(["blueberries"]);
    expect(messages.some((m) => m.includes("Strawberries") && m.includes("Vanilla Greek Yogurt"))).toBe(true);
    expect(messages.some((m) => m.includes("now $12.00, was $14.00"))).toBe(true);
  });

  it("H2: fruits becoming required drops the two fruit-less bowls", async () => {
    const { items, messages } = await rehydrateSevenLines(fruitsRequired);
    expect(items.map((i) => i.lineId)).toEqual(["plain-large", "vanilla-three-fruits", "moment-medium", "silk-large", "crunch-medium"]);
    expect(messages.filter((m) => m.includes("was removed"))).toHaveLength(2);
  });

  it("H2: a removed build size falls back to the default size and says so", async () => {
    const { byId, messages } = await rehydrateSevenLines(largeSizeRemoved);
    expect(byId["plain-large"].size?.id).toBe("medium");
    expect(byId["plain-large"].unitPrice).toBe(12);
    expect(messages.some((m) => m.includes("Large") && m.includes("Medium"))).toBe(true);
    expect(messages.some((m) => m.includes("now $12.00, was $15.00"))).toBe(true);
  });

  it("H3: a removed signature product drops the line; a removed signature size falls back with a notice", async () => {
    const { items, byId, messages } = await rehydrateSevenLines(signatureRemovedAndSilkLargeRemoved);
    expect(items.map((i) => i.lineId)).toEqual(["plain-medium", "plain-large", "vanilla-three-fruits", "vanilla-nuts", "silk-large", "crunch-medium"]);
    expect(byId["silk-large"].size?.id).toBe("medium");
    expect(byId["silk-large"].unitPrice).toBe(12);
    expect(messages).toHaveLength(3);
    expect(messages.some((m) => m.includes("was removed"))).toBe(true);
    expect(messages.some((m) => m.includes("Large") && m.includes("Medium"))).toBe(true);
    expect(messages.some((m) => m.includes("now $12.00, was $15.00"))).toBe(true);
  });

  it("H2: raised prices re-price every affected line and list each one", async () => {
    const { byId, messages } = await rehydrateSevenLines(pricesRaised);
    expect(byId["plain-medium"].unitPrice).toBe(14);
    expect(byId["vanilla-three-fruits"].unitPrice).toBe(16);
    expect(byId["crunch-medium"].unitPrice).toBe(13.5);
    expect(byId["plain-large"].unitPrice).toBe(15);
    expect(messages).toHaveLength(4);
    expect(messages.some((m) => m.includes("now $13.50, was $12.00"))).toBe(true);
  });

  it("H2: a lowered included count re-prices the three-fruit bowl", async () => {
    const { byId, messages } = await rehydrateSevenLines(fruitsIncludedLowered);
    expect(byId["vanilla-three-fruits"].unitPrice).toBe(16);
    expect(byId["plain-large"].unitPrice).toBe(17);
    expect(messages).toHaveLength(2);
  });
});

describe("notice lifecycle", () => {
  it("writes the migrated cart back so the notice shows once, and dismiss clears it", async () => {
    const { store, messages } = await rehydrateSevenLines(pricesRaised);
    expect(messages.length).toBeGreaterThan(0);

    await new Promise((resolve) => setTimeout(resolve, 0));
    const stored = readPersistedItems() as Line[];
    expect(stored.find((l) => l.lineId === "plain-medium")?.unitPrice).toBe(14);
    expect(JSON.parse(localStorage.getItem(CART_KEY)!).version).toBe(1);

    store.getState().dismissNotice();
    expect(store.getState().notice).toBeNull();

    // A reload now sees migrated lines and has nothing to report.
    await store.persist.rehydrate();
    expect(store.getState().notice).toBeNull();
  });

  it("a cross-tab rehydrate of already-migrated lines shows no notice", async () => {
    const { cartStore } = await loadWithMenu();
    const store = cartStore.useCartStore;
    localStorage.setItem(CART_KEY, persisted(sevenLineCart(), 1));
    await store.persist.rehydrate();
    expect(store.getState().items).toHaveLength(7);
    expect(store.getState().notice).toBeNull();
  });

  it("a tampered quantity is dropped without a menu notice", async () => {
    seedCart([{ ...sevenLineCart()[0], quantity: "abc" }]);
    const { cartStore } = await loadWithMenu();
    expect(cartStore.useCartStore.getState().items).toHaveLength(0);
    expect(cartStore.useCartStore.getState().notice).toBeNull();
  });
});

describe("signature additions under menu drift", () => {
  const modded = () => [
    { ...sevenLineCart()[4], unitPrice: 16, mods: { additions: ["mangoes", "strawberries"], removals: ["house-granola"] } },
  ];

  it("keeps additions the menu still offers", async () => {
    seedCart([{ ...sevenLineCart()[4], unitPrice: 14, mods: { additions: ["mangoes"], removals: ["house-granola"] } }]);
    const { cartStore } = await loadWithMenu();
    const state = cartStore.useCartStore.getState();
    expect(state.items[0].mods).toEqual({ additions: ["mangoes"], removals: ["house-granola"] });
    expect(state.items[0].unitPrice).toBe(14);
    expect(state.notice).toBeNull();
  });

  it("drops an addition that left the menu, re-prices, and says so", async () => {
    // Strawberries are in The Moment's recipe, so as a persisted addition they
    // stand in for "an addition the menu no longer allows".
    seedCart(modded());
    const { cartStore } = await loadWithMenu();
    const state = cartStore.useCartStore.getState();
    expect(state.items[0].mods).toEqual({ additions: ["mangoes"], removals: ["house-granola"] });
    expect(state.items[0].unitPrice).toBe(14);
    const messages = (state.notice ?? []).map((c) => c.message);
    expect(messages).toContain("Strawberries is no longer available and was removed from The Moment · Medium.");
    expect(messages).toContain("The Moment · Medium is now $14.00, was $16.00.");
  });

  it("drops a removal that no longer applies without a notice", async () => {
    seedCart([{ ...sevenLineCart()[4], unitPrice: 12, mods: { additions: [], removals: ["house-granola"] } }]);
    const { cartStore } = await loadWithMenu((menu) => {
      const moment = findSignature(menu, "moment");
      moment!.item.recipe = moment!.item.recipe.filter((id: string) => id !== "house-granola");
    });
    const state = cartStore.useCartStore.getState();
    expect("mods" in state.items[0]).toBe(false);
    expect(state.notice).toBeNull();
  });
});
