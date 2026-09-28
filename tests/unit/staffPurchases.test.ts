// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  IN_TRANSIT_GRACE_DAYS,
  MS_PER_DAY,
  PACK_MEASURES,
  SEEDED_SUPPLIERS,
  checkNote,
  checkOrderedAt,
  checkPackPriceCents,
  checkPackSize,
  checkQuantity,
  costPerCountCents,
  costPerKgCents,
  inTransitCutoff,
  packSizeInGrams,
  purchaseDuration,
  purchaseState,
  totalCents,
} from "@/lib/staff/purchases";

// The rules the ordering log rests on, tested away from D1 and React because
// that is where they live. The route handler imports exactly these functions.

describe("null is not zero", () => {
  // The rule Trellum states and this schema inherits. A price nobody entered,
  // written as 0, becomes the cheapest the store has ever paid and silently
  // wins every comparison it was never entered into.
  it("keeps an unentered price null rather than zero", () => {
    for (const blank of [null, undefined, ""]) {
      const checked = checkPackPriceCents(blank);
      expect(checked.ok && checked.value).toBeNull();
    }
  });

  it("keeps an unentered pack size null rather than zero", () => {
    const checked = checkPackSize("", "kg");
    expect(checked.ok && checked.value).toEqual({ grams: null, count: null });
  });

  it("reports no cost per kilo when either half is missing, rather than zero", () => {
    expect(costPerKgCents({ pack_price_cents: null, pack_size_g: 1000 })).toBeNull();
    expect(costPerKgCents({ pack_price_cents: 1699, pack_size_g: null })).toBeNull();
    expect(totalCents({ quantity: 3, pack_price_cents: null })).toBeNull();
  });

  it("accepts a genuine zero price, which is not the same as no price", () => {
    const checked = checkPackPriceCents(0);
    expect(checked.ok && checked.value).toBe(0);
  });
});

describe("the lifecycle, read off the timestamps", () => {
  it("names each state from its dates alone", () => {
    expect(purchaseState({ received_at: null, exhausted_at: null })).toBe("on-the-way");
    expect(purchaseState({ received_at: "2026-09-10", exhausted_at: null })).toBe("in-use");
    expect(purchaseState({ received_at: "2026-09-10", exhausted_at: "2026-09-24" })).toBe(
      "exhausted"
    );
  });

  it("treats an exhausted row that was never received as exhausted, not in transit", () => {
    expect(purchaseState({ received_at: null, exhausted_at: "2026-09-24" })).toBe("exhausted");
  });
});

describe("how long it lasted", () => {
  const ordered = "2026-09-01T00:00:00.000Z";
  const received = "2026-09-08T00:00:00.000Z";
  const exhausted = "2026-09-22T00:00:00.000Z";

  it("measures shelf life from the delivery, not from the order", () => {
    // The whole point of the received step: 21 days from ordering, but the
    // stock only existed for 14 of them.
    expect(
      purchaseDuration({
        ordered_at: ordered,
        received_at: received,
        exhausted_at: exhausted,
        duration_basis: "received",
      })
    ).toEqual({ days: 14, approximate: false });
  });

  it("falls back to the order date and says the number is approximate", () => {
    expect(
      purchaseDuration({
        ordered_at: ordered,
        received_at: null,
        exhausted_at: exhausted,
        duration_basis: "ordered",
      })
    ).toEqual({ days: 21, approximate: true });
  });

  it("reports nothing for an order still open", () => {
    expect(
      purchaseDuration({
        ordered_at: ordered,
        received_at: received,
        exhausted_at: null,
        duration_basis: null,
      })
    ).toBeNull();
  });
});

