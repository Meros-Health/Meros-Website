// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listIngredients } from "@/lib/menu/ingredients";
import {
  INGREDIENT_GROUPS,
  SUPPLY_GROUPS,
  isStaffItemId,
  isStaffStatus,
  listStaffItemIds,
} from "@/lib/staff/catalog";
import { MemoryStaffInventoryStore } from "@/lib/staff/inventoryStore";

// The board's catalog is hand-ordered (sub-clusters are the design), which
// means it can drift from the registry it curates. These tests are what turn
// that drift into a build failure: an ingredient added to menu.json fails
// here until it has a place on the board, and a removed one fails until the
// board lets it go: the same day, not the day someone notices on shift.

const boardIngredientIds = INGREDIENT_GROUPS.flatMap((g) => g.items.map((i) => i.id));
const supplyIds = SUPPLY_GROUPS.flatMap((g) => g.items.map((i) => i.id));

describe("staff catalog", () => {
  it("carries every registry ingredient exactly once", () => {
    const registry = listIngredients().map((i) => i.id);
    const missing = registry.filter((id) => !boardIngredientIds.includes(id));
    expect(missing, "registry ingredients absent from the staff board").toEqual([]);
    const counts = new Map<string, number>();
    for (const id of boardIngredientIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    const dupes = [...counts].filter(([, n]) => n > 1).map(([id]) => id);
    expect(dupes, "ingredients listed more than once").toEqual([]);
  });

  it("invents no ingredient the registry does not have", () => {
    const registry = new Set(listIngredients().map((i) => i.id));
    const phantom = boardIngredientIds.filter((id) => !registry.has(id));
    expect(phantom, "board ingredients with no registry entry").toEqual([]);
  });

  it("keeps supply ids clear of ingredient ids", () => {
    const overlap = supplyIds.filter((id) => boardIngredientIds.includes(id));
    expect(overlap).toEqual([]);
    const unique = new Set(supplyIds);
    expect(unique.size, "duplicate supply ids").toBe(supplyIds.length);
  });

  it("answers membership for every listed id and nothing else", () => {
    for (const id of listStaffItemIds()) expect(isStaffItemId(id), id).toBe(true);
    expect(isStaffItemId("banana-phone")).toBe(false);
  });

  it("recognises exactly the three statuses", () => {
    expect(isStaffStatus("in")).toBe(true);
    expect(isStaffStatus("low")).toBe(true);
    expect(isStaffStatus("out")).toBe(true);
    expect(isStaffStatus("toggle")).toBe(false);
    expect(isStaffStatus(undefined)).toBe(false);
  });
});

describe("memory inventory store", () => {
  it("returns what was set, latest write winning", async () => {
    const store = new MemoryStaffInventoryStore();
    await store.set("bananas", "low", "saima@example.com");
    await store.set("bananas", "out", null);
    const rows = await store.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: "bananas", status: "out", updated_by: null });
    expect(new Date(rows[0].updated_at).getTime()).not.toBeNaN();
  });
});
