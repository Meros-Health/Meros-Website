// @vitest-environment node
import { describe, expect, it } from "vitest";
import { INGREDIENT_GROUPS, SUPPLY_GROUPS, isStaffItemId } from "@/lib/staff/catalog";
import {
  CUSTOM_PREFIX,
  MAX_NAME_LENGTH,
  STAFF_SECTIONS,
  builtInItemFor,
  checkStaffItemName,
  customStaffItemId,
  isCustomStaffItemId,
  isStaffSection,
  resolveSection,
  slugifyStaffItemName,
  tabForSection,
} from "@/lib/staff/customItems";

// Staff add rows to the board at runtime; the built-in rows are code. The
// tests that matter most here are the ones holding those two apart, because
// that separation is what stops a staff session from removing a registry
// ingredient or shadowing one with a row of its own.

// Built from a char code so this file holds no literal control character.
const BELL = String.fromCharCode(7);

describe("slugifyStaffItemName", () => {
  it("turns a typed name into an id", () => {
    expect(slugifyStaffItemName("Raspberry Chia Pudding")).toBe("raspberry-chia-pudding");
  });

  it("folds accents rather than dropping the letters", () => {
    expect(slugifyStaffItemName("Açaí Purée")).toBe("acai-puree");
  });

  it("collapses punctuation and runs of spaces to one hyphen", () => {
    expect(slugifyStaffItemName("Sanitizer (Quat) 200 ppm")).toBe("sanitizer-quat-200-ppm");
    expect(slugifyStaffItemName("Nuts  &  Seeds")).toBe("nuts-seeds");
  });

  it("leaves no leading or trailing hyphen, including after the length cap", () => {
    expect(slugifyStaffItemName("  Oat Milk!  ")).toBe("oat-milk");
    const slug = slugifyStaffItemName(`${"a".repeat(59)} tail`);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.length).toBeLessThanOrEqual(60);
  });

  it("is empty for a name with nothing sluggable in it", () => {
    expect(slugifyStaffItemName("!!!")).toBe("");
  });

  it("agrees across the spellings two people would actually type", () => {
    expect(slugifyStaffItemName("Raspberry Chia Pudding")).toBe(
      slugifyStaffItemName("  raspberry   chia pudding ")
    );
  });
});

