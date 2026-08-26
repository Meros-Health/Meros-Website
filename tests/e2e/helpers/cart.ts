import type { Page } from "@playwright/test";

export const CART_KEY = "meros-cart";

/** Seeds localStorage before any script on the page runs. */
export async function seedCart(page: Page, items: unknown, version = 0): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: CART_KEY, value: JSON.stringify({ state: { items }, version }) }
  );
}

export async function seedRawCart(page: Page, raw: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    { key: CART_KEY, value: raw }
  );
}

export async function readCart(page: Page): Promise<unknown[]> {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw).state.items : [];
  }, CART_KEY);
}

/** The first-load preloader covers the page for at least 500 ms plus a 600 ms fade. */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1400);
}

export function cartButton(page: Page) {
  return page.getByRole("button", { name: /^Cart \(/ });
}
