// @vitest-environment node
//
// D1OrderStore against the FakeD1 stand-in: the claim-is-the-insert dedupe
// and the record update. The wiring through submitCheckout is covered in
// checkoutRuntime.test.ts.
import { describe, expect, it } from "vitest";

import { D1OrderStore } from "@/lib/checkout/orderStore";
import { FakeD1 } from "./helpers/fakeD1";

describe("D1OrderStore.claim", () => {
  it("claims a new key and leaves a 'claimed' row", async () => {
    const db = new FakeD1();
    const store = new D1OrderStore(db);
    const result = await store.claim("key-1", "REF-1");
    expect(result).toEqual({ status: "new" });
    expect(db.rows.get("key-1")).toMatchObject({ order_ref: "REF-1", status: "claimed" });
  });

  it("returns the first order's ref for a repeated key", async () => {
    const db = new FakeD1();
    const store = new D1OrderStore(db);
    await store.claim("key-1", "REF-1");
    const second = await store.claim("key-1", "REF-2");
    expect(second).toEqual({ status: "duplicate", orderRef: "REF-1" });
    expect(db.rows.size).toBe(1);
  });

  it("throws when the database is unavailable (fail closed)", async () => {
    const db = new FakeD1();
    db.failing = true;
    const store = new D1OrderStore(db);
    await expect(store.claim("key-1", "REF-1")).rejects.toThrow("D1 unavailable");
  });
});

describe("D1OrderStore.record", () => {
  it("fills the claimed row and stores the total in cents", async () => {
    const db = new FakeD1();
    const store = new D1OrderStore(db);
    await store.claim("key-1", "REF-1");
    await store.record("key-1", {
      name: "Ada",
      email: "ada@example.com",
      phone: "6045550100",
      items: [{ name: "The Moment · Medium", quantity: 2, unitPrice: 11.75 }],
      total: 23.5,
    });
    const row = db.rows.get("key-1");
    expect(row).toMatchObject({ status: "received", name: "Ada", line_count: 1, total_cents: 2350 });
    expect(JSON.parse(row!.items!)).toEqual([{ name: "The Moment · Medium", quantity: 2, unitPrice: 11.75 }]);
  });
});
