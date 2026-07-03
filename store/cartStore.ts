import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------------------------------------------------------------------------
// Types — placeholder shape. Swap in your real menu/builder types when ready.
// ---------------------------------------------------------------------------

export type Base = {
  id: string;
  name: string;
  priceModifier: number; // delta from default base price
};

export type Topping = {
  id: string;
  name: string;
  price: number;
};

export type CartItem = {
  /** Unique ID for this cart line (not the product ID — allows multiple identical builds) */
  lineId: string;
  productId: string;
  name: string;
  base: Base;
  toppings: Topping[];
  quantity: number;
  unitPrice: number; // base price + base modifier + sum(toppings)
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "lineId">) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

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
    }),
    {
      name: "meros-cart",
      // Future auth integration: add `partialize` here to strip sensitive fields,
      // or swap `storage` to a server-synced adapter once accounts exist.
    }
  )
);
