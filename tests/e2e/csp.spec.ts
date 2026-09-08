// The Content-Security-Policy is enforced, so a directive that is too narrow is
// now a broken page rather than a console message. These cases are the cheap
// standing check: the header is present and enforcing on every route, and
// nothing on the page trips it.
//
// The footer's Google Maps iframe is why the scroll below matters. It carries
// loading="lazy" at the bottom of the page, so a check that only loads a route
// never fetches it and never sees frame-src reject it. That is precisely how it
// survived the audit that wrote the policy in the first place.
import { expect, test, type Page } from "@playwright/test";
import { waitForPageReady } from "./helpers/cart";

const ROUTES = ["/", "/menu", "/build", "/catering", "/privacy", "/terms"];

type Violation = { directive: string; blocked: string };

/** Collects violations from the page, registered before any document loads. */
async function watchViolations(page: Page): Promise<Violation[]> {
  const found: Violation[] = [];
  await page.exposeBinding("__cspReport", (_src, v: Violation) => {
    found.push(v);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __cspReport: (v: Violation) => void }).__cspReport({
        directive: e.effectiveDirective || e.violatedDirective,
        blocked: e.blockedURI,
      });
    });
  });
  return found;
}

test("every route enforces the policy rather than reporting it", async ({ request }) => {
  for (const route of ROUTES) {
    const res = await request.get(route);
    const headers = res.headers();
    expect(headers["content-security-policy"], `${route} sends no CSP`).toBeTruthy();
    expect(
      headers["content-security-policy-report-only"],
      `${route} is still report-only`,
    ).toBeUndefined();
    // The directives the site cannot function without, and the two that would
    // silently widen if someone pasted a policy back over this one.
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain("base-uri 'none'");
    expect(headers["content-security-policy"], `${route} allows eval`).not.toContain("unsafe-eval");
  }
});

test("the footer map loads instead of being blocked by frame-src", async ({ page }) => {
  const violations = await watchViolations(page);
  await page.goto("/");
  await waitForPageReady(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2500);

  const map = page.locator('iframe[src*="google.com/maps"]');
  await expect(map).toHaveCount(1);
  expect(violations, "the footer map tripped the policy").toEqual([]);
});

test("no route trips the policy on load or through the cart drawer", async ({ page }) => {
  const violations = await watchViolations(page);
  for (const route of ROUTES) {
    await page.goto(route);
    await waitForPageReady(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);
  }

  const cart = page.getByRole("button", { name: /^Cart \(/ });
  if (await cart.count()) {
    await cart.first().click();
    await page.waitForTimeout(1000);
  }

  expect(violations).toEqual([]);
});
