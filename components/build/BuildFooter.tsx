"use client";

import { BUILD_STEPS } from "@/lib/menu/buildCatalog";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { useCartStore } from "@/store/cartStore";
import { CTAButton } from "@/components/ui/CTAButton";

export function BuildFooter() {
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const nutrition = useBowlBuilderStore((s) => s.nutrition);
  const price = useBowlBuilderStore((s) => s.price);
  const nextStep = useBowlBuilderStore((s) => s.nextStep);
  const prevStep = useBowlBuilderStore((s) => s.prevStep);
  const reset = useBowlBuilderStore((s) => s.reset);
  const showAddedFeedback = useBowlBuilderStore((s) => s.showAddedFeedback);
  const addedFeedback = useBowlBuilderStore((s) => s.addedFeedback);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const stepIndex = BUILD_STEPS.findIndex((s) => s.id === activeStep);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === BUILD_STEPS.length - 1;
  const canAdd = selection.base !== null;

  const handleAddToCart = () => {
    if (!selection.base) return;

    addItem({
      kind: "custom",
      productId: "custom-bowl",
      name: "Custom Bowl",
      selection: {
        base: selection.base,
        toppings: selection.toppings,
        drizzle: selection.drizzle,
        supplements: selection.supplements,
      },
      nutrition,
      quantity: 1,
      unitPrice: price,
    });

    showAddedFeedback();
    reset();
    setTimeout(() => openCart(), 600);
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
        <CTAButton variant="dark" onClick={handleAddToCart}>
          Add to Cart
        </CTAButton>
      ) : (
        <button
          type="button"
          disabled
          className="font-body-caps text-[10px] tracking-widest px-8 py-3.5 cursor-not-allowed text-midnight/35 bg-midnight/10"
        >
          Select a Base
        </button>
      )}
    </div>
  );
}
