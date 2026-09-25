// What depends on an ingredient, and therefore whether the store can stop
// carrying it without a code change.
//
// The staff board lets a server take an item off the board and off the
// ordering page. That is safe for a topping nobody orders and unsafe for
// anything the menu has already promised, so the difference has to be computed
// rather than remembered. Everything here derives from lib/menu/menu.json at
// module load, the same way lib/menu/ingredients.ts builds its id index, so a
// recipe change re-locks or frees an ingredient on the same commit and nobody
// has to update a list.
//
// Four things lock an ingredient, and each answers a different question:
//
//   recipe   A signature's recipe names it. Pulling it makes The Cabana a lie.
//   stack    A named Stack names it. Same problem: the Stacks print on the
//            home page, the builder and the Menu TV.
//   base     It is a yogurt. The base step is `required: true`, so every bowl
//            has to have one; a board tap is not how the store stops offering
//            a yogurt. Covers the defaultBase smoothies fall back to.
//
// The liquid is the subtle one. House whey water goes in every smoothie, but
// it prints on none of them: like the yogurt it is a base, not a topping, so
// it is deliberately absent from every `recipe` array. That left it reading as
// an ingredient nothing needs, one tap from being dropped. signatures
// .defaultLiquid says it out loud, and it locks as a signature ingredient
// because that is what it is. (The Crave is the exception the data already
// covers: its liquid is cold brew, which is in its recipe.)
//   (none)   Everything else. An optional topping in an optional step, or an
//            ingredient no customer surface offers at all.
//
// Nothing here knows about the staff board; the board reads it. Keeping the
// dependency question in lib/menu means the answer stays next to the data it
// is asking about.

import menuData from "@/lib/menu/menu.json";

export type LockReason = "recipe" | "stack" | "base";

/**
 * How a row may be removed.
 *
 * - `locked`     Something on the menu depends on it. Set it Out instead.
 * - `build-only` An optional build-a-bowl pick. Safe to stop carrying.
 * - `inert`      No customer surface offers it. Nothing can notice it going.
 */
export type RemovalClass = "locked" | "build-only" | "inert";

type Signature = { id: string; recipe?: string[]; base?: string };

const menu = menuData as unknown as {
  ingredients: { id: string }[];
  build: { steps: { id: string; required?: boolean; options?: { ingredientId: string }[] }[] };
  stacks: { items: { enhancers?: string[] }[] };
  signatures: {
    defaultBase?: Record<string, string>;
    defaultLiquid?: Record<string, string>;
    bowls?: Signature[];
    smoothies?: Signature[];
  };
};

function buildLockIndex(): Map<string, LockReason> {
  const locks = new Map<string, LockReason>();
  // Least specific first: a later, more explanatory reason may overwrite an
  // earlier one, so "in The Cabana" beats "it is a yogurt" when both are true.
  for (const step of menu.build.steps) {
    if (!step.required) continue;
    for (const option of step.options ?? []) locks.set(option.ingredientId, "base");
  }
  for (const id of Object.values(menu.signatures.defaultBase ?? {})) locks.set(id, "base");

  for (const stack of menu.stacks.items) {
    for (const id of stack.enhancers ?? []) locks.set(id, "stack");
  }

  for (const group of [menu.signatures.bowls ?? [], menu.signatures.smoothies ?? []]) {
    for (const signature of group) {
      for (const id of signature.recipe ?? []) locks.set(id, "recipe");
      if (signature.base) locks.set(signature.base, "recipe");
    }
  }

  // Last, and as "recipe": the liquid is in every smoothie even though it
  // prints in none, which is exactly what "Signature ingredient" should mean
  // to whoever is holding the phone.
  for (const id of Object.values(menu.signatures.defaultLiquid ?? {})) locks.set(id, "recipe");
  return locks;
}

const LOCKS = buildLockIndex();

const OFFERED = new Set<string>(
  menu.build.steps.flatMap((step) => (step.options ?? []).map((option) => option.ingredientId))
);

/** Why this ingredient cannot be dropped, or null when it can be. */
export function lockReason(id: string): LockReason | null {
  return LOCKS.get(id) ?? null;
}

/** Offered as a pick in any build-a-bowl step. */
export function isOfferedInBuild(id: string): boolean {
  return OFFERED.has(id);
}

export function removalClass(id: string): RemovalClass {
  if (LOCKS.has(id)) return "locked";
  return OFFERED.has(id) ? "build-only" : "inert";
}

export function isRemovableIngredient(id: string): boolean {
  return !LOCKS.has(id);
}

/**
 * Two words, shown on the disabled control. Deliberately terse: it is a tap
 * target on a phone mid-shift, not documentation. The board's own copy carries
 * the longer "set it Out instead" guidance once, not per row.
 */
export const LOCK_LABELS: Record<LockReason, string> = {
  recipe: "Signature ingredient",
  stack: "Stack ingredient",
  base: "Base ingredient",
};

export function lockLabel(id: string): string | null {
  const reason = lockReason(id);
  return reason ? LOCK_LABELS[reason] : null;
}
