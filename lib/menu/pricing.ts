// Price numbers for copy, derived from lib/menu/menu.json.
//
// Everything else on the site computes its prices (calcBowlPrice for the
// builder and the cart, getSignaturePrice for the ledger). Marketing copy is
// the one place a price gets typed by hand and then quietly goes stale, which
// is how a website ends up advertising a number the till does not charge.
// These helpers derive the sentence instead, so a price change in menu.json
// rewrites it.
import { BUILD_CONFIG } from "./buildConfig";
import { listBowls, listSmoothies, getSizeTiers, type SignatureCategory } from "./signatures";

/**
 * Prices in prose, not in a total. A whole-dollar menu price reads as "$12" on
 * a board and in a sentence; formatPrice's "$12.00" belongs on a receipt.
 */
export function formatMenuPrice(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** Cheapest build size. What a bowl starts at, for "Bowls from $12". */
export function startingBowlPrice(): number {
  const prices = BUILD_CONFIG.sizes.map((size) => size.price);
  return Math.min(...prices);
}

/**
 * The one smoothie price, or undefined if the signature smoothies stop
 * agreeing on it. Callers drop the smoothie clause rather than pick a winner:
 * a menu with two smoothie prices needs a sentence a human writes.
 */
export function smoothiePrice(): number | undefined {
  const prices = new Set(
    listSmoothies().flatMap((item) => Object.values(item.sizes).map((size) => size.price))
  );
  return prices.size === 1 ? [...prices][0] : undefined;
}

/** Smoothie size label as the board prints it ("22 oz"). */
export function smoothieSizeLabel(): string | undefined {
  return getSizeTiers("smoothie")[0]?.label;
}

/**
 * The menu header's price line: "Bowls served Medium $12 or Large $15.
 * Smoothies 22 oz, $15." Sizes are listed in menu order, cheapest first.
 */
export function bowlPriceSummary(): string {
  const sizes = BUILD_CONFIG.sizes.map((size) => `${size.label} ${formatMenuPrice(size.price)}`);
  const bowls = `Bowls served ${sizes.slice(0, -1).join(", ")} or ${sizes[sizes.length - 1]}.`;

  const smoothie = smoothiePrice();
  const label = smoothieSizeLabel();
  if (smoothie === undefined || !label) return bowls;
  return `${bowls} Smoothies ${label}, ${formatMenuPrice(smoothie)}.`;
}

/**
 * One price line for a whole category, for the heading above the gallery wall.
 *
 * Every bowl on the menu costs the same and every smoothie costs the same, so
 * printing a price on each of ten panels says the same two numbers ten times.
 * Stating it once under the section heading is the same information with none
 * of the repetition.
 *
 * Returns undefined the moment the category stops agreeing on its prices. That
 * is not a fallback so much as a tripwire: an item priced differently from its
 * neighbours cannot be described by a heading, and the caller has to put the
 * price back on the panels. tests/unit/menuPricing.test.ts fails on it too, so
 * it cannot ship silently.
 */
export function categoryPriceLine(category: SignatureCategory): string | undefined {
  const items = category === "bowl" ? listBowls() : listSmoothies();
  if (items.length === 0) return undefined;

  const tiers = getSizeTiers(category);
  const parts: string[] = [];

  for (const tier of tiers) {
    const prices = new Set(items.map((item) => item.sizes[tier.id]?.price));
    if (prices.size !== 1) return undefined;
    const [price] = [...prices];
    if (price === undefined) return undefined;
    // Always labelled. With two sizes the label is what tells the reader which
    // number buys which bowl; with one it is the only place the page says how
    // big a smoothie is ("22 oz").
    parts.push(`${tier.label} ${formatMenuPrice(price)}`);
  }

  return parts.join(" / ");
}
