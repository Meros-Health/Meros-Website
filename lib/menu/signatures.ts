// Typed accessor over lib/menu/menu.json, the single source of truth for the
// signature menu. The in-store Menu TV renders from the same file (see
// ../menu-tv/sync-menu.sh), so any menu change is made in menu.json only.
import menuData from "@/lib/menu/menu.json";

export type SignatureCategory = "bowl" | "smoothie";

export type SignatureSizeInfo = {
  price: number;
  calories: number;
  protein: number;
};

export type SizeTier = { id: string; label: string };

export type SignatureItem = {
  id: string;
  category: SignatureCategory;
  /** Board copy, "The" included: "The Moment". */
  name: string;
  tags: string[];
  /** Board copy: one comma-separated string. */
  ingredients: string;
  /** Keyed by size id; bowls carry two sizes, smoothies one. */
  sizes: Record<string, SignatureSizeInfo>;
  images: { photo: string; transparent: string };
};

type RawItem = Omit<SignatureItem, "category">;

const SIZE_TIERS: Record<SignatureCategory, SizeTier[]> = menuData.sizeTiers;

const BOWLS: SignatureItem[] = (menuData.bowls as RawItem[]).map((item) => ({
  ...item,
  category: "bowl",
}));

const SMOOTHIES: SignatureItem[] = (menuData.smoothies as RawItem[]).map((item) => ({
  ...item,
  category: "smoothie",
}));

const BY_ID = new Map<string, SignatureItem>(
  [...BOWLS, ...SMOOTHIES].map((item) => [item.id, item])
);

export function listBowls(): SignatureItem[] {
  return BOWLS;
}

export function listSmoothies(): SignatureItem[] {
  return SMOOTHIES;
}

export function getSignatureItem(id: string): SignatureItem | undefined {
  return BY_ID.get(id);
}

/** Display order and labels for a category's sizes. */
export function getSizeTiers(category: SignatureCategory): SizeTier[] {
  return SIZE_TIERS[category];
}

/** First tier in display order: Medium for bowls, 24 oz for smoothies. */
export function getDefaultSizeId(category: SignatureCategory): string {
  return SIZE_TIERS[category][0].id;
}

export function getSizeLabel(category: SignatureCategory, sizeId: string): string {
  return SIZE_TIERS[category].find((tier) => tier.id === sizeId)?.label ?? sizeId;
}

/**
 * Price for an item at a given size. Returns undefined (not 0) when either the
 * item or the size does not exist, so callers can reject unknown input instead
 * of treating it as free.
 */
export function getSignaturePrice(id: string, sizeId: string): number | undefined {
  return BY_ID.get(id)?.sizes[sizeId]?.price;
}

/** "The Moment" -> "Moment", for surfaces that never showed the article. */
export function shortName(item: SignatureItem): string {
  return item.name.replace(/^The\s+/i, "");
}

/**
 * Per-size values joined in tier order: "581 / 680" for a bowl, "493" for a
 * smoothie. The Menu TV sync script applies the same rule so both surfaces
 * print identical figures.
 */
export function formatSizeStat(item: SignatureItem, field: "calories" | "protein"): string {
  return SIZE_TIERS[item.category]
    .map((tier) => item.sizes[tier.id]?.[field])
    .filter((value): value is number => typeof value === "number")
    .join(" / ");
}
