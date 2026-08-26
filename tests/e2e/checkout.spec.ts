// WP1: the checkout page under failure. Case ids refer to
// docs/qa/ordering-stress-test-2026-08-26.md.
import { expect, test, type Page } from "@playwright/test";
import { readCart, seedCart, waitForPageReady } from "./helpers/cart";

const NUTRITION = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, calcium: 0, iron: 0, potassium: 0 };

function moment(lineId: string, quantity = 1) {
  return {
    lineId,
    kind: "signature",
    productId: "moment",
    name: "The Moment · Medium",
    size: { id: "medium", label: "Medium" },
    nutrition: NUTRITION,
    quantity,
    unitPrice: 12,
  };
}

async function fillCustomer(page: Page) {
  await page.getByLabel("Name").fill("Test Customer");
  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Phone").fill("604-123-4567");
}

const placeOrder = (page: Page) => page.getByRole("button", { name: /Place Order|Placing Order/ });

test("F1: an empty cart redirects /checkout to /order", async ({ page }) => {
  await page.goto("/checkout");
  await page.waitForURL("**/order");
});

test("F1b: a successful order clears the cart and the confirmation survives reload", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await page.goto("/checkout");
  await waitForPageReady(page);
  await fillCustomer(page);
  await placeOrder(page).click();

  await expect(page.getByText("Order Received", { exact: true })).toBeVisible();
  expect(await readCart(page)).toHaveLength(0);

  await page.reload();
  await waitForPageReady(page);
  await expect(page.getByText("Order Received", { exact: true })).toBeVisible();
});

test("F2: a double click sends one request and shows one confirmation", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await page.goto("/checkout");
  await waitForPageReady(page);
  await fillCustomer(page);

  let actionPosts = 0;
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().includes("/checkout")) actionPosts += 1;
  });

  // Two clicks in one tick, before React can re-render the disabled state.
  await placeOrder(page).evaluate((el) => {
    (el as HTMLButtonElement).click();
    (el as HTMLButtonElement).click();
  });

  await expect(page.getByText("Order Received", { exact: true })).toBeVisible();
  expect(actionPosts).toBe(1);
});

test("F4: a failed action call re-enables the button with a message", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await page.goto("/checkout");
  await waitForPageReady(page);
  await fillCustomer(page);

  // Stand-in for a POS or payment call that throws: the action request fails.
  await page.route("**/checkout", (route) => {
    if (route.request().method() === "POST") return route.abort("failed");
    return route.continue();
  });

  await placeOrder(page).click();

  await expect(page.getByText("Something went wrong. Please try again.")).toBeVisible();
  await expect(placeOrder(page)).toBeEnabled();
  await expect(placeOrder(page)).toHaveText("Place Order");
  expect(await readCart(page)).toHaveLength(1);
});

test("F5ui: a rejected line is marked and the cart can be edited", async ({ page }) => {
  await seedCart(page, [moment("good"), moment("bad", 500)]);
  await page.goto("/checkout");
  await waitForPageReady(page);
  await fillCustomer(page);
  await placeOrder(page).click();

  const marked = page.locator("[data-line-error]");
  await expect(marked).toHaveCount(1);
  await expect(marked).toHaveAttribute("data-line-id", "bad");
  await expect(marked.getByRole("alert")).toContainText("99");
  await expect(page.locator("[data-line-id='good'][data-line-error]")).toHaveCount(0);

  await page.getByRole("button", { name: "Edit cart" }).click();
  await expect(page.getByRole("dialog", { name: "Cart" })).toBeVisible();
});
