import { test, expect } from '@playwright/test';

test.describe('P0: Lead Intake Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leads');
    await page.waitForTimeout(1500);
  });

  test('Lead CRM page renders with header and metrics', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lead CRM Console' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Total Pipeline')).toBeVisible();
  });

  test('Add New Lead button shows form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lead CRM Console' }).first()).toBeVisible({ timeout: 5000 });

    // Click Add New Lead
    await page.getByText('Add New Lead').click();
    await page.waitForTimeout(500);

    // Form should appear with required fields
    await expect(page.getByText('Full Name')).toBeVisible({ timeout: 3000 });
    await expect(page.getByPlaceholder('Rahul Sharma')).toBeVisible();
    await expect(page.getByPlaceholder('rahul@company.com')).toBeVisible();
  });

  test('fill lead form and submit', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lead CRM Console' }).first()).toBeVisible({ timeout: 5000 });

    // Open form
    await page.getByText('Add New Lead').click();
    await page.waitForTimeout(500);

    // Fill required fields
    await page.getByPlaceholder('Rahul Sharma').fill('Priya Fitness Studio');
    await page.getByPlaceholder('rahul@company.com').fill('priya@fitness.in');
    await page.getByPlaceholder('+91 98765 43210').fill('+91 99887 76655');

    // Fill requirement notes
    await page.getByPlaceholder(/client wants/i).fill('Need a fitness booking website with payment gateway');

    // Submit
    await page.getByRole('button', { name: /save lead/i }).click();

    // Form should close and lead should appear in list
    await page.waitForTimeout(1000);
    await expect(page.getByText('Priya Fitness Studio')).toBeVisible({ timeout: 5000 });
  });

  test('form validation requires name and email', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lead CRM Console' }).first()).toBeVisible({ timeout: 5000 });
    await page.getByText('Add New Lead').click();
    await page.waitForTimeout(500);

    // Try to submit empty form — button should be disabled or form should show validation
    const submitBtn = page.getByRole('button', { name: /save lead/i });

    // Fill only name (no email) and try
    await page.getByPlaceholder('Rahul Sharma').fill('Test Lead');
    // Email is empty — submit should either be disabled or show error
    await submitBtn.click();
    await page.waitForTimeout(500);

    // Form should still be visible (not submitted)
    await expect(page.getByPlaceholder('Rahul Sharma')).toBeVisible();
  });

  test('close form button works', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Lead CRM Console' }).first()).toBeVisible({ timeout: 5000 });

    // Open form
    await page.getByText('Add New Lead').click();
    await expect(page.getByPlaceholder('Rahul Sharma')).toBeVisible({ timeout: 3000 });

    // Close form
    await page.getByText('Close Form').click();
    await page.waitForTimeout(500);

    // Form should be hidden
    await expect(page.getByPlaceholder('Rahul Sharma')).not.toBeVisible();
  });
});
