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

const BASE_URL = 'http://localhost:4321/bowl-builder';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
}

async function expectNoOverflow(page: Page) {
  const overflow = await hasHorizontalOverflow(page);
  expect(overflow, 'Page should not have horizontal overflow').toBeFalsy();
}

async function hasVerticalScrollbar(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
}

/** Get the page's current scroll dimensions for comparison */
async function getScrollDimensions(page: Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientWidth: document.documentElement.clientWidth,
    clientHeight: document.documentElement.clientHeight,
  }));
}

/** Assert a locator's bounding box is within the viewport horizontally */
async function expectWithinViewportX(page: Page, selector: string) {
  const viewport = page.viewportSize()!;
  const elements = page.locator(selector);
  const count = await elements.count();
  for (let i = 0; i < count; i++) {
    const box = await elements.nth(i).boundingBox();
    if (!box) continue;
    expect(box.x, `${selector}[${i}] left edge >= 0`).toBeGreaterThanOrEqual(-2);
    expect(
      box.x + box.width,
      `${selector}[${i}] right edge <= viewport`,
    ).toBeLessThanOrEqual(viewport.width + 2);
  }
}

/** Check orbital nodes don't overlap each other */
async function expectNoNodeOverlap(page: Page) {
  const nodes = page.locator('.orbital-node');
  const count = await nodes.count();
  if (count < 2) return;

  const boxes: { x: number; y: number; w: number; h: number; i: number }[] = [];
  for (let i = 0; i < count; i++) {
    const box = await nodes.nth(i).boundingBox();
    if (box) boxes.push({ x: box.x, y: box.y, w: box.width, h: box.height, i });
  }

  for (let a = 0; a < boxes.length; a++) {
    for (let b = a + 1; b < boxes.length; b++) {
      const ba = boxes[a];
      const bb = boxes[b];
      // Simple AABB overlap check with 2px tolerance
      const overlapX = ba.x < bb.x + bb.w - 2 && ba.x + ba.w > bb.x + 2;
      const overlapY = ba.y < bb.y + bb.h - 2 && ba.y + ba.h > bb.y + 2;
      expect(
        overlapX && overlapY,
        `Orbital node ${ba.i} overlaps with node ${bb.i}`,
      ).toBeFalsy();
    }
  }
}

