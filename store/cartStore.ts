import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBuildSize } from "@/lib/menu/buildConfig";
import { calcBowlPrice, getSelectedIngredients, type BowlSelection } from "@/lib/menu/calcBowlPrice";
import { sumNutrition, type NutritionFacts } from "@/lib/menu/nutrition";
import {
  findMatchingCustomLine,
  findMatchingSignatureLine,
  getSelectionHeadline,
  normalizeSelection,
} from "@/lib/menu/selectionUtils";
import {
  getDefaultSizeId,
  getSignatureItem,
  getSignaturePrice,
  getSizeLabel,
} from "@/lib/menu/signatures";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomBowlSelection = BowlSelection;

export type CartItemSize = { id: string; label: string };

export type CartItem = {
  lineId: string;
  kind: "signature" | "custom";
  productId: string;
  name: string;
  /** Custom lines only. Ids against the menu; never catalog objects. */
  selection?: CustomBowlSelection;
  /** Signature: menu size tier. Custom: build size (Medium / Large). */
  size?: CartItemSize;
  nutrition: NutritionFacts;
  quantity: number;
  unitPrice: number;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: Omit<CartItem, "lineId">) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  incrementItem: (lineId: string) => void;
  decrementItem: (lineId: string) => void;
  updateCustomBowl: (lineId: string, selection: CustomBowlSelection) => void;
  getItem: (lineId: string) => CartItem | undefined;
  clearCart: () => void;
  subtotal: () => number;
  openCart: () => void;
  closeCart: () => void;
}

const MAX_QUANTITY = 99;

function makeLineId(): string {
  // crypto.randomUUID requires a secure context (throws on plain-HTTP LAN access).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function signatureLineName(name: string, size: CartItemSize | undefined): string {
  return size ? `${name} · ${size.label}` : name;
}

/**
 * Everything a custom line derives from its selection. Price and nutrition are
 * recomputed from the menu here, so a persisted line never carries a stale
 * figure after a menu change.
 */
function customLineFields(selection: BowlSelection) {
  const buildSize = getBuildSize(selection.sizeId);
  const size: CartItemSize = { id: selection.sizeId, label: buildSize?.label ?? selection.sizeId };
  const headline = getSelectionHeadline(selection);
  const name = ["Custom Bowl", headline, size.label].filter(Boolean).join(" · ");
  return {
    selection,
    size,
    name,
    unitPrice: calcBowlPrice(selection),
    nutrition: sumNutrition(getSelectedIngredients(selection)),
  };
}

function migrateCartItem(item: CartItem): CartItem {
  if (item.kind === "custom") {
    // Any pre-v2 payload, or a v2 payload referencing ingredients that have
    // since left the menu. A bowl whose required step no longer resolves
    // throws, and onRehydrateStorage drops the line.
    const selection = normalizeSelection(item.selection);
    if (!selection) throw new Error("Custom bowl no longer matches the menu");
    return { ...item, ...customLineFields(selection) };
  }

  // Signature lines persisted before sizes existed carry a stale per-item
  // price. Re-price them at the category's default size. A productId that no
  // longer exists on the menu throws, and onRehydrateStorage drops the line.
  const catalogItem = getSignatureItem(item.productId);
  if (!catalogItem) throw new Error(`Unknown signature product "${item.productId}"`);
  const sizeId = item.size?.id ?? getDefaultSizeId(catalogItem.category);
  const unitPrice = getSignaturePrice(catalogItem.id, sizeId);
  if (unitPrice === undefined) throw new Error(`No price for "${item.productId}" at "${sizeId}"`);
  const size = { id: sizeId, label: getSizeLabel(catalogItem.category, sizeId) };
  return {
    ...item,
    size,
    unitPrice,
    name: signatureLineName(catalogItem.name, size),
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const { items } = get();

        if (item.kind === "signature") {
          const existing = findMatchingSignatureLine(items, item.productId, item.size?.id);
          if (existing) {
            get().updateQuantity(existing.lineId, existing.quantity + item.quantity);
            return;
          }
          set((state) => ({
            items: [
              ...state.items,
              { ...item, lineId: makeLineId(), name: signatureLineName(item.name, item.size) },
            ],
          }));
          return;
        }

        const selection = normalizeSelection(item.selection);
        if (!selection) return;

        const existing = findMatchingCustomLine(items, selection);
        if (existing) {
          get().updateQuantity(existing.lineId, existing.quantity + item.quantity);
          return;
        }

        set((state) => ({
          items: [...state.items, { ...item, lineId: makeLineId(), ...customLineFields(selection) }],
        }));
      },

      removeItem: (lineId) => {
        set((state) => ({
          items: state.items.filter((i) => i.lineId !== lineId),
        }));
      },

      updateQuantity: (lineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(lineId);
          return;
        }
        const clamped = Math.min(quantity, MAX_QUANTITY);
        set((state) => ({
          items: state.items.map((i) => (i.lineId === lineId ? { ...i, quantity: clamped } : i)),
        }));
      },

      incrementItem: (lineId) => {
        const item = get().getItem(lineId);
        if (!item) return;
        get().updateQuantity(lineId, item.quantity + 1);
      },

      decrementItem: (lineId) => {
        const item = get().getItem(lineId);
        if (!item) return;
        get().updateQuantity(lineId, item.quantity - 1);
      },

      updateCustomBowl: (lineId, rawSelection) => {
        const { items } = get();
        const current = items.find((i) => i.lineId === lineId);
        if (!current || current.kind !== "custom") return;

        const selection = normalizeSelection(rawSelection);
        if (!selection) return;

        const duplicate = findMatchingCustomLine(
          items.filter((i) => i.lineId !== lineId),
          selection
        );

        if (duplicate) {
          set({
            items: items
              .map((i) =>
                i.lineId === duplicate.lineId
                  ? { ...i, quantity: i.quantity + current.quantity }
                  : i
              )
              .filter((i) => i.lineId !== lineId),
          });
          return;
        }

        set({
          items: items.map((i) => (i.lineId === lineId ? { ...i, ...customLineFields(selection) } : i)),
        });
      },

      // Items are normalized on add, on update, and on rehydration, so no
      // re-migration is needed here.
      getItem: (lineId) => get().items.find((i) => i.lineId === lineId),

      clearCart: () => set({ items: [] }),

      subtotal: () => {
        return get().items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: "meros-cart",
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.items)) {
          state.items = [];
          return;
        }
        // A single unreadable line (older shape, corrupted write, tampering,
        // or an ingredient that left the menu) must not crash store creation
        // and take the whole app down: drop it.
        state.items = state.items.flatMap((item) => {
          try {
            return [migrateCartItem(item)];
          } catch {
            return [];
          }
        });
      },
    }
  )
);

export function getCartItemDisplayName(item: CartItem): string {
  // `name` is kept in sync everywhere a line is created, updated, or migrated,
  // and already carries the size suffix.
  return item.name;
}
