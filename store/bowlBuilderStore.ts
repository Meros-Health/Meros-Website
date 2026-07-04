import { create } from "zustand";
import {
  type BuildItem,
  type BuildStepId,
  BUILD_STEPS,
  SELECTION_LIMITS,
  calcBowlPrice,
  getSelectedItems,
} from "@/lib/menu/buildCatalog";
import { EMPTY_NUTRITION, sumNutrition, type NutritionFacts } from "@/lib/menu/nutrition";

export type BowlSelection = {
  base: BuildItem | null;
  toppings: BuildItem[];
  drizzle: BuildItem | null;
  supplements: BuildItem[];
};

const EMPTY_SELECTION: BowlSelection = {
  base: null,
  toppings: [],
  drizzle: null,
  supplements: [],
};

interface BowlBuilderState {
  activeStep: BuildStepId;
  selection: BowlSelection;
  nutrition: NutritionFacts;
  price: number;
  addedFeedback: boolean;

  setActiveStep: (step: BuildStepId) => void;
  selectBase: (item: BuildItem) => void;
  toggleTopping: (item: BuildItem) => void;
  selectDrizzle: (item: BuildItem | null) => void;
  toggleSupplement: (item: BuildItem) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  showAddedFeedback: () => void;
  clearAddedFeedback: () => void;
}

function recompute(selection: BowlSelection) {
  const items = getSelectedItems(selection);
  return {
    nutrition: items.length > 0 ? sumNutrition(items) : { ...EMPTY_NUTRITION },
    price: calcBowlPrice(selection),
  };
}

function stepIndex(step: BuildStepId): number {
  return BUILD_STEPS.findIndex((s) => s.id === step);
}

export const useBowlBuilderStore = create<BowlBuilderState>((set, get) => ({
  activeStep: "base",
  selection: { ...EMPTY_SELECTION },
  nutrition: { ...EMPTY_NUTRITION },
  price: 0,
  addedFeedback: false,

  setActiveStep: (step) => set({ activeStep: step }),

  selectBase: (item) => {
    const selection = { ...get().selection, base: item };
    set({ selection, ...recompute(selection) });
  },

  toggleTopping: (item) => {
    const { toppings } = get().selection;
    const exists = toppings.some((t) => t.id === item.id);
    let next: BuildItem[];
    if (exists) {
      next = toppings.filter((t) => t.id !== item.id);
    } else if (toppings.length >= SELECTION_LIMITS.toppings) {
      return;
    } else {
      next = [...toppings, item];
    }
    const selection = { ...get().selection, toppings: next };
    set({ selection, ...recompute(selection) });
  },

  selectDrizzle: (item) => {
    const selection = { ...get().selection, drizzle: item };
    set({ selection, ...recompute(selection) });
  },

  toggleSupplement: (item) => {
    const { supplements } = get().selection;
    const exists = supplements.some((s) => s.id === item.id);
    let next: BuildItem[];
    if (exists) {
      next = supplements.filter((s) => s.id !== item.id);
    } else if (supplements.length >= SELECTION_LIMITS.supplements) {
      return;
    } else {
      next = [...supplements, item];
    }
    const selection = { ...get().selection, supplements: next };
    set({ selection, ...recompute(selection) });
  },

  nextStep: () => {
    const idx = stepIndex(get().activeStep);
    if (idx < BUILD_STEPS.length - 1) {
      set({ activeStep: BUILD_STEPS[idx + 1].id });
    }
  },

  prevStep: () => {
    const idx = stepIndex(get().activeStep);
    if (idx > 0) {
      set({ activeStep: BUILD_STEPS[idx - 1].id });
    }
  },

  reset: () =>
    set({
      activeStep: "base",
      selection: { ...EMPTY_SELECTION },
      nutrition: { ...EMPTY_NUTRITION },
      price: 0,
      addedFeedback: false,
    }),

  showAddedFeedback: () => set({ addedFeedback: true }),
  clearAddedFeedback: () => set({ addedFeedback: false }),
}));
