import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Viewport matrix
// ---------------------------------------------------------------------------
const VIEWPORTS = {
  // Mobile
  'mobile-320': { width: 320, height: 568 },
  'mobile-375': { width: 375, height: 667 },
  'mobile-390': { width: 390, height: 844 },
  'mobile-414': { width: 414, height: 896 },
  // In-between
  'mid-500': { width: 500, height: 900 },
  'mid-640': { width: 640, height: 960 },
  // Tablet
  'tablet-768': { width: 768, height: 1024 },
  'tablet-820': { width: 820, height: 1180 },
  'mid-900': { width: 900, height: 1200 },
  'tablet-1024': { width: 1024, height: 768 },
  // In-between
  'mid-1100': { width: 1100, height: 900 },
  // Desktop
  'desktop-1280': { width: 1280, height: 800 },
  'desktop-1440': { width: 1440, height: 900 },
  'desktop-1536': { width: 1536, height: 864 },
  'desktop-1728': { width: 1728, height: 1117 },
  'desktop-1920': { width: 1920, height: 1080 },
};

const BASE_URL = 'http://localhost:4321';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect horizontal page overflow */
async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}

/** Assert no horizontal overflow */
async function expectNoOverflow(page: Page) {
  const overflow = await hasHorizontalOverflow(page);
  expect(overflow, 'Page should not have horizontal overflow').toBeFalsy();
}

/** Scroll through the entire page in steps so lazy / scroll-triggered content loads */
async function scrollFullPage(page: Page) {
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const steps = Math.ceil(totalHeight / (viewportHeight * 0.6));

  for (let i = 0; i <= steps; i++) {
    await page.evaluate(
      (y) => window.scrollTo({ top: y, behavior: 'instant' }),
      i * viewportHeight * 0.6,
    );
    await page.waitForTimeout(150);
  }
  // Scroll back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(200);
}

/** Assert a locator's bounding box is fully within the viewport */
async function expectWithinViewport(page: Page, selector: string) {
  const viewport = page.viewportSize()!;
  const elements = page.locator(selector);
  const count = await elements.count();
  for (let i = 0; i < count; i++) {
    const box = await elements.nth(i).boundingBox();
    if (!box) continue;
    expect(box.x, `${selector}[${i}] left edge should be >= 0`).toBeGreaterThanOrEqual(-1);
    expect(
      box.x + box.width,
      `${selector}[${i}] right edge should be <= viewport width`,
    ).toBeLessThanOrEqual(viewport.width + 1);
  }
}

