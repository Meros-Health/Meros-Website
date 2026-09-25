// Price numbers for copy, derived from lib/menu/menu.json.
//
// Everything else on the site computes its prices (calcBowlPrice for the
// builder and the cart, getSignaturePrice for the ledger). Marketing copy is
// the one place a price gets typed by hand and then quietly goes stale, which
// is how a website ends up advertising a number the till does not charge.
// These helpers derive the sentence instead, so a price change in menu.json
// rewrites it.
import { BUILD_CONFIG } from "./buildConfig";
import { DELIVERY } from "./delivery";
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
 * The menu header's price line: "In-store prices: Bowls, Medium $12, Large
 * $15. Smoothies, 22 oz, $15." Sizes are listed in menu order, cheapest first.
 *
 * "In-store" is load-bearing, not a flourish. These are the store's prices;
 * Uber Eats sells the same bowls for more, because the platform's commission
 * is in its numbers. Until 2026-09-24 the site linked no other channel and an
 * unqualified "Bowls served Medium $12" could only mean one thing. Now that
 * the storefront is one button away, a visitor who reads $12 here and is
 * charged $19.99 there has been misled by this sentence, so the sentence says
 * which channel it is quoting. priceChannelNote() states the difference
 * outright next to the button itself.
 *
 * What it does not do is quote the platform's prices or the size of the gap.
 * Uber Eats sets those and can change them without telling us, and a number we
 * cannot keep current is worse than no number: it is the same staleness this
 * whole module exists to prevent, just pointed at someone else's menu.
 */
export function inStorePriceSummary(): string {
  const sizes = BUILD_CONFIG.sizes.map((size) => `${size.label} ${formatMenuPrice(size.price)}`);
  const bowls = `In-store prices: Bowls, ${sizes.join(", ")}.`;

  const smoothie = smoothiePrice();
  const label = smoothieSizeLabel();
  if (smoothie === undefined || !label) return bowls;
  return `${bowls} Smoothies, ${label}, ${formatMenuPrice(smoothie)}.`;
}

/**
 * The disclaimer that rides with every link to the delivery storefront.
 *
 * Stated plainly and without a figure. The honest thing to disclose is that
 * the two channels are priced differently, which is durably true; "about 25%
 * higher" is true this week and unverifiable next, and a stale percentage is a
 * worse claim than none. The platform is named from menu.json rather than
 * typed here, so the day a second marketplace exists this line cannot quietly
 * keep naming only the first.
 */
export function priceChannelNote(): string {
  return `Prices vary between in-store and ${DELIVERY.platform}.`;
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
