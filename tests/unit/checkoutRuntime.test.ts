// @vitest-environment node
//
// submitCheckout with the Workers runtime mocked: the ORDERING_DISABLED kill
// switch, the D1-backed claim + record path, and fail-closed when D1 is down.
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CHECKOUT_ENABLED = "true";
  return { env: null as Record<string, unknown> | null };
});

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    if (!ctx.env) throw new Error("no cloudflare context");
    return { env: ctx.env };
  },
}));

import { submitCheckout } from "@/app/actions/checkout";
import { makeIdempotencyKey, resetOrderDedupeForTests } from "@/lib/checkout/idempotency";
import { IDLE, VALID_CUSTOMER, makeFormData } from "./helpers/formData";
import { signatureLine } from "./helpers/cartFixtures";
import { FakeD1 } from "./helpers/fakeD1";

const cart = () => JSON.stringify([signatureLine("moment-medium", "moment", "medium", 12)]);

function customer(key = makeIdempotencyKey()): FormData {
  return makeFormData({ ...VALID_CUSTOMER, idempotencyKey: key });
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  ctx.env = null;
  resetOrderDedupeForTests();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe("runtime kill switch", () => {
  it("refuses orders while ORDERING_DISABLED is true", async () => {
    ctx.env = { ORDERING_DISABLED: "true" };
    const result = await submitCheckout(cart(), IDLE, customer());
    expect(result.status).toBe("error");
    expect(result.code).toBe("closed");
    expect(result.message).toContain("paused");
  });

  it("ignores values other than the literal 'true'", async () => {
    ctx.env = { ORDERING_DISABLED: "yes" };
    const result = await submitCheckout(cart(), IDLE, customer());
    expect(result.status).toBe("success");
  });
});

describe("D1-backed submit", () => {
  it("claims and records the order in ORDERS_DB", async () => {
    const db = new FakeD1();
    ctx.env = { ORDERS_DB: db };
    const key = makeIdempotencyKey();
    const result = await submitCheckout(cart(), IDLE, customer(key));
    expect(result.status).toBe("success");
    const row = db.rows.get(key);
    expect(row).toMatchObject({ status: "received", order_ref: result.orderRef, line_count: 1, total_cents: 1200 });
  });

  it("returns the first order for a repeated key without a second row", async () => {
    const db = new FakeD1();
    ctx.env = { ORDERS_DB: db };
    const key = makeIdempotencyKey();
    const first = await submitCheckout(cart(), IDLE, customer(key));
    const second = await submitCheckout(cart(), IDLE, customer(key));
    expect(second.status).toBe("success");
    expect(second.orderRef).toBe(first.orderRef);
    expect(db.rows.size).toBe(1);
  });

  it("fails closed with the generic retry message when D1 is down", async () => {
    const db = new FakeD1();
    db.failing = true;
    ctx.env = { ORDERS_DB: db };
    const result = await submitCheckout(cart(), IDLE, customer());
    expect(result.status).toBe("error");
    expect(result.code).toBe("unknown");
    expect(db.rows.size).toBe(0);
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("outside the Workers runtime", () => {
  it("falls back to the in-memory dedupe when there is no context", async () => {
    const key = makeIdempotencyKey();
    const first = await submitCheckout(cart(), IDLE, customer(key));
    const second = await submitCheckout(cart(), IDLE, customer(key));
    expect(first.status).toBe("success");
    expect(second.orderRef).toBe(first.orderRef);
  });
});
