// What a "+" on a signature does, shared by the homepage ledger rows and the
// /order cards so the two surfaces never disagree with each other or with
// the store counter.
//
// An item that has a choice to make (more than one size, or no default
// yogurt) is configured in the add modal (components/cart/SignatureModal)
// before it is in the cart: every bowl today. An item with nothing to choose
// (one size, a default yogurt: every smoothie) adds in one press.
import { EMPTY_NUTRITION } from "./nutrition";
import { getDefaultBaseId } from "./signatureBase";
import { calcSignaturePrice } from "./signatureMods";
import { getDefaultSizeId, getSizeLabel, getSizeTiers, type SignatureItem } from "./signatures";
import type { AddResult, CartItem } from "@/store/cartStore";

export function needsConfiguration(item: SignatureItem): boolean {
  return getSizeTiers(item.category).length > 1 || getDefaultBaseId(item) === undefined;
}

/**
 * Adds an item that needs no configuration at its only size with its default
 * yogurt. "invalid" when the menu changed under a mounted surface and there is
 * nothing priceable to add (rather than a $0.00 line the server would reject).
 */
export function addSignatureDirect(
  item: SignatureItem,
  addItem: (line: Omit<CartItem, "lineId">) => AddResult
): AddResult {
  const sizeId = getDefaultSizeId(item.category);
  const baseId = getDefaultBaseId(item);
  const unitPrice = calcSignaturePrice(item.id, sizeId, undefined, baseId);
  if (baseId === undefined || unitPrice === undefined) return "invalid";
  return addItem({
    kind: "signature",
    productId: item.id,
    name: item.name,
    size: { id: sizeId, label: getSizeLabel(item.category, sizeId) },
    base: baseId,
    nutrition: { ...EMPTY_NUTRITION },
    quantity: 1,
    unitPrice,
  });
}

/**
 * The price a menu surface shows before anything is chosen: the lowest size
 * with the default yogurt (none for a bowl). `from` is true when there is
 * more than one size, so the surface can say "From $12.00". Undefined when
 * no size prices.
 */
export function startingPrice(item: SignatureItem): { price: number; from: boolean } | undefined {
  const tiers = getSizeTiers(item.category);
  const baseId = getDefaultBaseId(item);
  const prices = tiers
    .map((tier) => calcSignaturePrice(item.id, tier.id, undefined, baseId))
    .filter((price): price is number => price !== undefined);
  if (prices.length === 0) return undefined;
  return { price: Math.min(...prices), from: tiers.length > 1 };
}
