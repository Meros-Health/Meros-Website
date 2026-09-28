// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// End to end over the real /staff/purchases and /staff/suppliers handlers,
// and over the coupling between the board and the log. Outside the Workers
// runtime getStaffRuntime() hands back the in-memory stores and no Access
// config (lib/staff/runtime.ts, whose production branches staffRuntime.test.ts
// pins), so these drive the actual request path.
//
// What is worth testing here is not that an insert inserts. It is the rules a
// stale client or a mistyped fetch would hit first, and the one piece of
// behaviour nobody triggers deliberately:
//
//   - marking an item Out on the board closes its open orders
//   - and does not close one that is genuinely still in transit
//   - an order can only be logged against an item that exists
//   - a supplier is archived, never deleted, so old prices keep their name
//   - money only ever crosses as whole cents

const ctx = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: ctx.env }),
}));

import { NextRequest } from "next/server";
import { DELETE, GET, PATCH, POST } from "@/app/staff/purchases/route";
import {
  DELETE as SUPPLIER_DELETE,
  GET as SUPPLIER_GET,
  POST as SUPPLIER_POST,
} from "@/app/staff/suppliers/route";
import { PATCH as ITEMS_PATCH } from "@/app/staff/items/route";
import { IN_TRANSIT_GRACE_DAYS, MS_PER_DAY, SEEDED_SUPPLIERS } from "@/lib/staff/purchases";

const ENDPOINT = "http://localhost/staff/purchases";

type Purchase = {
  id: string;
  itemId: string;
  itemName: string;
  supplierId: string | null;
  quantity: number;
  unit: string;
  packSizeG: number | null;
  packPriceCents: number | null;
  orderedAt: string;
  receivedAt: string | null;
  exhaustedAt: string | null;
  state: string;
  duration: { days: number; approximate: boolean } | null;
  totalCents: number | null;
  costPerKgCents: number | null;
};

type LogState = {
  current: Purchase[];
  archive: Purchase[];
  lastByItem: Record<string, Purchase>;
  suppliers: { id: string; name: string }[];
};

function request(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  });
}

async function log(): Promise<LogState> {
  return (await (await GET(request(ENDPOINT, "GET"))).json()) as LogState;
}

async function errorFrom(response: Response): Promise<string> {
  return ((await response.json()) as { error: string }).error;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * MS_PER_DAY).toISOString();
}

/** A valid order body, with whatever this test needs overridden. */
function order(overrides: Record<string, unknown> = {}) {
  return {
    itemId: "almonds",
    quantity: 3,
    unit: "Bag",
    packSize: 1,
    packMeasure: "kg",
    packPriceCents: 1699,
    supplierId: "costco",
    orderedAt: daysAgo(10),
    ...overrides,
  };
}

async function logOrder(overrides: Record<string, unknown> = {}): Promise<Purchase> {
  const response = await POST(request(ENDPOINT, "POST", order(overrides)));
  expect(response.status).toBe(201);
  return (await response.json()) as Purchase;
}

// Both dev stores live on globalThis so `next dev` keeps state across edits;
// each test wants a clean log.
beforeEach(() => {
  const holder = globalThis as {
    __merosStaffMemoryStore?: unknown;
    __merosStaffMemoryPurchaseStore?: unknown;
  };
  delete holder.__merosStaffMemoryStore;
  delete holder.__merosStaffMemoryPurchaseStore;
});

describe("logging an order", () => {
  it("records it against the item, and derives what it cost", async () => {
    const created = await logOrder();
    expect(created).toMatchObject({
      itemId: "almonds",
      itemName: "Almonds",
      quantity: 3,
      unit: "Bag",
      packSizeG: 1000,
      packPriceCents: 1699,
      supplierId: "costco",
      state: "on-the-way",
      totalCents: 5097,
    });
    expect(created.costPerKgCents).toBeCloseTo(1699, 6);

    const state = await log();
    expect(state.current).toHaveLength(1);
    expect(state.archive).toHaveLength(0);
    // The line the board draws under the item.
    expect(state.lastByItem.almonds.packPriceCents).toBe(1699);
  });

  it("can be logged as already here, for a receipt entered after the fact", async () => {
    const created = await logOrder({ receivedNow: true });
    expect(created.state).toBe("in-use");
    expect(created.receivedAt).not.toBeNull();
  });

  it("keeps a price nobody entered as null, not as zero", async () => {
    const created = await logOrder({ packPriceCents: null });
    expect(created.packPriceCents).toBeNull();
    expect(created.totalCents).toBeNull();
    expect(created.costPerKgCents).toBeNull();
  });

  it("still records an order with no pack size, minus the comparison", async () => {
    const created = await logOrder({ packSize: null });
    expect(created.packSizeG).toBeNull();
    expect(created.costPerKgCents).toBeNull();
    expect(created.totalCents).toBe(5097);
  });
});

