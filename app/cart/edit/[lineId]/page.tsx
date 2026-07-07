"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BowlConfigurator } from "@/components/build/BowlConfigurator";
import { getItemById } from "@/lib/menu/buildCatalog";
import {
  migrateLegacySelection,
  normalizeSelection,
  type LegacyBowlSelectionSnapshot,
} from "@/lib/menu/selectionUtils";
import { useBowlBuilderStore } from "@/store/bowlBuilderStore";
import { useCartStore } from "@/store/cartStore";

function resolveSelectionFromCatalog(selection: LegacyBowlSelectionSnapshot) {
  const migrated = migrateLegacySelection(selection);
  const base = getItemById(migrated.base.id);
  if (!base) return null;

  const fruitsBerries = migrated.fruitsBerries
    .map((t) => getItemById(t.id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const nutsSeeds = migrated.nutsSeeds
    .map((t) => getItemById(t.id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  const finish = migrated.finish ? getItemById(migrated.finish.id) ?? null : null;

  const enhancers = migrated.enhancers
    .map((s) => getItemById(s.id))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return { base, fruitsBerries, nutsSeeds, finish, enhancers };
}

export default function EditBowlPage() {
  const params = useParams();
  const router = useRouter();
  const lineId = params.lineId as string;
  const getItem = useCartStore((s) => s.getItem);
  const loadSelection = useBowlBuilderStore((s) => s.loadSelection);
  const reset = useBowlBuilderStore((s) => s.reset);
  const initialized = useRef(false);
  const [hydrated, setHydrated] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCartStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  const cartItem = hydrated ? getItem(lineId) : undefined;

  useEffect(() => {
    if (!hydrated || initialized.current) return;

    if (!cartItem || cartItem.kind !== "custom" || !cartItem.selection) {
      router.replace("/order");
      return;
    }

    const resolved = resolveSelectionFromCatalog(
      normalizeSelection(cartItem.selection as LegacyBowlSelectionSnapshot)
    );
    if (!resolved) {
      router.replace("/order");
      return;
    }

    loadSelection(resolved);
    initialized.current = true;
    setLoaded(true);
  }, [hydrated, cartItem, lineId, loadSelection, router]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Once loaded, keep rendering even if the cart line disappears — saving an
  // edit that merges into a duplicate line removes this lineId, and blanking
  // the page while the save feedback + redirect play out looks broken.
  if (!loaded) {
    return null;
  }

  return (
    <main>
      <BowlConfigurator
        mode="edit"
        editLineId={lineId}
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
