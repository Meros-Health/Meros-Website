import { create } from "zustand";
import {
  type BuildItem,
  type BuildStepId,
  BUILD_STEPS,
} from "@/lib/menu/buildCatalog";
import { calcBowlPrice, getSelectedItems } from "@/lib/menu/calcBowlPrice";
import { EMPTY_NUTRITION, sumNutrition, type NutritionFacts } from "@/lib/menu/nutrition";
import type { CustomBowlSelection } from "@/store/cartStore";
import { migrateLegacySelection, type LegacyBowlSelectionSnapshot } from "@/lib/menu/selectionUtils";

export type BowlSelection = {
  base: BuildItem | null;
  fruitsBerries: BuildItem[];
  nutsSeeds: BuildItem[];
  finish: BuildItem | null;
  enhancers: BuildItem[];
};

const EMPTY_SELECTION: BowlSelection = {
  base: null,
  fruitsBerries: [],
  nutsSeeds: [],
  finish: null,
  enhancers: [],
};

interface BowlBuilderState {
  activeStep: BuildStepId;
  selection: BowlSelection;
  nutrition: NutritionFacts;
  price: number;
  addedFeedback: boolean;
  finishSkipped: boolean;

  setActiveStep: (step: BuildStepId) => void;
  selectBase: (item: BuildItem) => void;
  toggleFruitBerry: (item: BuildItem) => void;
  toggleNutsSeeds: (item: BuildItem) => void;
  selectFinish: (item: BuildItem | null) => void;
  skipFinish: () => void;
  toggleEnhancer: (item: BuildItem) => void;
  nextStep: () => void;
  prevStep: () => void;
  loadSelection: (selection: CustomBowlSelection) => void;
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

function toggleInList(list: BuildItem[], item: BuildItem): BuildItem[] {
  const exists = list.some((i) => i.id === item.id);
  return exists ? list.filter((i) => i.id !== item.id) : [...list, item];
}

export const useBowlBuilderStore = create<BowlBuilderState>((set, get) => ({
  activeStep: "base",
  selection: { ...EMPTY_SELECTION },
  nutrition: { ...EMPTY_NUTRITION },
  price: 0,
  addedFeedback: false,
  finishSkipped: false,

  setActiveStep: (step) => set({ activeStep: step }),

  selectBase: (item) => {
    const selection = { ...get().selection, base: item };
    set({ selection, ...recompute(selection) });
  },

  toggleFruitBerry: (item) => {
    const selection = {
      ...get().selection,
      fruitsBerries: toggleInList(get().selection.fruitsBerries, item),
    };
    set({ selection, ...recompute(selection) });
  },

  toggleNutsSeeds: (item) => {
    const selection = {
      ...get().selection,
      nutsSeeds: toggleInList(get().selection.nutsSeeds, item),
    };
    set({ selection, ...recompute(selection) });
  },

  // Choosing (or deselecting) a finish item is not a "skip" — only the
  // explicit "No finish" action marks the step as intentionally skipped.
  selectFinish: (item) => {
    const selection = { ...get().selection, finish: item };
    set({ selection, finishSkipped: false, ...recompute(selection) });
  },

  skipFinish: () => {
    const selection = { ...get().selection, finish: null };
    set({ selection, finishSkipped: true, ...recompute(selection) });
  },

  toggleEnhancer: (item) => {
    const selection = {
      ...get().selection,
      enhancers: toggleInList(get().selection.enhancers, item),
    };
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

  loadSelection: (cartSelection) => {
    const migrated = migrateLegacySelection(cartSelection as LegacyBowlSelectionSnapshot);
    const selection: BowlSelection = {
      base: migrated.base,
      fruitsBerries: [...migrated.fruitsBerries],
      nutsSeeds: [...migrated.nutsSeeds],
      finish: migrated.finish,
      enhancers: [...migrated.enhancers],
    };
    // The bowl was already added to the cart, so the finish decision was made:
    // no finish on the saved bowl means it was skipped deliberately.
    set({
      activeStep: "base",
      selection,
      finishSkipped: migrated.finish === null,
      addedFeedback: false,
      ...recompute(selection),
    });
  },

  reset: () =>
    set({
      activeStep: "base",
      selection: { ...EMPTY_SELECTION },
      nutrition: { ...EMPTY_NUTRITION },
      price: 0,
      addedFeedback: false,
      finishSkipped: false,
    }),

  showAddedFeedback: () => set({ addedFeedback: true }),
  clearAddedFeedback: () => set({ addedFeedback: false }),
}));
