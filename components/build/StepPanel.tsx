"use client";

import { getStep, getStepIngredients } from "@/lib/menu/buildConfig";
import { getOptionPriceLabel, getStepInstruction, isIncludedAllowanceUsed } from "@/lib/menu/calcBowlPrice";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { IngredientCard } from "./IngredientCard";

export function StepPanel() {
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const skippedSteps = useBowlBuilderStore((s) => s.skippedSteps);
  const toggleIngredient = useBowlBuilderStore((s) => s.toggleIngredient);
  const skipStep = useBowlBuilderStore((s) => s.skipStep);

  const step = getStep(activeStep);
  if (!step) return null;

  const items = getStepIngredients(step.id);
  const selectedIds = selection.steps[step.id] ?? [];
  const isSkipped = selectedIds.length === 0 && skippedSteps.includes(step.id);
  const isSingleSelect = step.select === "one";
  // "2 included. Extras +$2 each." is always on screen; once the free picks
  // are used it fades to grapefruit instead of a banner appearing, so nothing
  // below it moves.
  const extrasNext = isIncludedAllowanceUsed(step, selectedIds);

  return (
    <div>
      <p
        data-step-instruction
        data-extras-next={extrasNext ? "true" : undefined}
        className="font-body-mixed text-sm max-w-md transition-colors duration-700 ease-out motion-reduce:transition-none"
        style={{ color: extrasNext ? "var(--color-grapefruit-text)" : "var(--color-juniper)" }}
      >
        {getStepInstruction(step)}
      </p>
      {step.note && (
        <p className="font-body-caps text-[10px] tracking-widest text-juniper/70 mt-1 max-w-md">
          {step.note}
        </p>
      )}
      <div className="mb-4" />

      {!step.required && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => skipStep(step.id)}
            aria-pressed={isSkipped}
            className="font-body-caps text-[10px] tracking-widest transition-colors"
            style={{
              color: isSkipped ? "var(--color-grapefruit-text)" : "var(--color-juniper)",
              borderBottom: isSkipped ? "0.5px solid var(--color-grapefruit)" : "none",
            }}
          >
            No {step.label.toLowerCase()}
          </button>
        </div>
      )}

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        role={isSingleSelect ? "radiogroup" : "group"}
        aria-label={`${step.label} options`}
      >
        {items.map((item) => (
          <IngredientCard
            key={item.id}
            item={item}
            selected={selectedIds.includes(item.id)}
            priceLabel={getOptionPriceLabel(step, item.id, selectedIds)}
            onSelect={() => toggleIngredient(step.id, item.id)}
          />
        ))}
      </div>
    </div>
  );
}
