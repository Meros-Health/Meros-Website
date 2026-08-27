// Pricing for custom bowls, driven entirely by BUILD_CONFIG. The same
// function prices the live builder, the persisted cart and the server-side
// checkout, so the three can never disagree.
import { BUILD_CONFIG, getBuildSize, type BuildStep } from "./buildConfig";
import { getIngredient, type Ingredient } from "./ingredients";

/** Ordered ingredient ids per step. Order matters: the first `included` picks are the free ones. */
export type BowlSelection = {
  sizeId: string;
  steps: Record<string, string[]>;
};

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatSurcharge(amount: number): string {
  return `+$${amount.toFixed(2)}`;
}

/**
 * Cost of `extra` picks beyond the included count, honouring the bundle when
 * present. Shared with signature additions (lib/menu/signatureMods.ts), which
 * are priced as extras on top of a signature's flat price.
 */
export function extrasCost(extra: number, pricing: Extract<BuildStep["pricing"], { mode: "included-then-extra" }>): number {
  if (extra <= 0) return 0;
  if (pricing.bundle) {
    const bundles = Math.floor(extra / pricing.bundle.count);
    const remainder = extra % pricing.bundle.count;
    return bundles * pricing.bundle.price + remainder * pricing.extraPrice;
  }
  return extra * pricing.extraPrice;
}

/**
 * Throws PricingError on anything the menu does not offer: unknown size,
 * unknown step, an ingredient not offered in that step, or a count that
 * violates the step's select / hard-cap rule. Callers that handle untrusted
 * input (checkout) catch it; the builder never produces invalid selections.
 */
export function calcBowlPrice(selection: BowlSelection): number {
  const size = getBuildSize(selection.sizeId);
  if (!size) throw new PricingError(`Unknown size "${selection.sizeId}"`);

  for (const stepId of Object.keys(selection.steps)) {
    if (!BUILD_CONFIG.steps.some((step) => step.id === stepId)) {
      throw new PricingError(`Unknown step "${stepId}"`);
    }
  }

  let total = size.price;

  for (const step of BUILD_CONFIG.steps) {
    const ids = selection.steps[step.id] ?? [];
    if (step.select === "one" && ids.length > 1) {
      throw new PricingError(`Step "${step.id}" allows one selection`);
    }

    for (const id of ids) {
      const option = step.options.find((opt) => opt.ingredientId === id);
      if (!option) throw new PricingError(`"${id}" is not offered in step "${step.id}"`);
      total += option.surcharge ?? 0;
    }

    const pricing = step.pricing;
    if (pricing.mode === "included-then-extra") {
      total += extrasCost(ids.length - pricing.included, pricing);
    } else if (pricing.mode === "hard-cap" && ids.length > pricing.max) {
      throw new PricingError(`Step "${step.id}" allows at most ${pricing.max} selections`);
    }
  }

  return total;
}

/** Every selected ingredient in step order, for nutrition sums and summaries. */
export function getSelectedIngredients(selection: BowlSelection): Ingredient[] {
  const out: Ingredient[] = [];
  for (const step of BUILD_CONFIG.steps) {
    for (const id of selection.steps[step.id] ?? []) {
      const ing = getIngredient(id);
      if (ing) out.push(ing);
    }
  }
  return out;
}

/** True when every required step has at least one selection. */
export function isSelectionComplete(selection: BowlSelection): boolean {
  return BUILD_CONFIG.steps.every((step) => !step.required || (selection.steps[step.id]?.length ?? 0) > 0);
}

/**
 * Per-option price label for the builder card. For included-then-extra steps
 * the label depends on what is already selected: a selected item is "Included"
 * if it sits inside the free count, otherwise it shows the extra price; an
 * unselected item shows what it would cost if picked next.
 */
export function getOptionPriceLabel(step: BuildStep, ingredientId: string, selectedIds: string[]): string | null {
  const option = step.options.find((opt) => opt.ingredientId === ingredientId);
  if (!option) return null;

  const pricing = step.pricing;
  if (pricing.mode === "surcharge-only") {
    return option.surcharge ? formatSurcharge(option.surcharge) : "Included";
  }
  if (pricing.mode === "hard-cap") {
    return "Included";
  }

  const index = selectedIds.indexOf(ingredientId);
  const position = index >= 0 ? index : selectedIds.length;
  return position >= pricing.included ? formatSurcharge(pricing.extraPrice) : "Included";
}

/** Shown once the free picks on an included-then-extra step are used up. */
export function showStepSurchargeBanner(step: BuildStep, selectedIds: string[]): boolean {
  const pricing = step.pricing;
  return pricing.mode === "included-then-extra" && pricing.included > 0 && selectedIds.length >= pricing.included;
}

export function getStepSurchargeBannerText(step: BuildStep): string {
  const pricing = step.pricing;
  if (pricing.mode !== "included-then-extra") return "";
  return `${pricing.included} included. Additional selections ${formatSurcharge(pricing.extraPrice)} each.`;
}

/** One-line instruction for the top of a step panel, derived from its rules. */
export function getStepInstruction(step: BuildStep): string {
  const pricing = step.pricing;
  if (step.select === "one") {
    return step.required ? "Choose one." : "Optional. Choose one.";
  }
  if (pricing.mode === "hard-cap") {
    return `Choose up to ${pricing.max}.`;
  }
  if (pricing.mode === "included-then-extra") {
    if (pricing.included === 0) {
      const bundle = pricing.bundle ? ` ${pricing.bundle.label}.` : "";
      return `Each +$${pricing.extraPrice}.${bundle}`;
    }
    return `${pricing.included} included. Extras +$${pricing.extraPrice} each.`;
  }
  return "Choose any.";
}
