"use client";

import { getItemsByCategory, SELECTION_LIMITS } from "@/lib/menu/buildCatalog";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { IngredientCard } from "./IngredientCard";

const STEP_COPY = {
  base: "Choose one yogurt base. All bowls start here.",
  toppings: `Add up to ${SELECTION_LIMITS.toppings} toppings — fruits, crunch, nuts, and seeds.`,
  drizzle: "Optional. Pick one drizzle or skip.",
  supplements: `Add up to ${SELECTION_LIMITS.supplements} supplements for an extra boost.`,
} as const;

export function StepPanel() {
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const selectBase = useBowlBuilderStore((s) => s.selectBase);
  const toggleTopping = useBowlBuilderStore((s) => s.toggleTopping);
  const selectDrizzle = useBowlBuilderStore((s) => s.selectDrizzle);
  const toggleSupplement = useBowlBuilderStore((s) => s.toggleSupplement);

  const items = getItemsByCategory(
    activeStep === "toppings" ? "topping" : activeStep === "supplements" ? "supplement" : activeStep
  );

  const isSelected = (id: string): boolean => {
    switch (activeStep) {
      case "base":
        return selection.base?.id === id;
      case "toppings":
        return selection.toppings.some((t) => t.id === id);
      case "drizzle":
        return selection.drizzle?.id === id;
      case "supplements":
        return selection.supplements.some((s) => s.id === id);
      default:
        return false;
    }
  };

  const isDisabled = (id: string): boolean => {
    if (activeStep === "toppings") {
      const atLimit = selection.toppings.length >= SELECTION_LIMITS.toppings;
      return atLimit && !selection.toppings.some((t) => t.id === id);
    }
    if (activeStep === "supplements") {
      const atLimit = selection.supplements.length >= SELECTION_LIMITS.supplements;
      return atLimit && !selection.supplements.some((s) => s.id === id);
    }
    return false;
  };

  const handleSelect = (item: (typeof items)[0]) => {
    switch (activeStep) {
      case "base":
        selectBase(item);
        break;
      case "toppings":
        toggleTopping(item);
        break;
      case "drizzle":
        selectDrizzle(isSelected(item.id) ? null : item);
        break;
      case "supplements":
        toggleSupplement(item);
        break;
    }
  };

  return (
    <div>
      <p className="font-body-mixed text-sm text-juniper mb-6 max-w-md">
        {STEP_COPY[activeStep]}
      </p>

      {activeStep === "drizzle" && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => selectDrizzle(null)}
            aria-pressed={selection.drizzle === null}
            className="font-body-caps text-[10px] tracking-widest transition-colors"
            style={{
              color: selection.drizzle === null ? "var(--color-grapefruit)" : "var(--color-juniper)",
              borderBottom: selection.drizzle === null ? "0.5px solid var(--color-grapefruit)" : "none",
            }}
          >
            No drizzle
          </button>
        </div>
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        role={activeStep === "base" || activeStep === "drizzle" ? "radiogroup" : "group"}
        aria-label={`${activeStep} options`}
      >
        {items.map((item) => (
          <IngredientCard
            key={item.id}
            item={item}
            selected={isSelected(item.id)}
            disabled={isDisabled(item.id)}
            onSelect={() => handleSelect(item)}
          />
        ))}
      </div>
    </div>
  );
}
