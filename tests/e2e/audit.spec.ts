// Remediation of docs/qa/ordering-audit-2026-08-28.md. Case ids refer to that
// report. Runs on desktop Chrome with the checkout flag on (playwright.config).
import { expect, test, type Page } from "@playwright/test";
import { cartButton, readCart, seedCart, waitForPageReady } from "./helpers/cart";
import { moment } from "./helpers/fixtures";

const modal = (page: Page, name: string) => page.getByRole("dialog", { name });
const drawer = (page: Page) => page.getByRole("dialog", { name: "Cart" });
const bowlCard = (page: Page) => page.locator("#bowls article").first();

async function chooseMediumPlain(page: Page, name = "The Moment") {
  const m = modal(page, name);
  await m.getByRole("group", { name: "Size" }).getByRole("button", { name: "Medium" }).click();
  await m.getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Plain" }).click();
  return m;
}

test("S1-07: a double-tap on a bowl's Add to Cart leaves the add dialog open", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);
  await bowlCard(page).getByRole("button", { name: "Add to Cart" }).dblclick();
  await page.waitForTimeout(800);
  await expect(modal(page, "The Moment")).toBeVisible();
  // A real dismissal still works once the dialog has settled.
  await page.mouse.click(10, 10);
  await expect(modal(page, "The Moment")).toBeHidden();
});

test("S1-06: adding at the 99 cap keeps the dialog open and says why", async ({ page }) => {
  await seedCart(page, [moment("full", 99)]);
  await page.goto("/order");
  await waitForPageReady(page);
  await bowlCard(page).getByRole("button", { name: "Add to Cart" }).click();
  const m = await chooseMediumPlain(page);
  await m.getByRole("button", { name: "Add to cart" }).click();
  await expect(m).toBeVisible();
  await expect(m.locator("[data-modal-notice]")).toContainText("maximum of 99");
  expect((await readCart(page)).length).toBe(1);
  // Changing the draft clears the line; a different yogurt then adds.
  await m.getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Vanilla" }).click();
  await expect(m.locator("[data-modal-notice]")).toHaveCount(0);
  await m.getByRole("button", { name: "Add to cart" }).click();
  await expect(m).toBeHidden();
  expect((await readCart(page)).length).toBe(2);
});

test("S1-20: after a keyboard add through the dialog, focus returns to the card's button", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);
  const opener = bowlCard(page).locator("button").first();
  await opener.focus();
  await page.keyboard.press("Enter");
  const m = await chooseMediumPlain(page);
  await m.getByRole("button", { name: "Add to cart" }).focus();
  await page.keyboard.press("Enter");
  await expect(m).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute("aria-disabled", "true");
  await expect(opener).toHaveText("Add to Cart", { timeout: 3000 });
});

test("C3-11: the cart drawer traps Tab and returns focus to the cart button on close", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await page.goto("/order");
  await waitForPageReady(page);
  await cartButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(drawer(page).getByRole("button", { name: "Close cart" })).toBeFocused({ timeout: 2000 });
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => !!document.activeElement?.closest("[role='dialog'][aria-label='Cart']"));
    expect(inside, `Tab ${i + 1} left the drawer`).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(cartButton(page)).toBeFocused();

  await cartButton(page).click();
  await drawer(page).getByRole("button", { name: "Close cart" }).click();
  await expect(cartButton(page)).toBeFocused();
});

