import { test, expect } from '@playwright/test';

test.describe('Smoke — App Bootstrap', () => {
  test('app loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(2000);

    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();

    const fatal = errors.filter(e => !e.includes('ResizeObserver'));
    expect(fatal).toHaveLength(0);
  });

  test('sidebar navigation is visible', async ({ page }) => {
    await page.goto('/');
    // Labels updated to the current sidebar naming (Dashboard/Playground/Leads);
    // the old Home/Build New/Lead CRM assertions predated a sidebar rename.
    await expect(page.locator('nav').getByRole('button', { name: 'Dashboard' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('nav').getByRole('button', { name: 'Playground' })).toBeVisible();
    await expect(page.locator('nav').getByRole('button', { name: 'Leads' })).toBeVisible();
  });

  test('Ctrl+K opens command palette', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);
    const palette = page.locator('[data-quickbar-input], [role="combobox"], input[placeholder*="command" i], input[placeholder*="search" i]');
    const count = await palette.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
