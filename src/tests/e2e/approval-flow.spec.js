import { test, expect } from '@playwright/test';

test.describe('P0: Approval Center Journey', () => {
  test('navigates to Approval Center from sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    await page.getByText('Approval Center').click();
    await expect(page).toHaveURL(/approvals/, { timeout: 3000 });
    await expect(page.getByText('Human-in-the-Loop SafeGates')).toBeVisible({ timeout: 5000 });
  });

  test('approval center shows header and description', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForTimeout(1500);

    await expect(page.getByText('Human-in-the-Loop SafeGates')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/agent automation approvals/i)).toBeVisible();
  });

  test('approval center renders with empty state (no pending)', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForTimeout(2000);

    // Page should render without errors even with no approvals
    await expect(page.getByText('Human-in-the-Loop SafeGates')).toBeVisible({ timeout: 5000 });

    // Should NOT show critical modal (no pending critical items)
    const criticalModal = page.locator('text=CRITICAL APPROVAL REQUIRED');
    await expect(criticalModal).not.toBeVisible();
  });

  test('approval center has WhatsApp section', async ({ page }) => {
    await page.goto('/approvals');
    await page.waitForTimeout(1500);

    // WhatsApp connection panel should be present
    await expect(page.getByText(/whatsapp/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('P1: Build Pipeline Journey', () => {
  test('navigates to Build screen', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);

    await page.getByText('Build New').click();
    await expect(page).toHaveURL(/build-new/, { timeout: 3000 });
  });

  test('Build screen shows tier pipeline labels', async ({ page }) => {
    await page.goto('/build-new');
    await page.waitForTimeout(1500);

    // T1-T16 tier labels should be visible
    await expect(page.getByText('Discovery').first()).toBeVisible({ timeout: 5000 });
  });

  test('Build screen opens service portfolio on + click', async ({ page }) => {
    await page.goto('/build-new');
    await page.waitForTimeout(1500);

    // Click the + button to open actions panel
    const addBtn = page.locator('button:has(span.material-icons:text("add"))').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('Services')).toBeVisible({ timeout: 3000 });
    }
  });

  test('Build screen shows service categories', async ({ page }) => {
    await page.goto('/build-new');
    await page.waitForTimeout(1500);

    const addBtn = page.locator('button:has(span.material-icons:text("add"))').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('AI Development')).toBeVisible({ timeout: 3000 });
      await expect(page.getByText('Website Development')).toBeVisible();
      await expect(page.getByText('Digital Marketing')).toBeVisible();
    }
  });

  test('Build screen intake form opens on service selection', async ({ page }) => {
    await page.goto('/build-new');
    await page.waitForTimeout(1500);

    const addBtn = page.locator('button:has(span.material-icons:text("add"))').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(500);

      // Click Website Development
      await page.getByText('Website Development').click();
      await page.waitForTimeout(300);

      // Click Landing Pages
      await page.getByText('Landing Pages').click();
      await page.waitForTimeout(500);

      // Intake form should appear
      await expect(page.getByText(/Project Intake/i)).toBeVisible({ timeout: 3000 });
      await expect(page.getByText(/Client.*Business Name/i)).toBeVisible();
    }
  });
});
