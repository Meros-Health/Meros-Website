// WP2: the edit flow and the footers' timers. Case ids refer to
// docs/qa/ordering-stress-test-2026-08-26.md.
import { expect, test, type Page } from "@playwright/test";
import { cartButton, readCart, seedCart, seedRawCart, waitForPageReady } from "./helpers/cart";

const NUTRITION = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, calcium: 0, iron: 0, potassium: 0 };

function plainBowl(lineId: string) {
  return {
    lineId,
    kind: "custom",
    productId: "custom-bowl",
    name: "Custom Bowl · Plain Greek Yogurt · Medium",
    selection: { sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } },
    size: { id: "medium", label: "Medium" },
    nutrition: NUTRITION,
    quantity: 1,
    unitPrice: 12,
  };
}

const drawer = (page: Page) => page.getByRole("dialog", { name: "Cart" });

test("A1: removing the line being edited shows a notice, and Add to Cart restores it", async ({ page }) => {
  await seedCart(page, [plainBowl("edit-me")]);
  await page.goto("/cart/edit/edit-me");
  await waitForPageReady(page);
  await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();

  await cartButton(page).click();
  await drawer(page).getByRole("button", { name: "Remove" }).click();
  await drawer(page).getByRole("button", { name: "Close cart" }).click();
  await expect(drawer(page)).toBeHidden();

  const notice = page.locator("[data-edit-line-removed]");
  await expect(notice).toContainText("This bowl was removed from your cart.");
  await expect(page.getByRole("button", { name: "Save Changes" })).toHaveCount(0);

  await notice.getByRole("button", { name: "Add to Cart" }).click();
  await expect(notice.getByRole("button", { name: "Added" })).toBeVisible();
  await page.waitForURL("**/order");
  await expect(drawer(page)).toBeVisible();
  expect(await readCart(page)).toHaveLength(1);
});

test("A1 control: saving a live line reports Saved and lands on /order with the drawer open", async ({ page }) => {
  await seedCart(page, [plainBowl("edit-me")]);
  await page.goto("/cart/edit/edit-me");
  await waitForPageReady(page);
  await page.getByRole("button", { name: "Large" }).click();
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await page.waitForURL("**/order");
  await expect(drawer(page)).toBeVisible();
  const cart = (await readCart(page)) as Array<{ unitPrice: number }>;
  expect(cart[0].unitPrice).toBe(15);
});

test("A3: an edit URL for a missing line lands on /order with a rendered page", async ({ page }) => {
  await seedCart(page, [plainBowl("other")]);
  await page.goto("/cart/edit/does-not-exist");
  await page.waitForURL("**/order");
  await waitForPageReady(page);
  await expect(page.locator("main")).toBeVisible();
});

test("A7: navigating within the Saved beat lands on the clicked route without the drawer", async ({ page }) => {
  await seedCart(page, [plainBowl("edit-me")]);
  await page.goto("/cart/edit/edit-me");
  await waitForPageReady(page);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await page.getByRole("button", { name: "Build your bowl" }).click();
  await page.waitForURL("**/build");
  await page.waitForTimeout(1500);
  expect(page.url()).toContain("/build");
  await expect(drawer(page)).toBeHidden();
});

test("B1: navigating within the Added beat on /build lands on the clicked route without the drawer", async ({ page }) => {
  await page.goto("/build");
  await waitForPageReady(page);
  await page.getByRole("button", { name: /Plain Greek Yogurt/ }).first().click();
  await page.getByRole("button", { name: "Add to Cart" }).click();
  await page.getByRole("button", { name: "Our Menu" }).click();
  await page.waitForURL("**/order");
  await page.waitForTimeout(1500);
  await expect(drawer(page)).toBeHidden();
  expect(await readCart(page)).toHaveLength(1);
});

test("E1: corrupted storage does not hang the edit page", async ({ page }) => {
  await seedRawCart(page, "{{{");
  await page.goto("/cart/edit/anything");
  await page.waitForURL("**/order", { timeout: 4000 });
  await waitForPageReady(page);
  await expect(cartButton(page)).toHaveAttribute("aria-label", "Cart (0 items)");
});