/** Check that elements in a list do not overlap each other vertically */
async function expectNoVerticalOverlap(page: Page, selector: string) {
  const elements = page.locator(selector);
  const count = await elements.count();
  const boxes: { y: number; height: number; index: number }[] = [];

  for (let i = 0; i < count; i++) {
    const box = await elements.nth(i).boundingBox();
    if (box) boxes.push({ y: box.y, height: box.height, index: i });
  }

  boxes.sort((a, b) => a.y - b.y);

  for (let i = 1; i < boxes.length; i++) {
    const prev = boxes[i - 1];
    const curr = boxes[i];
    expect(
      curr.y,
      `${selector}[${curr.index}] overlaps with [${prev.index}]`,
    ).toBeGreaterThanOrEqual(prev.y + prev.height - 2); // 2px tolerance
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

for (const [label, size] of Object.entries(VIEWPORTS)) {
  test.describe(`Main page @ ${label} (${size.width}×${size.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      // Wait for animations / hydration
      await page.waitForTimeout(500);
    });

    // ----- Full-page screenshot -----
    test('full page visual snapshot', async ({ page }) => {
      await scrollFullPage(page);
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`main-fullpage-${label}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        timeout: 15000,
      });
    });

    // ----- No horizontal overflow -----
    test('no horizontal overflow at any scroll position', async ({ page }) => {
      await expectNoOverflow(page);
      await scrollFullPage(page);
      await expectNoOverflow(page);
    });

    // ----- Hero section -----
    test('hero section is fully visible', async ({ page }) => {
      const hero = page.locator('.hero');
      await expect(hero).toBeVisible();
      const box = await hero.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThanOrEqual(size.width - 2);
      await expect(page).toHaveScreenshot(`main-hero-${label}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    // ----- NavBar -----
    test('navbar is visible and not clipped', async ({ page }) => {
      const nav = page.locator('.nav').first();
      await expect(nav).toBeVisible();
      const box = await nav.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.width).toBeLessThanOrEqual(size.width + 2);
    });

    if (size.width < 768) {
      test('mobile menu opens without overflow', async ({ page }) => {
        const hamburger = page.locator('.nav__hamburger');
        await expect(hamburger).toBeVisible();
        await hamburger.click();
        await page.waitForTimeout(400);
        const mobileMenu = page.locator('.nav__mobile-menu');
        await expect(mobileMenu).toBeVisible();
        await expectNoOverflow(page);
        await expect(page).toHaveScreenshot(`main-mobile-menu-${label}.png`, {
          maxDiffPixelRatio: 0.02,
        });
      });
    }

    // ----- About section -----
    test('about section layout integrity', async ({ page }) => {
      const about = page.locator('#about');
      await about.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await expect(about).toBeVisible();
      await expectWithinViewport(page, '.about__grid');
      await expect(page).toHaveScreenshot(`main-about-${label}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    // ----- Sliding text section -----
    test('sliding text section — chevron alignment', async ({ page }) => {
      const section = page.locator('#smoothie-reveal');
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await expect(section).toBeVisible();

      // Check the arrow wrap and text wrap bounding boxes
      const arrowWrap = page.locator('.sr__arrow-wrap');
      const textWrap = page.locator('.sr__text-wrap');

      const arrowCount = await arrowWrap.count();
      const textCount = await textWrap.count();

      if (arrowCount > 0 && textCount > 0) {
        const arrowBox = await arrowWrap.first().boundingBox();
        const textBox = await textWrap.first().boundingBox();
        if (arrowBox && textBox) {
          // Arrow should be reasonably close to text vertically (within 200px)
          const arrowCenter = arrowBox.y + arrowBox.height / 2;
          const textCenter = textBox.y + textBox.height / 2;
          expect(
            Math.abs(arrowCenter - textCenter),
            'Chevron should be vertically aligned with text',
          ).toBeLessThan(200);
        }
      }

      await expect(page).toHaveScreenshot(`main-sliding-text-${label}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    // ----- Smoothie menu section (3D carousel) -----
    test('smoothie menu section is visible on page load', async ({ page }) => {
      const menu = page.locator('#menu');
      await menu.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await expect(menu).toBeVisible();

      await expect(page).toHaveScreenshot(`main-smoothie-menu-${label}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    test('smoothie carousel front card is visible with title and descriptor', async ({ page }) => {
      const menu = page.locator('#menu');
      await menu.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      // The active front card should be aria-current="true"
      const activeCard = page.locator('[aria-current="true"]');
      await expect(activeCard).toBeVisible();

      // The card's h3 title should be visible
      const title = activeCard.locator('h3');
      await expect(title).toBeVisible();
      const titleText = await title.textContent();
      expect(titleText?.trim().length).toBeGreaterThan(0);
    });

    test('smoothie carousel arrow navigation advances cards', async ({ page }) => {
      const menu = page.locator('#menu');
      await menu.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);

      const activeCard = page.locator('[aria-current="true"]');
      const initialTitle = await activeCard.locator('h3').textContent();

      // Click the next arrow
      const nextArrow = page.locator('.carousel-arrow--next');
      await expect(nextArrow).toBeVisible();
      await nextArrow.click();
      await page.waitForTimeout(500);

      const newTitle = await page.locator('[aria-current="true"]').locator('h3').textContent();
      expect(newTitle?.trim()).not.toEqual(initialTitle?.trim());
    });

    test('smoothie carousel does not cause horizontal overflow', async ({ page }) => {
      const menu = page.locator('#menu');
      await menu.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await expectNoOverflow(page);
    });

    // ----- Yogurt menu section -----
    test('yogurt menu layout', async ({ page }) => {
      const yogurt = page.locator('#yogurt-menu');
      await yogurt.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await expect(yogurt).toBeVisible();

      const cards = page.locator('.yogurt__card');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);

      // Yogurt cards should not overflow the page
      for (let i = 0; i < count; i++) {
        const box = await cards.nth(i).boundingBox();
        if (!box) continue;
        expect(box.x, `Yogurt card ${i} left`).toBeGreaterThanOrEqual(-1);
        expect(
          box.x + box.width,
          `Yogurt card ${i} right`,
        ).toBeLessThanOrEqual(size.width + 1);
      }

      await expect(page).toHaveScreenshot(`main-yogurt-menu-${label}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    // ----- Location section -----
    test('location section layout', async ({ page }) => {
      const location = page.locator('#find-us');
      await location.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await expect(location).toBeVisible();
      await expectWithinViewport(page, '.location__card');
      await expect(page).toHaveScreenshot(`main-location-${label}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    // ----- Sections do not overlap -----
    test('major sections do not overlap', async ({ page }) => {
      await scrollFullPage(page);
      const sectionSelectors = ['#hero', '#about', '#menu', '#yogurt-menu', '#find-us'];
      const boxes: { selector: string; y: number; height: number }[] = [];

      for (const sel of sectionSelectors) {
        const el = page.locator(sel);
        const count = await el.count();
        if (count === 0) continue;
        const box = await el.boundingBox();
        if (box) boxes.push({ selector: sel, y: box.y, height: box.height });
      }

      boxes.sort((a, b) => a.y - b.y);

      for (let i = 1; i < boxes.length; i++) {
        const prev = boxes[i - 1];
        const curr = boxes[i];
        expect(
          curr.y,
          `${curr.selector} should not overlap ${prev.selector}`,
        ).toBeGreaterThanOrEqual(prev.y + prev.height - 5);
      }
    });
  });
}