describe("what the handler refuses", () => {
  it("refuses an item that is not on the board", async () => {
    // The guard that keeps staff_purchases free of rows nothing can render,
    // and the reason an id is never taken at face value.
    for (const itemId of ["not-a-real-item", "custom:never-added", "", 42]) {
      const response = await POST(request(ENDPOINT, "POST", order({ itemId })));
      expect(response.status).toBe(400);
      expect(await errorFrom(response)).toBe("Choose an item.");
    }
  });

  it("refuses a unit that is not one of ours", async () => {
    const response = await POST(request(ENDPOINT, "POST", order({ unit: "Pallet" })));
    expect(response.status).toBe(400);
    expect(await errorFrom(response)).toBe("Choose a unit.");
  });

  it("refuses a price that is not whole cents", async () => {
    // Dollars sent where cents belong would silently record $16.99 as 17c.
    const response = await POST(request(ENDPOINT, "POST", order({ packPriceCents: 16.99 })));
    expect(response.status).toBe(400);
  });

  it("refuses a quantity of nothing", async () => {
    const response = await POST(request(ENDPOINT, "POST", order({ quantity: 0 })));
    expect(response.status).toBe(400);
  });

  it("refuses a supplier that is not on the list", async () => {
    const response = await POST(request(ENDPOINT, "POST", order({ supplierId: "cheap-guy" })));
    expect(response.status).toBe(400);
    expect(await errorFrom(response)).toBe("Choose a supplier.");
  });

  it("refuses a supplier that has been archived", async () => {
    await SUPPLIER_DELETE(request("http://localhost/staff/suppliers", "DELETE", { id: "costco" }));
    const response = await POST(request(ENDPOINT, "POST", order({ supplierId: "costco" })));
    expect(response.status).toBe(400);
  });

  it("allows an order with no supplier recorded at all", async () => {
    const created = await logOrder({ supplierId: null });
    expect(created.supplierId).toBeNull();
  });
});

describe("the board closes orders", () => {
  // The coupling the whole feature rests on. Nobody opens a second screen to
  // say a bag is finished, but they do tap Out, because that is the tap that
  // stops the next customer being promised something the store lacks.
  const items = "http://localhost/staff/items";

  it("archives a delivered order when its item is marked out, with a real duration", async () => {
    await logOrder({ orderedAt: daysAgo(20) });
    const [open] = (await log()).current;
    await PATCH(request(ENDPOINT, "PATCH", { id: open.id, action: "receive" }));

    await ITEMS_PATCH(request(items, "PATCH", { id: "almonds", status: "out" }));

    const state = await log();
    expect(state.current).toHaveLength(0);
    expect(state.archive).toHaveLength(1);
    expect(state.archive[0].duration).toEqual({ days: 0, approximate: false });
  });

  it("closes an unmarked delivery from the order date, and says so", async () => {
    // Ordered three weeks ago and never marked as arrived: that is a delivery
    // nobody recorded, not a van still on the road.
    await logOrder({ orderedAt: daysAgo(21) });
    await ITEMS_PATCH(request(items, "PATCH", { id: "almonds", status: "out" }));

    const state = await log();
    expect(state.archive).toHaveLength(1);
    expect(state.archive[0].duration).toEqual({ days: 21, approximate: true });
  });

  it("leaves an order still in transit open", async () => {
    // The case that makes the grace window worth having: an item is usually
    // marked out exactly because the replacement has not landed. Archiving it
    // would record a shelf life of zero for stock nobody has opened.
    await logOrder({ orderedAt: daysAgo(IN_TRANSIT_GRACE_DAYS - 1) });
    await ITEMS_PATCH(request(items, "PATCH", { id: "almonds", status: "out" }));

    const state = await log();
    expect(state.current).toHaveLength(1);
    expect(state.current[0].state).toBe("on-the-way");
    expect(state.archive).toHaveLength(0);
  });

  it("closes only the orders of the item that ran out", async () => {
    await logOrder({ itemId: "almonds", receivedNow: true });
    await logOrder({ itemId: "cashews", receivedNow: true });
    await ITEMS_PATCH(request(items, "PATCH", { id: "almonds", status: "out" }));

    const state = await log();
    expect(state.current.map((row) => row.itemId)).toEqual(["cashews"]);
    expect(state.archive.map((row) => row.itemId)).toEqual(["almonds"]);
  });

  it("leaves everything open when the item is only marked low", async () => {
    await logOrder({ receivedNow: true });
    await ITEMS_PATCH(request(items, "PATCH", { id: "almonds", status: "low" }));
    expect((await log()).current).toHaveLength(1);
  });
});

