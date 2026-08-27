// Additions and removals on a signature bowl or smoothie, driven entirely by
// menu.json. The same rules sanitize a persisted cart line, price the edit
// modal, and re-price the line at checkout, so the three can never disagree.
//
// An addition is any ingredient the builder offers in a multi-select step and
// the recipe does not already contain. It is priced as an extra on that step:
// the step's `extraPrice` (with the step's bundle, if any), or an option's
// `surcharge` on a surcharge-only step. The recipe never counts against a
// step's `included` allowance; a signature's flat price already covers it.
//
// A removal is any recipe ingredient except the base (an ingredient offered in
// a select:"one" step). Removals are free. Recipe-only ingredients that the
// builder does not offer (toasted almonds, almond butter) are removable but
// not addable, since nothing prices them.
import { BUILD_CONFIG, getOption, getStepForIngredient, type BuildStep } from "./buildConfig";
import { extrasCost } from "./calcBowlPrice";
import { getIngredient, ingredientName, type Ingredient } from "./ingredients";
import { getSignaturePrice, type SignatureItem } from "./signatures";

export const MAX_ADDITIONS = 2;
export const MAX_REMOVALS = 2;

/** Ingredient ids against the menu. Persisted on signature cart lines only. */
export type SignatureMods = { additions: string[]; removals: string[] };

export type AddableGroup = { step: BuildStep; ingredients: Ingredient[] };

export function emptyMods(): SignatureMods {
  return { additions: [], removals: [] };
}

export function hasMods(mods: SignatureMods | undefined): boolean {
  return !!mods && (mods.additions.length > 0 || mods.removals.length > 0);
}

// ---------------------------------------------------------------------------
// What the menu allows
// ---------------------------------------------------------------------------

export function isAddable(item: SignatureItem, ingredientId: string): boolean {
  if (item.recipe.includes(ingredientId)) return false;
  if (!getIngredient(ingredientId)) return false;
  const step = getStepForIngredient(ingredientId);
  return step !== undefined && step.select === "multi";
}

export function isRemovable(item: SignatureItem, ingredientId: string): boolean {
  if (!item.recipe.includes(ingredientId)) return false;
  const step = getStepForIngredient(ingredientId);
  return !(step && step.select === "one");
}

/** Per multi-select build step, in menu order, the options the recipe does not already contain. */
export function listAddableGroups(item: SignatureItem): AddableGroup[] {
  const groups: AddableGroup[] = [];
  for (const step of BUILD_CONFIG.steps) {
    if (step.select !== "multi") continue;
    const ingredients: Ingredient[] = [];
    for (const option of step.options) {
      if (!isAddable(item, option.ingredientId)) continue;
      const ingredient = getIngredient(option.ingredientId);
      if (ingredient) ingredients.push(ingredient);
    }
    if (ingredients.length > 0) groups.push({ step, ingredients });
  }
  return groups;
}

/** Recipe ids that can be left out, in recipe order. */
export function listRemovableIds(item: SignatureItem): string[] {
  return item.recipe.filter((id) => isRemovable(item, id));
}

// ---------------------------------------------------------------------------
// Sanitizing
// ---------------------------------------------------------------------------

function readIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string");
}

function unique(ids: string[]): string[] {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

/**
 * Turns any persisted or submitted payload into mods the menu allows for this
 * item: drops non-strings, unknown ids, ids the item cannot take, duplicates,
 * and picks beyond the caps (the first ones are kept, as in the builder).
 * Always returns canonical arrays, never null; "nothing" is two empty lists.
 */
export function sanitizeSignatureMods(item: SignatureItem, raw: unknown): SignatureMods {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return emptyMods();
  const { additions, removals } = raw as { additions?: unknown; removals?: unknown };
  return {
    additions: unique(readIds(additions).filter((id) => isAddable(item, id))).slice(0, MAX_ADDITIONS),
    removals: unique(readIds(removals).filter((id) => isRemovable(item, id))).slice(0, MAX_REMOVALS),
  };
}

// ---------------------------------------------------------------------------
// Matching and display
// ---------------------------------------------------------------------------

/** Stable fingerprint, order independent; "" when nothing was changed. */
export function getSignatureModsKey(mods: SignatureMods | undefined): string {
  if (!hasMods(mods) || !mods) return "";
  return `add:${[...mods.additions].sort().join(",")}|no:${[...mods.removals].sort().join(",")}`;
}

/** "Add Blueberries, Chia Seeds · No House Granola"; "" when nothing was changed. */
export function formatSignatureMods(mods: SignatureMods | undefined): string {
  if (!hasMods(mods) || !mods) return "";
  const parts: string[] = [];
  if (mods.additions.length > 0) parts.push(`Add ${mods.additions.map(ingredientName).join(", ")}`);
  for (const id of mods.removals) parts.push(`No ${ingredientName(id)}`);
  return parts.join(" · ");
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/** What one more pick on this step costs, before any bundle: the label on an addition chip. */
export function getAdditionPrice(step: BuildStep, ingredientId: string): number {
  const pricing = step.pricing;
  if (pricing.mode === "included-then-extra") return pricing.extraPrice;
  if (pricing.mode === "surcharge-only") return getOption(step.id, ingredientId)?.surcharge ?? 0;
  return 0;
}

/**
 * Signature price at a size plus the cost of the additions, grouped by step so
 * a step's bundle applies. Returns undefined (not 0) for an unknown item, an
 * unknown size, or an addition the menu does not offer, so callers reject
 * unknown input instead of treating it as free. Removals cost nothing.
 */
export function calcSignaturePrice(itemId: string, sizeId: string, mods?: SignatureMods): number | undefined {
  const base = getSignaturePrice(itemId, sizeId);
  if (base === undefined) return undefined;

  const byStep = new Map<BuildStep, string[]>();
  for (const id of mods?.additions ?? []) {
    const step = getStepForIngredient(id);
    if (!step || step.select !== "multi") return undefined;
    const list = byStep.get(step) ?? [];
    list.push(id);
    byStep.set(step, list);
  }

  let total = base;
  for (const [step, ids] of byStep) {
    const pricing = step.pricing;
    if (pricing.mode === "included-then-extra") {
      total += extrasCost(ids.length, pricing);
    } else if (pricing.mode === "surcharge-only") {
      for (const id of ids) total += getOption(step.id, id)?.surcharge ?? 0;
    }
  }
  return total;
}
