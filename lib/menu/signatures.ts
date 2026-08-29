// Typed accessor over the signature menu in lib/menu/menu.json. The in-store
// Menu TV renders from the same file (see ../menu-tv/sync-menu.sh), so any
// menu change is made in menu.json only.
import menuData from "@/lib/menu/menu.json";
import { ingredientName } from "./ingredients";

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
  /** Ingredient ids from the registry, in printed order. Toppings only, never a base. */
  recipe: string[];
  /** Derived from `recipe`: canonical ingredient names, comma separated. */
  ingredients: string;
  /**
   * The yogurt this item departs from its category default with, as a Base
   * step ingredient id. Absent on every item today; lib/menu/signatureBase.ts
   * resolves the default.
   */
  base?: string;
  /** Keyed by size id; bowls carry two sizes, smoothies one. */
  sizes: Record<string, SignatureSizeInfo>;
  /**
   * Absent on an item that ships without photography (The Seasonal, whose
   * fruit changes with the season). Every surface then renders a typographic
   * tile (components/ui/SignatureTile.tsx) in the picture's place.
   */
  images?: { photo: string; transparent: string };
  /**
   * What is in the case right now. SignatureTile prints it as
   * "Featuring {seasonNote}", so write it as a lowercase phrase. Only
   * meaningful on an item without `images`; edit it in menu.json when the
   * fruit rotates.
   */
  seasonNote?: string;
};

type RawItem = Omit<SignatureItem, "category" | "ingredients">;

const SIZE_TIERS: Record<SignatureCategory, SizeTier[]> = menuData.sizeTiers;

function fromRaw(category: SignatureCategory) {
  return (item: RawItem): SignatureItem => ({
    ...item,
    category,
    ingredients: item.recipe.map(ingredientName).join(", "),
  });
}

const BOWLS: SignatureItem[] = (menuData.signatures.bowls as RawItem[]).map(fromRaw("bowl"));
const SMOOTHIES: SignatureItem[] = (menuData.signatures.smoothies as RawItem[]).map(fromRaw("smoothie"));

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
