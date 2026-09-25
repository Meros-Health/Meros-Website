// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// End to end over the real /staff/items handlers. Outside the Workers runtime
// getStaffRuntime() hands back the in-memory store and no Access config (see
// lib/staff/runtime.ts, whose production branches staffRuntime.test.ts pins),
// so these drive the actual request path rather than a stand-in for it.
//
// What is worth testing here is not that an add adds. It is the rules the UI
// cannot be trusted to keep:
//
//   - a built-in the menu depends on cannot be removed, whatever the request says
//   - one nothing depends on is hidden, not deleted, and comes back intact
//   - an id is never taken from the client
//
// Both live in the handler, and both are what a mistyped fetch or a stale
// client would hit first.

const ctx = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => ({ env: ctx.env }),
}));

import { NextRequest } from "next/server";
import { DELETE, GET, PATCH, POST } from "@/app/staff/items/route";
import { MAX_CUSTOM_ITEMS } from "@/lib/staff/customItems";
import { INGREDIENT_GROUPS } from "@/lib/staff/catalog";
import { isRemovableIngredient } from "@/lib/menu/dependencies";

// Picked from the registry rather than named, so retiring a topping from
// menu.json cannot quietly turn these into tests of nothing.
const BOARD_INGREDIENTS = INGREDIENT_GROUPS.flatMap((g) => g.items.map((i) => i.id));
const FREE = BOARD_INGREDIENTS.filter(isRemovableIngredient);
const [FREE_A, FREE_B] = FREE;

const ENDPOINT = "http://localhost/staff/items";

type CustomItem = {
  id: string;
  name: string;
  section: string;
  createdBy: string | null;
  createdAt: string;
};
type BoardState = {
  items: Record<string, { status: string; updatedBy: string | null; updatedAt: string }>;
  custom: CustomItem[];
  hidden: string[];
};

function request(method: string, body?: unknown): NextRequest {
  return new NextRequest(ENDPOINT, {
    method,
    ...(body === undefined
      ? {}
      : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  });
}

async function board(): Promise<BoardState> {
  return (await (await GET(request("GET"))).json()) as BoardState;
}

async function errorFrom(response: Response): Promise<string> {
  return ((await response.json()) as { error: string }).error;
}

// The dev store is one instance on globalThis so `next dev` keeps state across
// edits; each test wants a clean board.
beforeEach(() => {
  const holder = globalThis as { __merosStaffMemoryStore?: unknown };
  delete holder.__merosStaffMemoryStore;
});

describe("adding an item", () => {
  it("puts it on the board under the section that was chosen", async () => {
    const response = await POST(
      request("POST", { name: "Raspberry Chia Pudding", section: "Seeds" })
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "custom:raspberry-chia-pudding",
      name: "Raspberry Chia Pudding",
      section: "Seeds",
    });

    const [added] = (await board()).custom;
    expect(added).toMatchObject({
      id: "custom:raspberry-chia-pudding",
      name: "Raspberry Chia Pudding",
      section: "Seeds",
      // No Access in this environment, so there is no identity to attribute it to.
      createdBy: null,
    });
    expect(new Date(added.createdAt).getTime()).not.toBeNaN();
  });

  // The client sends a name. Anything it sends that looks like an id is
  // ignored, so it cannot choose a primary key or land outside the namespace.
  it("derives the id itself and ignores one the client supplies", async () => {
    const response = await POST(
      request("POST", { name: "Oat Milk", section: "Smoothie Bar", id: "bananas" })
    );
    expect(response.status).toBe(201);
    expect((await response.json()) as CustomItem).toMatchObject({ id: "custom:oat-milk" });

    const state = await board();
    expect(state.custom.map((item) => item.id)).toEqual(["custom:oat-milk"]);
  });

  it("refuses a section that is not on the board", async () => {
    const response = await POST(request("POST", { name: "Oat Milk", section: "Robert'); DROP--" }));
    expect(response.status).toBe(400);
    expect((await board()).custom).toEqual([]);
  });

  it("refuses a name the board could not carry", async () => {
    for (const name of ["", "   ", "...", "a".repeat(80)]) {
      expect((await POST(request("POST", { name, section: "Fruits" }))).status, name).toBe(400);
    }
    expect((await board()).custom).toEqual([]);
  });

  it("refuses a body that is not JSON", async () => {
    const bad = new NextRequest(ENDPOINT, { method: "POST", body: "{" });
    expect((await POST(bad)).status).toBe(400);
  });

  it("answers a second add of the same thing with where it already is", async () => {
    await POST(request("POST", { name: "Oat Milk", section: "Smoothie Bar" }));
    const again = await POST(request("POST", { name: "  oat   milk ", section: "Fruits" }));

    expect(again.status).toBe(409);
    expect(await errorFrom(again)).toContain("Smoothie Bar");
    expect((await board()).custom).toHaveLength(1);
  });

  it("points at the built-in row when the name is already on the board", async () => {
    const response = await POST(request("POST", { name: "Bananas", section: "Seeds" }));
    expect(response.status).toBe(409);
    const message = await errorFrom(response);
    expect(message).toContain("Bananas");
    expect(message).toContain("Fruits");
    expect((await board()).custom).toEqual([]);
  });

  it("stops at the cap", async () => {
    for (let i = 0; i < MAX_CUSTOM_ITEMS; i += 1) {
      expect((await POST(request("POST", { name: `Item ${i}`, section: "Fruits" }))).status).toBe(
        201
      );
    }
    const overflow = await POST(request("POST", { name: "One Too Many", section: "Fruits" }));
    expect(overflow.status).toBe(409);
    expect((await board()).custom).toHaveLength(MAX_CUSTOM_ITEMS);
  });
});

