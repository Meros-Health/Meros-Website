// Typed accessor over the build-a-bowl configuration in lib/menu/menu.json.
//
// Steps are data. Adding, removing or reordering a step in menu.json is a
// complete change: the builder UI, the pricer, the cart and the Menu TV all
// iterate BUILD_CONFIG.steps rather than naming steps in code.
import menuData from "@/lib/menu/menu.json";
import { getIngredient, type Ingredient } from "./ingredients";

export type BuildStepPricing =
  /** Each option carries its own optional surcharge. No per-count charge. */
  | { mode: "surcharge-only" }
  /** The first `included` picks are free, every pick after that costs `extraPrice`. */
  | {
      mode: "included-then-extra";
      included: number;
      extraPrice: number;
      /** Optional volume price applied greedily to the extras, e.g. 3 for $7. */
      bundle?: { count: number; price: number; label: string };
    }
  /** At most `max` picks, never charged. */
  | { mode: "hard-cap"; max: number };

export type BuildOption = {
  ingredientId: string;
  /** Only legal on "surcharge-only" steps (enforced by scripts/validate-menu.mjs). */
  surcharge?: number;
};

export type BuildStep = {
  id: string;
  label: string;
  select: "one" | "multi";
  required: boolean;
  pricing: BuildStepPricing;
  /** Human note shown on every surface (availability, serving guidance). */
  note?: string;
  options: BuildOption[];
};

export type BuildSize = { id: string; label: string; price: number };

export type BuildConfig = {
  sizes: BuildSize[];
  intro?: string;
  steps: BuildStep[];
};

// The JSON module's inferred type is a plain-string union, not the
// discriminated union above; validate-menu.mjs guarantees the shape.
export const BUILD_CONFIG: BuildConfig = menuData.build as unknown as BuildConfig;

const STEPS_BY_ID = new Map<string, BuildStep>(BUILD_CONFIG.steps.map((step) => [step.id, step]));
const SIZES_BY_ID = new Map<string, BuildSize>(BUILD_CONFIG.sizes.map((size) => [size.id, size]));

/** step id -> ingredient id -> option. Also answers "is this offered in that step". */
const OPTIONS_BY_STEP = new Map<string, Map<string, BuildOption>>(
  BUILD_CONFIG.steps.map((step) => [step.id, new Map(step.options.map((opt) => [opt.ingredientId, opt]))])
);

/** ingredient id -> the one step that offers it (validator enforces uniqueness). */
const STEP_BY_INGREDIENT = new Map<string, BuildStep>();
for (const step of BUILD_CONFIG.steps) {
  for (const opt of step.options) STEP_BY_INGREDIENT.set(opt.ingredientId, step);
}

export function getStep(stepId: string): BuildStep | undefined {
  return STEPS_BY_ID.get(stepId);
}

export function getStepIndex(stepId: string): number {
  return BUILD_CONFIG.steps.findIndex((step) => step.id === stepId);
}

/** Two-digit ordinal for display: "01", "02", ... Derived, never stored. */
export function getStepNumber(stepId: string): string {
  return String(getStepIndex(stepId) + 1).padStart(2, "0");
}

export function getOption(stepId: string, ingredientId: string): BuildOption | undefined {
  return OPTIONS_BY_STEP.get(stepId)?.get(ingredientId);
}

export function isOffered(stepId: string, ingredientId: string): boolean {
  return OPTIONS_BY_STEP.get(stepId)?.has(ingredientId) ?? false;
}

/** The step that offers an ingredient, if any. Recipe-only ingredients return undefined. */
export function getStepForIngredient(ingredientId: string): BuildStep | undefined {
  return STEP_BY_INGREDIENT.get(ingredientId);
}

/** Resolved ingredients for a step, in menu order. */
export function getStepIngredients(stepId: string): Ingredient[] {
  const step = STEPS_BY_ID.get(stepId);
  if (!step) return [];
  const out: Ingredient[] = [];
  for (const opt of step.options) {
    const ing = getIngredient(opt.ingredientId);
    if (ing) out.push(ing);
  }
  return out;
}

export function getBuildSize(sizeId: string): BuildSize | undefined {
  return SIZES_BY_ID.get(sizeId);
}

/** First size in menu order. */
export function getDefaultBuildSizeId(): string {
  return BUILD_CONFIG.sizes[0].id;
}

/** Steps that must have a selection before a bowl can be priced or added. */
export function getRequiredSteps(): BuildStep[] {
  return BUILD_CONFIG.steps.filter((step) => step.required);
}
