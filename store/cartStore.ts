import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBuildSize } from "@/lib/menu/buildConfig";
import { calcBowlPrice, formatPrice, getSelectedIngredients, type BowlSelection } from "@/lib/menu/calcBowlPrice";
import { EMPTY_NUTRITION, sumNutrition, type NutritionFacts } from "@/lib/menu/nutrition";
import {
  findMatchingCustomLine,
  findMatchingSignatureLine,
  getSelectionHeadline,
  migrateLegacySelection,
  normalizeSelection,
} from "@/lib/menu/selectionUtils";
import {
  getDefaultSizeId,
  getSignatureItem,
  getSignaturePrice,
  getSizeLabel,
} from "@/lib/menu/signatures";
import { safeJsonStorage } from "@/lib/storage/safeJsonStorage";
import { warnDev } from "@/lib/log";
import { MAX_QUANTITY } from "@/lib/menu/limits";

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

/** "at-max": the matching line already holds 99. "invalid": the selection cannot be added. */
export type AddResult = "added" | "at-max" | "invalid";

/** One line of the "your cart was updated" notice shown after a menu change. */
export type CartChange = {
  kind: "dropped" | "ingredients-removed" | "size-changed" | "price-changed";
  message: string;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /** Set when rehydration changed the cart to match the current menu; not persisted. */
  notice: CartChange[] | null;
  dismissNotice: () => void;
  addItem: (item: Omit<CartItem, "lineId">) => AddResult;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  incrementItem: (lineId: string) => AddResult;
  decrementItem: (lineId: string) => void;
  updateCustomBowl: (lineId: string, selection: CustomBowlSelection) => UpdateCustomBowlResult;
  getItem: (lineId: string) => CartItem | undefined;
  clearCart: () => void;
  subtotal: () => number;
  openCart: () => void;
  closeCart: () => void;
}

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
 * A non-integer (string, fraction, null, NaN) or a value below 1 cannot be
 * trusted and is not guessed at: the line is dropped. An integer above the cap
 * is a real count the store would have clamped anyway, so it clamps here too.
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
    // A size that left the menu falls back to the category default, the same
    // treatment a custom bowl gets; diffLine reports it.
    const rawSizeId = isRecord(raw.size) && typeof raw.size.id === "string" ? raw.size.id : undefined;
    const defaultSizeId = getDefaultSizeId(catalogItem.category);
    let sizeId = rawSizeId ?? defaultSizeId;
    let unitPrice = getSignaturePrice(catalogItem.id, sizeId);
    if (unitPrice === undefined && sizeId !== defaultSizeId) {
      sizeId = defaultSizeId;
      unitPrice = getSignaturePrice(catalogItem.id, sizeId);
    }
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

// ---------------------------------------------------------------------------
// Change report: what the menu did to a persisted line
// ---------------------------------------------------------------------------

