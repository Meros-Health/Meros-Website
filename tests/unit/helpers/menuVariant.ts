import { vi } from "vitest";
import realMenu from "../../../lib/menu/menu.json";

// The menu is imported as JSON, so the inferred type is the exact shape of the
// real file. Variants need to mutate freely (remove a size, flip a flag), so
// they receive a loosened clone.
/* eslint-disable @typescript-eslint/no-explicit-any */
export type MutableMenu = any;
export type MenuVariant = (menu: MutableMenu) => void;

export function buildMenu(variant?: MenuVariant): MutableMenu {
  const menu = structuredClone(realMenu) as MutableMenu;
  variant?.(menu);
  return menu;
}

/**
 * Loads a fresh copy of the store and the checkout action against a menu
 * variant. `vi.resetModules()` so every accessor in lib/menu re-reads the
 * mocked JSON; the store rehydrates from whatever is in localStorage at call
 * time, which is how "persisted cart, then redeployed menu" is simulated.
 */
export async function loadWithMenu(variant?: MenuVariant) {
  vi.resetModules();
  const menu = buildMenu(variant);
  vi.doMock("../../../lib/menu/menu.json", () => ({ default: menu }));
  const cartStore = await import("@/store/cartStore");
  const checkout = await import("@/app/actions/checkout");
  const selectionUtils = await import("@/lib/menu/selectionUtils");
  return { menu, cartStore, checkout, selectionUtils };
}

export function findIngredientIndex(menu: MutableMenu, id: string): number {
  return menu.ingredients.findIndex((ing: { id: string }) => ing.id === id);
}

export function findStep(menu: MutableMenu, id: string) {
  return menu.build.steps.find((step: { id: string }) => step.id === id);
}

export function findSignature(menu: MutableMenu, id: string) {
  for (const list of ["bowls", "smoothies"]) {
    const item = menu.signatures[list].find((s: { id: string }) => s.id === id);
    if (item) return { list, item };
  }
  return null;
}
