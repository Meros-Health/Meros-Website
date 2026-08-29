// Editing a signature line from the cart drawer: the modal, its caps, what it
// saves, and how it coexists with the drawer underneath it.
import { expect, test, type Page } from "@playwright/test";
import { cartButton, readCart, seedCart, waitForPageReady } from "./helpers/cart";

const NUTRITION = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, calcium: 0, iron: 0, potassium: 0 };

type Mods = { additions: string[]; removals: string[] };

function moment(lineId: string, extra: { quantity?: number; unitPrice?: number; base?: string; mods?: Mods } = {}) {
  return {
    lineId,
    kind: "signature",
    productId: "moment",
    name: "The Moment · Medium",
    size: { id: "medium", label: "Medium" },
    base: "plain-greek-yogurt",
    nutrition: NUTRITION,
    quantity: 1,
    unitPrice: 12,
    ...extra,
  };
}

type Line = { lineId: string; quantity: number; unitPrice: number; size: { id: string }; base?: string; mods?: Mods };

const drawer = (page: Page) => page.getByRole("dialog", { name: "Cart" });
const modal = (page: Page) => page.getByRole("dialog", { name: "The Moment" });
const editButton = (page: Page) => drawer(page).getByRole("button", { name: "Edit The Moment · Medium" }).first();

async function openModal(page: Page) {
  await page.goto("/order");
  await waitForPageReady(page);
  await cartButton(page).click();
  await editButton(page).click();
  await expect(modal(page)).toBeVisible();
}

test("opens over the drawer, which stays open underneath", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await openModal(page);
  await expect(drawer(page)).toBeVisible();
  await expect(modal(page).getByText("In this bowl")).toBeVisible();
  // The yogurt is a choice above the recipe, not a recipe chip.
  const yogurt = modal(page).getByRole("group", { name: "Yogurt" });
  await expect(yogurt.getByRole("button", { name: "Plain", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(yogurt.getByRole("button", { name: "Vegan Coconut +$2" })).toHaveAttribute("aria-pressed", "false");
  await expect(modal(page).getByRole("button", { name: "Plain Greek Yogurt" })).toHaveCount(0);
});

test("swaps the yogurt, prices the surcharge, and saves it to the line", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await openModal(page);
  await modal(page).getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Vegan Coconut +$2" }).click();
  await expect(modal(page).locator("[data-edit-price]")).toContainText("$14.00");
  await expect(modal(page).locator("[data-edit-price]")).toContainText("(+$2.00)");
  await modal(page).getByRole("button", { name: "Save" }).click();
  await expect(modal(page)).toBeHidden();
  await expect(drawer(page).locator("[data-line-base]")).toHaveText("Vegan Coconut Yogurt");
  await expect(drawer(page).locator("[data-line-id='a']")).toContainText("$14.00");
  const cart = (await readCart(page)) as Line[];
  expect(cart[0].base).toBe("vegan-coconut-yogurt");
  expect(cart[0].unitPrice).toBe(14);
});

test("a bowl saved before the yogurt was a choice asks for one before it can be saved", async ({ page }) => {
  // JSON drops the undefined, so the seeded line has no `base` at all.
  await seedCart(page, [{ ...moment("a"), base: undefined }]);
  await page.goto("/order");
  await waitForPageReady(page);
  await cartButton(page).click();
  await expect(drawer(page).locator("[data-line-base-missing]")).toHaveText("Choose your yogurt");
  await editButton(page).click();
  await expect(modal(page)).toBeVisible();
  await expect(modal(page).getByText("Choose one")).toBeVisible();
  await expect(modal(page).getByRole("button", { name: "Save" })).toBeDisabled();
  await modal(page).getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Vanilla", exact: true }).click();
  await expect(modal(page).getByRole("button", { name: "Save" })).toBeEnabled();
  await modal(page).getByRole("button", { name: "Save" }).click();
  await expect(drawer(page).locator("[data-line-base]")).toHaveText("Vanilla Greek Yogurt");
  const cart = (await readCart(page)) as Line[];
  expect(cart[0].base).toBe("vanilla-greek-yogurt");
});

test("adds two, disables the third, removes one, and saves price and text to the line", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await openModal(page);

  await modal(page).getByRole("button", { name: "Mangoes +$2.00" }).click();
  await modal(page).getByRole("button", { name: "Pineapples +$2.00" }).click();
  await expect(modal(page).getByRole("button", { name: "Grapes +$2.00" })).toBeDisabled();
  await expect(modal(page).getByRole("button", { name: "Pineapples +$2.00" })).toBeEnabled();

  await modal(page).getByRole("button", { name: "House Granola", exact: true }).click();
  await expect(modal(page).getByRole("button", { name: "No House Granola" })).toHaveAttribute("aria-pressed", "true");

  await expect(modal(page).locator("[data-edit-price]")).toContainText("$16.00");
  await expect(modal(page).locator("[data-edit-price]")).toContainText("(+$4.00)");

  await modal(page).getByRole("button", { name: "Save" }).click();
  await expect(modal(page)).toBeHidden();
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).locator("[data-line-mods]")).toHaveText("Add Mangoes, Pineapples · No House Granola");
  await expect(drawer(page).locator("[data-line-id='a']")).toContainText("$16.00");

  const cart = (await readCart(page)) as Line[];
  expect(cart).toHaveLength(1);
  expect(cart[0].unitPrice).toBe(16);
  expect(cart[0].mods).toEqual({ additions: ["mangoes", "pineapples"], removals: ["house-granola"] });
});

