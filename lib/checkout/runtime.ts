// Per-request runtime state for the checkout action, read from the Worker
// environment. Server-only.
//
// Two gates stack:
//   - CHECKOUT_ENABLED (lib/config.ts) is the build-time launch gate.
//   - ORDERING_DISABLED here is the runtime kill switch: a plaintext var on
//     the Worker (dashboard: Settings > Variables), so flipping it takes one
//     version rollout with no rebuild. Set to "true" to stop taking orders.
//
// ORDERS_DB is the D1 binding from wrangler.jsonc. When it is absent (unit
// tests, a checkout before the database exists) the action falls back to the
// per-isolate MemoryOrderDedupe, same as before this module existed.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { D1OrderStore, type D1Like } from "@/lib/checkout/orderStore";

type CheckoutEnv = {
  ORDERS_DB?: D1Like;
  ORDERING_DISABLED?: string;
};

export type CheckoutRuntime = {
  orderingDisabled: boolean;
  orderStore: D1OrderStore | null;
};

export function getCheckoutRuntime(): CheckoutRuntime {
  let env: CheckoutEnv = {};
  try {
    env = getCloudflareContext().env as CheckoutEnv;
  } catch {
    // Not running on the Workers runtime (vitest, plain node). Both gates
    // default open here; production always has the context.
  }
  return {
    orderingDisabled: env.ORDERING_DISABLED === "true",
    orderStore: env.ORDERS_DB ? new D1OrderStore(env.ORDERS_DB) : null,
  };
}
