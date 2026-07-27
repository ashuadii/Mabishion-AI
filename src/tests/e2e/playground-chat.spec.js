import { test, expect } from '@playwright/test';

// Regression guards for the Playground chat (2026-07-25):
//  - Sending a free-text message from the landing view must show the message and
//    switch into the conversation view. Previously the message vanished because
//    the chat thread only rendered in the 'build' view, not the landing.
//  - The 4 service categories render on the landing (the build entry point).
test.describe('Playground chat', () => {
  test('landing shows the build playground and 4 service categories', async ({ page }) => {
    await page.goto('/build-new');
    await page.waitForTimeout(1500);

    await expect(page.getByText('What are we building?')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Digital Marketing')).toBeVisible();
    await expect(page.getByText('Website Development')).toBeVisible();
    await expect(page.getByText('Custom Software Development')).toBeVisible();
    await expect(page.getByText('AI Development')).toBeVisible();
  });

  test('sending a chat message shows it and opens the conversation view', async ({ page }) => {
    await page.goto('/build-new');
    await page.waitForTimeout(1500);

    // Landing view is showing the service picker.
    await expect(page.getByText('What are we building?')).toBeVisible({ timeout: 10000 });

    // Type a message into the prompt bar and send it.
    const input = page.getByRole('textbox').first();
    await input.fill('hello e2e test message');
    await page.getByRole('button', { name: 'Send' }).click();

    // The user's message must appear in the conversation...
    await expect(page.getByText('hello e2e test message')).toBeVisible({ timeout: 10000 });
    // ...and the landing service-picker must be gone (we switched to chat view).
    await expect(page.getByText('What are we building?')).toHaveCount(0);
  });
});