describe("removing an item", () => {
  it("removes one staff added, along with its status", async () => {
    await POST(request("POST", { name: "Oat Milk", section: "Smoothie Bar" }));
    await PATCH(request("PATCH", { id: "custom:oat-milk", status: "out" }));
    expect((await board()).items["custom:oat-milk"].status).toBe("out");

    expect((await DELETE(request("DELETE", { id: "custom:oat-milk" }))).status).toBe(200);

    const state = await board();
    expect(state.custom).toEqual([]);
    expect(state.items["custom:oat-milk"]).toBeUndefined();
  });

  // The rule the whole design rests on. The board draws a dead "-" on these
  // rows, but the UI is not the control: the handler is.
  it("refuses a built-in the menu depends on, and says which kind", async () => {
    const cases: Array<[string, string]> = [
      ["strawberries", "Signature ingredient"],
      ["bananas", "Signature ingredient"],
      ["creatine-monohydrate", "Stack ingredient"],
      ["plain-greek-yogurt", "Base ingredient"],
      ["vanilla-greek-yogurt", "Base ingredient"],
    ];
    for (const [id, label] of cases) {
      const response = await DELETE(request("DELETE", { id }));
      expect(response.status, id).toBe(409);
      expect(await errorFrom(response), id).toContain(label);
    }
    expect((await board()).hidden).toEqual([]);
  });

  it("hides a built-in nothing depends on, ingredient or supply", async () => {
    expect(FREE.length, "no removable ingredient left in the registry").toBeGreaterThan(1);
    const ids = [FREE_A, FREE_B, "napkins", "sanitizer-fluid"];
    for (const id of ids) {
      expect((await DELETE(request("DELETE", { id }))).status, id).toBe(200);
    }
    expect((await board()).hidden.sort()).toEqual([...ids].sort());
  });

  // A hidden ingredient still exists and may come back, so what it was last
  // set to is worth keeping. A staff-added delete clears its status instead.
  it("keeps the status row of a hidden built-in", async () => {
    await PATCH(request("PATCH", { id: FREE_A, status: "out" }));
    await DELETE(request("DELETE", { id: FREE_A }));

    const state = await board();
    expect(state.hidden).toEqual([FREE_A]);
    expect(state.items[FREE_A].status).toBe("out");
  });

  it("is idempotent, so two servers hiding the same thing agree", async () => {
    expect((await DELETE(request("DELETE", { id: FREE_A }))).status).toBe(200);
    expect((await DELETE(request("DELETE", { id: FREE_A }))).status).toBe(200);
    expect((await board()).hidden).toEqual([FREE_A]);
  });

  it("refuses an id that is not in the custom namespace at all", async () => {
    for (const id of ["", "custom:", undefined, 7, { id: "custom:x" }]) {
      expect((await DELETE(request("DELETE", { id }))).status).toBe(400);
    }
  });

  it("leaves the rest of the board alone", async () => {
    await POST(request("POST", { name: "Oat Milk", section: "Smoothie Bar" }));
    await PATCH(request("PATCH", { id: "bananas", status: "low" }));

    await DELETE(request("DELETE", { id: "custom:oat-milk" }));

    expect((await board()).items.bananas.status).toBe("low");
  });
});

describe("setting a status", () => {
  it("accepts a built-in id", async () => {
    expect((await PATCH(request("PATCH", { id: "bananas", status: "low" }))).status).toBe(200);
    expect((await board()).items.bananas.status).toBe("low");
  });

  it("accepts a staff-added id once it exists", async () => {
    expect((await PATCH(request("PATCH", { id: "custom:oat-milk", status: "low" }))).status).toBe(
      400
    );

    await POST(request("POST", { name: "Oat Milk", section: "Smoothie Bar" }));
    expect((await PATCH(request("PATCH", { id: "custom:oat-milk", status: "low" }))).status).toBe(
      200
    );
  });

  // Otherwise staff_items fills with statuses for rows nothing can render.
  it("refuses a well-formed custom id for an item that was never added", async () => {
    const response = await PATCH(request("PATCH", { id: "custom:invented", status: "out" }));
    expect(response.status).toBe(400);
    expect((await board()).items["custom:invented"]).toBeUndefined();
  });

  it("still refuses an unknown status and an unknown built-in", async () => {
    expect((await PATCH(request("PATCH", { id: "bananas", status: "toggle" }))).status).toBe(400);
    expect((await PATCH(request("PATCH", { id: "banana-phone", status: "out" }))).status).toBe(400);
  });
});

describe("restoring a hidden item", () => {
  it("puts it back, with the status it had", async () => {
    await PATCH(request("PATCH", { id: FREE_A, status: "low" }));
    await DELETE(request("DELETE", { id: FREE_A }));
    expect((await board()).hidden).toEqual([FREE_A]);

    const response = await POST(request("POST", { action: "restore", id: FREE_A }));
    expect(response.status).toBe(200);

    const state = await board();
    expect(state.hidden).toEqual([]);
    expect(state.items[FREE_A].status).toBe("low");
  });

  it("refuses an id the board does not carry", async () => {
    for (const id of ["banana-phone", "", undefined, 7]) {
      expect((await POST(request("POST", { action: "restore", id }))).status).toBe(400);
    }
  });

  it("is harmless on something that was never hidden", async () => {
    expect((await POST(request("POST", { action: "restore", id: "bananas" }))).status).toBe(200);
    expect((await board()).hidden).toEqual([]);
  });

  // The board before this shipped posts {name, section} with no action.
  it("still treats a body with no action as an add", async () => {
    const response = await POST(request("POST", { name: "Oat Milk", section: "Smoothie Bar" }));
    expect(response.status).toBe(201);
  });
});
