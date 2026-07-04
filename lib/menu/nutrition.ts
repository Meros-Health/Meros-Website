// Nutrition helpers for the bowl builder.
// All catalog values are estimated per serving until lab-verified.

export type NutritionFacts = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  calcium: number;
  iron: number;
  potassium: number;
};

export const EMPTY_NUTRITION: NutritionFacts = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  calcium: 0,
  iron: 0,
  potassium: 0,
};

/** Daily reference targets for macro bar scaling (not bowl totals). */
export const MACRO_TARGETS = {
  protein: 50,
  carbs: 300,
  fat: 65,
  fiber: 30,
  calories: 2000,
} as const;

export type MacroKey = keyof typeof MACRO_TARGETS;

export function sumNutrition(items: { nutrition: NutritionFacts }[]): NutritionFacts {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein: acc.protein + item.nutrition.protein,
      carbs: acc.carbs + item.nutrition.carbs,
      fat: acc.fat + item.nutrition.fat,
      fiber: acc.fiber + item.nutrition.fiber,
      calcium: acc.calcium + item.nutrition.calcium,
      iron: acc.iron + item.nutrition.iron,
      potassium: acc.potassium + item.nutrition.potassium,
    }),
    { ...EMPTY_NUTRITION }
  );
}

export function macroPercent(value: number, key: MacroKey): number {
  return Math.min(100, (value / MACRO_TARGETS[key]) * 100);
}

export function formatGrams(value: number): string {
  return `${Math.round(value)}g`;
}

export function formatCalories(value: number): string {
  return `${Math.round(value)}`;
}

export function formatMacroSummary(nutrition: NutritionFacts): string {
  return `${formatGrams(nutrition.protein)} protein · ${formatCalories(nutrition.calories)} cal`;
}