describe("making suppliers comparable", () => {
  it("converts every mass measure to grams", () => {
    expect(packSizeInGrams(1, "kg")).toBe(1000);
    expect(packSizeInGrams(5, "kg")).toBe(5000);
    expect(packSizeInGrams(1, "lb")).toBeCloseTo(453.592, 3);
    expect(packSizeInGrams(1, "oz")).toBeCloseTo(28.3495, 3);
  });

  it("refuses to convert a count, because pieces are not a mass", () => {
    expect(packSizeInGrams(6, "count")).toBeNull();
    expect(PACK_MEASURES.count.grams).toBeNull();
  });

  it("reproduces the arithmetic currently done by hand in the tracker", () => {
    // Costco sliced almonds: $16.99 per 1 kg bag.
    expect(costPerKgCents({ pack_price_cents: 1699, pack_size_g: 1000 })).toBeCloseTo(1699, 6);
    // Costco bananas at $2.19 per 3 lb, which the sheet notes as $0.73/lb.
    const perKg = costPerKgCents({ pack_price_cents: 219, pack_size_g: 3 * 453.59237 });
    expect(perKg! / 2.2046226 / 100).toBeCloseTo(0.73, 2);
    // GFS granola: $84.54 per 5 kg case, noted as $16.91/kg.
    expect(costPerKgCents({ pack_price_cents: 8454, pack_size_g: 5000 })! / 100).toBeCloseTo(
      16.91,
      2
    );
  });

  it("prices a case by the piece when that is how it was bought", () => {
    // A case of 3000 napkins at $54: the useful number is per napkin.
    expect(costPerCountCents({ pack_price_cents: 5400, pack_size_count: 3000 })).toBeCloseTo(1.8);
  });

  it("totals an order from the pack price", () => {
    expect(totalCents({ quantity: 3, pack_price_cents: 1699 })).toBe(5097);
  });
});

describe("what may be recorded", () => {
  it("refuses a quantity of nothing", () => {
    expect(checkQuantity(0).ok).toBe(false);
    expect(checkQuantity(-2).ok).toBe(false);
    expect(checkQuantity("abc").ok).toBe(false);
  });

  it("allows a fraction of a pack, because half a case is a real order", () => {
    const checked = checkQuantity(0.5);
    expect(checked.ok && checked.value).toBe(0.5);
  });

  it("refuses a price that is not whole cents, so money never lands as a float", () => {
    expect(checkPackPriceCents(16.99).ok).toBe(false);
    expect(checkPackPriceCents(-100).ok).toBe(false);
    const checked = checkPackPriceCents(1699);
    expect(checked.ok && checked.value).toBe(1699);
  });

  it("stores a pack size on exactly one axis", () => {
    const mass = checkPackSize(1, "kg");
    expect(mass.ok && mass.value).toEqual({ grams: 1000, count: null });
    const pieces = checkPackSize(6, "count");
    expect(pieces.ok && pieces.value).toEqual({ grams: null, count: 6 });
  });

  it("refuses a pack size with no measure chosen", () => {
    expect(checkPackSize(1, "furlong").ok).toBe(false);
  });

  it("refuses an order date far enough out to be a typo", () => {
    const now = new Date("2026-09-27T00:00:00.000Z");
    expect(checkOrderedAt("2206-09-27", now).ok).toBe(false);
    expect(checkOrderedAt("2019-01-01", now).ok).toBe(false);
    expect(checkOrderedAt("not a date", now).ok).toBe(false);
    expect(checkOrderedAt("2026-09-21", now).ok).toBe(true);
  });

  it("collapses a blank note to null instead of an empty string", () => {
    const checked = checkNote("   ");
    expect(checked.ok && checked.value).toBeNull();
  });
});

describe("the in-transit grace window", () => {
  it("sits exactly the grace period behind now", () => {
    const now = new Date("2026-09-27T12:00:00.000Z");
    const cutoff = Date.parse(inTransitCutoff(now));
    expect(now.getTime() - cutoff).toBe(IN_TRANSIT_GRACE_DAYS * MS_PER_DAY);
  });
});

describe("the seeded suppliers", () => {
  // Two copies of this list exist: the migration writes production's, and
  // lib/staff/purchases.ts carries the one a dev server with no binding uses.
  // They drift the moment nothing holds them together.
  const sql = readFileSync("migrations/0006_staff_purchases.sql", "utf8");

  it("matches the list the migration seeds", () => {
    // From the INSERT only: the kind CHECK constraint above it is a list of
    // quoted words too, and matching it would compare the enum to the data.
    const insert = sql.slice(sql.indexOf("INSERT INTO staff_suppliers"));
    const seeded = [...insert.matchAll(/\('([a-z0-9-]+)',\s*'([^']*)',\s*'(\w+)',/g)].map((m) => ({
      id: m[1],
      name: m[2],
      kind: m[3],
    }));
    expect(seeded).toEqual(SEEDED_SUPPLIERS.map((s) => ({ id: s.id, name: s.name, kind: s.kind })));
  });

  it("uses ids Trellum can join on", () => {
    // Trellum's supplier.slug carries this exact constraint, and these rows
    // load into it unchanged.
    for (const supplier of SEEDED_SUPPLIERS) {
      expect(supplier.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
