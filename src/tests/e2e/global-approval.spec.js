import { test, expect } from '@playwright/test';

// P0-2 companion regression: a pending CRITICAL approval must raise the popup
// on ANY screen (GlobalApprovalWatcher), not just on /approvals.
test.describe('P0: Global critical approval popup', () => {
  test('pending critical approval pops up on the Dashboard and resolves', async ({ page }) => {
    // Seed the browser dev-preview store with a pending critical approval
    await page.addInitScript(() => {
      const store = {
        projects: [], leads: [], skills: [], revenue: [], workflows: [],
        workflow_nodes: [], workflow_connections: [], knowledge_sources: [],
        analyst_reports: [], client_context: [], settings: [], whatsapp_logs: [],
        action_ledger: [], llm_usage: [], cron_logs: [], worker_logs: [],
        approvals: [{
          id: 'e2e-critical-1',
          title: 'Run Proposal Maker (WK-004)',
          type: 'critical',
          status: 'pending',
          project_id: 'e2e-proj',
          worker_name: 'proposal_maker',
          request_data: JSON.stringify({ request_preview: 'E2E seeded critical approval' }),
          expires_at: null,
          created_at: new Date().toISOString(),
          owner_notified: 0,
          whatsapp_sent: 0,
        }],
      };
      localStorage.setItem('mabishion_local_db', JSON.stringify(store));
    });

    await page.goto('/dashboard');

    // Watcher polls every 4s — allow one cycle
    await expect(page.getByText('Critical Gate')).toBeVisible({ timeout: 10000 });
    // C1: critical approvals carry no fabricated countdown
    await expect(page.getByText('No Timeout')).toBeVisible();

    await page.getByRole('button', { name: '✅ Approve' }).click();
    await expect(page.getByText('Critical Gate')).toHaveCount(0);

    // Resolution must be persisted, not just dismissed
    const status = await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('mabishion_local_db'));
      return store.approvals[0].status;
    });
    expect(status).toBe('approved');
  });
});
