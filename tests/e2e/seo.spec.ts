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
