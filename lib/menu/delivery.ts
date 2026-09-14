// The third-party delivery menu, as submitted, from lib/menu/menu.json.
//
// Delivery prices carry the platform's commission and are set apart from the
// store's on purpose. No ordering surface reads them: the builder, the cart,
// checkout and the Menu TV price from build.sizes and signatures[].sizes.
// This block exists so the one page that explains the whole menu
// (/source-menu) can say how the two channels differ without anyone typing
// the platform's numbers into copy.
import menuData from "@/lib/menu/menu.json";

export type Delivery = {
  platform: string;
  prices: { bowl: number; smoothie: number };
  /** Bowl tier ids the platform sells. One size, today. */
  bowlSizes: string[];
  extraToppingPrice: number;
  /** The only ingredients that can be added to a signature on the platform. */
  extras: string[];
  stackPrice: number;
  singleEnhancer: { ingredientId: string; price: number };
  /** Signature ids sold in store but not on the platform. */
  excludes?: string[];
};

export const DELIVERY: Delivery = menuData.delivery as Delivery;

const EXTRAS = new Set(DELIVERY.extras);
const EXCLUDED = new Set(DELIVERY.excludes ?? []);

export function isDeliveryExtra(ingredientId: string): boolean {
  return EXTRAS.has(ingredientId);
}

export function isOnDelivery(signatureId: string): boolean {
  return !EXCLUDED.has(signatureId);
}
