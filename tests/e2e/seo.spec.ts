// Metadata inherits down the App Router tree, so a canonical set once in the
// root layout silently claims every route is the home page. That folds /order,
// /build, /privacy and /terms out of the index, and nothing else in the suite
// would notice. These assert each route speaks for itself.
import { expect, test } from "@playwright/test";

const SITE = "https://merosyogurt.com";

const PAGES = [
  { path: "/", canonical: "/", title: /MERŌS/ },
  { path: "/order", canonical: "/order", title: /Our Menu/ },
  { path: "/build", canonical: "/build", title: /Build a Bowl/ },
  { path: "/catering", canonical: "/catering", title: /Catering/ },
  { path: "/privacy", canonical: "/privacy", title: /Privacy Policy/ },
  { path: "/terms", canonical: "/terms", title: /Terms of Service/ },
] as const;

for (const { path, canonical, title } of PAGES) {
  test(`${path} declares its own canonical and title`, async ({ page }) => {
    await page.goto(path);

    const href = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(href, `${path} canonical`).toBe(`${SITE}${canonical === "/" ? "" : canonical}`);

    const ogUrl = await page.locator('meta[property="og:url"]').getAttribute("content");
    expect(ogUrl, `${path} og:url`).toBe(`${SITE}${canonical === "/" ? "" : canonical}`);

    await expect(page).toHaveTitle(title);
  });
}

test("/checkout is kept out of the index", async ({ page }) => {
  await page.goto("/checkout");
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toMatch(/noindex/);
});

test("robots.txt and the sitemap point at the live domain, not the Worker host", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  expect(robots).toContain("Disallow: /checkout");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/", "/order", "/build", "/privacy", "/terms"]) {
    expect(sitemap).toContain(`<loc>${SITE}${path === "/" ? "/" : path}</loc>`);
  }
  // Transactional routes must never be advertised for crawling.
  expect(sitemap).not.toContain("/checkout");
  expect(sitemap).not.toContain("/cart");
});

test("the link preview image the metadata promises actually exists", async ({ page, request }) => {
  await page.goto("/");
  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toBeTruthy();

  // The tag is absolute against the live domain, which still serves the old
  // site. Fetch the same path from whatever host this run is pointed at.
  const path = new URL(image!).pathname;
  const res = await request.get(path);
  expect(res.status(), `${path} should be served`).toBe(200);
  expect(res.headers()["content-type"]).toContain("image");
});

// Structured data is what produces the map card, hours and knowledge panel.
// It is built from lib/business.ts, the same data the footer renders.
async function jsonLd(page: import("@playwright/test").Page): Promise<Array<Record<string, unknown>>> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((b) => JSON.parse(b));
}

test("the home page carries a Restaurant schema that agrees with the footer", async ({ page }) => {
  await page.goto("/");
  const [restaurant] = await jsonLd(page);
  expect(restaurant["@type"]).toBe("Restaurant");
  const address = restaurant.address as Record<string, string>;
  expect(address.streetAddress).toBe("1207 Hamilton Street");
  const hours = (restaurant.openingHoursSpecification as Array<Record<string, unknown>>)[0];
  expect(hours.dayOfWeek).toHaveLength(7);
  expect(hours.opens).toBe("08:00");
  expect(hours.closes).toBe("22:00");
  await expect(page.locator("footer")).toContainText("1207 Hamilton Street");
  await expect(page.locator("footer")).toContainText("8 AM – 10 PM");
  expect(restaurant.telephone).toBe("+1-778-345-3023");
  await expect(page.locator("footer")).toContainText("(778) 345-3023");
});

for (const path of ["/order", "/build", "/privacy", "/terms"]) {
  test(`${path} carries a BreadcrumbList back to the home page`, async ({ page }) => {
    await page.goto(path);
    const crumbs = (await jsonLd(page)).find((d) => d["@type"] === "BreadcrumbList");
    expect(crumbs, `${path} BreadcrumbList`).toBeTruthy();
    const items = crumbs!.itemListElement as Array<Record<string, unknown>>;
    expect(items[0].item).toBe(SITE);
    expect(items[1].item).toBe(`${SITE}${path}`);
  });
}

test("every icon role and the manifest resolve at the paths clients request", async ({ page, request }) => {
  await page.goto("/");
  for (const path of ["/favicon.ico", "/icon.png", "/apple-icon.png", "/apple-touch-icon.png", "/manifest.webmanifest"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
  }
  await expect(page.locator('link[rel="icon"][href*="favicon.ico"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});

test("the link preview image is 1200x630", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
});

test("a missing page says so in its title instead of claiming to be the home page", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page).toHaveTitle(/Page Not Found/);
});

test("/checkout and /cart/edit have their own titles and stay out of the index", async ({ page }) => {
  await page.goto("/cart/edit/nope");
  await expect(page).toHaveTitle(/Edit Your Bowl/);
  const robots = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(robots).toMatch(/noindex/);
});
