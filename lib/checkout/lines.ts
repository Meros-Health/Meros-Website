import type { BowlSelection } from "@/lib/menu/calcBowlPrice";
import type { SignatureMods } from "@/lib/menu/signatureMods";
import type { CartItem } from "@/store/cartStore";

/**
 * What the checkout page sends per cart line: ids, quantity, and the price
 * the customer saw. The action never prices from `unitPrice`; it recomputes
 * from the menu and rejects the line when the two disagree, so a stale
 * client cannot be charged a price it did not show.
 */
export type CheckoutLine = {
  lineId: string;
  kind: "signature" | "custom";
  productId: string;
  size?: { id: string };
  selection?: BowlSelection;
  /** Signature lines only: the chosen yogurt, as a Base step ingredient id. */
  base?: string;
  /** Signature lines only: additions and removals, as ingredient ids. */
  mods?: SignatureMods;
  quantity: number;
  unitPrice: number;
};

export function toCheckoutLines(items: CartItem[]): CheckoutLine[] {
  return items.map((item) => ({
    lineId: item.lineId,
    kind: item.kind,
    productId: item.productId,
    size: item.size ? { id: item.size.id } : undefined,
    selection: item.selection,
    base: item.base,
    mods: item.mods,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}

/**
 * Signature lines with no yogurt chosen (saved before the yogurt became a
 * choice, or whose yogurt left the menu). The server refuses them with the
 * `base` code; the drawer and the checkout page say so before that.
 */
export function linesMissingBase(items: CartItem[]): CartItem[] {
  return items.filter((item) => item.kind === "signature" && !item.base);
}
