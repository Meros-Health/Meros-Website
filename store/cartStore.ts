import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getBuildSize } from "@/lib/menu/buildConfig";
import { calcBowlPrice, formatPrice, getSelectedIngredients, type BowlSelection } from "@/lib/menu/calcBowlPrice";
import { getIngredient } from "@/lib/menu/ingredients";
import { EMPTY_NUTRITION, sumNutrition, type NutritionFacts } from "@/lib/menu/nutrition";
import {
  findMatchingCustomLine,
  findMatchingSignatureLine,
  getSelectionHeadline,
  migrateLegacySelection,
  normalizeSelection,
} from "@/lib/menu/selectionUtils";
import {
  calcSignaturePrice,
  getSignatureModsKey,
  hasMods,
  sanitizeSignatureMods,
  type SignatureMods,
} from "@/lib/menu/signatureMods";
import { isBaseIngredient, isBaseOffered, sanitizeBaseId } from "@/lib/menu/signatureBase";
import {
  getDefaultSizeId,
  getSignatureItem,
  getSizeLabel,
  type SignatureItem,
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
  /**
   * Signature lines only: the chosen yogurt as a Base step ingredient id.
   * Absent on a bowl the customer has not chosen for yet (bowls have no
   * default), which the drawer prompts for and checkout refuses.
   */
  base?: string;
  /**
   * Signature lines only: additions and removals as ingredient ids. Absent
   * when nothing was changed, so an untouched line keeps its persisted shape.
   */
  mods?: SignatureMods;
  nutrition: NutritionFacts;
  quantity: number;
  unitPrice: number;
};

export type UpdateCustomBowlResult = "updated" | "merged" | "missing";
/** "invalid": a bowl saved with no yogurt chosen. */
export type UpdateSignatureLineResult = UpdateCustomBowlResult | "invalid";

/**
 * What the edit modal saves for a signature line. Sanitized against the menu
 * on save. `base` omitted keeps the line's current yogurt.
 */
export type SignatureLineEdit = { sizeId: string; mods: SignatureMods; base?: string };

/** "at-max": the matching line already holds 99. "invalid": the selection cannot be added. */
export type AddResult = "added" | "at-max" | "invalid";

