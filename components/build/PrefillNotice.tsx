"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getIngredient } from "@/lib/menu/ingredients";
import { ENHANCERS_STEP_ID, isEnhancerOffered } from "@/lib/menu/featuredEnhancers";
import { getAdditionPrice } from "@/lib/menu/signatureMods";
import { getStep } from "@/lib/menu/buildConfig";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";

/**
 * `/build?add=<enhancerId>`: the home page Stacks section links here with one
 * enhancer already chosen.
 *
 * Untrusted input, so it takes the same shape as every other outside value:
 * the id has to be offered in the enhancers step, it is applied through the
 * store's `toggleIngredient` (which validates against the step) rather than by
 * writing the selection directly, and anything unrecognised is ignored in
 * silence. A hand-edited URL cannot put an ingredient in a bowl that the menu
 * does not offer, and cannot produce an error state either.
 *
 * The active step is deliberately left on Base: the customer still has to
 * choose one, and it is the first thing the builder asks for. That is exactly
 * why this notice exists. Without it the pick sits four steps away on a panel
 * nobody is looking at, and the link reads as broken.
 */
export function PrefillNotice() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("add");

  const toggleIngredient = useBowlBuilderStore((s) => s.toggleIngredient);
  const selection = useBowlBuilderStore((s) => s.selection);

  // The prefill is a one-shot on arrival. Without this guard, a re-render
  // after the customer removes the enhancer would put it straight back.
  const applied = useRef<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!requested || applied.current === requested) return;
    applied.current = requested;

    if (!isEnhancerOffered(requested)) return;

    const current = selection.steps[ENHANCERS_STEP_ID] ?? [];
    if (!current.includes(requested)) toggleIngredient(ENHANCERS_STEP_ID, requested);
    setAdded(requested);
    // selection is read once, on arrival: this must not re-run when the
    // customer edits their bowl afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested, toggleIngredient]);

  const ingredient = added ? getIngredient(added) : undefined;
  const stillSelected =
    added !== null && (selection.steps[ENHANCERS_STEP_ID] ?? []).includes(added);

  // Gone once the customer removes it from the step itself, so the notice can
  // never disagree with the bowl.
  if (!ingredient || !stillSelected) return null;

  const step = getStep(ENHANCERS_STEP_ID);
  const price = step ? getAdditionPrice(step, ingredient.id) : 0;

  return (
    <div
      className="mb-8 flex flex-wrap items-center justify-between gap-4 px-4 py-3.5"
      style={{
        border: "0.5px solid var(--color-grapefruit)",
        background: "rgba(215,142,119,0.06)",
      }}
    >
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-body-caps text-[10px] tracking-[0.20em] text-grapefruit-text">
          {ingredient.name} added
        </span>
        <span className="font-body-mixed text-[13px] text-juniper">
          {ingredient.servingLabel}
          {price > 0 ? ` · +$${price}` : ""}
        </span>
      </div>

      <button
        type="button"
        onClick={() => toggleIngredient(ENHANCERS_STEP_ID, ingredient.id)}
        className="font-body-caps text-[10px] tracking-[0.15em] text-juniper transition-opacity hover:opacity-70"
      >
        Remove
      </button>
    </div>
  );
}
