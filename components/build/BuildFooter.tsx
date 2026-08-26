"use client";

import { BUILD_CONFIG } from "@/lib/menu/buildConfig";
import { isSelectionComplete } from "@/lib/menu/calcBowlPrice";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { useCartStore } from "@/store/cartStore";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export function BuildFooter() {
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const nutrition = useBowlBuilderStore((s) => s.nutrition);
  const price = useBowlBuilderStore((s) => s.price);
  const nextStep = useBowlBuilderStore((s) => s.nextStep);
  const prevStep = useBowlBuilderStore((s) => s.prevStep);
  const reset = useBowlBuilderStore((s) => s.reset);
  const showAddedFeedback = useBowlBuilderStore((s) => s.showAddedFeedback);
  const clearAddedFeedback = useBowlBuilderStore((s) => s.clearAddedFeedback);
  const addedFeedback = useBowlBuilderStore((s) => s.addedFeedback);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const stepIndex = BUILD_CONFIG.steps.findIndex((s) => s.id === activeStep);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === BUILD_CONFIG.steps.length - 1;
  const canAdd = isSelectionComplete(selection);
  const firstRequired = BUILD_CONFIG.steps.find((s) => s.required);

  const handleAddToCart = () => {
    if (!canAdd) return;

    // The cart store derives size, name, price and nutrition from the
    // selection itself; the values passed here are placeholders it overwrites.
    addItem({
      kind: "custom",
      productId: "custom-bowl",
      name: "Custom Bowl",
      selection,
      nutrition,
      quantity: 1,
      unitPrice: price,
    });

    // Order matters: reset() clears the feedback flag, so set it afterwards.
    reset();
    showAddedFeedback();
    setTimeout(() => openCart(), 600);
    setTimeout(() => clearAddedFeedback(), 2000);
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
          disabled={!canAdd}
          className="font-body-caps text-[10px] tracking-widest text-midnight px-6 py-3 transition-opacity hover:opacity-70 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: "0.5px solid rgba(41,45,42,0.28)" }}
        >
          Next
        </button>
      )}

      <div className="flex-1" />

      {addedFeedback ? (
        <span className="font-body-caps text-[10px] tracking-widest text-grapefruit">
          Added to cart
        </span>
      ) : canAdd ? (
        <AddToCartButton onClick={handleAddToCart} className="!w-auto" />
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
