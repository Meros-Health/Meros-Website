import type { PersistStorage, StorageValue } from "zustand/middleware";

// localStorage for zustand persist that never throws into the store.
//
// zustand's default JSON storage parses inside getItem with no guard, so a
// corrupted value rejects hydration and `hasHydrated()` stays false forever
// (every page gated on it renders nothing). Writes that exceed the quota
// throw straight through `set()` and abort whatever handler called it. Both
// become "the cart is empty / stays in memory" here.

function isStorageValue(value: unknown): value is StorageValue<unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "state" in value;
}

function storageAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function safeJsonStorage<S>(): PersistStorage<S> {
  return {
    getItem: (name) => {
      if (!storageAvailable()) return null;
      let raw: string | null;
      try {
        raw = window.localStorage.getItem(name);
      } catch {
        return null;
      }
      if (raw === null) return null;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (isStorageValue(parsed)) return parsed as StorageValue<S>;
      } catch {
        // Fall through: unreadable, so clear it rather than fail every load.
      }
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Nothing more to do; the in-memory store starts empty either way.
      }
      return null;
    },
    setItem: (name, value) => {
      if (!storageAvailable()) return;
      try {
        window.localStorage.setItem(name, JSON.stringify(value));
      } catch {
        // Quota exceeded or storage disabled: the cart keeps working in memory.
      }
    },
    removeItem: (name) => {
      if (!storageAvailable()) return;
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Ignore: nothing to recover.
      }
    },
  };
}
