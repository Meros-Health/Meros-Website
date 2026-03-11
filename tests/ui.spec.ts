import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:4321/');
  await page.getByRole('link', { name: 'MEROS home' }).click();
  await page.getByRole('link', { name: 'MENU' }).click();
  await page.getByRole('link', { name: 'ABOUT' }).click();
  await page.getByRole('link', { name: 'FIND US' }).click();
  await page.getByRole('link', { name: 'BUILD' }).click();
  await page.locator('div:nth-child(6) > .orbital-node__card > .orbital-node__overlay').click();
  await page.locator('div:nth-child(5) > .orbital-node__card > .orbital-node__overlay').click();
  await page.getByRole('button', { name: 'Add to Bowl' }).click();
  await page.getByRole('button', { name: 'Save Bowl' }).click();
  await page.locator('.orbital-node__overlay').first().click();
  await expect(page.locator('.orbital-node__overlay').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to Bowl' })).toBeVisible();
  await page.getByRole('button', { name: 'Add to Bowl' }).click();
  await page.getByRole('button', { name: 'Remove from Bowl' }).click();
  await page.getByRole('button', { name: 'Add to Bowl' }).click();
  await page.getByRole('button', { name: 'Save Bowl' }).click();
});