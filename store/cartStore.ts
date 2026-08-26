import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBuildSize } from "@/lib/menu/buildConfig";
import { calcBowlPrice, getSelectedIngredients, type BowlSelection } from "@/lib/menu/calcBowlPrice";
import { EMPTY_NUTRITION, sumNutrition, type NutritionFacts } from "@/lib/menu/nutrition";
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
import { safeJsonStorage } from "@/lib/storage/safeJsonStorage";

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

export type UpdateCustomBowlResult = "updated" | "merged" | "missing";

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
  updateCustomBowl: (lineId: string, selection: CustomBowlSelection) => UpdateCustomBowlResult;
  getItem: (lineId: string) => CartItem | undefined;
  clearCart: () => void;
  subtotal: () => number;
  openCart: () => void;
  closeCart: () => void;
}

const MAX_QUANTITY = 99;

// Bump only together with a `migrate` branch below. A bump without one makes
// zustand discard the persisted cart with a console warning (E9).
const CART_VERSION = 1;

function makeLineId(): string {
  // crypto.randomUUID requires a secure context (throws on plain-HTTP LAN access).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function clampQuantity(quantity: number): number {
  return Math.min(quantity, MAX_QUANTITY);
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

// ---------------------------------------------------------------------------
// Rehydration
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Integer 1..99 or nothing. A line whose quantity cannot be trusted is not
 * clamped to some guess; it is dropped, so it can never reach checkout.
 */
function readQuantity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1) return null;
  return clampQuantity(value);
}

function readLineId(value: unknown, used: Set<string>): string {
  const id = typeof value === "string" && value.length > 0 && !used.has(value) ? value : makeLineId();
  used.add(id);
  return id;
}

/**
 * Turns one persisted line (any older shape, tampered, or referencing a menu
 * that has since changed) into a valid CartItem, or null when nothing
 * trustworthy is left. Every field is rebuilt from the menu; unknown fields
 * are not carried along.
 */
function readCartItem(raw: unknown, usedIds: Set<string>): CartItem | null {
  if (!isRecord(raw)) return null;

  const quantity = readQuantity(raw.quantity);
  if (quantity === null) return null;

  if (raw.kind === "custom") {
    // A bowl whose required step no longer resolves has nothing to show.
    const selection = normalizeSelection(raw.selection);
    if (!selection) return null;
    return {
      lineId: readLineId(raw.lineId, usedIds),
      kind: "custom",
      productId: "custom-bowl",
      quantity,
      ...customLineFields(selection),
    };
  }

  if (raw.kind === "signature") {
    if (typeof raw.productId !== "string") return null;
    const catalogItem = getSignatureItem(raw.productId);
    if (!catalogItem) return null;
    const rawSizeId = isRecord(raw.size) && typeof raw.size.id === "string" ? raw.size.id : undefined;
    const sizeId = rawSizeId ?? getDefaultSizeId(catalogItem.category);
    const unitPrice = getSignaturePrice(catalogItem.id, sizeId);
    if (unitPrice === undefined) return null;
    const size = { id: sizeId, label: getSizeLabel(catalogItem.category, sizeId) };
    return {
      lineId: readLineId(raw.lineId, usedIds),
      kind: "signature",
      productId: catalogItem.id,
      name: signatureLineName(catalogItem.name, size),
      size,
      nutrition: { ...EMPTY_NUTRITION },
      quantity,
      unitPrice,
    };
  }

  return null;
}

/** Every persisted line that can still be trusted, rebuilt against the current menu. */
export function migrateCart(rawItems: unknown): CartItem[] {
  if (!Array.isArray(rawItems)) return [];
  const usedIds = new Set<string>();
  const items: CartItem[] = [];
  for (const raw of rawItems) {
    try {
      const item = readCartItem(raw, usedIds);
      if (item) items.push(item);
    } catch {
      // One unreadable line must not take the whole cart down.
    }
  }
  return items;
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
        // NaN and fractions must never persist; they render as money.
        if (!Number.isInteger(quantity)) return;
        if (quantity <= 0) {
          get().removeItem(lineId);
          return;
        }
        const clamped = clampQuantity(quantity);
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
        if (!current || current.kind !== "custom") return "missing";

        const selection = normalizeSelection(rawSelection);
        if (!selection) return "missing";

        const duplicate = findMatchingCustomLine(
          items.filter((i) => i.lineId !== lineId),
          selection
        );

        if (duplicate) {
          set({
            items: items
              .map((i) =>
                i.lineId === duplicate.lineId
                  ? { ...i, quantity: clampQuantity(i.quantity + current.quantity) }
                  : i
              )
              .filter((i) => i.lineId !== lineId),
          });
          return "merged";
        }

        set({
          items: items.map((i) => (i.lineId === lineId ? { ...i, ...customLineFields(selection) } : i)),
        });
        return "updated";
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
      version: CART_VERSION,
      storage: safeJsonStorage(),
      partialize: (state) => ({ items: state.items }),
      // Per-line migration happens in `merge`, so older envelopes (version 0,
      // or any future version this build does not know) are passed through
      // unchanged and read line by line.
      migrate: (persisted) => persisted as { items: CartItem[] },
      // Runs before `set`, so subscribers only ever see migrated items and the
      // persisted array is never mutated in place.
      merge: (persisted, current) => ({
        ...current,
        items: migrateCart(isRecord(persisted) ? persisted.items : undefined),
      }),
    }
  )
);

export function getCartItemDisplayName(item: CartItem): string {
  // `name` is kept in sync everywhere a line is created, updated, or migrated,
  // and already carries the size suffix.
  return item.name;
}
