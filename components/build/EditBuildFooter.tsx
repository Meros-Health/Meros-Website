"use client";

import { useState } from "react";
import { useTransitionRouter } from "@/components/transition/TransitionProvider";
import { BUILD_CONFIG } from "@/lib/menu/buildConfig";
import { isSelectionComplete } from "@/lib/menu/calcBowlPrice";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { useCartStore } from "@/store/cartStore";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

interface EditBuildFooterProps {
  lineId: string;
}

export function EditBuildFooter({ lineId }: EditBuildFooterProps) {
  const transitionRouter = useTransitionRouter();
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const nextStep = useBowlBuilderStore((s) => s.nextStep);
  const prevStep = useBowlBuilderStore((s) => s.prevStep);
  const updateCustomBowl = useCartStore((s) => s.updateCustomBowl);
  const openCart = useCartStore((s) => s.openCart);

  const [saved, setSaved] = useState(false);

  const stepIndex = BUILD_CONFIG.steps.findIndex((s) => s.id === activeStep);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === BUILD_CONFIG.steps.length - 1;
  const canSave = isSelectionComplete(selection);
  const firstRequired = BUILD_CONFIG.steps.find((s) => s.required);

  const handleSave = () => {
    if (!canSave) return;

    updateCustomBowl(lineId, selection);

    // Keep the 500ms "Saved" confirmation beat, then hand the actual route
    // swap to the coordinated transition.
    setSaved(true);
    setTimeout(() => {
      openCart();
      transitionRouter.push("/order");
    }, 500);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-3 pt-8 mt-8"
      style={{ borderTop: "0.5px solid rgba(41,45,42,0.12)" }}
    >
      {!isFirst && (
        <button
          type="button"
          onClick={prevStep}
          className="font-body-caps text-[10px] tracking-widest text-juniper px-6 py-3 transition-opacity hover:opacity-70"
          style={{ border: "0.5px solid rgba(41,45,42,0.2)" }}
        >
          Back
        </button>
      )}

      {!isLast && (
        <button
          type="button"
          onClick={nextStep}
          disabled={!canSave}
          className="font-body-caps text-[10px] tracking-widest text-midnight px-6 py-3 transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: "0.5px solid rgba(41,45,42,0.28)" }}
        >
          Next
        </button>
      )}

      <div className="flex-1" />

      {canSave ? (
        <AddToCartButton
          onClick={handleSave}
          label="Save Changes"
          addedLabel="Saved"
          added={saved}
          className="!w-auto"
        />
      ) : (
        <button
          type="button"
          disabled
          className="font-body-caps text-[10px] tracking-widest px-8 py-3.5 cursor-not-allowed text-midnight/35 bg-midnight/10"
        >
          Select a {firstRequired?.label ?? "Base"}
        </button>
      )}
    </div>
  );
}
