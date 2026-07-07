"use client";

import { BUILD_STEPS, type BuildStepId } from "@/lib/menu/buildCatalog";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { StepCompletionIcon } from "./StepCompletionIcon";

function isStepComplete(
  stepId: BuildStepId,
  selection: ReturnType<typeof useBowlBuilderStore.getState>["selection"],
  finishSkipped: boolean
): boolean {
  switch (stepId) {
    case "base":
      return selection.base !== null;
    case "fruits-berries":
      return selection.fruitsBerries.length > 0;
    case "nuts-seeds":
      return selection.nutsSeeds.length > 0;
    case "finish":
      return selection.finish !== null || finishSkipped;
    case "enhancers":
      return selection.enhancers.length > 0;
    default:
      return false;
  }
}

interface StepNavProps {
  layout?: "vertical" | "horizontal";
}

export function StepNav({ layout = "horizontal" }: StepNavProps) {
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const finishSkipped = useBowlBuilderStore((s) => s.finishSkipped);
  const setActiveStep = useBowlBuilderStore((s) => s.setActiveStep);
  const hasBase = selection.base !== null;

  const handleStepClick = (stepId: BuildStepId) => {
    if (stepId !== "base" && !hasBase) return;
    setActiveStep(stepId);
  };

  if (layout === "horizontal") {
    return (
      <nav
        aria-label="Build steps"
        className="flex flex-wrap gap-2 w-full"
      >
        {BUILD_STEPS.map((step) => {
          const isActive = activeStep === step.id;
          const isLocked = step.id !== "base" && !hasBase;
          const complete = isStepComplete(step.id, selection, finishSkipped);

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step.id)}
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
                {step.number}
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
      {BUILD_STEPS.map((step) => {
        const isActive = activeStep === step.id;
        const isLocked = step.id !== "base" && !hasBase;
        const complete = isStepComplete(step.id, selection, finishSkipped);

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => handleStepClick(step.id)}
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
