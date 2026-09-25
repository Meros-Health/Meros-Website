// @vitest-environment node
import { describe, expect, it } from "vitest";
import menuData from "@/lib/menu/menu.json";
import { listIngredients } from "@/lib/menu/ingredients";
import {
  LOCK_LABELS,
  isOfferedInBuild,
  isRemovableIngredient,
  lockLabel,
  lockReason,
  removalClass,
} from "@/lib/menu/dependencies";

// The staff board lets a server stop carrying an ingredient. This module is
// what decides whether that is safe, so these tests are the ones standing
// between a tap and a signature that lists something the store says it does
// not have.
//
// They are deliberately derived from menu.json rather than hand-listed: a
// recipe change should re-lock or free an ingredient on the same commit, and
// a test full of hardcoded names would just need updating alongside it. The
// few literal expectations below are spot checks on that derivation.

const menu = menuData as unknown as {
  build: { steps: { required?: boolean; options?: { ingredientId: string }[] }[] };
  stacks: { items: { enhancers?: string[] }[] };
  signatures: {
    defaultBase?: Record<string, string>;
    bowls?: { recipe?: string[]; base?: string }[];
    smoothies?: { recipe?: string[]; base?: string }[];
  };
};

const ALL = listIngredients().map((i) => i.id);

describe("the removal classes", () => {
  it("partition the registry exactly once each", () => {
    const counts = { locked: 0, "build-only": 0, inert: 0 };
    for (const id of ALL) counts[removalClass(id)] += 1;
    expect(counts.locked + counts["build-only"] + counts.inert).toBe(ALL.length);
    expect(ALL.length).toBeGreaterThan(0);
  });

  it("agree with isRemovableIngredient in both directions", () => {
    for (const id of ALL) {
      expect(isRemovableIngredient(id), id).toBe(removalClass(id) !== "locked");
      expect(lockLabel(id) === null, id).toBe(isRemovableIngredient(id));
    }
  });

  it("call an unknown id inert rather than throwing", () => {
    // Supply ids (napkins, straws) are not in the registry and must be freely
    // removable: no menu can depend on a napkin.
    expect(removalClass("napkins")).toBe("inert");
    expect(isRemovableIngredient("napkins")).toBe(true);
    expect(lockLabel("banana-phone")).toBeNull();
  });
});

describe("what locks an ingredient", () => {
  it("locks every ingredient a signature recipe names", () => {
    const groups = [menu.signatures.bowls ?? [], menu.signatures.smoothies ?? []];
    for (const group of groups) {
      for (const signature of group) {
        for (const id of signature.recipe ?? []) {
          expect(isRemovableIngredient(id), `${id} is in a recipe`).toBe(false);
        }
        if (signature.base) expect(isRemovableIngredient(signature.base)).toBe(false);
      }
    }
  });

  // Missed on the first pass: the Stacks print on the home page, the builder
  // and the Menu TV, and they name enhancers no signature recipe does.
  it("locks every enhancer a named Stack depends on", () => {
    for (const stack of menu.stacks.items) {
      for (const id of stack.enhancers ?? []) {
        expect(isRemovableIngredient(id), `${id} is in a Stack`).toBe(false);
      }
    }
  });

  it("locks every option of a required build step, and the default base", () => {
    for (const step of menu.build.steps) {
      if (!step.required) continue;
      for (const option of step.options ?? []) {
        expect(isRemovableIngredient(option.ingredientId), option.ingredientId).toBe(false);
      }
    }
    for (const id of Object.values(menu.signatures.defaultBase ?? {})) {
      expect(isRemovableIngredient(id), `${id} is a default base`).toBe(false);
    }
  });

  it("reports the most explanatory reason when more than one applies", () => {
    // high-protein-yogurt is both a base-step option and The Recovery's base.
    // "Signature ingredient" tells a server more than "Base ingredient" does.
    expect(lockReason("high-protein-yogurt")).toBe("recipe");
    expect(lockReason("plain-greek-yogurt")).toBe("base");
    expect(lockReason("creatine-monohydrate")).toBe("stack");
    expect(lockReason("strawberries")).toBe("recipe");
  });

  it("keeps every label to the two words a phone control can show", () => {
    for (const label of Object.values(LOCK_LABELS)) {
      expect(label.split(" ").length).toBeLessThanOrEqual(2);
    }
  });
});

describe("what stays removable", () => {
  // The whole point of the feature. Derived, not listed: retiring a topping
  // from menu.json should never make this test wrong, only smaller.
  it("leaves every optional pick that nothing depends on removable", () => {
    const optional = menu.build.steps
      .filter((step) => !step.required)
      .flatMap((step) => (step.options ?? []).map((option) => option.ingredientId));
    const depended = new Set<string>([
      ...menu.stacks.items.flatMap((stack) => stack.enhancers ?? []),
      ...[menu.signatures.bowls ?? [], menu.signatures.smoothies ?? []]
        .flat()
        .flatMap((sig) => [...(sig.recipe ?? []), ...(sig.base ? [sig.base] : [])]),
      ...Object.values(menu.signatures.defaultBase ?? {}),
    ]);

    const free = optional.filter((id) => !depended.has(id));
    expect(free.length, "no optional pick is free, the board's - is decoration").toBeGreaterThan(0);
    for (const id of free) {
      expect(isRemovableIngredient(id), id).toBe(true);
      expect(removalClass(id), id).toBe("build-only");
    }
  });

  it("calls an ingredient no customer surface offers inert", () => {
    for (const id of ["peanut-butter", "coconut-milk", "house-whey-water"]) {
      expect(removalClass(id), id).toBe("inert");
      expect(isOfferedInBuild(id), id).toBe(false);
    }
  });

  it("keeps something genuinely removable in the registry", () => {
    const removable = ALL.filter(isRemovableIngredient);
    expect(removable.length).toBeGreaterThan(5);
  });
});
