// @vitest-environment node
//
// The write limit's building blocks. Both limits fail open on purpose, so
// these are mostly assertions that a missing or broken limiter lets a real
// catering lead through: refusing one costs more than a few extra rows.
import { describe, expect, it } from "vitest";
import {
  WRITE_MAX_PER_HOUR,
  clientKeyFrom,
  withinGlobalHourlyCap,
  withinPerIpLimit,
  type RateLimiter,
} from "@/lib/catering/rateLimit";

const headers = (map: Record<string, string>) => ({
  get: (name: string) => map[name.toLowerCase()] ?? null,
});

describe("the limiter key", () => {
  it("prefers CF-Connecting-IP, which Cloudflare sets and a client cannot forge", () => {
    expect(
      clientKeyFrom(headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }))
    ).toBe("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for entry", () => {
    expect(clientKeyFrom(headers({ "x-forwarded-for": "198.51.100.1, 203.0.113.9" }))).toBe(
      "198.51.100.1"
    );
  });

  it("is null when neither header is present", () => {
    expect(clientKeyFrom(headers({}))).toBeNull();
  });

  it("is null rather than empty when x-forwarded-for is blank", () => {
    expect(clientKeyFrom(headers({ "x-forwarded-for": "  " }))).toBeNull();
  });
});

describe("the per-IP limit", () => {
  const allow: RateLimiter = { limit: async () => ({ success: true }) };
  const deny: RateLimiter = { limit: async () => ({ success: false }) };
  const broken: RateLimiter = {
    limit: async () => {
      throw new Error("rate limiter unavailable");
    },
  };

  it("allows when the binding is not provisioned", async () => {
    // Unit tests, `next dev` without bindings, and any deploy that predates
    // the namespace. The global cap is the only guard in that state.
    await expect(withinPerIpLimit(null, "203.0.113.7")).resolves.toBe(true);
  });

  it("allows when there is no address to count against", async () => {
    await expect(withinPerIpLimit(deny, null)).resolves.toBe(true);
  });

  it("allows when the limiter says yes", async () => {
    await expect(withinPerIpLimit(allow, "203.0.113.7")).resolves.toBe(true);
  });

  it("refuses when the limiter says no", async () => {
    await expect(withinPerIpLimit(deny, "203.0.113.7")).resolves.toBe(false);
  });

  it("fails open when the limiter throws", async () => {
    await expect(withinPerIpLimit(broken, "203.0.113.7")).resolves.toBe(true);
  });
});

describe("the global hourly cap", () => {
  it("counts the incoming inquiry, not just the ones already stored", () => {
    // `recent` is taken before the write, so the submission being judged is
    // the (recent + 1)th in the window.
    expect(withinGlobalHourlyCap(WRITE_MAX_PER_HOUR - 1)).toBe(true);
    expect(withinGlobalHourlyCap(WRITE_MAX_PER_HOUR)).toBe(false);
  });

  it("is set well above any real hour on this form", () => {
    // Single digits a week. If this ever needs raising, the form has a problem
    // that a bigger number will not fix.
    expect(WRITE_MAX_PER_HOUR).toBeGreaterThanOrEqual(50);
  });
});
