import { expect, test } from "@playwright/test";
import { cartButton, readCart, waitForPageReady } from "./helpers/cart";

test("adds a signature bowl from /order", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);

  await page.getByRole("button", { name: "Add to Cart" }).first().click();

  await expect(cartButton(page)).toHaveAttribute("aria-label", "Cart (1 item)");
  expect(await readCart(page)).toHaveLength(1);
});
