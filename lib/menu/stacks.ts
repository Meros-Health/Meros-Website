// The named Stacks in lib/menu/menu.json: four curated sets of enhancers,
// each exactly the enhancers step's bundle count, sold at the bundle price.
//
// A Stack is not a separate product and has no price of its own. Ordering one
// is ordering its enhancers, and calcBowlPrice / calcSignaturePrice already
// charge any bundle.count enhancers at bundle.price. What this file adds is
// the names: which three go together, and which signature each pairs with.
// The home page Stacks section, the /menu panels and the Menu TV all print
// from here, so a Stack renamed in menu.json is renamed everywhere.
import menuData from "@/lib/menu/menu.json";
import { BUILD_CONFIG } from "./buildConfig";
import { getIngredient, ingredientName, type Ingredient } from "./ingredients";

export type Stack = {
  id: string;
  /** Board copy: "Rebuild Stack". */
  name: string;
  /** Ingredient ids, every one offered in the enhancers step (validated). */
  enhancers: string[];
  /** Signature ids the platform suggests it with. Presentation, optional. */
  pairsWith?: string[];
};

const STACKS: Stack[] = menuData.stacks.items as Stack[];
const BY_ID = new Map<string, Stack>(STACKS.map((stack) => [stack.id, stack]));

export const ENHANCERS_STEP_ID = "enhancers";

function enhancersPricing() {
  const step = BUILD_CONFIG.steps.find((s) => s.id === ENHANCERS_STEP_ID);
  const pricing = step?.pricing;
  return pricing?.mode === "included-then-extra" ? pricing : undefined;
}

export function listStacks(): Stack[] {
  return STACKS;
}

export function getStack(id: string): Stack | undefined {
  return BY_ID.get(id);
}

/** How many enhancers make a Stack: the enhancers step's bundle count. */
export function stackSize(): number {
  // No bundle configured: the validator refuses that menu, and three is the
  // shape every Stack has had.
  return enhancersPricing()?.bundle?.count ?? 3;
}

/** What a Stack costs on top of a bowl or smoothie, or undefined if the menu has no bundle. */
export function stackPrice(): number | undefined {
  return enhancersPricing()?.bundle?.price;
}

/** What one enhancer costs on its own. */
export function singleEnhancerPrice(): number | undefined {
  return enhancersPricing()?.extraPrice;
}

/** The Stack's ingredient records, in Stack order. An id that no longer resolves is dropped. */
export function stackIngredients(stack: Stack): Ingredient[] {
  return stack.enhancers.flatMap((id) => {
    const ingredient = getIngredient(id);
    return ingredient ? [ingredient] : [];
  });
}

/** "Whey Protein Isolate, Creatine Monohydrate, L-Glutamine". */
export function formatStack(stack: Stack): string {
  return stack.enhancers.map(ingredientName).join(", ");
}

/** The first Stack that carries this enhancer, if any. */
export function stackForIngredient(ingredientId: string): Stack | undefined {
  return STACKS.find((stack) => stack.enhancers.includes(ingredientId));
}

/** Enhancers the step offers that no Stack names: sold one at a time. */
export function shelfEnhancerIds(): string[] {
  const step = BUILD_CONFIG.steps.find((s) => s.id === ENHANCERS_STEP_ID);
  const inStacks = new Set(STACKS.flatMap((stack) => stack.enhancers));
  return (step?.options ?? []).map((opt) => opt.ingredientId).filter((id) => !inStacks.has(id));
}
