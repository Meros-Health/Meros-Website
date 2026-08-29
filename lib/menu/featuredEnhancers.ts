import { BUILD_CONFIG } from "./buildConfig";
import { getIngredient, type Ingredient } from "./ingredients";

/**
 * Every enhancer the menu offers, arranged into the four columns the home
 * page Stacks section prints, and the number that runs beside each name.
 *
 * Why this lives here and not in menu.json: that file is the ingredient and
 * pricing contract shared with the in-store Menu TV. Which column an enhancer
 * sits in, and what the column says about itself, is presentation and has no
 * business in the contract. What this file may NOT do is drift from it, so
 * every id below is checked against the enhancers step by
 * `assertEnhancerGroups()` (tests/unit/featuredEnhancers.test.ts) and by
 * scripts/validate-menu.mjs, which gates the build. The check runs both ways:
 * an id here the menu does not offer fails, and an enhancer the menu offers
 * that no column names also fails, so adding one to menu.json cannot quietly
 * leave it off the page.
 *
 * On the column copy: a function claim ("supports recovery", "good for your
 * gut") is a regulated claim and this menu has nothing substantiating one. The
 * column heads are shelf labels, never promises, and every number on screen is
 * read off the nutrition record rather than typed.
 */

export const ENHANCERS_STEP_ID = "enhancers";

/** Rings in the section: one per enhancer in a stack. Read off the menu. */
export const STACK_SIZE = getBundleCount();

/** The layout is a four-by-four block of names. Both halves are asserted. */
export const GROUP_COUNT = 4;
export const GROUP_SIZE = 4;

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
  /** The column head. A shelf label, not a promise. */
  title: string;
  items: readonly EnhancerItem[];
}

const CAL = { key: "calories", label: "cal" } as const;
const PROTEIN = { key: "protein", label: "g protein" } as const;

export const ENHANCER_GROUPS: readonly EnhancerGroup[] = [
  {
    id: "build",
    title: "Build",
    items: [
      { ingredientId: "whey-protein-isolate", stat: PROTEIN },
      { ingredientId: "collagen-peptides", stat: PROTEIN },
      { ingredientId: "creatine-monohydrate", stat: CAL },
      { ingredientId: "l-glutamine", stat: CAL },
    ],
  },
  {
    id: "greens",
    title: "Greens",
    items: [
      { ingredientId: "greens-powder", stat: CAL },
      { ingredientId: "spirulina", stat: CAL },
      { ingredientId: "nutritional-yeast", stat: PROTEIN },
      { ingredientId: "wheat-germ", stat: CAL },
    ],
  },
  {
    id: "focus",
    title: "Focus",
    items: [
      { ingredientId: "matcha", stat: CAL },
      { ingredientId: "cacao-nibs", stat: CAL },
      { ingredientId: "lions-mane", stat: CAL },
      { ingredientId: "mct-oil", stat: CAL },
    ],
  },
  {
    id: "botanicals",
    title: "Botanicals",
    items: [
      { ingredientId: "ashwagandha", stat: CAL },
      { ingredientId: "maca-powder", stat: CAL },
      { ingredientId: "turmeric-black-pepper", stat: CAL },
      { ingredientId: "bee-pollen", stat: CAL },
    ],
  },
] as const;

/** The enhancers step's bundle size, which is how many rings the section draws. */
function getBundleCount(): number {
  const step = BUILD_CONFIG.steps.find((s) => s.id === ENHANCERS_STEP_ID);
  const pricing = step?.pricing;
  if (pricing?.mode === "included-then-extra" && pricing.bundle) return pricing.bundle.count;
  // No bundle configured: the section still draws a stack, and three is the
  // shape the layout is built around.
  return 3;
}

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
 * Throws on any drift between this file and the menu. Called by the unit test
 * and by scripts/validate-menu.mjs; not called at runtime, because a shipped
 * build has already passed both.
 */
export function assertEnhancerGroups(): void {
  const problems: string[] = [];
  const seen = new Set<string>();

  if (!BUILD_CONFIG.steps.some((s) => s.id === ENHANCERS_STEP_ID)) {
    problems.push(`the menu has no "${ENHANCERS_STEP_ID}" step`);
  }

  if (ENHANCER_GROUPS.length !== GROUP_COUNT) {
    problems.push(`the layout draws ${GROUP_COUNT} columns but ${ENHANCER_GROUPS.length} are defined`);
  }

  for (const group of ENHANCER_GROUPS) {
    if (group.items.length !== GROUP_SIZE) {
      problems.push(`column "${group.id}" holds ${group.items.length} enhancers, not ${GROUP_SIZE}`);
    }
    for (const { ingredientId: id } of group.items) {
      if (seen.has(id)) problems.push(`"${id}" appears in more than one column`);
      seen.add(id);
      if (!isEnhancerOffered(id)) {
        problems.push(`"${id}" is on the home page but the ${ENHANCERS_STEP_ID} step does not offer it`);
      }
      if (!getIngredient(id)) problems.push(`"${id}" is on the home page but is not in the ingredient registry`);
    }
  }

  // The other direction: the section claims to show the whole shelf, so an
  // enhancer added to menu.json has to be given a column or fail the build.
  for (const id of offeredEnhancerIds()) {
    if (!seen.has(id)) {
      problems.push(`the menu offers "${id}" but no column on the home page names it`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Enhancer columns are out of step with the menu:\n  ${problems.join("\n  ")}`);
  }
}
