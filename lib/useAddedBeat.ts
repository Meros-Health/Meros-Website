"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCartStore } from "@/store/cartStore";

/** How long an add button shows its confirmation before returning to rest. */
export const ADDED_BEAT_MS = 900;

/**
 * The confirmation beat on an add button for one signature product. `added`
 * is true for ADDED_BEAT_MS after either a direct add (`flash()`, a smoothie
 * added in one press) or an add that went through the modal this button
 * opened (store.lastModalAdd). A second press during the beat should be
 * ignored by the caller: a double-tap is not a request for two.
 */
export function useAddedBeat(productId: string) {
  const [added, setAdded] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastModalAdd = useCartStore((s) => s.lastModalAdd);
  // Adds that happened before this button mounted are not its news.
  const seenSeq = useRef(lastModalAdd?.seq ?? 0);

  const flash = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    setAdded(true);
    timeout.current = setTimeout(() => {
      timeout.current = null;
      setAdded(false);
    }, ADDED_BEAT_MS);
  }, []);

  useEffect(() => {
    if (!lastModalAdd || lastModalAdd.productId !== productId || lastModalAdd.seq <= seenSeq.current) return;
    seenSeq.current = lastModalAdd.seq;
    flash();
  }, [lastModalAdd, productId, flash]);

  useEffect(() => {
    return () => {
      if (timeout.current) clearTimeout(timeout.current);
    };
  }, []);

  return { added, flash };
}
