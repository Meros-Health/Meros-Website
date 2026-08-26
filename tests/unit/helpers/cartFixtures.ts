// Persisted cart payloads. `persisted()` writes them in zustand persist's
// storage envelope so a fresh store rehydrates from them.
import type { CartItem } from "@/store/cartStore";

export const CART_KEY = "meros-cart";

export const EMPTY_NUTRITION = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  calcium: 0,
  iron: 0,
  potassium: 0,
};

export function customLine(
  lineId: string,
  sizeId: string,
  steps: Record<string, string[]>,
  extra: Partial<CartItem> = {}
): CartItem {
  return {
    lineId,
    kind: "custom",
    productId: "custom-bowl",
    name: "Custom Bowl",
    selection: { sizeId, steps },
    size: { id: sizeId, label: sizeId },
    nutrition: { ...EMPTY_NUTRITION },
    quantity: 1,
    unitPrice: 0,
    ...extra,
  };
}

export function signatureLine(
  lineId: string,
  productId: string,
  sizeId: string,
  unitPrice: number,
  extra: Partial<CartItem> = {}
): CartItem {
  return {
    lineId,
    kind: "signature",
    productId,
    name: productId,
    size: { id: sizeId, label: sizeId },
    nutrition: { ...EMPTY_NUTRITION },
    quantity: 1,
    unitPrice,
    ...extra,
  };
}

/**
 * The seven-line cart from the report's drift matrix. Prices are what the
 * current menu computes, so a variant's effect is visible as a diff.
 */
export function sevenLineCart(): CartItem[] {
  return [
    customLine("plain-medium", "medium", { base: ["plain-greek-yogurt"] }, { unitPrice: 12 }),
    customLine(
      "plain-large",
      "large",
      { base: ["plain-greek-yogurt"], fruits: ["strawberries", "blueberries"] },
      { unitPrice: 15 }
    ),
    customLine(
      "vanilla-three-fruits",
      "medium",
      { base: ["vanilla-greek-yogurt"], fruits: ["strawberries", "blueberries", "mangoes"] },
      { unitPrice: 14 }
    ),
    customLine(
      "vanilla-nuts",
      "medium",
      { base: ["vanilla-greek-yogurt"], "nuts-seeds": ["almonds"] },
      { unitPrice: 12 }
    ),
    signatureLine("moment-medium", "moment", "medium", 12),
    signatureLine("silk-large", "silk", "large", 15),
    signatureLine("crunch-medium", "crunch", "medium", 12),
  ];
}

export function persisted(items: unknown, version = 0): string {
  return JSON.stringify({ state: { items }, version });
}

export function seedCart(items: unknown, version = 0): void {
  localStorage.setItem(CART_KEY, persisted(items, version));
}

export function readPersistedItems(): unknown[] {
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];
  return JSON.parse(raw).state.items;
}
