"use client";

import { BUILD_CONFIG, getStepNumber, type BuildStep } from "@/lib/menu/buildConfig";
import type { BowlSelection } from "@/lib/menu/calcBowlPrice";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { StepCompletionIcon } from "./StepCompletionIcon";

function isStepComplete(step: BuildStep, selection: BowlSelection, skippedSteps: string[]): boolean {
  const count = selection.steps[step.id]?.length ?? 0;
  return count > 0 || (!step.required && skippedSteps.includes(step.id));
}

/** A step is locked while any required step before it is still empty. */
function isStepLocked(step: BuildStep, selection: BowlSelection): boolean {
  for (const earlier of BUILD_CONFIG.steps) {
    if (earlier.id === step.id) return false;
    if (earlier.required && (selection.steps[earlier.id]?.length ?? 0) === 0) return true;
  }
  return false;
}

interface StepNavProps {
  layout?: "vertical" | "horizontal";
}

export function StepNav({ layout = "horizontal" }: StepNavProps) {
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const skippedSteps = useBowlBuilderStore((s) => s.skippedSteps);
  const setActiveStep = useBowlBuilderStore((s) => s.setActiveStep);

  const handleStepClick = (step: BuildStep) => {
    if (isStepLocked(step, selection)) return;
    setActiveStep(step.id);
  };

  if (layout === "horizontal") {
    return (
      <nav
        aria-label="Build steps"
        className="flex flex-wrap gap-2 w-full"
      >
        {BUILD_CONFIG.steps.map((step) => {
          const isActive = activeStep === step.id;
          const isLocked = isStepLocked(step, selection);
          const complete = isStepComplete(step, selection, skippedSteps);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step)}
              disabled={isLocked}
              aria-current={isActive ? "step" : undefined}
              className="flex items-center gap-2 text-left px-3 py-2 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{
                border: isActive
                  ? "0.5px solid var(--color-grapefruit)"
                  : "0.5px solid rgba(41,45,42,0.15)",
                background: isActive ? "rgba(215,142,119,0.06)" : "transparent",
              }}
            >
              <StepCompletionIcon complete={complete} />
              <span
                className="font-headline text-[9px] tracking-widest"
                style={{ color: isActive ? "var(--color-grapefruit)" : "var(--color-juniper)" }}
              >
                {getStepNumber(step.id)}
              </span>
              <span
                className="font-headline uppercase leading-none whitespace-nowrap"
                style={{
                  fontSize: "clamp(0.75rem, 1.2vw, 0.9rem)",
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

  return (
    <nav aria-label="Build steps" className="flex flex-col gap-0">
      {BUILD_CONFIG.steps.map((step) => {
        const isActive = activeStep === step.id;
        const isLocked = isStepLocked(step, selection);
        const complete = isStepComplete(step, selection, skippedSteps);

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => handleStepClick(step)}
            disabled={isLocked}
            aria-current={isActive ? "step" : undefined}
            className="group flex items-center gap-3 text-left py-3 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ borderBottom: "0.5px solid rgba(41,45,42,0.08)" }}
          >
            <StepCompletionIcon complete={complete} />
            <span
              className="font-headline text-[10px] tracking-widest shrink-0"
              style={{ color: isActive ? "var(--color-grapefruit)" : "var(--color-juniper)" }}
            >
              {getStepNumber(step.id)}
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
