// Per-request runtime for the catering inquiry action, read from the Worker
// environment. Server-only. Mirrors lib/checkout/runtime.ts.
//
// Three pieces come from the same context read:
//
//   - ORDERS_DB is the site's D1 binding (wrangler.jsonc). When it is absent
//     (unit tests, `next dev` without bindings) there is no durable
//     destination for an inquiry, and the action says so rather than
//     confirming a message it did not keep.
//   - RESEND_API_KEY is a Worker secret (`npx wrangler secret put
//     RESEND_API_KEY`, or .dev.vars locally). When it is absent the notifier
//     is null and inquiries are stored without an email, which is the normal
//     state in tests and in local dev.
//   - defer runs the send past the response, so the visitor's confirmation
//     never waits on Resend.
//
// The addresses are constants, not variables. They are public and identical in
// every environment, and each variable added is one more thing that can be
// mistyped in the dashboard and silently drop mail.

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Like } from "@/lib/checkout/orderStore";
import { D1CateringInquiryStore } from "@/lib/catering/inquiryStore";
import { ResendCateringNotifier, type CateringNotifier } from "@/lib/catering/notify";

// Verified sending subdomain (Resend, verified 2026-08-31). Deliberately not
// the apex: merosyogurt.com is an accepted domain in the Microsoft 365 tenant,
// and mail that claims an accepted domain but arrives from outside is what
// Exchange's anti-spoof heuristics are built to quarantine. A subdomain the
// tenant does not know about arrives as ordinary external mail. It also keeps
// this form's sending reputation off the domain that carries the real mailbox.
const NOTIFY_FROM = "Meros catering <catering@mail.merosyogurt.com>";
const NOTIFY_TO = "info@merosyogurt.com";

type CateringEnv = {
  ORDERS_DB?: D1Like;
  RESEND_API_KEY?: string;
};

export type CateringRuntime = {
  inquiryStore: D1CateringInquiryStore | null;
  notifier: CateringNotifier | null;
  defer: (work: Promise<unknown>) => Promise<void>;
};

export function getCateringRuntime(): CateringRuntime {
  let env: CateringEnv = {};
  let waitUntil: ((work: Promise<unknown>) => void) | undefined;
  try {
    const context = getCloudflareContext();
    env = context.env as CateringEnv;
    // Optional chaining, not an assumption: the unit tests mock this module
    // with an env and no ctx, and defer has to work there too.
    const ctx = (context as { ctx?: { waitUntil?: (work: Promise<unknown>) => void } }).ctx;
    waitUntil = ctx?.waitUntil?.bind(ctx);
  } catch {
    // Not on the Workers runtime (vitest, plain node). Production always has
    // the context; the caller treats a null store as "no destination".
  }

  return {
    inquiryStore: env.ORDERS_DB ? new D1CateringInquiryStore(env.ORDERS_DB) : null,
    notifier: env.RESEND_API_KEY
      ? new ResendCateringNotifier({ apiKey: env.RESEND_API_KEY, from: NOTIFY_FROM, to: NOTIFY_TO })
      : null,
    // Without waitUntil the work is awaited instead of dropped, which keeps
    // the tests deterministic and local dev honest about what it sent.
    defer: makeDefer(waitUntil),
  };
}

function makeDefer(waitUntil?: (work: Promise<unknown>) => void): CateringRuntime["defer"] {
  if (!waitUntil) return (work) => work.then(() => undefined);
  return async (work) => {
    waitUntil(work);
  };
}
