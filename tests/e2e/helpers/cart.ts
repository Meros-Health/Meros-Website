import type { Page } from "@playwright/test";

export const CART_KEY = "meros-cart";

const SEEDED_MARK = "meros-e2e-seeded";

/**
 * Seeds localStorage before any script on the page runs. Init scripts re-run
 * on every navigation (reloads included), so the seed is applied once per
 * tab and the app's own writes win after that.
 */
export async function seedRawCart(page: Page, raw: string): Promise<void> {
  await page.addInitScript(
    ({ key, value, mark }) => {
      if (window.sessionStorage.getItem(mark)) return;
      window.sessionStorage.setItem(mark, "1");
      window.localStorage.setItem(key, value);
    },
    { key: CART_KEY, value: raw, mark: SEEDED_MARK }
  );
}

export async function seedCart(page: Page, items: unknown, version = 0): Promise<void> {
  await seedRawCart(page, JSON.stringify({ state: { items }, version }));
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