describe("checkStaffItemName", () => {
  it("accepts a real name and returns it tidied", () => {
    const result = checkStaffItemName("  Raspberry   Chia Pudding ");
    expect(result).toEqual({
      ok: true,
      name: "Raspberry Chia Pudding",
      slug: "raspberry-chia-pudding",
    });
  });

  it("accepts the punctuation real products carry", () => {
    for (const name of [
      "Sanitizer (Quat)",
      "Nuts & Seeds",
      "2% Milk",
      "Half-and-Half",
      "Café Blend",
    ]) {
      expect(checkStaffItemName(name).ok, name).toBe(true);
    }
  });

  it("refuses an empty or absent name", () => {
    for (const input of ["", "   ", undefined, null, 42, {}]) {
      expect(checkStaffItemName(input).ok).toBe(false);
    }
  });

  it("refuses a name past the length cap", () => {
    expect(checkStaffItemName("a".repeat(MAX_NAME_LENGTH)).ok).toBe(true);
    expect(checkStaffItemName("a".repeat(MAX_NAME_LENGTH + 1)).ok).toBe(false);
  });

  it("refuses control characters and anything outside the allowlist", () => {
    for (const name of [`Bad${BELL}Name`, "<script>", "drop;table", "item`s", "a\\b", "x|y"]) {
      expect(checkStaffItemName(name).ok, name).toBe(false);
    }
  });

  it("refuses a name that would slugify to nothing", () => {
    expect(checkStaffItemName("...").ok).toBe(false);
  });

  it("gives a message a server can act on, never a bare code", () => {
    const result = checkStaffItemName("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(5);
  });
});

describe("the custom namespace", () => {
  it("recognises only a prefixed id with something after the prefix", () => {
    expect(isCustomStaffItemId("custom:raspberry-chia-pudding")).toBe(true);
    expect(isCustomStaffItemId(CUSTOM_PREFIX)).toBe(false);
    expect(isCustomStaffItemId("bananas")).toBe(false);
    expect(isCustomStaffItemId("")).toBe(false);
    expect(isCustomStaffItemId(undefined)).toBe(false);
    expect(isCustomStaffItemId(7)).toBe(false);
  });

  it("builds ids the namespace check accepts", () => {
    expect(customStaffItemId("oat-milk")).toBe("custom:oat-milk");
    expect(isCustomStaffItemId(customStaffItemId("oat-milk"))).toBe(true);
  });

  // The separation the DELETE guard rests on. If a built-in id ever looked
  // custom, a staff session could remove a registry ingredient from the board;
  // if a custom id ever passed isStaffItemId, PATCH would stop checking that
  // the row it is writing a status for actually exists.
  it("never overlaps the built-in catalog, in either direction", () => {
    for (const group of [...INGREDIENT_GROUPS, ...SUPPLY_GROUPS]) {
      for (const item of group.items) {
        expect(isCustomStaffItemId(item.id), item.id).toBe(false);
      }
    }
    expect(isStaffItemId(customStaffItemId("bananas"))).toBe(false);
    expect(isStaffItemId(customStaffItemId("anything-at-all"))).toBe(false);
  });
});

describe("sections", () => {
  it("offers exactly the groups the board draws", () => {
    const board = [...INGREDIENT_GROUPS, ...SUPPLY_GROUPS].map((group) => group.name);
    expect(STAFF_SECTIONS.map((section) => section.name)).toEqual(board);
  });

  it("files each section under the tab its groups live on", () => {
    for (const group of INGREDIENT_GROUPS) {
      expect(tabForSection(group.name), group.name).toBe("ingredients");
    }
    for (const group of SUPPLY_GROUPS) {
      expect(tabForSection(group.name), group.name).toBe("supplies");
    }
    expect(tabForSection("Nowhere")).toBeNull();
  });

  it("admits a known section and refuses anything else", () => {
    expect(isStaffSection("Fruits")).toBe(true);
    expect(isStaffSection("Serviceware")).toBe(true);
    expect(isStaffSection("fruits")).toBe(false);
    expect(isStaffSection("Robert'); DROP TABLE staff_items;--")).toBe(false);
    expect(isStaffSection(undefined)).toBe(false);
  });

  // A stored row names the section it was filed under, so renaming a group
  // strands every row still carrying the old name unless something maps it.
  it("maps a renamed section to its current name", () => {
    expect(resolveSection("Cleaning + Sanitation")).toBe("Maintenance");
  });

  it("passes a current section through unchanged", () => {
    for (const section of STAFF_SECTIONS) {
      expect(resolveSection(section.name), section.name).toBe(section.name);
    }
  });

  it("returns null for a name no version of the board had", () => {
    expect(resolveSection("Nowhere")).toBeNull();
    expect(resolveSection("")).toBeNull();
  });

  // An alias pointing at a group that no longer exists is worse than no alias:
  // it looks handled and still strands the rows.
  it("points every alias at a section that exists", () => {
    const aliased = resolveSection("Cleaning + Sanitation");
    expect(aliased).not.toBeNull();
    expect(STAFF_SECTIONS.map((s) => s.name)).toContain(aliased);
  });
});

describe("builtInItemFor", () => {
  it("names the built-in row a slug would collide with, and where it is", () => {
    expect(builtInItemFor("bananas")).toEqual({ name: "Bananas", section: "Fruits" });
    expect(builtInItemFor("napkins")).toEqual({ name: "Napkins", section: "Serviceware" });
  });

  it("honours the board's own label override rather than the registry name", () => {
    expect(builtInItemFor("pb-powder")?.name).toBe("Peanut Butter (Powder)");
  });

  it("is null for a slug the board does not carry", () => {
    expect(builtInItemFor("raspberry-chia-pudding")).toBeNull();
  });

  // A server typing a name that is already there is looking for it, not adding
  // a duplicate, so every built-in has to be findable by the slug of its label.
  it("finds every built-in row by the slug of its own name", () => {
    for (const group of [...INGREDIENT_GROUPS, ...SUPPLY_GROUPS]) {
      for (const item of group.items) {
        const slug = slugifyStaffItemName(item.name);
        if (slug !== item.id) continue; // ids like "evoo" are not the label
        expect(builtInItemFor(slug)?.name, item.name).toBe(item.name);
      }
    }
  });
});
