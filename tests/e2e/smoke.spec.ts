import { expect, test, type Page } from "@playwright/test";
import { cartButton, readCart, waitForPageReady } from "./helpers/cart";

type Mods = { additions: string[]; removals: string[] };
type Line = { productId: string; base?: string; size: { id: string }; unitPrice: number; mods?: Mods };

const addModal = (page: Page, name: string) => page.getByRole("dialog", { name });

test("a bowl on /menu is configured in the add modal: size and yogurt required, then added", async ({ page }) => {
  await page.goto("/menu");
  await waitForPageReady(page);

  // No choices on the panel itself; the button opens the modal, blank.
  const card = page.locator("#bowls article").first();
  await expect(card.getByRole("group", { name: "Yogurt" })).toHaveCount(0);
  await expect(card.getByRole("group", { name: "Size" })).toHaveCount(0);
  // The price is stated once for the whole category, not on each panel: every
  // bowl costs the same, so ten panels quoting it printed one number ten times.
  await expect(page.locator("#bowls")).toContainText("Medium $12");
  await expect(card).not.toContainText("$");
  await card.getByRole("button", { name: /^Add .+ to cart$/ }).click();

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
  await expect(card.getByRole("button", { name: /added to cart$/ })).toBeVisible();
  await expect(card.getByRole("button", { name: /^Add .+ to cart$/ })).toBeVisible();

  await expect(cartButton(page)).toHaveAttribute("aria-label", "Cart (1 item)");
  const cart = (await readCart(page)) as Line[];
  expect(cart).toHaveLength(1);
  expect(cart[0].base).toBe("vegan-coconut-yogurt");
  expect(cart[0].size.id).toBe("medium");
  expect(cart[0].unitPrice).toBe(14);
});

test("the add modal takes additions and removals within the caps, and a fresh open is blank", async ({ page }) => {
  await page.goto("/menu");
  await waitForPageReady(page);
  const card = page.locator("#bowls article").first();
  await card.getByRole("button", { name: /^Add .+ to cart$/ }).click();
  const modal = addModal(page, "The Moment");
  await expect(modal).toBeVisible();

  await modal.getByRole("group", { name: "Size" }).getByRole("button", { name: "Large" }).click();
  await modal.getByRole("group", { name: "Yogurt" }).getByRole("button", { name: "Plain", exact: true }).click();
  await modal.getByRole("button", { name: "Mangoes +$2.00" }).click();
  await modal.getByRole("button", { name: "Pineapples +$2.00" }).click();
  await expect(modal.getByRole("button", { name: "Dragon Fruit +$2.00" })).toBeDisabled();
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
  await card.getByRole("button", { name: /^Add .+ to cart$/ }).click();
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("button", { name: "Add to cart" })).toBeDisabled();
  await expect(modal.getByRole("button", { name: "Mangoes +$2.00" })).toHaveAttribute("aria-pressed", "false");
  await modal.getByRole("button", { name: "Cancel" }).click();
  await expect(modal).toBeHidden();
  expect(await readCart(page)).toHaveLength(1);
});

test("a smoothie card has nothing to choose and adds in one click", async ({ page }) => {
  await page.goto("/menu");
  await waitForPageReady(page);

  const card = page.locator("#smoothies article").first();
  await expect(card.getByRole("group", { name: "Yogurt" })).toHaveCount(0);
  // One size, so the heading needs no "from" and the panel needs no price.
  await expect(page.locator("#smoothies")).toContainText("22 oz $15");
  await expect(page.locator("#smoothies")).not.toContainText("From");
  await expect(card).not.toContainText("$");
  await card.getByRole("button", { name: /^Add .+ to cart$/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card.getByRole("button", { name: /added to cart$/ })).toBeVisible();
  const cart = (await readCart(page)) as Line[];
  expect(cart).toHaveLength(1);
  expect(cart[0].base).toBe("vanilla-greek-yogurt");
  expect(cart[0].size.id).toBe("standard");
});

test("the home page preview opens the add modal for a bowl and adds a smoothie outright", async ({ page }) => {
  await page.goto("/");
  await waitForPageReady(page);

  // No yogurt chips in the panels; a bowl's button opens the modal.
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
  // The button that opened the modal confirms, then returns to rest.
  await expect(page.getByRole("button", { name: "The Moment added to cart" })).toBeVisible();
  await expect(addMoment).toBeVisible();

  const addRise = page.getByRole("button", { name: "Add The Cabana to cart" });
  await addRise.scrollIntoViewIfNeeded();
  await addRise.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "The Cabana added to cart" })).toBeVisible();

  await expect(cartButton(page)).toHaveAttribute("aria-label", "Cart (2 items)");
  const cart = (await readCart(page)) as Line[];
  expect(cart.map((l) => [l.productId, l.size.id, l.base, l.unitPrice])).toEqual([
    ["moment", "large", "plain-greek-yogurt", 15],
    ["cabana", "standard", "vanilla-greek-yogurt", 15],
  ]);
});

test("every item on /menu is a full entry with its photograph", async ({ page }) => {
  await page.goto("/menu");
  await waitForPageReady(page);

  // The Glow was the last item to be photographed (the Uber Eats shoot of
  // 2026-09-09). It says everything the others say and carries its photo.
  const glow = page.locator("#smoothies article", { hasText: "Glow" });
  await expect(glow).toHaveCount(1);
  await glow.scrollIntoViewIfNeeded();
  await expect(glow).toContainText("Strawberries, Raspberries");
  await expect(glow.getByRole("button", { name: /^Add .+ to cart$/ })).toBeVisible();

  // One photograph per item, on every item. The list is the same component
  // on the home page, so the count there is the same test with fewer photos.
  const entries = page.locator("#bowls li, #smoothies li");
  const count = await entries.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    await expect(entries.nth(i).locator("img")).toHaveCount(2); // phone thumbnail and the tablet-up photo
  }
});

test("the home page lists every signature and links to /menu twice", async ({ page }) => {
  await page.goto("/menu");
  await waitForPageReady(page);
  const full = await page.locator("#bowls article, #smoothies article").count();

  await page.goto("/");
  await waitForPageReady(page);
  const listed = page.locator("#menu article");

  // The home page carries the whole menu as type (the /source-menu shape);
  // /menu is where every item has its photograph.
  expect(full).toBeGreaterThan(0);
  expect(await listed.count()).toBe(full);
  // Two ways to the full menu: above the lists and in the bar below them.
  const menuSection = page.locator("#menu");
  await expect(menuSection.getByRole("link", { name: "See the full menu" })).toHaveAttribute("href", "/menu");
  await expect(menuSection.getByRole("link", { name: "Browse", exact: true })).toHaveAttribute("href", "/menu");
});
