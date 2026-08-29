import { expect, test, type Page } from "@playwright/test";
import { cartButton, readCart, waitForPageReady } from "./helpers/cart";

type Mods = { additions: string[]; removals: string[] };
type Line = { productId: string; base?: string; size: { id: string }; unitPrice: number; mods?: Mods };

const addModal = (page: Page, name: string) => page.getByRole("dialog", { name });

test("a bowl on /order is configured in the add modal: size and yogurt required, then added", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);

  // No choices on the card itself; "+" opens the modal, blank.
  const card = page.locator("#bowls article").first();
  await expect(card.getByRole("group", { name: "Yogurt" })).toHaveCount(0);
  await expect(card.getByRole("group", { name: "Size" })).toHaveCount(0);
  await expect(card).toContainText("From $12.00");
  await card.getByRole("button", { name: "Add to Cart" }).click();

  const modal = addModal(page, "The Moment");
  await expect(modal).toBeVisible();
  await expect(modal.getByText("Add", { exact: true })).toBeVisible();
  const submit = modal.getByRole("button", { name: "Add to cart" });
  await expect(submit).toBeDisabled();
  await expect(modal.locator("[data-edit-price]")).toHaveText("Choose a size");
  await expect(modal.getByText("Choose one")).toHaveCount(2);
  expect(await readCart(page)).toHaveLength(0);

  // Size alone is not enough.
  await modal.getByRole("group", { name: "Size" }).getByRole("button", { name: "Medium" }).click();
  await expect(submit).toBeDisabled();
  await expect(modal.getByText("Choose one")).toHaveCount(1);

  await modal.getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Vegan Coconut +$2" }).click();
  await expect(modal.getByText("Choose one")).toHaveCount(0);
  await expect(modal.locator("[data-edit-price]")).toContainText("$14.00");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(modal).toBeHidden();

  // The card that opened the modal confirms, then returns to rest.
  await expect(card.getByRole("button", { name: "Added" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Add to Cart" })).toBeVisible();

  await expect(cartButton(page)).toHaveAttribute("aria-label", "Cart (1 item)");
  const cart = (await readCart(page)) as Line[];
  expect(cart).toHaveLength(1);
  expect(cart[0].base).toBe("vegan-coconut-yogurt");
  expect(cart[0].size.id).toBe("medium");
  expect(cart[0].unitPrice).toBe(14);
});

test("the add modal takes additions and removals within the caps, and a fresh open is blank", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);
  const card = page.locator("#bowls article").first();
  await card.getByRole("button", { name: "Add to Cart" }).click();
  const modal = addModal(page, "The Moment");
  await expect(modal).toBeVisible();

  await modal.getByRole("group", { name: "Size" }).getByRole("button", { name: "Large" }).click();
  await modal.getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Plain", exact: true }).click();
  await modal.getByRole("button", { name: "Mangoes +$2.00" }).click();
  await modal.getByRole("button", { name: "Pineapples +$2.00" }).click();
  await expect(modal.getByRole("button", { name: "Grapes +$2.00" })).toBeDisabled();
  await modal.getByRole("button", { name: "House Granola", exact: true }).click();
  await expect(modal.locator("[data-edit-price]")).toContainText("$19.00");
  await modal.getByRole("button", { name: "Add to cart" }).click();
  await expect(modal).toBeHidden();

  const cart = (await readCart(page)) as Line[];
  expect(cart).toHaveLength(1);
  expect(cart[0].size.id).toBe("large");
  expect(cart[0].unitPrice).toBe(19);
  expect(cart[0].mods).toEqual({ additions: ["mangoes", "pineapples"], removals: ["house-granola"] });

  // Cancel discards, and the next open starts over.
  await card.getByRole("button", { name: "Add to Cart" }).click();
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  await expect(modal.getByRole("button", { name: "Mangoes +$2.00" })).toHaveAttribute("aria-pressed", "false");
  await modal.getByRole("button", { name: "Cancel" }).click();
  await expect(modal).toBeHidden();
  expect(await readCart(page)).toHaveLength(1);
});

