// WP5: nav overlay and scroll lock state. Case ids refer to
// docs/qa/ordering-stress-test-2026-08-26.md.
import { expect, test, type Page } from "@playwright/test";
import { cartButton, seedCart, waitForPageReady } from "./helpers/cart";
import { plainBowl } from "./helpers/fixtures";

const menuToggle = (page: Page) => page.getByRole("button", { name: /Open menu|Close menu/ });
const bodyOverflow = (page: Page) => page.evaluate(() => document.body.style.overflow);
const overlayLinks = (page: Page) => page.locator(".nav-overlay-link:visible");

test("G7: resizing from mobile to desktop with the menu open leaves no overlay behind", async ({ page }) => {
  await page.setViewportSize({ width: 500, height: 800 });
  await page.goto("/order");
  await waitForPageReady(page);

  await menuToggle(page).click();
  await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "true");

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(1200);

  await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(overlayLinks(page)).toHaveCount(0);
  expect(await bodyOverflow(page)).toBe("");

  // The toggle still works normally afterwards.
  await menuToggle(page).click();
  await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "true");
  await expect(overlayLinks(page).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "false");
  await page.waitForTimeout(1000);
  await expect(overlayLinks(page)).toHaveCount(0);
});

test("G7: resizing from desktop to mobile with the menu open closes it cleanly", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);

  await menuToggle(page).click();
  await expect(overlayLinks(page).first()).toBeVisible();

  await page.setViewportSize({ width: 500, height: 800 });
  await page.waitForTimeout(1200);

  await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(overlayLinks(page)).toHaveCount(0);
  expect(await bodyOverflow(page)).toBe("");
});

test("D4: the scroll lock is released after the menu and the drawer close together", async ({ page }) => {
  await seedCart(page, [plainBowl("x")]);
  await page.goto("/cart/edit/x");
  await waitForPageReady(page);

  await menuToggle(page).click();
  await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "true");
  // Save's confirmation beat opens the drawer directly, not through the
  // navbar path that closes the menu first.
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toBeVisible();
  expect(await bodyOverflow(page)).toBe("hidden");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);

  await expect(page.getByRole("dialog", { name: "Cart" })).toBeHidden();
  await expect(menuToggle(page)).toHaveAttribute("aria-expanded", "false");
  expect(await bodyOverflow(page)).toBe("");
  await expect(cartButton(page)).toBeVisible();
});

test("Escape returns focus to the menu toggle on desktop and mobile", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);
  await menuToggle(page).click();
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape");
  await expect(menuToggle(page)).toBeFocused();

  await page.setViewportSize({ width: 500, height: 800 });
  await page.waitForTimeout(500);
  await menuToggle(page).click();
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  await expect(menuToggle(page)).toBeFocused();
});

test("G8: an unknown route shows the site's own not-found page", async ({ page }) => {
  await page.goto("/cart/edit");
  await waitForPageReady(page);
  await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Our Menu" })).toBeVisible();
});
