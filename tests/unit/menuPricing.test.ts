// @vitest-environment node
//
// The menu header quotes prices in prose. Every other price on the site is
// computed, so this is the one string a menu.json change could leave stale and
// nothing would notice until a customer read a number the till does not charge.
import { describe, expect, it } from "vitest";
import { BUILD_CONFIG } from "@/lib/menu/buildConfig";
import {
  categoryPriceLine,
  formatMenuPrice,
  inStorePriceSummary,
  priceChannelNote,
  smoothiePrice,
  startingBowlPrice,
} from "@/lib/menu/pricing";
import { DELIVERY } from "@/lib/menu/delivery";
import { getSizeTiers, listBowls, listSmoothies } from "@/lib/menu/signatures";

describe("prices in copy come from menu.json", () => {
  it("starts a bowl at the cheapest build size", () => {
    expect(startingBowlPrice()).toBe(Math.min(...BUILD_CONFIG.sizes.map((s) => s.price)));
  });

  it("names every build size and its price", () => {
    const summary = inStorePriceSummary();
    for (const size of BUILD_CONFIG.sizes) {
      expect(summary, `missing ${size.label}`).toContain(size.label);
      expect(summary, `missing ${size.label} price`).toContain(formatMenuPrice(size.price));
    }
  });

  it("quotes the smoothie price only while the smoothies agree on one", () => {
    const prices = new Set(
      listSmoothies().flatMap((item) => Object.values(item.sizes).map((s) => s.price))
    );
    const summary = inStorePriceSummary();
    if (prices.size === 1) {
      expect(smoothiePrice()).toBe([...prices][0]);
      expect(summary).toContain("Smoothies");
      expect(summary).toContain(formatMenuPrice([...prices][0]));
    } else {
      // Two smoothie prices need a sentence a human writes, not a guess.
      expect(smoothiePrice()).toBeUndefined();
      expect(summary).not.toContain("Smoothies");
    }
  });

  it("writes a whole-dollar menu price without cents", () => {
    expect(formatMenuPrice(12)).toBe("$12");
    expect(formatMenuPrice(12.5)).toBe("$12.50");
  });
});

// Since 2026-09-24 the site links the Uber Eats storefront from the home page,
// /menu and the footer, and the platform sells the same bowl for more. Every
// price the site prints is the store's, so the two claims below are what keep
// the page from quoting one channel's numbers beside another channel's button.
// They are here rather than left to review because the failure is not a broken
// page: it is a page that still renders perfectly while misleading a customer.
describe("the price line says which channel it is quoting", () => {
  it("names the in-store channel", () => {
    expect(inStorePriceSummary()).toContain("In-store");
  });

  it("says the channels are priced differently, and names the platform", () => {
    const note = priceChannelNote();
    expect(note).toContain("in-store");
    expect(note).toContain(DELIVERY.platform);
  });

  it("quotes no delivery price and no size of the gap", () => {
    // A figure we do not control goes stale silently. The platform's own
    // prices live in menu.json for /source-menu to explain; no customer-facing
    // line may repeat them, and no line may claim a percentage.
    const copy = `${inStorePriceSummary()} ${priceChannelNote()}`;
    expect(copy).not.toContain(formatMenuPrice(DELIVERY.prices.bowl));
    expect(copy).not.toContain(formatMenuPrice(DELIVERY.prices.smoothie));
    expect(copy).not.toMatch(/%|percent/i);
  });
});

describe("the price under a section heading", () => {
  // /menu prints the price once per category instead of once per item. That is
  // only honest while the category actually shares one price, so this is the
  // tripwire: the day a bowl is priced differently, categoryPriceLine goes
  // undefined and these fail, which is the signal to put the price back on the
  // panels rather than let the heading quote a number half the menu ignores.
  it.each([
    ["bowl", listBowls()],
    ["smoothie", listSmoothies()],
  ] as const)("holds for every %s on the menu", (category, items) => {
    const line = categoryPriceLine(category);
    expect(line, `${category} prices no longer agree`).toBeDefined();

    for (const tier of getSizeTiers(category)) {
      const prices = new Set(items.map((item) => item.sizes[tier.id]?.price));
      expect(prices.size, `${category} ${tier.id} has ${prices.size} prices`).toBe(1);
      const [price] = [...prices];
      expect(line).toContain(formatMenuPrice(price!));
    }
  });

  it.each(["bowl", "smoothie"] as const)("names every %s size beside its price", (category) => {
    // Numbers alone cannot say which one buys which bowl, and on the
    // single-size smoothies the label is the only place the page states the
    // size at all.
    const line = categoryPriceLine(category)!;
    for (const tier of getSizeTiers(category)) {
      expect(line, `${category} line omits "${tier.label}"`).toContain(tier.label);
    }
  });
});
