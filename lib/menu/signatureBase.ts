// The yogurt under a signature bowl or smoothie, driven entirely by menu.json.
//
// A signature's recipe is its toppings; the base is the customer's choice
// from the builder's select:"one" step. A category may name a default
// (signatures.defaultBase, smoothies: vanilla) and an item may override it
// with its own `base`. Bowls carry no default, so a bowl needs a choice
// before it can be added. The same rules caption every menu surface, price
// the vegan surcharge, sanitize a persisted cart line and re-price at
// checkout. ../menu-tv/sync-menu.sh derives the board's base line the same
// way, so the two never drift.
import menuData from "@/lib/menu/menu.json";
import { BUILD_CONFIG, getOption, type BuildStep } from "./buildConfig";
import { getIngredient } from "./ingredients";
import type { SignatureCategory, SignatureItem } from "./signatures";

export type BaseOption = {
  id: string;
  /** Registry name: "Vanilla Greek Yogurt". */
  name: string;
  /** The word the board uses: "Vanilla". Falls back to `name`. */
  shortName: string;
  surcharge: number;
};

type DefaultBase = Partial<Record<"bowls" | "smoothies", string>>;

const DEFAULT_BASE: DefaultBase = (menuData.signatures as { defaultBase?: DefaultBase }).defaultBase ?? {};

const LIST_KEY: Record<SignatureCategory, "bowls" | "smoothies"> = { bowl: "bowls", smoothie: "smoothies" };

/** The builder step the yogurts come from; undefined only on a menu without one. */
export function getBaseStep(): BuildStep | undefined {
  return BUILD_CONFIG.steps.find((step) => step.select === "one");
}

/**
 * Every yogurt the customer can choose: menu order, except that surcharged
 * options come last, the way the board lists them, so the price tag ends the
 * line on every surface (caption, chips, toggle).
 */
export function listBaseOptions(): BaseOption[] {
  const step = getBaseStep();
  if (!step) return [];
  const out: BaseOption[] = [];
  for (const option of step.options) {
    const ingredient = getIngredient(option.ingredientId);
    if (!ingredient) continue;
    out.push({
      id: ingredient.id,
      name: ingredient.name,
      shortName: ingredient.shortName ?? ingredient.name,
      surcharge: option.surcharge ?? 0,
    });
  }
  // Array.prototype.sort is stable, so free options keep their menu order.
  return out.sort((a, b) => a.surcharge - b.surcharge);
}

export function isBaseOffered(id: string): boolean {
  const step = getBaseStep();
  return step !== undefined && getOption(step.id, id) !== undefined && getIngredient(id) !== undefined;
}

/** What choosing this yogurt adds on top of the signature price. 0 for an unknown id. */
export function getBaseSurcharge(id: string): number {
  const step = getBaseStep();
  return step ? (getOption(step.id, id)?.surcharge ?? 0) : 0;
}

/**
 * The yogurt an item comes with when the customer does not choose: the item's
 * own `base`, else its category default. Undefined means the customer must
 * choose (every bowl today).
 */
export function getDefaultBaseId(item: SignatureItem): string | undefined {
  // The validator keeps both offered; after a menu change an item base that
  // left the step falls through to the category default, then to "choose".
  for (const candidate of [item.base, DEFAULT_BASE[LIST_KEY[item.category]]]) {
    if (candidate !== undefined && isBaseOffered(candidate)) return candidate;
  }
  return undefined;
}

export function isBaseRequired(item: SignatureItem): boolean {
  return getDefaultBaseId(item) === undefined;
}

/**
 * Turns any persisted or submitted value into a yogurt the menu offers for
 * this item, or the item's default when it does not, or undefined when the
 * item has no default either (a bowl with no choice yet). Mirrors
 * sanitizeSignatureMods: unknown input is never an error, only "unset".
 */
export function sanitizeBaseId(item: SignatureItem, raw: unknown): string | undefined {
  if (typeof raw === "string" && isBaseOffered(raw)) return raw;
  return getDefaultBaseId(item);
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

/** "$2" for whole dollars, "$2.50" otherwise: the board's money format. */
function compactMoney(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** "Plain" or "Vegan Coconut +$2". */
export function formatBaseChoice(option: BaseOption): string {
  return option.surcharge > 0 ? `${option.shortName} +${compactMoney(option.surcharge)}` : option.shortName;
}

function joinOr(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
}

/**
 * The board's base line for an item, from the Base step and the item's
 * default: "Choose your yogurt · Plain, Vanilla, High Protein or Vegan
 * Coconut +$2" when the customer must choose; "Made with Vanilla Greek
 * Yogurt · Swap for Plain, High Protein or Vegan Coconut +$2" when the item
 * has a default. "" on a menu with no Base step.
 */
export function formatBaseCaption(item: SignatureItem): string {
  const options = listBaseOptions();
  if (options.length === 0) return "";
  const defaultId = getDefaultBaseId(item);
  const choices = options.filter((option) => option.id !== defaultId).map(formatBaseChoice);
  if (defaultId === undefined) return `Choose your yogurt · ${joinOr(choices)}`;
  const defaultName = getIngredient(defaultId)?.name ?? defaultId;
  return `Made with ${defaultName} · Swap for ${joinOr(choices)}`;
}