/** One line of the "your cart was updated" notice shown after a menu change. */
export type CartChange = {
  kind: "dropped" | "ingredients-removed" | "size-changed" | "base-changed" | "price-changed";
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
  /** The signature line open in the edit modal; not persisted. */
  editingLineId: string | null;
  /** Bumped by every openEdit, so the modal can key a fresh draft per open; not persisted. */
  editSession: number;
  /** The signature product open in the add modal (configured before it is in the cart); not persisted. */
  addingProductId: string | null;
  /** Bumped by every openAdd, so the modal can key a blank draft per open; not persisted. */
  addSession: number;
  /**
   * The last product the add modal put in the cart, so the "+" that opened
   * the modal can show its confirmation once the modal has closed. `seq`
   * distinguishes two adds of the same product. Not persisted, so another tab's
   * add never lights a button here.
   */
  lastModalAdd: { productId: string; seq: number } | null;
  dismissNotice: () => void;
  /** Show a notice the drawer did not derive itself (the edit modal saving into a line that is gone). */
  raiseNotice: (changes: CartChange[]) => void;
  addItem: (item: Omit<CartItem, "lineId">) => AddResult;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  incrementItem: (lineId: string) => AddResult;
  decrementItem: (lineId: string) => void;
  updateCustomBowl: (lineId: string, selection: CustomBowlSelection) => UpdateCustomBowlResult;
  updateSignatureLine: (lineId: string, edit: SignatureLineEdit) => UpdateSignatureLineResult;
  getItem: (lineId: string) => CartItem | undefined;
  clearCart: () => void;
  subtotal: () => number;
  openCart: () => void;
  closeCart: () => void;
  openEdit: (lineId: string) => void;
  closeEdit: () => void;
  openAdd: (productId: string) => void;
  closeAdd: () => void;
  /** addItem for the add modal's draft: records the add for the opener and closes the modal. */
  addFromModal: (item: Omit<CartItem, "lineId">) => AddResult;
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
 * Everything a signature line derives from the menu: name, size, yogurt,
 * price, and the additions and removals it can actually take. Null when the
 * size does not exist for this item. `baseId` is already sanitized (undefined
 * only for a bowl with no choice yet); `mods` is set only when something was
 * changed.
 */
function signatureLineFields(catalogItem: SignatureItem, sizeId: string, mods: SignatureMods, baseId: string | undefined) {
  const unitPrice = calcSignaturePrice(catalogItem.id, sizeId, mods, baseId);
  if (unitPrice === undefined) return null;
  const size: CartItemSize = { id: sizeId, label: getSizeLabel(catalogItem.category, sizeId) };
  return {
    productId: catalogItem.id,
    name: signatureLineName(catalogItem.name, size),
    size,
    ...(baseId !== undefined ? { base: baseId } : {}),
    nutrition: { ...EMPTY_NUTRITION },
    unitPrice,
    ...(hasMods(mods) ? { mods } : {}),
  };
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
    // Additions the menu no longer offers are dropped here; diffLine reports them.
    const mods = sanitizeSignatureMods(catalogItem, raw.mods);
    // A yogurt the Base step no longer offers falls back to the item's default,
    // or to "not chosen" on a bowl; diffLine reports it. A line persisted
    // before the yogurt became a choice comes back the same way.
    const baseId = sanitizeBaseId(catalogItem, raw.base);
    let sizeId = rawSizeId ?? defaultSizeId;
    let fields = signatureLineFields(catalogItem, sizeId, mods, baseId);
    if (!fields && sizeId !== defaultSizeId) {
      sizeId = defaultSizeId;
      fields = signatureLineFields(catalogItem, sizeId, mods, baseId);
    }
    if (!fields) return null;
    return {
      lineId: readLineId(raw.lineId, usedIds),
      kind: "signature",
      quantity,
      ...fields,
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

/** The additions a persisted signature line asked for, before sanitizing. */
function rawAdditionIds(mods: unknown): string[] {
  if (!isRecord(mods) || !Array.isArray(mods.additions)) return [];
  const ids = mods.additions.filter((id): id is string => typeof id === "string");
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

/** Registry name while the ingredient still exists, else a title from its id. */
function ingredientTitle(id: string): string {
  return getIngredient(id)?.name ?? titleFromId(id);
}

/**
 * The name of a persisted yogurt id: the registry name while it is known, its
 * title while it still reads as a yogurt after leaving the registry, and a
 * description for anything else (a tampered or unrelated id), so the notice
 * never prints a topping or an empty string as if it were a yogurt.
 */
function yogurtTitle(id: string): string {
  return isBaseIngredient(id) ? ingredientTitle(id) : "Your previous yogurt";
}

function removedMessage(names: string[], lineName: string): string {
  const verb = names.length === 1 ? "is" : "are";
  const past = names.length === 1 ? "was" : "were";
  return `${names.join(", ")} ${verb} no longer available and ${past} removed from ${lineName}.`;
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
      changes.push({
        kind: "ingredients-removed",
        message: removedMessage(removed.map(titleFromId), item.name),
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

  if (item.kind === "signature") {
    // A yogurt that left the menu: say what replaced it, or that a choice is
    // now needed. The old id is named only when it still resolves to a
    // yogurt the registry knows; anything else (a tampered or unknown id)
    // is described, never printed. An empty string is not a choice at all.
    if (typeof raw.base === "string" && raw.base !== "" && raw.base !== item.base) {
      const was = yogurtTitle(raw.base);
      changes.push({
        kind: "base-changed",
        message: item.base
          ? `${was} is no longer available; ${item.name} is now on ${ingredientTitle(item.base)}.`
          : `${was} is no longer available. Choose a yogurt for ${item.name}.`,
      });
    }
    // A line saved before the yogurt was a choice, on an item that now has a
    // default: it comes back on that default, and the customer is told once
    // (the write that follows persists `base`, so the next load is silent).
    if (raw.base === undefined && item.base) {
      changes.push({
        kind: "base-changed",
        message: `${item.name} is now on ${ingredientTitle(item.base)}. Edit it to choose another yogurt.`,
      });
    }
    // A removal that no longer applies changes nothing the customer pays for,
    // so only dropped additions are reported.
    const kept = item.mods?.additions ?? [];
    const dropped = rawAdditionIds(raw.mods).filter((id) => !kept.includes(id));
    if (dropped.length > 0) {
      changes.push({
        kind: "ingredients-removed",
        message: removedMessage(dropped.map(ingredientTitle), item.name),
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
      editingLineId: null,
      editSession: 0,
      addingProductId: null,
      addSession: 0,
      lastModalAdd: null,
      dismissNotice: () => set({ notice: null }),
      raiseNotice: (changes) => set({ notice: changes.length > 0 ? changes : null }),

      addItem: (item) => {
        const { items } = get();

        if (item.kind === "signature") {
          // Rebuilt from the menu when the product resolves, so a line added
          // with mods is priced the same way it will be on rehydrate. A product
          // the menu no longer has is kept as given; rehydration drops it.
          const catalogItem = getSignatureItem(item.productId);
          const mods = catalogItem ? sanitizeSignatureMods(catalogItem, item.mods) : undefined;
          // The yogurt is the customer's choice. A bowl has no default, so a
          // bowl arriving without one is refused; the UI asks before it adds.
          const baseId = catalogItem ? sanitizeBaseId(catalogItem, item.base) : undefined;
          if (catalogItem && baseId === undefined) return "invalid";
          const fields =
            catalogItem && mods && item.size ? signatureLineFields(catalogItem, item.size.id, mods, baseId) : null;
          // What the caller gave, minus the two fields the menu decides.
          const given: Omit<CartItem, "lineId"> = { ...item };
          delete given.mods;
          delete given.base;
          const line: Omit<CartItem, "lineId"> = fields
            ? { ...given, ...fields }
            : { ...given, name: signatureLineName(item.name, item.size) };

          const existing = findMatchingSignatureLine(items, line.productId, line.size?.id, line.base, getSignatureModsKey(line.mods));
          if (existing) {
            if (existing.quantity >= MAX_QUANTITY) return "at-max";
            get().updateQuantity(existing.lineId, existing.quantity + item.quantity);
            return "added";
          }
          set((state) => ({
            items: [...state.items, { ...line, lineId: makeLineId() }],
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

      updateSignatureLine: (lineId, edit) => {
        const { items } = get();
        const current = items.find((i) => i.lineId === lineId);
        if (!current || current.kind !== "signature") return "missing";

        const catalogItem = getSignatureItem(current.productId);
        if (!catalogItem) return "missing";

        const mods = sanitizeSignatureMods(catalogItem, edit.mods);
        // An edit that says nothing about the yogurt keeps the line's. A bowl
        // cannot be saved back without one; the modal disables Save until one
        // is chosen, this is the backstop. A yogurt the Base step does not
        // offer is refused on every item rather than quietly swapped for the
        // default, so a smoothie and a bowl answer the same way.
        if (edit.base !== undefined && !isBaseOffered(edit.base)) return "invalid";
        const baseId = sanitizeBaseId(catalogItem, edit.base ?? current.base);
        if (baseId === undefined) return "invalid";
        const fields = signatureLineFields(catalogItem, edit.sizeId, mods, baseId);
        if (!fields) return "missing";

        const duplicate = findMatchingSignatureLine(
          items.filter((i) => i.lineId !== lineId),
          catalogItem.id,
          edit.sizeId,
          baseId,
          getSignatureModsKey(mods)
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

        // A fresh object, not a spread over the old one, so clearing every
        // change also clears the persisted `mods` field.
        set({
          items: items.map((i) =>
            i.lineId === lineId ? { lineId, kind: "signature", quantity: i.quantity, ...fields } : i
          ),
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
      openEdit: (lineId) => set((state) => ({ editingLineId: lineId, editSession: state.editSession + 1 })),
      closeEdit: () => set({ editingLineId: null }),
      openAdd: (productId) => set((state) => ({ addingProductId: productId, addSession: state.addSession + 1 })),
      closeAdd: () => set({ addingProductId: null }),
      addFromModal: (item) => {
        const result = get().addItem(item);
        // Only a real add closes the dialog. At the 99 cap, or when the menu
        // moved under the open dialog, nothing was added and the dialog stays
        // up to say so; closing silently read as a broken button.
        if (result !== "added") return result;
        set((state) => ({
          addingProductId: null,
          lastModalAdd: { productId: item.productId, seq: (state.lastModalAdd?.seq ?? 0) + 1 },
        }));
        return result;
      },
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
