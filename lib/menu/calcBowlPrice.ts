import type { BuildItem, BuildStepId } from "@/lib/menu/buildCatalog";
import { formatPrice, formatSurcharge, getBasePrice, PRICING } from "@/lib/menu/pricing";

export type BowlSelectionInput = {
  base: BuildItem | null;
  fruitsBerries: BuildItem[];
  nutsSeeds: BuildItem[];
  finish: BuildItem | null;
  enhancers: BuildItem[];
};

function surchargeCount(count: number, included: number): number {
  return Math.max(0, count - included);
}

export function calcBowlPrice(selection: BowlSelectionInput): number {
  if (!selection.base) return 0;

  let total = getBasePrice(selection.base.id);

  total +=
    surchargeCount(selection.fruitsBerries.length, PRICING.includedPerCategory.fruitsBerries) *
    PRICING.extraItemSurcharge;

  total +=
    surchargeCount(selection.nutsSeeds.length, PRICING.includedPerCategory.nutsSeeds) *
    PRICING.extraItemSurcharge;

  if (selection.finish) {
    total += PRICING.finishPrice;
  }

  total += selection.enhancers.length * PRICING.enhancerPrice;

  return total;
}

export function getSelectedItems(selection: BowlSelectionInput): BuildItem[] {
  if (!selection.base) return [];
  return [
    selection.base,
    ...selection.fruitsBerries,
    ...selection.nutsSeeds,
    ...(selection.finish ? [selection.finish] : []),
    ...selection.enhancers,
  ];
}

function isItemExtraInCategory(
  itemId: string,
  selected: BuildItem[],
  included: number
): boolean {
  const index = selected.findIndex((i) => i.id === itemId);
  return index >= included;
}

export function getItemPriceLabel(
  step: BuildStepId,
  item: BuildItem,
  selection: BowlSelectionInput
): string | null {
  switch (step) {
    case "base":
      return formatPrice(getBasePrice(item.id));
    case "fruits-berries": {
      const selected = selection.fruitsBerries;
      const isSelected = selected.some((i) => i.id === item.id);
      if (isSelected) {
        return isItemExtraInCategory(item.id, selected, PRICING.includedPerCategory.fruitsBerries)
          ? formatSurcharge(PRICING.extraItemSurcharge)
          : "Included";
      }
      if (selected.length >= PRICING.includedPerCategory.fruitsBerries) {
        return formatSurcharge(PRICING.extraItemSurcharge);
      }
      return "Included";
    }
    case "nuts-seeds": {
      const selected = selection.nutsSeeds;
      const isSelected = selected.some((i) => i.id === item.id);
      if (isSelected) {
        return isItemExtraInCategory(item.id, selected, PRICING.includedPerCategory.nutsSeeds)
          ? formatSurcharge(PRICING.extraItemSurcharge)
          : "Included";
      }
      if (selected.length >= PRICING.includedPerCategory.nutsSeeds) {
        return formatSurcharge(PRICING.extraItemSurcharge);
      }
      return "Included";
    }
    case "finish":
      return formatSurcharge(PRICING.finishPrice);
    case "enhancers":
      return formatSurcharge(PRICING.enhancerPrice);
    default:
      return null;
  }
}

export function showCategorySurchargeBanner(step: BuildStepId, selection: BowlSelectionInput): boolean {
  if (step === "fruits-berries") {
    return selection.fruitsBerries.length >= PRICING.includedPerCategory.fruitsBerries;
  }
  if (step === "nuts-seeds") {
    return selection.nutsSeeds.length >= PRICING.includedPerCategory.nutsSeeds;
  }
  return false;
}

export function getCategorySurchargeBannerText(step: BuildStepId): string {
  const included =
    step === "fruits-berries"
      ? PRICING.includedPerCategory.fruitsBerries
      : PRICING.includedPerCategory.nutsSeeds;
  return `${included} included — additional selections ${formatSurcharge(PRICING.extraItemSurcharge)} each`;
}
