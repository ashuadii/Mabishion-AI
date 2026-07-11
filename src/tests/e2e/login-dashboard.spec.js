import { test, expect } from '@playwright/test';

test.describe('P0: Login → Dashboard Journey', () => {
  test('login page renders PIN setup on first visit', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Create your operator PIN')).toBeVisible({ timeout: 5000 });
  });

  test('PIN setup → confirm → unlock → dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Create your operator PIN')).toBeVisible({ timeout: 5000 });

    // Enter PIN in setup mode
    const pinInput = page.getByLabel(/operator pin/i);
    await pinInput.fill('1234');
    await page.getByRole('button', { name: /continue/i }).click();

    // Confirm PIN
    await expect(page.getByText('Confirm your operator PIN')).toBeVisible({ timeout: 3000 });
    const confirmInput = page.getByLabel(/confirm pin/i);
    await confirmInput.fill('1234');
    await page.getByRole('button', { name: /create secure workspace/i }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });

  test('dashboard shows sidebar and content', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Sidebar nav items
    await expect(page.getByText('Home')).toBeVisible();
    await expect(page.getByText('Build New')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();

    // Main content area has some rendered content
    const root = page.locator('#root');
    const text = await root.textContent();
    expect(text.length).toBeGreaterThan(50);
  });

  test('sidebar navigation to different screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    // Click Lead CRM
    await page.getByText('Lead CRM').click();
    await expect(page).toHaveURL(/leads/, { timeout: 3000 });
    await expect(page.getByRole('heading', { name: 'Lead CRM Console' }).first()).toBeVisible({ timeout: 3000 });

    // Click Settings
    await page.getByText('Settings').click();
    await expect(page).toHaveURL(/settings/, { timeout: 3000 });
  });

  test('login rejects mismatched PINs during setup', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Create your operator PIN')).toBeVisible({ timeout: 5000 });

    const pinInput = page.getByLabel(/operator pin/i);
    await pinInput.fill('1234');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText('Confirm your operator PIN')).toBeVisible({ timeout: 3000 });
    const confirmInput = page.getByLabel(/confirm pin/i);
    await confirmInput.fill('5678');
    await page.getByRole('button', { name: /create secure workspace/i }).click();

    // Should show mismatch error
    await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 3000 });
  });
});