test("C3-05: a line with no yogurt holds Checkout and Place Order until it is chosen", async ({ page }) => {
  const noBase = moment("nb") as Record<string, unknown>;
  delete noBase.base;
  await seedCart(page, [noBase, moment("ok")]);
  await page.goto("/order");
  await waitForPageReady(page);

  await cartButton(page).click();
  const checkout = drawer(page).getByRole("button", { name: "Checkout" });
  await expect(checkout).toBeDisabled();
  await expect(drawer(page).locator("[data-checkout-hint]")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/checkout");
  await waitForPageReady(page);
  const marked = page.locator("[data-line-error][data-line-id='nb']");
  await expect(marked).toHaveCount(1);
  await expect(marked).toContainText("Choose a yogurt");
  const place = page.getByRole("button", { name: /Place Order/ });
  await expect(place).toBeDisabled();
  await expect(page.locator("[data-checkout-hint]")).toBeVisible();

  await page.getByRole("button", { name: "Edit cart" }).first().click();
  await drawer(page).locator("[data-line-id='nb']").getByRole("button", { name: /^Edit/ }).click();
  const m = page.getByRole("dialog", { name: "The Moment" });
  await m.getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Vanilla" }).click();
  await m.getByRole("button", { name: "Save" }).click();
  await expect(m).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(drawer(page)).toBeHidden();
  await expect(page.locator("[data-line-error]")).toHaveCount(0);
  await expect(place).toBeEnabled();
});

test("K6-06: a form-level refusal is announced and focus lands on the empty field", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await page.goto("/checkout");
  await waitForPageReady(page);
  await page.getByLabel("Name").fill("   ");
  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Phone").fill("604-123-4567");
  await page.getByRole("button", { name: /Place Order/ }).click();
  // Scoped to the form: Next's route announcer is a role="alert" too.
  const alert = page.locator("form").getByRole("alert");
  await expect(alert).toContainText("All fields are required.");
  await expect(page.getByLabel("Name")).toBeFocused();
});

test("K6-07: after an order, a fresh visit to /checkout goes to the menu while a reload keeps the confirmation", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await page.goto("/checkout");
  await waitForPageReady(page);
  await page.getByLabel("Name").fill("Test Customer");
  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Phone").fill("604-123-4567");
  await page.getByRole("button", { name: /Place Order/ }).click();
  await expect(page.getByText("Order Received", { exact: true })).toBeVisible();

  await page.reload();
  await waitForPageReady(page);
  await expect(page.getByText("Order Received", { exact: true })).toBeVisible();

  await page.goto("/order");
  await waitForPageReady(page);
  await page.goto("/checkout");
  await page.waitForURL("**/order");
});

test("B4-02: the builder's instruction colour change collapses under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/build");
  await waitForPageReady(page);
  // motion-reduce:transition-none clears the property list, which is what
  // stops the fade; the duration token is left as declared.
  const property = await page.locator("[data-step-instruction]").evaluate((el) => getComputedStyle(el).transitionProperty);
  expect(property).toBe("none");
});

test("F8-01: the footer's contact path is a mailto, with no form behind it", async ({ page }) => {
  await page.goto("/");
  await waitForPageReady(page);
  const footer = page.locator("footer#footer");
  await expect(footer.locator("form")).toHaveCount(0);
  await expect(footer.getByRole("link", { name: "Email Us" })).toHaveAttribute(
    "href",
    /^mailto:info@merosyogurt\.com\?subject=/
  );
});

test("S1-13: the viewport opts into the safe area and the sheet footer pads for it", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);
  const viewport = await page.locator("meta[name='viewport']").getAttribute("content");
  expect(viewport).toContain("viewport-fit=cover");
  await bowlCard(page).getByRole("button", { name: "Add to Cart" }).click();
  const footer = modal(page, "The Moment").locator("[data-edit-price]").locator("xpath=ancestor::div[2]");
  await expect(footer).toHaveClass(/safe-area-inset-bottom/);
});

test("H7-01: the Build strip never shows its loop seam on an ultrawide viewport", async ({ page }) => {
  await page.setViewportSize({ width: 3440, height: 1440 });
  await page.goto("/");
  await waitForPageReady(page);
  const strip = page.getByLabel("Build A Bowl").first();
  await strip.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  for (let sample = 0; sample < 3; sample += 1) {
    const edge = await page.evaluate(() => {
      const sec = document.querySelector("[aria-label='Build A Bowl']");
      const row = sec && Array.from(sec.querySelectorAll<HTMLElement>("div")).find((d) => d.style.width === "max-content");
      if (!row) return null;
      return { last: Math.max(...Array.from(row.children).map((k) => k.getBoundingClientRect().right)), first: Math.min(...Array.from(row.children).map((k) => k.getBoundingClientRect().left)), innerWidth };
    });
    expect(edge, "strip row not found").not.toBeNull();
    expect(edge!.last, `sample ${sample}: right edge ${edge!.last} < ${edge!.innerWidth}`).toBeGreaterThanOrEqual(edge!.innerWidth);
    expect(edge!.first).toBeLessThanOrEqual(0);
    await page.waitForTimeout(700);
  }
});
