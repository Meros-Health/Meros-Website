import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BuildItem } from "@/lib/menu/buildCatalog";
import type { NutritionFacts } from "@/lib/menu/nutrition";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomBowlSelection = {
  base: BuildItem;
  toppings: BuildItem[];
  drizzle: BuildItem | null;
  supplements: BuildItem[];
};

export type CartItem = {
  lineId: string;
  kind: "signature" | "custom";
  productId: string;
  name: string;
  selection?: CustomBowlSelection;
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
  clearCart: () => void;
  subtotal: () => number;
  openCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const lineId = crypto.randomUUID();
        set((state) => ({
          items: [...state.items, { ...item, lineId }],
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
        set((state) => ({
          items: state.items.map((i) => (i.lineId === lineId ? { ...i, quantity } : i)),
        }));
      },

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
    }
  )
);
