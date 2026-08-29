// Cross-device sweep. Runs on every project in playwright.config.ts, so the
// same assertions cover desktop Chrome, desktop Safari, iPad, iPhone and
// Pixel. The ordering flow specs stay on desktop Chrome only.
//
// These check the two things that break per-device and that unit tests and a
// single-viewport suite cannot see: layout that overflows the viewport
// sideways, and controls too small to hit with a thumb.
import { expect, test, type Page } from "@playwright/test";
import { waitForPageReady } from "./helpers/cart";

const ROUTES = ["/", "/build", "/order", "/checkout", "/privacy", "/terms"] as const;

/**
 * Anything wider than the viewport, reported with enough detail to fix it.
 * Reads the document's own scroll width rather than looking for a scrollbar,
 * because mobile Safari hides the scrollbar and still scrolls.
 */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const limit = doc.clientWidth;
    // 1px of slack: sub-pixel rounding at fractional device pixel ratios.
    if (doc.scrollWidth <= limit + 1) return null;

    const offenders: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= limit + 1 && rect.left >= -1) continue;
      // Only report the outermost offender in any chain.
      if (offenders.some((sel) => el.closest(sel))) continue;
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className && typeof el.className === "string"
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}`
        : "";
      offenders.push(`${el.tagName.toLowerCase()}${id}${cls} [${Math.round(rect.left)}..${Math.round(rect.right)}]`);
      if (offenders.length >= 5) break;
    }
    return { scrollWidth: doc.scrollWidth, clientWidth: limit, offenders };
  });
}

for (const route of ROUTES) {
  test(`${route} does not scroll sideways`, async ({ page }) => {
    await page.goto(route);
    await waitForPageReady(page);

    const overflow = await horizontalOverflow(page);
    expect(
      overflow,
      overflow
        ? `${route} is ${overflow.scrollWidth - overflow.clientWidth}px wider than the viewport. ` +
          `Widest elements: ${overflow.offenders.join("; ")}`
        : "",
    ).toBeNull();
  });
}

// The Signature Menu ledger gates its entrance on its images decoding. Above
// lg its row thumbnails are display:none and, at device pixel ratio 2, Chrome
// never starts their lazy load, so decode() on them never settles. That once
// held the whole ledger invisible until useRevealReady's safety valve fired.
// The 2.5s bound sits under that valve, so passing means the gate resolved on
// its own, not that the valve rescued it. The hidpi project is the one that
// reproduced the bug; the other projects keep the non-retina paths honest.
test("the signature menu ledger reveals when it enters view", async ({ page }) => {
  await page.goto("/");
  await waitForPageReady(page);

  const firstRow = page.locator("#menu section ul li").first();
  await expect(firstRow).toHaveCount(1);

  // Land the first group 150px under the top edge: clear of the fixed nav and
  // inside the hook's -100px root margin on even the shortest window.
  await firstRow.evaluate((li) => {
    const group = li.closest("ul")!.parentElement!;
    window.scrollTo(0, group.getBoundingClientRect().top + window.scrollY - 150);
  });

  await expect
    .poll(() => firstRow.evaluate((el) => parseFloat(getComputedStyle(el).opacity)), {
      message: "the first menu row never reached full opacity after entering view",
      timeout: 2500,
    })
    .toBe(1);
});

test("primary calls to action are large enough to tap", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, "tap targets only matter on touch devices");

  await page.goto("/order");
  await waitForPageReady(page);

  // 44px is the floor both Apple's HIG and WCAG 2.2 target size (AAA) land on.
  const MIN = 44;
  const buttons = page.getByRole("button", { name: "Add to Cart" });
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < Math.min(count, 3); i += 1) {
    const box = await buttons.nth(i).boundingBox();
    expect(box, `Add to Cart #${i} has no layout box`).not.toBeNull();
    expect(box!.height, `Add to Cart #${i} is ${Math.round(box!.height)}px tall`).toBeGreaterThanOrEqual(MIN);
  }

  // S1-14: the add dialog's controls, then the drawer's, then the ledger "+".
  const atLeast = async (locator: ReturnType<Page["locator"]>, min: number, label: string) => {
    const boxes = await locator.evaluateAll((els) => els.filter((el) => (el as HTMLElement).offsetParent !== null).map((el) => el.getBoundingClientRect()));
    expect(boxes.length, `${label}: nothing visible`).toBeGreaterThan(0);
    for (const b of boxes) {
      expect(Math.round(b.height), `${label} is ${Math.round(b.height)}px tall`).toBeGreaterThanOrEqual(min);
      expect(Math.round(b.width), `${label} is ${Math.round(b.width)}px wide`).toBeGreaterThanOrEqual(Math.min(min, 40));
    }
  };
  await buttons.first().click();
  const modal = page.getByRole("dialog", { name: "The Moment" });
  await expect(modal).toBeVisible();
  await atLeast(modal.getByRole("group", { name: "Size" }).getByRole("button"), MIN, "size toggle");
  await atLeast(modal.getByRole("group", { name: "Yogurt" }).getByRole("button"), MIN, "yogurt toggle");
  await atLeast(modal.locator("section[role='group'] button"), 40, "chip");
  await atLeast(modal.getByRole("button", { name: "Add to cart" }), MIN, "Add to cart");
  await atLeast(modal.getByRole("button", { name: "Cancel" }), MIN, "Cancel");
  await atLeast(modal.getByRole("button", { name: "Close" }), MIN, "Close");
  await modal.getByRole("group", { name: "Size" }).getByRole("button", { name: "Medium" }).click();
  await modal.getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Plain" }).click();
  await modal.getByRole("button", { name: "Add to cart" }).click();
  await expect(modal).toBeHidden();

  await page.getByRole("button", { name: /^Cart \(/ }).click();
  const drawer = page.getByRole("dialog", { name: "Cart" });
  await expect(drawer).toBeVisible();
  await atLeast(drawer.getByRole("button", { name: /quantity/ }), MIN, "quantity stepper");
  await atLeast(drawer.getByRole("button", { name: /^Edit/ }), MIN, "Edit");
  await atLeast(drawer.getByRole("button", { name: "Remove" }), MIN, "Remove");
  await atLeast(drawer.getByRole("button", { name: "Close cart" }), MIN, "Close cart");
  await atLeast(drawer.getByRole("button", { name: "Checkout" }), MIN, "Checkout");
  await page.keyboard.press("Escape");

  await page.goto("/");
  await waitForPageReady(page);
  const plus = page.getByRole("button", { name: "Add The Moment to cart" });
  await plus.first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await atLeast(plus, MIN, "ledger +");
});

test("the nav menu opens, and closing it hands the page back", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);

  const toggle = page.getByRole("button", { name: /Open menu|Close menu/ });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".nav-overlay-link:visible").first()).toBeVisible();

  // Close before the open animation settles. Framer retargets mid-flight, and
  // the closed panel's `transitionEnd` visibility never lands on an
  // interrupted close, so `:visible` still matches the links afterwards. What
  // has to be true is not that they stop matching a CSS pseudo-class, but that
  // the closed panel is out of the accessibility tree, out of the tab order,
  // and out of the way of a tap.
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(1000);

  const panel = page.locator("#mobile-menu, #nav-overlay").first();
  if (await panel.count()) {
    await expect(panel).toHaveAttribute("aria-hidden", "true");
  }
  const focusable = await page.locator(".nav-overlay-link[tabindex='0']").count();
  expect(focusable, "closed menu links must not be focusable").toBe(0);

  // The decisive check: a tap where the panel sits must reach the page under it.
  const intercepted = await page.evaluate(() => {
    const el = document.getElementById("mobile-menu");
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  });
  expect(intercepted, "closed menu must not swallow taps").toBe(false);

  // A stuck scroll lock is the other failure this guards: the page must scroll.
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});
