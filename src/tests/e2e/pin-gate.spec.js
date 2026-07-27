import { test, expect } from '@playwright/test';

// P0-1 regression: once an operator PIN is configured, a fresh app load must
// render the LoginScreen gate before any route content — previously /dashboard
// rendered fully regardless of the PIN.
test.describe('P0: PIN gate enforcement', () => {
  test('fresh load is NOT gated before any PIN exists', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('aside nav')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toHaveCount(0);
  });

  // Owner decision 2026-07-25: App Lock disabled. Even with a PIN configured, a
  // reload must NOT lock the app (a stale seeded PIN was re-locking on every
  // launch). The gate is bypassed, so the dashboard always renders.
  test('after PIN setup, reload does NOT lock the app (lock disabled)', async ({ page }) => {
    // Set up a PIN through the normal flow
    await page.goto('/login');
    const pin = page.locator('#operator-pin');
    await pin.fill('1234');
    await page.getByRole('button', { name: 'Continue' }).click();
    await pin.fill('1234');
    await page.getByRole('button', { name: 'Create secure workspace' }).click();
    await expect(page.locator('aside nav')).toBeVisible();

    // Fresh load with the PIN persisted → app must still open, NOT lock.
    await page.goto('/dashboard');
    await expect(page.locator('aside nav')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toHaveCount(0);
  });

  test('unknown route redirects to dashboard instead of a blank page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('aside nav')).toBeVisible();
  });
});
