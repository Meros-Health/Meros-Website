import { expect, type Page } from "@playwright/test";

// The nav bar carries only the menu toggle, the wordmark and the cart, so
// every route change in the suite goes through the menu. One definition of
// these locators, shared by nav.spec.ts and edit.spec.ts.

export const menuToggle = (page: Page) =>
  page.getByRole("button", { name: /Open menu|Close menu/ });

export const overlayLinks = (page: Page) => page.locator(".nav-overlay-link:visible");

/** Opens the menu and clicks the link with exactly this label. */
export async function navigateViaMenu(page: Page, label: string): Promise<void> {
  await menuToggle(page).click();
  await expect(overlayLinks(page).first()).toBeVisible();
  await overlayLinks(page)
    .filter({ hasText: new RegExp(`^${label}$`) })
    .first()
    .click();
}
