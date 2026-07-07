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

/** Display groups for the nutrition ring chart and legend. */
export type NutritionSegmentGroup = "macro" | "fiber" | "mineral";

export const NUTRITION_SEGMENT_GROUPS: Record<NutritionSegmentGroup, string> = {
  macro: "Macros",
  fiber: "Fiber",
  mineral: "Minerals & vitamins",
};

/** Keys shown on the allocation ring (excludes calories — shown in the center). */
export type NutritionSegmentId = Exclude<keyof NutritionFacts, "calories">;

export type NutritionSegmentConfig = {
  id: NutritionSegmentId;
  label: string;
  group: NutritionSegmentGroup;
  /** Meros palette token or rgba derived from brand colors. */
  color: string;
  unit: "g" | "mg";
  /** Daily reference intake for normalizing slice size. */
  dailyTarget: number;
};

/**
 * Single source of truth for bowl nutrition categories shown in the UI.
 * Add new vitamins/minerals here and on NutritionFacts when catalog data supports them.
 */
export const NUTRITION_SEGMENTS: readonly NutritionSegmentConfig[] = [
  {
    id: "protein",
    label: "Protein",
    group: "macro",
    color: "var(--color-grapefruit)",
    unit: "g",
    dailyTarget: 50,
  },
  {
    id: "carbs",
    label: "Carbs",
    group: "macro",
    color: "var(--color-juniper)",
    unit: "g",
    dailyTarget: 300,
  },
  {
    id: "fat",
    label: "Fat",
    group: "macro",
    color: "var(--color-midnight)",
    unit: "g",
    dailyTarget: 65,
  },
  {
    id: "fiber",
    label: "Fiber",
    group: "fiber",
    color: "var(--color-blue)",
    unit: "g",
    dailyTarget: 30,
  },
  {
    id: "calcium",
    label: "Calcium",
    group: "mineral",
    color: "color-mix(in srgb, var(--color-juniper) 72%, var(--color-cream))",
    unit: "mg",
    dailyTarget: 1000,
  },
  {
    id: "iron",
    label: "Iron",
    group: "mineral",
    color: "color-mix(in srgb, var(--color-midnight) 68%, var(--color-cream))",
    unit: "mg",
    dailyTarget: 18,
  },
  {
    id: "potassium",
    label: "Potassium",
    group: "mineral",
    color: "color-mix(in srgb, var(--color-grapefruit) 78%, var(--color-cream))",
    unit: "mg",
    dailyTarget: 3500,
  },
] as const;

/** Daily reference targets for progress scaling (not bowl totals). */
export const MACRO_TARGETS = {
  protein: 50,
  carbs: 300,
  fat: 65,
  fiber: 30,
  calories: 2000,
} as const;

export type MacroKey = keyof typeof MACRO_TARGETS;

export type NutritionRingSlice = NutritionSegmentConfig & {
  value: number;
  share: number;
  offset: number;
};

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

/** Normalized ring slices sized by share of daily reference intake. */
export function computeNutritionRingSlices(nutrition: NutritionFacts): NutritionRingSlice[] {
  const weighted = NUTRITION_SEGMENTS.map((segment) => {
    const value = nutrition[segment.id];
    const weight = value > 0 ? value / segment.dailyTarget : 0;
    return { ...segment, value, weight };
  }).filter((segment) => segment.weight > 0);

  const totalWeight = weighted.reduce((sum, segment) => sum + segment.weight, 0);
  if (totalWeight === 0) return [];

  let offset = 0;
  return weighted.map((segment) => {
    const share = segment.weight / totalWeight;
    const slice: NutritionRingSlice = {
      id: segment.id,
      label: segment.label,
      group: segment.group,
      color: segment.color,
      unit: segment.unit,
      dailyTarget: segment.dailyTarget,
      value: segment.value,
      share,
      offset,
    };
    offset += share;
    return slice;
  });
}

export function formatNutritionSegmentValue(value: number, unit: "g" | "mg"): string {
  const rounded = Math.round(value);
  return unit === "g" ? `${rounded}g` : `${rounded}mg`;
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
