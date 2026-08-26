import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { NutritionFacts } from "@/lib/menu/nutrition";
import {
  findMatchingCustomLine,
  findMatchingSignatureLine,
  migrateLegacySelection,
  type BowlSelectionSnapshot,
  type LegacyBowlSelectionSnapshot,
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

export type CustomBowlSelection = BowlSelectionSnapshot;

export type CartItemSize = { id: string; label: string };

export type CartItem = {
  lineId: string;
  kind: "signature" | "custom";
  productId: string;
  name: string;
  selection?: CustomBowlSelection;
  /** Signature lines only. Bowls are Medium or Large; smoothies have one size. */
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
  updateCustomBowl: (
    lineId: string,
    selection: CustomBowlSelection,
    nutrition: NutritionFacts,
    unitPrice: number
  ) => void;
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

function migrateCartItem(item: CartItem): CartItem {
  if (item.kind === "custom" && item.selection) {
    const selection = migrateLegacySelection(item.selection as LegacyBowlSelectionSnapshot);
    return {
      ...item,
      selection,
      name: `Custom Bowl · ${selection.base.name}`,
    };
  }

  // Signature lines persisted before sizes existed carry a stale per-item
  // price. Re-price them at the category's default size. A productId that no
  // longer exists on the menu throws, and onRehydrateStorage drops the line.
  if (item.kind === "signature" && !item.size) {
    const catalogItem = getSignatureItem(item.productId);
    if (!catalogItem) throw new Error(`Unknown signature product "${item.productId}"`);
    const sizeId = getDefaultSizeId(catalogItem.category);
    const size = { id: sizeId, label: getSizeLabel(catalogItem.category, sizeId) };
    const unitPrice = getSignaturePrice(catalogItem.id, sizeId);
    if (unitPrice === undefined) throw new Error(`No price for "${item.productId}" at "${sizeId}"`);
    return {
      ...item,
      size,
      unitPrice,
      name: signatureLineName(catalogItem.name, size),
    };
  }

  return item;
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
        }

        if (item.kind === "custom" && item.selection) {
          const selection = migrateLegacySelection(item.selection as LegacyBowlSelectionSnapshot);
          const existing = findMatchingCustomLine(items, selection);
          if (existing) {
            get().updateQuantity(existing.lineId, existing.quantity + item.quantity);
            return;
          }
        }

        const lineId = makeLineId();
        const selection =
          item.kind === "custom" && item.selection
            ? migrateLegacySelection(item.selection as LegacyBowlSelectionSnapshot)
            : item.selection;
        const name =
          item.kind === "custom" && selection
            ? `Custom Bowl · ${selection.base.name}`
            : signatureLineName(item.name, item.size);

        set((state) => ({
          items: [...state.items, { ...item, lineId, name, selection }],
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

      updateCustomBowl: (lineId, selection, nutrition, unitPrice) => {
        const { items } = get();
        const current = items.find((i) => i.lineId === lineId);
        if (!current || current.kind !== "custom") return;

        const normalized = migrateLegacySelection(selection as LegacyBowlSelectionSnapshot);
        const duplicate = findMatchingCustomLine(
          items.filter((i) => i.lineId !== lineId),
          normalized
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
          items: items.map((i) =>
            i.lineId === lineId
              ? {
                  ...i,
                  selection: normalized,
                  nutrition,
                  unitPrice,
                  name: `Custom Bowl · ${normalized.base.name}`,
                }
              : i
          ),
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
        // A single unreadable line (older shape, corrupted write, tampering)
        // must not crash store creation and take the whole app down — drop it.
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
  // and already carries the size suffix for signature lines.
  return item.name;
}
