// The six URLs the agency site had indexed under merosyogurt.com must keep
// resolving after the cutover. next.config.ts maps five of them; "/" needs no
// mapping. A silent regression here costs the domain's existing ranking, and
// nothing else in the suite would notice.
import { expect, test } from "@playwright/test";

const LEGACY: Array<[from: string, to: string]> = [
  ["/about-us", "/#about"],
  ["/about-us/", "/#about"],
  ["/build-a-bowl", "/build"],
  ["/build-a-bowl/", "/build"],
  ["/our-menu", "/order"],
  ["/our-menu/", "/order"],
  ["/privacy-policy", "/privacy"],
  ["/privacy-policy/", "/privacy"],
  ["/contact", "/#footer"],
  ["/contact/", "/#footer"],
];

for (const [from, to] of LEGACY) {
  test(`${from} redirects to ${to}`, async ({ page }) => {
    const response = await page.goto(from);
    expect(response?.status(), `${from} should resolve, not error`).toBeLessThan(400);
    // Compare against the resolved absolute URL so a hash destination matches too.
    const expected = new URL(to, page.url()).toString();
    expect(page.url()).toBe(expected);
  });
}

test("the old home page URL still resolves", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
});
