import { useCartStore } from "@/store/cartStore";

/**
 * Cross-tab convergence. Every tab writes the whole cart to localStorage, so
 * without this a stale tab's next write silently resurrects a removed line or
 * drops one added elsewhere. The storage event fires in every other tab the
 * moment one writes; rehydrating there re-reads the array through the same
 * migration as a page load. Non-persisted state (the drawer's open flag)
 * survives because merge spreads over the current state.
 */
export function subscribeCartSync(): () => void {
  if (typeof window === "undefined") return () => {};
  const name = useCartStore.persist.getOptions().name;

  const onStorage = (event: StorageEvent) => {
    // key === null is localStorage.clear() from another tab.
    if (event.key !== null && event.key !== name) return;
    void useCartStore.persist.rehydrate();
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
