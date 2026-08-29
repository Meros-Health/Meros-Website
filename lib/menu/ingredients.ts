// Typed accessor over the ingredient registry in lib/menu/menu.json.
//
// Every ingredient the store serves lives here exactly once. Build-a-bowl
// steps and signature recipes reference ingredients by id; nothing else in
// the codebase carries an ingredient name or nutrition figure.
import menuData from "@/lib/menu/menu.json";
import type { NutritionFacts } from "./nutrition";

export type NutritionStatus = "provisional" | "needs-label" | "needs-recipe" | "verified";

export type Ingredient = {
  id: string;
  name: string;
  servingLabel: string;
  nutrition: NutritionFacts;
  nutritionStatus: NutritionStatus;
  /** Freeform. Used for UI badges and filters only, never for pricing. */
  tags?: string[];
  description?: string;
  /** Bases only: the word the board's base line uses ("Vanilla" for "Vanilla Greek Yogurt"). */
  shortName?: string;
  /** A select:"multi" step id: where the Menu TV files a recipe-only ingredient. Unused here. */
  group?: string;
};

const INGREDIENTS: Ingredient[] = menuData.ingredients as Ingredient[];

const BY_ID = new Map<string, Ingredient>(INGREDIENTS.map((ing) => [ing.id, ing]));

export function listIngredients(): Ingredient[] {
  return INGREDIENTS;
}

export function getIngredient(id: string): Ingredient | undefined {
  return BY_ID.get(id);
}

/** Display name, or the raw id when the ingredient no longer exists. */
export function ingredientName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}

/** Resolves ids to ingredients, silently dropping any that do not exist. */
export function resolveIngredients(ids: string[]): Ingredient[] {
  const out: Ingredient[] = [];
  for (const id of ids) {
    const ing = BY_ID.get(id);
    if (ing) out.push(ing);
  }
  return out;
}