test("a smoothie card has nothing to choose and adds in one click", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);

  const card = page.locator("#smoothies article").first();
  await expect(card.getByRole("group", { name: "Yogurt" })).toHaveCount(0);
  await expect(card).toContainText("$15.00");
  await expect(card).not.toContainText("From");
  await card.getByRole("button", { name: "Add to Cart" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Added" })).toBeVisible();
  const cart = (await readCart(page)) as Line[];
  expect(cart).toHaveLength(1);
  expect(cart[0].base).toBe("vanilla-greek-yogurt");
  expect(cart[0].size.id).toBe("standard");
});

test("the homepage ledger opens the add modal for a bowl and adds a smoothie outright", async ({ page }) => {
  await page.goto("/");
  await waitForPageReady(page);

  // No yogurt chips in the rows; a bowl's "+" opens the modal.
  await expect(page.getByRole("group", { name: /^Yogurt for/ })).toHaveCount(0);
  const addMoment = page.getByRole("button", { name: "Add The Moment to cart" });
  await addMoment.scrollIntoViewIfNeeded();
  await addMoment.click();
  const modal = addModal(page, "The Moment");
  await expect(modal).toBeVisible();
  expect(await readCart(page)).toHaveLength(0);

  // Escape closes it, adds nothing, and returns focus to the "+".
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden();
  await expect(addMoment).toBeFocused();
  expect(await readCart(page)).toHaveLength(0);

  await addMoment.click();
  await expect(modal).toBeVisible();
  await modal.getByRole("group", { name: "Size" }).getByRole("button", { name: "Large" }).click();
  await modal.getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Plain", exact: true }).click();
  await modal.getByRole("button", { name: "Add to cart" }).click();
  await expect(modal).toBeHidden();
  // The "+" that opened the modal confirms, then returns to rest.
  await expect(page.getByRole("button", { name: "The Moment added to cart" })).toBeVisible();
  await expect(addMoment).toBeVisible();

  const addRise = page.getByRole("button", { name: "Add The Rise to cart" });
  await addRise.scrollIntoViewIfNeeded();
  await addRise.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "The Rise added to cart" })).toBeVisible();

  await expect(cartButton(page)).toHaveAttribute("aria-label", "Cart (2 items)");
  const cart = (await readCart(page)) as Line[];
  expect(cart.map((l) => [l.productId, l.size.id, l.base, l.unitPrice])).toEqual([
    ["moment", "large", "plain-greek-yogurt", 15],
    ["rise", "standard", "vanilla-greek-yogurt", 15],
  ]);
});

test("an item without photography still renders a photo card on /order and in the ledger", async ({ page }) => {
  await page.goto("/order");
  await waitForPageReady(page);
  const card = page.locator("#bowls article").last();

  // The image well is an image well: the stand-in photo fills it exactly the
  // way every photographed bowl's does, with nothing drawn over it.
  const tile = card.locator('[data-signature-tile="card"]');
  await expect(tile).toBeVisible();
  await expect(tile.locator("img")).toHaveAttribute("src", /Gallery-6/);
  await expect(tile).toHaveText("");

  // Name, price, tags and recipe all come from the card around it.
  // "Seasonal" in the DOM; the all-caps look is the display face, not a class.
  await expect(card).toContainText("Seasonal");
  await expect(card).toContainText("From $12.00");
  await expect(card).toContainText("Seasonal Stone Fruits, Seasonal Berries");

  await page.goto("/");
  await waitForPageReady(page);
  const row = page.locator("#menu section ul li", { hasText: "The Seasonal" });
  await row.scrollIntoViewIfNeeded();
  await expect(row).toContainText("Seasonal Stone Fruits, Seasonal Berries");
});
