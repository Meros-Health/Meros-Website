"use client";

import { getItemsByStep } from "@/lib/menu/buildCatalog";
import {
  getCategorySurchargeBannerText,
  getItemPriceLabel,
  showCategorySurchargeBanner,
} from "@/lib/menu/calcBowlPrice";
import { PRICING } from "@/lib/menu/pricing";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { IngredientCard } from "./IngredientCard";

const STEP_COPY = {
  base: "Choose one yogurt base. All bowls start here.",
  "fruits-berries": `Pick up to ${PRICING.includedPerCategory.fruitsBerries} fruits & berries included — extras are +$${PRICING.extraItemSurcharge} each.`,
  "nuts-seeds": `Pick up to ${PRICING.includedPerCategory.nutsSeeds} nuts & seeds included — extras are +$${PRICING.extraItemSurcharge} each.`,
  finish: "Optional. Pick one finish drizzle.",
  enhancers: `Add enhancers for an extra boost — each +$${PRICING.enhancerPrice}.`,
} as const;

export function StepPanel() {
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const selectBase = useBowlBuilderStore((s) => s.selectBase);
  const toggleFruitBerry = useBowlBuilderStore((s) => s.toggleFruitBerry);
  const toggleNutsSeeds = useBowlBuilderStore((s) => s.toggleNutsSeeds);
  const selectFinish = useBowlBuilderStore((s) => s.selectFinish);
  const skipFinish = useBowlBuilderStore((s) => s.skipFinish);
  const toggleEnhancer = useBowlBuilderStore((s) => s.toggleEnhancer);
  const finishSkipped = useBowlBuilderStore((s) => s.finishSkipped);

  const items = getItemsByStep(activeStep);
  const isSingleSelect = activeStep === "base" || activeStep === "finish";

  const isSelected = (id: string): boolean => {
    switch (activeStep) {
      case "base":
        return selection.base?.id === id;
      case "fruits-berries":
        return selection.fruitsBerries.some((t) => t.id === id);
      case "nuts-seeds":
        return selection.nutsSeeds.some((t) => t.id === id);
      case "finish":
        return selection.finish?.id === id;
      case "enhancers":
        return selection.enhancers.some((s) => s.id === id);
      default:
        return false;
    }
  };

  const handleSelect = (item: (typeof items)[0]) => {
    switch (activeStep) {
      case "base":
        selectBase(item);
        break;
      case "fruits-berries":
        toggleFruitBerry(item);
        break;
      case "nuts-seeds":
        toggleNutsSeeds(item);
        break;
      case "finish":
        selectFinish(isSelected(item.id) ? null : item);
        break;
      case "enhancers":
        toggleEnhancer(item);
        break;
    }
  };

  return (
    <div>
      <p className="font-body-mixed text-sm text-juniper mb-4 max-w-md">{STEP_COPY[activeStep]}</p>

      {showCategorySurchargeBanner(activeStep, selection) && (
        <p
          className="font-body-caps text-[10px] tracking-widest text-grapefruit mb-4"
          style={{ borderLeft: "2px solid var(--color-grapefruit)", paddingLeft: "0.75rem" }}
        >
          {getCategorySurchargeBannerText(activeStep)}
        </p>
      )}

      {activeStep === "finish" && (
        <div className="mb-4">
          <button
            type="button"
            onClick={skipFinish}
            aria-pressed={selection.finish === null && finishSkipped}
            className="font-body-caps text-[10px] tracking-widest transition-colors"
            style={{
              color:
                selection.finish === null && finishSkipped
                  ? "var(--color-grapefruit)"
                  : "var(--color-juniper)",
              borderBottom:
                selection.finish === null && finishSkipped
                  ? "0.5px solid var(--color-grapefruit)"
                  : "none",
            }}
          >
            No finish
          </button>
        </div>
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        role={isSingleSelect ? "radiogroup" : "group"}
        aria-label={`${activeStep} options`}
      >
        {items.map((item) => (
          <IngredientCard
            key={item.id}
            item={item}
            selected={isSelected(item.id)}
            priceLabel={getItemPriceLabel(activeStep, item, selection)}
            onSelect={() => handleSelect(item)}
          />
        ))}
      </div>
    </div>
  );
}
