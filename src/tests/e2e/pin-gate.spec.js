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

  test('after PIN setup, reload locks the app; correct PIN unlocks', async ({ page }) => {
    // Set up a PIN through the normal flow
    await page.goto('/login');
    const pin = page.locator('#operator-pin');
    await pin.fill('1234');
    await page.getByRole('button', { name: 'Continue' }).click();
    await pin.fill('1234');
    await page.getByRole('button', { name: 'Create secure workspace' }).click();
    await expect(page.locator('aside nav')).toBeVisible();

    // Fresh load with the PIN persisted → gate must block the dashboard
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.locator('aside nav')).toHaveCount(0);

    // Wrong PIN stays locked
    await page.locator('#operator-pin').fill('9999');
    await page.getByRole('button', { name: 'Unlock Mabishion' }).click();
    await expect(page.getByText(/Incorrect PIN/i)).toBeVisible();

    // Correct PIN unlocks into the app
    await page.locator('#operator-pin').fill('1234');
    await page.getByRole('button', { name: 'Unlock Mabishion' }).click();
    await expect(page.locator('aside nav')).toBeVisible();
  });

  test('unknown route redirects to dashboard instead of a blank page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('aside nav')).toBeVisible();
  });
});
