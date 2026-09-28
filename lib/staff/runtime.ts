// Per-request runtime for the staff inventory routes, read from the Worker
// environment. Server-only. Mirrors lib/catering/runtime.ts.
//
// Availability is deliberate, not incidental:
//
//   - In development (`next dev`) the board is always available. With local
//     bindings it writes the miniflare D1 copy; without them it falls back to
//     one in-memory store shared across requests, enough to exercise the UI.
//   - In production the routes are OFF unless STAFF_PORTAL_ENABLED is "true"
//     on the Worker. Workers Builds deploys every branch push, so an
//     accidental push must land as a 404, not as a world-writable board.
//   - Even with the flag on, production requires the Access verification
//     config (team domain + audience tag). Flag without config is a
//     misconfiguration and fails closed rather than serving an API whose
//     only guard would be edge routing.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { StaffAccessConfig } from "@/lib/staff/access";
import {
  D1StaffInventoryStore,
  MemoryStaffInventoryStore,
  type StaffD1Like,
  type StaffInventoryStore,
} from "@/lib/staff/inventoryStore";
import {
  D1StaffPurchaseStore,
  MemoryStaffPurchaseStore,
  type StaffPurchaseStore,
} from "@/lib/staff/purchaseStore";
import { SEEDED_SUPPLIERS } from "@/lib/staff/purchases";

type StaffEnv = {
  ORDERS_DB?: StaffD1Like;
  STAFF_PORTAL_ENABLED?: string;
  STAFF_ACCESS_TEAM_DOMAIN?: string;
  STAFF_ACCESS_AUD?: string;
};

export type StaffRuntime = {
  /** Null means the routes answer 404: disabled in this environment. */
  store: StaffInventoryStore | null;
  /**
   * The ordering log's store. Gated on exactly the same conditions as `store`,
   * and null whenever it is: one flag, one Access config and one database
   * serve the whole portal, so a half-open portal is not a state that exists.
   */
  purchases: StaffPurchaseStore | null;
  /** Access verification config; null only in development, where Access does not front the dev server. */
  access: StaffAccessConfig | null;
};

// One store per process, not per request, so `next dev` keeps state between
// taps. globalThis because the dev server re-evaluates modules on edit.
function devMemoryStore(): MemoryStaffInventoryStore {
  const holder = globalThis as { __merosStaffMemoryStore?: MemoryStaffInventoryStore };
  holder.__merosStaffMemoryStore ??= new MemoryStaffInventoryStore();
  return holder.__merosStaffMemoryStore;
}

// The same, for the ordering log. Seeded with the suppliers the migration
// writes, so a dev server without bindings offers the same list production
// does rather than an empty selector.
function devMemoryPurchaseStore(): MemoryStaffPurchaseStore {
  const holder = globalThis as { __merosStaffMemoryPurchaseStore?: MemoryStaffPurchaseStore };
  if (!holder.__merosStaffMemoryPurchaseStore) {
    const store = new MemoryStaffPurchaseStore();
    store.seedSuppliers(
      SEEDED_SUPPLIERS.map((supplier) => ({
        ...supplier,
        archived_at: null,
        created_by: null,
        created_at: "2026-09-27T00:00:00.000Z",
      }))
    );
    holder.__merosStaffMemoryPurchaseStore = store;
  }
  return holder.__merosStaffMemoryPurchaseStore;
}

export function getStaffRuntime(): StaffRuntime {
  let env: StaffEnv = {};
  try {
    env = getCloudflareContext().env as StaffEnv;
  } catch {
    // Not on the Workers runtime (vitest, plain node).
  }

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    return {
      store: env.ORDERS_DB ? new D1StaffInventoryStore(env.ORDERS_DB) : devMemoryStore(),
      purchases: env.ORDERS_DB ? new D1StaffPurchaseStore(env.ORDERS_DB) : devMemoryPurchaseStore(),
      access: null,
    };
  }

  const enabled = env.STAFF_PORTAL_ENABLED === "true";
  const access =
    env.STAFF_ACCESS_TEAM_DOMAIN && env.STAFF_ACCESS_AUD
      ? { teamDomain: env.STAFF_ACCESS_TEAM_DOMAIN, aud: env.STAFF_ACCESS_AUD }
      : null;
  if (!enabled || !access || !env.ORDERS_DB) return { store: null, purchases: null, access: null };
  return {
    store: new D1StaffInventoryStore(env.ORDERS_DB),
    purchases: new D1StaffPurchaseStore(env.ORDERS_DB),
    access,
  };
}