/** "toasted-coconut" to "Toasted Coconut": the ingredient is gone from the registry, so its id is all that is left. */
function titleFromId(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function selectionIds(selection: BowlSelection | null | undefined): string[] {
  if (!selection) return [];
  return Object.values(selection.steps).flat();
}

function describeRaw(raw: UnknownRecord): string {
  return typeof raw.name === "string" && raw.name.length > 0 ? raw.name : "An item";
}

/** Only lines that were structurally sound; a tampered quantity is not a menu change. */
function wasReadable(raw: unknown): raw is UnknownRecord {
  return isRecord(raw) && (raw.kind === "custom" || raw.kind === "signature") && readQuantity(raw.quantity) !== null;
}

function diffLine(raw: UnknownRecord, item: CartItem): CartChange[] {
  const changes: CartChange[] = [];

  if (item.kind === "custom") {
    const before = migrateLegacySelection(raw.selection);
    const after = new Set(selectionIds(item.selection));
    const removed = selectionIds(before).filter((id) => !after.has(id));
    if (removed.length > 0) {
      const names = removed.map(titleFromId).join(", ");
      const verb = removed.length === 1 ? "is" : "are";
      changes.push({
        kind: "ingredients-removed",
        message: `${names} ${verb} no longer available and ${removed.length === 1 ? "was" : "were"} removed from ${item.name}.`,
      });
    }
    if (before && item.size && before.sizeId !== item.size.id) {
      changes.push({
        kind: "size-changed",
        message: `${item.name} is no longer available in ${titleFromId(before.sizeId)}; it is now ${item.size.label}.`,
      });
    }
  } else {
    const rawSizeId = isRecord(raw.size) && typeof raw.size.id === "string" ? raw.size.id : undefined;
    if (rawSizeId && item.size && rawSizeId !== item.size.id) {
      changes.push({
        kind: "size-changed",
        message: `${item.name} is no longer available in ${titleFromId(rawSizeId)}; it is now ${item.size.label}.`,
      });
    }
  }

  if (typeof raw.unitPrice === "number" && Number.isFinite(raw.unitPrice) && Math.abs(raw.unitPrice - item.unitPrice) >= 0.005) {
    changes.push({
      kind: "price-changed",
      message: `${item.name} is now ${formatPrice(item.unitPrice)}, was ${formatPrice(raw.unitPrice)}.`,
    });
  }

  return changes;
}

/**
 * Every persisted line that can still be trusted, rebuilt against the current
 * menu, plus what changed for lines the menu altered or dropped.
 */
export function migrateCart(rawItems: unknown): { items: CartItem[]; changes: CartChange[] } {
  if (!Array.isArray(rawItems)) return { items: [], changes: [] };
  const usedIds = new Set<string>();
  const items: CartItem[] = [];
  const changes: CartChange[] = [];
  for (const raw of rawItems) {
    let item: CartItem | null = null;
    try {
      item = readCartItem(raw, usedIds);
    } catch (err) {
      // One unreadable line must not take the whole cart down.
      warnDev("[cart] dropped a persisted line that could not be read", err);
    }
    if (item) {
      items.push(item);
      if (wasReadable(raw)) changes.push(...diffLine(raw, item));
    } else if (wasReadable(raw)) {
      changes.push({ kind: "dropped", message: `${describeRaw(raw)} is no longer available and was removed.` });
    }
  }
  return { items, changes };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      notice: null,
      dismissNotice: () => set({ notice: null }),

      addItem: (item) => {
        const { items } = get();

        if (item.kind === "signature") {
          const existing = findMatchingSignatureLine(items, item.productId, item.size?.id);
          if (existing) {
            if (existing.quantity >= MAX_QUANTITY) return "at-max";
            get().updateQuantity(existing.lineId, existing.quantity + item.quantity);
            return "added";
          }
          set((state) => ({
            items: [
              ...state.items,
              { ...item, lineId: makeLineId(), name: signatureLineName(item.name, item.size) },
            ],
          }));
          return "added";
        }

        const selection = normalizeSelection(item.selection);
        // The UI never produces an incomplete bowl, but the menu can change
        // under a mounted builder.
        if (!selection) return "invalid";

        const existing = findMatchingCustomLine(items, selection);
        if (existing) {
          if (existing.quantity >= MAX_QUANTITY) return "at-max";
          get().updateQuantity(existing.lineId, existing.quantity + item.quantity);
          return "added";
        }

        set((state) => ({
          items: [...state.items, { ...item, lineId: makeLineId(), ...customLineFields(selection) }],
        }));
        return "added";
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
        if (!item || item.quantity >= MAX_QUANTITY) return "at-max";
        get().updateQuantity(lineId, item.quantity + 1);
        return "added";
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
      // persisted array is never mutated in place. A cross-tab rehydrate reads
      // lines the other tab already migrated, so it reports nothing and leaves
      // any notice already showing alone.
      merge: (persisted, current) => {
        const { items, changes } = migrateCart(isRecord(persisted) ? persisted.items : undefined);
        return { ...current, items, notice: changes.length > 0 ? changes : current.notice };
      },
      // Storage still holds the pre-migration lines until the next write. When
      // the menu changed something, write the migrated cart back now so the
      // notice is shown once, not on every load.
      onRehydrateStorage: () => (state) => {
        if (!state?.notice) return;
        queueMicrotask(() => useCartStore.setState((s) => ({ items: [...s.items] })));
      },
    }
  )
);

export function getCartItemDisplayName(item: CartItem): string {
  // `name` is kept in sync everywhere a line is created, updated, or migrated,
  // and already carries the size suffix.
  return item.name;
}
