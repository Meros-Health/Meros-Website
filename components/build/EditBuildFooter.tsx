"use client";

import { useEffect, useRef, useState } from "react";
import { useTransitionRouter } from "@/components/transition/TransitionProvider";
import { BUILD_CONFIG } from "@/lib/menu/buildConfig";
import { isSelectionComplete } from "@/lib/menu/calcBowlPrice";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { useCartStore } from "@/store/cartStore";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

const CONFIRMATION_MS = 500;

interface EditBuildFooterProps {
  lineId: string;
  /** False once the line being edited has left the cart while this page is open. */
  lineExists: boolean;
}

type Outcome = "saved" | "added";

export function EditBuildFooter({ lineId, lineExists }: EditBuildFooterProps) {
  const transitionRouter = useTransitionRouter();
  const activeStep = useBowlBuilderStore((s) => s.activeStep);
  const selection = useBowlBuilderStore((s) => s.selection);
  const nutrition = useBowlBuilderStore((s) => s.nutrition);
  const price = useBowlBuilderStore((s) => s.price);
  const nextStep = useBowlBuilderStore((s) => s.nextStep);
  const prevStep = useBowlBuilderStore((s) => s.prevStep);
  const updateCustomBowl = useCartStore((s) => s.updateCustomBowl);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // Handler-level guard: the disabled attribute only applies after the next render.
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leaving the page within the confirmation beat drops the drawer-open and
  // navigation choreography; the cart write itself already happened.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const stepIndex = BUILD_CONFIG.steps.findIndex((s) => s.id === activeStep);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === BUILD_CONFIG.steps.length - 1;
  const canSave = isSelectionComplete(selection);
  const firstRequired = BUILD_CONFIG.steps.find((s) => s.required);

  const finish = (result: Outcome) => {
    // Keep the confirmation beat, then hand the route swap to the transition.
    setOutcome(result);
    timerRef.current = setTimeout(() => {
      // If another navigation started during the beat, the push is refused
      // and the drawer must not open over whichever page that click chose.
      if (transitionRouter.push("/order")) openCart();
    }, CONFIRMATION_MS);
  };

  const handleSave = () => {
    if (!canSave || busyRef.current) return;
    busyRef.current = true;

    const result = updateCustomBowl(lineId, selection);
    if (result === "missing") {
      // The line left the cart between render and click; the notice branch
      // below takes over on the next render.
      busyRef.current = false;
      return;
    }
    finish("saved");
  };

  const handleReAdd = () => {
    if (!canSave || busyRef.current) return;
    busyRef.current = true;
    // The cart store derives size, name, price and nutrition from the
    // selection itself; the values passed here are placeholders it overwrites.
    const result = addItem({
      kind: "custom",
      productId: "custom-bowl",
      name: "Custom Bowl",
      selection,
      nutrition,
      quantity: 1,
      unitPrice: price,
    });
    if (result !== "added") {
      busyRef.current = false;
      return;
    }
    finish("added");
  };

  const showRemovedNotice = outcome === "added" || (outcome === null && !lineExists);

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

      {!canSave ? (
        <button
          type="button"
          disabled
          className="font-body-caps text-[10px] tracking-widest px-8 py-3.5 cursor-not-allowed text-midnight/35 bg-midnight/10"
        >
          Select a {firstRequired?.label ?? "Base"}
        </button>
      ) : showRemovedNotice ? (
        <div className="flex flex-wrap items-center gap-3" data-edit-line-removed>
          <p role="status" className="font-body-mixed text-[11px] text-juniper">
            This bowl was removed from your cart.
          </p>
          <AddToCartButton
            onClick={handleReAdd}
            label="Add to Cart"
            addedLabel="Added"
            added={outcome === "added"}
            className="!w-auto"
          />
        </div>
      ) : (
        <AddToCartButton
          onClick={handleSave}
          label="Save Changes"
          addedLabel="Saved"
          added={outcome === "saved"}
          className="!w-auto"
        />
      )}
    </div>
  );
}