test("changes size from the modal", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await openModal(page);
  await modal(page).getByRole("button", { name: "Large" }).click();
  await expect(modal(page).locator("[data-edit-price]")).toContainText("$15.00");
  await modal(page).getByRole("button", { name: "Save" }).click();
  await expect(drawer(page).locator("[data-line-id='a']")).toContainText("The Moment · Large");
  const cart = (await readCart(page)) as Line[];
  expect(cart[0].size.id).toBe("large");
  expect(cart[0].mods).toBeUndefined();
});

test("Escape closes the modal and leaves the drawer open; Close returns focus to Edit", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await openModal(page);
  await page.keyboard.press("Escape");
  await expect(modal(page)).toBeHidden();
  await expect(drawer(page)).toBeVisible();

  await editButton(page).click();
  await expect(modal(page)).toBeVisible();
  await modal(page).getByRole("button", { name: "Close edit" }).click();
  await expect(modal(page)).toBeHidden();
  await expect(editButton(page)).toBeFocused();
  await expect(drawer(page)).toBeVisible();
});

test("Cancel discards the draft", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await openModal(page);
  await modal(page).getByRole("button", { name: "Mangoes +$2.00" }).click();
  await modal(page).getByRole("button", { name: "Cancel" }).click();
  await expect(modal(page)).toBeHidden();
  await expect(drawer(page).locator("[data-line-mods]")).toHaveCount(0);
  await editButton(page).click();
  await expect(modal(page).getByRole("button", { name: "Mangoes +$2.00" })).toHaveAttribute("aria-pressed", "false");
});

test("editing a line into a duplicate merges the quantities", async ({ page }) => {
  await seedCart(page, [
    moment("plain", { quantity: 2 }),
    moment("with-mango", { unitPrice: 14, mods: { additions: ["mangoes"], removals: [] } }),
  ]);
  await openModal(page);
  await modal(page).getByRole("button", { name: "Mangoes +$2.00" }).click();
  await modal(page).getByRole("button", { name: "Save" }).click();
  await expect(modal(page)).toBeHidden();
  const cart = (await readCart(page)) as Line[];
  expect(cart).toHaveLength(1);
  expect(cart[0].quantity).toBe(3);
  expect(cart[0].unitPrice).toBe(14);
});

test("a modded line checks out and the order lists the change", async ({ page }) => {
  await seedCart(page, [moment("a", { unitPrice: 14, mods: { additions: ["mangoes"], removals: ["house-granola"] } })]);
  await page.goto("/checkout");
  await waitForPageReady(page);
  await expect(page.locator("[data-line-mods]")).toHaveText("Add Mangoes · No House Granola");
  await page.getByLabel("Name").fill("Test Customer");
  await page.getByLabel("Email").fill("customer@example.com");
  await page.getByLabel("Phone").fill("604-123-4567");
  await page.getByRole("button", { name: /Place Order|Placing Order/ }).click();
  await expect(page.getByText("Order Received", { exact: true })).toBeVisible();
  expect(await readCart(page)).toHaveLength(0);
});

test("the page does not scroll behind the modal", async ({ page }) => {
  await seedCart(page, [moment("a")]);
  await openModal(page);
  await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);

  // Closing the modal leaves the drawer's lock in place; closing both releases it.
  await page.keyboard.press("Escape");
  await expect(modal(page)).toBeHidden();
  await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
  await drawer(page).getByRole("button", { name: "Close cart" }).click();
  await expect(drawer(page)).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
});
