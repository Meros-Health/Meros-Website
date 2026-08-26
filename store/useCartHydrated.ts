"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";

/**
 * True once the persisted cart has been read. Pages that decide anything from
 * the cart (redirect on empty, load a line to edit) wait on this, otherwise a
 * fresh load always sees an empty cart. Starts false on every render so the
 * server and first client render agree.
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCartStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
