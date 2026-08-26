// WP3: two tabs, one origin. Case ids refer to
// docs/qa/ordering-stress-test-2026-08-26.md.
import { expect, test, type Page } from "@playwright/test";
import { cartButton, readCart, seedCart, waitForPageReady } from "./helpers/cart";

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

test("A11: a bowl removed in tab B is not resurrected by a save in tab A", async ({ context }) => {
  const a = await context.newPage();
  await seedCart(a, [plainBowl("x")]);
  await a.goto("/cart/edit/x");
  await waitForPageReady(a);
  await expect(a.getByRole("button", { name: "Save Changes" })).toBeVisible();

  const b = await context.newPage();
  await b.goto("/order");
  await waitForPageReady(b);
  await cartButton(b).click();
  await drawer(b).getByRole("button", { name: "Remove" }).click();
  expect(await readCart(b)).toHaveLength(0);

  await expect(a.locator("[data-edit-line-removed]")).toBeVisible();
  await expect(a.getByRole("button", { name: "Save Changes" })).toHaveCount(0);
  expect(await readCart(a)).toHaveLength(0);
});

test("E8: a bowl added in tab A survives a quantity change in stale tab B", async ({ context }) => {
  const a = await context.newPage();
  await seedCart(a, [plainBowl("x")]);
  await a.goto("/order");
  await waitForPageReady(a);

  const b = await context.newPage();
  await b.goto("/order");
  await waitForPageReady(b);
  await cartButton(b).click();
  await expect(drawer(b)).toBeVisible();

  await a.getByRole("button", { name: "Add to Cart" }).first().click();
  await expect(cartButton(a)).toHaveAttribute("aria-label", "Cart (2 items)");

  await expect(cartButton(b)).toHaveAttribute("aria-label", "Cart (2 items)");
  await drawer(b).getByRole("button", { name: "Increase quantity" }).first().click();

  const cart = (await readCart(b)) as Array<{ lineId: string; quantity: number }>;
  expect(cart).toHaveLength(2);
  expect(cart.find((l) => l.lineId === "x")?.quantity).toBe(2);
  await expect(cartButton(a)).toHaveAttribute("aria-label", "Cart (3 items)");
});
