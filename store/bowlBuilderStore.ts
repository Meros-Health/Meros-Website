import { create } from "zustand";
import { BUILD_CONFIG, getStep } from "@/lib/menu/buildConfig";
import {
  calcBowlPrice,
  getSelectedIngredients,
  isSelectionComplete,
  type BowlSelection,
} from "@/lib/menu/calcBowlPrice";
import { EMPTY_NUTRITION, sumNutrition, type NutritionFacts } from "@/lib/menu/nutrition";
import { emptySelection } from "@/lib/menu/selectionUtils";

export type { BowlSelection };

interface BowlBuilderState {
  activeStep: string;
  selection: BowlSelection;
  /** Non-required steps the customer explicitly skipped (shown as complete). */
  skippedSteps: string[];
  nutrition: NutritionFacts;
  price: number;
  addedFeedback: boolean;

  setActiveStep: (stepId: string) => void;
  setSize: (sizeId: string) => void;
  /** Replaces on select "one" steps, toggles membership on "multi" steps. */
  toggleIngredient: (stepId: string, ingredientId: string) => void;
  skipStep: (stepId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  loadSelection: (selection: BowlSelection) => void;
  reset: () => void;
  showAddedFeedback: () => void;
  clearAddedFeedback: () => void;
}

function recompute(selection: BowlSelection) {
  const items = getSelectedIngredients(selection);
  return {
    nutrition: items.length > 0 ? sumNutrition(items) : { ...EMPTY_NUTRITION },
    // No price until every required step is chosen, matching the disabled
    // "Select a Base" state in the footer.
    price: isSelectionComplete(selection) ? calcBowlPrice(selection) : 0,
  };
}

function stepIndex(stepId: string): number {
  return BUILD_CONFIG.steps.findIndex((s) => s.id === stepId);
}

const FIRST_STEP = BUILD_CONFIG.steps[0].id;

export const useBowlBuilderStore = create<BowlBuilderState>((set, get) => ({
  activeStep: FIRST_STEP,
  selection: emptySelection(),
  skippedSteps: [],
  nutrition: { ...EMPTY_NUTRITION },
  price: 0,
  addedFeedback: false,

  setActiveStep: (stepId) => set({ activeStep: stepId }),

  setSize: (sizeId) => {
    const selection = { ...get().selection, sizeId };
    set({ selection, ...recompute(selection) });
  },

  toggleIngredient: (stepId, ingredientId) => {
    const step = getStep(stepId);
    if (!step) return;
    const current = get().selection.steps[stepId] ?? [];
    const has = current.includes(ingredientId);

    let next: string[];
    if (step.select === "one") {
      next = has ? [] : [ingredientId];
    } else if (has) {
      next = current.filter((id) => id !== ingredientId);
    } else {
      if (step.pricing.mode === "hard-cap" && current.length >= step.pricing.max) return;
      next = [...current, ingredientId];
    }

    const selection: BowlSelection = {
      ...get().selection,
      steps: { ...get().selection.steps, [stepId]: next },
    };
    set({
      selection,
      skippedSteps: get().skippedSteps.filter((id) => id !== stepId),
      ...recompute(selection),
    });
  },

  skipStep: (stepId) => {
    const step = getStep(stepId);
    if (!step || step.required) return;
    const selection: BowlSelection = {
      ...get().selection,
      steps: { ...get().selection.steps, [stepId]: [] },
    };
    set({
      selection,
      skippedSteps: [...new Set([...get().skippedSteps, stepId])],
      ...recompute(selection),
    });
  },

  nextStep: () => {
    const idx = stepIndex(get().activeStep);
    if (idx < BUILD_CONFIG.steps.length - 1) {
      set({ activeStep: BUILD_CONFIG.steps[idx + 1].id });
    }
  },

  prevStep: () => {
    const idx = stepIndex(get().activeStep);
    if (idx > 0) {
      set({ activeStep: BUILD_CONFIG.steps[idx - 1].id });
    }
  },

  loadSelection: (selection) => {
    // The bowl was already in the cart, so every empty optional step was a
    // deliberate choice: mark them skipped so the step nav reads as complete.
    const skippedSteps = BUILD_CONFIG.steps
      .filter((step) => !step.required && (selection.steps[step.id]?.length ?? 0) === 0)
      .map((step) => step.id);
    set({
      activeStep: FIRST_STEP,
      selection,
      skippedSteps,
      addedFeedback: false,
      ...recompute(selection),
    });
  },

  reset: () =>
    set({
      activeStep: FIRST_STEP,
      selection: emptySelection(),
      skippedSteps: [],
      nutrition: { ...EMPTY_NUTRITION },
      price: 0,
      addedFeedback: false,
    }),

  showAddedFeedback: () => set({ addedFeedback: true }),
  clearAddedFeedback: () => set({ addedFeedback: false }),
}));
