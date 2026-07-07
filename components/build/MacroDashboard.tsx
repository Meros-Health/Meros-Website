"use client";

import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { MacroBar } from "./MacroBar";
import { IngredientSummary } from "./IngredientSummary";
import { BUILD_STEPS } from "@/lib/menu/buildCatalog";

interface MacroDashboardProps {
  compact?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function MacroDashboard({ compact = false, expanded = false, onToggleExpand }: MacroDashboardProps) {
  const nutrition = useBowlBuilderStore((s) => s.nutrition);
  const price = useBowlBuilderStore((s) => s.price);
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);

  const stepIndex = BUILD_STEPS.findIndex((s) => s.id === activeStep);

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full text-left"
        style={{
          border: "0.5px solid rgba(41,45,42,0.15)",
          padding: "0.75rem 1rem",
        }}
        aria-expanded={false}
        aria-label="Expand nutrition summary"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-4 font-body-caps text-[10px] tracking-widest text-midnight">
            <span>{Math.round(nutrition.protein)}g protein</span>
            <span>{Math.round(nutrition.calories)} cal</span>
          </div>
          <span className="font-body-caps text-[10px] text-midnight">${price.toFixed(2)}</span>
        </div>
      </button>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{
        border: compact ? "0.5px solid rgba(41,45,42,0.15)" : undefined,
        padding: compact ? "1rem" : undefined,
      }}
    >
      {compact && onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="mb-3 self-end font-body-caps text-[9px] tracking-widest text-juniper"
          aria-label="Collapse nutrition summary"
        >
          Collapse
        </button>
      )}

      <p className="font-body-caps text-[9px] tracking-[0.25em] text-juniper mb-3">Your macros</p>

      <div className="flex flex-col gap-3">
        <MacroBar label="Protein" value={nutrition.protein} macroKey="protein" />
        <MacroBar
          label="Carbs"
          value={nutrition.carbs}
          macroKey="carbs"
          fillClass="bg-juniper"
        />
        <MacroBar label="Fat" value={nutrition.fat} macroKey="fat" fillClass="bg-juniper" />
        <MacroBar label="Fiber" value={nutrition.fiber} macroKey="fiber" fillClass="bg-juniper" />
        <MacroBar label="Calories" value={nutrition.calories} macroKey="calories" unit="" />
      </div>

      {(nutrition.calcium > 0 || nutrition.iron > 0 || nutrition.potassium > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {nutrition.calcium > 0 && (
            <span
              className="font-body-caps text-[8px] tracking-widest text-juniper px-1.5 py-0.5"
              style={{ border: "0.5px solid rgba(41,45,42,0.15)" }}
            >
              Ca {Math.round(nutrition.calcium)}mg
            </span>
          )}
          {nutrition.iron > 0 && (
            <span
              className="font-body-caps text-[8px] tracking-widest text-juniper px-1.5 py-0.5"
              style={{ border: "0.5px solid rgba(41,45,42,0.15)" }}
            >
              Fe {Math.round(nutrition.iron)}mg
            </span>
          )}
          {nutrition.potassium > 0 && (
            <span
              className="font-body-caps text-[8px] tracking-widest text-juniper px-1.5 py-0.5"
              style={{ border: "0.5px solid rgba(41,45,42,0.15)" }}
            >
              K {Math.round(nutrition.potassium)}mg
            </span>
          )}
        </div>
      )}

      <p className="font-body-mixed text-[9px] text-juniper/70 mt-3">Estimated nutrition</p>

      {selection.base && (
        <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid rgba(41,45,42,0.12)" }}>
          <IngredientSummary />
        </div>
      )}

      <div
        className="mt-4 flex items-baseline justify-between pt-3"
        style={{ borderTop: "0.5px solid rgba(41,45,42,0.12)" }}
      >
        <span className="font-body-caps text-[9px] tracking-widest text-juniper">Total</span>
        <span className="font-headline text-midnight text-lg">${price.toFixed(2)}</span>
      </div>

      <div className="mt-3 flex gap-1" aria-hidden>
        {BUILD_STEPS.map((step, i) => (
          <span
            key={step.id}
            className="h-[2px] flex-1"
            style={{
              background: i <= stepIndex ? "var(--color-grapefruit)" : "rgba(41,45,42,0.12)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
