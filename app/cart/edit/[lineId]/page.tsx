"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BowlConfigurator } from "@/components/build/BowlConfigurator";
import { useTransitionRouter } from "@/components/transition/TransitionProvider";
import { normalizeSelection } from "@/lib/menu/selectionUtils";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { useCartStore } from "@/store/cartStore";
import { useCartHydrated } from "@/store/useCartHydrated";

export default function EditBowlPage() {
  const params = useParams();
  const router = useRouter();
  const transitionRouter = useTransitionRouter();
  const lineId = params.lineId as string;
  const hydrated = useCartHydrated();
  // Subscribed, not read once: the footer needs to know the moment this line
  // leaves the cart (removed from the drawer, or from another tab).
  const cartItem = useCartStore((s) => s.items.find((i) => i.lineId === lineId));
  const loadSelection = useBowlBuilderStore((s) => s.loadSelection);
  const reset = useBowlBuilderStore((s) => s.reset);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hydrated || loaded) return;

    const leave = () => {
      // Covered transition on a direct load; plain replace if a transition is
      // already in flight so the page can never sit blank.
      if (!transitionRouter.replace("/order")) router.replace("/order");
    };

    if (!cartItem || cartItem.kind !== "custom" || !cartItem.selection) {
      leave();
      return;
    }

    // Drops any ingredient that has since left the menu; null means the
    // bowl's required step no longer resolves, so there is nothing to edit.
    const resolved = normalizeSelection(cartItem.selection);
    if (!resolved) {
      leave();
      return;
    }

    loadSelection(resolved);
    setLoaded(true);
  }, [hydrated, loaded, cartItem, loadSelection, router, transitionRouter]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Once loaded, keep rendering even if the cart line disappears: saving an
  // edit that merges into a duplicate line removes this lineId, and the
  // footer handles a removal with its own notice.
  if (!loaded) {
    return null;
  }

  return (
    <main>
      <BowlConfigurator
        mode="edit"
        editLineId={lineId}
        editLineExists={cartItem !== undefined}
        header={{
          eyebrow: "Edit Your Bowl",
          title: "Modify Bowl",
          description:
            "Update your selections below. Changes apply to all quantities of this bowl in your cart.",
        }}
      />
    </main>
  );
}
