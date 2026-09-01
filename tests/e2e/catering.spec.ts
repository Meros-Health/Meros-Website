// /catering is the destination for the catering business card, so a visitor's
// first impression of the store can be this page. It has to render the offer,
// move to the form, and never confirm an inquiry it did not store.
//
// The e2e server is `next start`, which has no Cloudflare bindings, so the
// inquiry action has no D1 to write to here. That is exactly the case the
// last test pins: no destination means no confirmation.
import { expect, test } from "@playwright/test";
import { waitForPageReady } from "./helpers/cart";
import { menuToggle, overlayLinks } from "./helpers/nav";

test("the page renders the offer", async ({ page }) => {
  await page.goto("/catering");
  await waitForPageReady(page);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Catering");
  await expect(page.locator("#what-we-serve")).toBeVisible();
  await expect(page.locator("#yogurts")).toBeVisible();
  await expect(page.locator("#inquire")).toBeVisible();

  // The four yogurts are the page's product claim; losing one silently would
  // leave a buyer expecting something the store does not serve.
  for (const name of ["Plain Greek Yogurt", "Vanilla Greek Yogurt", "High Protein", "Vegan Coconut"]) {
    await expect(page.locator("#yogurts")).toContainText(name);
  }
});

// We cater for immediate consumption. The page must not read as a supply
// offer, which is the failure Kim flagged and the reason the wholesale track
// was removed.
test("the page offers catering, not supply", async ({ page }) => {
  await page.goto("/catering");
  await waitForPageReady(page);

  await expect(page.locator("body")).toContainText("the day it is served");
  await expect(page.getByText(/wholesale/i)).toHaveCount(0);
});

test("the hero CTA goes to the order form", async ({ page }) => {
  await page.goto("/catering");
  await waitForPageReady(page);

  await page.getByRole("link", { name: "Start a catering order" }).click();
  await expect.poll(() => page.url()).toContain("#inquire");
  await page.waitForTimeout(1600); // the glide is deliberately slow

  const top = await page.locator("#inquire").evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(top), "the order form should be at the top of the viewport").toBeLessThan(140);
});

test("the nav bar carries three controls and the menu carries every route", async ({ page }) => {
  await page.goto("/catering");
  await waitForPageReady(page);

  // The Build and Order icons are gone from the bar at every breakpoint.
  await expect(page.getByRole("button", { name: "Build your bowl" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Our Menu" })).toHaveCount(0);

  await menuToggle(page).click();
  await expect(overlayLinks(page).first()).toBeVisible();
  for (const label of ["Home", "Build", "Order", "Catering"]) {
    await expect(overlayLinks(page).filter({ hasText: new RegExp(`^${label}$`) })).toHaveCount(1);
  }
});

test("the inquiry form reports a bad email instead of sending it", async ({ page }) => {
  await page.goto("/catering#inquire");
  await waitForPageReady(page);

  await page.getByLabel("Business name").fill("Hamilton Street Studios");
  await page.getByLabel("Your name").fill("Sam Reyes");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Send inquiry" }).click();

  await expect(page.getByRole("alert")).toContainText("valid email");
});

test("an inquiry with nowhere to go is never confirmed", async ({ page }) => {
  await page.goto("/catering#inquire");
  await waitForPageReady(page);

  await page.getByLabel("Business name").fill("Hamilton Street Studios");
  await page.getByLabel("Your name").fill("Sam Reyes");
  await page.getByLabel("Email").fill("sam@studios.example");
  await page.getByRole("button", { name: "Send inquiry" }).click();

  // No D1 binding under `next start`: the page must hand over the phone and
  // the inbox rather than say "received".
  await expect(page.getByRole("alert")).toContainText("info@merosyogurt.com");
  await expect(page.getByText("Received")).toHaveCount(0);
});
