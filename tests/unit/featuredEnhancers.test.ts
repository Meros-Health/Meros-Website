import { describe, expect, it } from "vitest";
import { BUILD_CONFIG } from "@/lib/menu/buildConfig";
import { getIngredient } from "@/lib/menu/ingredients";
import {
  ENHANCERS_STEP_ID,
  ENHANCER_GROUPS,
  GROUP_COUNT,
  GROUP_SIZE,
  STACK_SIZE,
  assertEnhancerGroups,
  enhancerCount,
  groupedEnhancerIds,
  isEnhancerOffered,
  offeredEnhancerIds,
  resolveEnhancerGroups,
  shelfEnhancers,
} from "@/lib/menu/featuredEnhancers";
import { listStacks } from "@/lib/menu/stacks";

// The Stacks section prints the named Stacks from menu.json, one column each,
// with a number beside each name. Columns and numbers are derived from
// menu.json, and this is what makes pulling an enhancer a build failure rather
// than a dead row on the home page.

const enhancersStep = BUILD_CONFIG.steps.find((step) => step.id === ENHANCERS_STEP_ID);

describe("enhancer columns", () => {
  it("has the enhancers step it is built on", () => {
    expect(enhancersStep).toBeDefined();
    expect(enhancersStep?.select).toBe("multi");
  });

  it("draws one column per Stack, each a Stack tall", () => {
    expect(ENHANCER_GROUPS).toHaveLength(GROUP_COUNT);
    expect(GROUP_COUNT).toBe(listStacks().length);
    for (const group of ENHANCER_GROUPS) {
      expect(group.items, `column "${group.id}"`).toHaveLength(GROUP_SIZE);
    }
  });

  it("titles each column with its Stack's name and lists its enhancers in Stack order", () => {
    for (const stack of listStacks()) {
      const group = ENHANCER_GROUPS.find((g) => g.id === stack.id);
      expect(group?.title).toBe(stack.name);
      expect(group?.items.map((i) => i.ingredientId)).toEqual(stack.enhancers);
    }
  });

  it("names only ingredients the enhancers step offers", () => {
    for (const id of groupedEnhancerIds()) {
      expect(isEnhancerOffered(id), `${id} is not offered`).toBe(true);
    }
  });

  it("names only ingredients in the registry", () => {
    for (const id of groupedEnhancerIds()) {
      expect(getIngredient(id), `${id} is unknown`).toBeDefined();
    }
  });

  it("puts the rest of the shelf in the line under the columns, so nothing offered is left off the page", () => {
    const shown = [...groupedEnhancerIds(), ...shelfEnhancers().map((i) => i.id)];
    expect([...shown].sort()).toEqual([...offeredEnhancerIds()].sort());
    expect(new Set(shown).size).toBe(shown.length);
  });

  it("assertEnhancerGroups passes against the live menu", () => {
    expect(() => assertEnhancerGroups()).not.toThrow();
  });

  it("draws one ring per pick in the step's bundle", () => {
    const pricing = enhancersStep?.pricing;
    const expected =
      pricing?.mode === "included-then-extra" && pricing.bundle ? pricing.bundle.count : 3;
    expect(STACK_SIZE).toBe(expected);
  });

  it("counts every enhancer the menu offers", () => {
    expect(enhancerCount()).toBe(enhancersStep?.options.length);
  });
});

describe("resolveEnhancerGroups", () => {
  it("resolves every name with a stat read from the ingredient record", () => {
    const resolved = resolveEnhancerGroups();
    expect(resolved.flatMap((g) => g.items)).toHaveLength(GROUP_COUNT * GROUP_SIZE);

    for (const item of resolved.flatMap((g) => g.items)) {
      const value = Math.round(item.ingredient.nutrition[item.stat.key]);
      expect(item.statLine).toBe(`${value} ${item.stat.label}`);
    }
  });

  it("prints the numbers the menu currently carries", () => {
    const byId = new Map(
      resolveEnhancerGroups()
        .flatMap((g) => g.items)
        .map((item) => [item.ingredientId, item.statLine])
    );
    expect(byId.get("whey-protein-isolate")).toBe("24 g protein");
    expect(byId.get("creatine-monohydrate")).toBe("0 cal");
    expect(byId.get("collagen-peptides")).toBe("9 g protein");
  });

  it("never types a price or a claim into a stat line", () => {
    for (const item of resolveEnhancerGroups().flatMap((g) => g.items)) {
      expect(item.statLine).not.toMatch(/\$/);
      expect(item.statLine).toMatch(/^\d+ (cal|g protein)$/);
    }
  });
});
