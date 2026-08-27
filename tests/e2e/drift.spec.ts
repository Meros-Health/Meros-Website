// WP4: a persisted cart that no longer matches the menu is repaired and the
// drawer says what changed, once.
import { expect, test } from "@playwright/test";
import { cartButton, readCart, seedCart, waitForPageReady } from "./helpers/cart";
import { NUTRITION } from "./helpers/fixtures";

// A bowl persisted before "nope" left the menu, at a price the menu no longer charges.
const staleBowl = {
  lineId: "stale",
  kind: "custom",
  productId: "custom-bowl",
  name: "Custom Bowl · Plain Greek Yogurt · Medium",
  selection: { sizeId: "medium", steps: { base: ["plain-greek-yogurt"], fruits: ["nope", "blueberries"] } },
  size: { id: "medium", label: "Medium" },
  nutrition: NUTRITION,
  quantity: 1,
  unitPrice: 10,
};

test("H1 / H2: a stale cart is repaired and the drawer explains the change once", async ({ page }) => {
  await seedCart(page, [staleBowl]);
  await page.goto("/order");
  await waitForPageReady(page);

  await cartButton(page).click();
  const notice = page.locator("[data-cart-notice]");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Your cart was updated to match the current menu.");
  await expect(notice).toContainText("Nope is no longer available and was removed from Custom Bowl · Plain Greek Yogurt · Medium.");
  await expect(notice).toContainText("is now $12.00, was $10.00.");

  const cart = (await readCart(page)) as Array<{ unitPrice: number; selection: { steps: Record<string, string[]> } }>;
  expect(cart[0].unitPrice).toBe(12);
  expect(cart[0].selection.steps.fruits).toEqual(["blueberries"]);

  await notice.getByRole("button", { name: "Dismiss" }).click();
  await expect(notice).toHaveCount(0);

  await page.reload();
  await waitForPageReady(page);
  await cartButton(page).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toBeVisible();
  await expect(page.locator("[data-cart-notice]")).toHaveCount(0);
});
