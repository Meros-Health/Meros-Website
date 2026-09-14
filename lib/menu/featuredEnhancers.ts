import { getIngredient, type Ingredient } from "./ingredients";
import { ENHANCERS_STEP_ID, listStacks, shelfEnhancerIds, stackSize } from "./stacks";
import { BUILD_CONFIG } from "./buildConfig";

/**
 * The home page Stacks section: the named Stacks from menu.json, one column
 * each, with the number that runs beside every enhancer's name.
 *
 * Until 2026-09-10 the columns were an editorial arrangement of the whole
 * shelf (Build, Greens, Focus, Botanicals) kept in this file. The columns are
 * now the four Stacks the store sells, so they are read from `stacks` in
 * menu.json and a Stack renamed or recomposed there changes the page. What
 * stays here is presentation: which figure prints beside each name, and the
 * label it carries. `assertEnhancerGroups()` (tests/unit/featuredEnhancers.test.ts)
 * still fails the build if a column names an enhancer the step no longer offers;
 * scripts/validate-menu.mjs checks the same thing on the raw file.
 *
 * On the column copy: a function claim ("supports recovery", "good for your
 * gut") is a regulated claim and this menu has nothing substantiating one. The
 * column heads are the Stack names, never promises, and every number on screen
 * is read off the nutrition record rather than typed.
 */

export { ENHANCERS_STEP_ID };

/** Rings in the section: one per enhancer in a Stack. Read off the menu. */
export const STACK_SIZE = stackSize();

/** One column per Stack, each STACK_SIZE names tall. Both are asserted. */
export const GROUP_COUNT = listStacks().length;
export const GROUP_SIZE = STACK_SIZE;

export interface EnhancerItem {
  ingredientId: string;
  /**
   * The number beside the name. A key of the ingredient's own nutrition
   * record plus the label to print, so the figure is always read and never
   * typed. Protein where the ingredient is bought for it, calories otherwise,
   * which is what makes "0 cal" on creatine and glutamine worth printing.
   */
  stat: { key: "calories" | "protein"; label: string };
}

export interface EnhancerGroup {
  id: string;
  /** The column head: the Stack's name. */
  title: string;
  items: readonly EnhancerItem[];
}

const CAL = { key: "calories", label: "cal" } as const;
const PROTEIN = { key: "protein", label: "g protein" } as const;

/** Enhancers bought for their protein print that; everything else prints calories. */
const PROTEIN_LED = new Set(["whey-protein-isolate", "collagen-peptides", "nutritional-yeast"]);

export const ENHANCER_GROUPS: readonly EnhancerGroup[] = listStacks().map((stack) => ({
  id: stack.id,
  title: stack.name,
  items: stack.enhancers.map((ingredientId) => ({
    ingredientId,
    stat: PROTEIN_LED.has(ingredientId) ? PROTEIN : CAL,
  })),
}));

/** True when the enhancers step offers this ingredient. */
export function isEnhancerOffered(ingredientId: string): boolean {
  const step = BUILD_CONFIG.steps.find((s) => s.id === ENHANCERS_STEP_ID);
  return step?.options.some((opt) => opt.ingredientId === ingredientId) ?? false;
}

/** Every enhancer id the menu offers, in menu order. */
export function offeredEnhancerIds(): string[] {
  const step = BUILD_CONFIG.steps.find((s) => s.id === ENHANCERS_STEP_ID);
  return step?.options.map((opt) => opt.ingredientId) ?? [];
}

/** How many enhancers the menu offers. */
export function enhancerCount(): number {
  return offeredEnhancerIds().length;
}

export interface ResolvedEnhancer extends EnhancerItem {
  ingredient: Ingredient;
  /** e.g. "24 g protein", "6 cal". Built from the record, rounded once. */
  statLine: string;
}

export interface ResolvedEnhancerGroup extends Omit<EnhancerGroup, "items"> {
  items: ResolvedEnhancer[];
}

/**
 * The columns with their ingredient records attached. An id the menu no longer
 * offers is dropped rather than rendered as a dead row: the validator and the
 * unit test are what make that unreachable in a shipped build, and this keeps
 * a stale id from throwing on a customer's screen if one ever slips through.
 */
export function resolveEnhancerGroups(): ResolvedEnhancerGroup[] {
  return ENHANCER_GROUPS.map((group) => ({
    ...group,
    items: group.items.flatMap((item) => {
      if (!isEnhancerOffered(item.ingredientId)) return [];
      const ingredient = getIngredient(item.ingredientId);
      if (!ingredient) return [];
      const value = Math.round(ingredient.nutrition[item.stat.key]);
      return [{ ...item, ingredient, statLine: `${value} ${item.stat.label}` }];
    }),
  }));
}

/** Every grouped id, flattened, in column order. */
export function groupedEnhancerIds(): string[] {
  return ENHANCER_GROUPS.flatMap((group) => group.items.map((item) => item.ingredientId));
}

/**
 * The enhancers the step offers that no Stack names, with their records. The
 * section lists them in one line under the columns so the whole shelf is still
 * on the page.
 */
export function shelfEnhancers(): Ingredient[] {
  return shelfEnhancerIds().flatMap((id) => {
    const ingredient = getIngredient(id);
    return ingredient ? [ingredient] : [];
  });
}

/**
 * Throws on any drift between the columns and the menu. Called by the unit
 * test; not called at runtime, because a shipped build has already passed it.
 */
export function assertEnhancerGroups(): void {
  const problems: string[] = [];

  if (!BUILD_CONFIG.steps.some((s) => s.id === ENHANCERS_STEP_ID)) {
    problems.push(`the menu has no "${ENHANCERS_STEP_ID}" step`);
  }

  if (ENHANCER_GROUPS.length !== GROUP_COUNT || ENHANCER_GROUPS.length === 0) {
    problems.push(`the layout draws ${GROUP_COUNT} columns but ${ENHANCER_GROUPS.length} are defined`);
  }

  for (const group of ENHANCER_GROUPS) {
    if (group.items.length !== GROUP_SIZE) {
      problems.push(`column "${group.id}" holds ${group.items.length} enhancers, not ${GROUP_SIZE}`);
    }
    const seen = new Set<string>();
    for (const { ingredientId: id } of group.items) {
      if (seen.has(id)) problems.push(`"${id}" appears twice in column "${group.id}"`);
      seen.add(id);
      if (!isEnhancerOffered(id)) {
        problems.push(`"${id}" is on the home page but the ${ENHANCERS_STEP_ID} step does not offer it`);
      }
      if (!getIngredient(id)) problems.push(`"${id}" is on the home page but is not in the ingredient registry`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Enhancer columns are out of step with the menu:\n  ${problems.join("\n  ")}`);
  }
}
