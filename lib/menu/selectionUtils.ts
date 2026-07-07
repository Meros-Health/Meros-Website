import type { BuildItem } from "@/lib/menu/buildCatalog";
import { getItemById } from "@/lib/menu/buildCatalog";

export type BowlSelectionSnapshot = {
  base: BuildItem;
  fruitsBerries: BuildItem[];
  nutsSeeds: BuildItem[];
  finish: BuildItem | null;
  enhancers: BuildItem[];
};

/** Legacy cart shape before category reorganization. */
export type LegacyBowlSelectionSnapshot = {
  base: BuildItem;
  toppings?: BuildItem[];
  drizzle?: BuildItem | null;
  supplements?: BuildItem[];
  fruitsBerries?: BuildItem[];
  nutsSeeds?: BuildItem[];
  finish?: BuildItem | null;
  enhancers?: BuildItem[];
};

function isLegacySelection(
  selection: LegacyBowlSelectionSnapshot
): selection is LegacyBowlSelectionSnapshot & { toppings: BuildItem[] } {
  return Array.isArray(selection.toppings) && selection.toppings.length > 0;
}

export function migrateLegacySelection(
  selection: LegacyBowlSelectionSnapshot
): BowlSelectionSnapshot {
  if (selection.fruitsBerries !== undefined) {
    return {
      base: selection.base,
      fruitsBerries: selection.fruitsBerries ?? [],
      nutsSeeds: selection.nutsSeeds ?? [],
      finish: selection.finish ?? null,
      enhancers: selection.enhancers ?? [],
    };
  }

  const fruitsBerries: BuildItem[] = [];
  const nutsSeeds: BuildItem[] = [];

  if (isLegacySelection(selection)) {
    for (const item of selection.toppings) {
      const catalogItem = getItemById(item.id);
      if (!catalogItem) continue;
      if (catalogItem.category === "fruit-berry") {
        fruitsBerries.push(catalogItem);
      } else if (catalogItem.category === "nuts-seeds") {
        nutsSeeds.push(catalogItem);
      }
    }
  }

  const finishId = selection.drizzle?.id ?? selection.finish?.id;
  const finish = finishId ? getItemById(finishId) ?? null : null;

  const legacyEnhancers = selection.supplements ?? selection.enhancers ?? [];
  const enhancers = legacyEnhancers
    .map((item) => getItemById(item.id))
    .filter((item): item is BuildItem => item !== undefined);

  return {
    base: getItemById(selection.base.id) ?? selection.base,
    fruitsBerries,
    nutsSeeds,
    finish,
    enhancers,
  };
}

/** Stable fingerprint for a custom bowl selection. */
export function getSelectionKey(selection: BowlSelectionSnapshot): string {
  const fruitIds = selection.fruitsBerries.map((t) => t.id).sort().join(",");
  const nutIds = selection.nutsSeeds.map((t) => t.id).sort().join(",");
  const finishId = selection.finish?.id ?? "none";
  const enhancerIds = selection.enhancers.map((s) => s.id).sort().join(",");
  return `${selection.base.id}|${fruitIds}|${nutIds}|${finishId}|${enhancerIds}`;
}

export function selectionsMatch(a: BowlSelectionSnapshot, b: BowlSelectionSnapshot): boolean {
  return getSelectionKey(a) === getSelectionKey(b);
}

export function findMatchingSignatureLine<T extends { kind: string; productId: string }>(
  items: T[],
  productId: string
): T | undefined {
  return items.find((i) => i.kind === "signature" && i.productId === productId);
}

export function findMatchingCustomLine<
  T extends { kind: string; selection?: LegacyBowlSelectionSnapshot },
>(items: T[], selection: BowlSelectionSnapshot): T | undefined {
  const key = getSelectionKey(selection);
  return items.find((i) => {
    if (i.kind !== "custom" || !i.selection) return false;
    const migrated = migrateLegacySelection(i.selection);
    return getSelectionKey(migrated) === key;
  });
}

export function normalizeSelection(
  selection: LegacyBowlSelectionSnapshot
): BowlSelectionSnapshot {
  return migrateLegacySelection(selection);
}
