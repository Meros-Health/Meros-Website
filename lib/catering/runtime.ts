// Per-request runtime for the catering inquiry action, read from the Worker
// environment. Server-only. Mirrors lib/checkout/runtime.ts.
//
// ORDERS_DB is the site's D1 binding (wrangler.jsonc). When it is absent
// (unit tests, `next dev` without bindings) there is no durable destination
// for an inquiry, and the action says so rather than confirming a message it
// did not keep.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Like } from "@/lib/checkout/orderStore";
import { D1CateringInquiryStore } from "@/lib/catering/inquiryStore";

type CateringEnv = {
  ORDERS_DB?: D1Like;
};

export function getCateringInquiryStore(): D1CateringInquiryStore | null {
  let env: CateringEnv = {};
  try {
    env = getCloudflareContext().env as CateringEnv;
  } catch {
    // Not on the Workers runtime (vitest, plain node). Production always has
    // the context; the caller treats a null store as "no destination".
  }
  return env.ORDERS_DB ? new D1CateringInquiryStore(env.ORDERS_DB) : null;
}