describe("correcting the log", () => {
  it("reopens an order archived because the board was tapped too early", async () => {
    await logOrder({ receivedNow: true });
    await ITEMS_PATCH(
      request("http://localhost/staff/items", "PATCH", { id: "almonds", status: "out" })
    );
    const [archived] = (await log()).archive;

    await PATCH(request(ENDPOINT, "PATCH", { id: archived.id, action: "reopen" }));

    const state = await log();
    expect(state.current).toHaveLength(1);
    // The duration goes with the date it was based on, rather than lingering.
    expect(state.current[0].duration).toBeNull();
  });

  it("refuses to receive an order twice", async () => {
    const created = await logOrder();
    await PATCH(request(ENDPOINT, "PATCH", { id: created.id, action: "receive" }));
    const again = await PATCH(request(ENDPOINT, "PATCH", { id: created.id, action: "receive" }));
    expect(again.status).toBe(409);
  });

  it("deletes a row entered by mistake", async () => {
    const created = await logOrder();
    expect((await DELETE(request(ENDPOINT, "DELETE", { id: created.id }))).status).toBe(200);
    expect((await log()).current).toHaveLength(0);
  });

  it("refuses an action on an order that does not exist", async () => {
    const response = await PATCH(request(ENDPOINT, "PATCH", { id: "nope", action: "receive" }));
    expect(response.status).toBe(400);
  });
});

describe("suppliers", () => {
  const endpoint = "http://localhost/staff/suppliers";

  it("starts from the list the store already buys from", async () => {
    const { suppliers } = (await (await SUPPLIER_GET(request(endpoint, "GET"))).json()) as {
      suppliers: { id: string }[];
    };
    expect(suppliers).toHaveLength(SEEDED_SUPPLIERS.length);
  });

  it("derives the id from the name, so it is never taken from the client", async () => {
    const response = await SUPPLIER_POST(
      request(endpoint, "POST", { name: "  Pacific   Rim Produce ", kind: "local", id: "costco" })
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "pacific-rim-produce",
      name: "Pacific Rim Produce",
      kind: "local",
      archived: false,
    });
  });

  it("answers a duplicate with where it already is, not a second row", async () => {
    // "costco " on a later shift must not become a second Costco, or a year
    // of price history stops grouping.
    const response = await SUPPLIER_POST(request(endpoint, "POST", { name: "costco " }));
    expect(response.status).toBe(409);
    expect(await errorFrom(response)).toBe("Costco is already on the list.");
  });

  it("archives rather than deletes, so past orders keep their supplier's name", async () => {
    const created = await logOrder({ supplierId: "costco" });
    await SUPPLIER_DELETE(request(endpoint, "DELETE", { id: "costco" }));

    // Off the selector...
    expect((await log()).suppliers.some((row) => row.id === "costco")).toBe(false);
    // ...but the order still points at it, and the row is still there to name.
    expect((await log()).current[0].supplierId).toBe("costco");
    expect(created.supplierId).toBe("costco");
    const { suppliers } = (await (await SUPPLIER_GET(request(endpoint, "GET"))).json()) as {
      suppliers: { id: string; archived: boolean }[];
    };
    expect(suppliers.find((row) => row.id === "costco")?.archived).toBe(true);
  });

  it("refuses a supplier that does not exist", async () => {
    const response = await SUPPLIER_DELETE(request(endpoint, "DELETE", { id: "nope" }));
    expect(response.status).toBe(400);
  });
});

describe("the gate", () => {
  // The ordering log carries what the store pays its suppliers, so it is
  // gated exactly as the board is and for the same reasons. These pin that
  // the new routes inherit the fail-closed behaviour rather than merely
  // sitting behind the same edge rule.
  it("answers 404 on every verb when the portal is switched off", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      // Production with no flag, no Access config and no database: the
      // runtime hands back nothing, and nothing is what the route says.
      const suppliers = "http://localhost/staff/suppliers";
      const responses = await Promise.all([
        GET(request(ENDPOINT, "GET")),
        POST(request(ENDPOINT, "POST", order())),
        PATCH(request(ENDPOINT, "PATCH", { id: "x", action: "receive" })),
        DELETE(request(ENDPOINT, "DELETE", { id: "x" })),
        SUPPLIER_GET(request(suppliers, "GET")),
        SUPPLIER_POST(request(suppliers, "POST", { name: "Anyone" })),
        SUPPLIER_DELETE(request(suppliers, "DELETE", { id: "costco" })),
      ]);
      for (const response of responses) expect(response.status).toBe(404);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("writes nothing while it is switched off", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      await POST(request(ENDPOINT, "POST", order()));
    } finally {
      vi.unstubAllEnvs();
    }
    expect((await log()).current).toHaveLength(0);
  });
});