/** Assert orbital nodes are not clipped by the container */
async function expectNodesNotClipped(page: Page) {
  const container = page.locator('.orbital-container');
  const containerBox = await container.boundingBox();
  if (!containerBox) return;

  const nodes = page.locator('.orbital-node__card');
  const count = await nodes.count();

  for (let i = 0; i < count; i++) {
    const box = await nodes.nth(i).boundingBox();
    if (!box) continue;
    // Node should be mostly within the container (allowing 20px tolerance for shadows)
    expect(
      box.x,
      `Node ${i} left edge should not be clipped`,
    ).toBeGreaterThanOrEqual(containerBox.x - 20);
    expect(
      box.x + box.width,
      `Node ${i} right edge should not be clipped`,
    ).toBeLessThanOrEqual(containerBox.x + containerBox.width + 20);
    expect(
      box.y,
      `Node ${i} top edge should not be clipped`,
    ).toBeGreaterThanOrEqual(containerBox.y - 20);
    expect(
      box.y + box.height,
      `Node ${i} bottom edge should not be clipped`,
    ).toBeLessThanOrEqual(containerBox.y + containerBox.height + 20);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

for (const [label, size] of Object.entries(VIEWPORTS)) {
  test.describe(`Bowl Builder @ ${label} (${size.width}×${size.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size);
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600); // Allow orbital animation to settle

      // Freeze orbital rotation by clearing all setInterval timers.
      // This only stops the JS-driven orbital spin (setInterval every 50ms).
      // CSS animations (pulse-ring), CSS transitions, and Framer Motion
      // animations all continue normally since they use keyframes/rAF.
      await page.evaluate(() => {
        const id = window.setInterval(() => {}, 9999);
        for (let i = 1; i <= id; i++) window.clearInterval(i);
      });
      await page.waitForTimeout(100); // Let final frame settle
    });

    // ----- Full-page screenshot -----
    test('full page visual snapshot', async ({ page }) => {
      await expect(page).toHaveScreenshot(`bowl-fullpage-${label}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        timeout: 15000,
      });
    });

    // ----- No horizontal overflow -----
    test('no horizontal overflow', async ({ page }) => {
      await expectNoOverflow(page);
    });

    // ----- Header layout -----
    test('header is visible and not clipped', async ({ page }) => {
      const header = page.locator('.bowl-builder__header');
      await expect(header).toBeVisible();
      const title = page.getByRole('heading', { name: 'Build Your Bowl' });
      await expect(title).toBeVisible();
      await expectWithinViewportX(page, '.bowl-builder__header');
    });

    // ----- Orbital menu -----
    test('orbital nodes are fully visible and not clipped', async ({ page }) => {
      const orbitalContainer = page.locator('.orbital-container');
      await expect(orbitalContainer).toBeVisible();
      await expectNodesNotClipped(page);
    });

    test('orbital nodes do not overlap each other', async ({ page }) => {
      await expectNoNodeOverlap(page);
    });

    test('orbital node sizes scale with viewport', async ({ page }) => {
      const nodes = page.locator('.orbital-node__card');
      const count = await nodes.count();
      if (count < 2) return;

      const widths: number[] = [];
      for (let i = 0; i < count; i++) {
        const box = await nodes.nth(i).boundingBox();
        if (box) widths.push(box.width);
      }

      // All nodes should be roughly the same size
      const avg = widths.reduce((a, b) => a + b, 0) / widths.length;
      for (const w of widths) {
        expect(
          Math.abs(w - avg) / avg,
          'Node sizes should be consistent',
        ).toBeLessThan(0.15);
      }

      // Nodes should have a minimum readable size
      for (const w of widths) {
        expect(w, 'Node should be at least 30px wide').toBeGreaterThanOrEqual(30);
      }
    });

    test('orbital orbit radius scales proportionally', async ({ page }) => {
      const ring = page.locator('.orbital-ring');
      const ringCount = await ring.count();
      if (ringCount === 0) return;

      const ringBox = await ring.first().boundingBox();
      const container = page.locator('.orbital-container');
      const containerBox = await container.boundingBox();

      if (ringBox && containerBox) {
        // Ring should use a reasonable proportion of the container
        const ringRatio = ringBox.width / containerBox.width;
        expect(ringRatio, 'Orbit ring should use available space').toBeGreaterThan(0.3);
        expect(ringRatio, 'Orbit ring should not exceed container').toBeLessThanOrEqual(1.1);
      }
    });

    test('orbital visual snapshot', async ({ page }) => {
      await expect(page.locator('.orbital-container')).toHaveScreenshot(
        `bowl-orbital-${label}.png`,
        { maxDiffPixelRatio: 0.03, timeout: 10000 },
      );
    });

    // ----- Category tabs -----
    test('category tabs are visible and tappable', async ({ page }) => {
      const categories = ['Base', 'Protein', 'Fruits', 'Toppings', 'Drizzles'];
      for (const cat of categories) {
        const btn = page.getByRole('button', { name: cat });
        await expect(btn).toBeVisible();
        const box = await btn.boundingBox();
        expect(box).toBeTruthy();
        // Button should be at least 30px wide to be tappable
        expect(box!.width).toBeGreaterThanOrEqual(30);
      }
    });

    test('switching categories does not cause overflow', async ({ page }) => {
      const categories = ['Protein', 'Fruits', 'Toppings', 'Drizzles', 'Base'];
      for (const cat of categories) {
        await page.getByRole('button', { name: cat }).click();
        await page.waitForTimeout(400);
        await expectNoOverflow(page);
      }
    });

    test('switching categories visual snapshots', async ({ page }) => {
      const categories = ['Protein', 'Fruits', 'Toppings', 'Drizzles'];
      for (const cat of categories) {
        await page.getByRole('button', { name: cat }).click();
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot(
          `bowl-category-${cat.toLowerCase()}-${label}.png`,
          { maxDiffPixelRatio: 0.03, timeout: 10000 },
        );
      }
    });

    // ----- Interaction: clicking nodes -----
    test('clicking a node does not create scrollbars or layout shift', async ({ page }) => {
      const dimsBefore = await getScrollDimensions(page);

      // Click first orbital node
      const firstNode = page.locator('.orbital-node__card').first();
      const nodeCount = await firstNode.count();
      if (nodeCount === 0) return;

      await firstNode.click();
      await page.waitForTimeout(500);

      // Check no horizontal overflow appeared
      await expectNoOverflow(page);

      // Check scroll dimensions didn't change significantly
      const dimsAfter = await getScrollDimensions(page);
      expect(
        Math.abs(dimsAfter.scrollWidth - dimsBefore.scrollWidth),
        'Clicking a node should not change scroll width',
      ).toBeLessThan(10);
      expect(
        Math.abs(dimsAfter.scrollHeight - dimsBefore.scrollHeight),
        'Clicking a node should not significantly change scroll height',
      ).toBeLessThan(100);
    });

    test('expanded node card is visible and not clipped', async ({ page }) => {
      const firstNode = page.locator('.orbital-node__card').first();
      const nodeCount = await firstNode.count();
      if (nodeCount === 0) return;

      await firstNode.click();
      await page.waitForTimeout(500);

      const expandedCard = page.locator('.orbital-card');
      const expandedCount = await expandedCard.count();
      if (expandedCount === 0) return;

      const box = await expandedCard.first().boundingBox();
      if (!box) return;

      const viewport = page.viewportSize()!;
      // Card should be at least partially visible
      expect(box.x + box.width, 'Expanded card right edge visible').toBeGreaterThan(0);
      expect(box.x, 'Expanded card left edge visible').toBeLessThan(viewport.width);
      expect(box.y + box.height, 'Expanded card bottom visible').toBeGreaterThan(0);

      await expect(page).toHaveScreenshot(`bowl-expanded-node-${label}.png`, {
        maxDiffPixelRatio: 0.03,
        timeout: 10000,
      });
    });

    test('adding ingredient does not push macro panel down', async ({ page }) => {
      // Record macro panel position before adding ingredient
      const macroPanel = size.width < 768
        ? page.locator('.macro-panel-compact')
        : page.locator('.bowl-builder__panel');
      const panelCount = await macroPanel.count();
      if (panelCount === 0) return;

      const panelBefore = await macroPanel.first().boundingBox();
      if (!panelBefore) return;

      // Click a node and add to bowl
      const node = page.locator('.orbital-node__card').first();
      if ((await node.count()) === 0) return;

      await node.click();
      await page.waitForTimeout(500);

      const addBtn = page.getByRole('button', { name: 'Add to Bowl' });
      if ((await addBtn.count()) > 0) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Close any expanded card by clicking elsewhere
      await page.locator('.orbital-center').click();
      await page.waitForTimeout(300);

      const panelAfter = await macroPanel.first().boundingBox();
      if (!panelAfter) return;

      // Panel should not have shifted more than 50px
      expect(
        Math.abs(panelAfter.y - panelBefore.y),
        'Macro panel should not shift significantly after adding ingredient',
      ).toBeLessThan(50);
    });

    // ----- Macro panel -----
    if (size.width < 768) {
      test('mobile macro panel is visible', async ({ page }) => {
        const compactPanel = page.locator('.macro-panel-compact');
        const count = await compactPanel.count();
        if (count === 0) return;

        await expect(compactPanel.first()).toBeVisible();
        await expectWithinViewportX(page, '.macro-panel-compact');
      });

      test('mobile macro panel snapshot', async ({ page }) => {
        const compactPanel = page.locator('.macro-panel-compact');
        if ((await compactPanel.count()) === 0) return;

        await expect(compactPanel.first()).toHaveScreenshot(
          `bowl-macro-mobile-${label}.png`,
          { maxDiffPixelRatio: 0.03 },
        );
      });
    } else {
      test('desktop macro panel is visible', async ({ page }) => {
        const panel = page.locator('.bowl-builder__panel');
        const count = await panel.count();
        if (count === 0) return;

        await expect(panel.first()).toBeVisible();
        await expectWithinViewportX(page, '.bowl-builder__panel');
      });
    }

    // ----- Mobile: orbital fills space -----
    if (size.width <= 768) {
      test('orbital menu fills available screen space on mobile', async ({ page }) => {
        const container = page.locator('.orbital-container');
        const containerBox = await container.boundingBox();
        if (!containerBox) return;

        // Container should use at least 60% of viewport width
        expect(
          containerBox.width / size.width,
          'Orbital should use most of screen width on mobile',
        ).toBeGreaterThan(0.6);
      });

      test('orbital nodes are readable on mobile', async ({ page }) => {
        const names = page.locator('.orbital-node__name');
        const count = await names.count();

        for (let i = 0; i < count; i++) {
          const box = await names.nth(i).boundingBox();
          if (!box) continue;
          // Text should have some minimum height to be readable
          expect(box.height, `Node name ${i} should be readable`).toBeGreaterThanOrEqual(8);
        }
      });
    }

    // ----- Full interaction flow snapshot -----
    test('full interaction flow: add ingredient and verify layout', async ({ page }) => {
      // Click first node
      const node = page.locator('.orbital-node__card').first();
      if ((await node.count()) === 0) return;

      await node.click();
      await page.waitForTimeout(500);

      // Add to bowl
      const addBtn = page.getByRole('button', { name: 'Add to Bowl' });
      if ((await addBtn.count()) > 0) {
        await addBtn.click();
        await page.waitForTimeout(500);
      }

      // Verify no overflow after interaction
      await expectNoOverflow(page);

      // Selected items should be visible if they exist
      const selectedItems = page.locator('.bowl-builder__selected');
      if ((await selectedItems.count()) > 0) {
        await expectWithinViewportX(page, '.bowl-builder__selected');
      }

      await expect(page).toHaveScreenshot(`bowl-after-add-${label}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.03,
        timeout: 15000,
      });
    });
  });
}
