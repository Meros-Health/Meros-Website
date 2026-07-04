"use client";

import { BUILD_STEPS, type BuildStepId } from "@/lib/menu/buildCatalog";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";

export function StepNav() {
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const setActiveStep = useBowlBuilderStore((s) => s.setActiveStep);
  const hasBase = useBowlBuilderStore((s) => s.selection.base !== null);

  const handleStepClick = (stepId: BuildStepId) => {
    if (stepId !== "base" && !hasBase) return;
    setActiveStep(stepId);
  };

  return (
    <nav aria-label="Build steps" className="flex flex-col gap-0">
      {BUILD_STEPS.map((step) => {
        const isActive = activeStep === step.id;
        const isLocked = step.id !== "base" && !hasBase;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => handleStepClick(step.id)}
            disabled={isLocked}
            aria-current={isActive ? "step" : undefined}
            className="group flex items-baseline gap-3 text-left py-3 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderBottom: "0.5px solid rgba(41,45,42,0.08)",
            }}
          >
            <span
              className="font-headline text-[10px] tracking-widest"
              style={{ color: isActive ? "var(--color-grapefruit)" : "var(--color-juniper)" }}
            >
              {step.number}
            </span>
            <span
              className="font-headline uppercase leading-none"
              style={{
                fontSize: "clamp(0.9rem, 1.5vw, 1.1rem)",
                color: isActive ? "var(--color-midnight)" : "var(--color-juniper)",
              }}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
