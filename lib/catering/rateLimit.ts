// Rate limit for the catering inquiry write. Server-only.
//
// The honeypot is a filter, not a limit. A script that simply omits the field
// walks past it, and everything past it becomes a durable row on the D1
// database checkout shares. The throttle that already existed protects info@
// and the day's Resend quota; it does not protect the table, because it runs
// after the write and only decides whether an email goes out.
//
// Two limits, because they fail in different directions.
//
//   Per IP, through the Workers rate limiting binding. This is the one obvious
//   attack: a loop from a single host. The binding keys on a value we hand it
//   and keeps nothing we can read back, so the visitor's address can be the
//   key without the address being retained anywhere, in D1 or in the logs.
//
//   Globally per hour, counted off the table we already write. This catches
//   what per-IP cannot, which is the same script run from many addresses.
//
// Both fail open. A limiter that is not provisioned, or that throws, must not
// be the reason a real catering lead cannot reach the store.

/** The shape of the Workers rate limiting binding, as much of it as we use. */
export type RateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

/**
 * Per IP, per minute. A person fills this form once, reads the confirmation,
 * and leaves. Three allows for a mistyped email and a retry without ever
 * touching a real submission.
 */
export const PER_IP_PER_MINUTE = 3;

/**
 * Ceiling on stored rows per hour, across everyone. Set far above any real
 * hour on a form that sees single digits a week: blocking a genuine lead costs
 * more than a few extra rows, so this is a backstop against a flood, not a
 * quota.
 */
export const WRITE_MAX_PER_HOUR = 60;

/** Just enough of Next's ReadonlyHeaders to read one header. */
type HeaderLike = { get(name: string): string | null };

/**
 * The key the per-IP limit counts against. `CF-Connecting-IP` is set by
 * Cloudflare on every request that reaches the Worker and cannot be spoofed by
 * the client; `x-forwarded-for` is the fallback for anywhere else and is only
 * as trustworthy as whatever set it, which is why it is second.
 *
 * Returned for use as a limiter key and nothing else. It is never written to
 * D1 and never logged.
 */
export function clientKeyFrom(headers: HeaderLike): string | null {
  const connecting = headers.get("cf-connecting-ip");
  if (connecting) return connecting;

  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || null;
}

/**
 * False only when the limiter is present, reachable, and says no. An absent
 * binding (unit tests, `next dev` without bindings, a deploy before the
 * namespace exists) and a limiter that throws both allow the write and leave
 * the global cap as the only guard.
 */
export async function withinPerIpLimit(
  limiter: RateLimiter | null,
  clientKey: string | null
): Promise<boolean> {
  if (!limiter || !clientKey) return true;

  try {
    const { success } = await limiter.limit({ key: clientKey });
    return success;
  } catch {
    return true;
  }
}

/**
 * `recent` is the count before this submission, so this one is the
 * (recent + 1)th in the window.
 */
export function withinGlobalHourlyCap(recent: number): boolean {
  return recent + 1 <= WRITE_MAX_PER_HOUR;
}
